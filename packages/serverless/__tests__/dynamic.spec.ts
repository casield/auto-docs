import { LambdaDocsBuilder } from "@auto-docs/core";
import { OpenApiDoc } from "@auto-docs/openapi-plugin";
import { dynamicAutoDocs } from "../src/dynamic";
import { stat } from "fs";

describe("Dynamic", () => {
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

  it("should", async () => {
    const handler = dynamicAutoDocs(async () => {
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Go Serverless v1.0! Your function executed successfully!",
        }),
      };
    }, builder);

    await handler({} as any, {} as any, undefined as any);

    // await builder.run();

    console.log("builder", builder);
  });
});
