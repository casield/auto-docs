# Research: Framework Adapters

**Phase**: 0 | **Feature**: 001-framework-adapters | **Date**: 2026-03-08

All unknowns from the Technical Context resolved. No NEEDS CLARIFICATION items remain.

---

## R-001 — Serverless Framework YAML handler notation

**Decision**: Parse `serverless.yml` with `js-yaml` (`npm install js-yaml`). The handler value follows the convention `path/to/file.exportName` — split on the last `.` to get `filePath` (prepend project root, append `.ts` extension) and `functionName`.

**Rationale**: `js-yaml` is the standard YAML parser in the Node.js ecosystem, has zero sub-dependencies, and is already used by the Serverless Framework itself. No alternative is worth evaluating for straightforward YAML parsing.

**Alternatives considered**: `yaml` (heavier), manual string parsing (fragile for multiline YAML), `@serverless/utils` (too much transitive weight).

**Resolved by**: Inspecting the Serverless Framework v3/v4 documentation and the `serverless.yml` handler format specification.

**HTTP metadata location**: HTTP method and path are nested under `functions.[name].events[].http.method` and `functions.[name].events[].http.path` (or `events[].httpApi.*`). Both v3 `http` and v4 `httpApi` event keys must be checked.

---

## R-002 — Static AST analysis for Express route registration

**Decision**: Reuse `CodeAnalyzer`'s Babel AST traversal already in `packages/core`. Extend the traversal to look for `CallExpression` nodes of the form `router.get(path, ...handlers)` or `app.get(path, ...handlers)` where the callee is a `MemberExpression` whose property name is one of `get | post | put | patch | delete | options | all`. The route path is extracted from the first string-literal argument; the handler is the last function-type argument.

**Rationale**: The existing `CodeAnalyzer` already parses TypeScript/JSX via Babel and builds `importMap`. Reusing it avoids a second AST pass, keeps the `ExpressAdapter` thin, and means import resolution is free.

**Alternatives considered**: Running the router file through `require()` — rejected (violates FR-016, would execute user code). Using ESLint's rule AST — rejected (overkill, different dependency tree).

**NOTE**: The Express adapter does not handle dynamically-constructed routers (e.g. `router[method](...)`) in v1. This is an accepted limitation noted in edge cases.

---

## R-003 — Handler unwrapping via AST

**Decision**: When the runner has a `{ functionName, filePath }` pair, `HandlerUnwrapper` uses `CodeAnalyzer` to parse the source file, then looks up the export named `functionName`. If that export's `init` node is a `CallExpression` whose callee name matches a `UnwrapRule.callee`, the argument at `UnwrapRule.argIndex` is extracted as the new `functionName` (it may be an `Identifier` → its name, or a further `CallExpression` → recurse). The process repeats until no rule matches.

**Rationale**: Pure static analysis — no code execution. The `CodeAnalyzer` AST is already in memory from the file-graph scan so there is no extra I/O.

**Built-in Middy rule**: `{ callee: 'middy', argIndex: 0 }` — matches `middy(fn)` and all `middy(fn).use(...)` chains (the outer call is the `middy(...)` call; `.use(...)` appears as a chained `CallExpression` above it, not as the callee — so argIndex 0 of the innermost `middy(...)` call is always the real handler).

**Alternatives considered**: A separate "wrapper detection" pass before `CodeAnalyzer` — rejected (duplication). Runtime introspection via `Function.toString()` — rejected (violates static-only constraint).

---

## R-004 — Multi-file import graph traversal (FileGraphScanner)

**Decision**: `FileGraphScanner` performs a BFS starting from the entry file. For each file: run `CodeAnalyzer` to get `{ analysis, importMap }`. For each path in `importMap` that resolves to a local `.ts` / `.js` file (not a `node_modules` package), add to the BFS queue if not yet visited. Return a `CodeAnalysisResult[]` of all visited files.

**Rationale**: `LinkedCallTreeBuilder` needs all file analyses up-front. The `CodeAnalyzer.importMap` already records resolved local paths — BFS over it is the minimal correct approach.

**Node module detection**: A path is `node_modules` if the resolved path contains `/node_modules/` or does not start with `.` / `/` (i.e. it's a bare specifier that could not be resolved to a local file by `resolvePath`).

**Cyclic import handling**: BFS `visited` set (keyed by normalised absolute path) prevents infinite loops — existing `LinkedCallTreeBuilder` already handles circular call references with its own `visited` set.

**Alternatives considered**: Pre-building a full project-wide AST with `tsc --listFiles` — rejected (requires project `tsconfig.json` at a known path, adds a subprocess dependency). Using `ts-morph` — rejected (heavy, different dependency than the existing Babel stack).

---

## R-005 — Plugin instantiation refactor

**Decision**: Change `AutoDocsConfig.plugins` from `(typeof AutoDocsPlugin<T>)[]` (uninstantiated class references) to `AutoDocsPlugin<T>[]` (instances). Remove `initPlugins()` and `isConcretePlugin()` from `AutoDocsBuilder`. Constructor call moves to the user's config file:

```ts
// Before
plugins: [OpenApiDoc];

// After
plugins: [new OpenApiDoc({ outputDir: "docs", version: "1.0.0" })];
```

`AutoDocsBuilder` constructor calls `plugin.onInit(this)` on each instance during setup.

**Rationale**: Instance-based registration makes constructor arguments trivially supported without any additional indirection. The current `isConcretePlugin` guard's only purpose was to prevent passing non-class values — with instances, TypeScript's type system enforces this.

**Breaking change scope**: `AutoDocsConfig.plugins` type changes; `AutoDocsConfig.pluginConfig` removed. This is a **MAJOR** version bump (`1.x → 2.0.0`) for `@auto-docs/core` per Constitution Principle V.

**Migration**: Old code `plugins: [OpenApiDoc]` → new code `plugins: [new OpenApiDoc()]`. One-line change per usage.

---

## R-006 — CLI config loading (TypeScript config file)

**Decision**: Use `jiti` (a lightweight on-the-fly TypeScript runner built on top of `esbuild`) to `require()` the user's `autodocs.config.ts` at runtime without a separate compile step. `jiti` is already widely used in the ecosystem (e.g. `tailwind.config.ts`, `vite.config.ts`).

**Rationale**: Users write their config in TypeScript to get type safety. `jiti` requires no pre-compilation and adds ~200 KB to the CLI package. The alternative (`tsx`) is heavier; `ts-node` requires a `tsconfig.json` at a specific path.

**Alternatives considered**: `tsx` (heavier, larger install), `ts-node` (slower startup, `tsconfig.json` required), requiring users to pre-compile their config (poor DX).

---

## R-007 — Metadata embedding in NodeReturn description

**Decision**: Before calling `plugin.onAnalysis(trees)`, the runner serialises each entry point's `metadata` as a JSON string prefixed with the sentinel `AUTO_DOCS_META:` and appends it to the root `NodeReturn`'s `description` field. Plugins that need metadata parse it with `JSON.parse(description.split('AUTO_DOCS_META:')[1])`. Plugins that don't need metadata ignore the description or strip the sentinel.

**Format example**:

```
Gets a user by ID\nAUTO_DOCS_META:{"httpMethod":"get","httpPath":"/users/{id}"}
```

**Rationale**: Confirmed in Clarification Q3 (Answer A). Keeps `NodeReturn` type unchanged, requires no new fields or parallel arrays, and is fully backwards-compatible (existing plugins that don't check for the sentinel are unaffected).

**Alternatives considered**: Adding `metadata?: Record<string, unknown>` to `NodeReturn` — rejected to keep the core type stable and avoid a MINOR bump just for this. Parallel array — rejected (answered Q3).
