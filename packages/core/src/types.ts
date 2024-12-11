import { DroktPlugin } from "./Plugin";

declare global {
  export namespace DroktTypes {
    export interface IDocs {
      name: string;
      description: string;
      version: string;
    }

    export interface Plugins {}

    export type PluginConfig<T extends keyof Plugins> = {
      name: string;
      description: string;
      plugins: (typeof DroktPlugin<T>)[];
    };

    export type AvailablePlugins = keyof Plugins;

    export interface IDocsHandler<T extends keyof Plugins> {
      path: string;
      docs: Plugins[T][];
    }
  }
}

export {};
