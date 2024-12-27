import fs from "fs";
import * as parser from "@babel/parser";
import generator from "@babel/generator";
import traverse, { NodePath } from "@babel/traverse";
import * as t from "@babel/types";
import AdmZip from "adm-zip";
import Serverless from "serverless";
import pathnode from "path";

/**
 * Describes an individual return statement in a function or method.
 */
export type ReturnStatementEntry = {
  type: "call" | "unknown";
  value: string;
  relatedFunction?: string;
  /**
   * We store the original NodePath for the ReturnStatement so that
   * we can revisit or modify it later if needed.
   */
  nodePath?: NodePath;
};

/**
 * Stores information about the return statements in a file.
 * - returnStatements: top-level named functions, arrow functions, etc.
 * - classMethods: methods in classes, keyed as "ClassName.methodName"
 */
export type ReturnAnalysis = {
  returnStatements: Record<string, ReturnStatementEntry[]>;
  classMethods?: Record<string, ReturnStatementEntry[]>;
};

/**
 * A tree node representing a function (or class method) call chain.
 */
export type NodeReturn = {
  type: "call" | "unknown";
  value: string;
  relatedFunction?: string;
  final?: boolean;
  children?: NodeReturn[];
  /**
   * A reference to the NodePath we discovered so you can revisit it if needed.
   */
  nodePath?: NodePath;

  /**
   * NEW: Holds the leading comment (if any) for the *main* function.
   */
  description?: string;
};

export class LambdaFunctionAnalyzer {
  private zip: AdmZip;
  private zipEntries: AdmZip.IZipEntry[];
  private analyzedFiles: Set<string>;
  private results: Record<string, ReturnAnalysis>;

  /**
   * Easily modify this value to change the "final" framework source:
   * If a function is imported from here, we treat calls to it as "final" calls.
   */
  private finalFrameworkSource = "@drokt/serverless";

  /**
   * Global sets to track final functions and namespaces discovered.
   */
  private globalFinalFunctions: Set<string> = new Set();
  private globalFinalNamespaces: Set<string> = new Set();

  /**
   * NEW: Store descriptions for top-level functions (including exported arrow functions).
   *      Key is the function name (e.g. "handler"), value is the leading comment text.
   */
  private functionDescriptions: Record<string, string> = {};

  constructor(private artifactName: string) {
    this.zip = new AdmZip(artifactName);
    this.zipEntries = this.zip.getEntries();
    this.analyzedFiles = new Set();
    this.results = {};
  }

  /**
   * Retrieves file content from the ZIP artifact, returning it as a UTF-8 string.
   */
  private getFileContent(fileName: string): string | null {
    const entry = this.zipEntries.find((entry) => entry.entryName === fileName);
    return entry ? entry.getData().toString("utf8") : null;
  }

  /**
   * Analyzes a single file, collecting information about:
   * - Return statements (functions, arrow functions, etc.)
   * - Class methods & their returns
   * - "Final" calls (imported from special framework)
   * - Re-exports/imports, so we can recurse across files
   */
  private analyzeFile(
    fileName: string,
    targetFunction: string
  ): ReturnAnalysis {
    // Avoid re-analyzing the same file
    if (this.analyzedFiles.has(fileName)) {
      return this.results[fileName];
    }
    this.analyzedFiles.add(fileName);

    const fileContent = this.getFileContent(fileName);
    if (!fileContent) {
      throw new Error(`File ${fileName} not found in the artifact.`);
    }

    // Parse the file into an AST with Babel
    const ast = parser.parse(fileContent, {
      sourceType: "module",
      plugins: ["typescript", "jsx"],
    });

    // Structures to fill as we traverse
    const returnStatements: Record<string, ReturnStatementEntry[]> = {};
    const classMethods: Record<string, ReturnStatementEntry[]> = {};
    const importMap: Record<string, string> = {};
    const variableAssignments: Record<string, string> = {};

    // Local sets to track "final" calls discovered in this file
    const finalFunctions = new Set<string>();
    const finalNamespaces = new Set<string>();

    /**
     * 1. Collect variable assignments, such as:
     *    const x = someFunction();
     *    const x = await someFunction();
     *    const x = new MyClass().myMethod();
     */
    const collectVariableAssignments = (path: NodePath) => {
      path.traverse({
        VariableDeclarator(variablePath) {
          const variableName = t.isIdentifier(variablePath.node.id)
            ? variablePath.node.id.name
            : null;
          if (!variableName) return;

          const init = variablePath.node.init;
          if (!init) return;

          // If it's an await call like: const x = await someFunction();
          if (
            t.isAwaitExpression(init) &&
            t.isCallExpression(init.argument) &&
            t.isIdentifier(init.argument.callee)
          ) {
            variableAssignments[variableName] = init.argument.callee.name;
          }
          // If it's a direct call like: const x = someFunction();
          else if (t.isCallExpression(init) && t.isIdentifier(init.callee)) {
            variableAssignments[variableName] = init.callee.name;
          }
          // If it's "new MyClass().myMethod()"
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

    /**
     * 2. Determine if a `CallExpression` is "final" (i.e. from our special library).
     */
    const isFinalCall = (node: t.CallExpression) => {
      // If callee is an identifier
      if (t.isIdentifier(node.callee)) {
        return (
          finalFunctions.has(node.callee.name) ||
          this.globalFinalFunctions.has(node.callee.name)
        );
      }
      // If callee is something like myNamespace.foo()
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

    /**
     * 3. Collect return statements from a specific path (function, arrow function, etc.).
     */
    const collectReturnStatements = (path: NodePath, functionName: string) => {
      // Gather variable assignments within this function's scope
      collectVariableAssignments(path);

      path.traverse({
        ReturnStatement(returnPath) {
          if (!returnPath.node.argument) return;

          let returnCode = generator(returnPath.node.argument).code;
          const entry: ReturnStatementEntry = {
            type: "unknown",
            value: returnCode,
            nodePath: returnPath, // Storing the entire ReturnStatement path
          };

          // Case A: return a variable like "return x;"
          if (t.isIdentifier(returnPath.node.argument)) {
            const variableName = returnPath.node.argument.name;
            if (variableAssignments[variableName]) {
              entry.type = "call";
              entry.relatedFunction = variableAssignments[variableName];
              entry.value = variableAssignments[variableName];
            }
          }
          // Case B: return a call expression
          else if (t.isCallExpression(returnPath.node.argument)) {
            entry.type = "call";
            const callee = returnPath.node.argument.callee;

            // e.g. return myFunction();
            if (t.isIdentifier(callee)) {
              entry.relatedFunction = callee.name;
            }
            // e.g. return obj.myMethod();
            else if (t.isMemberExpression(callee)) {
              if (t.isIdentifier(callee.property)) {
                entry.relatedFunction = callee.property.name;
              }
              // new MyClass().myMethod
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
          }
          // Case C: return await call
          else if (t.isAwaitExpression(returnPath.node.argument)) {
            const awaitedExpression = returnPath.node.argument.argument;
            returnCode = generator(awaitedExpression).code;

            if (t.isCallExpression(awaitedExpression)) {
              entry.type = "call";
              const callee = awaitedExpression.callee;

              // e.g. await myFunction()
              if (t.isIdentifier(callee)) {
                entry.relatedFunction = callee.name;
              }
              // e.g. await new MyClass().myMethod()
              else if (t.isMemberExpression(callee)) {
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

          // Store it for this functionName
          if (!returnStatements[functionName]) {
            returnStatements[functionName] = [];
          }
          returnStatements[functionName].push(entry);
        },
      });
    };

    // ---- TRAVERSE THE AST ----------------------------------------------
    traverse(ast, {
      /**
       * REQUIRE statements: require("...")
       */
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

      /**
       * IMPORT statements: import ... from "..."
       */
      ImportDeclaration: (path) => {
        const source = path.node.source.value;
        const resolvedPath =
          pathnode
            .join(pathnode.dirname(fileName), source)
            .replace(/\\/g, "/") + ".js";

        const isFinalSource = source === this.finalFrameworkSource;
        for (const specifier of path.node.specifiers) {
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
        }
      },

      /**
       * FUNCTION DECLARATIONS, e.g. function targetFunction() { ... }
       */
      FunctionDeclaration: (path) => {
        if (path.node.id?.name === targetFunction) {
          collectReturnStatements(path, path.node.id.name);

          // Capture leading comment(s) if any
          if (path.node.leadingComments) {
            const commentText = path.node.leadingComments
              .map((c) => c.value.trim())
              .join("\n");
            this.functionDescriptions[path.node.id.name] = commentText;
          }
        }
      },

      /**
       * EXPORT named declarations, e.g.: export const handler = ...
       * We'll specifically look for ArrowFunctionExpression.
       */
      ExportNamedDeclaration: (exportPath) => {
        const decl = exportPath.node.declaration;
        if (t.isVariableDeclaration(decl)) {
          for (const declarator of decl.declarations) {
            if (
              t.isIdentifier(declarator.id) &&
              t.isArrowFunctionExpression(declarator.init)
            ) {
              // If the function name matches targetFunction,
              // we collect its return statements
              if (declarator.id.name === targetFunction) {
                const varPath = exportPath
                  .get("declaration")
                  .get("declarations")
                  .find((d) => d.node === declarator);

                if (varPath && varPath.isVariableDeclarator()) {
                  const initPath = varPath.get("init");
                  if (initPath && initPath.node) {
                    collectReturnStatements(
                      initPath as NodePath<t.Node>,
                      declarator.id.name
                    );

                    // Capture leading comments on the ArrowFunctionExpression
                    // Arrow function might have leading comments on itself,
                    // or on the `export ...` node. We can check both.
                    let commentText = "";
                    if (initPath.node.leadingComments) {
                      commentText = initPath.node.leadingComments
                        .map((c) => c.value.trim())
                        .join("\n");
                    }
                    // If no leadingComments directly on the arrow function,
                    // check if there's something on the ExportNamedDeclaration node
                    if (!commentText && exportPath.node.leadingComments) {
                      commentText = exportPath.node.leadingComments
                        .map((c) => c.value.trim())
                        .join("\n");
                    }

                    if (commentText) {
                      this.functionDescriptions[declarator.id.name] =
                        commentText;
                    }
                  }
                }
              }
            }
          }
        }
      },

      /**
       * ASSIGNMENT to module.exports or object property -> Might define a function
       */
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

        // Now check the parent for leadingComments
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

      /**
       * VARIABLE DECLARATIONS that define arrow functions
       */
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

                // If the name matches targetFunction, let's see if there's a leading comment
                if (declaration.id.name === targetFunction) {
                  let commentText = "";
                  // Check leading comments on the arrow function
                  if (initPath.node.leadingComments) {
                    commentText = initPath.node.leadingComments
                      .map((c) => c.value.trim())
                      .join("\n");
                  }
                  // If none, check the variable declaration itself
                  if (!commentText && path.node.leadingComments) {
                    commentText = path.node.leadingComments
                      .map((c) => c.value.trim())
                      .join("\n");
                  }
                  if (commentText) {
                    this.functionDescriptions[declaration.id.name] =
                      commentText;
                  }
                }
              }
            }
          }
        });
      },

      /**
       * CLASS DECLARATIONS -> Collect return statements from each method
       * e.g. class MyClass { myMethod() { return something; } }
       */
      ClassDeclaration: (classPath) => {
        if (!t.isIdentifier(classPath.node.id)) return;
        const className = classPath.node.id.name;

        // Look at each method in the class body
        for (const method of classPath.node.body.body) {
          if (!t.isClassMethod(method)) continue;
          if (method.kind !== "method" && method.kind !== "constructor")
            continue;

          const methodKey = method.key;
          if (!t.isIdentifier(methodKey)) continue;

          const methodName = methodKey.name;
          const uniqueFunctionName = `${className}.${methodName}`;

          // Initialize our structure
          if (!classMethods[uniqueFunctionName]) {
            classMethods[uniqueFunctionName] = [];
          }

          // We'll do a mini-traverse of the method's body to collect returns
          const methodBodyPath = classPath
            .get("body")
            .get("body")
            .find((m) => m.node === method) as NodePath<t.ClassMethod>;

          if (methodBodyPath) {
            // Also collect variable assignments inside the method
            methodBodyPath.traverse({
              VariableDeclarator(varPath) {
                const varName = t.isIdentifier(varPath.node.id)
                  ? varPath.node.id.name
                  : null;
                if (!varName) return;

                const init = varPath.node.init;
                if (!init) return;

                // Same logic as collectVariableAssignments
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
                  nodePath: retPath, // entire ReturnStatement path
                };

                // If it's "return varName"
                if (t.isIdentifier(retPath.node.argument)) {
                  const varName = retPath.node.argument.name;
                  if (variableAssignments[varName]) {
                    entry.type = "call";
                    entry.relatedFunction = variableAssignments[varName];
                    entry.value = variableAssignments[varName];
                  }
                }
                // If it's "return someCall()"
                else if (t.isCallExpression(retPath.node.argument)) {
                  entry.type = "call";
                  const callee = retPath.node.argument.callee;

                  if (t.isIdentifier(callee)) {
                    entry.relatedFunction = callee.name;
                  } else if (t.isMemberExpression(callee)) {
                    if (t.isIdentifier(callee.property)) {
                      entry.relatedFunction = callee.property.name;
                    }
                    // new MyClass().myMethod
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
                }
                // If it's "return await something"
                else if (t.isAwaitExpression(retPath.node.argument)) {
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

                // Add to classMethods
                classMethods[uniqueFunctionName].push(entry);
              },
            });
          }
        }
      },
    });

    // Store the analysis for this file
    this.results[fileName] = { returnStatements, classMethods };

    // Check for imports and analyze those files too
    for (const [importedName, importedPath] of Object.entries(importMap)) {
      if (this.zipEntries.some((entry) => entry.entryName === importedPath)) {
        // Re-analyze that imported file
        this.analyzeFile(importedPath, importedName);
      }
    }

    return this.results[fileName];
  }

  /**
   * Build a node tree starting from a given function (or "ClassName.methodName").
   */
  private buildNodeTreeForFunction(
    functionName: string,
    visited = new Set<string>()
  ): NodeReturn {
    // 1. Gather all entries from either top-level function returns or class methods
    const entries =
      this.findFunctionReturns(functionName) ??
      this.findClassMethodReturns(functionName);

    // If none found, return a placeholder
    if (!entries) {
      return {
        type: "unknown",
        value: `Function ${functionName} not found.`,
      };
    }

    // Create a synthetic root node
    const rootNode: NodeReturn = {
      type: "call",
      value: functionName,
      children: [],
      // Look up any captured leading comment
      description: this.functionDescriptions[functionName] || undefined,
    };

    // Check for circular references
    if (visited.has(functionName)) {
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
        nodePath: entry.nodePath, // carry over the NodePath
      };

      if (entry.type === "call" && entry.relatedFunction) {
        // Check if this is a final call
        if (this.isFinalRelatedFunction(entry.relatedFunction)) {
          node.final = true;
        } else {
          // Not final, keep digging
          node.children = [
            this.buildNodeTreeForFunction(entry.relatedFunction, visited),
          ];
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
   * Finds the return statements for a given class-method name (e.g. "MyClass.myMethod").
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
   * Determine if a relatedFunction corresponds to a final call.
   */
  private isFinalRelatedFunction(functionName: string): boolean {
    return this.globalFinalFunctions.has(functionName);
  }

  /**
   * Public API: analyze a Serverless function.
   * E.g. handler = "fileName.handler" -> parse "fileName.js" and gather the call graph for "handler".
   */
  public analyzeFunction(
    fn: Serverless.FunctionDefinitionHandler | any
  ): NodeReturn {
    // e.g. "functions/hello.handler" -> "functions/hello.js" / "handler"
    const handlerFileName = fn.handler.split(".")[0] + ".js";
    const mainFunctionName = fn.handler.split(".")[1];

    // Start analyzing
    this.analyzeFile(handlerFileName, mainFunctionName);

    // Build a node-based call graph
    const nodeTree = this.buildNodeTreeForFunction(mainFunctionName);
    return nodeTree;
  }
}
