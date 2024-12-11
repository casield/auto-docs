import { LambdaDocsBuilder } from "@drokt/core/src/index";
import { OpenApiDoc } from "@drokt/openapi-plugin/src/index";
import { OtherApiDoc } from "@drokt/other-plugin/src/index";

const docs = new LambdaDocsBuilder({
  description: "Test",
  name: "Test",
  plugins: [OpenApiDoc, OtherApiDoc],
});

docs.docs("openApi", {
  name: "Test",
  description: "Test",
  method: "GET",
  responses: {
    "200": {
      content: {},
      description: "Success",
    },
  },
  summary: "Test",
  tags: ["Test"],
  version: "1",
});

docs.run();
