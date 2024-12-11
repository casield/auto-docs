import { DroktPlugin } from "./Plugin";
import "./types";

export class PluginBuilder<T extends keyof DroktTypes.Plugins> {
  private config: DroktTypes.PluginConfig<T>;

  private _docs: Record<T, DroktTypes.Plugins[T][]> = {};

  constructor(config: DroktTypes.PluginConfig<T>) {
    this.config = config;
  }

  private isConcretePlugin(plugin: any): plugin is { new (): DroktPlugin<T> } {
    return (
      typeof plugin === "function" && plugin.prototype instanceof DroktPlugin
    );
  }

  public async generateDocs() {
    config.plugins.forEach((plugin) => {
      // Type guard to check if the plugin is a concrete subclass
      const isConcretePlugin = (
        plugin: any
      ): plugin is { new (): DroktPlugin<T> } => {
        return (
          typeof plugin === "function" &&
          plugin.prototype instanceof DroktPlugin
        );
      };

      if (isConcretePlugin(plugin)) {
        const pluginInstance = new plugin();
        const handlersFilter = handlers.filter((handler) =>
          handler.docs.includes(pluginInstance.type)
        );
        pluginInstance.onBuild(handlersFilter);
      } else {
        throw new Error("Plugin is not a concrete subclass of DroktPlugin");
      }
    });
  }

  public docs(
    type: DroktTypes.AvailablePlugins,
    docs: DroktTypes.Plugins[DroktTypes.AvailablePlugins]
  ) {
    if (!this._docs[type]) {
      this._docs[type] = [];
    }

    this._docs[type].push(docs);
  }
}
