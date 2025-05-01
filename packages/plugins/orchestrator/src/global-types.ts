declare global {
  export namespace AutoDocsTypes {
    export interface PluginConfig {
      orchestrator: OrchestratorConfig;
    }

    export interface EndpointConfig {
      url: string;
      method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
      headers?: Record<string, string>;
      timeout?: number;
    }

    export interface OrchestratorConfig {
      endpoints: EndpointConfig[];
      defaultHeaders?: Record<string, string>;
      retryOptions?: {
        maxRetries: number;
        delayMs: number;
      };
    }

    export interface OrchestratorResponse {
      endpointUrl: string;
      statusCode: number;
      data: any;
      headers: Record<string, string>;
    }

    export interface OrchestratorResult {
      responses: OrchestratorResponse[];
      successful: boolean;
      errors?: Error[];
    }
  }
}

export {};
