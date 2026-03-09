import { AutoDocsPlugin } from "./Plugin";
import type { FrameworkAdapter } from "./adapters/FrameworkAdapter";
import type { UnwrapRule } from "./unwrapper/HandlerUnwrapper";

declare global {
  export namespace AutoDocsTypes {
    export interface IDocs {
      name: string;
      version: string;
      id: string;
    }

    export interface Plugins { }

    /** @deprecated pluginConfig has been removed. Pass options to plugin constructors instead. */
    export interface PluginConfig { }

    export interface PluginResponse { }

    export interface ILinker<T extends string = string> {
      link(doc: AutoDocsTypes.LinkerObject<T>): Promise<void>;

      pull(
        branch?: string
      ): Promise<Record<string, AutoDocsTypes.LinkerObject<T>[]>>;

      has(doc: AutoDocsTypes.LinkerObject<T>): Promise<boolean>;

      delete(doc: AutoDocsTypes.LinkerObject<T>): Promise<void>;
    }

    /**
     * Configuration for AutoDocsBuilder.
     *
     * **v2 breaking changes**:
     * - `plugins` now accepts **instances** (`new OpenApiDoc(...)`) not class references.
     * - `pluginConfig` has been removed — pass options to plugin constructors directly.
     * - `adapters` and `unwrapRules` added for the CI analysis pipeline (typed in Phase 4).
     */
    export interface AutoDocsConfig<T extends string = string> {
      name: string;
      description: string;
      /** Plugin instances. E.g. `[new OpenApiDoc({ outputDir: 'docs/' })]` */
      plugins: AutoDocsPlugin<any>[];
      /**
       * Framework adapters for CI analysis (e.g. ServerlessAdapter, ExpressAdapter).
       */
      adapters?: FrameworkAdapter[];
      /**
       * Handler unwrap rules to strip middleware wrappers (e.g. MIDDY_UNWRAP_RULE).
       */
      unwrapRules?: UnwrapRule[];
      linker?: ILinker<T>;
      branch: string;
    }

    export interface LinkerObject<T extends string = string> {
      plugin: string;
      version: string;
      description: string;
      data: T extends keyof Plugins ? Plugins[T] : any;
      name: string;
      id: string;
      branch: string;
    }

    export type AvailablePlugins = keyof Plugins;
  }
}

export { };
