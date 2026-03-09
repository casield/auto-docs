# @auto-docs/openapi-plugin

## 1.2.0

### Minor Changes

**New: `onAnalysis` hook — CI pipeline support**

`OpenApiDoc` now implements `onAnalysis(trees: NodeReturn[]): void`. When the AutoDocs CI runner resolves entry points and builds call trees, it calls this hook for each entry. The root node's `description` may contain `AUTO_DOCS_META:<json>` serialised by the runner (e.g. `AUTO_DOCS_META:{"httpMethod":"GET","httpPath":"/users"}`). The plugin parses this metadata autonomously and accumulates an OpenAPI spec — no `.docs()` calls required.

**Breaking: constructor now accepts options**

Before (v1):

```ts
plugins: [OpenApiDoc]; // class reference
```

After (v2):

```ts
plugins: [new OpenApiDoc({ outputDir: "docs/", version: "3.0.0" })];
```

- `pluginConfig.openApi.outputDir` / `.version` → pass directly to constructor as `{ outputDir, version }`
- New `flush()` method to explicitly write the accumulated spec after a series of `onAnalysis` calls

## 1.1.0

### Minor Changes

- add dynamic handlers

### Patch Changes

- Updated dependencies
  - @auto-docs/core@1.1.0

## 1.0.1

### Patch Changes

- add change set
- Updated dependencies
  - @auto-docs/core@1.0.1
