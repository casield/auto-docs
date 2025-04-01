import "@auto-docs/core";

declare global {
  export namespace AutoDocsTypes {
    export interface IDocsOpenApi extends IDocs {
      method: "get" | "post" | "put" | "delete" | "patch" | "options" | "head";
      summary?: string;
      description?: string;
      tags?: string[];
      responses?: ResponsesObject;
      path: string;
    }

    export interface Plugins {
      openApi: IDocsOpenApi;
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
