import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    format: ["cjs"],
    dts: true,
    splitting: false,
    clean: true,
    sourcemap: true,
    banner: {
        js: "#!/usr/bin/env node",
    },
});
