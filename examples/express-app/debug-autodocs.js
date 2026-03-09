#!/usr/bin/env node
const path = require('path');
const { createJiti } = require('jiti');
const fs = require('fs');

(async () => {
  try {
    const cwd = process.cwd();
    
    const jiti = createJiti(cwd);
    const config = await jiti.import(path.join(cwd, 'autodocs.config.ts'));
    const actualConfig = config.__default || config.default || config;

    const { AutoDocsBuilder } = require('@auto-docs/core');
    const builder = new AutoDocsBuilder(actualConfig);
    
    console.log('[DEBUG] Calling analyze...');
    await builder.analyze(actualConfig.adapters || [], actualConfig.unwrapRules || []);
    
    console.log('[DEBUG] Finished analyze');
    console.log('[DEBUG] builder.trees:', builder.trees);
    
    if (builder.trees) {
      console.log('[DEBUG] Trees count:', builder.trees.length);
      builder.trees.forEach((tree, idx) => {
        console.log(`\n[DEBUG] Tree ${idx}:`);
        console.log('  name:', tree.name);
        console.log('  filePath:', tree.filePath);
        console.log('  description:', tree.description?.substring(0, 100));
        console.log('  children count:', tree.children?.length || 0);
      });
    }
  } catch (e) {
    console.error(`[ERROR] ${e.message}`);
    console.error(e.stack);
    process.exit(1);
  }
})();
