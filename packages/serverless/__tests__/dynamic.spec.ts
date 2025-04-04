import { LambdaDocsBuilder } from "@auto-docs/core";
import { OpenApiDoc } from "@auto-docs/openapi-plugin";
import { dynamicAutoDocs } from "../src/dynamic";
import { stat } from "fs";
import path from "path";

describe("Dynamic", () => {
  const builder = new LambdaDocsBuilder({
    name: "Test",
    description: "Test",
    pluginConfig: {
      openApi: {
        outputDir: "docs",
        version: "1.0.0",
      },
    },
    plugins: [OpenApiDoc],
  });

  it("should", async () => {
    const handler = dynamicAutoDocs(async () => {
      return {
        statusCode: 200,
        body: JSON.stringify({
          array: ["hi"],
          boolean: true,
          number: 1,
          string: "hi",
          object: {
            array: ["hi"],
            boolean: true,
            number: 1,
            string: "hi",
            object: {
              array: ["hi"],
              boolean: true,
              number: 1,
              string: "hi",
            },
          },
        }),
      };
    }, builder);

    await builder.docs("openApi", {
      type: "method",
      name: "Test dynamic",
      version: "1.0.0",
      data: {
        method: "get",
        path: "/hello",
        summary: "Test dynamic",
        description: "Test dynamic",
        tags: ["hello"],
      },
    });

    await handler(
      {
        httpMethod: "get",
        path: "/hello",
      } as any,
      {} as any,
      undefined as any
    );

    const result = await builder.run();

    expect(result.openApi).toBeDefined();

    console.log("builder", JSON.stringify(result.openApi, null, 2));
  });
});
