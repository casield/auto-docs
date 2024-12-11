import { PluginBuilder } from ".";

export abstract class DroktPlugin<T extends keyof DroktTypes.Plugins> {
  type: T;

  public constructor(type: T) {
    this.type = type;
  }

  public onBuild(
    docs: DroktTypes.Plugins[T][],
    builder: PluginBuilder<DroktTypes.AvailablePlugins>
  ) {
    throw new Error("Method not implemented.");
  }

  public onInit(builder: PluginBuilder<DroktTypes.AvailablePlugins>) {
    throw new Error("Method not implemented.");
  }

  public onEnd(builder: PluginBuilder<DroktTypes.AvailablePlugins>) {
    throw new Error("Method not implemented.");
  }
}
