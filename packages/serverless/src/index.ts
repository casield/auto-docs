import Serverless from "serverless";
import { OpenApiDoc } from "@drokt/openapi-plugin";
import { LambdaDocsBuilder } from "@drokt/core";
import { LambdaFunctionAnalyzer } from "./analyze-function-v2";
import { recreateDocs } from "./recreate-docs";

export * from "./response";

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

    const artifactName = this.serverless.service.package.artifact;
    const la = new LambdaFunctionAnalyzer(artifactName);

    const results = this.serverless.service
      .getAllFunctions()
      .map((functionName) => {
        const serverlessFn = this.serverless.service.getFunction(functionName);
        return la.analyzeFunction(serverlessFn);
      });

    recreateDocs(results, this.builder);

    throw new Error("Test error");
  }
  afterDeploy() {
    // After deploy

    this.builder?.run().then(() => {
      console.log("Docs built");
    });
  }
}

module.exports = ServerlessPlugin;
