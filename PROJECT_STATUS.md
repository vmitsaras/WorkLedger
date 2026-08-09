# WorkLedger Project Status

**Current phase:** Phase 1 — Repository foundation
**Current milestone:** React Aria shadcn base, design tokens, focus, and reduced-motion foundation
**Active task:** `WL-106`
**Status:** Ready
**Last verified:** 2026-08-09

## Current objective

Initialize the React Aria shadcn base and a small WorkLedger design-token foundation with visible focus, reduced-motion behavior, and semantic button/link/field/dialog examples. Do not begin feature routes, application schema/migrations, authentication storage, or production deployment behavior in `WL-106`.

## Verified decisions

- Product name: WorkLedger.
- One organization per self-hosted installation for the initial release.
- React web application with a separate Fastify API.
- PostgreSQL source of truth.
- React Aria plus shadcn React Aria source components and Tailwind.
- TanStack Query for server state.
- Framework-independent domain engine before UI feature development.
- WCAG 2.2 AA baseline.
- Immutable punch events, ledger-based balances, effective-dated policies, and monthly locking.
- Teams are the only MVP organization grouping; departments are deferred.
- Approval delegation is excluded from the MVP.
- English is the only shipped MVP locale; formatting remains locale-aware.
- Employee self-service profile data is read-only; HR-owned employment facts are not self-editable.
- In-app notification records are core; external email delivery is optional and non-transactional.
- Manager scope is current direct reports only and is evaluated when each request is handled.
- Explicit unauthorized targets return `403`; scoped collections apply authorization before counts and pagination.
- Self-approval and privileged self-adjustment are prohibited even for combined roles.
- System-administrator capability grants technical access only, not HR/domain data.
- A work session runs from clock-in to clock-out and contains break-free work intervals; breaks are excluded exactly once.
- Effective-date ranges are half-open, and stable employee identity survives non-overlapping employment periods.
- Account/employee links are one-to-one while active; team and manager assignments have one current value per employee.
- Derived intervals split at organization-local midnight while source sessions/events remain intact.
- Ordinary clock actions use one trusted server occurrence instant and strictly increasing per-employee event sequence numbers.
- Every attendance command carries the latest `attendanceRevision`; one successful command increments it once, while rejection and replay do not.
- Every attendance mutation requires a scoped, fingerprinted `Idempotency-Key`; matching retries replay the terminal outcome and attendance keys do not expire in the MVP.
- Confirmed on-break clock-out atomically appends `BREAK_END` then `CLOCK_OUT` at one instant and increments the attendance revision once.
- Punch occurrence/manual attendance inputs use minute precision; interval, daily, policy, and display calculations apply no later rounding.
- Daily calculations have identified inputs and `PROVISIONAL`, `INCOMPLETE`, or `COMPLETE` status; only complete past dates may post.
- Holiday dates reduce expected and default absence consumption/credit to zero while preserving actual worked credit.
- Nonexistent manual local times are rejected; ambiguous times require one valid explicit UTC offset.
- Ordinary organization-timezone changes are blocked after time-dependent employee facts exist.
- Complete past dates post one base daily delta; later unlocked recalculations append only the difference, and locked changes use post-lock adjustment.
- Leave entitlement, reservation, deduction, restoration, coverage, credit, and expected-reduction amounts use integer minutes; day equivalents are presentation only.
- Half-day absence is an exact first/second obligation partition; minute coverage cannot mix with full/half coverage on the same local date.
- Approval-required entitlement absence reserves on submission, releases and deducts on approval, and releases without deduction on rejection, changes requested, or withdrawal.
- Negative vacation approval is manager-blocked and requires an eligible non-self HR override with a reason.
- Report-and-acknowledge sickness is effective once on report; acknowledgement adds no second effect, and the default retrospective window is seven configurable calendar days.
- Unpaid leave reduces covered expectation by default and contributes no absence credit.
- Cancellation is a separate versioned workflow that may target exact remaining coverage, restores no more than the linked deduction, and never rewrites the original request/decision.
- Sickness has no diagnosis, note, clinician, or attachment field; type and sensitive context stay out of team DTOs, URLs, browser persistence, generic notifications/exports, technical audit, and operational logs.
- Monthly readiness and adjusted-after-lock are derived; persisted workflow states are open, submitted, changes requested, approved, and locked.
- Approval creates a reconciled immutable snapshot; a separate eligible current non-self manager action locks that exact snapshot, with no MVP unlock.
- Submitted/approved months require an explicit changes-requested transition before ordinary mutation; locked changes append uniquely linked adjustments against the preserved baseline.
- Monthly snapshots include versioned daily calculation/source/ledger evidence but exclude sickness classification, notes, entitlement balances, and other purpose-incompatible HR detail.
- The MVP application has 31 canonical route patterns plus three explicit host-operator workflows, each with stable implementation ownership.
- Request and approval routes are type-neutral; sensitive workflow types, notes, reasons, entitlement values, and person-identifying search text never become URL state.
- Route navigation updates the document title and visible heading with deterministic focus behavior; screen states have persistent, non-duplicative focus and announcement rules.
- Narrow-screen calendars use an equivalent agenda/list when the grid is unsuitable, and responsive transformations preserve reading order, relationships, and actions.
- System-administrator routes expose only technical account/session, safe operations, and technical-audit data; restore, secret rotation, and upgrade remain host-operator workflows.
- WorkLedger treats authentication, employment, attendance, benefits, sickness-related absence, approvals, audit, exports, and backups as high-sensitivity data with purpose-specific access and retention.
- Invite-only credentials use 15–128 character passwords, local common-password rejection, 30-minute single-use reset grants, and 24-hour single-use invitation grants.
- Sessions are PostgreSQL-backed and immediately revocable; stateless/session caches and persistent remember-me are excluded, with 30-minute idle, 12-hour absolute, and 15-minute freshness boundaries.
- Production uses one canonical HTTPS origin, secure host-only cookies, enabled Better Auth checks, WorkLedger session-bound CSRF protection, protected-response no-store caching, and no sensitive browser persistence.
- Caddy is the reference production proxy while the observable TLS, trusted-header, network-isolation, health, and security-header contract remains proxy-agnostic.
- Each deployment must own an explicit retention profile by data class; ordinary deletion never destroys source, ledger, snapshot, or required audit integrity, and restored sessions/grants are invalidated before activation.
- The canonical repository is the existing public `vmitsaras/WorkLedger` GitHub project and WorkLedger-owned source/documentation uses the existing MIT license.
- Root, app, and package manifests remain private/internal for the MVP; internal names use `@workledger/*` and cross-workspace edges use `workspace:*`, with no npm publication workflow.
- The accepted dependency graph keeps domain, contracts, UI, and config independent; database may import domain; web may import UI/contracts; API composes domain/contracts/database; test-utils is test-only.
- Cross-project deep/sibling-source imports, app imports, undeclared path-alias edges, workspace cycles, production test/config imports, and browser imports of authoritative domain/database/server code are prohibited and must fail executable Phase 1 checks.
- pnpm with one root lockfile and no Turborepo is sufficient for the initial workspace; new production projects, dependency edges, orchestration, or package publication require an ADR.
- The root toolchain is pinned to Node `24.18.0` LTS and pnpm `11.20.0` stable; the generated lockfile records the Node runtime integrity variants.
- The exact workspace is two non-importable application shells plus six packages with explicit exports; five expose only their typed root and config also exposes its accepted tooling surfaces. `apps/site` remains deferred to Phase 11.
- The eight accepted internal edges resolve through `@workledger/*` package roots and emit typed ESM entries; no sibling-source or deep import exists in the scaffold.
- TypeScript `7.0.2` is governed by a shared strict composite configuration; the root solution and per-project references must exactly mirror the eight runtime edges and cannot use path aliases.
- Seven explicit development-only `@workledger/config` edges provide shared TypeScript configuration without making config production runtime code.
- Four explicit test-only `@workledger/test-utils` development edges allow API, web, database, and UI tests to use shared harness helpers while production imports remain prohibited.
- ESLint `10.8.0` checks JavaScript/tooling, Prettier `3.9.6` checks code/config formatting, and `es-module-lexer` `2.3.1` powers repository-owned source-boundary checks. Current `typescript-eslint` is not installed because its `<6.1.0` TypeScript peer range excludes TypeScript 7.
- Root commands reject a mismatched active toolchain, missing/unexpected or non-private workspace projects/configuration, alternate/nested lockfiles, wrong/non-`workspace:*` internal edges, TypeScript-reference drift/path aliases, dependency cycles, application exports, package export drift, forbidden/deep/app/test/config/browser-server source imports, and package-publication paths.
- Every completed zero-indexed phase gate requires the shared root/workspace version `0.<completed phase-gate count>.0`; the executable phase-version check reads `TODO.md`, rejects skipped gates and manifest drift, and does not authorize package publication, tagging, deployment, or release creation.
- Vitest `4.1.10` owns unit, component, and integration projects; React/React DOM `19.2.8`, React Testing Library `16.3.2`, jsdom `30.0.1`, axe-core `4.12.1`, Playwright `1.61.1`, and Fastify `5.10.0` are pinned for the baseline harnesses.
- The root quality gate now runs native contract tests, Vitest unit/component tests, Vitest integration tests, Chromium Playwright E2E with axe, and a GitHub Actions workflow that mirrors `pnpm run verify`.
- Local PostgreSQL development uses Docker Compose at `infra/compose/postgres.dev.yml`, official `postgres:18.4-trixie`, loopback-only host binding on port `54329` by default, a `pg_isready` health check, and the PostgreSQL 18 Docker image's `/var/lib/postgresql` volume layout.
- `WL-104` creates only local non-production database roles and empty development/test databases; it does not add WorkLedger product tables, Drizzle migrations, authentication storage, seed data, production Compose, or deployment behavior.
- `pg` `8.22.0` and `@types/pg` `8.20.0` are pinned for local host health checks and database integration tests. Drizzle remains deferred until real schema/migration work.
- `WORKLEDGER_TEST_DATABASE_URL` opts the PostgreSQL lifecycle integration test into a real database connection; without it, the test skips. CI starts the same local Compose service, runs `db:verify`, sets the URL, and then runs the full quality gate.
- API runtime configuration is server-only and is parsed with native Node `URL`, `net.isIP`, and byte-length primitives. `WORKLEDGER_ORIGIN` is the only source for canonical links; production requires an HTTPS origin, exact trusted-proxy IP addresses, a credentialed non-placeholder PostgreSQL URL, and a non-placeholder authentication secret of at least 32 bytes.
- Fastify receives only the validated exact proxy-address list, never a broad proxy setting, CIDR, or hop count. Untrusted forwarded headers do not affect request protocol handling, and API health stays generic/no-store with CORS disabled by default.
- `.env.example` contains only safe local PostgreSQL defaults and blank production-secret fields. `config:check` uses Node's native optional `.env` loading and outputs a redacted configuration summary.
- Phase 0 passed with all seven roadmap criteria evidenced; the accepted catalog contains 85 contiguous single-outcome examples, and every remaining open decision has an explicit later owner/deadline.

## Work completed

- [x] Planning files reviewed for consistency (`WL-001`; see `docs/17-planning-audit.md`).
- [x] MVP scope, non-goals, assumptions, and success criteria finalized (`WL-002`).
- [x] Roles, resource scopes, permission matrix, and self-action rules finalized (`WL-003`).
- [x] Canonical domain vocabulary, concept relationships, and invariant catalog finalized (`WL-004`).
- [x] Attendance transitions, invalid actions, deterministic event order, idempotency, retry, and tab/device conflict behavior finalized (`WL-005`).
- [x] Daily calculation, DST/manual-time, holiday, timezone, posting, and 35 exact calculation fixtures finalized (`WL-006`).
- [x] Absence policy, entitlement ledger, coverage/overlap, workflow, cancellation, privacy, and 27 exact absence fixtures finalized (`WL-007`).
- [x] Monthly submission, changes-requested reopening, approval snapshot, separate lock, and post-lock adjustment rules finalized (`WL-008`).
- [x] Route ownership, screen states, responsive behavior, and testable accessibility criteria finalized (`WL-009`).
- [x] Security/privacy inventory, threat model, authentication/session controls, retention, proxy, backup/restore, and release controls finalized (`WL-010`).
- [x] Architecture decisions, repository publication/license choices, internal package policy, and enforceable dependency boundaries ratified (`WL-011`).
- [x] Phase 0 / Phase 1-entry blocking decisions resolved.
- [x] Domain and workflow example catalog approved with 85 single-outcome cases.
- [x] Roadmap and task-board mapping verified.
- [x] Phase 0 exit gate passed with criterion-by-criterion evidence (`WL-012`; see `docs/19-phase-0-gate-review.md`).
- [x] Private pnpm root workspace, stable toolchain, one lockfile, native manifest/cycle/publication checks, and root quality commands initialized (`WL-100`; see `docs/20-workspace-foundation.md`).
- [x] Two application and six internal package shells created with explicit exports, exact ADR `0011` edges, typed builds, and emitted-entry resolution checks (`WL-101`; see `docs/21-workspace-shells.md`).
- [x] Shared strict TypeScript/ESM, project references, ESLint/Prettier, and executable negative source-boundary fixtures configured (`WL-102`; see `docs/22-strict-tooling-and-boundaries.md`).
- [x] Vitest projects, React Testing Library/jsdom component smoke tests, API/database integration harness smoke tests, Playwright Chromium E2E with axe, and baseline CI configured (`WL-103`; see `docs/23-test-projects-and-ci.md`).
- [x] Local PostgreSQL Docker service, host health check, isolated test database lifecycle proof, and CI database startup configured (`WL-104`; see `docs/24-postgres-docker-dev.md`).
- [x] API runtime configuration, canonical-origin helper, exact Fastify proxy trust, safe `.env.example`, redacted config check, and security-focused API tests configured (`WL-105`; see `docs/25-runtime-configuration.md`).

## Latest completed task

### `WL-105` — Configure environment, origin/proxy trust, secrets, and safe example configuration

- Changed: added the API runtime configuration/parser, canonical-link helper, Fastify server factory with exact proxy trust, safe root `.env.example`, redacted `config:check`, focused validation/proxy tests, and the `WL-105` evidence document.
- Verified: `pnpm with 11.20.0 run config:check`, focused unit/integration tests, `format:check`, lint/boundary scan, strict typecheck, `db:verify` against local Docker PostgreSQL, and the full `pnpm with 11.20.0 run verify` gate all passed locally under pinned Node `24.18.0`/pnpm `11.20.0`.
- Decisions: production configuration fails closed unless it declares the canonical HTTPS origin, one or more exact proxy addresses, credentialed PostgreSQL URL, and a suitable authentication secret. Canonical links never infer host/protocol from a request, and Fastify cannot trust forwarded headers from an unconfigured immediate peer.
- Accessibility: no user interface changed. Existing component/E2E accessibility smoke checks still pass.
- Security/data: secrets and connection strings are omitted from checker output, health data, tests, browser source, and tracked configuration. No employee data, authentication storage, schema/migration, seed data, CORS policy expansion, proxy deployment, telemetry, or production container behavior was added.
- Remaining risk: authentication/CSRF integration, dependency/license/secret scanning, Drizzle schema/migrations, and proxy/deployment implementation remain later tasks.
- Next task: `WL-106`.

## Current blockers

No `WL-106` blocker is known. D-201/D-202, D-200/D-204, and D-502 retain their recorded later owners/deadlines. Local PostgreSQL and runtime configuration are configured; the React Aria base and design tokens remain to be implemented.

## Next task

`WL-106 — Initialize React Aria shadcn base and design tokens.`

## Update rules

After every completed task, record:

- What changed.
- What was verified.
- Commands/tests run.
- New decisions or ADRs.
- Remaining risks.
- Exact next task ID.
