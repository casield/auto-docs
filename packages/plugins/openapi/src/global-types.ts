import "@drokt/core";

declare global {
  export namespace DroktTypes {
    export interface IDocsOpenApi extends IDocs {
      method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS" | "HEAD";
      summary?: string;
      tags?: string[];
      responses?: ResponsesObject;
    }

    export interface Plugins {
      openApi: IDocsOpenApi;
    }

    export interface PluginConfig {
      openApi: {
        outputDir: string;
        version: string;
      };
    }
  }
}
