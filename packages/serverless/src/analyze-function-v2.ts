// LambdaFunctionAnalyzer.ts (modified excerpt)
import AdmZip from "adm-zip";
import Serverless from "serverless";
import {
  ReturnAnalysis,
  AnalyzerOptions,
  CodeAnalyzer,
  ReturnStatementEntry,
  NodeReturn,
  CallTreeBuilder,
} from "@drokt/core";

export class LambdaFunctionAnalyzer {
  private zip: AdmZip;
  private zipEntries: AdmZip.IZipEntry[];
  private analyzedFiles: Set<string> = new Set();
  private analyses: Record<string, ReturnAnalysis> = {};
  private functionDescriptions: Record<string, string> = {};
  private globalFinalFunctions: Set<string> = new Set();
  // NEW: Global import map: imported function (or module) name -> file name.
  private globalImportMap: Record<string, string> = {};

  constructor(private artifactName: string, private options: AnalyzerOptions) {
    this.zip = new AdmZip(artifactName);
    this.zipEntries = this.zip.getEntries();
  }

  private getFileContent(fileName: string): string | null {
    const entry = this.zipEntries.find((entry) => entry.entryName === fileName);
    return entry ? entry.getData().toString("utf8") : null;
  }

  /**
   * Analyze a file if it has not already been analyzed.
   */
  private analyzeFile(fileName: string, targetFunction: string): void {
    if (this.analyzedFiles.has(fileName)) return;
    const content = this.getFileContent(fileName);
    if (!content) {
      throw new Error(`File ${fileName} not found in the artifact.`);
    }
    this.analyzedFiles.add(fileName);

    const analyzer = new CodeAnalyzer(fileName, this.options);
    const analysis = analyzer.analyzeSource(content, targetFunction);
    this.analyses[fileName] = analysis;
    Object.assign(this.functionDescriptions, analyzer.functionDescriptions);
    analyzer
      .getFinalFunctions()
      .forEach((fn) => this.globalFinalFunctions.add(fn));
    // Merge the local importMap into our global import map.
    Object.assign(this.globalImportMap, analyzer.importMap);
  }

  /**
   * Check if any analyzed file already defines the given function.
   */
  private hasFunctionAnalysis(functionName: string): boolean {
    return Object.values(this.analyses).some((analysis) => {
      return (
        analysis.returnStatements[functionName] ||
        (analysis.classMethods && analysis.classMethods[functionName])
      );
    });
  }

  /**
   * Recursively traverse the call chain starting at functionName.
   * For each call entry (with a relatedFunction) that isn’t yet analyzed,
   * consult the global import map and analyze the file if possible.
   */
  private traverseCallChain(functionName: string, visited = new Set<string>()) {
    if (visited.has(functionName)) return;
    visited.add(functionName);

    // If we don’t have an analysis for this function yet, check the global import map.
    if (!this.hasFunctionAnalysis(functionName)) {
      const possibleFile = this.globalImportMap[functionName];
      if (possibleFile) {
        // Use the function name as the target function.
        this.analyzeFile(possibleFile, functionName);
      }
    }

    // Find the return entries for this function (from any analyzed file).
    let entries: ReturnStatementEntry[] | null = null;
    for (const analysis of Object.values(this.analyses)) {
      if (analysis.returnStatements[functionName]) {
        entries = analysis.returnStatements[functionName];
        break;
      }
      if (analysis.classMethods && analysis.classMethods[functionName]) {
        entries = analysis.classMethods[functionName];
        break;
      }
    }
    if (!entries) return;

    // For each call return, try to traverse further.
    for (const entry of entries) {
      if (entry.type === "call" && entry.relatedFunction) {
        this.traverseCallChain(entry.relatedFunction, visited);
      }
    }
  }

  /**
   * Determines if a function is "final" based on the global final functions.
   */
  private isFinalFunction(functionName: string): boolean {
    return this.globalFinalFunctions.has(functionName);
  }

  /**
   * Public API: Analyze a Serverless function.
   * Example: if fn.handler is "functions/hello.handler", then "functions/hello.js"
   * is analyzed and the call graph for "handler" is built.
   */
  public analyzeFunction(
    fn: Serverless.FunctionDefinitionHandler | any
  ): NodeReturn {
    const parts = fn.handler.split(".");
    if (parts.length !== 2) {
      throw new Error("Handler must be in the format 'fileName.functionName'");
    }
    const [handlerFilePath, mainFunctionName] = parts;
    const handlerFileName = handlerFilePath + ".js";

    // Analyze the top-level lambda file.
    this.analyzeFile(handlerFileName, mainFunctionName);
    // Recursively follow the call chain from the top function.
    this.traverseCallChain(mainFunctionName);

    // Build the call tree using the call tree builder.
    const treeBuilder = new CallTreeBuilder(
      this.analyses,
      this.functionDescriptions,
      (fnName: string) => this.isFinalFunction(fnName)
    );

    return treeBuilder.buildNodeTreeForFunction(mainFunctionName);
  }
}
