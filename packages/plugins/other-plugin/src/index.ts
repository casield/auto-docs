import { AutoDocsPlugin, AutoDocsBuilder } from "@auto-docs/core";
import "./global-types";

export class OtherApiDoc extends AutoDocsPlugin<"other"> {
  constructor() {
    super("other");
  }
}
