/**
 * Contract: AutoDocsConfig (v2)
 *
 * Breaking changes vs v1:
 *   - `plugins` is now an array of INSTANCES, not class references.
 *   - `pluginConfig` has been removed; each plugin accepts its own options
 *     via its constructor.
 *   - New optional fields: `adapters`, `unwrapRules`.
 *
 * Lives in: packages/core/src/types.ts  (replaces AutoDocsConfig<T>)
 */

import type { AutoDocsPlugin } from '../Plugin';
import type { FrameworkAdapter } from './framework-adapter';
import type { UnwrapRule } from './plugin-interface';
import type { ILinker } from '../linkers';

// Re-export for convenience
export type { EntryPoint } from './framework-adapter';
export type { UnwrapRule } from './plugin-interface';

// ----------------------------------------------------------------------------
// AutoDocsConfig
// ----------------------------------------------------------------------------

/**
 * The shape of the user-supplied configuration object.
 * Pass to `new AutoDocsBuilder(config)` or export as default
 * from `autodocs.config.ts` for CLI usage.
 */
export interface AutoDocsConfig {
    /** Human-readable project name — used in generated artefacts (e.g. OpenAPI info.title). */
    name: string;

    /** Human-readable project description — used in generated artefacts. */
    description: string;

    /**
     * Registered plugin INSTANCES (not class references).
     * Each plugin is constructed with its own options before being passed here.
     *
     * Example:
     *   plugins: [new OpenApiDoc({ outputDir: './docs', version: '1.0.0' })]
     */
    plugins: AutoDocsPlugin<any>[];

    /**
     * Framework adapters that discover handler entry points.
     * At least one adapter is required for `builder.analyze()` to produce results.
     * Omit when using the legacy manual `.docs()` flow only.
     */
    adapters?: FrameworkAdapter[];

    /**
     * Unwrap rules applied before call-tree construction.
     * Each rule teaches HandlerUnwrapper to peel one layer off a wrapped export.
     * Import MIDDY_UNWRAP_RULE from '@auto-docs/adapter-serverless' for the
     * built-in Middy preset.
     */
    unwrapRules?: UnwrapRule[];

    /**
     * Optional custom linker for storing and retrieving docs in the legacy flow.
     * Defaults to MemoryLinker.
     */
    linker?: ILinker<any>;

    /**
     * Git branch name — used by the Linker to namespace stored docs.
     */
    branch: string;
}
