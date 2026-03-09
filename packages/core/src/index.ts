import { Linker, MemoryLinker } from "./linkers";
import { AutoDocsPlugin } from "./Plugin";
import { FrameworkAdapter } from "./adapters/FrameworkAdapter";
import { HandlerUnwrapper, UnwrapRule } from "./unwrapper/HandlerUnwrapper";
import { FileGraphScanner } from "./scanner/FileGraphScanner";
import { LinkedCallTreeBuilder } from "./analyzer/CallTreeBuilder";
import "./types";

/**
 * @public
 *
 * `@auto-docs/core` public API
 *
 * ## Extension points
 *
 * - **`FrameworkAdapter`** — extend this to add support for any framework.
 *   Implement `resolveEntryPoints(): EntryPoint[]` and pass instances to
 *   `builder.analyze([adapter])`.  See `quickstart.md` for a full example.
 *
 * - **`AutoDocsPlugin`** — extend this to create custom output plugins.
 *   Implement `onBuild()` (legacy) and/or `onAnalysis()` (CI pipeline).
 *
 * - **`Linker`** — implement `ILinker<T>` for custom storage backends.
 */
export * from "./Plugin";
export type * from "./analyzer";
export * from "./utils";
export * from "./linkers";
export * from "./adapters/index";
export * from "./unwrapper/index";
export * from "./scanner/index";

export class AutoDocsBuilder<T extends string = string> {
  public config: AutoDocsTypes.AutoDocsConfig<T>;
  private _docs: Linker<T>;

  private plugins: AutoDocsPlugin<any>[] = [];

  constructor(config: AutoDocsTypes.AutoDocsConfig<T>) {
    this.config = config;

    this._docs = config.linker || new MemoryLinker();

    // v2: plugins are instances — call onInit directly without class instantiation.
    for (const plugin of config.plugins) {
      plugin.onInit(this);
      this.plugins.push(plugin);
    }
  }

  public async run(): Promise<Record<string, AutoDocsTypes.PluginResponse>> {
    const handlersFilter = await this._docs.pull(this.config.branch);
    const results: Record<string, AutoDocsTypes.PluginResponse> = {};

    for (const plugin of this.plugins) {
      if (handlersFilter) {
        const f = handlersFilter[plugin.type];
        const map = f?.map((item) => item.data) || [];
        results[plugin.type] = await plugin.onBuild(map, this);
      }
    }

    this.plugins.forEach((plugin) => {
      plugin.onEnd(this);
    });

    return results;
  }

  public async docs<P extends string>(
    type: P,
    docs: P extends keyof AutoDocsTypes.Plugins ? AutoDocsTypes.Plugins[P] : any
  ) {
    const plugin = this.getPlugin(type);

    if (!plugin) {
      throw new Error(`Plugin ${type} not found`);
    }

    docs = plugin.onDoc(docs);

    await this._docs.link({
      data: docs,
      plugin: type as any,
      version:
        "version" in docs ? (docs as { version: string }).version : "0.0.0",
      description: "TODO",
      name: "name" in docs ? (docs as { name: string }).name : "Unknown",
      id: "id" in docs ? (docs as { id: string }).id : "Unknown",
      branch: this.config.branch || "main",
    });

    return this;
  }

  /**
   * Analyze handler entry points discovered by the provided framework adapters.
   *
   * For each entry point the pipeline:
   * 1. Optionally unwraps middleware via `unwrapRules`.
   * 2. Scans the import graph with `FileGraphScanner`.
   * 3. Builds a linked call-tree for the unwrapped handler.
   * 4. Embeds `entry.metadata` into the root node description as a
   *    `AUTO_DOCS_META:<json>` suffix.
   * 5. Calls `plugin.onAnalysis([root])` on every registered plugin.
   *
   * @param adapters     - Framework adapters that resolve entry points.
   * @param unwrapRules  - Optional unwrap rules for middleware stripping.
   */
  public async analyze(
    adapters: FrameworkAdapter[],
    unwrapRules?: UnwrapRule[]
  ): Promise<void> {
    const scanner = new FileGraphScanner();

    for (const adapter of adapters) {
      const entries = await adapter.resolveEntryPoints();

      for (const entry of entries) {
        // 1. Unwrap middleware if rules are provided.
        const functionName =
          unwrapRules && unwrapRules.length > 0
            ? HandlerUnwrapper.unwrap(
              entry.functionName,
              entry.filePath,
              unwrapRules
            )
            : entry.functionName;

        // 2. Scan the import graph from the entry file.
        const analysisResults = scanner.scan(entry.filePath);

        // 3. Build a linked call-tree for the resolved handler.
        const builder = new LinkedCallTreeBuilder(analysisResults);
        const tree = builder.buildNodeTree(functionName, entry.filePath);

        // 4. Embed entry metadata into the root node description.
        if (entry.metadata) {
          tree.description =
            (tree.description ?? "") +
            `AUTO_DOCS_META:${JSON.stringify(entry.metadata)}`;
        }

        // 5. Notify all plugins via the onAnalysis hook (optional method).
        for (const plugin of this.plugins) {
          plugin.onAnalysis?.([tree]);
        }
      }
    }
  }

  public setBranch(branch: string): this {
    this.config.branch = branch;
    return this;
  }

  private getPlugin(type: string): AutoDocsPlugin<any> | undefined {
    return this.plugins.find((plugin) => plugin.type === type);
  }
}
