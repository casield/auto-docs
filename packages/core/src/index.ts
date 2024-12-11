import { DroktPlugin } from "./Plugin";
import "./types";

export class LambdaDocsBuilder<T extends DroktTypes.AvailablePlugins> {
  private config: DroktTypes.DroktConfig<T>;
  private _docs: Map<T, DroktTypes.Plugins[T][]> = new Map();

  private plugins: DroktPlugin<T>[] = [];

  constructor(config: DroktTypes.DroktConfig<T>) {
    this.config = config;
  }

  private initPlugins(): void {
    this.config.plugins.forEach((plugin) => {
      if (this.isConcretePlugin(plugin)) {
        const instance = new plugin();
        instance.onInit(this);
        this.plugins.push(instance);
      } else {
        throw new Error("Plugin is not a concrete subclass of DroktPlugin");
      }
    });
  }

  public async run() {
    this.initPlugins();

    this.plugins.forEach((plugin) => {
      const handlersFilter = this._docs.get(plugin.type);

      if (handlersFilter) {
        plugin.onBuild(handlersFilter, this);
      } else {
        console.warn(`No docs found for plugin ${plugin.type}. Skipping...`);
      }
    });

    this.plugins.forEach((plugin) => {
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
