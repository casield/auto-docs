/**
 * Represents a single handler entry point discovered by a framework adapter.
 */
export interface EntryPoint {
    /** Absolute path to the source file containing the handler. */
    filePath: string;
    /** The exported function name for the handler. */
    functionName: string;
    /**
     * Optional metadata attached to this entry point — e.g. HTTP method/path
     * from serverless.yml or an Express route definition.
     */
    metadata?: Record<string, unknown>;
}

/**
 * Abstract base class for framework adapters.
 *
 * Implement `resolveEntryPoints()` to teach AutoDocs how to discover
 * handler entry points from your specific framework configuration
 * (e.g. serverless.yml, Express app, etc.).
 *
 * @example
 * ```ts
 * class MyAdapter extends FrameworkAdapter {
 *   resolveEntryPoints(): EntryPoint[] {
 *     return [{ filePath: '/src/handler.ts', functionName: 'handler' }];
 *   }
 * }
 * ```
 */
export abstract class FrameworkAdapter {
    abstract resolveEntryPoints(): EntryPoint[] | Promise<EntryPoint[]>;
}
