import { DroktPlugin } from "@drokt/core/src/Plugin";
import "./global-types";
import { PluginBuilder } from "@drokt/core/src";

export class OtherApiDoc extends DroktPlugin<"other"> {
  constructor() {
    super("other");
  }

  public onBuild(
    docs: DroktTypes.IOtherApi[],
    builder: PluginBuilder<DroktTypes.AvailablePlugins>
  ): void {}
}
