import { DroktPlugin } from "@drokt/core/src/Plugin";
import "./global-types";

export class OtherApiDoc extends DroktPlugin<"other"> {
  constructor() {
    super("other");
  }

  onBuild(handlers: DroktTypes.IDocsHandler<"other">[]) {
    console.log("OtherApiDoc", handlers);
  }
}
