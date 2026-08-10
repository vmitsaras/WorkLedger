# WorkLedger Project Status

**Current phase:** Phase 2 — Framework-independent domain engine
**Project readiness:** Stage 3 of 5 — Core engine and platform in progress
**Phase progress:** 8 of 12 Phase 2 tasks complete
**Current milestone:** Time-account ledger totals
**Active task:** `WL-208`
**Status:** Ready
**Last verified:** 2026-08-10

## Current objective

Calculate framework-independent time-account ledger totals and explain their sources from an
opening balance and append-only entries. Cover daily, correction, and adjustment sequences while
deferring persistence, API, and UI behavior.

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
- Cross-project deep/sibling-source imports, app imports, undeclared path-alias edges, workspace cycles, production test/config imports, and browser imports of authoritative domain/database/server code are prohibited and fail executable checks.
- pnpm with one root lockfile and no Turborepo is sufficient for the initial workspace; new production projects, dependency edges, orchestration, or package publication require an ADR.
- The root toolchain is pinned to Node `24.18.0` LTS and pnpm `11.20.0` stable; the generated lockfile records the Node runtime integrity variants.
- The exact workspace is two non-importable application shells plus six packages with explicit exports; five expose only their typed root and config also exposes its accepted tooling surfaces. `apps/site` remains deferred to Phase 11.
- The eight accepted internal edges resolve through `@workledger/*` package roots and emit typed ESM entries; no sibling-source or deep import exists in the scaffold.
- TypeScript `7.0.2` is governed by a shared strict composite configuration; the root solution and per-project references exactly mirror the eight runtime edges and cannot use path aliases.
- Seven explicit development-only `@workledger/config` edges provide shared TypeScript configuration without making config production runtime code.
- Four explicit test-only `@workledger/test-utils` development edges allow API, web, database, and UI tests to use shared harness helpers while production imports remain prohibited.
- ESLint `10.8.0` checks JavaScript/tooling, Prettier `3.9.6` checks code/config formatting, and `es-module-lexer` `2.3.1` powers repository-owned source-boundary checks. Current `typescript-eslint` is not installed because its `<6.1.0` TypeScript peer range excludes TypeScript 7.
- Root commands reject a mismatched active toolchain, missing/unexpected or non-private workspace projects/configuration, alternate/nested lockfiles, wrong/non-`workspace:*` internal edges, TypeScript-reference drift/path aliases, dependency cycles, application exports, package export drift, forbidden/deep/app/test/config/browser-server source imports, and package-publication paths.
- Every completed zero-indexed phase gate requires the shared root/workspace version `0.<completed phase-gate count>.0`; Phase 1 completion sets all nine manifests to `0.2.0` without authorizing publication, tagging, deployment, or release creation.
- Vitest `4.1.10` owns unit, component, and integration projects; React/React DOM `19.2.8`, React Testing Library `16.3.2`, jsdom `30.0.1`, axe-core `4.12.1`, Playwright `1.61.1`, and Fastify `5.10.0` are pinned for the baseline harnesses.
- The root quality gate runs native contract tests, Vitest unit/component tests, Vitest integration tests, Chromium Playwright E2E with axe, and a GitHub Actions workflow that mirrors `pnpm run verify`.
- Local PostgreSQL development uses Docker Compose at `infra/compose/postgres.dev.yml`, official `postgres:18.4-trixie`, loopback-only host binding on port `54329` by default, a `pg_isready` health check, and the PostgreSQL 18 Docker image's `/var/lib/postgresql` volume layout.
- `WL-104` creates only local non-production database roles and empty development/test databases; it does not add WorkLedger product tables, Drizzle migrations, authentication storage, seed data, production Compose, or deployment behavior.
- `pg` `8.22.0` and `@types/pg` `8.20.0` are pinned for local host health checks and database integration tests. Drizzle remains deferred until real schema/migration work.
- `WORKLEDGER_TEST_DATABASE_URL` opts the PostgreSQL lifecycle integration test into a real database connection; without it, the test skips. CI starts the same local Compose service, runs `db:verify`, sets the URL, and then runs the full quality gate.
- API runtime configuration is server-only and is parsed with native Node `URL`, `net.isIP`, and byte-length primitives. `WORKLEDGER_ORIGIN` is the only source for canonical links; production requires an HTTPS origin, exact trusted-proxy IP addresses, a credentialed non-placeholder PostgreSQL URL, and a non-placeholder authentication secret of at least 32 bytes.
- Fastify receives only the validated exact proxy-address list, never a broad proxy setting, CIDR, or hop count. Untrusted forwarded headers do not affect request protocol handling, and API health stays generic/no-store with CORS disabled by default.
- `.env.example` contains only safe local PostgreSQL defaults and blank production-secret fields. `config:check` uses Node's native optional `.env` loading and outputs a redacted configuration summary.
- The UI foundation pins React Aria Components `1.20.0`, Tailwind CSS `4.3.3`, Class Variance Authority `0.7.1`, and current shadcn React Aria metadata through `style: "aria-nova"`.
- `packages/ui` owns local semantic button, link, text-field, and dialog wrappers plus one explicit token stylesheet export; `apps/web` composes only the isolated Vite foundation preview.
- Visible focus uses React Aria focus-visible state with outline/forced-colors support. Reduced motion removes dialog spatial animation and preserves immediate state feedback without a global animation-duration reset.
- React Aria owns modal containment, Escape dismissal, initial dialog focus, and trigger focus restoration; component and Chromium tests cover semantics, keyboard behavior, axe, and reduced-motion computed styles.
- shadcn's current `info` command requires source aliases that conflict with ADR `0011`; WorkLedger retains alias-free relative UI imports and explicitly requests/adapts React Aria registry source instead (`D-007`).
- `skipLibCheck` is scoped to the UI and web projects for an upstream React Aria/React 19.2 optional-DOM-property declaration conflict; WorkLedger source remains strictly checked.
- `@babel/parser` `8.0.4` extends repository-owned source-boundary checks to TypeScript/TSX imports because `es-module-lexer` does not parse JSX and the pinned native TypeScript 7 package exposes no compiler parser API.
- Fresh-clone commands use `pnpm with 11.20.0` to select the accepted package manager and managed Node `24.18.0` runtime even when the host shell starts with another version; direct project commands reject a mismatched active toolchain.
- The public README distinguishes the runnable React Aria foundation preview from an application, supported demo, release, or production deployment and documents every current root script.
- GitHub Private Vulnerability Reporting is enabled for the public `vmitsaras/WorkLedger` repository. `SECURITY.md` provides the private route while promising no supported version, response deadline, remediation deadline, or production support.
- Phase 0 passed with all seven roadmap criteria evidenced; the accepted catalog contains 85 contiguous single-outcome examples, and every remaining open decision has an explicit later owner/deadline.
- Phase 1 passed all eight repository-foundation criteria with a clean-source frozen install, local and database-enabled quality gates, an actual successful CI run, executable ADR `0011` boundaries, and criterion-by-criterion evidence in `docs/28-phase-1-gate-review.md`.
- Domain primitives are construction-only branded values: opaque 1–128 character identifier tokens, safe-integer signed/non-negative minutes, canonical UTC instants, exact ISO local dates, named IANA timezone identifiers, and immutable half-open/open-ended local-date ranges.
- Primitive construction returns discriminated `Result` values with stable non-leaking codes; invalid values are never trimmed, rounded, coerced, or exposed in error payloads.
- Node `24.18.0` has no global Temporal implementation, so `packages/domain` directly pins `@js-temporal/polyfill` `0.5.1`; it adds no WorkLedger package edge or environment, filesystem, network, persistence, framework, or UI access.
- Domain values serialize without brand wrappers: IDs/time values as strings, minutes as integers, open range ends as explicit `null`, successes as `{ ok: true, value }`, and failures as `{ ok: false, error }`. The independent API contract remains owned by `WL-304`.
- Weekly schedules validate seven explicit `0`–`1440` weekday-minute values, where zero remains a deliberate zero-hour day. Schedule and policy assignments resolve only through half-open local-date ranges, return stable gaps/overlaps without array-order fallback, and preserve immutable version references.

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
- [x] React Aria shadcn metadata, local semantic UI wrappers, Tailwind/Vite preview, WorkLedger tokens, visible focus, forced-colors support, reduced motion, and browser/component accessibility evidence configured (`WL-106`; see `docs/26-ui-foundation.md`).
- [x] Public status/setup/script/package-boundary documentation, contribution guidance, MIT license explanation, and verified private vulnerability-reporting workflow completed (`WL-107`; see `docs/27-public-repository-documentation.md`).
- [x] Phase 1 passed with all eight gate criteria, clean-source and database-enabled verification, successful canonical CI evidence, and shared version `0.2.0` (`WL-108`; see `docs/28-phase-1-gate-review.md`).
- [x] Branded IDs/minutes/Temporal values, immutable half-open date ranges, stable result/error types, serialization boundaries, and focused construction tests completed (`WL-200`; see `docs/29-domain-primitives.md`).
- [x] Immutable weekly schedules, identity-only policy versions, effective-dated schedule/policy assignments, and exact gap/overlap/boundary resolution completed (`WL-201`; see `docs/30-effective-dated-time-configuration.md`).
- [x] Immutable attendance states/actions, exact valid-action sets, and every accepted
  transition/invalid-action outcome completed (`WL-202`; see
  `docs/31-attendance-transition-validation.md`).
- [x] Ordered immutable punch-event reconstruction, complete/open work sessions, break-free work
  intervals, and exact corruption/precision outcomes completed (`WL-203`; see
  `docs/32-attendance-reconstruction.md`).
- [x] Manual/corrected local-time resolution, future/negative/precision validation, and half-open
  interval overlap constraints completed (`WL-204`; see
  `docs/33-manual-attendance-interval-validation.md`).
- [x] Resolved-schedule daily expected/worked/credited/balance arithmetic and structured source
  failures completed (`WL-205`; see `docs/34-daily-attendance-calculation.md`).
- [x] Organization-local midnight splitting, DST-safe exact segments, and source-interval linkage
  completed (`WL-206`; see `docs/35-local-date-interval-splitting.md`).
- [x] Effective full/half/minute paid and unpaid absence effects, double-credit prevention, and
  daily-calculation inputs completed (`WL-207`; see `docs/36-daily-absence-effects.md`).

## Latest completed task

### `WL-207` — Integrate paid/unpaid absence credit with daily calculation

- Changed: added pure effective-absence coverage calculation that returns the explicit credit and
  expected-reduction inputs used by daily arithmetic. It supports full, deterministic half, and
  minute coverage with paid, unpaid, or neutral treatments.
- Verified: focused Vitest coverage passes seven absence-effect tests for odd-minute half-day
  partitioning, direct daily-calculation integration, paid-credit capping, exact minute/work
  intersection, zero-hour behavior, coverage overlap, and work overlap. Strict domain TypeScript
  build and `git diff --check` also pass.
- Accessibility: not directly applicable because this task adds no UI or interaction. Explicit
  calculation-source values enable later interfaces to explain absence effects without relying on
  color or inferred state.
- Security/data: no persistence, API, logs, environment, network, employee data, authentication,
  authorization, or browser state was introduced. The deterministic calculator does not create or
  alter absence requests, entitlement history, or attendance source events.
- Documentation: added `docs/36-daily-absence-effects.md` and reconciled the README, TODO, task
  board, and project status.
- Remaining risk: calculation warnings/status, ledger posting/totals, persistence, and audit
  atomicity remain deferred.
- Next task: `WL-208`.

## Current blockers

No `WL-208` blocker is known. The accepted daily calculation and effective absence inputs are
sufficient for bounded ledger total calculation. D-201/D-202 remain owned before the first
application schema migration, D-200/D-204 before the shared API contract, and D-502 before the
production browser gate.

## Next task

`WL-208 — Calculate time-account ledger totals and explain sources.`

## Update rules

After every completed task, record:

- What changed.
- What was verified.
- Commands/tests run.
- New decisions or ADRs.
- Remaining risks.
- Exact next task ID.
