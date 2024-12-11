import { DroktPlugin } from "@drokt/core/src/Plugin";
import "./global-types";

export class OpenApiDoc extends DroktPlugin<"openApi"> {
  constructor() {
    super("openApi");
  }

  onBuild(handlers: DroktTypes.IDocsHandler<"openApi">[]) {
    console.log("OpenApiDoc", handlers);
  }
}
