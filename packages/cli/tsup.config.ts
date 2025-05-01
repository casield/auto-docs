import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/bin.ts"],
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  shims: true,
  banner: ({ format }) => {
    if (format === "esm") {
      return {
        js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
      };
    }
    return {};
  },
});
