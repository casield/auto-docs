import { DroktPlugin } from "@drokt/core/src/Plugin";
import "./global-types";
import { PluginBuilder } from "@drokt/core/src";

export class OpenApiDoc extends DroktPlugin<"openApi"> {
  constructor() {
    super("openApi");
  }

  public onBuild(
    docs: DroktTypes.IDocsOpenApi[],
    builder: PluginBuilder<DroktTypes.AvailablePlugins>
  ): void {
    docs.forEach((doc) => {});
  }
}
