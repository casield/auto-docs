import { LambdaDocsBuilder } from "@auto-docs/core";
import { OpenApiDoc } from "@auto-docs/openapi-plugin";
import Serverless from "serverless";
import { DynamoLinker } from "./DynamoLinker";

export * from "./dynamic";
export * from "./DynamoLinker";

interface Logger {
  info: (message: string) => void;
  error: (message: string) => void;
  warn: (message: string) => void;
  success: (message: string) => void;
  debug: (message: string) => void;
}

export default class ServerlessPlugin {
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

  init() {
    const customConfig =
      this.serverless.service.custom &&
      this.serverless.service.custom["auto-docs"]
        ? this.serverless.service.custom["auto-docs"]
        : {};

    if (!customConfig.linkerTableName) {
      this.utils.log.error(
        "Linker table name is not provided in the custom configuration."
      );
      return;
    }

    this.builder = new LambdaDocsBuilder({
      name: this.serverless.service.service || "Serverless Service",
      description: "Serverless Service",
      pluginConfig: {
        openApi: {
          outputDir: "docs",
          version: "1.0.0",
        },
      },
      linker: new DynamoLinker(customConfig.linkerTableName),
      plugins: [OpenApiDoc],
    });
  }

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
