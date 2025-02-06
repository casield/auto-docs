import { NodePath } from "@babel/traverse";
import { ReturnAnalysis } from "./CodeAnalyzer";

export type NodeReturn = {
  type: "object" | "unknown" | "call" | "literal";
  value: string;
  relatedFunction?: string;
  children?: NodeReturn[];
  nodePath?: NodePath;
  description?: string;
};

export interface CodeAnalysisResult {
  fileName: string;
  analysis: ReturnAnalysis;
  importMap: Record<string, string>;
}

export class LinkedCallTreeBuilder {
  private analyses: Record<string, ReturnAnalysis> = {};
  private combinedImportMap: Record<string, string> = {};

  constructor(analysisResults: CodeAnalysisResult[]) {
    for (const result of analysisResults) {
      // Remove any .ts or .js extension from the file name before using it as a key.
      const normalizedFileName = this.normalizeFileKey(result.fileName);
      this.analyses[normalizedFileName] = result.analysis;
      // (Assuming the importMap values already use the normalized file names—or you may need
      // to process them similarly.)
      Object.assign(this.combinedImportMap, result.importMap);
    }
  }

  // Helper: remove .ts or .js extension from a file path.
  private normalizeFileKey(file: string): string {
    return file.replace(/\.ts$|\.js$/, "");
  }

  // Use this method when you need a normalized version of a file reference.
  private normalizeFileName(fileRef: string): string {
    // If the fileRef already ends with .ts or .js, remove it; otherwise, assume it's already normalized.
    return fileRef.endsWith(".ts") || fileRef.endsWith(".js")
      ? fileRef.replace(/\.ts$|\.js$/, "")
      : fileRef;
  }

  private findFunctionAnalysis(
    functionName: string,
    currentFile: string
  ): ReturnAnalysis["functions"][string] | null {
    const normalizedCurrentFile = this.normalizeFileKey(currentFile);
    const currentAnalysis = this.analyses[normalizedCurrentFile];
    if (currentAnalysis && currentAnalysis.functions[functionName]) {
      return currentAnalysis.functions[functionName];
    }
    const fileRef = this.combinedImportMap[functionName];
    if (fileRef) {
      const normalizedFile = this.normalizeFileName(fileRef);
      if (
        this.analyses[normalizedFile] &&
        this.analyses[normalizedFile].functions[functionName]
      ) {
        return this.analyses[normalizedFile].functions[functionName];
      }
    }
    return null;
  }

  public buildNodeTree(
    functionName: string,
    currentFile: string,
    visited = new Set<string>()
  ): NodeReturn {
    const normalizedCurrentFile = this.normalizeFileKey(currentFile);
    const key = `${normalizedCurrentFile}:${functionName}`;
    if (visited.has(key)) {
      return {
        type: "unknown",
        value: `Circular reference: ${functionName} in ${currentFile}`,
      };
    }
    const newVisited = new Set(visited);
    newVisited.add(key);

    const fnAnalysis = this.findFunctionAnalysis(functionName, currentFile);
    if (!fnAnalysis) {
      return {
        type: "unknown",
        value: `Function ${functionName} not found in ${currentFile}.`,
      };
    }

    const rootNode: NodeReturn = {
      type: "call",
      value: functionName,
      children: [],
      description: fnAnalysis.comment,
    };

    const seen = new Set<string>();
    for (const entry of fnAnalysis.returnStatements) {
      if (entry.type === "call") {
        if (!entry.relatedFunction) continue;
        const displayName = entry.relatedFunction;
        const dedupKey = `call:${displayName}`;
        if (seen.has(dedupKey)) continue;
        seen.add(dedupKey);

        const node: NodeReturn = {
          type: "call",
          value: displayName,
          relatedFunction: entry.relatedFunction,
          nodePath: entry.nodePath,
        };

        let targetFile = currentFile;
        if (entry.relatedFunction.includes(".")) {
          const [className] = entry.relatedFunction.split(".");
          const targetRef = this.combinedImportMap[className];
          targetFile = targetRef ? targetRef : currentFile;
        } else {
          const targetRef = this.combinedImportMap[entry.relatedFunction];
          targetFile = targetRef ? targetRef : currentFile;
        }

        const childTree = this.buildNodeTree(
          entry.relatedFunction,
          targetFile,
          newVisited
        );
        if (childTree.value === displayName && childTree.children) {
          node.children = childTree.children;
        } else {
          node.children = [childTree];
        }
        rootNode.children!.push(node);
      } else {
        const dedupKey = `noncall:${entry.value}`;
        if (seen.has(dedupKey)) continue;
        seen.add(dedupKey);
        const node: NodeReturn = {
          type: entry.type,
          value: entry.value,
          nodePath: entry.nodePath,
        };
        rootNode.children!.push(node);
      }
    }

    if (
      rootNode.children &&
      rootNode.children.length === 1 &&
      rootNode.children[0].value === rootNode.value
    ) {
      rootNode.children = rootNode.children[0].children;
    }

    return rootNode;
  }

  public visualizeTree(node: NodeReturn, indent: number = 0): string {
    const pad = "  ".repeat(indent);
    let displayValue = node.value;
    if (node.type === "call") {
      if (!displayValue.endsWith("()")) {
        displayValue = `${displayValue}()`;
      }
    } else if (node.type === "literal") {
      if (!(displayValue.startsWith('"') && displayValue.endsWith('"'))) {
        displayValue = `"${displayValue}"`;
      }
    }
    let result = `${pad}${displayValue} [${node.type}]`;
    if (node.description) {
      result += ` // ${node.description}`;
    }
    result += "\n";
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        result += this.visualizeTree(child, indent + 1);
      }
    }
    return result;
  }
}
