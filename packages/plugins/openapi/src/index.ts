import "./global-types";
import "./open-api";
import { AutoDocsPlugin, LambdaDocsBuilder } from "@auto-docs/core";

export * from "./types";
export * from "./utils";

export class OpenApiDoc extends AutoDocsPlugin<"openApi"> {
  constructor() {
    super("openApi");
  }

  public onBuild(
    docs: (
      | AutoDocsTypes.IDocsOpenApiMethod
      | AutoDocsTypes.IDocsOpenApiResponse
    )[],
    builder: LambdaDocsBuilder<AutoDocsTypes.AvailablePlugins>
  ): void {
    const spec: AutoDocsTypes.OpenAPISpec = {
      openapi: "3.0.0",
      info: {
        title: builder.config.name,
        version: builder.config.pluginConfig?.openApi.version || "1.0.0",
        description: builder.config.description,
      },
      paths: {},
    };

    docs.forEach((doc) => {
      if (doc.type === "method") {
        const { path, method, summary, description, tags } = doc.data;
        if (!spec.paths[path]) {
          spec.paths[path] = {};
        }
        spec.paths[path][method] = {
          summary,
          description,
          tags,
          responses: {
            200: {
              description: "Success",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: builder.config.pluginConfig?.openApi.schemas,
                  },
                },
              },
            },
          },
        };
      } else if (doc.type === "response") {
        const { statusCode, description, contentType, schema } = doc.data;
        const response = {
          description: description || "No description provided",
          content: {
            [contentType || "application/json"]: {
              schema: schema || {
                type: "object",
                properties: builder.config.pluginConfig?.openApi.schemas,
              },
            },
          },
        };
        for (const path in spec.paths) {
          for (const method in spec.paths[path]) {
            const typedPath = path as keyof typeof spec.paths;
            const typedMethod =
              method as keyof (typeof spec.paths)[typeof typedPath];

            const pathResolved = spec.paths[typedPath]?.[typedMethod];

            if (
              !pathResolved ||
              typeof pathResolved !== "object" ||
              !("responses" in pathResolved)
            ) {
              continue;
            }

            if (!pathResolved.responses) {
              pathResolved.responses = {};
            }
            pathResolved.responses[statusCode] = response;
          }
        }
      }
    });

    console.log("OpenAPI Spec:", JSON.stringify(spec, null, 2));
  }
  onEnd(builder: LambdaDocsBuilder<AutoDocsTypes.AvailablePlugins>): void {}
}
