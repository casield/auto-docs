import { builder } from "@drokt/core/src/index";
import { openApiDoc } from "@drokt/openapi-plugin/src/index";

const docs = builder({
  name: "Test",
  description: "Test",
  plugins: [openApiDoc],
});

docs.docs("openApi", {
  description: "Test",
  name: "Test",
  other: "Test",
  version: "Test",
});
