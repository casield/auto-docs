import { PluginBuilder } from "@drokt/core/src/index";
import { OpenApiDoc } from "@drokt/openapi-plugin/src/index";

const docs = new PluginBuilder({
  description: "Test",
  name: "Test",
  plugins: [OpenApiDoc],
});

docs.docs("openApi", {
  description: "Test",
  name: "Test",
  other: "Test",
  version: "Test",
});

docs.generateDocs([
  {
    docs: [{}],
    path: "/",
  },
]);
