import { DroktPlugin } from "./Plugin";
import "./types";

export class PluginBuilder<T extends DroktTypes.AvailablePlugins> {
  private config: DroktTypes.PluginConfig<T>;

  private _docs: Map<T, DroktTypes.Plugins[T][]> = new Map();

  constructor(config: DroktTypes.PluginConfig<T>) {
    this.config = config;
  }

  private isConcretePlugin(plugin: any): plugin is { new (): DroktPlugin<T> } {
    return (
      typeof plugin === "function" && plugin.prototype instanceof DroktPlugin
    );
  }

  public async generateDocs() {
    this.config.plugins.forEach((plugin) => {
      if (this.isConcretePlugin(plugin)) {
        const pluginInstance = new plugin();
        const handlersFilter = this._docs.get(pluginInstance.type);

        if (handlersFilter) {
          pluginInstance.onBuild(handlersFilter);
        } else {
          console.warn(
            `No docs found for plugin ${pluginInstance.type}. Skipping...`
          );
        }
      } else {
        throw new Error("Plugin is not a concrete subclass of DroktPlugin");
      }
    });
  }

  public docs(
    type: DroktTypes.AvailablePlugins,
    docs: DroktTypes.Plugins[DroktTypes.AvailablePlugins]
  ) {
    if (!this._docs.has(type)) {
      this._docs.set(type, []);
    }
    this._docs.get(type)?.push(docs);
    return this;
  }
}
