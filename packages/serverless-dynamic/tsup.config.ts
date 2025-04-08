import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  target: "node18",
  outDir: "dist",
  dts: true,
  clean: true,
  sourcemap: true,
});
