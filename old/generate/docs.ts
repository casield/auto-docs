import { AvailablePlugins, IDocPluginFn, IDocsHandler, Plugins } from "@meltwater/serverless-docs";

export const openApiDoc: IDocPluginFn<'openApi'> = () => {
  return {
    type: "openApi",
    onBuild: (handlers) => {
    }
  }
};

export const generateDocs = async (config:{
  handlers: IDocsHandler<any>[]
  plugins: IDocPluginFn<any>[]
})=>{
  config.plugins.forEach(plugin => {
    const pluginInstance = plugin();
    const handlers = config.handlers.filter(handler => handler.docs.includes(pluginInstance.type));
    pluginInstance.onBuild(handlers);
  });
}

export const docs = <T extends AvailablePlugins>(type:AvailablePlugins,docs:Plugins[T])=>{
  return docs
}
