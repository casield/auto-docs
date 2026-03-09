<!--
SYNC IMPACT REPORT
==================
Version change: N/A (template) → 1.0.0 (initial ratification)
Bump rationale: MINOR — first concrete constitution established from template baseline.
                No prior versioned constitution existed; 1.0.0 marks the initial governance anchor.

Modified principles: N/A (first fill — all placeholders replaced)

Added sections:
  - I. Monorepo-First
  - II. Plugin-Extensible Architecture
  - III. Return-Tree Analysis
  - IV. Test-First (NON-NEGOTIABLE)
  - V. Versioning & Breaking Changes
  - Technology Stack
  - Development Workflow
  - Governance

Removed sections: N/A

Templates reviewed:
  - .specify/templates/plan-template.md         ✅ aligned (Constitution Check gate present)
  - .specify/templates/spec-template.md         ✅ aligned (user stories + acceptance scenarios intact)
  - .specify/templates/tasks-template.md        ⚠ pending — states "Tests are OPTIONAL"; must be
                                                   updated to reflect Principle IV (tests MANDATORY).
  - .specify/templates/agent-file-template.md   ✅ aligned (generic, no agent-specific naming issues)
  - .specify/templates/checklist-template.md    ⚠ pending — verify test-gate language aligns
                                                   with Principle IV.

Follow-up TODOs:
  - TODO(TASKS_TEMPLATE): Update tasks-template.md to mark tests as MANDATORY for all new features,
    replacing the current "OPTIONAL" language, per Principle IV.
  - TODO(CHECKLIST_TEMPLATE): Review checklist-template.md to ensure a "test suite present" gate is
    included in definition-of-done checks.
-->

# Auto-Docs Constitution

## Core Principles

### I. Monorepo-First

All packages MUST reside in and be managed through this monorepo under `packages/` or a designated
root directory. Each package MUST be:

- Independently buildable (`tsup`) and independently testable (`jest`).
- Free of circular dependencies with other packages.
- Assigned a clear, single responsibility — no "catch-all" packages.

New packages require explicit justification documenting the single responsibility they fulfill.
Internal package references MUST use the workspace protocol (`workspace:*`) to guarantee consistency
across builds.

**Rationale**: A monorepo enforces shared tooling, atomic cross-package changes, and prevents
dependency drift — critical for a documentation-generation platform where plugins and core MUST stay
in lock-step.

### II. Plugin-Extensible Architecture

The `@auto-docs/core` library MUST remain format-agnostic. Output-format–specific logic (e.g.,
OpenAPI, custom specs) MUST be implemented as standalone plugins under `packages/plugins/`.

Rules:
- Core MUST expose a stable `Plugin` interface; format plugins depend on core, never the reverse.
- A plugin MUST NOT modify core internals; it MUST only consume exported public APIs.
- New documentation formats MUST be delivered as new plugins, not as patches to core.
- Plugin public APIs MUST be versioned independently following Principle V.

**Rationale**: Keeping format logic out of core preserves a single stable analysis surface and
allows users to compose only the plugins they need without pulling in unrelated dependencies.

### III. Return-Tree Analysis

All code analysis MUST be grounded in traversing and modeling the return statement tree of a
function (i.e., tracing all possible return paths to construct a response tree).

Rules:
- Analysis modules MUST produce a call/response tree rooted at return statements.
- Side-effect analysis is permitted **only** when directly tied to a traced return path.
- Assumptions about return shapes MUST be surfaced in the analysis output, not silently dropped.

**Rationale**: The entire documentation-generation value proposition depends on accurately capturing
what a function returns. Deviating from this model produces misleading or incomplete documentation.

### IV. Test-First (NON-NEGOTIABLE)

Every new feature or bug-fix contribution MUST include a test suite. No exceptions.

Rules:
- Tests MUST be written and confirmed to **fail** before implementation begins (Red-Green-Refactor).
- Unit tests cover individual functions/classes; integration tests cover cross-package contracts.
- A PR or merge is blocked if it introduces new behavior without corresponding test coverage.
- Test files MUST live co-located with (or in a `__test__`/`__tests__` sibling of) the module they
  cover, following the existing `packages/core/src/__test__/` convention.
- The test suite MUST pass in CI with no skipped tests unless the skip is annotated with a tracking
  issue reference.

**Rationale**: This project performs static analysis and generates safety-critical API documentation.
Regressions are invisible without tests. Test-first is the project's primary quality gate.

### V. Versioning & Breaking Changes

All packages MUST follow Semantic Versioning (`MAJOR.MINOR.PATCH`).

Rules:
- **MAJOR**: Any removal or backward-incompatible change to a public API (core `Plugin` interface,
  plugin output schema, CLI command signature).
- **MINOR**: New public capability added in a backward-compatible way.
- **PATCH**: Backward-compatible bug fixes, documentation, and internal refactors.
- A MAJOR version change MUST be accompanied by a migration guide in `CHANGELOG.md`.
- Pre-release features MUST use pre-release identifiers (e.g., `1.2.0-beta.1`).

**Rationale**: Downstream consumers (Serverless plugins, OpenAPI generators) depend on stable
contracts. Unannounced breaking changes corrupt generated documentation in production environments.

## Technology Stack

The following stack is canonical for all packages in this monorepo. Deviations require explicit
constitution amendment or a documented exception in the relevant package's `README.md`.

| Concern          | Canonical Choice         |
|------------------|--------------------------|
| Language         | TypeScript (strict mode) |
| Runtime          | Node.js ≥ 18             |
| Package manager  | npm workspaces           |
| Build tool       | tsup                     |
| Task runner      | Turbo                    |
| Test framework   | Jest + ts-jest           |
| Target output    | ES2015 / CommonJS        |

All new packages MUST adopt these choices unless a justified exception is documented.

## Development Workflow

- **Feature branches**: `###-short-description` off `main`; no direct commits to `main`.
- **Spec-first**: Every non-trivial feature MUST have a spec in `.specify/` before implementation.
- **Constitution Check**: Plan documents MUST include a constitution-check gate verifying compliance
  with Principles I–V before the implementation phase begins.
- **PR requirements**:
  - All CI checks pass (build + full test suite).
  - At least one reviewer approval.
  - `CHANGELOG.md` updated for the affected package.
- **Test mandate**: Per Principle IV, no PR introducing new behavior merges without test coverage.
- **Dependency updates**: Batched; no unreviewed automatic dependency bumps in production packages.

## Governance

This constitution supersedes all other practices and conventions documented elsewhere in the
repository. Where conflicts exist, the constitution wins.

**Amendment procedure**:
1. Open a PR proposing changes to this file with rationale and version bump justification.
2. At least one maintainer approval is required.
3. If MAJOR governance changes are made, existing open specs and plans MUST be audited for
   compliance before the amendment is merged.

**Versioning policy**: Amendments follow the same SemVer rules as Principle V, applied to the
constitution itself.

**Compliance review**: All PR reviewers MUST verify that submitted work does not violate any
principle. The Constitution Check section of plan documents is the formal compliance gate.

**Version**: 1.0.0 | **Ratified**: 2026-03-08 | **Last Amended**: 2026-03-08
