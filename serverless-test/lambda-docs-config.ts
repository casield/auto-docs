import { AutoDocsBuilder, MemoryLinker } from "@auto-docs/core";

const builder = new AutoDocsBuilder({
  name: "My Custom Docs",
  description: "Documentation generated with a custom builder",
  plugins: [],
  linker: new MemoryLinker(),
  branch: "main",
});

export default builder;
