import Serverless from "serverless";
import { OpenApiDoc } from "@drokt/openapi-plugin";
import { LambdaDocsBuilder } from "@drokt/core";
import { analyzeFunction } from "./analyze-function";

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

    const artifactName = this.serverless.service.package.artifact;

    this.serverless.service.getAllFunctions().forEach((functionName) => {
      const serverlessFn = this.serverless.service.getFunction(functionName);
      // TODO: Remove any
      analyzeFunction(serverlessFn as any, this.builder!, artifactName);
    });
  }
  afterDeploy() {
    // After deploy

    this.builder?.run().then(() => {
      console.log("Docs built");
    });
  }
}

module.exports = ServerlessPlugin;
