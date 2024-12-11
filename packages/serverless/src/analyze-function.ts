import fs from "fs";
import * as parser from "@babel/parser";
import generator from "@babel/generator";
import traverse, { NodePath } from "@babel/traverse";
import * as t from "@babel/types";
import AdmZip from "adm-zip";
import Serverless from "serverless";
import { LambdaDocsBuilder } from "@drokt/core";
import pathnode from "path";

type ReturnAnalysis = {
  returnStatements: Record<string, string[]>;
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

    const returnStatements: Record<string, string[]> = {};
    const importMap: Record<string, string> = {};

    const collectReturnStatements = (path: NodePath, functionName: string) => {
      path.traverse({
        ReturnStatement(returnPath) {
          if (returnPath.node.argument) {
            const returnCode = generator(returnPath.node.argument).code;
            console.log(`ReturnStatement in ${functionName}:`, returnCode);

            if (!returnStatements[functionName]) {
              returnStatements[functionName] = [];
            }
            returnStatements[functionName].push(returnCode);
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
            pathnode.join(pathnode.dirname(fileName), importPath) + ".js";
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
    const objects: string[] = [];

    if (handlerResults) {
      // Iterate through functions in the handler's returnStatements record
      for (const [functionName, statements] of Object.entries(
        handlerResults.returnStatements
      )) {
        for (const statement of statements) {
          if (this.isJsonLike(statement)) {
            objects.push(statement);
          } else {
            const resolved = this.resolveReturnStatement(statement, results);
            if (resolved) objects.push(resolved);
          }
        }
      }
    }

    return objects;
  }

  private resolveReturnStatement(
    statement: string,
    results: Record<string, ReturnAnalysis>
  ): string | null {
    const functionCallMatch = statement.match(/^([a-zA-Z_$][\w$]*)\(\)$/);
    if (!functionCallMatch) return null;

    const functionName = functionCallMatch[1];
    console.log(`Resolving function call: ${functionName}`);

    for (const [fileName, analysis] of Object.entries(results)) {
      if (analysis.returnStatements[functionName]) {
        const jsonLikeReturn = analysis.returnStatements[functionName].find(
          (stmt) => this.isJsonLike(stmt)
        );

        if (jsonLikeReturn) {
          console.log(`Resolved ${functionName} to: ${jsonLikeReturn}`);
          return jsonLikeReturn;
        }
      }
    }

    console.log(`Could not resolve ${functionName}`);
    return null;
  }

  private isJsonLike(statement: string): boolean {
    try {
      // Simple heuristic: try parsing the statement as JSON
      JSON.parse(statement.replace(/(\w+):/g, '"$1":')); // Convert to JSON-compatible format
      return true;
    } catch {
      return false;
    }
  }
}
