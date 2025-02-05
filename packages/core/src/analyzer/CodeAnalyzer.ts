// CodeAnalyzer.ts
import * as parser from "@babel/parser";
import generator from "@babel/generator";
import traverse, { NodePath } from "@babel/traverse";
import * as t from "@babel/types";
import pathnode from "path";

// Extended return entry type: add an optional className field.
export type ReturnStatementEntry = {
  type: "call" | "literal" | "object" | "unknown";
  value: string;
  relatedFunction?: string;
  importSource?: string; // Where the function was imported from
  nodePath?: NodePath;
  className?: string; // NEW: If coming from a class method, record the class.
};

export type ReturnAnalysis = {
  // Now, both function declarations and class methods are merged here.
  returnStatements: Record<string, ReturnStatementEntry[]>;
};

export interface AnalyzerOptions {}

export class CodeAnalyzer {
  // Captures leading comments for functions.
  public functionDescriptions: Record<string, string> = {};
  // Record imported names to file paths.
  public importMap: Record<string, string> = {};

  constructor(private fileName: string, private options: AnalyzerOptions) {}

  /**
   * Analyze the given source and return ALL return statements found,
   * keyed by function name. For class methods, the key is of the form "ClassName.methodName"
   * and each entry will include a `className` attribute.
   */
  public analyzeSource(source: string): ReturnAnalysis {
    const ast = parser.parse(source, {
      sourceType: "module",
      plugins: ["typescript", "jsx"],
    });

    // All return statements—this mapping now includes both ordinary functions and class methods.
    const returnStatements: Record<string, ReturnStatementEntry[]> = {};
    // Build a local import map.
    const localImportMap: Record<string, string> = {};

    // Map variable names to the function names they’re assigned to.
    const variableAssignments: Record<string, string> = {};

    // Helper: add an entry only if one with the same start location doesn't exist.
    const addReturnEntry = (
      functionName: string,
      entry: ReturnStatementEntry
    ) => {
      if (!returnStatements[functionName]) {
        returnStatements[functionName] = [];
      }
      const entryStart = entry.nodePath?.node.start;
      if (
        !returnStatements[functionName].some(
          (existing) => existing.nodePath?.node.start === entryStart
        )
      ) {
        returnStatements[functionName].push(entry);
      }
    };

    const collectVariableAssignments = (path: NodePath) => {
      path.traverse({
        VariableDeclarator(variablePath) {
          const variableName = t.isIdentifier(variablePath.node.id)
            ? variablePath.node.id.name
            : null;
          if (!variableName) return;
          const init = variablePath.node.init;
          if (!init) return;

          // Example: const x = someFunction();
          if (
            t.isAwaitExpression(init) &&
            t.isCallExpression(init.argument) &&
            t.isIdentifier(init.argument.callee)
          ) {
            variableAssignments[variableName] = init.argument.callee.name;
          } else if (t.isCallExpression(init) && t.isIdentifier(init.callee)) {
            variableAssignments[variableName] = init.callee.name;
          }
          // Example: const x = new MyClass().myMethod();
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

    const collectReturnStatements = (
      path: NodePath,
      functionName: string,
      extra?: { className?: string }
    ) => {
      collectVariableAssignments(path);
      path.traverse({
        ReturnStatement(returnPath) {
          if (!returnPath.node.argument) return;
          let returnCode = generator(returnPath.node.argument).code;
          const entry: ReturnStatementEntry = {
            type: "unknown",
            value: returnCode,
            nodePath: returnPath,
            ...extra,
          };

          // Case A: Returning an identifier (a variable)
          if (t.isIdentifier(returnPath.node.argument)) {
            const variableName = returnPath.node.argument.name;
            if (variableAssignments[variableName]) {
              entry.type = "call";
              entry.relatedFunction = variableAssignments[variableName];
              entry.value = variableAssignments[variableName];
            } else {
              entry.type = "literal";
            }
          }
          // Case B: Returning a call expression
          else if (t.isCallExpression(returnPath.node.argument)) {
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
          }
          // Case C: Returning an await expression wrapping a call.
          else if (t.isAwaitExpression(returnPath.node.argument)) {
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
          // Case D: Returning a literal value (number, string, boolean, or null)
          else if (
            t.isNumericLiteral(returnPath.node.argument) ||
            t.isStringLiteral(returnPath.node.argument) ||
            t.isBooleanLiteral(returnPath.node.argument) ||
            t.isNullLiteral(returnPath.node.argument)
          ) {
            entry.type = "literal";
          }
          // Case E: Returning an object expression.
          else if (t.isObjectExpression(returnPath.node.argument)) {
            entry.type = "object";
          }

          // If the entry is a call and we have an import mapping for the related function,
          // record the source.
          if (entry.type === "call" && entry.relatedFunction) {
            const importedFrom = localImportMap[entry.relatedFunction];
            if (importedFrom) {
              entry.importSource = importedFrom;
            }
          }
          addReturnEntry(functionName, entry);
        },
      });
    };

    // --- AST Traversal ---
    traverse(ast, {
      // Handle require() calls (CommonJS)
      CallExpression: (path) => {
        if (
          t.isIdentifier(path.node.callee) &&
          path.node.callee.name === "require" &&
          t.isStringLiteral(path.node.arguments[0])
        ) {
          const importPath = path.node.arguments[0].value;
          // For file paths, join with the directory; for modules, leave as is.
          const resolvedPath =
            importPath.startsWith("./") || importPath.startsWith("../")
              ? pathnode
                  .join(pathnode.dirname(this.fileName), importPath)
                  .replace(/\\/g, "/")
              : importPath;
          localImportMap[importPath] = resolvedPath;
        }
      },
      // Handle ES Module imports
      ImportDeclaration: (path) => {
        const source = path.node.source.value;
        const resolvedPath =
          source.startsWith("./") || source.startsWith("../")
            ? pathnode
                .join(pathnode.dirname(this.fileName), source)
                .replace(/\\/g, "/")
            : source;
        localImportMap[source] = resolvedPath;
        for (const specifier of path.node.specifiers) {
          if (
            t.isImportSpecifier(specifier) ||
            t.isImportDefaultSpecifier(specifier)
          ) {
            localImportMap[specifier.local.name] = resolvedPath;
          } else if (t.isImportNamespaceSpecifier(specifier)) {
            localImportMap[specifier.local.name] = resolvedPath;
          }
        }
      },
      // Process function declarations.
      FunctionDeclaration: (path) => {
        if (path.node.id && path.node.id.name) {
          const funcName = path.node.id.name;
          collectReturnStatements(path, funcName);
          if (path.node.leadingComments) {
            const commentText = path.node.leadingComments
              .map((c) => c.value.trim())
              .join("\n");
            this.functionDescriptions[funcName] = commentText;
          }
        }
      },
      // Process exported arrow functions.
      ExportNamedDeclaration: (exportPath) => {
        const decl = exportPath.node.declaration;
        if (t.isVariableDeclaration(decl)) {
          for (const declarator of decl.declarations) {
            if (
              t.isIdentifier(declarator.id) &&
              t.isArrowFunctionExpression(declarator.init)
            ) {
              const funcName = declarator.id.name;
              const varPath = exportPath
                .get("declaration")
                .get("declarations")
                .find((d) => d.node === declarator);
              if (varPath) {
                const initPath = varPath.get("init");
                collectReturnStatements(initPath as NodePath<t.Node>, funcName);
                let commentText = "";
                if (!Array.isArray(initPath) && initPath.node.leadingComments) {
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
                  this.functionDescriptions[funcName] = commentText;
                }
              }
            }
          }
        }
      },
      // Process assignment expressions (e.g. module.exports = () => { ... })
      AssignmentExpression: (path) => {
        const left = path.node.left;
        const funcName =
          t.isMemberExpression(left) && t.isIdentifier(left.property)
            ? left.property.name
            : "module.exports";
        if (
          t.isMemberExpression(left) &&
          (t.isFunctionExpression(path.node.right) ||
            t.isArrowFunctionExpression(path.node.right))
        ) {
          collectReturnStatements(path.get("right"), funcName);
        }
        if (
          path.parentPath.isExpressionStatement() &&
          path.parentPath.node.leadingComments
        ) {
          const commentText = path.parentPath.node.leadingComments
            .map((c) => c.value.trim())
            .join("\n");
          if (commentText) {
            this.functionDescriptions[funcName] = commentText;
          }
        }
      },
      // Process variable declarations for arrow functions.
      VariableDeclaration: (path) => {
        path.node.declarations.forEach((declaration) => {
          if (
            t.isVariableDeclarator(declaration) &&
            t.isIdentifier(declaration.id) &&
            t.isArrowFunctionExpression(declaration.init)
          ) {
            const funcName = declaration.id.name;
            const declaratorPath = path
              .get("declarations")
              .find(
                (d) =>
                  t.isVariableDeclarator(d.node) &&
                  t.isIdentifier(d.node.id) &&
                  d.node.id.name === funcName
              );
            if (declaratorPath) {
              const initPath = declaratorPath.get("init");
              collectReturnStatements(initPath as NodePath<t.Node>, funcName);
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
                this.functionDescriptions[funcName] = commentText;
              }
            }
          }
        });
      },
      // Process class declarations.
      ClassDeclaration: (classPath) => {
        if (!t.isIdentifier(classPath.node.id)) return;
        const className = classPath.node.id.name;
        for (const method of classPath.node.body.body) {
          if (!t.isClassMethod(method)) continue;
          if (method.kind !== "method" && method.kind !== "constructor")
            continue;
          if (!t.isIdentifier(method.key)) continue;
          const methodName = method.key.name;
          // Create a unique function key combining the class name and method name.
          const uniqueFuncName = `${className}.${methodName}`;
          // When processing class methods, pass in extra info (the className).
          const extra = { className };
          const methodBodyPath = classPath
            .get("body")
            .get("body")
            .find((m) => m.node === method) as NodePath<t.ClassMethod>;
          if (methodBodyPath) {
            collectReturnStatements(methodBodyPath, uniqueFuncName, extra);
          }
          // Optionally, capture any leading comments for the method.
          if (method.leadingComments) {
            const commentText = method.leadingComments
              .map((c) => c.value.trim())
              .join("\n");
            this.functionDescriptions[uniqueFuncName] = commentText;
          }
        }
      },
    });

    // Merge the local import map into the instance’s importMap.
    Object.assign(this.importMap, localImportMap);
    return { returnStatements };
  }
}
