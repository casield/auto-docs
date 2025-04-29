import { AutoDocsPlugin } from "./Plugin";

declare global {
  export namespace AutoDocsTypes {
    export interface IDocs {
      name: string;
      version: string;
    }

    export interface Plugins {}

    export interface PluginConfig {}

    export interface PluginResponse {}

    export interface ILinker<T extends keyof Plugins> {
      link(doc: AutoDocsTypes.LinkerObject<T>): Promise<void>;

      pull(
        branch?: string
      ): Promise<Record<string, AutoDocsTypes.LinkerObject<T>[]>>;

      has(doc: AutoDocsTypes.LinkerObject<T>): Promise<boolean>;

      delete(doc: AutoDocsTypes.LinkerObject<T>): Promise<void>;
    }

    export interface AutoDocsConfig<T extends keyof Plugins> {
      name: string;
      description: string;
      plugins: (typeof AutoDocsPlugin<T>)[];
      pluginConfig?: PluginConfig;
      linker?: ILinker<T>;
      branch: string;
    }

    export interface LinkerObject<T extends keyof Plugins> {
      plugin: AutoDocsTypes.AvailablePlugins;
      version: string;
      description: string;
      data: Plugins[T];
      name: string;
      id: string;
      branch: string;
    }

    export type AvailablePlugins = keyof Plugins;
  }
}

export {};
