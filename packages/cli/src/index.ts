#!/usr/bin/env node
// @auto-docs/cli — AutoDocs pipeline runner CLI entry point
import { loadConfig, run } from "./runner";

async function main(): Promise<void> {
    try {
        const config = await loadConfig(process.cwd());
        await run(config);
        process.exit(0);
    } catch (err) {
        process.stderr.write(`[AutoDocs Error] ${(err as Error).message}\n`);
        process.exit(1);
    }
}

main();
