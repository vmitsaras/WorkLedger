# WorkLedger

WorkLedger is a self-hosted application for working time, flexible-time balances, absence
requests, approvals, corrections, and auditable monthly records in small and medium-sized office,
remote, and hybrid organizations.

> **Project readiness: Stage 5 of 5 — Production and UI release gates complete**<br>
> **Current phase progress: Phase 15 — 10 of 10 accepted deterministic tasks complete**<br>
> **Internal milestone: `0.16.0`**

Phases 0–15 have passed their exit gates. The repository includes attendance, flexible-time and
leave ledgers, correction and absence workflows, manager approvals and team availability, monthly
review and locking, post-lock adjustments, reports and safe CSV export, HR administration,
separate technical administration, production deployment and operations, and the Quiet Ledger UI
system across every canonical application route. Phase 13 completed the attendance-clarity,
operational-trust, responsive-workflow, and deterministic release-evidence hardening. The deferred
public project site, safe demo presentation, case study media, and final portfolio documentation
remain an unnumbered draft without a task or version gate.

The production reference deployment, backup/restore, migration/upgrade, retention, diagnostics,
security, accessibility automation, and UI release gates are complete. `0.16.0` is an internal
milestone, not a hosted service, package publication, container release, browser support warranty,
or WCAG conformance statement.

Phase 14 has an accepted internationalization architecture, a typed local foundation for
`en-GB`, `de-DE`, and `es-ES`, persisted account/invitation plus signed-out device locale
preferences, descriptor-driven presentation, localized workflows and generated output,
fluent-human German and Spanish approval, completed multilingual product-quality and database
upgrade gates, and the signed `0.15.0` release milestone. Phase 15 adds deterministic, read-only,
role-scoped Employee, Manager, privacy-suppressed HR aggregate, and isolated System Insights. The
legacy model interpretation pilot remains deferred. The separate WL-1508N enhancement is complete
as best-effort English topic suggestions with explicit confirmation. Provider mode remains disabled,
no model is approved for deployment, and every accepted Insight route is complete without Ollama.
The signed provider-disabled milestone is `0.16.0`.

## Current status

- **WL-1508N is complete; no implementation task is ready.** [Report 201](docs/201-wl-1508n-best-effort-english-suggestions.md) records the best-effort English amendment, observed limitations and full local verification. Controlled provider enablement is an unscheduled operator decision.
- The legacy interpreter remains deferred after [M's bounded review](docs/198-wl-1508m-fact-action-recovery-disposition.md); resumption needs an accepted question-intent amendment or new causal defect evidence. Its [bounded execution plan](docs/196-roadmap-reconciliation-and-pilot-execution-plan.md) retains the original acceptance screens and closure requirements.
- [PROJECT_STATUS.md](PROJECT_STATUS.md) records the completed milestone, verified decisions, and residuals.
- [TODO.md](TODO.md) and [docs/08-task-board.md](docs/08-task-board.md) define dependency-ordered
  work.
- [docs/07-roadmap.md](docs/07-roadmap.md) defines the completed readiness stages and phase gates.
- [AGENTS.md](AGENTS.md), accepted ADRs, and the planning documents are the implementation
  contract.

The root quality gate exercises the repository foundation that exists today. Passing it does not
demonstrate unimplemented product features, production security, deployment readiness, or WCAG
conformance for future workflows.

## Prerequisites

- Git.
- Node.js `24.18.x`; `.node-version`, workspace settings, and the managed development runtime pin
  `24.18.0`.
- Corepack or pnpm `11.20.0`; Corepack selects the manifest-pinned version.
- Chromium, Firefox and WebKit installed through the pinned Playwright version.
- Docker with Docker Compose only for the local PostgreSQL lifecycle checks.

The install guard rejects a project command executed with a different Node or pnpm version. The
bootstrap commands below select the accepted pair even when the host shell starts with another
version. Root and workspace manifests are private/internal and there is no npm package-publication
workflow.

## Fresh-clone setup

```sh
git clone https://github.com/vmitsaras/WorkLedger.git
cd WorkLedger
corepack pnpm install --frozen-lockfile
corepack pnpm exec node --version
corepack pnpm --version
corepack pnpm exec playwright install chromium firefox webkit
corepack pnpm run verify
```

The expected version output is Node `v24.18.x` and pnpm `11.20.0`. `pnpm run verify` uses safe
development defaults when no `.env` exists. It runs the PostgreSQL integration test only when
`WORKLEDGER_TEST_DATABASE_URL` is set; use the next section to exercise that lifecycle.
The tracked `.env.example` contains local defaults only and is not a deployment template.

To run the development application, start the API in one terminal:

```sh
pnpm run test:build
WORKLEDGER_ENVIRONMENT=development \
  WORKLEDGER_ORIGIN=http://127.0.0.1:5173 \
  WORKLEDGER_DATABASE_URL=postgres://workledger_app:workledger_dev_password@127.0.0.1:54329/workledger_dev \
  WORKLEDGER_AUTH_SECRET=<local-secret-with-at-least-32-bytes> \
  pnpm --filter @workledger/api start
```

Then start the web application in another terminal:

```sh
pnpm --filter @workledger/web dev
```

Vite serves the web application at `http://127.0.0.1:5173` and proxies `/v1` and `/api/auth` to the
Fastify listener at `http://127.0.0.1:3000`. The local secret is development-only and must not be
reused in a deployed installation.

## Local PostgreSQL

The local Compose service uses explicit non-production credentials and binds to
`127.0.0.1:54329` by default. Product migrations and deterministic Northstar data are created only
when the explicit development-seed command is run.

```sh
corepack pnpm run db:up
corepack pnpm run db:seed:development
corepack pnpm run db:verify
WORKLEDGER_TEST_DATABASE_URL=postgres://workledger_test:workledger_test_password@127.0.0.1:54329/workledger_test corepack pnpm run verify
corepack pnpm run db:down
```

`db:down` preserves the local volume. `pnpm run db:reset` removes that development volume and its
contents; use it only when a destructive local reset is intended. See
[docs/24-postgres-docker-dev.md](docs/24-postgres-docker-dev.md) for port overrides and the exact
database-test boundary.

Self-hosted installations can set a validated organization display name, same-origin logo,
favicon, and bounded decorative accent without editing application source. See
[docs/113-company-identity-runtime-configuration.md](docs/113-company-identity-runtime-configuration.md)
for variables, approved asset formats, fallbacks, and the optional read-only Compose mount.

## Root scripts

The table uses compact `pnpm run ...` forms. Execute them through `corepack pnpm run ...`
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
| `pnpm run test:e2e` | Run the Playwright application suite plus Firefox, WebKit, and mobile browser-matrix smoke coverage against the real Vite preview. |
| `pnpm run test:visual` | Reproduce the reviewed macOS Chromium Phase 13 cross-route visual baseline; update snapshots only after deliberate manual verification. |
| `pnpm run build` | Build all typed projects and the web preview, then verify emitted public entries. |
| `pnpm run db:up` / `db:down` | Start or stop the local PostgreSQL service; stopping preserves its volume. |
| `pnpm run db:check` / `db:test` / `db:verify` | Check local connectivity, run the isolated lifecycle test, or run both. |
| `pnpm run db:seed:development` | Explicitly migrate and insert/revalidate local-only deterministic Northstar data. |
| `pnpm run db:reset` | Stop PostgreSQL and delete the local development volume and its data. |
| `pnpm run openapi:generate` | Build the API and regenerate the tracked OpenAPI 3.1 artifact from selected route schemas. |
| `pnpm run openapi:check` | Reject drift between the tracked artifact and a fresh in-process OpenAPI document. |

The [CI workflow](.github/workflows/ci.yml) runs the same pinned deterministic verification with
PostgreSQL and the browser matrix. It is restored configuration; no remote CI pass is claimed.
See [the Windows verification and pilot runbook](docs/197-wl-1508l-reproducible-verification.md)
for exact commands, process isolation, artifact interpretation and explicit model stages.

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
| [docs/88-employee-account-administration.md](docs/88-employee-account-administration.md) through [docs/95-phase-9-gate-review.md](docs/95-phase-9-gate-review.md) | Phase 9 employee/account separation, team/manager, effective configuration, entitlement, holiday, domain-audit, and gate evidence |
| [docs/96-phase-10-threat-permission-baseline.md](docs/96-phase-10-threat-permission-baseline.md) through [docs/107-retention-and-minimization.md](docs/107-retention-and-minimization.md) | Phase 10 security, production deployment, operations, retention, restore, upgrade, and release-gate evidence |
| [docs/110-ui-ux-baseline-audit.md](docs/110-ui-ux-baseline-audit.md) through [docs/123-phase-12-gate-review.md](docs/123-phase-12-gate-review.md) | Phase 11–12 UI foundation, workflow remediation, visual regression, and release-gate evidence |
| [docs/124-phase-13-baseline.md](docs/124-phase-13-baseline.md) through [docs/137-phase-13-gate-review.md](docs/137-phase-13-gate-review.md) | Phase 13 attendance clarity, workflow usability, cross-route regression, accessibility, visual, and release-gate evidence |
| [docs/138-phase-14-internationalization-roadmap.md](docs/138-phase-14-internationalization-roadmap.md) through [docs/150-phase-14-gate-review.md](docs/150-phase-14-gate-review.md) | Phase 14 internationalization roadmap, catalogs, runtime and preference foundations, workflow/output localization evidence, fluent-human catalog review, multilingual product-quality verification, and signed release gate |

## Optional local AI

Employee Insights includes optional **best-effort English-only topic suggestions**. Describe a question
in English, review the suggested topic, then choose the period and run the normal Insight. The
AI does not calculate balances or write answers; WorkLedger supplies the complete factual result.
The application and native results retain English, German and Spanish localization.

The feature uses the existing private, operator-controlled Ollama adapter and stays disabled by
default. A 60-request evaluation with a smaller context window returned
40/40 correct supported English suggestions with 0.51-second p95 latency, but only 12/20 expected
UNKNOWN responses. Ambiguous and non-English inputs can still receive a topic suggestion; the
first cold suggestion took 20.8 seconds. Supported use is one clear English question about a single
Employee topic. English-only support does not enforce input language or guarantee a correct topic.
The evidence meets the amended best-effort criteria; its original strict abstention result remains
failed. This is reuse of the recorded run under an explicit scope amendment, not a new model test.
The earlier multilingual answer-generation pilot remains deferred. See
[the best-effort support and evidence report](docs/201-wl-1508n-best-effort-english-suggestions.md),
[the runtime evaluation](docs/200-wl-1508n-runtime-performance-recovery.md) and
[the feature report](docs/199-english-local-ai-topic-suggestions.md) for exact candidate results
and limits. Enabling local AI remains a separate operator decision.

## License

WorkLedger-owned source and documentation are licensed under the [MIT License](LICENSE). Root and
workspace `private` flags prevent accidental package publication; they do not change the source
license. Third-party dependencies and adapted source or assets retain their own license and notice
requirements.
