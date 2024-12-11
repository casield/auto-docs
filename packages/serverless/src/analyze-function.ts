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
  type: "call" | "json" | "unknown";
  value: string;
  relatedFunction?: string;
};

type ReturnAnalysis = {
  returnStatements: Record<string, ReturnStatementEntry[]>;
};

export class LambdaFunctionAnalyzer {
  private zip: AdmZip;
  private zipEntries: AdmZip.IZipEntry[];
  private analyzedFiles: Set<string>;
  private results: Record<string, ReturnAnalysis>;

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
      console.log(`Skipping already analyzed file: ${fileName}`);
      return this.results[fileName];
    }
    this.analyzedFiles.add(fileName);

    const fileContent = this.getFileContent(fileName);
    if (!fileContent) {
      throw new Error(`File ${fileName} not found in the artifact.`);
    }

    console.log(`Analyzing file: ${fileName}`);
    const ast = parser.parse(fileContent, {
      sourceType: "module",
      plugins: ["typescript", "jsx"],
    });

    const returnStatements: Record<string, ReturnStatementEntry[]> = {};
    const importMap: Record<string, string> = {};

    const isJsonLike = this.isJsonLike;

    const collectReturnStatements = (path: NodePath, functionName: string) => {
      path.traverse({
        ReturnStatement(returnPath) {
          if (returnPath.node.argument) {
            let returnCode = generator(returnPath.node.argument).code;
            const entry: ReturnStatementEntry = {
              type: "unknown",
              value: returnCode,
            };

            // Check for AwaitExpression
            if (t.isAwaitExpression(returnPath.node.argument)) {
              const awaitedExpression = returnPath.node.argument.argument;
              returnCode = generator(awaitedExpression).code;

              if (
                t.isCallExpression(awaitedExpression) &&
                t.isIdentifier(awaitedExpression.callee)
              ) {
                entry.type = "call";
                entry.relatedFunction = awaitedExpression.callee.name;
              } else if (isJsonLike(returnCode)) {
                entry.type = "json";
              }
            } else if (t.isCallExpression(returnPath.node.argument)) {
              if (t.isIdentifier(returnPath.node.argument.callee)) {
                entry.type = "call";
                entry.relatedFunction = returnPath.node.argument.callee.name;
              }
            } else if (isJsonLike(returnCode)) {
              entry.type = "json";
            }

            console.log(`ReturnStatement in ${functionName}:`, entry);

            if (!returnStatements[functionName]) {
              returnStatements[functionName] = [];
            }
            returnStatements[functionName].push(entry);
          }
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

      FunctionDeclaration: (path) => {
        if (path.node.id?.name === targetFunction) {
          console.log(`Analyzing FunctionDeclaration: ${path.node.id.name}`);
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
          console.log(`Analyzing ${functionName}`);
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
            console.log(`Analyzing arrow function: ${declaration.id.name}`);
            const declaratorPath = path
              .get("declarations")
              .find(
                (d) =>
                  t.isVariableDeclarator(d.node) &&
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
  ): Record<string, ReturnAnalysis> {
    const handlerFileName = fn.handler.split(".")[0] + ".js";
    const mainFunctionName = fn.handler.split(".")[1];

    this.analyzeFile(handlerFileName, mainFunctionName);

    console.log("Results:");
    console.log(this.results);

    const extractedObjects = this.extractJsonObjects(
      this.results,
      handlerFileName
    );
    console.log("Extracted JSON Objects:");
    console.log(extractedObjects);

    return this.results;
  }

  private extractJsonObjects(
    results: Record<string, ReturnAnalysis>,
    handlerFileName: string
  ): string[] {
    const handlerResults = results[handlerFileName];
    const resolvedObjects: string[] = [];
    const resolutionCache: Record<string, string[]> = {};

    if (!handlerResults) {
      console.log(`No handler results found for file: ${handlerFileName}`);
      return resolvedObjects;
    }

    for (const [functionName, statements] of Object.entries(
      handlerResults.returnStatements
    )) {
      for (const entry of statements) {
        if (entry.type === "unknown") {
          console.log(`Adding JSON-like object directly: ${entry.value}`);
          resolvedObjects.push(entry.value);
        } else if (entry.type === "call" && entry.relatedFunction) {
          if (!resolutionCache[entry.relatedFunction]) {
            resolutionCache[entry.relatedFunction] =
              this.resolveReturnStatements(entry.relatedFunction, results) ||
              [];
          }

          if (resolutionCache[entry.relatedFunction].length > 0) {
            console.log(
              `Resolved function call ${entry.relatedFunction} to:`,
              resolutionCache[entry.relatedFunction]
            );
            resolvedObjects.push(...resolutionCache[entry.relatedFunction]);
          }
        }
      }
    }

    return resolvedObjects;
  }

  private resolveReturnStatements(
    functionName: string,
    results: Record<string, ReturnAnalysis>,
    visited: Set<string> = new Set()
  ): string[] {
    console.log(`Resolving function call: ${functionName}`);

    if (visited.has(functionName)) {
      console.log(`Circular reference detected for ${functionName}`);
      return []; // Prevent infinite loops
    }

    visited.add(functionName);

    const resolvedObjects: string[] = [];

    for (const [fileName, analysis] of Object.entries(results)) {
      if (analysis.returnStatements[functionName]) {
        for (const stmt of analysis.returnStatements[functionName]) {
          if (stmt.type === "unknown") {
            console.log(`Resolved ${functionName} to JSON: ${stmt.value}`);
            resolvedObjects.push(stmt.value);
          } else if (stmt.type === "call" && stmt.relatedFunction) {
            console.log(
              `Resolving nested call: ${stmt.relatedFunction} from ${functionName}`
            );
            const nestedResults = this.resolveReturnStatements(
              stmt.relatedFunction,
              results,
              visited
            );
            resolvedObjects.push(...nestedResults);
          }
        }
      }
    }

    if (resolvedObjects.length === 0) {
      console.log(`Could not resolve ${functionName}`);
    }

    return resolvedObjects;
  }

  private isJsonLike(statement: string): boolean {
    try {
      const jsonCompatible = statement
        .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?\s*:/g, '"$2":') // Ensure keys are quoted
        .replace(/'/g, '"');
      JSON.parse(jsonCompatible);
      return true;
    } catch {
      return false;
    }
  }
}
