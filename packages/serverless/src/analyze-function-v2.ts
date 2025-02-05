import fs from "fs";
import path from "path";
import Serverless from "serverless";
import {
  AnalyzerOptions,
  CodeAnalyzer,
  LinkedCallTreeBuilder,
  NodeReturn,
  ReturnAnalysis,
} from "@drokt/core";

export class LambdaFunctionAnalyzer {
  constructor(
    // artifactName is the base directory for your source files.
    private artifactName: string,
    // isFinal is a predicate that will be passed to the call tree builder.
    private isFinal: (node: NodeReturn) => boolean
  ) {}

  // Reads a file relative to the artifactName (base directory)
  private getFileContent(fileName: string): string | null {
    const filePath = path.resolve(this.artifactName, fileName);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, "utf8");
    }
    return null;
  }

  // Given a base name (without extension), try to find a .ts file first, then a .js file.
  private getCandidateFile(baseName: string): string | null {
    const tsName = baseName + ".ts";
    if (this.getFileContent(tsName)) {
      return tsName;
    }
    const jsName = baseName + ".js";
    if (this.getFileContent(jsName)) {
      return jsName;
    }
    return null;
  }

  // If the fileName already ends with .ts or .js, check if it exists; otherwise, try candidate names.
  private resolveFile(fileName: string): string | null {
    if (fileName.endsWith(".ts") || fileName.endsWith(".js")) {
      return this.getFileContent(fileName) ? fileName : null;
    }
    return this.getCandidateFile(fileName);
  }

  /**
   * Analyzes the given serverless function. The handler must be in the format "fileName.functionName".
   * Starting from the entry file/function, this method uses CodeAnalyzer to analyze that file and then
   * recursively discovers related functions. When available, it uses the CodeAnalyzer’s importSource field
   * to resolve the file.
   *
   * Finally, a call tree is built using the LinkedCallTreeBuilder.
   *
   * Returns the call tree.
   */
  public analyzeFunction(
    fn: Serverless.FunctionDefinitionHandler | any
  ): NodeReturn {
    const parts = fn.handler.split(".");
    if (parts.length !== 2) {
      throw new Error("Handler must be in the format 'fileName.functionName'");
    }
    let [entryFile, entryFunction] = parts;
    const resolvedEntryFile = this.resolveFile(entryFile);
    if (!resolvedEntryFile) {
      throw new Error(
        `Entry file ${entryFile} could not be resolved (tried .ts and .js)`
      );
    }

    // Cache of analyzed files: maps resolved file names to their ReturnAnalysis.
    const analyzedFiles: { [fileName: string]: ReturnAnalysis } = {};

    // Pending queue of { file, functionName } pairs to process.
    const pending: Array<{ file: string; functionName: string }> = [
      { file: resolvedEntryFile, functionName: entryFunction },
    ];

    while (pending.length > 0) {
      const { file, functionName } = pending.pop()!;
      const resolvedFile = this.resolveFile(file);
      if (!resolvedFile) {
        console.warn(`File ${file} not found.`);
        continue;
      }
      if (!analyzedFiles[resolvedFile]) {
        const content = this.getFileContent(resolvedFile);
        if (!content) {
          console.warn(`File ${resolvedFile} not found.`);
          continue;
        }
        const analyzer = new CodeAnalyzer(resolvedFile, {} as AnalyzerOptions);
        const analysis = analyzer.analyzeSource(content);
        analyzedFiles[resolvedFile] = analysis;
      }
      const analysis = analyzedFiles[resolvedFile];
      const funcAnalysis = analysis.functions[functionName];
      if (funcAnalysis) {
        for (const ret of funcAnalysis.returnStatements) {
          if (ret.type === "call" && ret.relatedFunction) {
            let candidateFile: string | null = null;
            // If the analyzer provided an importSource, try resolving that first.
            if (ret.importSource) {
              candidateFile = this.resolveFile(ret.importSource);
            }
            // Otherwise, try the candidate file based on the related function name.
            if (!candidateFile) {
              candidateFile = this.getCandidateFile(ret.relatedFunction);
            }
            if (candidateFile && !analyzedFiles[candidateFile]) {
              pending.push({
                file: candidateFile,
                functionName: ret.relatedFunction,
              });
            }
          }
        }
      }
    }

    // Prepare an array of CodeAnalysisResults for the call tree builder.
    const codeAnalysisResult = Object.entries(analyzedFiles).map(
      ([fileName, analysis]) => {
        // Re-run the analyzer to get the importMap for each file.
        const analyzer = new CodeAnalyzer(fileName, {} as AnalyzerOptions);
        analyzer.analyzeSource(this.getFileContent(fileName) || "");
        return {
          fileName,
          analysis,
          importMap: analyzer.importMap,
        };
      }
    );

    const treeBuilder = new LinkedCallTreeBuilder(
      codeAnalysisResult,
      this.isFinal
    );
    const tree = treeBuilder.buildNodeTree(entryFunction, resolvedEntryFile);
    console.log(treeBuilder.visualizeTree(tree));
    return tree;
  }
}
