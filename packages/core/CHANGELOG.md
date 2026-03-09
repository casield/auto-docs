# @auto-docs/core

## 2.0.0-beta.1

### Major Changes

**Breaking: plugin registration is now instance-based**

`AutoDocsConfig.plugins` now accepts **plugin instances** instead of class constructors.

Before (v1):

```ts
new AutoDocsBuilder({
  plugins: [OpenApiDoc],
  pluginConfig: { openApi: { outputDir: "docs/" } },
});
```

After (v2):

```ts
new AutoDocsBuilder({ plugins: [new OpenApiDoc({ outputDir: "docs/" })] });
```

- **`plugins`** type changed from `(typeof AutoDocsPlugin<T>)[]` to `AutoDocsPlugin<any>[]`
- **`pluginConfig`** removed from `AutoDocsConfig` — pass config directly to each plugin's constructor
- **`initPlugins()`** and **`isConcretePlugin()`** removed from `AutoDocsBuilder`
- `AutoDocsBuilder<T>` type parameter constraint relaxed from `keyof Plugins` to `string`

### Minor Changes

- `AutoDocsPlugin` gains an optional **`onAnalysis?(trees: NodeReturn[]): void`** hook. When the CI analysis pipeline resolves entry points and builds call trees, each plugin's `onAnalysis` is called with the `NodeReturn[]` for that entry point. The root node's `description` may contain `AUTO_DOCS_META:<json>` with HTTP metadata serialised by the runner.
- `AutoDocsConfig` gains optional **`adapters?`** and **`unwrapRules?`** fields for the CI pipeline (fully typed in the next release once adapter packages are stable).
- `NodeReturn` is now re-exported from the top-level package index for downstream use.

### Migration Guide

See [quickstart.md](../../specs/001-framework-adapters/quickstart.md) for full before/after examples.

### Minor Changes

- add dynamic handlers

## 1.0.1

### Patch Changes

- add change set
