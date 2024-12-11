import { DroktPlugin } from "./Plugin";
import type { Handler } from "aws-lambda";

declare global {
  export namespace DroktTypes {
    export interface IDocs {
      name: string;
      version: string;
      handler: Handler;
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
