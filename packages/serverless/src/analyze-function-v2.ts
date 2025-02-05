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
    private artifactName: string,
    private isFinal: (node: NodeReturn) => boolean
  ) {}

  // Returns the file content (UTF8) for a given fileName relative to the artifactName (base directory)
  private getFileContent(fileName: string): string | null {
    // Use path.resolve to get an absolute path
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

  // Resolves a file name. If the name already includes an extension, we check that file;
  // otherwise, we try the candidate names.
  private resolveFile(fileName: string): string | null {
    if (fileName.endsWith(".ts") || fileName.endsWith(".js")) {
      return this.getFileContent(fileName) ? fileName : null;
    }
    return this.getCandidateFile(fileName);
  }

  /**
   * Analyzes the given serverless function. The handler must be in the format "fileName.functionName".
   * Starting from the entry file/function, this method uses CodeAnalyzer to analyze the file and then
   * recursively discovers related functions. When available, it uses the CodeAnalyzer’s `importSource`
   * field to resolve the file.
   *
   * Returns a call tree built via the LinkedCallTreeBuilder.
   */
  public analyzeFunction(fn: Serverless.FunctionDefinitionHandler | any) {
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

    // Cache of analyzed files: { fileName: ReturnAnalysis }
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
        const analyzer = new CodeAnalyzer(resolvedFile, {});
        const analysis = analyzer.analyzeSource(content);
        analyzedFiles[resolvedFile] = analysis;
      }
      const analysis = analyzedFiles[resolvedFile];
      const funcAnalysis = analysis.functions[functionName];
      if (funcAnalysis) {
        for (const ret of funcAnalysis.returnStatements) {
          if (ret.type === "call" && ret.relatedFunction) {
            let candidateFile: string | null = null;
            // Use the importSource from the analyzer result, if available.
            if (ret.importSource) {
              candidateFile = this.resolveFile(ret.importSource);
            }
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

    const codeAnalysisResult = Object.entries(analyzedFiles).map(
      ([fileName, analysis]) => {
        const analyzer = new CodeAnalyzer(fileName, {});
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
    return tree;
  }
}
