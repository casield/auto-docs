import "@auto-docs/core";

declare global {
  export namespace AutoDocsTypes {
    export interface IDocsOpenApiMethod extends IDocs {
      type: "method";
      data: {
        path: string;
        method:
          | "get"
          | "post"
          | "put"
          | "delete"
          | "patch"
          | "options"
          | "head";
        summary?: string;
        description?: string;
        tags?: string[];
      };
    }
    export interface IDocsOpenApiResponse extends IDocs {
      type: "response";
      data: {
        statusCode: number;
        path: {
          method: string;
          path: string;
        };
        description?: string;
        contentType?: string;
        schema?: SchemaObject | ReferenceObject;
      };
    }

    export interface Plugins {
      openApi: IDocsOpenApiMethod | IDocsOpenApiResponse;
    }

    export interface PluginConfig {
      openApi: {
        outputDir: string;
        version: string;
        schemas?: { [schema: string]: SchemaObject };
      };
    }
  }
}
