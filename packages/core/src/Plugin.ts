export abstract class DroktPlugin<T extends keyof DroktTypes.Plugins> {
  type: T;

  public constructor(type: T) {
    this.type = type;
  }

  abstract onBuild(handlers: DroktTypes.IDocsHandler<T>[]): void;
}
