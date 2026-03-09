import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    splitting: false,
    clean: true,
    sourcemap: true,
    external: ["@auto-docs/core", "@babel/parser", "@babel/traverse", "@babel/types"],
});
