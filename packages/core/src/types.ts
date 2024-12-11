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
      plugins: IDocPluginFn<T>[];
    };

    export type AvailablePlugins = keyof Plugins;

    export interface IDocPlugin<T extends keyof Plugins> {
      type: T;
      onBuild: (handlers: IDocsHandler<T>[]) => void;
    }

    export interface IDocsHandler<T extends keyof Plugins> {
      path: string;
      docs: Plugins[T][];
    }

    export type IDocPluginFn<T extends keyof Plugins> = () => IDocPlugin<T>;
  }
}

export {};
