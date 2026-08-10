# WorkLedger Project Status

**Current phase:** Phase 3 — Data, authentication, and API foundation
**Project readiness:** Stage 3 of 5 — Core engine and platform in progress
**Phase progress:** 6 of 10 Phase 3 tasks complete
**Current milestone:** Attendance-command idempotency persistence
**Active task:** `WL-306`
**Status:** Ready
**Last verified:** 2026-08-10

## Current objective

Implement scoped, protected idempotency-key persistence and replay behavior for attendance
mutations, including fingerprint conflicts, concurrency, terminal outcome snapshots, and atomic
source/audit integration.

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
- Better Auth `1.6.26` owns invite-only credentials and technical sessions only; WorkLedger pins its security-sensitive options, stores sessions and atomic throttle buckets in PostgreSQL, protects reset identifiers at rest, and recursively strips credential/token fields from auth responses.
- Account-employee links and application-role assignments preserve history outside Better Auth; every authorization decision resolves active account/employee capability, current roles, organization, current direct-manager scope, and prohibited self-actions from PostgreSQL before applying a deny-by-default policy.
- Strict Zod contracts are the single transport source for Fastify validation, response
  serialization, inferred types, and generated OpenAPI 3.1; schema failures return `422`, malformed
  JSON returns `400`, and every response receives a server-owned UUID request identifier.
- Domain and security audit evidence uses separate append-only tables, fact allowlists, repository
  record types, and authorization-composed query paths; source actions and audit evidence can commit
  atomically, and neither HR nor system roles gain the other audience implicitly.
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
- Application/domain records use PostgreSQL 18 native UUIDv7 defaults while domain and contract identifiers remain opaque strings; UUID generation time is not business chronology or authorization evidence.
- Daily projections persist as explicit-rebuild, versioned employee/date query caches with source fingerprints and reconciled minute totals; raw facts, append-only ledgers, and immutable approved snapshots remain authoritative.
- Drizzle ORM `0.45.2` and Drizzle Kit `0.31.10` own the internal database schema and generated migrations; PostgreSQL-only custom migration SQL adds effective-range exclusions, organization-consistency foreign keys, and immutable-history triggers.
- `@workledger/database` exposes one domain-facing root with repositories available only inside transaction callbacks; Drizzle schemas, rows, SQL/query builders, `pg` pools, and unrestricted clients remain internal, and an emitted-declaration test enforces the public closure.
- Repository operations are organization-scoped; attendance mutation supports `FOR UPDATE` head locking plus optimistic revision/event-sequence advancement, projection replacement requires the exact next version, and time-account rows map the canonical actor/explanation/source ledger contract.
- Transactions default to `READ COMMITTED`, permit explicit `REPEATABLE READ` or `SERIALIZABLE`, and retry only explicit database-only callbacks two to five times for PostgreSQL serialization/deadlock codes; callbacks with external effects must not enable retry.
- Local PostgreSQL development uses Docker Compose at `infra/compose/postgres.dev.yml`, official `postgres:18.4-trixie`, loopback-only host binding on port `54329` by default, a `pg_isready` health check, and the PostgreSQL 18 Docker image's `/var/lib/postgresql` volume layout.
- `WL-104` creates only local non-production database roles and empty development/test databases; it does not add WorkLedger product tables, Drizzle migrations, authentication storage, seed data, production Compose, or deployment behavior.
- `pg` `8.22.0` and `@types/pg` `8.20.0` are pinned for database access/tests; `WL-300` adds Drizzle ORM `0.45.2` and Drizzle Kit `0.31.10` for the internal schema and generated migrations.
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
- [x] Append-only time-account totals, source explanations, and daily/recalculation/adjustment
  sequences completed (`WL-208`; see `docs/37-time-account-ledger-totals.md`).
- [x] Structured calculation warnings, submission blockers, and stable code ordering completed
  (`WL-209`; see `docs/38-calculation-signals.md`).
- [x] Pure-domain fixture evidence, full catalog owner mapping, and invariant review completed
  (`WL-210`; see `docs/39-domain-example-review.md`).
- [x] Phase 2 domain package boundary, fixture mapping, invariant review, and quality gate passed
  with shared internal version `0.3.0` (`WL-211`; see `docs/40-phase-2-gate-review.md`).
- [x] Initial 28-table PostgreSQL schema, UUIDv7 identifiers, explicit daily-projection persistence,
  generated/custom migrations, integrity constraints, immutable triggers, and clean migration proof
  completed (`WL-300`; see `docs/41-initial-postgresql-schema.md`).
- [x] Narrow domain-facing repositories, bounded pool construction, atomic transaction callbacks,
  attendance locking/stale-write detection, safe persisted-value mapping, explicit database-only
  retries, and executable public-boundary proof completed (`WL-301`; see
  `docs/42-repositories-and-transactions.md`).
- [x] Better Auth invite-only credentials, protected single-use reset grants, canonical reset URLs,
  database-backed idle/absolute sessions, freshness, session-bound CSRF primitives, secure host-only
  cookies, strict PostgreSQL throttling, revocation, and Fastify integration completed (`WL-302`; see
  `docs/43-better-auth-credential-session-foundation.md`).
- [x] Historical account-employee links and roles, active employment capability, current-manager
  scope, deny-by-default self/reports/HR/technical policies, scope-before-pagination, and immediate
  session invalidation completed (`WL-303`; see
  `docs/44-application-authorization-foundation.md`).
- [x] Strict shared Zod envelopes, inferred transport types, server-owned request IDs, `400`/`422`
  validation separation, non-leaking Fastify error mapping, response serialization, and internal
  OpenAPI 3.1 generation completed (`WL-304`; see
  `docs/45-shared-api-contract-foundation.md` and ADR 0012).
- [x] Physically separated append-only domain/security audit streams, actor-at-action attribution,
  minimized fact allowlists, immutable triggers, transaction-scoped append methods, and
  authorization-composed audience queries completed (`WL-305`; see
  `docs/46-audit-persistence-foundation.md`).

## Latest completed task

### `WL-305` — Implement separated domain/security audit persistence

- Changed: added two audience-specific tables/enums/indexes, immutable triggers, actor-at-action
  attribution, minimized fact validators, transaction-scoped append/query repositories, and an API
  service composing domain/security reads with authoritative authorization.
- Verified: schema/PostgreSQL tests cover 37-table clean migration, immutable/cross-organization
  constraints, hostile input rejection, source-plus-audit rollback, scope-before-pagination,
  owner/current/former manager behavior, and HR/system audience separation.
- Accessibility: no user interface changed. Stored codes/identifiers remain structured plain text;
  semantic history tables, focus, reflow, and error behavior remain owned by later feature views.
- Security/data: arbitrary metadata and free text have no audit field; facts are allowlisted and
  bounded, rejected values are never echoed, separate types/tables prevent accidental audience
  union, and system administrators receive no domain payload through the composed service.
- Documentation: added `docs/46-audit-persistence-foundation.md` and synchronized schema,
  repository, architecture, structure, README, roadmap checklist, and task-board memory.
- Remaining risk: later feature/authentication/operations services must append their required audit
  events, purpose-specific audit DTOs/routes remain unimplemented, and host/database superusers stay
  trusted operational actors.
- Next task: `WL-306`.

## Current blockers

No `WL-306` blocker is known. D-502 remains open before the production browser gate.

## Next task

`WL-306 — Implement idempotency storage for clock mutations.`

## Update rules

After every completed task, record:

- What changed.
- What was verified.
- Commands/tests run.
- New decisions or ADRs.
- Remaining risks.
- Exact next task ID.
