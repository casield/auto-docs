# Tasks: Framework Adapters

**Input**: Design documents from `/specs/001-framework-adapters/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Constitution Note**: Per Principle IV, tests are **MANDATORY**. All test tasks must be written first and confirmed to **FAIL** before the corresponding implementation task begins (Red-Green-Refactor).

**Organization**: Two foundational phases (plugin refactor, then core adapter infra) gate six user story phases. Phases 5 and 6 (US1 + US4) can run in parallel after Phase 4 completes; Phases 7 and 8 (US3 + US2) can run in parallel after Phase 4 completes.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US6)
- Exact file paths are included in all descriptions

---

## Phase 1: Setup — Scaffold New Packages

**Purpose**: Create the three new package skeletons before any logic is written. All six tasks are independent and can run in parallel.

- [ ] T001 [P] Scaffold `packages/adapters/serverless/package.json` (name: `@auto-docs/adapter-serverless`, deps: `@auto-docs/core workspace:*`, `js-yaml`)
- [ ] T002 [P] Scaffold `packages/adapters/serverless/tsconfig.json` and `packages/adapters/serverless/tsup.config.ts` matching `packages/core` conventions
- [ ] T003 [P] Scaffold `packages/adapters/express/package.json` (name: `@auto-docs/adapter-express`, deps: `@auto-docs/core workspace:*`)
- [ ] T004 [P] Scaffold `packages/adapters/express/tsconfig.json` and `packages/adapters/express/tsup.config.ts` matching `packages/core` conventions
- [ ] T005 [P] Scaffold `packages/cli/package.json` (name: `@auto-docs/cli`, `bin: { autodocs: ./dist/index.js }`, deps: `@auto-docs/core workspace:*`, `jiti`)
- [ ] T006 [P] Scaffold `packages/cli/tsconfig.json` and `packages/cli/tsup.config.ts` matching `packages/core` conventions

**Checkpoint**: Three package skeletons exist on disk. `turbo build` resolves all workspace references.

---

## Phase 2: Foundational A — Core Plugin Refactor _(blocks all other work)_

**Purpose**: Refactor `@auto-docs/core` plugin registration from class-references to instances, remove `pluginConfig`, and add the `onAnalysis` hook that all subsequent phases depend on. This is a **breaking change** (MAJOR version bump to `2.0.0-beta.1`).

**⚠️ CRITICAL**: No user story work (Phases 3–9) can begin until this phase is fully complete and all tests pass.

### Tests (Write First — Must FAIL Before Implementation)

- [ ] T007 Update `packages/core/src/__test__/VersionControl.test.ts` to instantiate plugins as objects (`new OpenApiDoc(...)`) instead of passing class references — confirm test **fails** before T013
- [ ] T008 [P] Write failing test in `packages/core/src/__test__/AutoDocsBuilder.test.ts`: `AutoDocsBuilder` constructor accepts an `AutoDocsPlugin[]` array (instances), calls `plugin.onInit(builder)` for each, and does NOT call `initPlugins()`
- [ ] T009 [P] Write failing test in `packages/core/src/__test__/AutoDocsBuilder.test.ts`: constructing `AutoDocsBuilder` with a config that has `pluginConfig` defined throws a type error (or is stripped) — verifies removal
- [ ] T010 [P] Write failing test in `packages/core/src/__test__/Plugin.test.ts`: a concrete `AutoDocsPlugin` subclass that does NOT implement `onAnalysis` can be instantiated without error, and calling the optional hook is a no-op

### Implementation

- [ ] T011 Update `packages/core/src/types.ts`: change `plugins: (typeof AutoDocsPlugin<T>)[]` → `plugins: AutoDocsPlugin<any>[]`; remove `pluginConfig` field from `AutoDocsConfig`; add `adapters?: FrameworkAdapter[]` and `unwrapRules?: UnwrapRule[]` placeholder fields (typed `unknown[]` until Phase 4 supplies the real types)
- [ ] T012 Update `packages/core/src/Plugin.ts`: add `onAnalysis?(trees: NodeReturn[]): void` as an optional method; import `NodeReturn` from `packages/core/src/analyzer/CallTreeBuilder.ts`
- [ ] T013 Update `packages/core/src/index.ts`: delete `initPlugins()` and `isConcretePlugin()`; in the `AutoDocsBuilder` constructor iterate `config.plugins` and call `plugin.onInit(this)` directly
- [ ] T014 Update `packages/core/src/index.ts`: re-export `NodeReturn` from `packages/core/src/index.ts` so downstream packages can import it without reaching into internals
- [ ] T015 Bump `packages/core/package.json` to `2.0.0-beta.1` and write CHANGELOG entry documenting: plugins now instances, `pluginConfig` removed, `onAnalysis` added, migration guide linking `quickstart.md`
- [ ] T016 Run full test suite (`turbo test --filter=@auto-docs/core`) and confirm all tests in T007–T010 now pass

**Checkpoint**: `@auto-docs/core@2.0.0-beta.1` is green. Plugin registration is instance-based. `onAnalysis` is declared on the base class.

---

## Phase 3: User Story 6 — Plugin Acts Autonomously on Call Tree Nodes (Priority: P2)

**Goal**: The `OpenApiDoc` plugin receives `NodeReturn[]` via `onAnalysis`, parses `AUTO_DOCS_META:<json>` from root node descriptions to extract HTTP metadata, and independently writes an OpenAPI spec — no `.docs()` calls required.

**Independent Test**: Pass a hand-crafted `NodeReturn[]` with a root node whose `description` contains `AUTO_DOCS_META:{"httpMethod":"GET","httpPath":"/users"}` directly to `plugin.onAnalysis(trees)` and assert a valid OpenAPI path item for `GET /users` is produced.

### Tests for User Story 6 (Write First — Must FAIL Before Implementation)

- [ ] T017 [P] [US6] Write failing test in `packages/plugins/openapi/src/__test__/OpenApiDoc.test.ts`: `new OpenApiDoc({ outputDir: '/tmp/out', version: '3.0.0' })` constructs without error and exposes `outputDir` and `version` on the instance
- [ ] T018 [P] [US6] Write failing test in `packages/plugins/openapi/src/__test__/OpenApiDoc.test.ts`: calling `plugin.onAnalysis([nodeWithMeta])` where root `description` includes `AUTO_DOCS_META:{"httpMethod":"GET","httpPath":"/users"}` produces an OpenAPI document containing `paths['/users'].get`
- [ ] T019 [US6] Write failing test in `packages/plugins/openapi/src/__test__/OpenApiDoc.test.ts`: calling `plugin.onAnalysis([nodeWithNoMeta])` (no `AUTO_DOCS_META:` in description) does NOT throw and produces a minimal valid path item with a sensible default or is silently skipped

### Implementation for User Story 6

- [ ] T020 [US6] Update `packages/plugins/openapi/src/index.ts`: replace class-level static registration with a constructor `constructor(private opts: { outputDir?: string; version?: string } = {})`
- [ ] T021 [US6] Update `packages/plugins/openapi/src/index.ts`: implement `onAnalysis(trees: NodeReturn[]): void` — for each tree, check `trees[0].description` for `AUTO_DOCS_META:` prefix, parse the JSON suffix to extract `{ httpMethod, httpPath }`, pass to existing OpenAPI path-building logic
- [ ] T022 [US6] Update `packages/plugins/openapi/src/index.ts`: remove `onBuild` reference to `builder.config.pluginConfig?.openApi.outputDir` — use `this.opts.outputDir` instead
- [ ] T023 [US6] Add CHANGELOG entry in `packages/plugins/openapi/CHANGELOG.md`: MINOR bump, document `onAnalysis` hook added and constructor-args migration

**Checkpoint**: `new OpenApiDoc({ outputDir: 'docs/', version: '3.0.0' })` receives `NodeReturn[]` and autonomously writes an OpenAPI spec. No `.docs()` required. Independently testable with hand-crafted trees.

---

## Phase 4: Foundational B — Core Adapter Infrastructure _(blocks Phases 5–8)_

**Purpose**: Implement `FrameworkAdapter` base class, `HandlerUnwrapper` rule engine, `FileGraphScanner`, and `AutoDocsBuilder.analyze()` in `packages/core`. These are shared by every adapter and must be complete before any concrete adapter can be implemented.

**⚠️ CRITICAL**: Phases 5–8 cannot start until this phase is fully complete and green.

### Tests (Write First — Must FAIL Before Implementation)

- [ ] T024 Write failing test in `packages/core/src/__test__/adapters/FrameworkAdapter.test.ts`: a concrete subclass implementing `resolveEntryPoints()` and returning a fixed `EntryPoint[]` can be instantiated and called — verifies the abstract contract compiles and resolves correctly
- [ ] T025 [P] Write failing test in `packages/core/src/__test__/unwrapper/HandlerUnwrapper.test.ts`: given a minimal source file `export const handler = middy(myBusinessLogic)` and `MIDDY_UNWRAP_RULE`, `HandlerUnwrapper.unwrap('handler', filePath)` returns `'myBusinessLogic'`
- [ ] T026 [P] Write failing test in `packages/core/src/__test__/unwrapper/HandlerUnwrapper.test.ts`: given an entry point with no matching unwrap rule, `unwrap()` returns the original function name unchanged and emits no error
- [ ] T027 [P] Write failing test in `packages/core/src/__test__/scanner/FileGraphScanner.test.ts`: given a fixture entry file that imports one helper file, `FileGraphScanner.scan(entryFilePath)` returns a `CodeAnalysisResult[]` containing both the entry file and the imported helper
- [ ] T028 Write failing test in `packages/core/src/__test__/AutoDocsBuilder.test.ts`: `builder.analyze([mockAdapter])` calls `mockAdapter.resolveEntryPoints()`, builds one `NodeReturn[]` per entry point, and invokes `plugin.onAnalysis?.(trees)` once per entry point

### Implementation

- [ ] T029 Create `packages/core/src/adapters/FrameworkAdapter.ts`: `export abstract class FrameworkAdapter` with abstract method `resolveEntryPoints(): EntryPoint[] | Promise<EntryPoint[]>` and `EntryPoint` interface `{ filePath: string; functionName: string; metadata?: Record<string, unknown> }`
- [ ] T030 [P] Create `packages/core/src/adapters/index.ts`: re-export `FrameworkAdapter` and `EntryPoint`
- [ ] T031 Create `packages/core/src/unwrapper/HandlerUnwrapper.ts`: export `UnwrapRule` interface `{ callee: string; argIndex: number }` and class `HandlerUnwrapper` with `unwrap(functionName, filePath, rules)` — uses `CodeAnalyzer` to parse the file AST, finds call expression matching `rule.callee(...)` as the RHS of the named export, returns the string name of `arguments[rule.argIndex]` (identifier or function); iterates rules until no further unwrapping is possible; emits console warning for unmatched rules
- [ ] T032 [P] Create `packages/core/src/unwrapper/builtins.ts`: `export const MIDDY_UNWRAP_RULE: UnwrapRule = { callee: 'middy', argIndex: 0 }`
- [ ] T033 [P] Create `packages/core/src/unwrapper/index.ts`: re-export `HandlerUnwrapper`, `UnwrapRule`, `MIDDY_UNWRAP_RULE`
- [ ] T034 Create `packages/core/src/scanner/FileGraphScanner.ts`: export class `FileGraphScanner` with `scan(entryFilePath: string): CodeAnalysisResult[]` — BFS from `entryFilePath` using `CodeAnalyzer` to parse each file and extract its `importMap`; follows relative imports to discover all reachable source files; returns deduplicated `CodeAnalysisResult[]` ready for `LinkedCallTreeBuilder`
- [ ] T035 [P] Create `packages/core/src/scanner/index.ts`: re-export `FileGraphScanner`
- [ ] T036 Update `packages/core/src/types.ts`: replace `adapters?: unknown[]` and `unwrapRules?: unknown[]` placeholders with properly typed `adapters?: FrameworkAdapter[]` and `unwrapRules?: UnwrapRule[]` now that the real types exist
- [ ] T037 Add `AutoDocsBuilder.analyze(adapters: FrameworkAdapter[], unwrapRules?: UnwrapRule[]): Promise<void>` in `packages/core/src/index.ts` — orchestration: resolve entry points from each adapter → for each entry point apply `HandlerUnwrapper` → use `FileGraphScanner` to collect `CodeAnalysisResult[]` → feed into `LinkedCallTreeBuilder` → serialize `entryPoint.metadata` as `AUTO_DOCS_META:<JSON>` into root `NodeReturn.description` → call `plugin.onAnalysis?.(trees)` for each plugin with that entry's trees
- [ ] T038 Update `packages/core/src/index.ts` top-level exports: re-export `FrameworkAdapter`, `EntryPoint`, `HandlerUnwrapper`, `UnwrapRule`, `MIDDY_UNWRAP_RULE`, `FileGraphScanner`
- [ ] T039 Run full test suite (`turbo test --filter=@auto-docs/core`) and confirm all Phase 4 tests pass

**Checkpoint**: `AutoDocsBuilder.analyze()` is wired end-to-end. `HandlerUnwrapper` strips Middy wrappers. `FileGraphScanner` traverses imports. All independently tested.

---

## Phase 5: User Story 1 — CI Analysis via Serverless Framework Adapter (Priority: P1) 🎯 MVP

**Goal**: The `ServerlessAdapter` reads a `serverless.yml`, discovers all `handler:` declarations, resolves each to an `EntryPoint`, and feeds the analysis pipeline.

**Independent Test**: Point the adapter at a fixture `serverless.yml` with two handler declarations and confirm two `EntryPoint` objects are returned, one per handler, with zero `.docs()` calls.

### Tests for User Story 1 (Write First — Must FAIL Before Implementation)

- [ ] T040 [P] [US1] Write failing test in `packages/adapters/serverless/src/__test__/ServerlessAdapter.test.ts`: given a fixture `serverless.yml` declaring `handler: src/users.getUser`, `new ServerlessAdapter({ configPath: fixturePath }).resolveEntryPoints()` returns an `EntryPoint` with `filePath: 'src/users.ts'` and `functionName: 'getUser'`
- [ ] T041 [P] [US1] Write failing test in `packages/adapters/serverless/src/__test__/ServerlessAdapter.test.ts`: given a `serverless.yml` declaring a function with an HTTP event `{ method: get, path: /users/{id} }`, the returned `EntryPoint.metadata` contains `{ httpMethod: 'GET', httpPath: '/users/{id}' }`
- [ ] T042 [US1] Write failing test in `packages/adapters/serverless/src/__test__/ServerlessAdapter.test.ts`: given a `serverless.yml` referencing a handler file that does not exist, `resolveEntryPoints()` throws with a descriptive error naming the missing file path

### Implementation for User Story 1

- [ ] T043 [US1] Create `packages/adapters/serverless/src/ServerlessAdapter.ts`: `export class ServerlessAdapter extends FrameworkAdapter` — constructor accepts `{ configPath: string }`; `resolveEntryPoints()` reads and parses `serverless.yml` via `js-yaml`; iterates `functions` record; splits each `handler` value on the last `.` to separate `filePath` (try `.ts` then `.js` extensions) from `functionName`; extracts `httpMethod` and `httpPath` from the first `http` or `httpApi` event in the function's `events` array; returns `EntryPoint[]`
- [ ] T044 [US1] Add file-existence validation in `packages/adapters/serverless/src/ServerlessAdapter.ts`: after resolving `filePath`, check `fs.existsSync(filePath)` and throw descriptive error if missing (acceptance scenario 3)
- [ ] T045 [US1] Create `packages/adapters/serverless/src/index.ts`: export `ServerlessAdapter`
- [ ] T046 [US1] Create fixture files for tests: `packages/adapters/serverless/src/__test__/fixtures/serverless.yml` (two functions with http events) and `packages/adapters/serverless/src/__test__/fixtures/src/users.ts` (stub handler file)
- [ ] T047 [US1] Run `turbo test --filter=@auto-docs/adapter-serverless` and confirm all US1 tests pass

**Checkpoint**: `ServerlessAdapter` resolves entry points from `serverless.yml`. Fully tested independently. No `.docs()` calls anywhere.

---

## Phase 6: User Story 4 — Config-Driven CI Execution (Priority: P1)

**Goal**: A developer runs `npx autodocs` from their project root. The CLI loads `autodocs.config.ts`, instantiates the configured adapters and plugins, calls `builder.analyze()`, and exits cleanly — or exits non-zero with a human-readable error.

**Independent Test**: Create a minimal fixture `autodocs.config.ts` pointing at the Serverless fixture files from Phase 5, run the CLI, and assert exit code 0 and a written output artefact.

### Tests for User Story 4 (Write First — Must FAIL Before Implementation)

- [ ] T048 [P] [US4] Write failing test in `packages/cli/src/__test__/runner.test.ts`: `loadConfig(fixtureDirWithConfig)` finds and loads the fixture `autodocs.config.ts` and returns a valid `AutoDocsConfig` object
- [ ] T049 [P] [US4] Write failing test in `packages/cli/src/__test__/runner.test.ts`: `loadConfig(dirWithoutConfig)` throws with an error message guiding the user to create a config file
- [ ] T050 [US4] Write failing test in `packages/cli/src/__test__/runner.test.ts`: a fixture `autodocs.config.ts` with a syntax error causes `loadConfig()` to throw with a message pointing to the offending file (not a raw stack trace)

### Implementation for User Story 4

- [ ] T051 [US4] Create `packages/cli/src/runner.ts`: export `loadConfig(cwd: string): Promise<AutoDocsConfig>` — uses `jiti` to dynamically load `autodocs.config.ts` (or `.js`) from `cwd`; validates presence and basic shape; throws descriptive errors for missing file or malformed config
- [ ] T052 [US4] Create `packages/cli/src/runner.ts` (continued): export `run(config: AutoDocsConfig): Promise<void>` — instantiates `AutoDocsBuilder` with config, calls `builder.analyze(config.adapters ?? [], config.unwrapRules)`, catches errors and re-throws with human-readable prefix
- [ ] T053 [US4] Create `packages/cli/src/index.ts`: CLI entry point — calls `loadConfig(process.cwd())` then `run(config)`; on any thrown error prints `[AutoDocs Error] <message>` to `stderr` and calls `process.exit(1)`
- [ ] T054 [US4] Create fixture for CLI test: `packages/cli/src/__test__/fixtures/valid-project/autodocs.config.ts` — a minimal config using `ServerlessAdapter` and `OpenApiDoc` instances pointing at Phase 5 fixture files
- [ ] T055 [US4] Run `turbo test --filter=@auto-docs/cli` and confirm all US4 tests pass

**Checkpoint**: `npx autodocs` runs the full pipeline from config file. Non-zero exit + descriptive error on missing/broken config. US1 + US4 together form the complete P1 MVP.

---

## Phase 7: User Story 3 — Handler Wrapper Resolution (Priority: P2)

**Goal**: A developer declares `unwrapRules` in `autodocs.config.ts` (or uses the built-in `MIDDY_UNWRAP_RULE`). Before building call trees, the runner peels back wrapper calls to find the real business logic function.

**Independent Test**: Create a handler file with `export const handler = middy(myBusinessLogic)`, declare `MIDDY_UNWRAP_RULE`, run `HandlerUnwrapper.unwrap('handler', filePath, [MIDDY_UNWRAP_RULE])` and assert the return value is `'myBusinessLogic'`.

> **Note**: `HandlerUnwrapper` and `MIDDY_UNWRAP_RULE` were implemented in Phase 4. This phase adds end-to-end tests for multi-layer unwrapping and custom-rule scenarios, and wires `unwrapRules` properly through the CLI config path.

### Tests for User Story 3 (Write First — Must FAIL Before Implementation)

- [ ] T056 [P] [US3] Write failing test in `packages/core/src/__test__/unwrapper/HandlerUnwrapper.test.ts`: given `export const handler = withAuth(withLogging(myBusinessLogic))` and two custom `UnwrapRule` objects for `withAuth` and `withLogging`, `HandlerUnwrapper.unwrap()` iteratively unwraps both layers and returns `'myBusinessLogic'`
- [ ] T057 [P] [US3] Write failing test in `packages/core/src/__test__/unwrapper/HandlerUnwrapper.test.ts`: given an unwrap rule that does not match any call in the file, `unwrap()` emits a `console.warn` containing the rule's `callee` name and returns the original function name

### Implementation for User Story 3

- [ ] T058 [US3] Update `packages/core/src/unwrapper/HandlerUnwrapper.ts` if needed: confirm the iterative loop applies ALL matching rules in sequence (not just the first); verify warning path is triggered when a declared rule matches nothing in the AST
- [ ] T059 [US3] Add end-to-end fixture test in `packages/cli/src/__test__/runner.test.ts`: a fixture config declaring `unwrapRules: [MIDDY_UNWRAP_RULE]` causes the runner to unwrap the handler before tree construction — verify call tree root is `myBusinessLogic` not `handler`
- [ ] T060 [US3] Run `turbo test --filter=@auto-docs/core` and confirm all US3 multi-layer unwrap tests pass

**Checkpoint**: Nested wrappers are resolved iteratively. Custom rules work. Unmatched rules warn and fall back gracefully.

---

## Phase 8: User Story 2 — CI Analysis via Express Adapter (Priority: P2)

**Goal**: The `ExpressAdapter` statically analyses an Express router file, discovers all registered routes and their handler references, and returns an `EntryPoint[]` for each route.

**Independent Test**: Point the adapter at a fixture Express router file registering three routes, confirm three `EntryPoint` objects are returned with correct `filePath`, `functionName`, and `metadata.httpMethod`/`metadata.httpPath`.

### Tests for User Story 2 (Write First — Must FAIL Before Implementation)

- [ ] T061 [P] [US2] Write failing test in `packages/adapters/express/src/__test__/ExpressAdapter.test.ts`: given a fixture router file with `router.get('/users', getUsers)`, `new ExpressAdapter({ routerPath: fixturePath }).resolveEntryPoints()` returns one `EntryPoint` with `functionName: 'getUsers'`, `metadata.httpMethod: 'GET'`, `metadata.httpPath: '/users'`
- [ ] T062 [P] [US2] Write failing test in `packages/adapters/express/src/__test__/ExpressAdapter.test.ts`: given a router file where `getUsers` is imported from `./handlers/users`, the returned `EntryPoint.filePath` resolves to the imported file, not the router file itself
- [ ] T063 [US2] Write failing test in `packages/adapters/express/src/__test__/ExpressAdapter.test.ts`: given a router file with three routes using different HTTP methods, three `EntryPoint` objects are returned with distinct `metadata.httpMethod` values

### Implementation for User Story 2

- [ ] T064 [US2] Create `packages/adapters/express/src/ExpressAdapter.ts`: `export class ExpressAdapter extends FrameworkAdapter` — constructor accepts `{ routerPath: string }`; `resolveEntryPoints()` reads `routerPath`, uses `CodeAnalyzer` to parse the file AST, traverses `CallExpression` nodes where `callee` is a `MemberExpression` with `property.name` in `['get','post','put','delete','patch']`; extracts `httpPath` from `arguments[0]` (string literal) and handler reference from the last argument; resolves handler identifier through `CodeAnalyzer.importMap` to find the source `filePath` and `functionName`; returns `EntryPoint[]`
- [ ] T065 [US2] Create `packages/adapters/express/src/index.ts`: export `ExpressAdapter`
- [ ] T066 [US2] Create fixture files for tests: `packages/adapters/express/src/__test__/fixtures/router.ts` (three routes: GET/POST/DELETE) and `packages/adapters/express/src/__test__/fixtures/handlers/users.ts` (three stub handler functions)
- [ ] T067 [US2] Run `turbo test --filter=@auto-docs/adapter-express` and confirm all US2 tests pass

**Checkpoint**: `ExpressAdapter` resolves routes from an Express router file. Import-following works. Three routes → three call trees.

---

## Phase 9: User Story 5 — Extensible Adapter Interface (Priority: P3)

**Goal**: Any developer can extend `FrameworkAdapter`, implement `resolveEntryPoints()`, declare the custom adapter in `autodocs.config.ts`, and it works with zero changes to `@auto-docs/core`.

**Independent Test**: Write a minimal custom adapter that returns one hard-coded `EntryPoint`, instantiate it in the runner, call `builder.analyze([customAdapter])`, and assert one call tree is built and delivered to `plugin.onAnalysis`.

### Tests for User Story 5 (Write First — Must FAIL Before Implementation)

- [ ] T068 [P] [US5] Write failing test in `packages/core/src/__test__/adapters/FrameworkAdapter.test.ts`: a hand-written custom class `class FixtureAdapter extends FrameworkAdapter` returning a fixed `EntryPoint[]` — when passed to `builder.analyze([fixtureAdapter])`, the mock plugin's `onAnalysis` is called with the expected trees
- [ ] T069 [P] [US5] Write failing test in `packages/core/src/__test__/adapters/FrameworkAdapter.test.ts`: a config declaring both `new ServerlessAdapter(...)` and a custom `FixtureAdapter` — `builder.analyze([serverlessAdapter, fixtureAdapter])` calls `onAnalysis` once per resolved entry point across both adapters

### Implementation for User Story 5

- [ ] T070 [US5] Verify `packages/core/src/adapters/FrameworkAdapter.ts` TypeScript declaration compiles cleanly when subclassed externally (no `internal`-only type leaks); add JSDoc comment on `FrameworkAdapter` documenting the extension contract
- [ ] T071 [US5] Update `packages/core/src/index.ts` top-level public API documentation comment to list `FrameworkAdapter` as an extension point with a link to `quickstart.md`
- [ ] T072 [US5] Run `turbo test` (all packages) and confirm T068–T069 pass

**Checkpoint**: Community adapters are possible without forking core. Extension contract is fully documented.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Improvements across all phases — CHANGELOG hygiene, migration guide, quickstart validation, and turbo/build pipeline verification.

- [ ] T073 [P] Validate `quickstart.md` examples against the final implementation: run each code snippet from the migration guide section and confirm it compiles and executes (using `packages/cli` fixture infrastructure)
- [ ] T074 [P] Write CHANGELOG entry for `packages/core` `2.0.0-beta.1`: list every breaking change (`plugins` type, `pluginConfig` removal, `initPlugins` removed) with before/after migration examples
- [ ] T075 [P] Write CHANGELOG entry for `packages/plugins/openapi` MINOR bump: document `onAnalysis` hook, constructor args, removal of `pluginConfig` dependency
- [ ] T076 Add all three new packages (`@auto-docs/adapter-serverless`, `@auto-docs/adapter-express`, `@auto-docs/cli`) to the root `turbo.json` pipeline so `turbo build` and `turbo test` cover them
- [ ] T077 [P] Run `turbo build` (all packages) from repo root and confirm zero TypeScript errors across all packages
- [ ] T078 Run `turbo test` (all packages) from repo root — confirm full green suite; record final task count and coverage summary

**Checkpoint**: Monorepo builds and tests green end-to-end. CHANGELOGs are complete. Migration guide is validated.

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup          → No dependencies. Start immediately.
Phase 2: Foundational A → Depends on Phase 1. BLOCKS Phases 3–9.
Phase 3: US6            → Depends on Phase 2.
Phase 4: Foundational B → Depends on Phase 2. BLOCKS Phases 5–9.
Phase 5: US1            → Depends on Phase 4. Parallel with Phase 6.
Phase 6: US4            → Depends on Phase 4. Parallel with Phase 5.
Phase 7: US3            → Depends on Phase 4. Parallel with Phase 5, 6, 8.
Phase 8: US2            → Depends on Phase 4. Parallel with Phase 5, 6, 7.
Phase 9: US5            → Depends on Phase 4. Can start after any adapter works.
Phase 10: Polish        → Depends on all story phases.
```

### User Story Dependencies

| Story | Priority | Depends On     | Parallel With |
|-------|----------|----------------|---------------|
| US6   | P2       | Phase 2 (A)    | —             |
| US1   | P1       | Phase 4 (B)    | US4, US2, US3 |
| US4   | P1       | Phase 4 (B)    | US1, US2, US3 |
| US3   | P2       | Phase 4 (B)    | US1, US4, US2 |
| US2   | P2       | Phase 4 (B)    | US1, US4, US3 |
| US5   | P3       | Phase 4 (B)    | US1–US4       |

### Within Each Phase

1. Tests MUST be written and confirmed **failing** before implementation begins
2. Phase 2 implementation tasks must complete before Phase 3 tests are written (the types don't exist yet)
3. Phase 4 implementation tasks must complete before Phase 5–9 tests are written

---

## Parallel Execution Examples

### After Phase 2 completes — tackle Phase 3 + start Phase 4 tests simultaneously

```
Stream A: T024–T028 (Phase 4 tests — write all at once)
Stream B: T017–T019 (Phase 3 US6 tests)
```

### After Phase 4 completes — all four story phases can run in parallel

```
Stream A: T040–T047  (US1 — Serverless Adapter)
Stream B: T048–T055  (US4 — CLI)
Stream C: T056–T060  (US3 — HandlerUnwrapper end-to-end)
Stream D: T061–T067  (US2 — Express Adapter)
```

---

## Implementation Strategy

### MVP First (P1 Stories Only)

1. Complete **Phase 1** — scaffold packages
2. Complete **Phase 2** — plugin refactor (CRITICAL)
3. Complete **Phase 3** (US6) — OpenAPI `onAnalysis`
4. Complete **Phase 4** — core adapter infrastructure
5. Complete **Phase 5** (US1) — Serverless adapter
6. Complete **Phase 6** (US4) — CLI runner
7. **STOP and VALIDATE**: Run `npx autodocs` against a real Serverless project. OpenAPI spec is written. ✅ MVP shipped.

### Full Delivery (All Stories)

After MVP:
- Phase 7 (US3) — Middy unwrapping
- Phase 8 (US2) — Express adapter
- Phase 9 (US5) — Custom adapter docs
- Phase 10 — Polish

### Parallel Team Strategy (3 developers)

After Phase 4 completes:
- **Dev A**: Phase 5 (US1 Serverless) + Phase 6 (US4 CLI)
- **Dev B**: Phase 8 (US2 Express)
- **Dev C**: Phase 7 (US3 Unwrapper end-to-end) + Phase 9 (US5 Extensibility)

---

## Summary

| Phase | Stories | Tasks | Test Tasks | Impl Tasks |
|-------|---------|-------|------------|------------|
| 1 Setup | — | 6 | 0 | 6 |
| 2 Foundational A | — | 10 | 4 | 6 |
| 3 US6 (P2) | US6 | 7 | 3 | 4 |
| 4 Foundational B | — | 12 | 5 | 7 |
| 5 US1 (P1) 🎯 | US1 | 8 | 3 | 5 |
| 6 US4 (P1) 🎯 | US4 | 8 | 3 | 5 |
| 7 US3 (P2) | US3 | 5 | 2 | 3 |
| 8 US2 (P2) | US2 | 7 | 3 | 4 |
| 9 US5 (P3) | US5 | 5 | 2 | 3 |
| 10 Polish | — | 6 | 0 | 6 |
| **Total** | | **78** | **25** | **53** |

**Parallel opportunities**: 22 tasks marked `[P]`  
**MVP scope**: Phases 1–6 (T001–T055) = 47 tasks → fully working `npx autodocs` with Serverless adapter
