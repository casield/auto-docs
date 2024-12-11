export interface IDocs {
  name: string;
  description: string;
  version: string;
}

export interface IDocsOpenApi extends IDocs {
  other: string;
}

export type Plugins = {
  openApi: IDocsOpenApi;
};

export type PluginConfig = {
  name: string;
  description: string;
  plugins: AvailablePlugins[];
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
