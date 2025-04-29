import { otherImport } from "@/other/other-import";
import { dynamicAutoDocs } from "@auto-docs/serverless-dynamic";
import { LambdaDocsBuilder } from "@auto-docs/core";
import { OpenApiDoc } from "@auto-docs/openapi-plugin";
import * as Dynamic from "@auto-docs/serverless-dynamic";

const branch = "main2";

const helloBase = async (event: any) => {
  if (event.queryStringParameters && event.queryStringParameters.other) {
    return await otherImport();
  }

  return {
    body: JSON.stringify({
      hello: "World",
      omg: "so cool",
      omg2: "so cool",
    }),
    description: "Wow this is so cool!",
    schema: "com.drokt.HelloMessage",
    statusCode: 200,
  };
};

const builder = new LambdaDocsBuilder({
  name: "Test",
  description: "Test",
  pluginConfig: {
    openApi: {
      outputDir: "docs",
      version: "1.0.0",
    },
  },
  linker: new Dynamic.DynamoLinker("dynamicDocs"),
  plugins: [OpenApiDoc],
  branch,
});

export const hello = dynamicAutoDocs(helloBase, builder, branch);

const byeBase = async (event: any) => {
  return {
    statusCode: 201,
    message: "Goodbye!",
  };
};

export const bye = dynamicAutoDocs(byeBase, builder, branch);

export const proxy = Dynamic.lambdaProxy();
