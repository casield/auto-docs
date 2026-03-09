import fs from "fs";
import path from "path";
import { createJiti } from "jiti";
import { AutoDocsBuilder } from "@auto-docs/core";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Minimal shape we validate before accepting a user-supplied config object.
 */
interface AutoDocsConfig {
    name: string;
    description: string;
    plugins: unknown[];
    branch: string;
    adapters?: unknown[];
    unwrapRules?: unknown[];
    linker?: unknown;
}

// ---------------------------------------------------------------------------
// loadConfig
// ---------------------------------------------------------------------------

/**
 * Locate and load an `autodocs.config.ts` (or `.js`) from `cwd`.
 *
 * Uses `jiti` to transparently transpile TypeScript config files at runtime.
 *
 * @param cwd - Directory to search for the config file.
 * @returns The exported default config object.
 * @throws If no config file is found, or if the file cannot be loaded due to
 *         syntax errors or exceptions during evaluation.
 */
export async function loadConfig(cwd: string): Promise<AutoDocsConfig> {
    const tsPath = path.join(cwd, "autodocs.config.ts");
    const jsPath = path.join(cwd, "autodocs.config.js");

    let configPath: string;
    if (fs.existsSync(tsPath)) {
        configPath = tsPath;
    } else if (fs.existsSync(jsPath)) {
        configPath = jsPath;
    } else {
        throw new Error(
            `[AutoDocs] No autodocs.config.ts (or .js) found in "${cwd}". ` +
            `Create an autodocs.config.ts file that exports a default config object.`
        );
    }

    const jiti = createJiti(__filename, { fsCache: false });
    let mod: unknown;
    try {
        mod = await jiti.import(configPath, { default: true });
    } catch (err) {
        throw new Error(
            `[AutoDocs] Error loading autodocs.config file "${configPath}": ${(err as Error).message
            }`
        );
    }

    if (!mod || typeof mod !== "object" || Array.isArray(mod)) {
        throw new Error(
            `[AutoDocs] Config file "${configPath}" must export a default config object.`
        );
    }

    return mod as AutoDocsConfig;
}

// ---------------------------------------------------------------------------
// run
// ---------------------------------------------------------------------------

/**
 * Execute the full AutoDocs analysis pipeline with the given config.
 *
 * Instantiates an `AutoDocsBuilder`, calls `builder.analyze()` with the
 * adapters and unwrap rules declared in the config, and returns when the
 * pipeline is complete.
 *
 * @param config - Validated config object (e.g. loaded via `loadConfig()`).
 * @throws Re-throws any errors from the pipeline with a human-readable prefix.
 */
export async function run(config: AutoDocsConfig): Promise<void> {
    const builder = new AutoDocsBuilder(config as any);
    try {
        await builder.analyze(
            (config.adapters as any[]) ?? [],
            config.unwrapRules as any[]
        );
    } catch (err) {
        throw new Error(
            `[AutoDocs] Analysis failed: ${(err as Error).message}`
        );
    }
}
