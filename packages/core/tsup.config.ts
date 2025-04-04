import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"], // supports both import and require
  dts: true, // generates .d.ts types
  splitting: false, // often safer for libraries
  clean: true, // clean dist folder before building
});
