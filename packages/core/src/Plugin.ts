import { AutoDocsBuilder } from ".";

export abstract class AutoDocsPlugin<T extends keyof AutoDocsTypes.Plugins> {
  type: T;

  public constructor(type: T) {
    this.type = type;
  }

  public onBuild<C>(
    docs: AutoDocsTypes.Plugins[T][],
    builder: AutoDocsBuilder<AutoDocsTypes.AvailablePlugins>
  ): C {
    throw new Error("Method not implemented.");
  }

  public onInit(builder: AutoDocsBuilder<AutoDocsTypes.AvailablePlugins>) {}

  public onEnd(builder: AutoDocsBuilder<AutoDocsTypes.AvailablePlugins>) {}

  public onDoc(doc: AutoDocsTypes.Plugins[T]): AutoDocsTypes.Plugins[T] {
    return doc;
  }
}
