import "./global-types";
import "./open-api";
import { DroktPlugin, LambdaDocsBuilder } from "@drokt/core";

export * from "./types";
export * from "./utils";

export class OpenApiDoc extends DroktPlugin<"openApi"> {
  constructor() {
    super("openApi");
  }

  public onBuild(
    docs: DroktTypes.IDocsOpenApi[],
    builder: LambdaDocsBuilder<DroktTypes.AvailablePlugins>
  ): void {
    const spec: DroktTypes.OpenAPISpec = {
      openapi: "3.0.0",
      info: {
        title: builder.config.name,
        version: builder.config.pluginConfig?.openApi.version || "1.0.0",
        description: builder.config.description,
      },
      paths: {},
    };

    docs.forEach((doc) => {
      console.log("Building OpenApi docs", doc);
    });
  }
}
