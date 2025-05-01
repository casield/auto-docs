import { AutoDocsBuilder, MemoryLinker } from "@auto-docs/core";
import { OpenApiDoc } from "@auto-docs/openapi-plugin";
import { DynamicProxyLinker } from "@auto-docs/serverless-dynamic";

const builder = new AutoDocsBuilder({
  name: "My Custom Docs",
  description: "Documentation generated with a custom builder",
  plugins: [OpenApiDoc],
  linker: new DynamicProxyLinker(
    "https://7lqn0bxcch.execute-api.us-east-1.amazonaws.com/proxy"
  ),
  branch: "main",
});

export default builder;
