import { otherImport } from "@/other/other-import";
import { dynamicAutoDocs } from "@auto-docs/serverless";
import { LambdaDocsBuilder } from "@auto-docs/core";
import { OpenApiDoc } from "@auto-docs/openapi-plugin";

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

  /* @auto-docs
   * The return response is a User object or a message.
   * @statusCode 201
   * @schema { message: string }
   */
  return {
    message: "Go Serverless v1.0! Your function executed successfully!",
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
      schemas: {},
    },
  },

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
