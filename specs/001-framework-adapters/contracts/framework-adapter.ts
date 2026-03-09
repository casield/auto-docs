/**
 * Contract: FrameworkAdapter
 *
 * Abstract base class for all framework adapters. Extend this to add support
 * for any framework (Serverless, Express, Fastify, NestJS, etc.).
 *
 * Lives in: packages/core/src/adapters/FrameworkAdapter.ts
 */

import type { NodeReturn } from '../analyzer/CallTreeBuilder';

// ----------------------------------------------------------------------------
// EntryPoint — the fundamental unit produced by every adapter
// ----------------------------------------------------------------------------

export interface EntryPoint {
    /**
     * Name of the exported function to use as the call-tree root.
     * Must match an export in the file at `filePath`.
     */
    functionName: string;

    /**
     * Absolute path to the TypeScript/JavaScript source file that contains
     * the export. Must be readable on disk at analysis time.
     */
    filePath: string;

    /**
     * Optional framework-level metadata (e.g. HTTP method, route path).
     * The runner serialises this into the root NodeReturn's `description`
     * field as `AUTO_DOCS_META:<json>` before calling plugin.onAnalysis().
     * Plugins may parse it; adapters that have no metadata omit this field.
     */
    metadata?: Record<string, unknown>;
}

// ----------------------------------------------------------------------------
// FrameworkAdapter — the contract third parties implement
// ----------------------------------------------------------------------------

export abstract class FrameworkAdapter {
    /**
     * Discover all handler entry points from the framework's configuration
     * source (e.g. serverless.yml, a router file, a config object).
     *
     * MUST be pure with respect to the filesystem — read only, never write.
     * MUST throw with a descriptive message if a handler file cannot be found.
     *
     * @returns Deduplicated array of EntryPoint objects; one per handler.
     */
    abstract resolveEntryPoints(): EntryPoint[];
}
