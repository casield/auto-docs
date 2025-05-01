import { AutoDocsBuilder, MemoryLinker } from "@auto-docs/core";

/**
 * Example custom builder configuration file
 *
 * This file demonstrates how to create a custom AutoDocsBuilder
 * that can be loaded by the CLI.
 */

// Create and export your custom AutoDocsBuilder
const builder = new AutoDocsBuilder({
  name: "My Custom Docs",
  description: "Documentation generated with a custom builder",
  plugins: [],
  linker: new MemoryLinker(),
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
