# WL-102 Strict Tooling and Source Boundaries

**Review date:** 2026-08-05

**Task:** `WL-102`

**Outcome:** Complete. WorkLedger now has shared strict TypeScript/ESM configuration, an eight-project TypeScript solution, executable formatting and lint commands, and repository-owned source-boundary checks with physical positive/negative fixtures.

## 1. Scope delivered

- Added one root TypeScript solution and one composite project configuration for every existing app/package.
- Moved shared TypeScript, ESLint, and Prettier settings into explicit `@workledger/config` export subpaths.
- Added exact development-only `@workledger/config` edges to the seven consuming projects; the original eight runtime edges are unchanged.
- Replaced the temporary command-line shell compiler with `tsc --build` project references.
- Made root `format`, `format:check`, `lint`, `typecheck`, and `build` commands perform their claimed work.
- Added a repository-owned module-boundary scanner and physical negative fixtures for the accepted ADR `0011` matrix.
- Extended the workspace contract to reject missing configuration, TypeScript path aliases, and project references that differ from the runtime graph.

No React, Vite, Fastify, database, authentication, test framework, CI workflow, environment configuration, product feature, or `apps/site` implementation was added.

## 2. TypeScript and ESM contract

`packages/config/typescript/tsconfig.base.json` owns the reusable compiler baseline:

- `strict`, `exactOptionalPropertyTypes`, and `noUncheckedIndexedAccess`;
- unused, implicit-return, switch-fallthrough, override, index-access, unreachable-code, and side-effect-import checks;
- NodeNext ESM resolution with `verbatimModuleSyntax` and forced module detection;
- composite declaration/source-map output with `noEmitOnError`;
- no ambient type packages by default.

The browser-facing web and UI projects add only the DOM libraries. Domain and contracts retain the runtime-neutral base. Project references match runtime dependencies exactly, while `@workledger/config` is resolved only through each consumer's `workspace:*` development dependency. Neither the solution nor a project may define a TypeScript `paths` alias.

The root `tsconfig.json` is a solution with `files: []` and exactly eight references. `tsc --build` therefore orders dependencies itself and checks/emits every project from one entry point.

## 3. Lint and formatting contract

`packages/config` exposes:

| Export | Responsibility |
|---|---|
| `@workledger/config/typescript/base.json` | Strict shared compiler options |
| `@workledger/config/eslint` | ESLint flat configuration for repository JavaScript/tooling |
| `@workledger/config/prettier` | Shared deterministic formatting options |

Root `eslint.config.js` and `prettier.config.js` are minimal adapters because those tools discover configuration from the repository root. ESLint rejects CommonJS `require()`, unused disable directives, and the current recommended JavaScript errors. Prettier checks supported code/config files while generated output, dependencies, the lockfile, license text, and planning Markdown remain excluded from automatic rewriting.

TypeScript source is covered by the strict compiler, Prettier, and the repository-owned import scanner. It is intentionally not passed through `typescript-eslint` in this task: current `typescript-eslint` `8.66.0` declares TypeScript support only for `>=4.8.4 <6.1.0`, which excludes the pinned TypeScript `7.0.2`. Installing that unsupported combination would violate the stable-compatibility policy. This decision must be rechecked before adding a TypeScript-aware ESLint parser later.

## 4. Source-boundary enforcement

`scripts/check-boundaries.mjs` scans JavaScript and TypeScript module syntax across each project root, excluding dependency/generated directories. It rejects:

- an internal package outside the importing project's accepted edge list;
- every application import;
- internal deep/subpath imports beyond accepted package roots;
- relative traversal into another workspace project;
- production imports of `@workledger/test-utils` or `@workledger/config`;
- undeclared path-alias forms;
- non-literal dynamic imports that cannot be checked safely;
- Node built-ins from browser or runtime-neutral production projects.

The manifest validator separately requires exact runtime/development edges and `workspace:*`, prevents cycles/publication, verifies explicit exports, and proves TypeScript references mirror the runtime graph. The emitted-entry smoke test still imports all eight build outputs.

## 5. Executable fixtures

| Fixture/check | Expected outcome |
|---|---|
| Allowed web imports | `@workledger/contracts` and `@workledger/ui` accepted |
| Forbidden edge | Web → domain rejected |
| Deep import | API → `@workledger/domain/src/...` rejected |
| Application import | API → web rejected |
| Production test utility | API production source → test-utils rejected |
| Production config | API production source → config rejected |
| Sibling traversal | Web relative traversal → domain source rejected |
| Browser/Node boundary | Web production source → `node:fs` rejected |
| Workspace cycle | Contracts ↔ domain fixture rejected |
| Reference drift | Web TypeScript reference → API rejected |

The positive workspace scan covers all current project JavaScript/TypeScript files and imports. Fixtures live outside project compilation and ESLint's normal source set so intentionally invalid imports cannot masquerade as production diagnostics; they are executed directly by native Node tests.

## 6. Dependency decision

Exact stable versions checked on 2026-08-05:

| Dependency | Version | Purpose and compatibility |
|---|---:|---|
| TypeScript | `7.0.2` | Existing strict compiler; Node `>=16.20.0` |
| ESLint | `10.8.0` | JavaScript/tooling lint CLI and flat-config runtime; supports Node `>=24` |
| `@eslint/js` | `10.0.1` | ESLint-maintained recommended JavaScript rules; supports Node `>=24` |
| Prettier | `3.9.6` | Deterministic code/config formatting; supports Node `>=14` |
| `globals` | `17.9.0` | Maintained Node global definitions for ESLint; supports Node `>=18` |
| `es-module-lexer` | `2.3.1` | Small module-specifier lexer for repository-owned JavaScript source checks; exercised under Node `24.18.0` |
| `@babel/parser` | `8.0.4` | TypeScript/TSX module parser added by `WL-106` because the lexer does not parse JSX and the pinned native TypeScript 7 package exposes no compiler parser API; used only to extract import/export specifiers |

Primary references checked before installation:

- TypeScript project references: <https://www.typescriptlang.org/docs/handbook/project-references.html>
- ESLint flat configuration: <https://eslint.org/docs/latest/use/configure/configuration-files>
- Prettier installation/configuration: <https://prettier.io/docs/install>, <https://prettier.io/docs/configuration>
- Package metadata: <https://registry.npmjs.org/eslint/10.8.0>, <https://registry.npmjs.org/prettier/3.9.6>, <https://registry.npmjs.org/typescript-eslint/8.66.0>, <https://registry.npmjs.org/es-module-lexer/2.3.1>, <https://registry.npmjs.org/%40babel%2Fparser/8.0.4>

## 7. Verification evidence

Executed with pnpm `11.20.0` and the lockfile-managed Node `24.18.0` runtime:

| Command | Result |
|---|---|
| `pnpm with 11.20.0 run workspace:check` | Passed: 8 projects, 8 runtime edges, 7 config-only development edges, exact TypeScript references/configuration |
| `pnpm with 11.20.0 run format:check` | Passed with the shared Prettier configuration |
| `pnpm with 11.20.0 run lint` | Passed ESLint and the 10-file/11-import source-boundary scan |
| `pnpm with 11.20.0 run typecheck` | Passed all 8 strict composite TypeScript projects |
| `pnpm with 11.20.0 run test` | Passed all 18 workspace and source-boundary tests |
| `pnpm with 11.20.0 run build` | Passed all 8 project-reference builds and emitted-entry imports |
| `pnpm with 11.20.0 run verify` | Passed the complete currently applicable root quality chain |
| `pnpm with 11.20.0 install --frozen-lockfile` | Passed for all 9 workspace projects |
| `pnpm with 11.20.0 install --frozen-lockfile --offline` | Passed from the local content-addressable store |
| `pnpm with 11.20.0 list --recursive --depth=0` | Confirmed exact tooling versions and all 7 config-only workspace links |
| `git diff --check` | Passed |

Integration/E2E runners and CI remain `WL-103`; the existing root stages for those commands still recurse over projects with no task-specific runner scripts.

## 8. Accessibility

No rendered UI, component, route, focus behavior, motion, or user-facing state was added. Browser-target projects explicitly receive DOM libraries while domain/contracts do not, reinforcing rather than weakening the future browser boundary. Automated accessibility tooling remains `WL-103` and component evidence remains `WL-106`.

## 9. Security and data

- Exact stable tooling versions and their transitive integrity records are locked.
- Tooling dependencies are development/configuration concerns; no new product runtime dependency was added.
- Production source cannot import test/config packages or Node built-ins from browser/runtime-neutral projects.
- No secret, environment value, employee data, persistence, network service, authentication, telemetry, or deployment surface was introduced.
- Dependency/license/secret scanning and CI supply-chain evidence remain later Phase 1/release tasks.

## 10. Handoff

The exact next task is `WL-103`: configure the test projects, accessibility helpers, browser/API/database harnesses, and baseline CI without inventing product behavior.
