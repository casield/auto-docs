import { LambdaDocsBuilder } from ".";

export abstract class AutoDocsPlugin<T extends keyof AutoDocsTypes.Plugins> {
  type: T;

  public constructor(type: T) {
    this.type = type;
  }

  public onBuild<C>(
    docs: AutoDocsTypes.Plugins[T][],
    builder: LambdaDocsBuilder<AutoDocsTypes.AvailablePlugins>
  ): C {
    throw new Error("Method not implemented.");
  }

  public onInit(builder: LambdaDocsBuilder<AutoDocsTypes.AvailablePlugins>) {}

  public onEnd(builder: LambdaDocsBuilder<AutoDocsTypes.AvailablePlugins>) {}
}
