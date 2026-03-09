import "./global-types";
import "./open-api";
import { AutoDocsPlugin, AutoDocsBuilder } from "@auto-docs/core";
import type { NodeReturn } from "@auto-docs/core";
import fs from "fs";

export * from "./types";
export * from "./utils";

const META_PREFIX = "AUTO_DOCS_META:";

export interface OpenApiDocOptions {
  outputDir?: string;
  version?: string;
}

export class OpenApiDoc extends AutoDocsPlugin<"openApi"> {
  private opts: OpenApiDocOptions;
  /** Accumulated OpenAPI spec built incrementally by onAnalysis calls. */
  private spec: AutoDocsTypes.OpenAPISpec | null = null;

  constructor(opts: OpenApiDocOptions = {}) {
    super("openApi");
    this.opts = opts;
  }

  // ─── onAnalysis hook (CI pipeline) ────────────────────────────────────────

  /**
   * Called once per entry point with the full call tree.
   * Checks the root node's `description` for `AUTO_DOCS_META:<json>`,
   * extracts HTTP metadata, and accumulates a path item into the spec.
   * Writes the spec to disk each time a new route is added.
   */
  public onAnalysis(trees: NodeReturn[]): void {
    const root = trees[0];
    if (!root) return;

    const meta = this.parseMeta(root.description);
    if (!meta) return; // no route metadata — skip silently

    const { httpMethod, httpPath } = meta;
    if (!httpMethod || !httpPath) return;

    const method = String(httpMethod).toLowerCase() as AutoDocsTypes.OpenApiMethods;
    const path = String(httpPath);

    this.ensureSpec();
    if (!this.spec!.paths[path]) this.spec!.paths[path] = {};

    this.spec!.paths[path][method] = {
      summary: root.description?.replace(new RegExp(`${META_PREFIX}.*$`), "").trim() || "",
      description: "",
      tags: [],
      responses: {},
    };

    this.writeSpec();
  }

  /**
   * Explicitly flush the accumulated spec to disk.
   * Useful after a series of `onAnalysis` calls when the runner has finished.
   */
  public flush(): void {
    if (this.spec && Object.keys(this.spec.paths).length > 0) {
      this.writeSpec();
    }
  }

  // ─── Legacy onBuild hook (manual .docs() flow) ────────────────────────────

  public onBuild<C>(
    docs: (
      | AutoDocsTypes.IDocsOpenApiMethod
      | AutoDocsTypes.IDocsOpenApiResponse
    )[],
    builder: AutoDocsBuilder<any>
  ) {
    const spec = this.createBaseSpec(builder);

    const [methods, responses] = this.partitionDocs(docs);

    this.buildPaths(spec, methods);
    this.buildGroupedResponses(spec, responses);

    this.registerComponentSchemas(spec, responses);

    this.saveSpec(spec, this.opts.outputDir || "docs");

    return spec as unknown as C;
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private parseMeta(
    description: string | undefined
  ): Record<string, unknown> | null {
    if (!description) return null;
    const idx = description.indexOf(META_PREFIX);
    if (idx === -1) return null;
    try {
      return JSON.parse(description.slice(idx + META_PREFIX.length));
    } catch {
      return null;
    }
  }

  private ensureSpec(): void {
    if (!this.spec) {
      this.spec = {
        openapi: "3.0.0",
        info: {
          title: "AutoDocs",
          version: this.opts.version || "0.0.0",
          description: "",
        },
        paths: {},
      };
    }
  }

  private writeSpec(): void {
    if (!this.spec) return;
    const outputDir = this.opts.outputDir || "docs";
    this.saveSpec(this.spec, outputDir);
  }

  private createBaseSpec(
    builder: AutoDocsBuilder<any>
  ): AutoDocsTypes.OpenAPISpec {
    return {
      openapi: "3.0.0",
      info: {
        title: builder.config.name,
        version: this.opts.version || "0.0.0",
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
    for (const { path, summary, description, tags } of methods) {
      if (!spec.paths[path.path]) spec.paths[path.path] = {};
      spec.paths[path.path][path.method] = {
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
        spec.paths[path]?.[method as AutoDocsTypes.OpenApiMethods];

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
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(
      `${outputDir}/openapi.json`,
      JSON.stringify(spec, null, 2)
    );
  }

  onDoc(
    doc: AutoDocsTypes.IDocsOpenApiMethod | AutoDocsTypes.IDocsOpenApiResponse
  ): AutoDocsTypes.IDocsOpenApiMethod | AutoDocsTypes.IDocsOpenApiResponse {
    doc.path.method =
      doc.path.method.toLowerCase() as AutoDocsTypes.OpenApiMethods;

    return doc;
  }

  onStart(builder: AutoDocsBuilder<any>): void { }
  onEnd(builder: AutoDocsBuilder<any>): void { }
}
