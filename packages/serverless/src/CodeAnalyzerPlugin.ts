import Serverless from "serverless";
import * as fs from "fs";
import * as path from "path";
import {
  IOpenApiCommentBlockPath,
  OpenApiDoc,
  IOpenApiCommentBlockResponse,
  parseSchemaString,
} from "@auto-docs/openapi-plugin";
import { AutoDocsBuilder, parseComment } from "@auto-docs/core";
import { LambdaFunctionAnalyzer } from "./analyze-function-v2";

export * from "./dynamic";

interface Logger {
  info: (message: string) => void;
  error: (message: string) => void;
  warn: (message: string) => void;
  success: (message: string) => void;
  debug: (message: string) => void;
}

class ServerlessPlugin {
  serverless: Serverless;
  options: any;
  utils: {
    log: Logger;
  };
  hooks: { [key: string]: Function };
  commands: { [key: string]: any };
  builder: AutoDocsBuilder<"openApi"> | undefined;

  constructor(serverless: Serverless, options: any, utils: { log: Logger }) {
    this.serverless = serverless;
    this.options = options;
    this.utils = utils;

    // Define custom commands for the plugin
    this.commands = {
      "auto-docs": {
        usage: "Build the auto docs documentation",
        lifecycleEvents: ["build"],
      },
    };

    // Register hooks for both deploy and auto-docs command
    this.hooks = {
      initialize: () => this.init(),
      "before:deploy:deploy": () => this.beforeDeploy(),
      "after:deploy:deploy": () => this.afterDeploy(),
      "auto-docs:build": () => this.autoDocsBuild(),
    };
  }

  init() {
    // Read custom configuration from serverless.yml if provided
    const customConfig =
      this.serverless.service.custom &&
      this.serverless.service.custom["auto-docs"]
        ? this.serverless.service.custom["auto-docs"]
        : {};

    // Custom attributes for the docs project
    const projectName = customConfig.name || "ProjectName";
    const projectDescription = customConfig.description;
    const projectVersion = customConfig.version || "0.0.0";
    const outputDir = customConfig.outputDir || "docs";

    // Load custom schemas if a schema file is provided
    const schemaFilePath: string | undefined = customConfig.schemaFile;
    let customSchemas = {};
    if (schemaFilePath) {
      customSchemas = this.loadCustomSchemas(schemaFilePath);
    }

    this.builder = new AutoDocsBuilder({
      name: projectName,
      description: projectDescription,
      plugins: [OpenApiDoc],
      pluginConfig: {
        openApi: {
          outputDir: outputDir,
          version: projectVersion,
          schemas: {
            ...customSchemas,
          },
        },
      },
    });

    this.utils.log.info(
      `Initialized docs builder for project "${projectName}" in directory "${outputDir}"`
    );
  }

  loadCustomSchemas(schemaFilePath: string): object {
    const fullPath = path.resolve(process.cwd(), schemaFilePath);
    try {
      const fileContent = fs.readFileSync(fullPath, "utf8");
      // Assuming JSON format for now. Extend parsing here if YAML support is needed.
      return JSON.parse(fileContent);
    } catch (error: any) {
      this.utils.log.error(
        `Error reading schema file at ${schemaFilePath}: ${error.message}`
      );
      return {};
    }
  }

  async buildDocs() {
    if (!this.builder) {
      throw new Error("Builder not initialized");
    }

    const artifactDir = process.cwd();
    const la = new LambdaFunctionAnalyzer(artifactDir, "tsconfig.json");

    const results = this.serverless.service
      .getAllFunctions()
      .map((functionName) => {
        const serverlessFn = this.serverless.service.getFunction(functionName);

        if (!serverlessFn.events) {
          return null;
        }

        const hasHttpEvent = serverlessFn.events.some(
          (event: any) => event.http || event.httpApi
        );
        // Only include functions with an API Gateway event
        if (!hasHttpEvent) {
          return null;
        }

        const analysis = la.analyzeFunction(serverlessFn);

        return {
          analysis,
          functionName,
          serverlessFn,
        };
      })
      .filter((result) => result !== null);

    results.forEach((result) => {
      /* const method =
        result.serverlessFn.events[0].http?.method?.toLowerCase() || "get";
      const parsedComment = parseComment<IOpenApiCommentBlockPath>(
        result.analysis.description || ""
      );

      const leafDescriptions = collectLeafDescriptions(result.analysis);

      const responses: AutoDocsTypes.IDocsOpenApi["responses"] = {};

      leafDescriptions.forEach((desc) => {
        const parsed = parseComment<IOpenApiCommentBlockResponse>(desc.value);
        const statusCode = Number(parsed?.statusCode || 200);
        const parsedSchema = parseSchemaString(
          parsed?.schema || "{}",
          statusCode,
          desc.node
        );
        responses[statusCode] = parsedSchema[statusCode];
      });

      this.builder?.docs("openApi", {
        summary: parsedComment?.comment,
        method: method as AutoDocsTypes.IDocsOpenApi["method"],
        name: parsedComment?.name || result.functionName,
        version: parsedComment?.version || "1.0.0",
        responses,
        path: this.getApiGatewayEvents(result.serverlessFn)[0]?.path || "/",
      }); */
    });

    await this.builder.run();
    this.utils.log.success("Auto docs built successfully.");
  }

  async beforeDeploy() {
    await this.buildDocs();
  }

  getApiGatewayEvents(
    fn:
      | Serverless.FunctionDefinitionHandler
      | Serverless.FunctionDefinitionImage
  ) {
    return (
      fn.events
        ?.filter((event) => event.http || event.httpApi)
        .map((event) => (event.http ? event.http : event.httpApi)) || []
    );
  }

  afterDeploy() {}

  async autoDocsBuild() {
    await this.buildDocs();
  }
}

module.exports = ServerlessPlugin;
