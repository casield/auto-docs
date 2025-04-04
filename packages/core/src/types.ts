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

      pull(): Promise<Record<string, AutoDocsTypes.LinkerObject<T>[]>>;

      has(doc: AutoDocsTypes.LinkerObject<T>): Promise<boolean>;
    }

    export interface AutoDocsConfig<T extends keyof Plugins> {
      name: string;
      description: string;
      plugins: (typeof AutoDocsPlugin<T>)[];
      pluginConfig?: PluginConfig;
      linker?: ILinker<T>;
    }

    export interface LinkerObject<T extends keyof Plugins> {
      name: string;
      version: string;
      description: string;
      type: AutoDocsTypes.AvailablePlugins;
      data: Plugins[T];
    }

    export type AvailablePlugins = keyof Plugins;
  }
}

export {};
