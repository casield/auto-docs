import "./global-types";
import "./open-api";
import { DroktPlugin, LambdaDocsBuilder } from "@drokt/core";
import fs from "fs";

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
      paths: docs.reduce((acc, doc) => {
        acc[doc.path] = {
          [doc.method]: {
            summary: doc.summary,
            description: doc.description,
            responses: doc.responses,
          },
        };
        return acc;
      }, {} as DroktTypes.OpenAPISpec["paths"]),
    };

    this.saveSpec(spec, builder.config.pluginConfig?.openApi.outputDir || "");
  }

  saveSpec(spec: DroktTypes.OpenAPISpec, outputDir: string): void {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    fs.writeFileSync(
      `${outputDir}/openapi.json`,
      JSON.stringify(spec, null, 2)
    );
  }

  onEnd(builder: LambdaDocsBuilder<DroktTypes.AvailablePlugins>): void {}
}
