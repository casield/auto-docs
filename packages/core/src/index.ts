import "./types";

export function builder<T extends keyof DroktTypes.Plugins>(
  config: DroktTypes.PluginConfig<T>
) {
  const generateDocs = async <T extends keyof DroktTypes.Plugins>(
    handlers: DroktTypes.IDocsHandler<T>[]
  ) => {
    config.plugins.forEach((plugin) => {
      const pluginInstance = plugin();
      const handlersFilter = handlers.filter((handler) =>
        handler.docs.includes(pluginInstance.type)
      );
      pluginInstance.onBuild(handlersFilter);
    });
  };

  return {
    docs(
      type: DroktTypes.AvailablePlugins,
      docs: DroktTypes.Plugins[DroktTypes.AvailablePlugins]
    ) {
      return docs;
    },
    generateDocs,
  };
}
