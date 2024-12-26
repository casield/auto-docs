import fs from "fs";
import * as parser from "@babel/parser";
import generator from "@babel/generator";
import traverse, { NodePath } from "@babel/traverse";
import * as t from "@babel/types";
import AdmZip from "adm-zip";
import Serverless from "serverless";
import { LambdaDocsBuilder } from "@drokt/core";
import pathnode from "path";

type ReturnStatementEntry = {
  type: "call" | "unknown";
  value: string;
  relatedFunction?: string;
  astNode?: t.Node;
};

type ReturnAnalysis = {
  returnStatements: Record<string, ReturnStatementEntry[]>;
  classMethods?: Record<string, ReturnStatementEntry[]>;
};

type NodeReturn = {
  type: "call" | "unknown";
  value: string;
  relatedFunction?: string;
  final?: boolean;
  children?: NodeReturn[];
  astNode?: t.Node;
};

export class LambdaFunctionAnalyzer {
  private zip: AdmZip;
  private zipEntries: AdmZip.IZipEntry[];
  private analyzedFiles: Set<string>;
  private results: Record<string, ReturnAnalysis>;
  private finalFrameworkSource = "@drokt/serverless";
  private globalFinalFunctions: Set<string> = new Set();
  private globalFinalNamespaces: Set<string> = new Set();

  constructor(private artifactName: string) {
    this.zip = new AdmZip(artifactName);
    this.zipEntries = this.zip.getEntries();
    this.analyzedFiles = new Set();
    this.results = {};
  }

  private getFileContent(fileName: string): string | null {
    const entry = this.zipEntries.find((entry) => entry.entryName === fileName);
    return entry ? entry.getData().toString("utf8") : null;
  }

  private analyzeFile(
    fileName: string,
    targetFunction: string
  ): ReturnAnalysis {
    if (this.analyzedFiles.has(fileName)) {
      return this.results[fileName];
    }
    this.analyzedFiles.add(fileName);

    const fileContent = this.getFileContent(fileName);
    if (!fileContent) {
      throw new Error(`File ${fileName} not found in the artifact.`);
    }

    const ast = parser.parse(fileContent, {
      sourceType: "module",
      plugins: ["typescript", "jsx"],
    });

    const returnStatements: Record<string, ReturnStatementEntry[]> = {};
    const classMethods: Record<string, ReturnStatementEntry[]> = {};
    const importMap: Record<string, string> = {};
    const variableAssignments: Record<string, string> = {};

    const finalFunctions = new Set<string>();
    const finalNamespaces = new Set<string>();

    // === Fix logic to detect "new MyClass().myMethod()" in variable assignments ===
    const collectVariableAssignments = (path: NodePath) => {
      path.traverse({
        VariableDeclarator(variablePath) {
          const variableName = t.isIdentifier(variablePath.node.id)
            ? variablePath.node.id.name
            : null;
          if (!variableName) return;

          const init = variablePath.node.init;
          if (!init) return;

          if (
            t.isAwaitExpression(init) &&
            t.isCallExpression(init.argument) &&
            t.isIdentifier(init.argument.callee)
          ) {
            variableAssignments[variableName] = init.argument.callee.name;
          } else if (t.isCallExpression(init) && t.isIdentifier(init.callee)) {
            variableAssignments[variableName] = init.callee.name;
          }
          // NEW: handle "new MyClass().myMethod()"
          else if (
            t.isCallExpression(init) &&
            t.isMemberExpression(init.callee) &&
            t.isNewExpression(init.callee.object)
          ) {
            const newExpr = init.callee.object;
            if (t.isIdentifier(newExpr.callee)) {
              const className = newExpr.callee.name;
              const methodName = t.isIdentifier(init.callee.property)
                ? init.callee.property.name
                : null;
              if (methodName) {
                variableAssignments[
                  variableName
                ] = `${className}.${methodName}`;
              }
            }
          }
        },
      });
    };

    const collectReturnStatements = (path: NodePath, functionName: string) => {
      collectVariableAssignments(path); // IMPORTANT: must run

      path.traverse({
        ReturnStatement(returnPath) {
          if (!returnPath.node.argument) return;

          let returnCode = generator(returnPath.node.argument).code;
          const entry: ReturnStatementEntry = {
            type: "unknown",
            value: returnCode,
            astNode: returnPath.node.argument,
          };

          // If it's just "return varName;"
          if (t.isIdentifier(returnPath.node.argument)) {
            const variableName = returnPath.node.argument.name;
            if (variableAssignments[variableName]) {
              // => turn it into a call to the function we tracked
              entry.type = "call";
              entry.relatedFunction = variableAssignments[variableName];
              entry.value = variableAssignments[variableName];
            }
          }
          // If it's "return new MyClass().myMethod()" or any call
          else if (t.isCallExpression(returnPath.node.argument)) {
            entry.type = "call";
            // same logic as before
            // ...
          }
          // If it's an await
          else if (t.isAwaitExpression(returnPath.node.argument)) {
            // ...
          }

          if (!returnStatements[functionName]) {
            returnStatements[functionName] = [];
          }
          returnStatements[functionName].push(entry);
        },
      });
    };

    // ... (rest of your traverse logic, class declarations, etc.) ...

    // main traverse
    traverse(ast, {
      // IMPORTS, FUNCTION DECLARATIONS, etc.
      // ...
      FunctionDeclaration: (path) => {
        if (path.node.id?.name === targetFunction) {
          collectReturnStatements(path, path.node.id.name);
        }
      },
      // handle arrow functions, assignments, etc.
      // ...

      ClassDeclaration: (classPath) => {
        // ...
        // For each method, do a mini-traverse to gather returns
        // ...
      },
    });

    // store analysis
    this.results[fileName] = { returnStatements, classMethods };

    // Recurse into imports
    for (const [importedName, importedPath] of Object.entries(importMap)) {
      if (this.zipEntries.some((entry) => entry.entryName === importedPath)) {
        this.analyzeFile(importedPath, importedName);
      }
    }

    return this.results[fileName];
  }
  /**
   * Build a node tree starting from a given function name or class-method name.
   * This looks up the return statements, then recursively processes each call.
   */
  private buildNodeTreeForFunction(
    functionName: string,
    visited = new Set<string>()
  ): NodeReturn {
    // 1. Gather all entries from either returnStatements or classMethods
    const entries =
      this.findFunctionReturns(functionName) ??
      this.findClassMethodReturns(functionName);

    // If no entries found, return an unknown node
    if (!entries) {
      return {
        type: "unknown",
        value: `Function ${functionName} not found.`,
      };
    }

    // Create a synthetic node representing the function
    const rootNode: NodeReturn = {
      type: "call",
      value: functionName,
      children: [],
    };

    if (visited.has(functionName)) {
      // Circular reference detected
      rootNode.type = "unknown";
      rootNode.value = `Circular reference in ${functionName}`;
      return rootNode;
    }

    visited.add(functionName);

    // 2. For each return entry, recursively build children
    for (const entry of entries) {
      const node: NodeReturn = {
        type: entry.type,
        value: entry.value,
        relatedFunction: entry.relatedFunction,
        astNode: entry.astNode,
      };

      if (entry.type === "call" && entry.relatedFunction) {
        // Check if this call is final
        if (this.isFinalRelatedFunction(entry.relatedFunction)) {
          node.final = true;
        } else {
          // Not final, try to resolve further
          const childNode = this.buildNodeTreeForFunction(
            entry.relatedFunction,
            visited
          );
          node.children = [childNode];
        }
      }

      rootNode.children!.push(node);
    }

    return rootNode;
  }

  /**
   * Finds the return statements for a given function name across all analyzed files.
   */
  private findFunctionReturns(
    functionName: string
  ): ReturnStatementEntry[] | null {
    for (const analysis of Object.values(this.results)) {
      if (analysis.returnStatements[functionName]) {
        return analysis.returnStatements[functionName];
      }
    }
    return null;
  }

  /**
   * Finds the return statements for a given class-method name across all analyzed files.
   * e.g. "MyClass.myMethod"
   */
  private findClassMethodReturns(
    functionName: string
  ): ReturnStatementEntry[] | null {
    for (const analysis of Object.values(this.results)) {
      if (analysis.classMethods && analysis.classMethods[functionName]) {
        return analysis.classMethods[functionName];
      }
    }
    return null;
  }

  /**
   * Determine if a relatedFunction name corresponds to a final call.
   */
  private isFinalRelatedFunction(functionName: string): boolean {
    if (this.globalFinalFunctions.has(functionName)) return true;
    return false;
  }

  /**
   * The public entry point to analyze a specific Serverless function definition.
   * For example, if the handler is "fileName.handler", it will parse `fileName.js`
   * and build a call graph for `handler`.
   */
  public analyzeFunction(
    fn: Serverless.FunctionDefinitionHandler | any,
    builder: LambdaDocsBuilder<"openApi">
  ): NodeReturn {
    // e.g. "src/myLambda.handler" -> "src/myLambda.js" and "handler"
    const handlerFileName = fn.handler.split(".")[0] + ".js";
    const mainFunctionName = fn.handler.split(".")[1];

    this.analyzeFile(handlerFileName, mainFunctionName);

    // Build a node tree for the main function
    const nodeTree = this.buildNodeTreeForFunction(mainFunctionName);
    return nodeTree;
  }
}
