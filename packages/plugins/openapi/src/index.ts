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
    const spec = this.createBaseSpec(builder);

    const [methods, responses] = this.partitionDocs(docs);

    this.buildPaths(spec, methods);
    this.buildGroupedResponses(spec, responses);

    this.registerComponentSchemas(spec, responses);

    this.saveSpec(
      spec,
      builder.config.pluginConfig?.openApi.outputDir || "docs"
    );

    return spec as unknown as C;
  }

  private createBaseSpec(
    builder: LambdaDocsBuilder<AutoDocsTypes.AvailablePlugins>
  ): AutoDocsTypes.OpenAPISpec {
    return {
      openapi: "3.0.0",
      info: {
        title: builder.config.name,
        version: builder.config.pluginConfig?.openApi.version || "0.0.0",
        description: builder.config.description,
      },
      paths: {},
    };
  }

  private partitionDocs(
    docs: (
      | AutoDocsTypes.IDocsOpenApiMethod
      | AutoDocsTypes.IDocsOpenApiResponse
    )[]
  ): [
    AutoDocsTypes.IDocsOpenApiMethod[],
    AutoDocsTypes.IDocsOpenApiResponse[]
  ] {
    const methods: AutoDocsTypes.IDocsOpenApiMethod[] = [];
    const responses: AutoDocsTypes.IDocsOpenApiResponse[] = [];

    for (const doc of docs) {
      if (doc.type === "method") methods.push(doc);
      else responses.push(doc);
    }

    return [methods, responses];
  }

  private buildPaths(
    spec: AutoDocsTypes.OpenAPISpec,
    methods: AutoDocsTypes.IDocsOpenApiMethod[]
  ) {
    for (const { path, method, summary, description, tags } of methods) {
      if (!spec.paths[path]) spec.paths[path] = {};
      spec.paths[path][method] = {
        summary,
        description,
        tags,
        responses: {},
      };
    }
  }

  private buildGroupedResponses(
    spec: AutoDocsTypes.OpenAPISpec,
    responses: AutoDocsTypes.IDocsOpenApiResponse[]
  ) {
    const responseMap = this.groupResponses(responses);

    for (const [key, responseList] of responseMap.entries()) {
      const [path, method, statusCode] = key.split("::");
      const methodEntry =
        spec.paths[path]?.[
          method as AutoDocsTypes.IDocsOpenApiMethod["method"]
        ];

      if (
        !methodEntry ||
        typeof methodEntry !== "object" ||
        !methodEntry.responses
      ) {
        throw new Error(
          `Path "${path}" with method "${method}" does not have a valid responses object.`
        );
      }

      const content = this.buildContent(responseList);
      const description =
        responseList.find((r) => r.description)?.description ||
        "No description provided";

      methodEntry.responses[statusCode] = {
        description,
        content,
      };
    }
  }

  private groupResponses(
    responses: AutoDocsTypes.IDocsOpenApiResponse[]
  ): Map<string, AutoDocsTypes.IDocsOpenApiResponse[]> {
    const map = new Map<string, AutoDocsTypes.IDocsOpenApiResponse[]>();

    for (const res of responses) {
      const key = `${res.path.path}::${res.path.method}::${res.statusCode}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(res);
    }

    return map;
  }

  private buildContent(responses: AutoDocsTypes.IDocsOpenApiResponse[]): Record<
    string,
    {
      schema: AutoDocsTypes.SchemaObject | AutoDocsTypes.ReferenceObject;
    }
  > {
    const contentGroups: Record<
      string,
      (AutoDocsTypes.SchemaObject | AutoDocsTypes.ReferenceObject)[]
    > = {};

    for (const res of responses) {
      const type = res.contentType || "application/json";
      if (!res.schema) continue;

      if (res.schemaName) {
        if (!contentGroups[type]) contentGroups[type] = [];
        contentGroups[type].push({
          $ref: `#/components/schemas/${res.schemaName}`,
        });
        continue;
      }

      const schemaWithDescription =
        res.description && !("$ref" in res.schema)
          ? { ...res.schema, description: res.description }
          : res.schema;

      if (!contentGroups[type]) contentGroups[type] = [];
      contentGroups[type].push(schemaWithDescription);
    }

    const content: Record<
      string,
      {
        schema: AutoDocsTypes.SchemaObject | AutoDocsTypes.ReferenceObject;
      }
    > = {};

    for (const [type, schemas] of Object.entries(contentGroups)) {
      content[type] =
        schemas.length === 1
          ? { schema: schemas[0] }
          : { schema: { anyOf: schemas } };
    }

    return content;
  }

  private registerComponentSchemas(
    spec: AutoDocsTypes.OpenAPISpec,
    responses: AutoDocsTypes.IDocsOpenApiResponse[]
  ) {
    for (const res of responses) {
      if (res.schemaName && res.schema && !("$ref" in res.schema)) {
        if (!spec.components) spec.components = {};
        if (!spec.components.schemas) spec.components.schemas = {};
        spec.components.schemas[res.schemaName] = res.schema;
      }
    }
  }

  private saveSpec(spec: AutoDocsTypes.OpenAPISpec, outputDir: string): void {
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
