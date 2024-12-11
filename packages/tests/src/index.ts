import { LambdaDocsBuilder } from "@drokt/core/src/index";
import { OpenApiDoc } from "@drokt/openapi-plugin/src/index";
import { OtherApiDoc } from "@drokt/other-plugin/src/index";
import { handler } from "./handlers/ApiGatewayHandler";

const docs = new LambdaDocsBuilder({
  description: "Test",
  name: "Test",
  plugins: [OpenApiDoc, OtherApiDoc],
});

docs.docs("openApi", {
  handler: handler,
  name: "Test",
  other: "Test",
  version: "Test",
});

docs.run();
