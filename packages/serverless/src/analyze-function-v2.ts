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

interface TsConfig {
  compilerOptions?: {
    baseUrl?: string;
    paths?: { [alias: string]: string[] };
  };
}

export class LambdaFunctionAnalyzer {
  private tsConfig: TsConfig | null = null;

  /**
   * @param artifactName Base directory for your source files.
   * @param isFinal A predicate to be passed to the call tree builder.
   * @param tsConfigPath (Optional) Path to your tsconfig.json file.
   */
  constructor(
    private artifactName: string,
    private isFinal: (node: NodeReturn) => boolean,
    private tsConfigPath?: string
  ) {
    if (this.tsConfigPath && fs.existsSync(this.tsConfigPath)) {
      const configContent = fs.readFileSync(this.tsConfigPath, "utf8");
      try {
        this.tsConfig = JSON.parse(configContent);
      } catch (e) {
        console.warn("Could not parse tsconfig.json:", e);
      }
    }
  }

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
      // Try the given file; if not found, try the alternate extension.
      if (this.getFileContent(fileName)) {
        return fileName;
      }
      if (fileName.endsWith(".ts")) {
        const alt = fileName.slice(0, -3) + ".js";
        return this.getFileContent(alt) ? alt : null;
      } else {
        const alt = fileName.slice(0, -3) + ".ts";
        return this.getFileContent(alt) ? alt : null;
      }
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
      this.isFinal,
      {
        resolveSource: this.resolveSource,
      }
    );
    const tree = treeBuilder.buildNodeTree(entryFunction, resolvedEntryFile);
    console.log(treeBuilder.visualizeTree(tree));
    return tree;
  }

  /**
   * Custom resolveSource function that attempts to resolve unknown sources using tsconfig.json path aliases.
   * If a tsconfig.json was provided and contains compilerOptions.paths, this function uses those aliases
   * to transform the given function name into a file reference.
   *
   * It uses the tsconfig's baseUrl (resolved relative to artifactName) and paths.
   * If no alias matches or resolution fails, it returns the original function name.
   */
  resolveSource = (
    functionName: string,
    currentFile: string
  ): string | null => {
    if (this.tsConfig && this.tsConfig.compilerOptions) {
      const baseUrl = this.tsConfig.compilerOptions.baseUrl || "";
      const pathsMapping = this.tsConfig.compilerOptions.paths || {};
      // Resolve baseUrl relative to the artifactName.
      const absoluteBaseUrl = path.resolve(this.artifactName, baseUrl);
      for (const alias in pathsMapping) {
        const targets = pathsMapping[alias];
        // Convert alias pattern (e.g. "@alias/*") to a regex.
        const regexPattern = "^" + alias.replace("*", "(.*)") + "$";
        const regex = new RegExp(regexPattern);
        const match = functionName.match(regex);
        if (match) {
          let target = targets[0];
          if (target.includes("*") && match[1]) {
            target = target.replace("*", match[1]);
          }
          // Resolve the target relative to the absolute baseUrl.
          const resolvedPath = path.relative(
            this.artifactName,
            path.join(absoluteBaseUrl, target)
          );
          return resolvedPath;
        }
      }
    }
    // If no tsconfig resolution is possible, return the original source string.
    return functionName;
  };
}
