# Data Model: Framework Adapters

**Phase**: 1 | **Feature**: 001-framework-adapters | **Date**: 2026-03-08

All entities reference the finalised contracts in `contracts/`.

---

## Existing entities — changes

### `AutoDocsConfig<T>` (modified — BREAKING)

| Field           | Before                         | After                   | Notes                                               |
| --------------- | ------------------------------ | ----------------------- | --------------------------------------------------- |
| `name`          | `string`                       | `string`                | unchanged                                           |
| `description`   | `string`                       | `string`                | unchanged                                           |
| `plugins`       | `(typeof AutoDocsPlugin<T>)[]` | `AutoDocsPlugin<any>[]` | **BREAKING** — instances not class refs             |
| `pluginConfig?` | `PluginConfig`                 | _(removed)_             | **BREAKING** — moved into each plugin's constructor |
| `linker?`       | `ILinker<T>`                   | `ILinker<T>`            | unchanged                                           |
| `branch`        | `string`                       | `string`                | unchanged                                           |
| `adapters?`     | _(new)_                        | `FrameworkAdapter[]`    | zero or more adapters                               |
| `unwrapRules?`  | _(new)_                        | `UnwrapRule[]`          | built-in Middy rule is a usable preset              |

### `AutoDocsPlugin<T>` (modified — non-breaking)

| Hook                     | Before   | After                           | Notes                                                                             |
| ------------------------ | -------- | ------------------------------- | --------------------------------------------------------------------------------- |
| `onInit(builder)`        | existing | existing                        | unchanged                                                                         |
| `onDoc(doc)`             | existing | existing                        | unchanged                                                                         |
| `onBuild(docs, builder)` | existing | existing                        | unchanged                                                                         |
| `onEnd(builder)`         | existing | existing                        | unchanged                                                                         |
| `onAnalysis?(trees)`     | _(new)_  | `(trees: NodeReturn[]) => void` | **optional** — plugins that don't implement it are silently skipped for this hook |

---

## New entities

### `EntryPoint`

Represents one handler function to be analysed — the root of one call tree.

| Field          | Type                      | Required | Notes                                                                                                |
| -------------- | ------------------------- | -------- | ---------------------------------------------------------------------------------------------------- |
| `functionName` | `string`                  | ✅       | Name of the exported function to use as call-tree root                                               |
| `filePath`     | `string`                  | ✅       | Absolute path to the source file containing the export                                               |
| `metadata`     | `Record<string, unknown>` | ❌       | Framework-level info; embedded into root `NodeReturn.description` before plugin delivery (see R-007) |

**Validation rules**:

- `filePath` must resolve to a readable `.ts` or `.js` file on disk before analysis proceeds.
- `functionName` must match an export in the file; if not found after scanning, analysis for that entry point fails with a descriptive error.

**Deduplication key**: `filePath + '::' + functionName` (normalised, extensions stripped).

---

### `UnwrapRule`

A declarable descriptor that teaches `HandlerUnwrapper` to peel one layer off a wrapped export.

| Field      | Type     | Required | Notes                                                                |
| ---------- | -------- | -------- | -------------------------------------------------------------------- |
| `callee`   | `string` | ✅       | Name of the wrapper function to match (e.g. `'middy'`, `'withAuth'`) |
| `argIndex` | `number` | ✅       | Zero-based index of the argument that holds the inner function       |

**Built-in preset** — exported as `MIDDY_UNWRAP_RULE`:

```ts
{ callee: 'middy', argIndex: 0 }
```

**State transitions**:

```
EntryPoint { functionName: 'handler', filePath }
  → HandlerUnwrapper applies rule { callee: 'middy', argIndex: 0 }
  → inner name extracted: 'myBusinessLogic'
  → new EntryPoint { functionName: 'myBusinessLogic', filePath }
  → no rule matches → done
```

---

### `FrameworkAdapter` (abstract)

The extension point for framework-specific entry point discovery.

| Member                               | Kind            | Notes                                                                                   |
| ------------------------------------ | --------------- | --------------------------------------------------------------------------------------- |
| `resolveEntryPoints(): EntryPoint[]` | abstract method | Reads framework config (file, AST, etc.) and returns all discovered entry points        |
| `configPath?: string`                | property        | Optional path to the framework config file (e.g. `serverless.yml`); set via constructor |

**Invariant**: `resolveEntryPoints` must be pure with respect to the filesystem — it only reads, never writes.

---

### `HandlerUnwrapper`

Applies `UnwrapRule[]` iteratively to peel wrapper layers from an entry point.

| Member                               | Type           | Notes                                                                          |
| ------------------------------------ | -------------- | ------------------------------------------------------------------------------ |
| `rules`                              | `UnwrapRule[]` | Ordered list; first matching rule is applied per iteration                     |
| `unwrap(ep: EntryPoint): EntryPoint` | method         | Returns the innermost `EntryPoint`; if no rule matches, returns `ep` unchanged |

**Algorithm** (iterative, not recursive to avoid stack issues with deep chains):

```
loop:
  parse source file at ep.filePath
  find export declaration for ep.functionName
  if init is CallExpression && callee.name matches any rule.callee:
    ep.functionName = argument[rule.argIndex].name
    continue loop
  else:
    break
return ep
```

---

### `FileGraphScanner`

Discovers all source files reachable from an entry file via import declarations.

| Member                                                                       | Type   | Notes                                                                      |
| ---------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------- |
| `scan(entryFilePath: string, resolvePath?: ResolveFn): CodeAnalysisResult[]` | method | BFS from entry file; returns all reachable local files as analysed results |

**BFS invariants**:

- Visited set keyed by normalised absolute path (extensions stripped).
- `node_modules` paths (bare specifiers unresolvable to a local file) are skipped.
- Any file that cannot be read emits a warning and is skipped (non-fatal).

---

### `ServerlessAdapter extends FrameworkAdapter`

| Constructor arg     | Type     | Notes                             |
| ------------------- | -------- | --------------------------------- |
| `serverlessYmlPath` | `string` | Absolute path to `serverless.yml` |

**`resolveEntryPoints()` logic**:

1. Read and parse YAML with `js-yaml`.
2. For each key in `functions`, extract `handler` string.
3. Split on the last `.` → `relativeFilePath` + `exportName`.
4. Resolve `relativeFilePath` to an absolute path relative to the YAML file's directory; try `.ts` first, then `.js`.
5. Extract HTTP metadata from the first matching `events[].http` or `events[].httpApi` entry.
6. Return `EntryPoint { functionName: exportName, filePath: absolutePath, metadata: { httpMethod, httpPath } }`.

**Error condition**: If the resolved file does not exist → throw with message `[ServerlessAdapter] Handler file not found: <path> (declared in <yml>)`.

---

### `ExpressAdapter extends FrameworkAdapter`

| Constructor arg  | Type     | Notes                                                      |
| ---------------- | -------- | ---------------------------------------------------------- |
| `routerFilePath` | `string` | Absolute path to the Express router/application entry file |

**`resolveEntryPoints()` logic**:

1. Run `CodeAnalyzer` on the router file to obtain its AST.
2. Traverse for `CallExpression` nodes where callee is `MemberExpression` with property name in `{ get, post, put, patch, delete, options, all }`.
3. Arg 0 must be a string literal (route path). Last function-type arg (arrow or function expression, or identifier) is the handler.
4. If handler is an `Identifier`, look up its definition in `importMap` or local declarations to find the source file.
5. Return one `EntryPoint` per route with `metadata: { httpMethod, httpPath }`.

---

### `AdapterAnalysisResult` _(internal runner type — not exposed to plugins)_

Used only inside `AutoDocsBuilder.analyze()` to track state between pipeline steps.

| Field        | Type         | Notes                                |
| ------------ | ------------ | ------------------------------------ |
| `entryPoint` | `EntryPoint` | The entry point after unwrapping     |
| `tree`       | `NodeReturn` | The root node of the built call tree |

Plugins receive only the `NodeReturn[]` array — the `entryPoint` is not exposed.
