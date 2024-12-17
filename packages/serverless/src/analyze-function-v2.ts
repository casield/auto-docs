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
  astNode?: t.Node; // Store the original AST node for potential modifications
};

type ReturnAnalysis = {
  returnStatements: Record<string, ReturnStatementEntry[]>;
};

type NodeReturn = {
  type: "call" | "unknown";
  value: string;
  relatedFunction?: string;
  final?: boolean;
  children?: NodeReturn[];
  astNode?: t.Node; // Include the AST node in the final structure
};

export class LambdaFunctionAnalyzer {
  private zip: AdmZip;
  private zipEntries: AdmZip.IZipEntry[];
  private analyzedFiles: Set<string>;
  private results: Record<string, ReturnAnalysis>;

  // Easily modify this value to change the final framework source:
  private finalFrameworkSource = "@drokt/serverless";

  // Global sets to track final functions and namespaces discovered
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
    const importMap: Record<string, string> = {};

    const variableAssignments: Record<string, string> = {};

    // Local sets to track final calls in this file
    const finalFunctions = new Set<string>();
    const finalNamespaces = new Set<string>();

    const collectVariableAssignments = (path: NodePath) => {
      path.traverse({
        VariableDeclarator(variablePath) {
          const variableName = t.isIdentifier(variablePath.node.id)
            ? variablePath.node.id.name
            : null;
          const init = variablePath.node.init;

          if (init && variableName) {
            // Track calls assigned to variables.
            if (
              t.isAwaitExpression(init) &&
              t.isCallExpression(init.argument)
            ) {
              if (t.isIdentifier(init.argument.callee)) {
                variableAssignments[variableName] = init.argument.callee.name;
              }
            } else if (
              t.isCallExpression(init) &&
              t.isIdentifier(init.callee)
            ) {
              variableAssignments[variableName] = init.callee.name;
            }

            // Just logging, no JSON parsing needed.
          }
        },
      });
    };

    const isFinalCall = (node: t.CallExpression) => {
      // If callee is an identifier and in finalFunctions
      if (t.isIdentifier(node.callee)) {
        return (
          finalFunctions.has(node.callee.name) ||
          this.globalFinalFunctions.has(node.callee.name)
        );
      }

      // If callee is a member expression and the object is a known final namespace
      if (t.isMemberExpression(node.callee)) {
        const object = node.callee.object;
        if (t.isIdentifier(object)) {
          return (
            finalNamespaces.has(object.name) ||
            this.globalFinalNamespaces.has(object.name)
          );
        }
      }

      return false;
    };

    const collectReturnStatements = (path: NodePath, functionName: string) => {
      collectVariableAssignments(path); // Track variable assignments in scope

      path.traverse({
        ReturnStatement(returnPath) {
          if (!returnPath.node.argument) {
            return;
          }

          let returnCode = generator(returnPath.node.argument).code;
          const entry: ReturnStatementEntry = {
            type: "unknown",
            value: returnCode,
            astNode: returnPath.node.argument, // Store the AST node here
          };

          // Resolve variables
          if (t.isIdentifier(returnPath.node.argument)) {
            const variableName = returnPath.node.argument.name;
            if (variableAssignments[variableName]) {
              returnCode = variableAssignments[variableName];
              entry.type = "call";
              entry.relatedFunction = variableAssignments[variableName];
              entry.value = returnCode;
            }
          } else if (t.isAwaitExpression(returnPath.node.argument)) {
            const awaitedExpression = returnPath.node.argument.argument;
            returnCode = generator(awaitedExpression).code;

            if (t.isCallExpression(awaitedExpression)) {
              entry.type = "call";
              entry.relatedFunction = t.isIdentifier(awaitedExpression.callee)
                ? awaitedExpression.callee.name
                : undefined;
              entry.value = returnCode;
            }
          } else if (t.isCallExpression(returnPath.node.argument)) {
            entry.type = "call";
            if (t.isIdentifier(returnPath.node.argument.callee)) {
              entry.relatedFunction = returnPath.node.argument.callee.name;
            } else if (
              t.isMemberExpression(returnPath.node.argument.callee) &&
              t.isIdentifier(returnPath.node.argument.callee.property)
            ) {
              entry.relatedFunction =
                returnPath.node.argument.callee.property.name;
            }
          }

          if (!returnStatements[functionName]) {
            returnStatements[functionName] = [];
          }
          returnStatements[functionName].push(entry);
        },
      });
    };

    traverse(ast, {
      CallExpression: (path) => {
        if (
          t.isIdentifier(path.node.callee) &&
          path.node.callee.name === "require" &&
          t.isStringLiteral(path.node.arguments[0])
        ) {
          const importPath = path.node.arguments[0].value;
          const resolvedPath =
            pathnode
              .join(pathnode.dirname(fileName), importPath)
              .replace(/\\/g, "/") + ".js";
          importMap[importPath] = resolvedPath;
        }
      },
      ImportDeclaration: (path) => {
        const source = path.node.source.value;
        const resolvedPath =
          pathnode
            .join(pathnode.dirname(fileName), source)
            .replace(/\\/g, "/") + ".js";

        const isFinalSource = source === this.finalFrameworkSource;

        path.node.specifiers.forEach((specifier) => {
          if (t.isImportSpecifier(specifier)) {
            importMap[specifier.local.name] = resolvedPath;
            if (isFinalSource) {
              finalFunctions.add(specifier.local.name);
              this.globalFinalFunctions.add(specifier.local.name);
            }
          } else if (t.isImportDefaultSpecifier(specifier)) {
            importMap[specifier.local.name] = resolvedPath;
            if (isFinalSource) {
              finalFunctions.add(specifier.local.name);
              this.globalFinalFunctions.add(specifier.local.name);
            }
          } else if (t.isImportNamespaceSpecifier(specifier)) {
            importMap[specifier.local.name] = resolvedPath;
            if (isFinalSource) {
              finalNamespaces.add(specifier.local.name);
              this.globalFinalNamespaces.add(specifier.local.name);
            }
          }
        });
      },

      FunctionDeclaration: (path) => {
        if (path.node.id?.name === targetFunction) {
          collectReturnStatements(path, path.node.id.name);
        }
      },

      AssignmentExpression: (path) => {
        const left = path.node.left;
        const right = path.node.right;

        const functionName =
          t.isMemberExpression(left) && t.isIdentifier(left.property)
            ? left.property.name
            : "module.exports";

        if (
          t.isMemberExpression(left) &&
          (t.isFunctionExpression(right) || t.isArrowFunctionExpression(right))
        ) {
          collectReturnStatements(path.get("right"), functionName);
        }
      },

      VariableDeclaration: (path) => {
        path.node.declarations.forEach((declaration) => {
          if (
            t.isVariableDeclarator(declaration) &&
            t.isIdentifier(declaration.id) &&
            t.isArrowFunctionExpression(declaration.init)
          ) {
            const declaratorPath = path
              .get("declarations")
              .find(
                (d) =>
                  t.isVariableDeclarator(d.node) &&
                  t.isIdentifier(d.node.id) &&
                  t.isIdentifier(d.node.id) &&
                  t.isIdentifier(declaration.id) &&
                  d.node.id.name === declaration.id.name
              );
            if (declaratorPath) {
              const initPath = declaratorPath.get("init");
              if (initPath && initPath.node) {
                collectReturnStatements(
                  initPath as NodePath<t.Node>,
                  declaration.id.name
                );
              }
            }
          }
        });
      },
    });

    this.results[fileName] = { returnStatements };

    for (const [importedName, importedPath] of Object.entries(importMap)) {
      if (this.zipEntries.some((entry) => entry.entryName === importedPath)) {
        this.analyzeFile(importedPath, importedName);
      }
    }

    return this.results[fileName];
  }

  public analyzeFunction(
    fn: Serverless.FunctionDefinitionHandler | any,
    builder: LambdaDocsBuilder<"openApi">
  ): NodeReturn {
    const handlerFileName = fn.handler.split(".")[0] + ".js";
    const mainFunctionName = fn.handler.split(".")[1];

    this.analyzeFile(handlerFileName, mainFunctionName);

    // Build a node tree for the main function
    const nodeTree = this.buildNodeTreeForFunction(mainFunctionName);
    return nodeTree;
  }

  /**
   * Build a node tree starting from a given function name.
   * This searches the results for the function and then recursively
   * builds a tree of returns.
   */
  private buildNodeTreeForFunction(
    functionName: string,
    visited = new Set<string>()
  ): NodeReturn {
    const entries = this.findFunctionReturns(functionName);
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

    for (const entry of entries) {
      const node: NodeReturn = {
        type: entry.type,
        value: entry.value,
        relatedFunction: entry.relatedFunction,
        astNode: entry.astNode, // Include the AST node from the entry
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
   * Determine if a relatedFunction name corresponds to a final call.
   */
  private isFinalRelatedFunction(functionName: string): boolean {
    if (this.globalFinalFunctions.has(functionName)) return true;
    return false;
  }
}
