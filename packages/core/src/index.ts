import { Linker, MemoryLinker } from "./linkers";
import { AutoDocsPlugin } from "./Plugin";
import "./types";

export * from "./Plugin";
export * from "./analyzer";
export * from "./utils";
export * from "./linkers";

export class LambdaDocsBuilder<T extends AutoDocsTypes.AvailablePlugins> {
  public config: AutoDocsTypes.AutoDocsConfig<T>;
  private _docs: Linker<T>;

  private plugins: AutoDocsPlugin<T>[] = [];

  constructor(config: AutoDocsTypes.AutoDocsConfig<T>) {
    this.config = config;

    this._docs = config.linker || new MemoryLinker();
    this.initPlugins();
  }

  private initPlugins(): void {
    this.config.plugins.forEach((plugin) => {
      if (this.isConcretePlugin(plugin)) {
        const instance = new plugin();
        instance.onInit(this);
        this.plugins.push(instance);
      } else {
        throw new Error("Plugin is not a concrete subclass of AutoDocsPlugin");
      }
    });
  }

  public async run<T extends AutoDocsTypes.AvailablePlugins>(): Promise<
    Record<T, AutoDocsTypes.PluginResponse>
  > {
    const handlersFilter = await this._docs.pull();
    const results: Record<
      AutoDocsTypes.AvailablePlugins,
      AutoDocsTypes.PluginResponse
    > = {};
    this.plugins.forEach((plugin) => {
      if (handlersFilter) {
        const f = handlersFilter[plugin.type];
        const map = f.map((item) => item.data);
        results[plugin.type] = plugin.onBuild(map, this);
      }
    });

    this.plugins.forEach((plugin) => {
      plugin.onEnd(this);
    });

    return results;
  }

  public async docs<T extends AutoDocsTypes.AvailablePlugins>(
    type: T,
    docs: AutoDocsTypes.Plugins[T]
  ) {
    if (
      !this.plugins.some(
        (plugin) => (plugin.type as AutoDocsTypes.AvailablePlugins) === type
      )
    ) {
      throw new Error(`Plugin ${type} not found`);
    }
    this._docs.link({
      data: docs,
      plugin: type,
      version:
        "version" in docs ? (docs as { version: string }).version : "0.0.0",
      description: "TODO",
    });

    return this;
  }

  private isConcretePlugin(
    plugin: any
  ): plugin is { new (): AutoDocsPlugin<T> } {
    return (
      typeof plugin === "function" && plugin.prototype instanceof AutoDocsPlugin
    );
  }
}
