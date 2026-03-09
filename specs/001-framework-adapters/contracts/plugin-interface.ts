/**
 * Contract: AutoDocsPlugin (v2) + UnwrapRule
 *
 * Changes vs v1:
 *   - New optional hook: `onAnalysis(trees: NodeReturn[])`
 *   - Plugins are now instantiated by the user (constructor args supported).
 *   - `onAnalysis` is called ONCE with all call trees after analysis completes.
 *     Plugins that don't implement it are silently skipped for this hook only.
 *
 * Lives in: packages/core/src/Plugin.ts
 */

import type { NodeReturn } from '../analyzer/CallTreeBuilder';
import type { AutoDocsBuilder } from '../index';

// ----------------------------------------------------------------------------
// UnwrapRule
// ----------------------------------------------------------------------------

/**
 * A user-declarable rule that teaches HandlerUnwrapper to peel one wrapper
 * layer off an exported handler before call-tree construction.
 *
 * Example — built-in Middy rule:
 *   { callee: 'middy', argIndex: 0 }
 *   Matches: export const handler = middy(myFn) → extracts 'myFn'
 */
export interface UnwrapRule {
    /**
     * Name of the wrapper function call to match.
     * e.g. 'middy', 'withAuth', 'ApiHandler'
     */
    callee: string;

    /**
     * Zero-based index of the argument that holds the real inner function.
     * e.g. 0 for middy(fn), 1 for withContext(ctx, fn)
     */
    argIndex: number;
}

// ----------------------------------------------------------------------------
// AutoDocsPlugin<T> — updated interface
// ----------------------------------------------------------------------------

export abstract class AutoDocsPlugin<T extends keyof AutoDocsTypes.Plugins> {
    readonly type: T;

    constructor(type: T) {
        this.type = type;
    }

    // ── Existing hooks (unchanged) ────────────────────────────────────────────

    /**
     * Called once when the plugin is registered with AutoDocsBuilder.
     * Use for one-time setup that requires access to the builder.
     */
    onInit(_builder: AutoDocsBuilder<AutoDocsTypes.AvailablePlugins>): void { }

    /**
     * Called for each manual `.docs(type, data)` call.
     * Receives the raw doc object and may transform it before it is stored.
     */
    onDoc(doc: AutoDocsTypes.Plugins[T]): AutoDocsTypes.Plugins[T] {
        return doc;
    }

    /**
     * Called by `builder.run()` with all previously-stored docs pulled
     * from the linker. Use to produce final output from manually supplied data.
     */
    onBuild<C>(
        _docs: AutoDocsTypes.Plugins[T][],
        _builder: AutoDocsBuilder<AutoDocsTypes.AvailablePlugins>
    ): C | Promise<C> {
        throw new Error('Not implemented.');
    }

    /**
     * Called after all plugins have finished `onBuild`.
     */
    onEnd(_builder: AutoDocsBuilder<AutoDocsTypes.AvailablePlugins>): void { }

    // ── New hook ──────────────────────────────────────────────────────────────

    /**
     * Called ONCE with all call trees produced by the adapter pipeline,
     * after every entry point has been resolved, unwrapped, and analysed.
     *
     * `trees` is the array of root NodeReturn nodes — one per handler entry
     * point. Each root node's `description` field may contain framework
     * metadata serialised as:  AUTO_DOCS_META:<json-string>
     *
     * The plugin is SOLELY responsible for:
     *   - Parsing and interpreting the tree nodes.
     *   - Producing and writing its output artefact.
     *   - Merging with any manually supplied data (manual data MUST win).
     *
     * This hook is OPTIONAL. Plugins that do not implement it are silently
     * skipped; existing `onBuild` behaviour is unaffected.
     */
    onAnalysis?(_trees: NodeReturn[]): void | Promise<void>;
}
