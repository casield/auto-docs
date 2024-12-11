import Serverless from "serverless";
import { LambdaDocsBuilder } from "@drokt/core";
import fs from "fs";
import * as parser from "@babel/parser";
import generator from "@babel/generator";
import traverse from "@babel/traverse";
import path from "path";
import AdmZip from "adm-zip";

export const analyzeFunction = async (
  // fn: Serverless.FunctionDefinitionHandler,
  fn: any,
  builder: LambdaDocsBuilder<"openApi">,
  artifactName: string
) => {
  const zip = new AdmZip(artifactName);

  // Get the entries
  const zipEntries = zip.getEntries();

  const handlerFileName = fn.handler.split(".")[0] + ".js";

  zipEntries.forEach((zipEntry) => {
    if (zipEntry.entryName === handlerFileName) {
      const fileContent = zipEntry.getData().toString("utf8");
      const ast = parser.parse(fileContent, {
        sourceType: "module",
        plugins: ["jsx"],
      });

      traverse(ast, {
        enter(path) {
          // Check for all function-like constructs
          if (
            path.isFunctionDeclaration() ||
            path.isArrowFunctionExpression() ||
            path.isFunctionExpression()
          ) {
            // Generate the source code of the function
            const functionCode = generator(path.node).code;

            if (functionCode.includes("Go Serverless v4!")) {
              console.log("Found Function Code:\n", functionCode);
            }
          }
        },
      });
    }
  });
};
