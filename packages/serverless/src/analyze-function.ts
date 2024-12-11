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
  returnStatements: string[];
  finalReturn: string | null;
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
      return this.results[fileName]; // Avoid re-analysis
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

    const returnStatements: string[] = [];
    let finalReturn: string | null = null;
    const importMap: Record<string, string> = {};

    traverse(ast, {
      CallExpression: (path) => {
        if (
          t.isIdentifier(path.node.callee) &&
          path.node.callee.name === "require" &&
          path.node.arguments.length === 1 &&
          t.isStringLiteral(path.node.arguments[0])
        ) {
          const importPath = path.node.arguments[0].value;
          const resolvedPath =
            pathnode.join(pathnode.dirname(fileName), importPath) + ".js";
          if (t.isVariableDeclarator(path.parent)) {
            const localName = (path.parent.id as t.ObjectPattern).properties
              .map((prop) => {
                const key = (prop as t.ObjectProperty).key;
                return t.isIdentifier(key) ? key.name : null;
              })
              .filter((name): name is string => name !== null)
              .join(", ");
            if (localName) {
              importMap[localName] = resolvedPath;
            }
          }
        }
      },

      FunctionDeclaration: (path: NodePath<t.FunctionDeclaration>) => {
        if (path.node.id?.name === targetFunction) {
          path.traverse({
            ReturnStatement: (returnPath: NodePath<t.ReturnStatement>) => {
              const returnCode = generator(
                returnPath.node.argument as t.Node
              ).code;
              returnStatements.push(returnCode);

              // Track the final return statement
              if (returnPath.getFunctionParent() === path) {
                finalReturn = returnCode;
              }
            },
          });
        }
      },

      ArrowFunctionExpression: (path: NodePath<t.ArrowFunctionExpression>) => {
        if (
          t.isVariableDeclarator(path.parent) &&
          t.isIdentifier(path.parent.id) &&
          path.parent.id.name === targetFunction
        ) {
          path.traverse({
            ReturnStatement: (returnPath: NodePath<t.ReturnStatement>) => {
              const returnCode = generator(
                returnPath.node.argument as t.Node
              ).code;
              returnStatements.push(returnCode);

              // Track the final return statement
              if (returnPath.getFunctionParent() === path) {
                finalReturn = returnCode;
              }
            },
          });
        }
      },
    });

    // Store results for the current file
    this.results[fileName] = { returnStatements, finalReturn };

    // Recursively analyze imports
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

    return this.results;
  }
}
