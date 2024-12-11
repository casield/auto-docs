import { DroktPlugin } from "./Plugin";
import "./types";

export class PluginBuilder<T extends DroktTypes.AvailablePlugins> {
  private config: DroktTypes.DroktConfig<T>;

  private _docs: Map<T, DroktTypes.Plugins[T][]> = new Map();

  constructor(config: DroktTypes.DroktConfig<T>) {
    this.config = config;
  }

  private forEachPlugin(callback: (plugin: DroktPlugin<T>) => void): void {
    this.config.plugins.forEach((plugin) => {
      if (this.isConcretePlugin(plugin)) {
        callback(new plugin());
      } else {
        throw new Error("Plugin is not a concrete subclass of DroktPlugin");
      }
    });
  }

  public async run() {
    this.forEachPlugin((plugin) => {
      plugin.onInit(this);
    });

    this.forEachPlugin((plugin) => {
      const handlersFilter = this._docs.get(plugin.type);

      if (handlersFilter) {
        plugin.onBuild(handlersFilter, this);
      } else {
        console.warn(`No docs found for plugin ${plugin.type}. Skipping...`);
      }
    });

    this.forEachPlugin((plugin) => {
      plugin.onEnd(this);
    });
  }

  public docs<T extends DroktTypes.AvailablePlugins>(
    type: T,
    docs: DroktTypes.Plugins[T]
  ) {
    if (!this._docs.has(type)) {
      this._docs.set(type, []);
    }
    this._docs.get(type)?.push(docs);
    return this;
  }

  private isConcretePlugin(plugin: any): plugin is { new (): DroktPlugin<T> } {
    return (
      typeof plugin === "function" && plugin.prototype instanceof DroktPlugin
    );
  }
}
