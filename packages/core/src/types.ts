import { AutoDocsPlugin } from "./Plugin";

declare global {
  export namespace AutoDocsTypes {
    export interface IDocs {
      name: string;
      version: string;
    }

    export interface Plugins {}

    export interface PluginConfig {}

    export interface AutoDocsConfig<T extends keyof Plugins> {
      name: string;
      description: string;
      plugins: (typeof AutoDocsPlugin<T>)[];
      pluginConfig?: PluginConfig;
    }

    export type AvailablePlugins = keyof Plugins;
  }
}

export {};
