// CallTreeBuilder.ts
import { NodePath } from "@babel/traverse";
import { ReturnAnalysis, ReturnStatementEntry } from "./CodeAnalyzer";

export type NodeReturn = {
  type: "call" | "unknown";
  value: string;
  relatedFunction?: string;
  final?: boolean;
  children?: NodeReturn[];
  nodePath?: NodePath;
  description?: string;
};

export class CallTreeBuilder {
  constructor(
    private analyses: Record<string, ReturnAnalysis>,
    private functionDescriptions: Record<string, string>,
    /**
     * A predicate to determine if a function name is considered final.
     * By default, it simply checks against a set of final function names.
     */
    private isFinalFn: (fnName: string) => boolean
  ) {}

  private findFunctionReturns(
    functionName: string
  ): ReturnStatementEntry[] | null {
    for (const analysis of Object.values(this.analyses)) {
      if (analysis.returnStatements[functionName]) {
        return analysis.returnStatements[functionName];
      }
    }
    return null;
  }

  private findClassMethodReturns(
    functionName: string
  ): ReturnStatementEntry[] | null {
    for (const analysis of Object.values(this.analyses)) {
      if (analysis.classMethods && analysis.classMethods[functionName]) {
        return analysis.classMethods[functionName];
      }
    }
    return null;
  }

  public buildNodeTreeForFunction(
    functionName: string,
    visited = new Set<string>()
  ): NodeReturn {
    const entries =
      this.findFunctionReturns(functionName) ??
      this.findClassMethodReturns(functionName);

    if (!entries) {
      return {
        type: "unknown",
        value: `Function ${functionName} not found.`,
      };
    }

    const rootNode: NodeReturn = {
      type: "call",
      value: functionName,
      children: [],
      description: this.functionDescriptions[functionName] || undefined,
    };

    if (visited.has(functionName)) {
      rootNode.type = "unknown";
      rootNode.value = `Circular reference in ${functionName}`;
      return rootNode;
    }
    visited.add(functionName);

    for (const entry of entries) {
      const node: NodeReturn = {
        type: entry.type,
        value: entry.value,
        relatedFunction: entry.relatedFunction,
        nodePath: entry.nodePath,
      };

      if (entry.type === "call" && entry.relatedFunction) {
        if (this.isFinalFn(entry.relatedFunction)) {
          node.final = true;
        } else {
          node.children = [
            this.buildNodeTreeForFunction(entry.relatedFunction, visited),
          ];
        }
      }
      rootNode.children!.push(node);
    }

    return rootNode;
  }
}
