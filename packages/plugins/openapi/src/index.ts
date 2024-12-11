import "./global-types";
import { DroktPlugin, LambdaDocsBuilder } from "@drokt/core";

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
