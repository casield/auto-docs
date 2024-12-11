import { AvailablePlugins, IDocPluginFn, IDocsHandler, Plugins } from "@meltwater/serverless-docs";
export declare const openApiDoc: IDocPluginFn<'openApi'>;
export declare const generateDocs: (config: {
    handlers: IDocsHandler<any>[];
    plugins: IDocPluginFn<any>[];
}) => Promise<void>;
export declare const docs: <T extends AvailablePlugins>(type: AvailablePlugins, docs: Plugins[T]) => Plugins[T];
