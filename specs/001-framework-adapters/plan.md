# Implementation Plan: Framework Adapters

**Branch**: `001-framework-adapters` | **Date**: 2026-03-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-framework-adapters/spec.md`

## Summary

Add a CI-driven analysis pipeline to AutoDocs: users write an `autodocs.config.ts`, select a `ServerlessAdapter` (reads `serverless.yml`) or `ExpressAdapter` (statically analyses a router file), optionally declare `HandlerUnwrapper` rules to peel back Middy/custom wrappers, run `npx autodocs`, and each registered plugin receives the resulting `NodeReturn[]` call trees via a new `onAnalysis` hook — with no manual `.docs({})` calls required.

This requires two connected tracks of work:

1. **Plugin refactor**: Currently plugins are registered as uninstantiated class references and are tightly coupled to `AutoDocsBuilder`'s internal linker flow. They must be refactored to accept constructor arguments (for per-plugin config like `outputDir`) and receive `NodeReturn[]` directly via a new optional `onAnalysis` hook.
2. **Adapter pipeline**: New `FrameworkAdapter` base class, `HandlerUnwrapper`, file graph scanner, and `AutoDocsBuilder.analyze()` orchestration method — all in `packages/core`. Concrete adapters (`ServerlessAdapter`, `ExpressAdapter`) and the CLI live in separate packages.

## Technical Context

**Language/Version**: TypeScript 5.x, strict mode  
**Primary Dependencies**: `@babel/parser`, `@babel/traverse`, `@babel/types`, `@babel/generator` (existing); `js-yaml` (new, Serverless adapter); `tsup`, `turbo`, `jest + ts-jest`  
**Storage**: N/A — files on disk only; no database  
**Testing**: Jest + ts-jest, co-located `__test__/` directories (per constitution IV)  
**Target Platform**: Node.js ≥ 18, CI environment (GitHub Actions, etc.)  
**Project Type**: Monorepo library + CLI tool  
**Performance Goals**: Full pipeline ≤ 10 s for 20 Lambda functions across 20 source files (SC-007)  
**Constraints**: Static analysis only — no `require()`/`import()` of user code at runtime; `packages/core` must not import any framework-specific package (FR-016)  
**Scale/Scope**: Typical target project: 10–50 Lambda functions, 10–100 source files

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                        | Status                    | Notes                                                                                                                                                                                                                                                                               |
| -------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Monorepo-First                | ✅ PASS                   | Three new packages (`adapters/serverless`, `adapters/express`, `cli`) each have a single clear responsibility. The empty `adapters/aws-lambda` skeleton already establishes the pattern. All use `workspace:*` refs to `@auto-docs/core`.                                           |
| II. Plugin-Extensible            | ✅ PASS (with MAJOR bump) | `onAnalysis` is purely additive. The plugin instantiation change (`Class[]` → `Instance[]`) breaks the current public `AutoDocsConfig` API → **MAJOR version bump required for `@auto-docs/core`**; migration guide must accompany the CHANGELOG entry. Core stays format-agnostic. |
| III. Return-Tree Analysis        | ✅ PASS                   | All adapters produce `EntryPoint` objects fed into the existing `LinkedCallTreeBuilder`. No analysis shortcuts — full return tree is built for every entry point.                                                                                                                   |
| IV. Test-First                   | ✅ PASS (enforced)        | Every new class (`FrameworkAdapter`, `HandlerUnwrapper`, `ServerlessAdapter`, `ExpressAdapter`, `AutoDocsBuilder.analyze()`) requires failing tests written before implementation. Regression tests for all existing plugin hooks must remain green (SC-003).                       |
| V. Versioning & Breaking Changes | ⚠ ACTION REQUIRED         | `AutoDocsConfig.plugins` type change + `pluginConfig` removal = MAJOR for `@auto-docs/core`. `onAnalysis` addition = MINOR for all plugin packages. CHANGELOG entries required for each affected package.                                                                           |

**Post-Phase-1 re-check**: ✅ Design in data-model.md and contracts/ confirms no additional violations.

## Project Structure

### Documentation (this feature)

```text
specs/001-framework-adapters/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/           ← Phase 1 output
│   ├── framework-adapter.ts
│   ├── autodocs-config.ts
│   └── plugin-interface.ts
└── tasks.md             ← Phase 2 (/speckit.tasks — not created here)
```

### Source Code (repository root)

```text
packages/
├── core/
│   └── src/
│       ├── Plugin.ts                    REFACTOR — add onAnalysis hook; change to instance-based
│       ├── index.ts                     REFACTOR — add analyze(), accept adapters/unwrapRules
│       ├── types.ts                     REFACTOR — update AutoDocsConfig shape
│       ├── adapters/
│       │   ├── FrameworkAdapter.ts      NEW — abstract base class
│       │   └── index.ts                 NEW — re-export
│       ├── unwrapper/
│       │   ├── HandlerUnwrapper.ts      NEW — iterative rule engine
│       │   ├── builtins.ts              NEW — built-in Middy unwrap rule
│       │   └── index.ts                 NEW — re-export
│       ├── scanner/
│       │   ├── FileGraphScanner.ts      NEW — BFS import resolver for multi-file analysis
│       │   └── index.ts                 NEW — re-export
│       └── __test__/
│           ├── adapters/
│           │   └── FrameworkAdapter.test.ts   NEW
│           ├── unwrapper/
│           │   └── HandlerUnwrapper.test.ts   NEW
│           └── scanner/
│               └── FileGraphScanner.test.ts   NEW
│
├── adapters/
│   ├── aws-lambda/                      SKELETON (empty — not in scope this feature)
│   ├── serverless/                      NEW PACKAGE
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tsup.config.ts
│   │   └── src/
│   │       ├── index.ts
│   │       ├── ServerlessAdapter.ts     NEW — reads serverless.yml, emits EntryPoints
│   │       └── __test__/
│   │           └── ServerlessAdapter.test.ts  NEW
│   └── express/                         NEW PACKAGE
│       ├── package.json
│       ├── tsconfig.json
│       ├── tsup.config.ts
│       └── src/
│           ├── index.ts
│           ├── ExpressAdapter.ts        NEW — static AST analysis of router file
│           └── __test__/
│               └── ExpressAdapter.test.ts     NEW
│
├── plugins/
│   └── openapi/
│       └── src/
│           └── index.ts                 REFACTOR — constructor args, add onAnalysis
│
└── cli/                                 NEW PACKAGE
    ├── package.json
    ├── tsconfig.json
    ├── tsup.config.ts
    └── src/
        ├── index.ts                     NEW — CLI entry point (bin: autodocs)
        ├── runner.ts                    NEW — config loader + pipeline orchestrator
        └── __test__/
            └── runner.test.ts           NEW
```

**Structure Decision**: Monorepo with five affected packages. New packages (`adapters/serverless`, `adapters/express`, `cli`) follow identical tsup + jest conventions as `packages/core`. Core gains three new internal modules (`adapters/`, `unwrapper/`, `scanner/`) without new package boundaries — all core-owned logic stays in one independently-buildable unit per Principle I.

## Complexity Tracking

| Violation                                           | Why Needed                                                                                                                                                                                                   | Simpler Alternative Rejected Because                                                                                                                                                                    |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Three new packages (`serverless`, `express`, `cli`) | Constitution I requires single-responsibility packages. `adapters/serverless` depends on `js-yaml`; `adapters/express` is a separate install surface; `cli` has a binary entry point. None belong in `core`. | Putting all in `core` would make it import framework-specific packages (violates FR-016) and bloat consumer bundles.                                                                                    |
| MAJOR version bump for `@auto-docs/core`            | Removing `pluginConfig` from `AutoDocsConfig` and changing `plugins` from class-references to instances are both breaking public API changes.                                                                | No backward-compatible way to support both — the old `initPlugins()` pattern and new instance pattern are mutually exclusive. `1.x → 2.0.0` with a migration guide is the correct path per Principle V. |

## Implementation Phases

### Phase A — Core Plugin Refactor _(unblocks all other work)_

Touches: `packages/core/src/Plugin.ts`, `packages/core/src/index.ts`, `packages/core/src/types.ts`, `packages/plugins/openapi/src/index.ts`

1. Change `AutoDocsConfig.plugins` from `(typeof AutoDocsPlugin<T>)[]` to `AutoDocsPlugin<T>[]`
2. Remove `initPlugins()` and `isConcretePlugin()` from `AutoDocsBuilder`; call `plugin.onInit(this)` during construction instead
3. Remove `pluginConfig` from `AutoDocsConfig`; the OpenAPI plugin reads `outputDir` and `version` from its own constructor args
4. Add optional `onAnalysis?(trees: NodeReturn[]): void` to `AutoDocsPlugin` base
5. Update `OpenApiDoc` constructor to accept `{ outputDir?: string; version?: string }`
6. Update all existing tests to instantiate plugins as objects, not class references
7. Write CHANGELOG entries; bump `@auto-docs/core` to `2.0.0-beta.1`

### Phase B — Core Adapter Infrastructure _(unblocks adapters)_

Touches: `packages/core/src/adapters/`, `packages/core/src/unwrapper/`, `packages/core/src/scanner/`, `packages/core/src/index.ts`

1. Implement `FrameworkAdapter` abstract class with `resolveEntryPoints(): EntryPoint[]`
2. Implement `HandlerUnwrapper` with `UnwrapRule[]` and iterative `unwrap(functionName, filePath)` using the existing `CodeAnalyzer` AST to find the innermost function
3. Implement built-in Middy `UnwrapRule` (matches `middy(fn)`, extracts arg 0)
4. Implement `FileGraphScanner` — BFS from an entry file, follows `importMap` to discover all source files in the call graph, returns a `CodeAnalysisResult[]` ready for `LinkedCallTreeBuilder`
5. Add `AutoDocsBuilder.analyze(adapters, unwrapRules?)` method that: resolves entry points → unwraps → scans file graph → builds `NodeReturn[]` per entry → calls `plugin.onAnalysis?.(trees)` on all plugins

### Phase C — Serverless Adapter _(parallel with Phase D after Phase B)_

Touches: `packages/adapters/serverless/` (new package)

1. Scaffold package with `package.json`, `tsconfig.json`, `tsup.config.ts`
2. Implement `ServerlessAdapter extends FrameworkAdapter` — reads `serverless.yml` via `js-yaml`, parses `functions[*].handler`, resolves `file.exportName` notation to `{ filePath, functionName, metadata: { httpMethod, httpPath } }` from event definitions
3. Embed `metadata` serialisation format: `JSON.stringify(metadata)` prefixed as `AUTO_DOCS_META:` in the root `NodeReturn.description` by the runner

### Phase D — Express Adapter _(parallel with Phase C after Phase B)_

Touches: `packages/adapters/express/` (new package)

1. Scaffold package
2. Implement `ExpressAdapter extends FrameworkAdapter` — uses `CodeAnalyzer` to parse the router file AST; finds `CallExpression` nodes where callee is `[identifier].get/post/put/delete/patch` (Express route registration pattern); extracts route path (arg 0 string literal) and handler reference (last function arg); resolves handler to `{ filePath, functionName, metadata: { httpMethod, httpPath } }`

### Phase E — CLI Package _(after Phase B; parallel with C/D)_

Touches: `packages/cli/` (new package)

1. Scaffold package with `bin` field pointing to compiled entry
2. Implement config loader — resolves `autodocs.config.ts` / `.js` from `process.cwd()` using `tsx` or `jiti` for TS execution; validates shape against `AutoDocsConfig`
3. Implement `runner.ts` — calls `builder.analyze(config.adapters, config.unwrapRules)`, handles fatal errors with non-zero exit + descriptive message (FR-011)
4. Write `runner.test.ts` using fixture config files
