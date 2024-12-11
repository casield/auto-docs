import { PluginBuilder } from "@drokt/core/src/index";
import { OpenApiDoc } from "@drokt/openapi-plugin/src/index";
import { OtherApiDoc } from "@drokt/other-plugin/src/index";

const docs = new PluginBuilder({
  description: "Test",
  name: "Test",
  plugins: [OpenApiDoc, OtherApiDoc],
});

docs.docs("openApi", {
  description: "Test",
  name: "Test",
  other: "Test",
  version: "Test",
});

docs.docs("other", {
  description: "other",
  name: "other",
  other2: "other",
  version: "other",
});

docs.run();
