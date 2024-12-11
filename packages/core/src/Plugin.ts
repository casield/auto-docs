import { LambdaDocsBuilder } from ".";

export abstract class DroktPlugin<T extends keyof DroktTypes.Plugins> {
  type: T;

  public constructor(type: T) {
    this.type = type;
  }

  public onBuild(
    docs: DroktTypes.Plugins[T][],
    builder: LambdaDocsBuilder<DroktTypes.AvailablePlugins>
  ) {}

  public onInit(builder: LambdaDocsBuilder<DroktTypes.AvailablePlugins>) {}

  public onEnd(builder: LambdaDocsBuilder<DroktTypes.AvailablePlugins>) {}
}
