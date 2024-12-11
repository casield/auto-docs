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

    const returnStatements: string[] = [];
    let finalReturn: string | null = null;
    const importMap: Record<string, string> = {};

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
          console.log("Analyzing FunctionDeclaration:", path.node.id.name);
          path.traverse({
            ReturnStatement: (returnPath) => {
              const returnCode = generator(
                returnPath.node.argument as t.Node
              ).code;
              console.log("ReturnStatement:", returnCode);
              returnStatements.push(returnCode);
              if (returnPath.getFunctionParent() === path) {
                finalReturn = returnCode;
              }
            },
          });
        }
      },

      AssignmentExpression: (path) => {
        // Log the node structure for debugging
        console.log(
          "Analyzing AssignmentExpression:",
          JSON.stringify(path.node, null, 2)
        );

        // Handle `module.exports = function`
        if (
          t.isMemberExpression(path.node.left) &&
          t.isIdentifier(path.node.left.object, { name: "module" }) &&
          t.isIdentifier(path.node.left.property, { name: "exports" }) &&
          (t.isFunctionExpression(path.node.right) ||
            t.isArrowFunctionExpression(path.node.right))
        ) {
          console.log("Analyzing module.exports function or arrow function");
          path.get("right").traverse({
            ReturnStatement(returnPath) {
              const returnCode = generator(
                returnPath.node.argument as t.Node
              ).code;
              console.log("ReturnStatement in module.exports:", returnCode);
              returnStatements.push(returnCode);
              finalReturn = returnCode; // Track the last return
            },
          });
        }

        // Handle `exports.functionName = function`
        if (
          t.isMemberExpression(path.node.left) &&
          t.isIdentifier(path.node.left.object, { name: "exports" }) &&
          t.isIdentifier(path.node.left.property) &&
          (t.isFunctionExpression(path.node.right) ||
            t.isArrowFunctionExpression(path.node.right))
        ) {
          console.log(
            "Analyzing exports function:",
            path.node.left.property.name
          );
          path.get("right").traverse({
            ReturnStatement(returnPath) {
              const returnCode = generator(
                returnPath.node.argument as t.Node
              ).code;
              console.log("ReturnStatement in exports function:", returnCode);
              returnStatements.push(returnCode);
              finalReturn = returnCode; // Track the last return
            },
          });
        }
      },
    });

    this.results[fileName] = { returnStatements, finalReturn };

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

  private generate(node: t.Node): string {
    return generator(node).code;
  }
}
