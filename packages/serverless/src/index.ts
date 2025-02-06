import Serverless from "serverless";
import {
  IOpenApiCommentBlockPath,
  OpenApiDoc,
  IOpenApiCommentBlockResponse,
  parseSchemaString,
} from "@drokt/openapi-plugin";
import { LambdaDocsBuilder, parseComment } from "@drokt/core";
import { LambdaFunctionAnalyzer } from "./analyze-function-v2";
import { collectLeafDescriptions } from "./utils";
import Aws from "serverless/plugins/aws/provider/awsProvider";

export type * from "./analyze-function-v2";

class ServerlessPlugin {
  serverless: Serverless;
  options: any;
  utils: any;

  hooks: { [key: string]: Function };
  builder: LambdaDocsBuilder<"openApi"> | undefined;

  constructor(serverless: Serverless, options: any, utils: any) {
    this.serverless = serverless;
    this.options = options;
    this.utils = utils;

    this.hooks = {
      initialize: () => this.init(),
      "before:deploy:deploy": () => this.beforeDeploy(),
      "after:deploy:deploy": () => this.afterDeploy(),
    };
  }

  init() {
    // Initialization
    this.builder = new LambdaDocsBuilder({
      name: "My Test Project",
      description: "This is a test project",
      plugins: [OpenApiDoc],
      pluginConfig: {
        openApi: {
          outputDir: "docs",
          version: "1.0.1",
          schemas: {
            User: {
              title: "User",
              description: "A user object",
              type: "object",
              properties: {
                name: {
                  type: "string",
                },
                age: {
                  type: "number",
                },
              },
            },
          },
        },
      },
    });
  }
  async beforeDeploy() {
    // Before deploy

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
        // Only get the function with a api gateway event
        if (!hasHttpEvent) {
          return null;
        }

        const analisys = la.analyzeFunction(serverlessFn);

        return {
          analisys,
          functionName,
          serverlessFn,
        };
      })
      .filter((result) => result !== null);

    results.forEach((result) => {
      const method =
        result.serverlessFn.events[0].http?.method.toLowerCase() as DroktTypes.IDocsOpenApi["method"];
      const parsedComment = parseComment<IOpenApiCommentBlockPath>(
        result.analisys.description || ""
      );

      const leafDescriptions = collectLeafDescriptions(result.analisys);

      const responses: DroktTypes.IDocsOpenApi["responses"] = {};

      leafDescriptions.forEach((desc, index) => {
        const parsed = parseComment<IOpenApiCommentBlockResponse>(desc.value);
        const statusCode = Number(parsed?.statusCode || 200);
        const parsedSchemaStriing = parseSchemaString(
          parsed?.schema || "{}",
          statusCode,
          desc.node
        );
        responses[statusCode] = parsedSchemaStriing[statusCode];
      });

      this.builder?.docs("openApi", {
        summary: parsedComment?.comment,
        method: method || "get",
        name: parsedComment?.name || result.functionName,
        version: parsedComment?.version || "1.0.0",
        responses,
        path: this.getApiGatewayEvents(result.serverlessFn)[0]?.path || "/",
      });
    });

    await this.builder.run();

    throw new Error("Test error");
  }

  getApiGatewayEvents(
    fn:
      | Serverless.FunctionDefinitionHandler
      | Serverless.FunctionDefinitionImage
  ) {
    return (
      fn.events
        ?.filter((event) => event.http || event.httpApi)
        .map((event) => {
          if (event.http) {
            return event.http;
          }

          return event.httpApi;
        }) || []
    );
  }

  afterDeploy() {
    // After deploy
  }
}

module.exports = ServerlessPlugin;
