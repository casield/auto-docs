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

    docs.sort((e) => (e.type === "method" ? -1 : 1));

    const responseMap = new Map<string, AutoDocsTypes.IDocsOpenApiResponse[]>();

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
        const key = `${doc.path.path}::${doc.path.method}::${doc.statusCode}`;
        if (!responseMap.has(key)) {
          responseMap.set(key, []);
        }
        responseMap.get(key)?.push(doc);
      }
    });

    for (const [key, responses] of responseMap.entries()) {
      const [path, method, statusCode] = key.split("::");
      const typedPath = path as keyof typeof spec.paths;
      const typedMethod = method as keyof (typeof spec.paths)[typeof typedPath];

      const pathResolved = spec.paths[typedPath]?.[typedMethod];

      if (
        !pathResolved ||
        typeof pathResolved !== "object" ||
        !("responses" in pathResolved)
      ) {
        throw new Error(
          `Path ${typedPath} with method ${typedMethod} does not have a responses object.`
        );
      }

      const contentTypeGroups: Record<string, any[]> = {};

      for (const response of responses) {
        const contentType = response.contentType || "application/json";
        if (!contentTypeGroups[contentType]) {
          contentTypeGroups[contentType] = [];
        }
        contentTypeGroups[contentType].push(response.schema);
      }

      const content: Record<string, any> = {};
      for (const [contentType, schemas] of Object.entries(contentTypeGroups)) {
        if (schemas.length === 1) {
          content[contentType] = { schema: schemas[0] };
        } else {
          content[contentType] = {
            schema: { anyOf: schemas },
          };
        }
      }

      pathResolved.responses[statusCode] = {
        description:
          responses.find((r) => r.description)?.description ||
          "No description provided",
        content,
      };
    }

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
