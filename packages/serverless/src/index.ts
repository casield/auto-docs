import Serverless from "serverless";
import { OpenApiDoc } from "@drokt/openapi-plugin";
import { LambdaDocsBuilder } from "@drokt/core";

class ServerlessPlugin {
  serverless: Serverless;
  options: any;
  utils: any;

  hooks: { [key: string]: Function };

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
    const b = new LambdaDocsBuilder({
      name: "My Test Project",
      description: "This is a test project",
      plugins: [OpenApiDoc],
    });
  }
  beforeDeploy() {
    // Before deploy
  }
  afterDeploy() {
    // After deploy

    this.utils.log.info("Deployed successfully");
  }
}

module.exports = ServerlessPlugin;
