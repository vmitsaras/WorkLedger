# WorkLedger Project Status

**Current phase:** Phase 10 — Production hardening and self-hosting
**Project readiness:** Stage 5 of 5 — Production and release in progress
**Phase progress:** 2 of 10 Phase 10 tasks complete
**Current milestone:** Performance, pagination, and concurrency review
**Active task:** `WL-1001`
**Status:** Not started
**Last verified:** 2026-08-16

## Current objective

Measure and harden expected-scale performance, pagination, indexing, and concurrent mutations for
`WL-1001`.

## Verified decisions

- Product name: WorkLedger.
- One organization per self-hosted installation for the initial release.
- React web application with a separate Fastify API.
- PostgreSQL source of truth.
- React Aria plus shadcn React Aria source components and Tailwind.
- TanStack Query for server state.
- The Today query uses a trusted minute-aligned server instant and organization-local Temporal date
  boundary; current-day values are explicitly provisional or incomplete and never final.
- An older Today `attendanceRevision`, or older `asOf` value at the same revision, cannot replace
  newer in-memory query data. Today responses are no-store and exclude employee/organization,
  command, actor, absence-detail, and policy-detail identifiers.
- React Router `8.3.0` Data Mode owns route loaders, redirects, boundaries, permission gates, URL
  restoration, titles, and route focus; TanStack Query `5.101.4` owns in-memory remote state and
  mutations without browser persistence.
- Framework-independent domain engine before UI feature development.
- WCAG 2.2 AA baseline.
- Immutable punch events, ledger-based balances, effective-dated policies, and monthly locking.
- Teams are the only MVP organization grouping; departments are deferred.
- Approval delegation is excluded from the MVP.
- `/approvals` is a purpose-minimized inbox for corrections, absence requests, absence
  cancellations, and monthly periods. It exposes only generic workflow category and status,
  current-team and affected-date metadata; absence subtype, including sickness, is never a list or
  URL value.
- Current manager/HR scope and self exclusion apply before filters, totals, sorting, and
  pagination. Rows, totals, and team filter options share one repeatable-read snapshot.
- Monthly-period rows use month bounds and direct restricted-period links; scope and self-exclusion
  apply before filters, totals, sorting, and pagination, and reasons/source detail stay excluded.
- `/reports` returns only the current actor's authorized catalog. The five allow-listed report
  queries fix self/current-report/organization scope before date filters, totals, sorting, counts,
  and pagination; pending approvals exclude self, system authority grants no domain fallback, and
  an explicit unrelated opaque employee target returns `403` without partial fulfillment.
- Report URLs contain only bounded dates, pagination, allow-listed sorting, and an optional opaque
  authorized employee target. Generic report DTOs exclude sickness classification, reasons, notes,
  source/employee identifiers, and entitlement detail outside generic leave-account totals.
- Report CSV generation is a strict same-origin, CSRF-protected POST that re-evaluates the current
  report permission and `RECORD_EXPORT` scope inside one repeatable-read transaction. Complete
  authorized results are bounded to 100,000 rows and 32 MiB of UTF-8; formula-significant text is
  apostrophe-prefixed before ordinary CSV quoting, filenames are non-person-identifying, and the
  success audit stores only actor/authority, report action, scope, time, and source count.
- Monthly print and report-summary clipboard writes occur only after labelled user actions and an
  action-time authorization refresh. Their dedicated purpose-minimized representations omit
  internal identifiers, sickness classification, notes, decision reasons, reviewer comments, and
  hidden content; failure never opens print or claims a successful copy.
- Monthly request-changes, approval, and lock transitions use `CURRENT_MANAGER` when that current
  scope qualifies, otherwise `ORGANIZATION_HR`; HR-only accounts need no fabricated employee
  identity, system administrators receive no domain fallback, and both paths apply identical state,
  version, source, reconciliation, transaction, audit, and notification checks (`D-402`).
- Approval decisions require the authenticated account and explicit `CURRENT_MANAGER`,
  `ORGANIZATION_HR`, or `SELF` authority; a linked employee identity is optional evidence, so
  HR-only accounts remain attributable without fabricated employee records (`D-352`).
- English is the only shipped MVP locale; formatting remains locale-aware.
- Employee self-service profile data is read-only; HR-owned employment facts are not self-editable.
- The self-context/profile transport exposes only active account, organization, employee summary,
  current application roles, derived navigation areas, and minimized session/device summaries; IP
  addresses and raw user-agent values never enter browser DTOs.
- In-app notification records are core; external email delivery is optional and non-transactional.
- Manager scope is current direct reports only and is evaluated when each request is handled.
- Team membership and direct-manager assignment use separate non-overlapping half-open histories;
  current manager scope is re-resolved from PostgreSQL on every request, so an effective manager
  change transfers access immediately while prior rows retain attribution but grant no access.
- Effective assignment changes cannot be backdated or replace an existing same-day boundary,
  preserve already scheduled later boundaries, and validate the full current/future manager graph
  against self-links and direct or indirect cycles inside the serializable mutation transaction.
- Weekly schedule versions are immutable organization-scoped seven-day minute records. Reusing a
  name with changed minutes creates the next serialized version, while an identical repeat is
  rejected and creating a version never changes employee assignments.
- Ordinary schedule assignment changes are current/future-only half-open transitions that preserve
  earlier and already scheduled later boundaries. Every current/future employed date must remain
  covered, periods between separate employments need no schedule, and PostgreSQL exclusion and
  organization-scoped foreign-key constraints remain final integrity guards.
- Inactive teams remain readable in history but unavailable for new assignments; a team with a
  current or scheduled assignment cannot be deactivated.
- `/team` uses active attendance before neutral organization-local date absence coverage and exposes
  only display name, current team name, textual availability, and a generic unresolved-record flag.
  It never exposes employee/request IDs, absence subtype, sickness context, notes, reasons,
  entitlement, or reviewer history.
- `/team-calendar` exposes effective, uncancelled coverage for the manager's current direct reports
  or HR's organization scope as neutral `UNAVAILABLE` entries. Its month grid and agenda share one
  selectable-date model; narrow screens start with the agenda, and missing current-team assignments
  remain explicit rather than guessed.
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
- `POST /v1/me/attendance/clock-in` authorizes active self capability before strict request
  validation, repeats that decision inside one serializable transaction, and atomically commits one
  immutable punch, one revision increment, one minimized audit event, and one terminal outcome.
- Concurrent matching clock-in requests produce one original result and one terminal replay;
  wrapped Drizzle/PostgreSQL serialization and deadlock codes remain eligible only for bounded
  database-only transaction retry.
- Clock-in captures one trusted minute only after lock/revision/state validation, rejects server
  clock regression with a complete rollback, and never accepts a client occurrence instant.
- The Today clock-in form uses one memory-only intent key, visible disabled pending state, no
  optimistic attendance claim, authoritative refetch, one result announcement, and logical status
  focus when the initiating control becomes invalid.
- Confirmed on-break clock-out atomically appends `BREAK_END` then `CLOCK_OUT` at one instant and increments the attendance revision once.
- `START_BREAK`, `RESUME`, and `CLOCK_OUT` share clock-in's preflight and in-transaction
  authorization, serializable idempotency, head/revision/source validation, trusted occurrence,
  immutable event, minimized audit, and terminal replay boundary.
- The Today screen renders only authoritative valid actions, disables the complete control group for
  one pending in-memory intent, and uses a controlled modal for deliberate active-break clock-out;
  cancel/Escape causes no attendance effect and confirmed submission creates a new intent key.
- Today calculation detail groups server-provided integer minutes into expected, credited, and
  estimated-balance description lists with explicit natural-language equations; the browser
  formats but does not derive authoritative totals.
- Today attendance history is a semantic ordered list with event meaning, organization-local date,
  IANA timezone, and same-time recorded-order context. Intrinsic cards and wrapped labels reflow
  without horizontal page overflow at the automated 320 px boundary.
- Today polls every 30 seconds only in the foreground and always refetches on tab return or
  reconnect. Newer device revisions cannot be replaced by older snapshots; if a refresh removes
  the focused action, current-status focus and one polite device-change message preserve context.
- Attendance mutations never pause into an offline queue. Online transport/`5xx` failures receive
  at most two automatic retries with the same memory-only idempotency key; terminal `4xx` outcomes
  are not retried. Offline/reconnect and dependency states disable actions until one authoritative
  refresh succeeds.
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
- Approval creates a reconciled immutable snapshot; a separate eligible current-manager or
  organization-HR non-self reviewer action locks that exact snapshot, with no MVP unlock.
- Submitted/approved months require an explicit changes-requested transition before ordinary mutation; locked changes append uniquely linked adjustments against the preserved baseline.
- Monthly snapshots include versioned daily calculation/source/ledger evidence but exclude sickness classification, notes, entitlement balances, and other purpose-incompatible HR detail.
- Locked-date corrections reference the exact approved snapshot and approval atomically appends an
  ordered adjustment, nonzero time-account delta, audit, and generic notification without changing
  raw punches, the daily projection, or approved snapshot. The monthly DTO and UI separate the
  immutable approved record from its reconciled adjusted view.
- Locked-period absence cancellation preserves employee intent, links every affected immutable
  snapshot/source fingerprint, applies exact append-only absence/entitlement/time adjustments under
  current non-self reviewer authority, and exposes original versus reconciled results without
  sensitive absence detail (`D-504`, implemented by `WL-1000A`).
- Phase 10 threat evidence is cumulative: `WL-1000` owns the application baseline and central
  permission matrix, while load, deployment, restore, upgrade, diagnostics, and retention tasks add
  their required operational evidence before `WL-1008` can close `T-001`–`T-020` (`D-505`).
- The MVP application has 31 canonical route patterns plus three explicit host-operator workflows, each with stable implementation ownership.
- Request and approval routes are type-neutral; sensitive workflow types, notes, reasons, entitlement values, and person-identifying search text never become URL state.
- Route navigation updates the document title and visible heading with deterministic focus behavior; screen states have persistent, non-duplicative focus and announcement rules.
- Narrow-screen calendars use an equivalent agenda/list when the grid is unsuitable, and responsive transformations preserve reading order, relationships, and actions.
- System-administrator routes expose only technical account/session, safe operations, and technical-audit data; restore, secret rotation, and upgrade remain host-operator workflows.
- HR employee administration and system account administration use separate contracts and routes:
  HR owns stable employee/employment history and employee/manager/HR roles; system administration
  receives no HR fields and owns only technical account state, system role, and session revocation.
- Employee deactivation ends the current half-open employment period, deactivates the linked
  account, and revokes all sessions without deleting prior periods or roles. Technical account
  state changes never mutate employment, and cannot re-enable an employee-linked account while the
  employee is inactive.
- WorkLedger treats authentication, employment, attendance, benefits, sickness-related absence, approvals, audit, exports, and backups as high-sensitivity data with purpose-specific access and retention.
- Invite-only credentials use 15–128 character passwords, local common-password rejection, 30-minute single-use reset grants, and 24-hour single-use invitation grants.
- Sessions are PostgreSQL-backed and immediately revocable; stateless/session caches and persistent remember-me are excluded, with 30-minute idle, 12-hour absolute, and 15-minute freshness boundaries.
- Production uses one canonical HTTPS origin, secure host-only cookies, enabled Better Auth checks, WorkLedger session-bound CSRF protection, protected-response no-store caching, and no sensitive browser persistence.
- Better Auth `1.6.26` owns invite-only credentials and technical sessions only; WorkLedger pins its security-sensitive options, stores sessions and atomic throttle buckets in PostgreSQL, protects reset identifiers at rest, and recursively strips credential/token fields from auth responses.
- Account-employee links and application-role assignments preserve history outside Better Auth; every authorization decision resolves active account/employee capability, current roles, organization, current direct-manager scope, and prohibited self-actions from PostgreSQL before applying a deny-by-default policy.
- Strict Zod contracts are the single transport source for Fastify validation, response
  serialization, inferred types, and generated OpenAPI 3.1; schema failures return `422`, malformed
  JSON returns `400`, and every response receives a server-owned UUID request identifier.
- `GET /openapi.json` exposes only selected Zod/Fastify WorkLedger contracts as no-store JSON; a
  canonical tracked OpenAPI artifact is regenerated and drift-checked without a second handwritten
  transport source, while typed-client generation is deferred until a stable generator supports
  the pinned TypeScript 7 toolchain.
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
- `packages/ui` owns local semantic button, link, text-field, dialog, and drawer wrappers plus one
  explicit token stylesheet export; `apps/web` composes the authenticated Data Mode application
  shell and route surfaces without importing authoritative domain or database code.
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
- Phase 3 passed all seven roadmap criteria with clean/repeatable migrations, the accepted
  authentication/session/CSRF profile, deactivation proof, authoritative permission-matrix
  coverage, atomic immutable event/audit evidence, concurrent idempotent replay, non-leaking
  transport errors, deterministic seed scenarios, and shared internal version `0.4.0`.
- Domain primitives are construction-only branded values: opaque 1–128 character identifier tokens, safe-integer signed/non-negative minutes, canonical UTC instants, exact ISO local dates, named IANA timezone identifiers, and immutable half-open/open-ended local-date ranges.
- Primitive construction returns discriminated `Result` values with stable non-leaking codes; invalid values are never trimmed, rounded, coerced, or exposed in error payloads.
- Node `24.18.0` has no global Temporal implementation, so `packages/domain` directly pins `@js-temporal/polyfill` `0.5.1`; it adds no WorkLedger package edge or environment, filesystem, network, persistence, framework, or UI access.
- Domain values serialize without brand wrappers: IDs/time values as strings, minutes as integers, open range ends as explicit `null`, successes as `{ ok: true, value }`, and failures as `{ ok: false, error }`. The independent API contract remains owned by `WL-304`.
- Weekly schedules validate seven explicit `0`–`1440` weekday-minute values, where zero remains a deliberate zero-hour day. Schedule and policy assignments resolve only through half-open local-date ranges, return stable gaps/overlaps without array-order fallback, and preserve immutable version references.

## Work completed

- [x] `T-001`–`T-020` application evidence baseline, executable 36 employee/five account/seven
  installation action catalogs, exhaustive central permission-policy regressions, Phase 10
  evidence ownership, and the locked-cancellation implementation contract completed (`WL-1000`;
  see `docs/96-phase-10-threat-permission-baseline.md`).
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
- [x] Protected organization/account/key attendance claims, exact fingerprint conflict handling,
  typed terminal snapshots, immutable completion, rollback retry, and concurrent replay completed
  (`WL-306`; see `docs/47-attendance-idempotency-persistence.md`).
- [x] Explicit local/test-only Northstar seed with deterministic personas, effective schedules,
  attendance edges, balances, requests, privacy-safe locked history, audit evidence, guarded
  migration/CLI behavior, and repeat/drift tests completed (`WL-307`; see
  `docs/48-development-seed.md`).
- [x] Hidden-from-spec public OpenAPI JSON, deterministic tracked artifact and drift gate,
  authentication/secret exclusion tests, and evidence-based typed-client deferral completed
  (`WL-308`; see `docs/49-openapi-exposure.md`).
- [x] Phase 3 migration, authentication/deactivation, authorization, audit, idempotency, error,
  seed, OpenAPI, security, database-enabled quality, and version gates passed with shared internal
  version `0.4.0` (`WL-309`; see `docs/50-phase-3-gate-review.md`).
- [x] Sign-in/recovery/reset routes, role-aware authenticated shell, read-only profile and minimized
  session surface, self-session revocation, responsive drawer navigation, route boundaries,
  permission gates, title/focus management, and axe/browser evidence completed (`WL-400`; see
  `docs/51-authenticated-application-shell.md`).
- [x] Authorized organization-local Today state, bounded immutable-event timeline, provisional or
  incomplete calculation, warning/blocker presentation, revision-aware query cache, responsive
  reflow, and API/browser evidence completed (`WL-401`; see
  `docs/52-today-attendance-read-model.md`).
- [x] Authorized clock-in contract, serializable idempotent transaction, trusted occurrence,
  immutable punch/revision/audit atomicity, terminal replay/conflict behavior, and accessible
  pending/result/refetch/focus UI completed (`WL-402`; see `docs/53-clock-in-mutation.md`).
- [x] Start-break, resume, and ordinary/active-break clock-out contracts; one shared protected
  command service; exact event ordering; cross-command replay/conflict behavior; accessible valid
  actions and confirmation; and full API/browser sequence evidence completed (`WL-403`; see
  `docs/54-attendance-command-sequence.md`).
- [x] Focused explainable calculation groups, semantic ordered attendance history, zero-expected
  holiday explanation, signed adjustment presentation, timezone/order context, long-label wrapping,
  and 320 px reflow/axe evidence completed (`WL-404`; see
  `docs/55-today-timeline-calculation.md`).
- [x] Same-key lost-response retry, offline non-queuing, reconnect-before-enable, foreground
  polling, focus/tab/device convergence, terminal-conflict non-retry, persistent dependency
  recovery, and race/retry browser evidence completed (`WL-405`; see
  `docs/56-attendance-resilience-recovery.md`).
- [x] Phase-wide keyboard, accessibility-tree announcement smoke, touch-emulation, 200%-width
  reflow proxy, forced-colors focus/boundary, reduced-motion, long-content, and ten-viewport review
  completed (`WL-406`; see `docs/57-employee-attendance-accessibility-review.md`).
- [x] Phase 4 web/API/database/domain/audit flow, duplicate/lost-response safety, device convergence,
  announcements, keyboard/mobile completion, recovery states, explainable balance, database-enabled
  canonical quality, and shared `0.5.0` version gate passed (`WL-407`; see
  `docs/58-phase-4-gate-review.md`).

## Latest decision update

### `D-504` — Locked absence-cancellation adjustment contract

- Resolved by `WL-1000` and implemented by `WL-1000A` as a distinct absence-cancellation workflow.
- Submission atomically captures the exact immutable snapshot and source fingerprint for locked
  targets; submitted/approved months still require reopening.
- Approval under current non-self manager/HR authority appends exact effect, entitlement,
  component-adjustment, time-ledger, audit, and notification evidence without changing the locked
  snapshot. Expected-version and source-evidence conflicts roll back the entire decision.
- Monthly contracts and UI keep the immutable approved record separate from the reconciled adjusted
  view and omit sensitive absence and internal linkage detail.
- Evidence is documented in `docs/97-locked-absence-cancellation-adjustments.md`.

## Latest completed task

### `WL-1000A` — Implement locked-period absence-cancellation adjustments

- Changed: added immutable cancellation-to-snapshot links; component-aware post-lock adjustments;
  atomic mixed unlocked/locked submission and approval behavior; exact entitlement restoration and
  aggregate time-ledger posting; and a discriminated monthly adjustment contract/UI.
- Verified: reproducible OpenAPI, formatting, lint/boundaries, strict TypeScript, 24 tooling tests,
  301 unit/component tests across 43 files, all 41 PostgreSQL integration tests across 21 files,
  all 20 Chromium scenarios, and the production/workspace build pass. The locked-cancellation
  integration proves the snapshot stays byte-equivalent, dated component deltas reconcile, one
  aggregate ledger entry is posted, audit/notification evidence is written, and a stale retry
  creates no duplicate. The host Node `24.19.0` cannot use the pinned `24.18.x` pnpm wrapper, so the
  installed local binaries ran the equivalent gates; the known `pg` warning and 825 kB chunk
  advisory remain.
- Accessibility: the adjusted-view table retains a hidden caption, scoped row/column headers,
  keyboard-scrollable containment, textual source/effect/delta/link states, and axe coverage for an
  absence-cancellation adjustment.
- Security/data: current non-self reviewer scope and request version are rechecked; immutable source
  fingerprints and effect IDs/versions are validated; organization-consistent foreign keys and one
  serializable transaction prevent partial/cross-organization effects; purpose DTOs omit absence
  subtype, decision reason, entitlement detail, sickness context, and internal linkage IDs.
- Documentation: synchronized `D-504`, domain invariants, cancellation behavior, the Phase 10
  evidence register, roadmap memory, and `docs/97-locked-absence-cancellation-adjustments.md`.
- Remaining risk: expected-scale contention and query behavior remain `WL-1001`; full WCAG audit,
  production deployment, restore/upgrade, diagnostics, and retention remain `WL-1002`–`WL-1007`.
- Next task: `WL-1001`.

### `WL-1000` — Establish the threat, permission, and privacy baseline

- Changed: added executable central catalogs for all 36 employee-target, five account-target, and
  seven installation authorization actions; expanded the unit suite into an exhaustive role,
  scope, organization, inactivity, and freshness matrix; created the `T-001`–`T-020` evidence
  register; resolved the threat-evidence ownership contradiction in `D-505`; and resolved/scheduled
  the locked absence-cancellation contract as required `WL-1000A` under `D-504`.
- Verified: formatting, workspace/version/boundary contracts, strict composite TypeScript,
  reproducible OpenAPI, ESLint, 24 tooling tests, 299 unit/component tests across 43 files, all 41
  PostgreSQL-backed integration tests across 21 files, all 20 Chromium scenarios, and the
  production/workspace build pass. The canonical pnpm wrapper remains unavailable on the host
  Node `24.19.0` runtime because the repository pins `24.18.x`; installed local binaries were used
  without changing dependencies. Integration retains the known `pg` 9 deprecation warning, and
  the build retains the known 825 kB main-chunk advisory.
- Accessibility: no interface semantics or interaction changed. Existing Chromium coverage still
  passes keyboard, focus, narrow reflow, forced-colors, touch, grant cleanup, and axe scenarios.
- Security/data: no confirmed unresolved application-layer Critical/High vulnerability was found.
  The evidence register explicitly keeps production proxy/CSP, load, restore, upgrade, logging,
  diagnostics, and retention controls open under their real Phase 10 owners; it makes no premature
  production-readiness claim. No secret value, protected payload, analytics, or persistence was
  added.
- Documentation: added `docs/96-phase-10-threat-permission-baseline.md`; resolved `D-504`/`D-505`;
  and synchronized TODO, task board, and project status.
- Remaining risk: `WL-1000A` must implement locked-period cancellation adjustments. `WL-1001`–
  `WL-1007` must replace partial/open threat rows with measured operational evidence before
  `WL-1008`. The host toolchain mismatch, existing `pg` warning, large web chunk, and `D-502`
  browser matrix remain explicit.
- Next task: `WL-1000A`.

### `WL-907` — Pass the Phase 9 administration exit gate

- Changed: reviewed `WL-900`–`WL-906` against all six Phase 9 criteria, fixed the isolated administration integration fixture to apply migration `0019`, documented the gate decision, synchronized roadmap memory, and advanced all private workspace manifests to `0.10.0`.
- Verified: before the bump, the pinned toolchain and full gates passed: reproducible OpenAPI, formatting, lint and 245-file/1,278-import boundaries, strict TypeScript, 24 tooling tests, 297 unit/component tests across 43 files, all 41 PostgreSQL integration tests across 21 files, 20 Chromium scenarios, and the production/workspace build. After the bump, direct installed-graph checks reconfirm ten-gate phase/version and workspace contracts, formatting, lint/boundaries, TypeScript, OpenAPI, tooling/unit/component tests, and builds; the managed wrapper aborted before state change because registry metadata was unavailable, and the host Node had independently advanced beyond the exact `24.18.x` guard.
- Accessibility: the gate confirms complex-form summaries, labelled keyboard-complete administration, textual states, table/history semantics, narrow containment, pagination, recovery/focus behavior, axe, and Chromium evidence; full manual WCAG and assistive-technology verification remains `WL-1002`.
- Security/data: HR/system authority remains separate, privileged self-actions fail closed, current effective scope is authoritative, changes preserve historical versions/effects, audit audiences remain separate, and purpose DTOs omit credentials, unrestricted reasons, sickness content, and unrelated fields.
- Documentation: added `docs/95-phase-9-gate-review.md`; synchronized README, roadmap gate criteria, TODO, task board, and status. The `0.10.0` bump is internal only and authorizes no tag, publication, release, container, or deployment.
- Remaining risk: the known main-chunk advisory and `pg` concurrent-query deprecation warning move into Phase 10. `D-502` and the production-blocking `D-504` remain open; Phase 10 owns the complete security, performance, accessibility, deployment, backup, upgrade, observability, and retention gates.
- Next task: `WL-1000`.

### `WL-906` — Build authorized audit explorer with filters and safe detail

- Changed: added strict domain-audit query/page contracts and generated OpenAPI, a dedicated organization-HR authorization action, organization-local date/action/outcome/target filters with scope-before-total pagination, a redacted purpose DTO, and the accessible URL-owned `/audit` explorer.
- Verified: workspace/toolchain/version checks, reproducible OpenAPI, formatting, lint and 245-file/1,278-import boundaries, strict TypeScript, 24 tooling tests, 297 unit/component tests across 43 files, 20 Chromium scenarios, and the production/workspace build pass. Integration reports 8 passed and 33 PostgreSQL-dependent skipped because the database is unavailable. The build retains the known large-chunk advisory.
- Accessibility: filters use visible native controls and URL state; results use a captioned table, keyboard-focusable narrow-screen overflow, textual outcomes/privilege, native disclosure detail, count/loading/empty states, named pagination, route focus/boundary behavior, and component axe coverage.
- Security/data: the API derives organization scope from active account context and permits only organization HR; technical/system capability alone is denied. The DTO omits actor account, employee, organization, request, and restricted-reason identifiers plus all free text and technical facts; responses are private/no-store.
- Documentation: added `docs/94-domain-audit-explorer.md`, regenerated OpenAPI, and synchronized TODO, task board, and project status. No migration or version bump is required because the append-only audit schema and indexes already cover the slice and this is not the Phase 9 gate.
- Remaining risk: database availability still determines whether PostgreSQL integration executes. Exact action filtering avoids an information-rich catalog; employee-name filtering, audit export, technical audit, retention execution, and production-scale security/performance remain later work.
- Next task: `WL-907`.

### `WL-905` — Build holiday calendar management

- Changed: added strict holiday-administration contracts and generated OpenAPI, organization-scoped date-only listing, aggregate recalculation-impact preview, protected-period and duplicate/past safeguards, serializable create plus minimized audit evidence, and the accessible `/settings/holidays` surface.
- Verified: workspace/toolchain/version checks, reproducible OpenAPI, formatting, lint and 241-file/1,245-import boundaries, strict TypeScript, 24 tooling tests, and 296 unit/component tests across 42 files pass. Database integration compiles and its 8 non-database checks pass; 33 PostgreSQL-dependent cases were skipped because the integration database was unavailable.
- Accessibility: the form uses visible labels and a native date input, invalidates stale previews, requires an explicit two-step preview/confirm action, presents counts and blockers textually, protects pending actions, provides focusable error and polite success feedback, and has component axe coverage.
- Security/data: all routes require current organization-HR authority; previews and mutations are same-origin and CSRF protected, mutation rechecks impact and authorization inside a serializable transaction, protected periods fail closed, and aggregate responses/audit facts omit employee identities and schedule detail.
- Documentation: added `docs/93-holiday-calendar-administration.md`, aligned the documented route with `/settings/holidays`, regenerated OpenAPI, and synchronized TODO, task board, and project status. No migration or version bump is required because the existing date-only holiday table covers the slice and this is not the Phase 9 gate.
- Remaining risk: the projection rebuild mechanism is not yet available, so affected existing projections are honestly identified but not silently marked recalculated. Database-enabled integration was unavailable; bulk/region/recurrence/edit/delete flows and production-scale concurrency/browser/assistive-technology/performance/security matrices remain outside the slice.
- Next task: `WL-906`.

### `WL-904` — Build absence-type and entitlement administration

- Changed: added strict bounded absence-administration contracts and generated OpenAPI, immutable effective-dated absence-type versions, a dedicated restricted-reason adjustment source and generated migration, employee entitlement ledger detail, reason-required signed adjustments, `/settings/absence`, and employee-detail administration.
- Verified: workspace/toolchain/version checks, reproducible OpenAPI, formatting, lint and 238-file/1,221-import boundaries, strict TypeScript, 24 tooling tests, 295 unit/component tests across 41 files, 20 Chromium scenarios, and the production/workspace build pass. Database integration compiles and its non-database checks pass; PostgreSQL-dependent cases were skipped because the integration database was unavailable. The build retains the known large-chunk advisory.
- Accessibility: configuration and adjustment forms use visible labels, native controls, coverage fieldsets, textual history/balance/source states, signed values, persistent feedback, pending protection, self-control omission, and component axe coverage.
- Security/data: routes require active organization-HR authority; mutations are same-origin and CSRF protected, self-adjustment is denied, sickness cannot own an entitlement account, adjustment targets are organization/effective/employment scoped, and source/ledger/audit effects are atomic. Free-text reasons remain in restricted HR source records and out of generic audit facts.
- Documentation: added `docs/92-absence-entitlement-administration.md`, migration `0019_stale_loners.sql`, regenerated OpenAPI, and synchronized README, TODO, task board, and project status. No version bump is required because this is not the Phase 9 gate.
- Remaining risk: database-enabled integration was unavailable in this environment. Historical/backdated correction, bulk allocation/import, submitted/approved/locked interactions, and broad concurrency/cross-browser/assistive-technology/performance/security matrices remain later explicit work.
- Next task: `WL-905`.

### `WL-903` — Build time-policy management

- Changed: added strict bounded time-policy contracts and generated OpenAPI, immutable serialized policy versions, current/future gap-free employee policy assignments, minimized atomic audit evidence, and accessible version, history, assignment, and impact-preview surfaces.
- Verified: workspace/toolchain/version checks, formatting, lint and 231-file/1,164-import boundaries, strict TypeScript, 24 tooling tests, and 293 unit/component tests across 39 files pass. Database integration compiles and its non-database checks pass; PostgreSQL-dependent cases were skipped because the integration database was unavailable.
- Accessibility: policy forms use visible labels, native controls, textual latest/history/current/gap states, a polite textual impact preview, pending protection, persistent feedback, self-control omission, and component axe coverage.
- Security/data: routes require active organization-HR authority; mutations are same-origin and CSRF protected, self-assignment and cross-organization policy references are denied, effective history is validated inside serializable transactions, and audit facts omit complete rules and form payloads.
- Documentation: added `docs/91-effective-dated-time-policy-administration.md`, regenerated OpenAPI, and synchronized TODO, task board, and project status. No migration or version bump is required because the existing policy tables and constraints cover the slice and this is not the Phase 9 gate.
- Remaining risk: database-enabled integration was unavailable in this environment; broad concurrency, cross-browser, assistive-technology, performance, and production-security matrices remain Phase 10 work. Automatic-break, rounding, payroll/overtime, and arbitrary policy workflows remain excluded.
- Next task: `WL-904`.

### `WL-902` — Build effective-dated schedule management

- Changed: added strict contracts and generated OpenAPI for immutable weekly schedule versions and
  employee schedule current/history/gap detail; implemented current/future coverage validation,
  serialized version numbering, serializable assignment close/insert/audit transactions, an
  accessible `/settings/time` surface, and schedule controls on employee detail.
- Verified: pinned toolchain/workspace/version/configuration checks, reproducible OpenAPI,
  formatting, ESLint and 230-file/1,157-import boundaries, strict TypeScript, 24 tooling tests, 292
  unit/component tests across 39 files, 22 database-enabled integration tests across 11 focused
  files, 20 Chromium scenarios, and the production/workspace build pass. The build retains the
  known large-chunk advisory; database integration retains the existing `pg` concurrent-query
  deprecation warning.
- Accessibility: creation and assignment use visible labels, native controls, textual latest,
  historical, current, total, date-range, and gap states, semantic ordered history, linked focused
  error recovery, persistent results, pending protection, privileged self-control omission, and
  component/browser axe coverage through keyboard-operable workflows.
- Security/data: all routes enforce active account and organization-HR authority; mutations are
  same-origin and CSRF protected, privileged self-assignment and cross-organization versions are
  denied, and version or lock/validate/close/insert/audit effects commit atomically in serializable
  transactions. Audit facts omit names, weekday arrays, and form payloads.
- Documentation: added `docs/90-effective-dated-schedule-administration.md`, regenerated OpenAPI,
  and synchronized README, TODO, task board, and project status. No migration or version bump is
  needed because existing schedule constraints cover the slice and this is not the Phase 9 gate.
- Remaining risk: historical/locked-period schedule corrections require a later explicit workflow;
  broad performance, concurrency, cross-browser, assistive-technology, and production-security
  matrices remain Phase 10 work. The large web chunk advisory, `pg` warning, `D-502`, and `D-504`
  also remain explicit.
- Next task: `WL-903`.

### `WL-901` — Build teams, manager assignments, and effective scope changes

- Changed: added strict contracts and generated OpenAPI for the team catalog plus effective team
  and direct-manager history/mutations; implemented pure transition and manager-graph rules,
  serializable PostgreSQL repositories and audit writes, immediate authorization-scope transfer,
  accessible team and employee-detail controls, and preserved scheduled/historical boundaries.
- Verified: pinned toolchain/workspace/version/configuration checks, reproducible OpenAPI,
  formatting, ESLint and 224-file/1,108-import boundaries, strict TypeScript, 24 tooling tests, 288
  unit/component tests across 38 files, 21 database-enabled integration tests across 11 focused
  files, 19 Chromium scenarios, and the production/workspace build pass. The build retains the
  known large-chunk advisory; database integration retains the existing `pg` concurrent-query
  deprecation warning.
- Accessibility: the team catalog and two assignment histories use semantic headings, ordered
  history, textual current/state/date information, labelled native controls, persistent mutation
  results, pending protection, validation focus recovery, privileged self-control omission, and
  component/browser axe coverage through a keyboard-operable workflow.
- Security/data: all routes enforce active account and organization-HR authority; mutations are
  same-origin and CSRF protected, privileged self-assignment is denied, manager candidates are
  revalidated at the effective date, and changes lock/close/insert/validate the complete manager
  graph/audit in one serializable transaction. Current manager access transfers immediately from
  authoritative PostgreSQL data, while historical rows grant no scope and remain unchanged.
- Documentation: added `docs/89-team-manager-administration.md`, regenerated OpenAPI, and
  synchronized README, TODO, task board, and project status. No migration or version bump is needed
  because the existing assignment constraints cover this slice and this is not the Phase 9 exit
  gate.
- Remaining risk: team-catalog pagination beyond its first bounded page and the full performance,
  cross-browser, assistive-technology, and production security matrices remain Phase 10 work. The
  existing large web chunk advisory, `pg` warning, `D-502`, and `D-504` also remain explicit.
- Next task: `WL-902`.

### `WL-900` — Build employee lifecycle and separated technical-account/session administration

- Changed: added strict shared contracts and generated OpenAPI for HR employee list/detail/create,
  invitation, activation/deactivation, HR-role management, preserved employment history, and a
  separate technical account/system-role/session surface; implemented serializable PostgreSQL
  repositories, transactional audit evidence, invitation activation, and accessible web routes.
- Verified: pinned toolchain/workspace/version/configuration checks, reproducible OpenAPI,
  formatting, ESLint and 222-file/1,104-import boundaries, strict TypeScript, 24 tooling tests, 280
  unit/component tests across 37 files, 20 database-enabled integration tests across 11 focused
  files, 19 Chromium scenarios, and the production/workspace build pass. The build retains the
  known large-chunk advisory; database integration retains the existing `pg` concurrent-query
  deprecation warning.
- Accessibility: employee creation has visible labels/descriptions, linked inline errors and a
  focused error summary; list/detail/system screens use textual state, semantic history, captioned
  tables, named pagination/scroll containment, keyboard-complete actions, self-control omission,
  deliberate async route focus, narrow-screen browser coverage, and axe component/browser checks.
- Security/data: all privileged mutations require a fresh active session, same-origin and CSRF
  checks, current HR/system authority, prohibited self-targeting, serializable state changes,
  session revocation, and minimized audit. Single-use invitation grants are protected at rest,
  client/grant rate-limited, immediately removed from browser history, absent from responses and
  audit, and never create a session automatically. HR/system DTOs and role ownership remain
  purpose-separated, and system account state cannot override inactive employment.
- Documentation: added `docs/88-employee-account-administration.md`, regenerated OpenAPI, and
  synchronized README, TODO, task board, and project status. No migration or version bump is needed
  because this is not the Phase 9 exit gate.
- Remaining risk: production email delivery/configuration and the full proxy/rate-limit,
  cross-browser, assistive-technology, security, and performance matrices remain Phase 10 work.
  The existing large web chunk advisory, `pg` warning, `D-502`, and `D-504` also remain explicit.
- Next task: `WL-901`.

### `WL-806` — Pass the Phase 8 exit gate

- Changed: completed the criterion-by-criterion review across `WL-800`–`WL-805`; replaced direct
  post-lock fixture insertion in the monthly scenario with real employee correction and unified
  manager approval endpoints; exported the adjusted locked month; preserved deliberate in-main
  focus from delayed route-heading focus; recorded `D-504`; and advanced the root plus all eight
  private workspace manifests from `0.8.0` to `0.9.0`.
- Verified: exact phase-version, workspace/configuration, formatting, ESLint and 215-file/1,040-
  import boundaries, strict TypeScript, reproducible OpenAPI, 24 tooling tests, 276 unit/component
  tests, 37 PostgreSQL integration tests across 20 files, 17 Chromium scenarios, and the
  production/workspace build pass. The build retains the existing large-chunk advisory;
  integration retains the existing `pg` concurrent-query deprecation warning.
- Accessibility: the gate revalidates labelled monthly/report controls, linked validation and
  focus-managed outcomes, textual workflow/readiness/adjustment state, captioned tables, contained
  narrow-screen results, semantic purpose-minimized print, explicit clipboard/export status,
  keyboard/touch/forced-colors foundations, and axe/Chromium evidence. Delayed route presentation
  now leaves deliberate focus inside `main` intact while ordinary shell navigation still focuses
  the destination heading; focused regression coverage and the full component suite pass.
- Security/data: current actor/scope and non-self rules are enforced at every submit/review/lock/
  correction/export action; ordinary submitted-period mutation has zero effect; post-lock
  correction appends linked `+13`, zero, and `-13` evidence without changing snapshot JSON; the
  exact adjusted CSV contains no hidden identifiers or protected reasons; audits and notifications
  remain minimized.
- Documentation: added `docs/87-phase-8-gate-review.md`, checked the six canonical exit criteria,
  recorded `D-504`, synchronized README/TODO/task board/status, and completed the internal `0.9.0`
  milestone without tagging, publishing, releasing, or deploying.
- Remaining risk: `D-504` blocks production release until the separate locked absence-cancellation
  contract is resolved and implemented. `D-502`, the large web chunk advisory, the `pg` warning,
  and real assistive-technology/cross-browser production evidence also remain.
- Next task: `WL-900`.

### `WL-805` — Build safe report portability

- Changed: added a strict authorized CSV export for all five scoped reports with complete-result
  bounds, exact UTF-8/CRLF/filename behavior, formula neutralization, and minimized audit evidence;
  added explicit report download and freshly authorized summary-copy controls; and added a
  dedicated monthly print representation that commits refreshed data before opening the browser
  dialog.
- Verified: exact toolchain/workspace/version/config checks, formatting, ESLint and 215-file/1,040-
  import boundaries, strict TypeScript, reproducible OpenAPI, 24 tooling tests, 276 unit/component
  tests, 37 PostgreSQL integration tests across 20 files, 17 Chromium scenarios, and the
  production/workspace build pass. The build retains the existing large-chunk advisory;
  integration retains the existing `pg` concurrent-query deprecation warning.
- Accessibility: export, copy, and print use labelled real buttons with pending and outcome text;
  failures are announced without false success; print preserves headings, descriptions, table
  captions/headers, textual state, monochrome boundaries, and print-safe layout while application
  navigation and controls are removed. Refreshed-print timing, scope loss, narrow-screen download,
  keyboard behavior, and axe are covered.
- Security/data: Origin, CSRF, active session, report permission, export permission, current direct-
  manager/HR scope, and explicit target authorization are rechecked at generation time. CSV is
  bounded to 100,000 rows/32 MiB and excludes hidden identifiers and private absence/reviewer
  fields; formula-significant text is neutralized. Clipboard copies no rows, and print omits source
  fingerprints/reviewer history. Successful export audit stores no rows, names, filters, or
  document content. No dependency, schema, migration, or persisted export was added.
- Documentation: added `docs/86-safe-report-portability.md`, documented the 413 error, regenerated
  OpenAPI, mapped EX-043 to direct evidence, and synchronized README, TODO, task board, and status.
- Remaining risk: `WL-806` must execute the Phase 8 close/export/adjust gate scenario and assess the
  existing locked absence-cancellation adjustment gap. The existing large web chunk advisory and
  `pg` deprecation warning also remain.
- Next task: `WL-806`.

### `WL-804` — Build scoped operational reports

- Changed: added strict catalog/query/result contracts; repeatable-read PostgreSQL repositories for
  monthly time, flexible time, leave balance, and incomplete-record reporting; reused the unified
  approval source for actionable pending work; exposed authorized no-store report APIs; and
  replaced the reports placeholder with catalog/detail routes, canonical URL filters, totals,
  tables, and pagination.
- Verified: exact toolchain/workspace/version/config checks, formatting, ESLint and 211-file/1,025-
  import boundaries, strict TypeScript, reproducible OpenAPI, 24 tooling tests, 253 unit/component
  tests, 37 PostgreSQL integration tests across 20 files, 17 Chromium scenarios, and the
  production/workspace build pass. The build retains the existing large-chunk advisory;
  integration retains the existing `pg` concurrent-query deprecation warning.
- Accessibility: visible labelled filters include linked errors; results identify applied scope and
  partial data in text; totals use description lists; tables use captions, headers, active
  `aria-sort`, and named keyboard-scrollable containment; empty/loading/error/retry/pagination and
  route focus behavior are covered.
- Security/data: self/current-manager/HR scope is fixed before filters, totals, sorting, counts, and
  pages; explicit opaque targets are authorized before use; pending work excludes self; system-only
  access is denied. Generic DTOs and URLs omit sickness, subtype, notes, reasons, person search,
  employee/source identifiers, and unrestricted entitlement data.
- Documentation: added `docs/85-scoped-operational-reports.md`, regenerated OpenAPI, mapped EX-044
  to direct evidence, and synchronized README, TODO, task board, and status.
- Remaining risk: CSV, print, clipboard, formula neutralization, generation-time reauthorization,
  encoding, filenames, and bounded streaming remain entirely owned by `WL-805`. Locked absence
  cancellation adjustment ownership and the existing large web chunk advisory also remain.
- Next task: `WL-805`.

### `WL-803` — Implement post-lock correction and adjustment linkage

- Changed: linked locked-period correction requests to the exact latest approved snapshot; added
  migration `0018` with complete request/decision/applied/adjustment/reversal evidence; made approval
  atomically create the applied interpretation, ordered adjustment, optional nonzero
  `POST_LOCK_ADJUSTMENT` ledger entry, audit, and generic notification; and added reconciled original
  versus adjusted monthly contract and UI views.
- Verified: exact toolchain/workspace/version/config checks, formatting, ESLint and 204-file/970-import
  boundaries, strict TypeScript, reproducible OpenAPI, 24 tooling tests, 246 unit/component tests, 36
  PostgreSQL integration tests across 19 files, 16 Chromium scenarios, and the production/workspace
  build pass. The build retains the existing large-chunk advisory; integration retains the existing
  `pg` concurrent-query deprecation warning.
- Accessibility: employee and reviewer screens identify the post-lock application path in text;
  approval reports its immediate adjustment result; and the monthly page separates the immutable
  approved record from a captioned, keyboard-scrollable adjustment table with textual zero-delta
  and reversal states. Focus/live feedback and component axe checks pass.
- Security/data: current manager/HR authority, non-self access, expected request version, locked
  period, and exact snapshot are rechecked in one serializable transaction. Unique linkage prevents
  duplicate effects; raw punches, daily projection, and snapshot stay unchanged. Reasons remain in
  restricted storage and are excluded from the monthly DTO, generic notifications, and audit facts.
- Documentation: added `docs/84-post-lock-correction-adjustments.md`, regenerated OpenAPI, mapped
  EX-033–EX-036 and EX-081–EX-084 to direct evidence, and synchronized README, TODO, task board, and
  status.
- Remaining risk: the active task is correction-specific. Locked absence cancellation still returns
  `PERIOD_ADJUSTMENT_REQUIRED` and must receive its broader domain-contract implementation before a
  phase/release gate claims that path. The existing web chunk-size advisory also remains.
- Next task: `WL-804`.

### `WL-802` — Implement eligible-reviewer changes request, approval, and lock

- Changed: added pure request-changes/approve/lock transitions; strict reviewer and lock contracts;
  migration `0017` with account-first snapshot backfill, numbered approval cycles, and immutable
  decision records; current-manager/HR-only serializable commands; canonical reproducible approval
  snapshots; separate exact-snapshot lock; reviewer audit and generic notification records; monthly
  approval-inbox rows; approved-record/history UI; and the accessible permanent-lock confirmation.
- Verified: workspace/phase/config contracts, formatting, ESLint and 204-file/970-import boundaries,
  strict TypeScript, reproducible OpenAPI, 24 tooling-contract tests, 242 unit/component tests, 35
  PostgreSQL integration tests across 19 files, 16 Chromium scenarios, and the production build
  pass. The build retains the existing large-chunk advisory.
- Accessibility: reviewer actions have distinct labels and textual availability; the visible reason
  is audience-labelled and linked to a focused error summary; stale conflicts preserve safe typed
  text while refetching; approval and lock outcomes focus the updated status; the confirmation
  explains permanence/snapshot/adjustment consequences and restores cancel focus; approved evidence
  and history remain semantic, textual, keyboard complete, and axe-covered.
- Security/data: current scope and self denial, expected state/version/source, blockers, ledger
  reconciliation, snapshot identity, decision, audit, and notification are rechecked and committed
  atomically. Current-manager authority takes precedence for combined roles; HR-only evidence may
  omit employee identity. Canonical snapshots include exact configuration/effect/ledger references
  but serialize sickness only as neutral effect/minute evidence and exclude classification, notes,
  diagnosis, entitlement, and protected payloads.
- Documentation: added `docs/83-monthly-period-review-lock.md`, regenerated OpenAPI, updated the
  unified inbox and notification contracts, mapped EX-037/EX-040–EX-042/EX-077–EX-080/EX-085 to
  direct evidence, and synchronized README, TODO, task board, and status.
- Remaining risk: `WL-803` must implement the post-lock request/decision and append-only adjustment
  chain, including zero-delta evidence, concurrency, reversal, and approved-versus-adjusted views.
- Next task: `WL-803`.

### `WL-801` — Implement employee review and submit transition

- Changed: added the pure versioned submission transition, strict fingerprint acknowledgement
  contract, migration `0016`, row-locked serializable persistence, self-only submission route,
  persisted submitting account/time/source evidence, one success audit event, server-derived
  available actions, and the accessible monthly submit interface. The source fingerprint now
  excludes mutable workflow/display state so it remains stable across submission. Ordinary
  correction, vacation, sickness, and cancellation mutations are protected after submission;
  pending cancellations also block readiness.
- Verified: the pinned-toolchain equivalents of workspace/version/config, formatting,
  lint/boundaries, strict typecheck, reproducible OpenAPI, 24 tooling-contract tests, 236
  unit/component tests, 34 PostgreSQL integration tests across 19 files, 16 Chromium scenarios,
  and the production build pass. The pnpm managed-runtime wrapper requested and safely aborted a
  non-interactive dependency refresh; no dependency or lockfile changed.
- Accessibility: warning acknowledgement uses a visible native checkbox and explanatory disabled
  state; reviewers never receive the employee-only action; conflicts persist in a focused alert,
  refetch the source, and clear stale acknowledgement; success is announced once and focuses the
  textual Submitted heading. Component axe coverage passes.
- Security/data: active self employee authorization, same-origin and CSRF checks, expected version,
  exact source, readiness, blocker, and ledger reconciliation are rechecked inside one serializable
  transaction. Error context contains only authorized blocker codes/dates; no source internals,
  absence classification, reasons, or approval snapshot are exposed or created.
- Documentation: added `docs/82-monthly-period-submission.md`, clarified submission versus reviewer
  notification evidence, regenerated OpenAPI, mapped EX-035/EX-038/EX-039/EX-076, and synchronized
  README, TODO, task board, and status.
- Remaining risk: `WL-802` must implement account-first current-manager/organization-HR decisions,
  source-unchanged approval snapshots, reviewer outcome notifications, and the separate lock
  action. The production build still reports the existing large-chunk advisory.
- Next task: `WL-802`.

### `WL-800` — Implement monthly period summary and blockers

- Changed: added a pure ended-month readiness/totals/attention calculator, a repeatable-read monthly
  source repository, strict minimized contracts, `GET /v1/monthly-periods/:periodId`, a My Time
  handoff, and the real accessible monthly-detail route. Snapshot schema version 1 and a canonical
  SHA-256 source fingerprint identify the exact review source set without creating an approval
  snapshot.
- Verified: toolchain/workspace/version/config checks, formatting, lint/boundaries, strict typecheck,
  generated OpenAPI, 24 repository-contract tests, 228 unit/component tests, 34 PostgreSQL
  integration tests, 16 Chromium scenarios, and the production build pass. The database scenario
  verifies self/current-manager/HR access, unrelated-manager/system denial, exact complete-date and
  ledger totals, blocker derivation, privacy minimization, and no-store caching.
- Accessibility: workflow and derived readiness are separate text; blockers/warnings have recovery
  links; calculated and posted totals are explicitly labelled; final amounts are withheld for
  missing/incomplete dates; and the captioned native table uses a named, keyboard-focusable
  horizontal-scroll region with route focus, retry, denial, and axe coverage.
- Security/data: scope is re-evaluated before projection in one repeatable-read transaction. The DTO
  contains no absence classification, sickness context, reasons, entitlement, protected source IDs,
  or raw source-reference payloads. No schema migration, mutable history, snapshot creation, or
  Phase 8 transition was added.
- Documentation: added `docs/81-monthly-period-summary.md`, regenerated OpenAPI, updated the example
  evidence map and roadmap memory, and advanced Phase 8 to `WL-801`.
- Remaining risk: `WL-801` must atomically validate the current period/source version and exact
  warning acknowledgement. Resolved `D-402` requires `WL-802` to migrate monthly snapshot/decision
  actors to required account and authority with nullable employee evidence before enabling HR-only
  review transitions.
- Next task: `WL-801`.

### `WL-706` — Pass the Phase 7 exit gate

- Changed: completed the gate review across `WL-700`–`WL-705`, recorded direct evidence for all six
  manager-approval/team criteria, marked the sequential gate complete, and advanced the root plus
  all eight private workspace manifests from `0.7.0` to `0.8.0`.
- Verified: the installed pinned-toolchain equivalent of database-enabled canonical verification
  passes toolchain/workspace/version/config, formatting, lint/boundaries, strict typecheck,
  generated OpenAPI, 24 repository-contract tests, 219 unit/component tests, 33 PostgreSQL
  integration tests, 16 Chromium scenarios, and the production build. The pnpm managed-runtime
  wrapper requested and then safely aborted a non-interactive dependency refresh after the
  manifest-only version bump; no dependency or lockfile changed.
- Accessibility: semantic manager workflows, keyboard completion, linked errors, route/result
  focus, bounded live feedback, equivalent calendar/agenda information, narrow reflow, reduced
  motion, forced colors, touch, and axe evidence pass. Real assistive-technology smoke remains a
  release-level verification item rather than a conformance claim.
- Security/data: current-manager/HR scope, non-self decisions, account-first audit actors, no-store
  minimized DTOs, cross-organization isolation, CSRF, versioned serializable decisions, and
  post-commit delivery failure behavior meet the gate.
- Documentation: added `docs/80-phase-7-gate-review.md`, synchronized README/TODO/task board/status,
  and advanced the roadmap to `WL-800`.
- Remaining risk at gate completion: monthly approval/lock authority was blocked on `D-402`, which
  is now resolved; the known Vite main-chunk warning remains owned by `WL-1001`.
- Next task: `WL-800`.

### `WL-705` — Complete manager authorization and accessibility review

- Changed: completed the Phase 7 endpoint permission matrix and critical-flow audit; added explicit
  inactive, employee-only, current/former/unrelated/self manager, HR-only, combined-role,
  system-admin, and cross-organization approval evidence. Fixed final-heading focus after async
  detail loading, field-linked decision errors, keyboard access to the overflowing coverage table,
  native `:focus-visible` support for button-styled buttons/links, and bounded async result feedback.
- Verified: formatting, lint, typecheck, 24 repository-contract tests, 219 unit/component tests, 17
  canonical and 2 focused live PostgreSQL tests, 16 Chromium tests, and the production build pass.
  Evidence covers scope-before-query, no disclosure, HR-only actors, notification ownership, stale
  decisions, delivery failure, plus the manager decision flow at 320 px with keyboard,
  reduced-motion, forced-colors, focus/error/status, contained overflow, and axe assertions.
- Accessibility: native forms, buttons, links, tables, pagination, and calendar/agenda alternatives
  remain intact. Validation now has both a focused summary and an associated field error; the final
  route heading, live outcomes, keyboard scrolling, and native forced-colors focus are deliberate.
- Security/data: the review found no authorization bypass. Current effective direct-manager or HR
  scope is re-evaluated transactionally; privileged self-decisions remain denied; technical roles
  do not gain HR access; cross-organization and foreign notification identifiers disclose no data.
- Documentation: added `docs/79-manager-authorization-accessibility-review.md`, revalidated the
  resolved `D-352` account-first recommendation, synchronized the README and roadmap memory, and
  advanced Phase 7 to `WL-706` without a version bump.
- Remaining risk: automated axe and accessibility-tree checks do not replace a short real
  VoiceOver/NVDA, Windows High Contrast, keyboard, and zoom/reflow smoke during the Phase 7 gate.
- Next task: `WL-706`.

### `WL-704` — Implement generic notification records, history, and optional delivery

- Changed: added durable notification and delivery-attempt tables, transaction-scoped repositories,
  strict shared contracts, self-only list/dismiss API routes, atomic approval-decision producers, a
  bounded optional post-commit delivery adapter, and the real `/notifications` history route.
- Verified: strict contract and component tests, the 42-table migration suite, and live PostgreSQL
  approval integration cover correction, sickness-report, and vacation outcomes; stale-decision
  duplicate prevention; two persisted failed attempts; decision success despite delivery failure;
  own-history isolation; foreign-target not-found behavior; retained dismissal; and generic copy.
  Chromium covers keyboard dismissal, focus retention, status announcement, 320 px reflow, and axe.
- Accessibility: notification history is a persistent semantic list with native links/buttons,
  visible delivery state, explicit empty/loading/error/refresh/pagination states, a retained focused
  dismissal control, and one polite completion announcement rather than transient toast behavior.
- Security/data: notification creation shares the serializable decision transaction; delivery runs
  only after commit and cannot alter the outcome. Responses are self-scoped and no-store; dismissal
  requires same origin and CSRF; browser/delivery copy omits request kind, sickness/absence detail,
  reason, note, entitlement, reviewer, employee, and source identifiers.
- Documentation: added `docs/78-generic-notifications-delivery.md`, resolved the `D-203`
  implementation owner, regenerated OpenAPI, and advanced Phase 7 to `WL-705`.
- Remaining risk: the MVP has an adapter boundary and deterministic fake but no production SMTP
  dependency. Monthly notification production/destinations remain owned by `WL-802` under the
  authority resolved by `D-402`.
- Next task: `WL-705`.

### `WL-703` — Build team calendar and agenda/list alternative

- Changed: added a strict team-calendar contract, current-scope PostgreSQL coverage read model,
  `GET /v1/team/calendar`, HR-only navigation parity, and the real `/team-calendar` route with
  equivalent selectable month and agenda presentations.
- Verified: contract and component/axe tests plus focused Chromium evidence cover strict coverage,
  protected-field rejection, view equivalence, keyboard date selection, empty and missing-team
  states, HR navigation, employee-route denial, narrow agenda-first behavior, reflow, and absence
  subtype omission. PostgreSQL integration exercises manager/HR/system scope, cancellation,
  invalid month validation, no-store caching, and serialized privacy when the database harness is
  enabled.
- Accessibility: the route uses a focused page heading, native `aria-pressed` view/date buttons, a
  captioned native table in a named focusable scroll region, grouped agenda lists, a shared selected
  date section, textual Today/Selected/count/coverage/warning states, and no custom ARIA grid.
- Security/data: authorization precedes the bounded coverage query in one repeatable-read snapshot;
  only effective non-cancelled coverage is returned as `UNAVAILABLE`; the DTO omits employee/request
  identifiers, absence subtype, sickness context, notes, reasons, entitlement, and reviewer history.
- Documentation: added `docs/77-team-calendar-agenda.md`, regenerated OpenAPI, and advanced Phase 7
  to `WL-704`.
- Remaining risk: current scope is deliberately evaluated at request time rather than reconstructed
  historically. Notification persistence and delivery failure handling remain `WL-704`.
- Next task: `WL-704`.

### `WL-702` — Build privacy-safe team current-status list

- Changed: added a strict minimized team-status contract, a current-scope PostgreSQL read model,
  `GET /v1/team/status`, foreground refresh, and the real `/team` manager route with summary and
  direct-report status table.
- Verified: contract, component/axe, live PostgreSQL, and Chromium coverage exercise current and
  former manager scope, HR organization scope, technical-admin and employee-route denial,
  attendance precedence, neutral absence projection, cancellation, unresolved indicators, empty
  and dependency states, focus, and narrow contained scrolling.
- Accessibility: the route uses a focused page heading, labelled description-list totals, textual
  states, a captioned native table, and a named keyboard-focusable horizontal scroll region without
  noisy loading announcements.
- Security/data: authorization precedes rows and totals in one repeatable-read snapshot; responses
  are private/no-store; the DTO omits protected identifiers and absence context; active attendance
  wins before date-level `Unavailable today` projection.
- Documentation: added `docs/76-privacy-safe-team-status.md` and advanced Phase 7 to `WL-703`.
- Remaining risk: half-day absence has no authoritative wall-clock boundary, so the list states
  `Unavailable today`; `WL-703` owns detailed neutral date/coverage presentation.
- Next task: `WL-703`.

### `WL-701` — Implement consistent approval decisions

- Changed: added type-neutral approval detail and decision contracts/routes for corrections,
  absence requests, and absence cancellations; retained correction approval/application as
  separate actions; and made all decision repositories account-first with explicit authority.
- Verified: component and live PostgreSQL tests cover manager/HR scope, HR-only decision actors,
  historical actor backfill, correction decisions, sickness acknowledgement, vacation effects and
  entitlement transitions, cancellation reversal, stale conflicts, and immutable decision rows.
- Accessibility: the detail route uses semantic summaries and tables, visible labels, native form
  controls, reason validation with focused error feedback, disabled pending actions, one persistent
  outcome announcement, and current-state recovery after conflicts.
- Security/data: authorization and self-exclusion remain API-enforced; mutations require same-origin
  CSRF protection; responses are no-store; sickness detail stays inside the authorized record; and
  audit actors use the authenticated account plus decision authority.
- Documentation: resolved `D-352`, added `docs/75-consistent-approval-decisions.md`, and advanced
  the Phase 7 roadmap to `WL-702`.
- Remaining risk at completion: monthly approval records remained excluded pending `D-402`, which
  is now resolved; implementation remains `WL-802`. Notification delivery remains separate from
  domain decision persistence and belongs to `WL-704`.
- Next task: `WL-702`.

### `WL-700` — Build manager approval inbox and URL-owned filters

- Changed: added a strict shared approval-inbox contract, a purpose-specific scoped PostgreSQL
  read model, and `GET /v1/approvals`; replaced the correction-only `/approvals` list with the
  paginated generic inbox while preserving manager access to the existing correction review flow.
- Verified: focused contract, web component, live PostgreSQL API integration, and Chromium
  browser coverage exercise strict query state, current direct-report/HR scope, generic
  filtering, pagination, privacy minimization, keyboard focus, 320 px reflow, and axe.
- Accessibility: the inbox uses labelled native filters and disclosure, applied-filter and date
  error feedback, named loading states, a captioned sortable table, contained narrow-screen
  scrolling, and deliberate route/pagination/session/permission focus behavior.
- Security/data: HR-only access is supported without employee capability; linked HR and managers
  cannot see their own rows; the generic DTO omits source details, absence subtype, notes, and
  employee IDs; responses are no-store.
- Documentation: added `docs/74-unified-approval-inbox.md`, synchronized URL/table rules and
  resolved inbox decisions, and recorded the Phase 8 monthly-authority conflict as `D-402`.
- Remaining risk at completion: `WL-701` had to consolidate type-neutral details and decisions.
  Monthly rows stay out of the inbox until `WL-802`; `D-402` is now resolved.
- Next task: `WL-701`.

### `WL-607` — Pass the Phase 6 exit gate

- Changed: completed the Phase 6 evidence review across absence policy, entitlement balances,
  coverage/overlap, privacy-safe sickness, personal calendar/agenda, and cancellation reversal;
  recorded the review in `docs/73-phase-6-gate-review.md`; and advanced every workspace manifest
  together to the internal `0.7.0` milestone.
- Verified: workspace, source-boundary, phase-version, strict TypeScript, format, OpenAPI,
  emitted-entry, and production-build checks pass. The suite has 189 unit/component tests, 30
  database-enabled integration tests, and 12 Chromium browser scenarios passing.
- Accessibility: the reviewed employee workflows use native form/control semantics, labelled
  validation and outcomes, explicit text status, equivalent calendar/agenda information, keyboard
  and touch completion, forced-colors behavior, and responsive/axe coverage.
- Security/data: review confirms active/self and current-manager-or-HR scope at API boundaries,
  non-self decisions, CSRF/same-origin/no-store controls, serializable workflows, append-only
  source and ledger evidence, locked-period routing, and sickness-data minimization.
- Documentation: added `docs/73-phase-6-gate-review.md` and synchronized the phase board, TODO,
  project status, OpenAPI artifact, and phase-gate version.
- Remaining risk: Phase 7 must build the manager approval inbox without widening privacy or direct
  manager scope. The known Vite main-chunk warning remains owned by `WL-1001`.
- Next task: `WL-700`.

### `WL-605` — Build personal calendar and accessible agenda alternative

- Changed: replaced the personal-calendar placeholder with a self-only, organization-local calendar
  feed plus equivalent semantic month-table and agenda-list presentations; navigation month state is
  URL-owned without absence detail in the URL.
- Verified: domain/component tests pass (189 tests); PostgreSQL API integration tests pass (28
  tests), including the minimized private holiday/absence response; calendar component/axe evidence
  covers both equivalent presentations and their switch controls.
- Accessibility: a captioned weekday table and chronological agenda expose the same textual
  holiday, coverage, and status information; real buttons switch views/months without a custom
  keyboard grid, and the selected month is announced politely.
- Security/data: active self authorization is enforced on the API; no team data, identifiers, or
  browser-persisted data enters the response, and cache control is private/no-store.
- Documentation: added `docs/71-personal-calendar-agenda.md` and synchronized the task board/TODO.
- Remaining risk: cancellation/reversal, workflow decisions, and calendar-linked recalculation
  remain the following roadmap work.
- Next task: `WL-606`.

### `WL-606` — Build cancellation workflow and balance reversal

- Changed: added immutable cancellation, cancellation-segment, and cancellation-decision records;
  employee request/withdrawal and non-self current-manager-or-HR decision endpoints; explicit
  source/cancellation version checks; and a sickness-report success-state cancellation action.
  Approval changes the source status only, appends later zero calculation-effect versions for the
  exact target segments, and conditionally appends a bounded entitlement-restoration ledger fact.
- Verified: 189 unit/component tests and 2 focused PostgreSQL cancellation integration tests pass.
  The integration evidence covers partial cancellation, immutable original effect and deduction,
  exact restoration, stale-decision safety, and locked-period routing.
- Accessibility: the employee action is a real button with a clear pending state, a concise
  explanation that the original absence remains effective, focused success behavior, and asserted
  failure feedback. No new custom widget or color-only state was introduced.
- Security/data: all mutation routes require active authentication, same-origin and CSRF checks;
  employee, manager, and HR scopes are checked in the API; decisions prohibit self-approval;
  transactions are serializable; responses are private/no-store; audit facts contain no sickness
  detail. Locked targets require a post-lock adjustment rather than ordinary mutation.
- Documentation: added `docs/72-absence-cancellation.md` and synchronized TODO/task-board state.
- Remaining risk: Phase 6 needs its explicit exit-gate review and version bump. Calendar views do
  not yet expose cancellation-history detail, by design; the workflow remains auditable through
  domain records and audit history.
- Next task: `WL-607`.

### `WL-604` — Build partial-day and hourly absence support

- Changed: extended vacation and sickness request coverage from full-day ranges to schedule-relative
  first/second halves and same-date half-open minute intervals; persisted coverage now retains its
  precise segment kind and minutes, and overlap detection follows full/half/minute compatibility.
- Verified: domain and component tests pass (188 tests); PostgreSQL integration tests pass (27
  tests), including compatible opposite halves and rejection of ambiguous minute-plus-half coverage.
  The daily-effects suite retains its exact worked-plus-absence no-double-credit evidence.
- Accessibility: employee forms clearly distinguish schedule-relative halves from clock-specific
  minute coverage, with labelled conditional fields, validation summary focus, and success focus.
- Security/data: all new submissions preserve existing active-self authorization, same-origin, CSRF,
  serializable transaction, no-store, strict-contract, and sickness data-minimization boundaries.
- Documentation: added `docs/70-partial-absence-coverage.md` and synchronized the task board/TODO.
- Remaining risk: person calendar/agenda, cancellation, approval decisions, and date recalculation
  remain the following roadmap slices.
- Next task: `WL-605`.

### `WL-603` — Build sickness reporting with privacy boundaries

- Changed: added a date-only full-day sickness report with immediate effective coverage/credit,
  configurable retrospective enforcement, a `REPORTED`/`ACKNOWLEDGED` state migration, and a
  non-self current-manager/HR acknowledgement endpoint that has no second effect.
- Verified: strict unknown fields reject an attempted medical detail without echoing it; the
  PostgreSQL API fixture proves effective credit, zero entitlement, retrospective limit, and
  no-store output; component/axe coverage exercises the no-medical-detail form.
- Accessibility: explicit privacy instruction, labelled native date fields, a focused validation
  summary, and focused success confirmation keep the form keyboard complete.
- Security/data: sickness is absent from URLs/browser persistence, server audit facts, and generic
  response DTOs; mutations require active authorization, same origin, CSRF, and transactions.
- Documentation: added `docs/69-sickness-reporting-privacy.md`.
- Remaining risk: manager review UI/queue and neutral team/calendar visibility remain later Phase 7
  and WL-605 work; partial-day sickness belongs to `WL-604`.
- Next task: `WL-604`.

### `WL-602` — Build vacation request workflow

- Changed: added schedule- and holiday-aware full-day vacation range calculation, employee-owned
  CSRF-protected submission, immutable coverage persistence, pending entitlement reservation, and
  the accessible `/requests/new` self-service form.
- Verified: domain, component/axe, and PostgreSQL API integration coverage includes weekends,
  public holidays, zero-hour dates, negative projected balance, and overlap rejection.
- Accessibility: the form has native labelled date fields, focused error summary, linked errors,
  and a focused status confirmation that lists every covered day and effect.
- Security/data: submission is active-self authorized, same-origin and CSRF protected, runs in one
  serializable transaction, is no-store, and returns no internal IDs. It creates no time-calculation
  effect while pending.
- Documentation: added `docs/68-vacation-requests.md` and updated the ledger boundary.
- Remaining risk: manager/HR decision, reservation release/deduction, negative-balance override,
  and cancellation are intentionally deferred to later Phase 6 tasks.
- Next task: `WL-603`.

### `WL-601` — Implement the entitlement ledger and complete My Balances

- Changed: added the pure append-only leave-entitlement ledger calculator, canonical entry types,
  scoped PostgreSQL repository access, a forward migration from the earlier placeholder enum, and
  an owner-only My Balances leave read model with account and source-entry explanations.
- Verified: strict composite TypeScript; 182 unit/component tests; 25 PostgreSQL integration tests,
  including a concurrent duplicate-reservation fixture; formatting, ESLint, boundaries, OpenAPI
  drift, and production web/workspace builds pass.
- Accessibility: My Balances uses labelled description lists for available, reserved, and projected
  minutes plus a semantic ordered source-entry list and named pagination controls. Empty, loading,
  and error states retain the stable route heading.
- Security/data: the existing active-self authorization and `private, no-store` response boundary
  protect the new DTO. It excludes employee, organization, source, and absence-type identifiers;
  no entitlement data enters URL state or browser persistence.
- Documentation: added `docs/67-leave-entitlement-ledger.md`, updated the My Time read-model note,
  API error conventions, TODO, task board, and project status.
- Remaining risk: request submission, decision effects, negative-balance override, and
  cancellation remain intentionally unimplemented. `WL-602` owns vacation coverage calculation,
  request validation, reservation creation, and the employee form.
- Next task: `WL-602`.

### `WL-600` — Implement absence types and policy behavior

- Changed: added a framework-independent effective-dated absence-type policy model with bounded
  workflow, coverage, entitlement/reservation, timing, note, calculation-treatment, and neutral
  availability values. Added frozen MVP defaults for vacation, sickness, unpaid leave, and other
  absence; aligned `absence_types` and the deterministic seed with effective ranges and that
  shared default model.
- Verified: strict composite TypeScript; 12 focused domain tests and 8 database schema tests; and
  two database-enabled migration/seed integration tests pass. The migration uses a temporary
  `0001-01-01` backfill default for existing configuration rows, then removes it.
- Accessibility: no UI is introduced. The model fixes all team-facing projection states to neutral
  `UNAVAILABLE`, so a future screen cannot configure absence-type names into team availability.
- Security/data: sickness configuration forces report-and-acknowledge, no entitlement/reservation,
  and disabled request notes. Invalid combinations—including report-and-acknowledge plus an
  entitlement account/reservation—fail before persistence; no health detail field is introduced.
- Documentation: added `docs/66-absence-type-policy.md` and synchronized TODO, task board, and
  project status.
- Remaining risk: this slice creates neither absence requests nor entitlement effects. `WL-601`
  must use source-unique, append-only ledger entries and scoped balance DTOs.
- Next task: `WL-601`.

### `WL-506` — Pass the Phase 5 exit gate

- Changed: completed the Phase 5 gate review, added rejected-decision coverage to the correction
  integration scenario, and advanced the root plus all private workspace manifests to `0.6.0`.
- Verified: the exact Node `24.18.0`/pnpm `11.20.0` toolchain check, workspace/configuration,
  formatting, lint, boundaries, strict TypeScript, OpenAPI drift, 158 unit/component tests, 25
  database-enabled integration tests, 12 Chromium scenarios, and production/workspace builds pass.
- Accessibility: employee correction submission has labelled fields, an error summary, persistent
  textual result, and keyboard-complete controls; manager review/application use named pending and
  result states and distinguish decision from application in text.
- Security/data: the gate confirms self-only submission, current non-self direct-manager review,
  transactional approval/application, immutable raw events, audit evidence, one applied
  interpretation, and locked-period denial without an ordinary-flow mutation.
- Documentation: added `docs/65-phase-5-gate-review.md` and synchronized TODO, task board,
  project status, and shared milestone versioning.
- Remaining risk: post-lock corrections remain a Phase 8 adjustment concern; `WL-600` begins
  absence-type policy behavior without adding payroll, monitoring, or workflow-builder scope.
- Next task: `WL-600`.

### `WL-505` — Preserve original values and apply approved adjustment

- Changed: added the authorized approved-correction application endpoint and transaction. It writes
  one applied interpretation, versions the target daily projection, appends the exact recalculation
  delta to the time-account ledger, and records audit evidence.
- Verified: strict TypeScript and the PostgreSQL/API correction integration prove the approved
  application updates the projection and ledger atomically while raw punch events remain immutable.
- Accessibility: the manager review makes approval and application separate, gives the pending
  apply action explicit text, disables it while pending, and persists the exact worked/balance
  outcome or a no-effect locked-period explanation.
- Security/data: current direct-manager/non-self authorization, approval state/version, original
  projection target, and locked-month exclusion are checked in one transaction. Duplicate/stale
  application cannot create a second applied interpretation.
- Documentation: added `docs/64-approved-correction-application.md` and synchronized project
  memory.
- Remaining risk: locked-month post-lock adjustments belong to `WL-803` because this repository
  does not yet create monthly snapshots. `WL-506` owns the Phase 5 integrated gate review.
- Next task: `WL-506`.

### `WL-504` — Build manager correction review and comparison

- Changed: added a current-report-scoped manager queue, original/proposed comparison, versioned
  approve/reject/request-changes endpoint, decision persistence, and domain audit evidence.
- Verified: strict TypeScript, ESLint, boundary checks, and PostgreSQL/API integration verification
  of current-manager scope, decision persistence, and zero applied-correction rows passed.
- Accessibility: the queue and review comparison use headings, text labels, keyboard-operable
  controls, visible pending state, and a clear statement that a decision does not yet apply time.
- Security/data: manager relationship and the non-self policy are rechecked in the transaction;
  version/state conflicts produce no effect. The decision reason is retained in the decision record
  but omitted from audit facts.
- Documentation: added `docs/63-manager-correction-review.md` and synchronized project memory.
- Remaining risk: `WL-505` must apply only an approved correction through a versioned
  interpretation/recalculation or locked-period adjustment path.
- Next task: `WL-505`.

### `WL-503` — Build employee correction request form and submission

- Changed: added the self-only correction submission contract and API, a request repository and
  migration for immutable original-interpretation snapshots, atomic request/audit persistence, and
  a daily-record-linked employee form for one proposed work interval.
- Verified: strict composite TypeScript, ESLint, and the unit/component suite pass (158 tests).
  The PostgreSQL/API correction-request integration test passes with the local test database.
- Accessibility: the form gives current recorded facts before the proposal, visible labels and
  descriptions, inline errors, a focusable linked error summary, pending-state duplicate-submit
  prevention, and a persistent textual success result. DST ambiguity requires a named offset.
- Security/data: canonical-origin and CSRF checks precede a transaction-scoped active-context and
  self-only authorization check. The request stores the original/proposed interpretations and
  reason separately; audit facts omit the free-text reason. No punch event, projection, or ledger
  mutation occurs.
- Documentation: added `docs/62-employee-correction-request.md` and synchronized the task board,
  TODO, status, contract/OpenAPI source, and generated migration metadata.
- Remaining risk: `WL-504` must implement the scoped manager queue and non-self decision;
  `WL-505` alone may create an approved applied interpretation, recalculate, or affect the ledger.
- Next task: `WL-504`.

### `WL-502` — Build structured warning and missing-entry actions

- Changed: exposed structured attention on My Time summaries and daily detail; mapped stable
  warning/blocker codes to shared explanation and recovery guidance; and linked reviewable policy
  warnings to the relevant record, calculation, event list, or flexible-time balance.
- Verified: formatting, ESLint, boundaries, strict composite TypeScript, reproducible OpenAPI, all
  157 unit/component tests, all 24 database-enabled integration tests across 14 files, all 12
  Chromium scenarios, and the production web build pass.
- Accessibility: semantic named attention groups and lists retain warning/blocker text without
  relying on color. Review destinations are real links; organization-owned and pending-workflow
  issues are clear text, not misleading disabled controls.
- Security/data: only existing minimized warning codes are transported. Unknown stored codes fail
  safely; guidance never exposes absence category, sickness detail, policy/source identifiers,
  correction content, employee IDs, or actor data.
- Documentation: added `docs/61-time-record-attention.md` and synchronized the task board, TODO,
  and status.
- Remaining risk: `WL-503` owns correction request creation and audit; `WL-504`–`WL-505` own the
  review, approval, and applied adjustment path.
- Next task: `WL-503`.

### `WL-501` — Build daily record details and accessible timeline/list

- Changed: added a self-only daily-record contract, projection lookup, immutable punch-event
  reconstruction, local-midnight interval splitting, and the employee `/time-records/:recordId`
  route linked from My Time.
- Verified: formatting, ESLint, boundaries, strict composite TypeScript, reproducible OpenAPI, all
  157 unit/component tests, all 23 database-enabled integration tests across 14 files, all 12
  Chromium scenarios, and the production web build pass.
- Accessibility: the detail uses a stable route heading, semantic calculation description list,
  ordered session/event lists, textual complete/incomplete state, explicit continuation labels for
  overnight sessions, UTC offsets for repeated local times, and axe coverage.
- Security/data: self-only `ATTENDANCE_READ` is rechecked in the transaction; the scoped lookup,
  no-store response, safe not-found behavior, and minimized DTO never disclose source fingerprints,
  employee/organization IDs, correction data, or absence category.
- Documentation: added `docs/60-daily-time-record-detail.md` and synchronized the task board,
  TODO, and status.
- Remaining risk: `WL-502` owns structured missing-entry and policy-warning actions; corrections,
  manager review, and applied adjustments remain intentionally out of scope.
- Next task: `WL-502`.

### `WL-500` — Build My Time and the flexible-time portion of My Balances

- Changed: added the scoped `GET /v1/me/time` contract and repository read paths; derived posted
  ledger totals separately from eligible complete unposted projections; and replaced My Time/My
  Balances placeholders with URL-owned, explainable employee views.
- Verified: strict TypeScript, formatting, ESLint, executable boundaries, reproducible OpenAPI,
  all 155 unit/component tests, the production web build, and all 22 database-enabled integration
  tests across 14 files pass.
- Accessibility: the views preserve route-heading focus through loading; use native labelled
  controls, a captioned day-summary table, description lists, ordered ledger explanations, named
  pagination, and axe component coverage.
- Security/data: the self-only API rechecks active employee capability and `TIME_BALANCE_READ`,
  returns `private, no-store`, and omits employee, organization, actor, and source identifiers.
- Documentation: added `docs/59-my-time-and-flexible-balance.md`, regenerated OpenAPI, and
  synchronized the task board, TODO, and status.
- Remaining risk: `WL-501` owns daily event/session/break detail; `WL-502` owns structured warning
  actions. D-502 and the bounded-history scale remain release-level work.
- Next task: `WL-501`.

## Current blockers

`D-504` is implemented and no longer blocks the production gate. `D-502` remains open before the
production browser gate. Performance, deployment, restore, upgrade, diagnostic, accessibility,
and retention evidence remains explicitly owned by later Phase 10 tasks under `D-505`.

## Next task

`WL-1001 — Complete performance, pagination, and concurrency review.`

## Update rules

After every completed task, record:

- What changed.
- What was verified.
- Commands/tests run.
- New decisions or ADRs.
- Remaining risks.
- Exact next task ID.
