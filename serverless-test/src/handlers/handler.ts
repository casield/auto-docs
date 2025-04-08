import { otherImport } from "@/other/other-import";
import { dynamicAutoDocs } from "@auto-docs/serverless-dynamic";
import { LambdaDocsBuilder } from "@auto-docs/core";
import { OpenApiDoc } from "@auto-docs/openapi-plugin";
import * as Dynamic from "@auto-docs/serverless-dynamic";

/**
 * @auto-docs
 * This is a test function. The endpoint is /hello.
 * @name Hello Endpoint
 * @version 1.1.2
 */
const helloBase = async (event: any) => {
  if (event.queryStringParameters && event.queryStringParameters.other) {
    return await otherImport();
  }

  return {
    body: JSON.stringify({
      hello: "World",
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
});

export const hello = dynamicAutoDocs(helloBase, builder);

/**
 * Bye!
 * @param event
 * @returns
 *
 * @auto-docs
 * This is a test function. The endpoint is /bye.
 * @name Bye Endpoint
 * @version 1.1.2
 * @tags bye
 * @summary This is a test function.
 */
export const bye = async (event: any) => {
  /* @auto-docs
   * The return response is a message.
   * @statusCode 201
   * @schema { message: string }
   */
  return {
    message: "Goodbye!",
  };
};

export const proxy = Dynamic.lambdaProxy();
