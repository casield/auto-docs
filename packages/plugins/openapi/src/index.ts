import "./global-types";
import "./open-api";
import { AutoDocsPlugin, LambdaDocsBuilder } from "@auto-docs/core";
import fs from "fs";

export * from "./types";
export * from "./utils";

export class OpenApiDoc extends AutoDocsPlugin<"openApi"> {
  constructor() {
    super("openApi");
  }

  public onBuild<C>(
    docs: (
      | AutoDocsTypes.IDocsOpenApiMethod
      | AutoDocsTypes.IDocsOpenApiResponse
    )[],
    builder: LambdaDocsBuilder<AutoDocsTypes.AvailablePlugins>
  ) {
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
        const { path, method, summary, description, tags } = doc;
        if (!spec.paths[path]) {
          spec.paths[path] = {};
        }
        spec.paths[path][method] = {
          summary,
          description,
          tags,
          responses: {},
        };
      } else if (doc.type === "response") {
        const { statusCode, description, contentType, schema, path } = doc;
        const typedPath = path.path as keyof typeof spec.paths;
        const typedMethod =
          path.method as keyof (typeof spec.paths)[typeof typedPath];

        const pathResolved = spec.paths[typedPath]?.[typedMethod];

        if (!pathResolved) {
          throw new Error(
            `Path ${typedPath} with method ${typedMethod} not found in OpenAPI spec.`
          );
        }

        if (
          !pathResolved ||
          typeof pathResolved !== "object" ||
          !("responses" in pathResolved)
        ) {
          throw new Error(
            `Path ${typedPath} with method ${typedMethod} does not have a responses object.`
          );
        }

        if (!pathResolved.responses) {
          pathResolved.responses = {};
        }
        pathResolved.responses[statusCode] = {
          description: description || "No description provided",
          content: {
            [contentType || "application/json"]: {
              schema: schema,
            },
          },
        };
      }
    });

    this.saveSpec(
      spec,
      builder.config.pluginConfig?.openApi.outputDir || "docs"
    );

    return spec as unknown as C;
  }
  saveSpec(spec: AutoDocsTypes.OpenAPISpec, outputDir: string): void {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    fs.writeFileSync(
      `${outputDir}/openapi.json`,
      JSON.stringify(spec, null, 2)
    );
  }
  onStart(builder: LambdaDocsBuilder<AutoDocsTypes.AvailablePlugins>): void {}
  onEnd(builder: LambdaDocsBuilder<AutoDocsTypes.AvailablePlugins>): void {}
}
