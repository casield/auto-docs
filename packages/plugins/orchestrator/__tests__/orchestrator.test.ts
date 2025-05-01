import { OrchestratorPlugin } from "../src";
import { AutoDocsBuilder } from "@auto-docs/core";

// Mock fetch
global.fetch = jest.fn();

// Mock console.warn
console.warn = jest.fn();

describe("OrchestratorPlugin", () => {
  let plugin: OrchestratorPlugin;
  let mockBuilder: jest.Mocked<AutoDocsBuilder<AutoDocsTypes.AvailablePlugins>>;

  beforeEach(() => {
    jest.clearAllMocks();
    plugin = new OrchestratorPlugin();

    // Mock AutoDocsBuilder
    mockBuilder = {
      config: {
        pluginConfig: {
          orchestrator: {
            endpoints: [
              {
                url: "https://api.example.com/endpoint1",
                method: "GET",
                headers: { "X-Test": "test-value" },
              },
              {
                url: "https://api.example.com/endpoint2",
                method: "POST",
                headers: { "Content-Type": "application/json" },
              },
            ],
            defaultHeaders: {
              Authorization: "Bearer test-token",
              "User-Agent": "OrchestratorPlugin/1.0",
            },
          },
        },
      },
    } as unknown as jest.Mocked<
      AutoDocsBuilder<AutoDocsTypes.AvailablePlugins>
    >;
  });

  describe("onInit", () => {
    it("should initialize endpoints from config", () => {
      plugin.onInit(mockBuilder);

      // Use private property accessor technique to test
      expect((plugin as any).endpoints).toEqual(
        mockBuilder.config.pluginConfig?.orchestrator?.endpoints
      );
      expect((plugin as any).config).toEqual(
        mockBuilder.config.pluginConfig?.orchestrator
      );
    });

    it("should handle empty config gracefully", () => {
      mockBuilder.config.pluginConfig = {} as any;

      plugin.onInit(mockBuilder);

      expect((plugin as any).endpoints).toEqual([]);
      expect((plugin as any).config).toBeUndefined();
    });
  });

  describe("onBuild", () => {
    it("should warn and return empty results when no endpoints configured", async () => {
      plugin.onInit({ config: { pluginConfig: {} } } as any);

      const result = await plugin.onBuild([], mockBuilder);

      expect(console.warn).toHaveBeenCalledWith(
        "No endpoints configured for OrchestratorPlugin"
      );
      expect(result).toEqual({
        responses: [],
        successful: true,
        errors: [],
      });
    });

    it("should run all endpoints and collect results", async () => {
      // Setup
      plugin.onInit(mockBuilder);

      // Mock runAllEndpoints method
      const mockResult: AutoDocsTypes.OrchestratorResult = {
        responses: [
          {
            endpointUrl: "https://api.example.com/endpoint1",
            statusCode: 200,
            data: { success: true },
            headers: { "content-type": "application/json" },
          },
        ],
        successful: true,
        errors: [],
      };

      (plugin as any).runAllEndpoints = jest.fn().mockResolvedValue(mockResult);

      // Test
      const result = await plugin.onBuild([], mockBuilder);

      // Verify
      expect((plugin as any).runAllEndpoints).toHaveBeenCalled();
      expect(result).toEqual({
        responses: [
          {
            endpointUrl: "https://api.example.com/endpoint1",
            statusCode: 200,
            data: { success: true },
            headers: { "content-type": "application/json" },
          },
        ],
        successful: true,
        errors: [],
      });
    });
  });

  describe("runEndpoint", () => {
    it("should throw error for invalid endpoint index", async () => {
      plugin.onInit(mockBuilder);

      await expect(plugin.runEndpoint(99)).rejects.toThrow(
        "Endpoint index 99 out of bounds"
      );
    });

    it("should run endpoint by index successfully", async () => {
      // Setup
      plugin.onInit(mockBuilder);

      const mockResponse = {
        status: 200,
        json: jest.fn().mockResolvedValue({ success: true }),
        headers: new Headers({
          "content-type": "application/json",
        }),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      // Test
      const result = await plugin.runEndpoint(0);

      // Verify
      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.example.com/endpoint1",
        expect.objectContaining({
          method: "GET",
          headers: {
            Authorization: "Bearer test-token",
            "User-Agent": "OrchestratorPlugin/1.0",
            "X-Test": "test-value",
          },
        })
      );

      expect(result).toEqual({
        endpointUrl: "https://api.example.com/endpoint1",
        statusCode: 200,
        data: { success: true },
        headers: { "content-type": "application/json" },
      });
    });

    it("should run endpoint by config successfully", async () => {
      // Setup
      plugin.onInit(mockBuilder);

      const endpointConfig: AutoDocsTypes.EndpointConfig = {
        url: "https://api.example.com/custom",
        method: "POST",
        headers: { "Custom-Header": "custom-value" },
      };

      const mockResponse = {
        status: 201,
        json: jest.fn().mockResolvedValue({ created: true }),
        headers: new Headers({
          "content-type": "application/json",
        }),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      // Test
      const result = await plugin.runEndpoint(endpointConfig);

      // Verify
      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.example.com/custom",
        expect.objectContaining({
          method: "POST",
          headers: {
            Authorization: "Bearer test-token",
            "User-Agent": "OrchestratorPlugin/1.0",
            "Custom-Header": "custom-value",
          },
        })
      );

      expect(result).toEqual({
        endpointUrl: "https://api.example.com/custom",
        statusCode: 201,
        data: { created: true },
        headers: { "content-type": "application/json" },
      });
    });

    it("should handle fetch errors", async () => {
      // Setup
      plugin.onInit(mockBuilder);

      (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

      // Test & Verify
      await expect(plugin.runEndpoint(0)).rejects.toThrow(
        "Failed to run endpoint https://api.example.com/endpoint1: Network error"
      );
    });
  });

  describe("runAllEndpoints", () => {
    it("should run all endpoints and collect responses", async () => {
      // Setup
      plugin.onInit(mockBuilder);

      // Mock runEndpoint to return different responses
      const mockResponses = [
        {
          endpointUrl: "https://api.example.com/endpoint1",
          statusCode: 200,
          data: { success: true },
          headers: { "content-type": "application/json" },
        },
        {
          endpointUrl: "https://api.example.com/endpoint2",
          statusCode: 201,
          data: { created: true },
          headers: { "content-type": "application/json" },
        },
      ];

      (plugin.runEndpoint as jest.Mock) = jest
        .fn()
        .mockResolvedValueOnce(mockResponses[0])
        .mockResolvedValueOnce(mockResponses[1]);

      // Test
      const result = await plugin.runAllEndpoints();

      // Verify
      expect(plugin.runEndpoint).toHaveBeenCalledTimes(2);
      expect(plugin.runEndpoint).toHaveBeenCalledWith(0);
      expect(plugin.runEndpoint).toHaveBeenCalledWith(1);

      expect(result).toEqual({
        responses: mockResponses,
        successful: true,
        errors: [],
      });
    });

    it("should continue on error when stopOnError is false", async () => {
      // Setup
      plugin.onInit(mockBuilder);

      const mockResponse = {
        endpointUrl: "https://api.example.com/endpoint2",
        statusCode: 201,
        data: { created: true },
        headers: { "content-type": "application/json" },
      };

      const mockError = new Error("Endpoint failed");

      (plugin.runEndpoint as jest.Mock) = jest
        .fn()
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce(mockResponse);

      // Test
      const result = await plugin.runAllEndpoints();

      // Verify
      expect(plugin.runEndpoint).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        responses: [mockResponse],
        successful: false,
        errors: [mockError],
      });
    });

    it("should stop on error when stopOnError is true", async () => {
      // Setup
      plugin.onInit(mockBuilder);

      const mockError = new Error("Endpoint failed");

      (plugin.runEndpoint as jest.Mock) = jest
        .fn()
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce({});

      // Test
      const result = await plugin.runAllEndpoints({ stopOnError: true });

      // Verify
      expect(plugin.runEndpoint).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        responses: [],
        successful: false,
        errors: [mockError],
      });
    });
  });

  describe("onDoc", () => {
    it("should return the document unchanged", () => {
      const doc = undefined;
      expect(plugin.onDoc(doc)).toBe(doc);
    });
  });

  describe("onEnd", () => {
    it("should not throw errors", () => {
      expect(() => plugin.onEnd(mockBuilder)).not.toThrow();
    });
  });
});
