# WL-101 Application and Package Shells

**Review date:** 2026-08-05

**Task:** `WL-101`

**Outcome:** Complete. WorkLedger now has exactly two private application shells and six private internal package shells. Every project emits a typed ESM entry, the accepted internal graph resolves through package public roots, and no product feature or framework layer was introduced.

## 1. Scope delivered

- Created `apps/web` and `apps/api` as non-importable private application boundaries.
- Created `packages/domain`, `packages/contracts`, `packages/database`, `packages/ui`, `packages/config`, and `packages/test-utils` as private packages with one explicit public root each.
- Added one minimal `src/index.ts` boundary entry per project. These entries identify and exercise package relationships only; they contain no domain behavior, route, component, server, database, environment, or test-framework implementation.
- Added TypeScript `7.0.2` as the root compiler dependency and locked the exact resolution.
- Added a repository-owned typed-shell build command and a post-build import check.
- Expanded the workspace validator and native tests from the pre-scaffold state to the exact accepted project set and graph.

`apps/site`, feature folders, React, Vite, Fastify, database tooling, shared TypeScript configuration, linting, formatting, test frameworks, CI, Docker, and environment configuration remain out of scope.

## 2. Executable project graph

| Project | Public/import surface | Allowed internal dependencies |
|---|---|---|
| `packages/domain` | `@workledger/domain` root | None |
| `packages/contracts` | `@workledger/contracts` root | None |
| `packages/database` | `@workledger/database` root | `@workledger/domain` |
| `packages/ui` | `@workledger/ui` root | None |
| `packages/config` | Typed root; `WL-102` later added explicit ESLint/Prettier/TypeScript config subpaths | None |
| `packages/test-utils` | `@workledger/test-utils` root; consumers remain test-only | `@workledger/contracts`, `@workledger/domain` |
| `apps/web` | Empty `exports` map; not importable | `@workledger/contracts`, `@workledger/ui` |
| `apps/api` | Empty `exports` map; not importable | `@workledger/contracts`, `@workledger/database`, `@workledger/domain` |

All eight internal dependency entries use exactly `workspace:*`. Every source edge imports the dependency package name at its public root; none traverses a sibling directory or imports another project's source, generated output, tests, or internals.

The package export contract is deliberately narrow:

```json
{
  ".": {
    "types": "./dist/index.d.ts",
    "import": "./dist/index.js"
  }
}
```

At `WL-101` completion no package exposed another subpath. `WL-102` subsequently added only the three explicit shared-tooling subpaths owned by `@workledger/config`; no wildcard or internal implementation path is exposed. The two applications still use `{}` because applications are deployment units, not shared libraries.

## 3. Build and enforcement

At `WL-101` completion, `scripts/build-workspace-project.mjs` compiled each `src/index.ts` with strict command-line ESM flags. `WL-102` subsequently replaced that temporary runner with shared composite configuration and `tsc --build` project references; see `docs/22-strict-tooling-and-boundaries.md`.

`scripts/check-workspace-build.mjs` imports all eight emitted entries. It verifies the project identity and exact dependency tuple so the acceptance evidence covers real package-name/public-export resolution rather than manifest text alone.

`scripts/check-workspace.mjs` now rejects:

- a missing or unexpected workspace project, including an early `apps/site`;
- a wrong internal name, non-private manifest, non-ESM format, license/version drift, or publication path;
- a missing or extra internal dependency edge;
- any internal specifier other than `workspace:*`;
- an importable application or a package export beyond the one typed public root;
- a nested/alternate lockfile or workspace cycle.

Seven native contract tests covered the accepted graph at `WL-101` completion. `WL-102` subsequently expanded the suite with TypeScript-reference/config checks and executable sibling/deep/app/production-test/config/browser-server import fixtures.

## 4. Dependency decision

TypeScript `7.0.2` was the current stable registry release checked on 2026-08-05 and declares Node `>=16.20.0`, which includes the pinned Node `24.18.0` runtime. It is required now because `WL-101` acceptance explicitly requires typed entries to build; no formatter, linter, framework, or boundary plugin was needed for this slice.

Primary metadata checked before installation:

- <https://registry.npmjs.org/typescript/7.0.2>

## 5. Verification evidence

Executed with the pinned pnpm `11.20.0` and lockfile-managed Node `24.18.0` runtime:

| Command | Result |
|---|---|
| `pnpm with 11.20.0 install --frozen-lockfile` | Passed for all nine workspace projects and materialized the declared workspace links |
| `pnpm with 11.20.0 install --frozen-lockfile --offline` | Passed from the local content-addressable store |
| `pnpm with 11.20.0 list --recursive --depth=-1 --json` | Returned exactly the private root, 2 application shells, and 6 package shells |
| `pnpm with 11.20.0 run workspace:check` | Passed: root plus 8 projects, 8 internal edges, one lockfile, no cycles or publication path |
| `pnpm with 11.20.0 run test` | Passed all 7 native workspace-contract tests |
| `pnpm with 11.20.0 run build` | Passed all 8 typed builds and the emitted-entry import check |
| `pnpm with 11.20.0 run verify` | Passed the complete currently applicable root command chain |
| `git diff --check` | Passed |

At `WL-101` completion the non-build quality stages only recursed over empty child scripts. `WL-102` subsequently made format, lint, typecheck, and boundary testing substantive. Integration/E2E runner evidence still must not be claimed until `WL-103` adds it.

## 6. Accessibility

No user interface, interaction, route, rendered document, or user-facing state was added. The web and UI projects are typed boundaries only, so WCAG behavior cannot yet be exercised. Accessibility test infrastructure and accessible primitive evidence remain owned by `WL-103` and `WL-106`.

## 7. Security and data

- All projects are private and there is still no npm publication path.
- Applications cannot be imported through package exports, reducing accidental cross-application coupling.
- The dependency graph prevents browser-side access to the domain, database, API, server auth, or environment boundaries at the manifest level.
- No secret, configuration value, employee data, persistence, network listener, telemetry, authentication behavior, or deployment surface was introduced.
- `WL-102` subsequently added source-level negative import enforcement; CI evidence remains required before the Phase 1 gate.

## 8. Handoff

The handoff from this task was `WL-102`: establish reusable strict TypeScript/ESM project configuration, linting, formatting, and executable negative source-import fixtures. That handoff is now complete; `docs/22-strict-tooling-and-boundaries.md` records its evidence.
