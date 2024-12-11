import { DroktPlugin } from "@drokt/core/src/Plugin";
import "./global-types";
import { LambdaDocsBuilder } from "@drokt/core/src";

export class OpenApiDoc extends DroktPlugin<"openApi"> {
  constructor() {
    super("openApi");
  }

  public onBuild(
    docs: DroktTypes.IDocsOpenApi[],
    builder: LambdaDocsBuilder<DroktTypes.AvailablePlugins>
  ): void {
    docs.forEach((doc) => {
      console.log("Building OpenApi docs", doc);
    });
  }
}
