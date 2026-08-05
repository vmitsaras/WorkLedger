# WL-100 Workspace Foundation

**Review date:** 2026-08-05

**Task:** `WL-100`

**Outcome:** Complete. WorkLedger now has a private, reproducible pnpm root workspace and native enforcement for its initial repository contract. No application or internal package project was scaffolded by this task.

## 1. Scope delivered

- A private ESM root manifest with MIT metadata and the complete root quality-script surface.
- Exact `apps/*` and `packages/*` workspace discovery with one shared root lockfile.
- `workspace:*` as the only accepted internal dependency specifier.
- Install-time and command-time rejection of workspace cycles.
- Private/internal-only manifest checks and rejection of package-publication hooks.
- A pinned stable toolchain and a lockfile-managed development runtime.
- Native Node tests for the root-only state, a valid internal edge, a non-workspace internal range, a public/publication manifest, and a dependency cycle.

At `WL-100` completion, the task deliberately had not created `apps/`, `packages/`, TypeScript configuration, lint/format dependencies, application code, test frameworks, CI, Docker, or environment configuration. `WL-101` subsequently created only the bounded project shells; the remaining concerns stay with `WL-102` through `WL-105`.

## 2. Toolchain decision

| Item | Pinned result | Evidence and reason |
|---|---|---|
| Node.js | `24.18.0` | Current LTS on 2026-08-05; the repository requires the `24.18.x` line and locks the development runtime/checksum through pnpm |
| pnpm | `11.20.0` | Current stable pnpm 11 release on 2026-08-05; pnpm 12 remains beta and is excluded |
| Package format | ESM | Matches the repository architecture and strict-TypeScript direction |
| Publication | None | Root and all future projects must be private; publication lifecycle hooks/configuration fail the workspace check |

Primary references checked immediately before implementation:

- <https://nodejs.org/en/about/previous-releases>
- <https://pnpm.io/installation>
- <https://pnpm.io/package_json>
- <https://pnpm.io/workspaces>
- <https://pnpm.io/settings>

Exact versions are time-sensitive. `WL-103` must recheck tool/test compatibility, and production readiness must revalidate supported versions rather than widening the ranges silently.

## 3. Root files and ownership

| File | Responsibility |
|---|---|
| `package.json` | Private root identity, exact package manager/runtime, root commands, and no publication path |
| `.node-version` | Human/tool version-manager pin for Node `24.18.0` |
| `pnpm-workspace.yaml` | Exact project patterns, one-lockfile behavior, workspace-protocol saving, engine checking, and cycle rejection |
| `pnpm-lock.yaml` | Generated dependency/runtime resolution and platform-specific Node integrity evidence |
| `scripts/check-toolchain.mjs` | Rejects a command or install that is not using pnpm `11.20.0` and Node `24.18.0` |
| `scripts/check-workspace.mjs` | Validates root/project privacy, names, exact discovery, internal specs, lockfiles, cycles, and publication guardrails |
| `scripts/check-workspace.test.mjs` | Positive and negative native tests for the workspace contract |

`docs/04-architecture.md` section 11 and ADR `0011` remain canonical for which package may depend on which. At `WL-100` completion this task enforced only the pre-project manifest/repository guardrails; `WL-102` subsequently added project-reference and source/import boundary checks.

## 4. Verification evidence

Executed with the pinned package manager unless a negative case says otherwise:

| Command | Result |
|---|---|
| `pnpm with 11.20.0 install --lockfile-only` | Passed; lockfile generated/verified with pnpm `11.20.0` |
| `pnpm with 11.20.0 install --frozen-lockfile` | Passed; locked Node `24.18.0` installed and preinstall guard passed |
| `pnpm with 11.20.0 install --frozen-lockfile --offline` | Passed from the local content-addressable store |
| `pnpm with 11.20.0 exec node --version` | Returned `v24.18.0` |
| `pnpm with 11.20.0 list --recursive --depth=-1 --json` | Returned exactly the private root project; zero child projects is the accepted pre-`WL-101` state |
| `pnpm with 11.20.0 run verify` | Passed all applicable root commands and five native tests |
| `pnpm run toolchain:check` under local pnpm `11.9.0` | Failed as expected and named pnpm `11.20.0` as required |
| `git diff --check` | Passed |

At `WL-100` completion, the `format:check`, lint, typecheck, integration, E2E, and build commands validated the toolchain/workspace contract and recursed over zero child projects. See `docs/21-workspace-shells.md` for the later `WL-101` child-project build evidence; this historical result is not evidence that uncreated application layers pass their future checks.

## 5. Accessibility

Not applicable to runtime behavior: this task created no UI, route, component, document interaction, or user-facing state. Accessibility tooling and semantic component evidence remain owned by `WL-103` and `WL-106`.

## 6. Security and data

- The root and future projects are private, alternate/nested lockfiles are rejected, and publication hooks/configuration are rejected.
- The generated lockfile records platform-specific integrity values for the pinned Node development runtime.
- No secret, environment value, employee data, network service, install script from a third-party dependency, telemetry, or deployment surface was introduced.
- The repository still requires the dependency/import checks, CI evidence, environment validation, and production supply-chain review owned by later tasks.

## 7. Handoff

The handoff from this task was `WL-101`: create only the two application shells and six accepted internal package shells with private manifests, explicit exports, and allowed `workspace:*` edges. That handoff is now complete; `docs/21-workspace-shells.md` records its evidence.
