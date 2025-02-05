// LinkedCallTreeBuilder.ts
import { NodePath } from "@babel/traverse";
import { ReturnAnalysis, ReturnStatementEntry } from "./CodeAnalyzer";
import pathnode from "path";

export type NodeReturn = {
  type: "object" | "unknown" | "call" | "literal";
  value: string;
  relatedFunction?: string;
  final?: boolean;
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

  /**
   * @param analysisResults An array of analysis results (one per file).
   * @param isFinalFn A predicate that marks certain function names as final.
   */
  constructor(
    analysisResults: CodeAnalysisResult[],
    private isFinalFn: (fnName: string) => boolean
  ) {
    for (const result of analysisResults) {
      this.analyses[result.fileName] = result.analysis;
      Object.assign(this.combinedImportMap, result.importMap);
    }
  }

  /**
   * Normalizes an import file reference (e.g. "./file2") to a file name (e.g. "file2.ts").
   */
  private normalizeFileName(fileRef: string): string {
    const base = pathnode.basename(fileRef);
    return base.endsWith(".ts") ? base : `${base}.ts`;
  }

  /**
   * Finds the analysis for a given function.
   * It first looks in the current file; if not found, it uses the combined import map.
   */
  private findFunctionAnalysis(
    functionName: string,
    currentFile: string
  ): ReturnAnalysis["functions"][string] | null {
    const currentAnalysis = this.analyses[currentFile];
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

  /**
   * Recursively builds a node tree representing the call chain for a given function.
   * Uses a visited set to avoid circular references.
   *
   * In this refactoring we:
   * 1. For call-type return entries, we always use the analyzer’s `relatedFunction`
   *    as the canonical display name (ignoring the generated code in `value`).
   * 2. We deduplicate call entries by their related function.
   * 3. When the subtree built for a call has the same display name as the call,
   *    we flatten that extra layer.
   *
   * @param functionName The name of the function.
   * @param currentFile The file in which to search.
   * @param visited A set to track visited nodes (using "<file>:<function>") to avoid cycles.
   */
  public buildNodeTree(
    functionName: string,
    currentFile: string,
    visited = new Set<string>()
  ): NodeReturn {
    const key = `${currentFile}:${functionName}`;
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

    // Create a root node for the current function.
    const rootNode: NodeReturn = {
      type: "call",
      value: functionName,
      children: [],
      description: fnAnalysis.comment,
    };

    // Use a local seen set to deduplicate return entries.
    const seen = new Set<string>();

    for (const entry of fnAnalysis.returnStatements) {
      // Process call-type entries using their related function.
      if (entry.type === "call") {
        if (!entry.relatedFunction) continue; // skip if no target function
        const displayName = entry.relatedFunction;
        const dedupKey = `call:${displayName}`;
        if (seen.has(dedupKey)) continue;
        seen.add(dedupKey);

        // Create a node using the canonical display name.
        const node: NodeReturn = {
          type: "call",
          value: displayName,
          relatedFunction: entry.relatedFunction,
          nodePath: entry.nodePath,
        };

        // Determine which file to search for the target.
        const targetRef = this.combinedImportMap[entry.relatedFunction];
        const targetFile = targetRef
          ? this.normalizeFileName(targetRef)
          : currentFile;

        // Build the subtree for the called function.
        const childTree = this.buildNodeTree(
          entry.relatedFunction,
          targetFile,
          newVisited
        );
        // If the returned subtree’s root has the same name as our displayName,
        // flatten the extra layer.
        if (childTree.value === displayName && childTree.children) {
          node.children = childTree.children;
        } else {
          node.children = [childTree];
        }
        // Mark final if the called function is final.
        if (this.isFinalFn(entry.relatedFunction)) {
          node.final = true;
        }
        rootNode.children!.push(node);
      } else {
        // Process non-call entries (like literal returns).
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

    // Additional flattening:
    // If the root node has exactly one child whose value is the same as the root's,
    // then merge the child’s children into the root.
    if (
      rootNode.children &&
      rootNode.children.length === 1 &&
      rootNode.children[0].value === rootNode.value
    ) {
      rootNode.children = rootNode.children[0].children;
    }

    return rootNode;
  }

  /**
   * Recursively builds a string visualization of a NodeReturn tree.
   * Formats call nodes by appending "()" (if not already present) and wraps literal values in quotes.
   */
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
    if (node.final) {
      result += " {FINAL}";
    }
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
