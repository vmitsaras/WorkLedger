# WorkLedger

WorkLedger is a planned self-hosted application for working time, flexible-time balances, absence
requests, approvals, corrections, and auditable monthly records in small and medium-sized office,
remote, and hybrid organizations.

> **Project readiness: Stage 3 of 5 — Core engine and platform in progress**<br>
> **Current phase progress: Phase 2 — 7 of 12 tasks complete**

Phase 1 passed its exit gate and the repository is now in **Phase 2: framework-independent domain
engine**. The workspace, project boundaries, strict tooling, test and CI baseline, local PostgreSQL
environment, runtime configuration, React Aria UI foundation, and contributor documentation are
implemented. The domain now has primitives, effective-dated schedule/policy resolution,
attendance-state transition validation, punch-event reconstruction, manual/corrected interval
validation, daily minute calculation, and local-date interval splitting; the next task is paid and
unpaid absence-credit integration (`WL-207`).

WorkLedger does not yet provide a complete domain engine, application database schema, authentication,
product workflows, production deployment, or supported release. The runnable web page is an
isolated development preview of foundation components, not the WorkLedger application.

## Current status

- [PROJECT_STATUS.md](PROJECT_STATUS.md) records the active task, verified decisions, and blockers.
- [TODO.md](TODO.md) and [docs/08-task-board.md](docs/08-task-board.md) define dependency-ordered
  work.
- [docs/07-roadmap.md](docs/07-roadmap.md) defines the readiness stages and phase gates. “Stage 3
  of 5” describes the kind of work underway; it is not a release-readiness claim.
- [AGENTS.md](AGENTS.md), accepted ADRs, and the planning documents are the implementation
  contract.

The root quality gate exercises the repository foundation that exists today. Passing it does not
demonstrate unimplemented product features, production security, deployment readiness, or WCAG
conformance for future workflows.

## Prerequisites

- Git.
- Node.js `24.18.x`; `.node-version`, workspace settings, and the managed development runtime pin
  `24.18.0`.
- pnpm with support for `pnpm with`; repository commands execute pnpm `11.20.0` exactly.
- Chromium installed through Playwright for browser tests.
- Docker with Docker Compose only for the local PostgreSQL lifecycle checks.

The install guard rejects a project command executed with a different Node or pnpm version. The
bootstrap commands below select the accepted pair even when the host shell starts with another
version. Root and workspace manifests are private/internal and there is no npm package-publication
workflow.

## Fresh-clone setup

```sh
git clone https://github.com/vmitsaras/WorkLedger.git
cd WorkLedger
pnpm with 11.20.0 install --frozen-lockfile
pnpm with 11.20.0 exec node --version
pnpm with 11.20.0 --version
pnpm with 11.20.0 exec playwright install chromium
pnpm with 11.20.0 run verify
```

The expected version output is Node `v24.18.x` and pnpm `11.20.0`. `pnpm run verify` uses safe
development defaults when no `.env` exists. It runs the PostgreSQL integration test only when
`WORKLEDGER_TEST_DATABASE_URL` is set; use the next section to exercise that lifecycle.
The tracked `.env.example` contains local defaults only and is not a deployment template.

To view the development-only component preview:

```sh
pnpm with 11.20.0 --filter @workledger/web dev
```

Vite serves the preview at `http://127.0.0.1:5173` by default. There is no runnable product API or
end-to-end WorkLedger workflow yet.

## Local PostgreSQL

The local Compose service uses explicit non-production credentials, binds to
`127.0.0.1:54329` by default, and contains no WorkLedger product schema or seed data.

```sh
pnpm with 11.20.0 run db:up
pnpm with 11.20.0 run db:verify
WORKLEDGER_TEST_DATABASE_URL=postgres://workledger_test:workledger_test_password@127.0.0.1:54329/workledger_test pnpm with 11.20.0 run verify
pnpm with 11.20.0 run db:down
```

`db:down` preserves the local volume. `pnpm run db:reset` removes that development volume and its
contents; use it only when a destructive local reset is intended. See
[docs/24-postgres-docker-dev.md](docs/24-postgres-docker-dev.md) for port overrides and the exact
database-test boundary.

## Root scripts

The table uses compact `pnpm run ...` forms. Execute them through `pnpm with 11.20.0 run ...`
unless pnpm `11.20.0` is already the active package manager.

| Command | Purpose |
|---|---|
| `preinstall` | Run automatically during install to reject a mismatched pnpm or Node runtime. |
| `pnpm run verify` | Run the complete currently applicable local quality gate. |
| `pnpm run toolchain:check` | Check that the command is using pnpm `11.20.0` and Node `24.18.x`. |
| `pnpm run workspace:check` | Check toolchain, project set, privacy, manifests, internal edges, lockfiles, cycles, exports, TypeScript references, and phase version. |
| `pnpm run phase:check` | Check the roadmap gate checkboxes against every workspace manifest version. |
| `pnpm run config:check` | Build the API shell and validate runtime configuration while printing only a redacted summary. |
| `pnpm run format:check` | Check workspace rules and formatting. |
| `pnpm run format` | Rewrite supported files with the repository Prettier configuration. |
| `pnpm run lint` | Run workspace checks, ESLint, and source-boundary enforcement. |
| `pnpm run typecheck` | Strictly type-check all eight composite projects. |
| `pnpm run test:build` | Build typed package outputs required by direct test/config commands. |
| `pnpm run test` | Run native repository-contract tests plus Vitest unit/component projects. |
| `pnpm run test:integration` | Run API/database integration projects; the real PostgreSQL case is opt-in through its URL. |
| `pnpm run test:e2e` | Run Chromium Playwright tests against the real Vite preview, including axe checks. |
| `pnpm run build` | Build all typed projects and the web preview, then verify emitted public entries. |
| `pnpm run db:up` / `db:down` | Start or stop the local PostgreSQL service; stopping preserves its volume. |
| `pnpm run db:check` / `db:test` / `db:verify` | Check local connectivity, run the isolated lifecycle test, or run both. |
| `pnpm run db:reset` | Stop PostgreSQL and delete the local development volume and its data. |

CI performs a frozen install, installs Chromium, starts the same PostgreSQL service, verifies the
database lifecycle, and runs `pnpm run verify`. See [.github/workflows/ci.yml](.github/workflows/ci.yml).

## Workspace boundaries

Only the following WorkLedger runtime dependencies are allowed:

| Project | May import |
|---|---|
| `packages/domain` | No WorkLedger package |
| `packages/contracts` | No WorkLedger package |
| `packages/database` | `packages/domain` |
| `packages/ui` | No WorkLedger package |
| `packages/config` | No WorkLedger package; tooling only |
| `packages/test-utils` | `packages/domain`, `packages/contracts`; tests only |
| `apps/web` | `packages/ui`, `packages/contracts` |
| `apps/api` | `packages/domain`, `packages/contracts`, `packages/database` |

Cross-workspace imports use declared `@workledger/*` package roots and `workspace:*`. Deep imports,
sibling-source traversal, application imports, cycles, production imports of test/config packages,
and browser imports of authoritative server/domain/database code fail executable checks.
[docs/04-architecture.md](docs/04-architecture.md#11-dependency-rule) and
[ADR 0011](docs/adr/0011-pnpm-monorepo-and-internal-package-boundaries.md) are canonical.

## Contributing and security

Read [CONTRIBUTING.md](CONTRIBUTING.md) before proposing a change. Work is accepted one bounded
roadmap task or vertical slice at a time, with proportional tests and project-memory updates.

Do not open a public issue, discussion, or pull request for a suspected vulnerability. Follow the
private process in [SECURITY.md](SECURITY.md). This foundation-stage project has no supported
versions and makes no response-time or production-support promise.

## Documentation map

| File | Purpose |
|---|---|
| [AGENTS.md](AGENTS.md) | Repository-wide engineering, accessibility, security, and workflow contract |
| [PROJECT_STATUS.md](PROJECT_STATUS.md) | Current phase, active task, verified work, and blockers |
| [TODO.md](TODO.md) | Compact ordered checklist and canonical phase-gate checkboxes |
| [docs/03-domain-rules.md](docs/03-domain-rules.md) | Accepted domain behavior and invariants |
| [docs/04-architecture.md](docs/04-architecture.md) | System ownership and dependency rules |
| [docs/05-ux-accessibility.md](docs/05-ux-accessibility.md) | UX and WCAG 2.2 AA implementation contract |
| [docs/06-security-operations.md](docs/06-security-operations.md) | Security, privacy, deployment, and release controls |
| [docs/07-roadmap.md](docs/07-roadmap.md) | Phases, readiness stages, and exit gates |
| [docs/08-task-board.md](docs/08-task-board.md) | Detailed backlog, dependencies, evidence, and status |
| [docs/09-definition-of-done.md](docs/09-definition-of-done.md) | Completion criteria for tasks and milestones |
| [docs/10-open-decisions.md](docs/10-open-decisions.md) | Resolved and still-owned decisions |
| [docs/12-repository-structure.md](docs/12-repository-structure.md) | Intended repository layout and package-boundary summary |
| [docs/20-workspace-foundation.md](docs/20-workspace-foundation.md) through [docs/28-phase-1-gate-review.md](docs/28-phase-1-gate-review.md) | Phase 1 task and gate evidence |
| [docs/29-domain-primitives.md](docs/29-domain-primitives.md) | Domain primitive construction, errors, dependency, tests, and serialization evidence |
| [docs/30-effective-dated-time-configuration.md](docs/30-effective-dated-time-configuration.md) | Effective-dated schedule and policy validation and resolution evidence |
| [docs/31-attendance-transition-validation.md](docs/31-attendance-transition-validation.md) | Attendance state/action transition validation and stable-outcome evidence |
| [docs/32-attendance-reconstruction.md](docs/32-attendance-reconstruction.md) | Punch-event reconstruction, incomplete sessions, and stable-outcome evidence |
| [docs/33-manual-attendance-interval-validation.md](docs/33-manual-attendance-interval-validation.md) | Manual local-time resolution and interval-overlap validation evidence |
| [docs/34-daily-attendance-calculation.md](docs/34-daily-attendance-calculation.md) | Daily expected/worked/credited/balance arithmetic evidence |
| [docs/35-local-date-interval-splitting.md](docs/35-local-date-interval-splitting.md) | Local-midnight/DST interval attribution evidence |

## License

WorkLedger-owned source and documentation are licensed under the [MIT License](LICENSE). Root and
workspace `private` flags prevent accidental package publication; they do not change the source
license. Third-party dependencies and adapted source or assets retain their own license and notice
requirements.
