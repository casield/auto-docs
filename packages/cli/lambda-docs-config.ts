import { LambdaDocsBuilder, MemoryLinker } from "@auto-docs/core";
import { OpenApiDoc } from "@auto-docs/openapi-plugin";
import { DynamicProxyLinker } from "@auto-docs/serverless-dynamic";

/**
 * Example custom builder configuration file
 *
 * This file demonstrates how to create a custom LambdaDocsBuilder
 * that can be loaded by the CLI.
 */

// Create and export your custom LambdaDocsBuilder
const builder = new LambdaDocsBuilder({
  name: "My Custom Docs",
  description: "Documentation generated with a custom builder",
  plugins: [OpenApiDoc],
  pluginConfig: {
    openApi: {
      outputDir: "./docs",
      version: "1.0.0",
    },
  },
  linker: new DynamicProxyLinker(
    "https://7lqn0bxcch.execute-api.us-east-1.amazonaws.com/proxy"
  ),
  branch: "main",
});

// You can export your builder in one of three ways:

// Option 1: Default export
export default builder;

// Option 2: Named export createBuilder function
// export function createBuilder() {
//   return builder;
// }

// Option 3: Direct export
// module.exports = builder;
