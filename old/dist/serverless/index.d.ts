import Serverless from "serverless";
import { IDocsHandler, Plugins } from "@meltwater/serverless-docs";
declare class ServerlessDocsPlugin {
    serverless: Serverless;
    options: any;
    utils: any;
    hooks: any;
    constructor(serverless: Serverless, options: any, utils: any);
    init(): void;
    getHandlers(serverless: Serverless): IDocsHandler<keyof Plugins>[];
    getHandlerPath(funcConfig: any): string | null;
    afterDeploy(): void;
}
export default ServerlessDocsPlugin;
