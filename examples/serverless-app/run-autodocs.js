#!/usr/bin/env node
const path = require("path");
const { createJiti } = require("jiti");

(async () => {
  try {
    const cwd = process.cwd();
    console.log("[AutoDocs] CWD:", cwd);

    const jiti = createJiti(cwd);
    console.log(
      "[AutoDocs] Loading config from",
      path.join(cwd, "autodocs.config.ts"),
    );

    const config = await jiti.import(path.join(cwd, "autodocs.config.ts"));
    const actualConfig = config.__default || config.default || config;
    console.log("[AutoDocs] Loaded config:", actualConfig.name);
    console.log(
      "[AutoDocs] Adapters:",
      actualConfig.adapters ? actualConfig.adapters.length : 0,
    );
    if (actualConfig.adapters) {
      actualConfig.adapters.forEach((a, i) => {
        console.log(`[AutoDocs]   Adapter ${i}:`, a.constructor.name);
      });
    }
    console.log(
      "[AutoDocs] Plugins:",
      actualConfig.plugins ? actualConfig.plugins.length : 0,
    );

    const { AutoDocsBuilder } = require("@auto-docs/core");

    // Track trees by wrapping plugin onAnalysis methods
    let totalTrees = 0;
    const wrappedPlugins = (actualConfig.plugins || []).map((plugin) => {
      const originalOnAnalysis = plugin.onAnalysis;
      plugin.onAnalysis = (trees) => {
        totalTrees = Math.max(totalTrees, trees ? trees.length : 0);
        if (originalOnAnalysis) {
          return originalOnAnalysis.call(plugin, trees);
        }
      };
      return plugin;
    });

    const builder = new AutoDocsBuilder({
      ...actualConfig,
      plugins: wrappedPlugins,
    });
    console.log("[AutoDocs] Builder created");

    console.log(`[AutoDocs] Running analysis with adapters...`);
    console.log("[AutoDocs] Calling builder.analyze()");
    await builder.analyze(
      actualConfig.adapters || [],
      actualConfig.unwrapRules || [],
    );
    console.log("[AutoDocs] Analysis complete");
    console.log("[AutoDocs] Found", totalTrees, "call trees");

    // Plugin hooks are already called during analyze()
    if (totalTrees > 0) {
      console.log("[AutoDocs] Plugins executed successfully");
    } else {
      console.log(
        "[AutoDocs] No call trees generated (entry points may not have implementations)",
      );
    }

    console.log("[AutoDocs] ✓ Done");
  } catch (e) {
    console.error(`[AutoDocs Error] ${e.message}`);
    console.error(e.stack);
    process.exit(1);
  }
})();
