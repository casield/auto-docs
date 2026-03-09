#!/usr/bin/env node
const path = require('path');
const { createJiti } = require('jiti');

(async () => {
  try {
    const cwd = process.cwd();
    const jiti = createJiti(cwd);
    const config = await jiti.import(path.join(cwd, 'autodocs.config.ts'));
    const actualConfig = config.__default || config.default || config;

    const adapter = actualConfig.adapters[0];
    console.log('[DEBUG] Adapter:', adapter.constructor.name);
    console.log('[DEBUG] Adapter options:', adapter.opts);
    
    console.log('\n[DEBUG] Calling resolveEntryPoints...');
    const entries = await adapter.resolveEntryPoints();
    console.log('[DEBUG] Found entries:', entries.length);
    
    entries.forEach((entry, i) => {
      console.log(`\n[DEBUG] Entry ${i}:`);
      console.log('  functionName:', entry.functionName);
      console.log('  filePath:', entry.filePath);
      console.log('  metadata:', entry.metadata);
    });
  } catch (e) {
    console.error(`[ERROR] ${e.message}`);
    console.error(e.stack);
    process.exit(1);
  }
})();
