// CodeAnalyzer.ts (modified excerpt)
import * as parser from "@babel/parser";
import generator from "@babel/generator";
import traverse, { NodePath } from "@babel/traverse";
import * as t from "@babel/types";
import pathnode from "path";

export type ReturnStatementEntry = {
  type: "call" | "unknown";
  value: string;
  relatedFunction?: string;
  nodePath?: NodePath;
};

export type ReturnAnalysis = {
  returnStatements: Record<string, ReturnStatementEntry[]>;
  classMethods?: Record<string, ReturnStatementEntry[]>;
};

export interface AnalyzerOptions {
  /**
   * When a function is imported from this source, calls to it are treated as final.
   */
  finalFrameworkSource: string;
}

export class CodeAnalyzer {
  // Capture function leading comments
  public functionDescriptions: Record<string, string> = {};
  // Local sets for final functions/namespaces in this file
  private localFinalFunctions: Set<string> = new Set();
  private localFinalNamespaces: Set<string> = new Set();
  // NEW: Record imported names to file paths.
  public importMap: Record<string, string> = {};

  constructor(private fileName: string, private options: AnalyzerOptions) {}

  public analyzeSource(source: string, targetFunction: string): ReturnAnalysis {
    const ast = parser.parse(source, {
      sourceType: "module",
      plugins: ["typescript", "jsx"],
    });

    const returnStatements: Record<string, ReturnStatementEntry[]> = {};
    const classMethods: Record<string, ReturnStatementEntry[]> = {};
    // Also build a local import map here.
    const localImportMap: Record<string, string> = {};

    const variableAssignments: Record<string, string> = {};

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
          } else if (
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
      collectVariableAssignments(path);
      path.traverse({
        ReturnStatement(returnPath) {
          if (!returnPath.node.argument) return;
          let returnCode = generator(returnPath.node.argument).code;
          const entry: ReturnStatementEntry = {
            type: "unknown",
            value: returnCode,
            nodePath: returnPath,
          };

          if (t.isIdentifier(returnPath.node.argument)) {
            const variableName = returnPath.node.argument.name;
            if (variableAssignments[variableName]) {
              entry.type = "call";
              entry.relatedFunction = variableAssignments[variableName];
              entry.value = variableAssignments[variableName];
            }
          } else if (t.isCallExpression(returnPath.node.argument)) {
            entry.type = "call";
            const callee = returnPath.node.argument.callee;
            if (t.isIdentifier(callee)) {
              entry.relatedFunction = callee.name;
            } else if (t.isMemberExpression(callee)) {
              if (t.isIdentifier(callee.property)) {
                entry.relatedFunction = callee.property.name;
              }
              if (t.isNewExpression(callee.object)) {
                const newExpr = callee.object;
                if (t.isIdentifier(newExpr.callee)) {
                  const className = newExpr.callee.name;
                  const methodName = t.isIdentifier(callee.property)
                    ? callee.property.name
                    : null;
                  if (methodName) {
                    entry.relatedFunction = `${className}.${methodName}`;
                  }
                }
              }
            }
          } else if (t.isAwaitExpression(returnPath.node.argument)) {
            const awaitedExpression = returnPath.node.argument.argument;
            returnCode = generator(awaitedExpression).code;
            if (t.isCallExpression(awaitedExpression)) {
              entry.type = "call";
              const callee = awaitedExpression.callee;
              if (t.isIdentifier(callee)) {
                entry.relatedFunction = callee.name;
              } else if (t.isMemberExpression(callee)) {
                if (t.isIdentifier(callee.property)) {
                  entry.relatedFunction = callee.property.name;
                }
                if (t.isNewExpression(callee.object)) {
                  const newExpr = callee.object;
                  if (t.isIdentifier(newExpr.callee)) {
                    const className = newExpr.callee.name;
                    const methodName = t.isIdentifier(callee.property)
                      ? callee.property.name
                      : null;
                    if (methodName) {
                      entry.relatedFunction = `${className}.${methodName}`;
                    }
                  }
                }
              }
              entry.value = returnCode;
            }
          }
          if (!returnStatements[functionName]) {
            returnStatements[functionName] = [];
          }
          returnStatements[functionName].push(entry);
        },
      });
    };

    // --- AST Traversal ---
    traverse(ast, {
      // For require() calls
      CallExpression: (path) => {
        if (
          t.isIdentifier(path.node.callee) &&
          path.node.callee.name === "require" &&
          t.isStringLiteral(path.node.arguments[0])
        ) {
          const importPath = path.node.arguments[0].value;
          const resolvedPath =
            pathnode
              .join(pathnode.dirname(this.fileName), importPath)
              .replace(/\\/g, "/") + ".js";
          localImportMap[importPath] = resolvedPath;
        }
      },
      // For ES Module imports
      ImportDeclaration: (path) => {
        const source = path.node.source.value;
        const resolvedPath =
          pathnode
            .join(pathnode.dirname(this.fileName), source)
            .replace(/\\/g, "/") + ".js";
        localImportMap[source] = resolvedPath;
        const isFinalSource = source === this.options.finalFrameworkSource;
        for (const specifier of path.node.specifiers) {
          if (
            t.isImportSpecifier(specifier) ||
            t.isImportDefaultSpecifier(specifier)
          ) {
            if (isFinalSource) {
              this.localFinalFunctions.add(specifier.local.name);
            }
            // Map the imported name to the file path.
            localImportMap[specifier.local.name] = resolvedPath;
          } else if (t.isImportNamespaceSpecifier(specifier)) {
            if (isFinalSource) {
              this.localFinalNamespaces.add(specifier.local.name);
            }
            localImportMap[specifier.local.name] = resolvedPath;
          }
        }
      },
      // Function declarations
      FunctionDeclaration: (path) => {
        if (path.node.id?.name === targetFunction) {
          collectReturnStatements(path, path.node.id.name);
          if (path.node.leadingComments) {
            const commentText = path.node.leadingComments
              .map((c) => c.value.trim())
              .join("\n");
            this.functionDescriptions[path.node.id.name] = commentText;
          }
        }
      },
      // Exported arrow functions
      ExportNamedDeclaration: (exportPath) => {
        const decl = exportPath.node.declaration;
        if (t.isVariableDeclaration(decl)) {
          for (const declarator of decl.declarations) {
            if (
              t.isIdentifier(declarator.id) &&
              t.isArrowFunctionExpression(declarator.init)
            ) {
              if (declarator.id.name === targetFunction) {
                const varPath = exportPath
                  .get("declaration")
                  .get("declarations")
                  .find((d) => d.node === declarator);
                if (varPath) {
                  const initPath = varPath.get("init");
                  collectReturnStatements(
                    initPath as NodePath<t.Node>,
                    declarator.id.name
                  );
                  let commentText = "";
                  if (
                    !Array.isArray(initPath) &&
                    initPath.node.leadingComments
                  ) {
                    commentText = initPath.node.leadingComments
                      .map((c) => c.value.trim())
                      .join("\n");
                  }
                  if (!commentText && exportPath.node.leadingComments) {
                    commentText = exportPath.node.leadingComments
                      .map((c) => c.value.trim())
                      .join("\n");
                  }
                  if (commentText) {
                    this.functionDescriptions[declarator.id.name] = commentText;
                  }
                }
              }
            }
          }
        }
      },
      // Assignment expressions (e.g. module.exports)
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
        if (
          path.parentPath.isExpressionStatement() &&
          path.parentPath.node.leadingComments
        ) {
          const commentText = path.parentPath.node.leadingComments
            .map((c) => c.value.trim())
            .join("\n");
          if (commentText) {
            this.functionDescriptions[functionName] = commentText;
          }
        }
      },
      // Variable declarations (arrow functions)
      VariableDeclaration: (path) => {
        path.node.declarations.forEach((declaration) => {
          if (
            t.isVariableDeclarator(declaration) &&
            t.isIdentifier(declaration.id) &&
            t.isArrowFunctionExpression(declaration.init)
          ) {
            const declaratorPath = path.get("declarations").find(
              (d) =>
                t.isVariableDeclarator(d.node) &&
                t.isIdentifier(d.node.id) &&
                // TODO: Fix this any
                d.node.id.name === (declaration.id as any).name
            );
            if (declaratorPath) {
              const initPath = declaratorPath.get("init");
              collectReturnStatements(
                initPath as NodePath<t.Node>,
                declaration.id.name
              );
              if (declaration.id.name === targetFunction) {
                let commentText = "";
                if (initPath.node && initPath.node.leadingComments) {
                  commentText = initPath.node.leadingComments
                    .map((c) => c.value.trim())
                    .join("\n");
                }
                if (!commentText && path.node.leadingComments) {
                  commentText = path.node.leadingComments
                    .map((c) => c.value.trim())
                    .join("\n");
                }
                if (commentText) {
                  this.functionDescriptions[declaration.id.name] = commentText;
                }
              }
            }
          }
        });
      },
      // Class methods
      ClassDeclaration: (classPath) => {
        if (!t.isIdentifier(classPath.node.id)) return;
        const className = classPath.node.id.name;
        for (const method of classPath.node.body.body) {
          if (!t.isClassMethod(method)) continue;
          if (method.kind !== "method" && method.kind !== "constructor")
            continue;
          const methodKey = method.key;
          if (!t.isIdentifier(methodKey)) continue;
          const methodName = methodKey.name;
          const uniqueFunctionName = `${className}.${methodName}`;
          if (!classMethods[uniqueFunctionName]) {
            classMethods[uniqueFunctionName] = [];
          }
          const methodBodyPath = classPath
            .get("body")
            .get("body")
            .find((m) => m.node === method) as NodePath<t.ClassMethod>;
          if (methodBodyPath) {
            methodBodyPath.traverse({
              VariableDeclarator(varPath) {
                const varName = t.isIdentifier(varPath.node.id)
                  ? varPath.node.id.name
                  : null;
                if (!varName) return;
                const init = varPath.node.init;
                if (!init) return;
                if (
                  t.isAwaitExpression(init) &&
                  t.isCallExpression(init.argument) &&
                  t.isIdentifier(init.argument.callee)
                ) {
                  variableAssignments[varName] = init.argument.callee.name;
                } else if (
                  t.isCallExpression(init) &&
                  t.isIdentifier(init.callee)
                ) {
                  variableAssignments[varName] = init.callee.name;
                } else if (
                  t.isCallExpression(init) &&
                  t.isMemberExpression(init.callee) &&
                  t.isNewExpression(init.callee.object)
                ) {
                  const newExpr = init.callee.object;
                  if (t.isIdentifier(newExpr.callee)) {
                    const cName = newExpr.callee.name;
                    const mName = t.isIdentifier(init.callee.property)
                      ? init.callee.property.name
                      : null;
                    if (mName) {
                      variableAssignments[varName] = `${cName}.${mName}`;
                    }
                  }
                }
              },
              ReturnStatement(retPath) {
                if (!retPath.node.argument) return;
                let returnCode = generator(retPath.node.argument).code;
                const entry: ReturnStatementEntry = {
                  type: "unknown",
                  value: returnCode,
                  nodePath: retPath,
                };
                if (t.isIdentifier(retPath.node.argument)) {
                  const varName = retPath.node.argument.name;
                  if (variableAssignments[varName]) {
                    entry.type = "call";
                    entry.relatedFunction = variableAssignments[varName];
                    entry.value = variableAssignments[varName];
                  }
                } else if (t.isCallExpression(retPath.node.argument)) {
                  entry.type = "call";
                  const callee = retPath.node.argument.callee;
                  if (t.isIdentifier(callee)) {
                    entry.relatedFunction = callee.name;
                  } else if (t.isMemberExpression(callee)) {
                    if (t.isIdentifier(callee.property)) {
                      entry.relatedFunction = callee.property.name;
                    }
                    if (t.isNewExpression(callee.object)) {
                      const newExpr = callee.object;
                      if (t.isIdentifier(newExpr.callee)) {
                        const cName = newExpr.callee.name;
                        const mName = t.isIdentifier(callee.property)
                          ? callee.property.name
                          : null;
                        if (mName) {
                          entry.relatedFunction = `${cName}.${mName}`;
                        }
                      }
                    }
                  }
                } else if (t.isAwaitExpression(retPath.node.argument)) {
                  const awaited = retPath.node.argument.argument;
                  returnCode = generator(awaited).code;
                  if (t.isCallExpression(awaited)) {
                    entry.type = "call";
                    if (t.isIdentifier(awaited.callee)) {
                      entry.relatedFunction = awaited.callee.name;
                    } else if (t.isMemberExpression(awaited.callee)) {
                      if (t.isIdentifier(awaited.callee.property)) {
                        entry.relatedFunction = awaited.callee.property.name;
                      }
                      if (t.isNewExpression(awaited.callee.object)) {
                        const newExpr = awaited.callee.object;
                        if (t.isIdentifier(newExpr.callee)) {
                          const cName = newExpr.callee.name;
                          const mName = t.isIdentifier(awaited.callee.property)
                            ? awaited.callee.property.name
                            : null;
                          if (mName) {
                            entry.relatedFunction = `${cName}.${mName}`;
                          }
                        }
                      }
                    }
                    entry.value = returnCode;
                  }
                }
                classMethods[uniqueFunctionName].push(entry);
              },
            });
          }
        }
      },
    });

    // Merge the local import map into our instance’s importMap.
    Object.assign(this.importMap, localImportMap);
    return { returnStatements, classMethods };
  }

  public getFinalFunctions() {
    return this.localFinalFunctions;
  }

  public getFinalNamespaces() {
    return this.localFinalNamespaces;
  }
}
