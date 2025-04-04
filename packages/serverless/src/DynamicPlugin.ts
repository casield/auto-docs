import Serverless from "serverless";
import { LambdaDocsBuilder, parseComment } from "@auto-docs/core";

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
  builder: LambdaDocsBuilder<"openApi"> | undefined;

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

  init() {}

  async beforeDeploy() {}

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

  async autoDocsBuild() {}
}

module.exports = ServerlessPlugin;
