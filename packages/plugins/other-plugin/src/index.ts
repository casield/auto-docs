import { DroktPlugin, LambdaDocsBuilder } from "@drokt/core";
import "./global-types";

export class OtherApiDoc extends DroktPlugin<"other"> {
  constructor() {
    super("other");
  }

  onBuild(
    docs: DroktTypes.IOtherApi[],
    builder: LambdaDocsBuilder<DroktTypes.AvailablePlugins>
  ): void {}
}
