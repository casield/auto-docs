import { AutoDocsBuilder } from "@auto-docs/core";
import { OpenApiDoc } from "@auto-docs/openapi-plugin";
import { DynamicProxyLinker } from "@auto-docs/serverless-dynamic";
import { OrchestratorPlugin } from "@auto-docs/orchestrator-plugin";

const url = "https://7lqn0bxcch.execute-api.us-east-1.amazonaws.com";

const builder = new AutoDocsBuilder({
  name: "My Custom Docs",
  description: "Documentation generated with a custom builder",
  plugins: [OrchestratorPlugin, OpenApiDoc],
  pluginConfig: {
    openApi: {
      outputDir: "./docs",
      version: "1.0.0",
    },
    orchestrator: {
      endpoints: [
        {
          method: "GET",
          url: `${url}/hello`,
        },
        {
          method: "GET",
          url: `${url}/hello?hello=false`,
        },
        {
          method: "GET",
          url: `${url}/hello?mood=happy`,
        },
        {
          method: "GET",
          url: `${url}/hello?format=xml`,
        },
        {
          method: "GET",
          url: `${url}/hello?auth=invalid`,
        },
      ],
    },
  },
  linker: new DynamicProxyLinker(`${url}/proxy`),
  branch: "main",
});

export default builder;
