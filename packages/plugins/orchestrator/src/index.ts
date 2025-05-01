import "./global-types";
import { AutoDocsBuilder, AutoDocsPlugin } from "@auto-docs/core";

export class OrchestratorPlugin extends AutoDocsPlugin<"orchestrator"> {
  constructor() {
    super("orchestrator");
  }
  private endpoints: AutoDocsTypes.EndpointConfig[] = [];
  private config: AutoDocsTypes.OrchestratorConfig | undefined;

  async onBuild<C>(
    docs: undefined[],
    builder: AutoDocsBuilder<AutoDocsTypes.AvailablePlugins>
  ): Promise<C> {
    // Run all endpoints and collect results
    const results: AutoDocsTypes.OrchestratorResult = {
      responses: [],
      successful: true,
      errors: [],
    };

    if (this.endpoints.length === 0) {
      console.warn("No endpoints configured for OrchestratorPlugin");
      return results as unknown as C;
    }

    await this.runAllEndpoints();

    // We'll return the results of running each endpoint individually
    return results as unknown as C;
  }

  onInit(builder: AutoDocsBuilder<AutoDocsTypes.AvailablePlugins>): void {
    // Get the endpoints from config
    this.endpoints = builder.config.pluginConfig?.orchestrator?.endpoints || [];
    this.config = builder.config.pluginConfig?.orchestrator;
  }

  onEnd(builder: AutoDocsBuilder<AutoDocsTypes.AvailablePlugins>): void {}

  onDoc(doc: undefined): undefined {
    return doc;
  }

  /**
   * Run a single endpoint by index or config
   * @param endpointIndexOrConfig The index of the endpoint or the endpoint config itself
   * @returns A promise resolving to the endpoint response
   */
  async runEndpoint(
    endpointIndexOrConfig: number | AutoDocsTypes.EndpointConfig
  ): Promise<AutoDocsTypes.OrchestratorResponse> {
    let endpoint: AutoDocsTypes.EndpointConfig;

    if (typeof endpointIndexOrConfig === "number") {
      if (
        endpointIndexOrConfig < 0 ||
        endpointIndexOrConfig >= this.endpoints.length
      ) {
        throw new Error(
          `Endpoint index ${endpointIndexOrConfig} out of bounds`
        );
      }
      endpoint = this.endpoints[endpointIndexOrConfig];
    } else {
      endpoint = endpointIndexOrConfig;
    }

    try {
      // Prepare headers by combining default headers with endpoint-specific headers
      const headers = {
        ...this.config?.defaultHeaders,
        ...endpoint.headers,
      };

      // Set up fetch options
      const options: RequestInit = {
        method: endpoint.method,
        headers,
      };

      // Make the request
      const response = await fetch(endpoint.url, options);
      const data = await response.json();

      // Create the response object
      const result: AutoDocsTypes.OrchestratorResponse = {
        endpointUrl: endpoint.url,
        statusCode: response.status,
        data,
        headers: (() => {
          const headersObj: Record<string, string> = {};
          response.headers.forEach((value, key) => {
            headersObj[key] = value;
          });
          return headersObj;
        })(),
      };

      return result;
    } catch (error) {
      // Create an error response
      const errorResponse: AutoDocsTypes.OrchestratorResponse = {
        endpointUrl: endpoint.url,
        statusCode: 0, // No response
        data: null,
        headers: {},
      };

      // Rethrow with more context
      throw new Error(
        `Failed to run endpoint ${endpoint.url}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Run all configured endpoints
   * @param options Optional configuration for running endpoints
   * @returns Promise resolving to OrchestratorResult with all responses
   */
  async runAllEndpoints(options?: {
    stopOnError?: boolean;
  }): Promise<AutoDocsTypes.OrchestratorResult> {
    const result: AutoDocsTypes.OrchestratorResult = {
      responses: [],
      successful: true,
      errors: [],
    };

    for (let i = 0; i < this.endpoints.length; i++) {
      try {
        const response = await this.runEndpoint(i);
        result.responses.push(response);
      } catch (error) {
        result.successful = false;
        result.errors = result.errors || [];
        result.errors.push(
          error instanceof Error ? error : new Error(String(error))
        );

        if (options?.stopOnError) {
          break;
        }
      }
    }

    return result;
  }
}
