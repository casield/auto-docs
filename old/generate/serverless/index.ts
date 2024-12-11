import Serverless from "serverless";
import { resolve, dirname } from "path";
import * as fs from 'fs';
import { IDocsHandler, Plugins } from "@meltwater/serverless-docs";

class ServerlessDocsPlugin {
  serverless: Serverless;
  options: any;
  utils: any;
  hooks: any;

  constructor(serverless: Serverless, options: any, utils: any) {
    this.serverless = serverless;
    this.options = options; // CLI options
    this.utils = utils;
    this.hooks = {
      initialize: () => this.init(),
      "after:deploy:deploy": () => this.afterDeploy(),
    };
  }

  init() {
    this.utils.log("ServerlessDocsPlugin initialized");
  }

  getHandlers(serverless: Serverless): IDocsHandler<keyof Plugins>[] {
    const service = serverless.service;
    if (!service.functions) {
      throw new Error("No functions defined in the Serverless service.");
    }
  
    const handlers: Record<string,IDocsHandler<keyof Plugins>>= {};
  
    for (const [funcName, funcConfig] of Object.entries(service.functions)) {
      const handlerPath = this.getHandlerPath(funcConfig as any);
      if (!handlerPath) {
        continue;
      }
  
      const absolutePath = resolve(dirname(serverless.config.servicePath), handlerPath);
  
      if (!fs.existsSync(absolutePath)) {
        this.utils.log(`Handler file not found for function ${funcName}: ${absolutePath}`);
        continue;
      }
  
      try {
        const handlerModule = require(absolutePath);
  
        // Iterate over all exports to find docs functions
        for (const [exportName, exportedValue] of Object.entries(handlerModule)) {
          if (typeof exportedValue === "function" && exportedValue.name === "docs") {
            const documentation = exportedValue();
            if (documentation) {
              if(!handlers[funcName]){
                handlers[funcName] = {
                    docs: [documentation],
                    path: handlerPath
                }
              }else{
                handlers[funcName].docs.push(documentation);
              }
  
              this.utils.log(
                `Found documentation in ${funcName} - Export: ${exportName} - Docs: ${JSON.stringify(
                  documentation,
                  null,
                  2
                )}`
              );
            }
          }
        }
      } catch (error) {
        this.utils.log(`Error loading handler file for function ${funcName}: ${error.message}`);
      }
    }
  
    return Object.values(handlers);
  }
  

  getHandlerPath(funcConfig: any): string | null {
    if (!funcConfig.handler) {
      return null;
    }

    const handlerParts = funcConfig.handler.split(".");
    const handlerPath = handlerParts.slice(0, -1).join("."); // Remove the handler function name
    return `${handlerPath}.ts`; // Adjust file extension as needed (e.g., .ts, .js)
  }

  afterDeploy() {
    const handlers = this.getHandlers(this.serverless);
    this.utils.log(`Discovered handlers: ${JSON.stringify(handlers, null, 2)}`);
  }
}

export default ServerlessDocsPlugin;
