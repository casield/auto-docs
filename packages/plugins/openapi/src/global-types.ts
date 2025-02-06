import "@drokt/core";

declare global {
  export namespace DroktTypes {
    export interface IDocsOpenApi extends IDocs {
      method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS" | "HEAD";
      summary?: string;
      tags?: string[];
      responses?: OpenApiResponse;
    }

    export interface OpenApiResponse {
      [statusCode: string]: {
        description: string;
        content: {
          [mediaType: string]: {
            schema: {
              type?: string;
              properties?: Record<string, { type: string }>;
              $ref?: string;
              oneOf?: {
                type?: string;
                properties?: Record<string, { type: string }>;
                $ref?: string;
              }[];
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
