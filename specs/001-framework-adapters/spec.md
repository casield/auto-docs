# Feature Specification: Framework Adapters

**Feature Branch**: `001-framework-adapters`  
**Created**: 2026-03-08  
**Status**: Draft  
**Input**: User description: "CI-driven framework adapters — users create a config file, select an adapter (Serverless Framework or Express), and run AutoDocs as a CI script. Adapters automatically discover handler entry points, build call trees, and feed results to plugins. A handler wrapper resolver handles cases where a Lambda is wrapped in Middy or another middleware wrapper."

---

## Overview

AutoDocs runs as a **CI step**, not as runtime application code. A developer creates an `autodocs.config.ts` (or `.js`) file, selects one or more adapters, configures which plugins to use, and invokes the AutoDocs CLI/runner. The runner reads the config, uses the selected adapter to discover entry points from the project's framework descriptors (e.g. `serverless.yml` or an Express router file), builds call trees for each entry point, and passes the analysis results to every plugin — with no manual `.docs({})` calls required.

Because handlers are often wrapped (e.g. Middy, SST, custom wrappers), the system provides a **Handler Unwrapper** extension point: a set of declarable unwrap rules that peel back known wrapper patterns in source code to find the real underlying function before call-tree construction begins.

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 - CI Analysis via Serverless Framework Adapter (Priority: P1)

A developer adds an `autodocs.config.ts` to their Serverless Framework project, points it at the `serverless.yml`, selects the Serverless adapter, and runs the AutoDocs CI script. The adapter reads the YAML, discovers all declared Lambda `handler` paths, resolves each to a function name and source file, and feeds the analysis into the configured plugins — no manual `.docs({})` calls required.

**Why this priority**: The Serverless Framework is the primary deployment target described in the repo's README. It provides a machine-readable manifest (`serverless.yml`) that removes all ambiguity about which functions are entry points — making it the ideal first adapter.

**Independent Test**: Can be fully tested by pointing the adapter at a fixture `serverless.yml` with two handler declarations and confirming two call trees are produced, one per handler, with zero `.docs()` calls.

**Acceptance Scenarios**:

1. **Given** a `serverless.yml` declaring two Lambda functions with `handler: src/users.getUser` and `handler: src/orders.createOrder`, **When** the CI runner executes with the Serverless adapter, **Then** the adapter resolves two entry points — `getUser` in `src/users.ts` and `createOrder` in `src/orders.ts` — and builds a call tree for each.
2. **Given** the adapter has resolved all entry points, **When** the runner invokes the OpenAPI plugin, **Then** the plugin receives all call trees and produces an OpenAPI spec covering every Lambda function declared in the YAML.
3. **Given** a `serverless.yml` that references a handler file that does not exist on disk, **When** the adapter attempts to resolve it, **Then** analysis fails fast with a descriptive error naming the missing file.
4. **Given** a `serverless.yml` with functions spread across multiple `handler` path patterns, **When** the adapter runs, **Then** it correctly resolves all of them regardless of directory depth or naming convention.

---

### User Story 2 - CI Analysis via Express Adapter (Priority: P2)

A developer adds an `autodocs.config.ts` to their Express project, points it at the router entry file, selects the Express adapter, and runs the AutoDocs CI script. The adapter statically analyses the router file, discovers all registered routes and their handler references, and feeds them to plugins.

**Why this priority**: Express is the most widely used Node.js HTTP framework outside the serverless space, expanding the audience beyond Lambda-only users.

**Independent Test**: Can be fully tested by pointing the adapter at a fixture Express router file declaring three routes, confirming three entry points are resolved and three call trees are produced.

**Acceptance Scenarios**:

1. **Given** an Express router file registering `GET /users`, `POST /users`, and `DELETE /users/:id` with named handler functions, **When** the CI runner executes with the Express adapter, **Then** three entry points are resolved — one per route — and a call tree is built for each.
2. **Given** a route handler that delegates work to imported utility functions, **When** the adapter runs, **Then** the call tree correctly traverses into those utilities across file boundaries.
3. **Given** multiple routes share a common helper, **When** the adapter runs, **Then** each call tree independently reflects the full path through that helper without cross-contamination between routes.
4. **Given** the router file imports handlers from a separate file, **When** the adapter resolves entry points, **Then** it follows the import to the correct source file and uses that as the `filePath` for call-tree construction.

---

### User Story 3 - Handler Wrapper Resolution (Priority: P2)

A developer's Lambda handler is wrapped in Middy (or another wrapper such as SST's `ApiHandler`) at the source level. The developer declares one or more **unwrap rules** in `autodocs.config.ts` describing how to peel back that wrapper and find the real inner function. AutoDocs applies the rule before building the call tree, ensuring traversal starts at business logic rather than middleware boilerplate.

**Why this priority**: Without this, the Serverless adapter correctly finds `handler: src/users.getUser` but if `getUser = middy(realHandler)`, the call tree starts at the Middy wrapper internals rather than `realHandler`. This defeats the purpose of analysis.

**Independent Test**: Can be fully tested by creating a handler file where `export const handler = middy(myBusinessLogic)`, declaring the built-in Middy unwrap rule, and asserting the call tree is rooted at `myBusinessLogic` rather than the Middy wrapper.

**Acceptance Scenarios**:

1. **Given** `export const handler = middy(myBusinessLogic).use(...)` in a source file and the built-in Middy unwrap rule is active, **When** the adapter resolves this entry point, **Then** the call tree is built rooted at `myBusinessLogic`, not at `handler` or Middy internals.
2. **Given** a custom wrapper `export const handler = withAuth(withLogging(myBusinessLogic))` and user-defined unwrap rules for `withAuth` and `withLogging`, **When** the resolver runs, **Then** it unwraps both layers iteratively and starts the tree at `myBusinessLogic`.
3. **Given** an entry point with no matching unwrap rule, **When** analysis runs, **Then** the system falls back to using the original exported function as the entry point without error.
4. **Given** multiple nested wrappers each declared as a separate unwrap rule, **When** the resolver runs, **Then** it applies rules iteratively until no further unwrapping is possible, then proceeds with the innermost function.
5. **Given** an unwrap rule that does not match any export in the source file, **When** the resolver runs, **Then** it emits a warning and continues with the original entry point.

---

### User Story 4 - Config-Driven CI Execution (Priority: P1)

A developer creates a single `autodocs.config.ts` at the project root, specifying the adapter, plugins, unwrap rules, and output options. Running `npx autodocs` in CI picks up this file and executes the full pipeline with no further arguments.

**Why this priority**: The CI execution model is the foundational UX. Without a clean config-driven entry point, all adapter and wrapper work is inaccessible to users.

**Independent Test**: Can be fully tested by creating a minimal config file, running the CLI, and asserting the output artefacts are produced (e.g. an OpenAPI spec JSON file written to the configured path).

**Acceptance Scenarios**:

1. **Given** an `autodocs.config.ts` declaring the Serverless adapter and OpenAPI plugin, **When** `npx autodocs` is run from the project root, **Then** the full pipeline runs and writes the OpenAPI spec to the configured output path.
2. **Given** a config file specifying multiple adapters (Serverless and Express), **When** the runner executes, **Then** both adapters run, their entry points are merged, and all results are delivered to plugins.
3. **Given** a config file with a syntax error, **When** the runner starts, **Then** it exits with a non-zero code and prints a human-readable error pointing to the offending config.
4. **Given** no `autodocs.config.ts` in the working directory, **When** the runner starts, **Then** it exits with a non-zero code and guides the user to create a config file.

---

### User Story 5 - Extensible Adapter Interface (Priority: P3)

A developer using a framework not covered by built-in adapters implements a custom adapter by extending the `FrameworkAdapter` base class, exports it from their config file, and it works with no changes to the core library.

**Why this priority**: Extensibility prevents built-in adapters from being one-off hacks and enables community support for other frameworks (Fastify, NestJS, SST, etc.).

**Independent Test**: Can be fully tested by writing a minimal custom adapter returning a hard-coded entry point list and confirming the runner builds call trees and delivers results to plugins.

**Acceptance Scenarios**:

1. **Given** a custom class extending `FrameworkAdapter` and implementing `resolveEntryPoints`, **When** it is declared in the config, **Then** the runner calls `resolveEntryPoints`, builds call trees, and provides results to plugins.
2. **Given** a custom adapter and a built-in adapter declared together, **When** the runner executes, **Then** both produce entry points that are independently analysed and merged before delivery to plugins.

---

### User Story 6 - Plugin Acts Autonomously on Call Tree Nodes (Priority: P2)

The OpenAPI plugin (and any other plugin) receives the raw `NodeReturn[]` call tree produced for each entry point via a new `onAnalysis` lifecycle hook. The plugin is fully responsible for interpreting the nodes — extracting JSDoc comments, inferring HTTP metadata, and producing its output artefact. No wrapper object, no runner-side interpretation. The plugin acts alone.

**Why this priority**: Without this, adapters produce data but plugins cannot consume it automatically; the developer still needs to call `.docs()`. Keeping the interface as bare nodes also ensures plugins remain independently testable with no coupling to adapter internals.

**Independent Test**: Can be fully tested by passing a hand-crafted `NodeReturn[]` directly to the plugin's `onAnalysis` method and asserting the output artefact is correct — no adapter or runner required.

**Acceptance Scenarios**:

1. **Given** a `NodeReturn[]` whose root node's `description` contains a JSDoc comment with `@route GET /users`, **When** the OpenAPI plugin's `onAnalysis` is called with those nodes, **Then** the plugin independently produces a valid OpenAPI path item for `GET /users`.
2. **Given** a `NodeReturn[]` with no comments on any node, **When** the OpenAPI plugin's `onAnalysis` is called, **Then** it produces a minimal but valid path item with sensible defaults and no crash.
3. **Given** a developer who also calls `.docs({})` for a function, **When** the plugin runs, **Then** manually supplied data takes precedence over the auto-derived data (backward compatibility preserved).
4. **Given** a plugin that does not implement `onAnalysis`, **When** the runner delivers nodes, **Then** the plugin is silently skipped for that hook and continues to receive data through existing hooks without error.

---

### Edge Cases

- What happens when `serverless.yml` uses `${file(...)}` syntax to split config across multiple files?
- How does the Express adapter handle routes defined inside class methods or with computed paths?
- What happens when the source file for a resolved entry point cannot be read (permissions, doesn't exist)?
- How are circular imports handled during call-tree construction?
- What happens when an unwrap rule matches but the inner function is imported rather than defined locally?
- What happens when a developer declares adapters but no plugins — should analysis still run and warn?
- How does the runner behave when `autodocs.config.ts` exports an async factory function?

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST provide an abstract `FrameworkAdapter` base class that third parties can extend to support any framework.
- **FR-002**: The `FrameworkAdapter` contract MUST expose a `resolveEntryPoints` method that returns an array of `EntryPoint` objects (`{ functionName, filePath, metadata? }`) from a framework-specific configuration source (file, AST, etc.).
- **FR-003**: The system MUST provide a `ServerlessAdapter` that reads a `serverless.yml` file, parses all `functions[*].handler` values, and resolves each to an `EntryPoint`.
- **FR-004**: The system MUST provide an `ExpressAdapter` that statically analyses a specified router/application entry file and resolves each registered route callback to an `EntryPoint`.
- **FR-005**: The system MUST provide a `HandlerUnwrapper` extension point: a user-declarable list of `UnwrapRule` objects, each identifying a wrapper pattern by callee name and specifying which argument index holds the inner function.
- **FR-006**: Before building a call tree for an entry point, the runner MUST apply all matching unwrap rules iteratively until the innermost function is reached, then use that function as the call-tree root.
- **FR-007**: When no unwrap rule matches an entry point, the runner MUST proceed with the original entry point without error.
- **FR-008**: AutoDocs MUST ship with a built-in Middy unwrap rule (matching `middy(fn)` and extracting argument 0) that users can opt into via config.
- **FR-009**: The system MUST support a config file (`autodocs.config.ts` / `.js`) at the project root through which users declare adapters, plugins, and unwrap rules. There is no root-level `output` field; each plugin is solely responsible for declaring and managing its own output options through its constructor arguments.
- **FR-010**: The system MUST provide a CLI entry point (`npx autodocs`) that loads the config and executes the full analysis pipeline.
- **FR-011**: The CLI MUST exit with a non-zero code and print a descriptive message on any fatal error (missing config, unresolvable entry point, plugin failure).
- **FR-012**: The runner MUST build a `LinkedCallTreeBuilder` for each resolved (and unwrapped) entry point; before delivering the batch, it MUST merge any `EntryPoint.metadata` (e.g. HTTP method, path) into the root `NodeReturn`'s `description` field as a serialised string. The resulting `NodeReturn[]` — root nodes enriched with metadata — is then passed once to every registered plugin via `onAnalysis`.
- **FR-013**: The `AutoDocsPlugin` base class MUST gain an optional `onAnalysis(trees: NodeReturn[])` lifecycle hook; plugins that do not implement it MUST continue to function without change and MUST NOT receive the trees through any other existing hook.
- **FR-014**: The OpenAPI plugin MUST implement `onAnalysis(trees: NodeReturn[])` and act entirely autonomously on the received nodes — extracting path, HTTP method, summary, and parameter metadata solely from node `description` / comment fields, with no assistance from the runner or adapter.
- **FR-015**: When a developer also calls `.docs()` for a function, manually supplied data MUST take precedence over auto-derived data within that plugin.
- **FR-016**: All adapter and unwrap-rule implementations MUST live in separate packages from `packages/core`; the core library MUST NOT import any framework-specific package.
- **FR-017**: When multiple adapters are declared in the config, their `EntryPoint` arrays MUST be merged and deduplicated (same `filePath` + `functionName`) before call trees are built.

### Key Entities

- **FrameworkAdapter**: Abstract base class defining the `resolveEntryPoints(config)` contract; framework-agnostic.
- **EntryPoint**: `{ functionName: string, filePath: string, metadata?: Record<string, unknown> }` — the root of one call tree; `metadata` carries framework-specific info (e.g. HTTP method and path from `serverless.yml` events). Before plugin delivery the runner serialises `metadata` into the root `NodeReturn`'s `description` field so plugins receive a single, self-contained node tree with no separate channel.
- **HandlerUnwrapper**: Holds user-declared `UnwrapRule` objects; given a source file and function name, it applies matching rules iteratively to find the real inner function.
- **UnwrapRule**: A descriptor with a `callee` name (wrapper function to match) and `argIndex` (which argument is the inner function). Can be user-defined or a built-in preset.
- **ServerlessAdapter**: Concrete `FrameworkAdapter` that reads `serverless.yml` and emits one `EntryPoint` per Lambda function.
- **ExpressAdapter**: Concrete `FrameworkAdapter` that statically analyses an Express router/application source file and emits one `EntryPoint` per registered route handler.
- **AutoDocsConfig**: The shape of the user-supplied config file — fields for `adapters`, `plugins`, and `unwrapRules` only. No `output` field; output is the concern of each individual plugin, configured via that plugin's constructor (e.g. `new OpenApiPlugin({ outputPath: './openapi.json' })`).
- **AutoDocsPlugin (updated)**: Gains optional `onAnalysis(trees: NodeReturn[]): void` hook. The plugin receives the raw call tree nodes and is solely responsible for interpreting them to produce its output. No wrapper object is passed; no runner-side interpretation occurs.

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A developer can onboard a Serverless Framework project to fully automated CI documentation in a config file of 15 lines or fewer, with no `.docs()` calls in application code. Output destination is configured in the plugin constructor, not in the root config.
- **SC-002**: A developer can onboard an Express project to fully automated CI documentation in a config file of 15 lines or fewer, with no `.docs()` calls in application code. Output destination is configured in the plugin constructor, not in the root config.
- **SC-003**: 100% of existing plugin tests pass after `AutoDocsPlugin` gains the `onAnalysis` hook — zero regressions.
- **SC-004**: A custom third-party adapter integrates with the runner by overriding one method, with no changes to `packages/core`.
- **SC-005**: The OpenAPI plugin, driven entirely by the Serverless adapter's analysis, produces a spec covering every Lambda function declared in `serverless.yml` — zero functions omitted.
- **SC-006**: Declaring the Middy unwrap rule causes call trees to be rooted at the inner handler function — verifiable by comparing tree root values before and after enabling the rule.
- **SC-007**: The full pipeline (config load → adapter → unwrap → call-tree build → plugin output) completes in under 10 seconds for a project with 20 Lambda functions across 20 source files.

---

## Assumptions

- AutoDocs runs at CI time against local source files on disk; it does not inspect running processes or bundled artefacts.
- The `serverless.yml` handler notation follows the Serverless Framework convention: `path/to/file.exportName` (dot-separated file path and export name).
- The Serverless adapter targets Serverless Framework v3/v4 YAML syntax; v1/v2 is out of scope.
- The Express adapter uses static analysis only — it does not `require()` or execute the router file.
- AutoDocs ships with a built-in Middy unwrap rule as an opt-in convenience; users may define additional rules for other wrappers (SST, custom HOFs, etc.).
- The `onAnalysis` hook is purely additive; any plugin that does not override it continues to work without modification.
- TypeScript source files are the primary target; JavaScript follows the same Babel-based path as the existing `CodeAnalyzer`.

---

## Clarifications

### Session 2026-03-08

- Q: Should there be a Middy adapter (runtime detection) or should Middy support manifest as unwrap rules during static analysis? → A: No Middy adapter; instead a `HandlerUnwrapper` extension point with a built-in Middy unwrap rule handles wrappers statically.
- Q: What is the primary execution model — runtime SDK usage or CI script? → A: CI script. Users create a config file and run `npx autodocs` in CI.
- Q: Which serverless adapter to build first — Serverless Framework (YAML-based) or AWS SAM? → A: Serverless Framework adapter (reads `serverless.yml`), aligned with the existing codebase goal.
- Q: Should there be a dedicated Middy adapter or a generic wrapper mechanism? → A: A generic `HandlerUnwrapper` with declarable `UnwrapRule` objects; the built-in Middy rule is one preset of that mechanism.
- Q: What data should plugins receive via `onAnalysis` — a wrapper object with entry point metadata or raw call tree nodes? → A: Raw `NodeReturn[]` only. Plugins receive the call tree nodes and act entirely on their own to produce output. No `AdapterAnalysisResult` wrapper is passed.
- Q: Should `onAnalysis` be called once per tree or once with the full batch after all trees are ready? → A: Once with the full batch (`NodeReturn[]`). The plugin sees all trees at once and is solely responsible for producing a single coherent output artefact.
- Q: How does framework-level metadata (HTTP method, path) from `EntryPoint.metadata` reach the plugin given `onAnalysis` receives only `NodeReturn[]`? → A: The runner embeds metadata into the root `NodeReturn`'s `description` field before delivery. No new type or parallel array. Plugins parse what they need from the description.
- Q: Where does output configuration (e.g. file path for the OpenAPI spec) live — in the root `AutoDocsConfig`, per-plugin config, or inside the plugin itself? → A: Fully plugin-controlled. No `output` field in `AutoDocsConfig`; each plugin accepts its own output options via constructor arguments (e.g. `new OpenApiPlugin({ outputPath: './openapi.json' })`) and is solely responsible for writing its artefact.
