import "./global-types";
import "./open-api";
import { AutoDocsPlugin, LambdaDocsBuilder } from "@auto-docs/core";
import fs from "fs";

export * from "./types";
export * from "./utils";

export class OpenApiDoc extends AutoDocsPlugin<"openApi"> {
  constructor() {
    super("openApi");
  }

  public onBuild(
    docs: AutoDocsTypes.IDocsOpenApi[],
    builder: LambdaDocsBuilder<AutoDocsTypes.AvailablePlugins>
  ): void {
    const spec: AutoDocsTypes.OpenAPISpec = {
      openapi: "3.0.0",
      info: {
        title: builder.config.name,
        version: builder.config.pluginConfig?.openApi.version || "1.0.0",
        description: builder.config.description,
      },
      components: {
        schemas: builder.config.pluginConfig?.openApi.schemas || {},
      },
      paths: docs.reduce((acc, doc) => {
        acc[doc.path] = {
          [doc.method]: {
            summary: doc.summary,
            description: doc.description,
            responses: doc.responses,
          },
        };
        return acc;
      }, {} as AutoDocsTypes.OpenAPISpec["paths"]),
    };

    this.saveSpec(spec, builder.config.pluginConfig?.openApi.outputDir || "");
  }

  saveSpec(spec: AutoDocsTypes.OpenAPISpec, outputDir: string): void {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    fs.writeFileSync(
      `${outputDir}/openapi.json`,
      JSON.stringify(spec, null, 2)
    );
  }

  onEnd(builder: LambdaDocsBuilder<AutoDocsTypes.AvailablePlugins>): void {}
}
