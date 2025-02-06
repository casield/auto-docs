import Serverless from "serverless";
import { IOpenApiCommentBlockPath, OpenApiDoc } from "@drokt/openapi-plugin";
import { LambdaDocsBuilder, parseComment } from "@drokt/core";
import { LambdaFunctionAnalyzer } from "./analyze-function-v2";

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
    });
  }
  beforeDeploy() {
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
      const method = result.serverlessFn.events[0].http
        ?.method as DroktTypes.IDocsOpenApi["method"];
      const parsedComment = parseComment<IOpenApiCommentBlockPath>(
        result.analisys.description || ""
      );
      this.builder?.docs("openApi", {
        summary: parsedComment?.comment,
        method: method || "GET",
        name: parsedComment?.name || result.functionName,
        version: parsedComment?.version || "1.0.0",
      });
    });

    this.builder?.run().then(() => {
      console.log("Docs built");
    });

    throw new Error("Test error");
  }
  afterDeploy() {
    // After deploy
  }
}

module.exports = ServerlessPlugin;
