import "@drokt/core";

declare global {
  export namespace DroktTypes {
    export interface IDocsOpenApi extends IDocs {
      method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS" | "HEAD";
      summary: string;
      description: string;
      tags: string[];
      responses: {
        [key: string]: {
          description: string;
          content: {
            [key: string]: {
              schema: {
                type: string;
                properties: {
                  [key: string]: {
                    type: string;
                  };
                };
              };
            };
          };
        };
      };
    }
    export interface Plugins {
      openApi: IDocsOpenApi;
    }
  }
}
