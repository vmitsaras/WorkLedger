# WorkLedger

WorkLedger is a planned self-hosted application for working time, flexible-time balances, absence
requests, approvals, corrections, and auditable monthly records in small and medium-sized office,
remote, and hybrid organizations.

> **Project readiness: Stage 3 of 5 — Core engine and platform in progress**<br>
> **Current phase progress: Phase 9 — 0 of 8 tasks complete**

Phases 0–8 have passed their exit gates. The repository now includes the attendance, correction,
absence, entitlement, manager-approval/team, and notification slices plus monthly employee review
and submission. Monthly review derives ended-month readiness, complete-date totals, warnings,
blockers, ledger reconciliation, and a source-fingerprinted schema version; self-only submission
binds warning acknowledgement to that exact source and freezes ordinary mutations. Current
managers or organization HR can request changes, create numbered immutable approval snapshots, and
separately lock an exact approved record. Locked-date corrections now append a source-linked delta
without changing that approved record, and the monthly view separates the original from its ordered
adjustments. Scoped operational reports now include reauthorized, formula-safe bounded CSV export,
a minimized printable monthly record, and explicit safe summary copy. The Phase 8 close/adjust/
export gate has passed; Phase 9 begins with separated employee-lifecycle and technical-account
administration (`WL-900`).

WorkLedger does not yet provide a coordinated local web/API process, production deployment, or
supported release. The web development server renders the application routes and safe
service-unavailable boundaries; authenticated attendance flows are exercised against mocked browser
transport and a real PostgreSQL-backed API integration surface in the automated tests.

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

To view the development-only web application surface:

```sh
pnpm with 11.20.0 --filter @workledger/web dev
```

Vite serves the web application at `http://127.0.0.1:5173` by default. A separately composed
same-origin API listener is not shipped yet, so local browser routes that need the API show their
service-unavailable boundary. The Today read model and all four protected attendance commands are
implemented and covered through mocked browser transport plus PostgreSQL-backed API integration.

## Local PostgreSQL

The local Compose service uses explicit non-production credentials and binds to
`127.0.0.1:54329` by default. Product migrations and deterministic Northstar data are created only
when the explicit development-seed command is run.

```sh
pnpm with 11.20.0 run db:up
pnpm with 11.20.0 run db:seed:development
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
| `pnpm run db:seed:development` | Explicitly migrate and insert/revalidate local-only deterministic Northstar data. |
| `pnpm run db:reset` | Stop PostgreSQL and delete the local development volume and its data. |
| `pnpm run openapi:generate` | Build the API and regenerate the tracked OpenAPI 3.1 artifact from selected route schemas. |
| `pnpm run openapi:check` | Reject drift between the tracked artifact and a fresh in-process OpenAPI document. |

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
| [docs/36-daily-absence-effects.md](docs/36-daily-absence-effects.md) | Paid/unpaid absence-credit calculation evidence |
| [docs/37-time-account-ledger-totals.md](docs/37-time-account-ledger-totals.md) | Posted time-account ledger-total evidence |
| [docs/38-calculation-signals.md](docs/38-calculation-signals.md) | Structured warning and submission-blocker evidence |
| [docs/39-domain-example-review.md](docs/39-domain-example-review.md) | Phase 2 fixture mapping and invariant review |
| [docs/40-phase-2-gate-review.md](docs/40-phase-2-gate-review.md) | Phase 2 exit-gate evidence |
| [docs/41-initial-postgresql-schema.md](docs/41-initial-postgresql-schema.md) | Initial Drizzle schema, migrations, constraints, and recovery evidence |
| [docs/42-repositories-and-transactions.md](docs/42-repositories-and-transactions.md) | Repository API, transaction, locking, retry, and public-boundary evidence |
| [docs/43-better-auth-credential-session-foundation.md](docs/43-better-auth-credential-session-foundation.md) | Credential, reset, session, cookie, CSRF, throttling, and revocation evidence |
| [docs/44-application-authorization-foundation.md](docs/44-application-authorization-foundation.md) | Account links, roles, current-manager scope, policy, and invalidation evidence |
| [docs/45-shared-api-contract-foundation.md](docs/45-shared-api-contract-foundation.md) | Zod envelopes, validation statuses, request IDs, safe errors, and OpenAPI generation evidence |
| [docs/46-audit-persistence-foundation.md](docs/46-audit-persistence-foundation.md) | Domain/security audit separation, minimization, immutability, atomicity, and query authorization evidence |
| [docs/47-attendance-idempotency-persistence.md](docs/47-attendance-idempotency-persistence.md) | Attendance mutation idempotency claim, conflict, replay, persistence, and concurrency evidence |
| [docs/48-development-seed.md](docs/48-development-seed.md) | Deterministic local-only Northstar seed scenarios, guardrails, and verification evidence |
| [docs/49-openapi-exposure.md](docs/49-openapi-exposure.md) | Hardened OpenAPI JSON exposure, reproducible artifact, and typed-client evaluation evidence |
| [docs/50-phase-3-gate-review.md](docs/50-phase-3-gate-review.md) | Phase 3 migration, authentication, authorization, audit, idempotency, seed, security, and quality-gate evidence |
| [docs/51-authenticated-application-shell.md](docs/51-authenticated-application-shell.md) | Authenticated routes, role-aware shell, profile/session, permission, focus, and recovery evidence |
| [docs/52-today-attendance-read-model.md](docs/52-today-attendance-read-model.md) | Authorized Today state, timeline, provisional calculation, warning, responsive, and API evidence |
| [docs/53-clock-in-mutation.md](docs/53-clock-in-mutation.md) | Authorized idempotent clock-in transaction, replay, audit, UI feedback, and concurrency evidence |
| [docs/54-attendance-command-sequence.md](docs/54-attendance-command-sequence.md) | Full protected attendance command sequence, active-break confirmation, ordered events, and accessible feedback evidence |
| [docs/55-today-timeline-calculation.md](docs/55-today-timeline-calculation.md) | Explainable daily arithmetic, semantic ordered event history, timezone context, and 320 px responsive evidence |
| [docs/56-attendance-resilience-recovery.md](docs/56-attendance-resilience-recovery.md) | Same-key retry, offline non-queuing, tab/device convergence, dependency recovery, and focus evidence |
| [docs/57-employee-attendance-accessibility-review.md](docs/57-employee-attendance-accessibility-review.md) | Phase-wide keyboard, announcement, reflow, touch, forced-colors, reduced-motion, and viewport evidence |
| [docs/58-phase-4-gate-review.md](docs/58-phase-4-gate-review.md) | Phase 4 vertical-slice exit criteria, cross-cutting review, verification, versioning, and Phase 5 handoff |
| [docs/59-my-time-and-flexible-balance.md](docs/59-my-time-and-flexible-balance.md) through [docs/87-phase-8-gate-review.md](docs/87-phase-8-gate-review.md) | Phase 5–8 employee time, absence, approvals, monthly closure, scoped-report, safe-portability, and gate evidence |

## License

WorkLedger-owned source and documentation are licensed under the [MIT License](LICENSE). Root and
workspace `private` flags prevent accidental package publication; they do not change the source
license. Third-party dependencies and adapted source or assets retain their own license and notice
requirements.
