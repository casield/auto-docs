import { LambdaDocsBuilder } from "@auto-docs/core";
import { OpenApiDoc } from "@auto-docs/openapi-plugin";
import Serverless from "serverless";
import { DynamoLinker } from "./DynamoLinker";
import { DynamicProxyLinker } from "./proxy";

export * from "./dynamic";
export * from "./DynamoLinker";
export * from "./proxy";

interface Logger {
  info: (message: string) => void;
  error: (message: string) => void;
  warn: (message: string) => void;
  debug: (message: string) => void;
  notice: (message: string) => void;
}

interface Progress {
  start: (message: string) => void;
  update: (message: string) => void;
  stop: () => void;
}

class ServerlessPlugin {
  serverless: Serverless;
  options: any;
  utils: {
    log: Logger;
    writeText: (text: string) => void;
    progress: Progress;
  };
  hooks: { [key: string]: Function };
  commands: { [key: string]: any };
  builder: LambdaDocsBuilder<"openApi"> | undefined;

  constructor(
    serverless: Serverless,
    options: any,
    utils: {
      log: Logger;
      writeText: (text: string) => void;
      progress: Progress;
    }
  ) {
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

    if (!customConfig.linkerRoute) {
      this.utils.log.error(
        "linkerRoute is not provided in the custom configuration."
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
      linker: new DynamicProxyLinker(customConfig.linkerRoute),
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

  async afterDeploy() {}

  async autoDocsBuild() {
    /* const promises = Object.values(this.serverless.service.functions).map(
      (fn) => {
        const events = this.getApiGatewayEvents(fn);
        if (events.length > 0) {
          return events.map(async (event) => {
            const method = event?.method.toLowerCase();
            const path = event?.path.toLowerCase();

            if (!method || !path) {
              this.utils.log.error(
                `Invalid method or path for function ${fn.name}`
              );
              return;
            }
            this.utils.log.info(
              `Generating documentation for ${
                fn.name
              } - ${method?.toUpperCase()} ${path}`
            );

            await this.builder?.docs("openApi", {
              method: method as AutoDocsTypes.IDocsOpenApiMethod["method"],
              path,
              type: "method",
              name: `${fn.name}-${method}-${path}`,
              version: "0.0.0",
              description: `Auto-generated documentation for ${
                fn.name
              } - ${method?.toUpperCase()} ${path}`,
            });
          });
        } else {
          this.utils.log.info(
            `No API Gateway event found for function ${fn.name}`
          );
        }
      }
    ); 

    await Promise.all(promises); */

    await this.builder?.run();
    this.utils.log.info("Auto docs build completed.");
  }
}

export default ServerlessPlugin;
