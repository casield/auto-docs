import { DroktPlugin } from "./Plugin";

declare global {
  export namespace DroktTypes {
    export interface IDocs {
      name: string;
      version: string;
    }

    export interface Plugins {}

    export type DroktConfig<T extends keyof Plugins> = {
      name: string;
      description: string;
      plugins: (typeof DroktPlugin<T>)[];
    };

    export type AvailablePlugins = keyof Plugins;
  }
}

export {};
