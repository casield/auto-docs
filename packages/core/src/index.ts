import { DroktPlugin } from "./Plugin";
import "./types";

export * from "./Plugin";
export * from "./analyzer";
export * from "./utils";

export class LambdaDocsBuilder<T extends DroktTypes.AvailablePlugins> {
  public config: DroktTypes.DroktConfig<T>;
  private _docs: Map<T, DroktTypes.Plugins[T][]> = new Map();

  private plugins: DroktPlugin<T>[] = [];

  constructor(config: DroktTypes.DroktConfig<T>) {
    this.config = config;
    this.initPlugins();
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
    this.plugins.forEach((plugin) => {
      const handlersFilter = this._docs.get(plugin.type);

      if (handlersFilter) {
        plugin.onBuild(handlersFilter, this);
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
    if (
      !this.plugins.some(
        (plugin) => (plugin.type as DroktTypes.AvailablePlugins) === type
      )
    ) {
      throw new Error(`Plugin ${type} not found`);
    }

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
