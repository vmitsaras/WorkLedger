# WorkLedger Detailed Task Board

**Current status: WL-1508N complete under the best-effort English support amendment; full local verification passed.** No implementation task is ready. Legacy M/B/C/D remain deferred; provider enablement is an unscheduled operator decision.
Completed phases and excluded proposals are not pending assignments.

## Status values

- `Not started`
- `Ready`
- `In progress`
- `Blocked`
- `In review`
- `Done` (older rows may use `Complete`)
- `Deferred` (out of the execution queue until an explicit scheduling decision)
- `Obsolete` (excluded proposal; not an incomplete deliverable)

A failed attempt is recorded as evidence. Its task is `Blocked` until a specific prerequisite
is resolved; it is not silently reset to `Ready`. The optional pilot parent is a milestone,
not a task to execute before its children.

A task is `Done` only when `docs/09-definition-of-done.md` is satisfied. A completed phase exit-gate additionally requires the matching internal minor-version bump and a passing `pnpm run phase:check`; this does not authorize publication or deployment.

---

## Phase 0 — Product and domain contract

| ID | Task | Depends on | Acceptance evidence | Status |
|---|---|---|---|---|
| WL-001 | Audit and ratify the project charter and planning pack | None | Contradiction/missing-item audit; project status updated | Done |
| WL-002 | Finalize MVP, non-goals, assumptions, and success criteria | WL-001 | Scope files have no ambiguous MVP items | Done |
| WL-003 | Finalize roles, resource scopes, and permission matrix | WL-001 | Matrix covers all MVP actions; self-approval and admin separation explicit | Done |
| WL-004 | Finalize terminology and domain invariants | WL-001 | Shared glossary and invariant list accepted | Done |
| WL-005 | Finalize attendance state machine and idempotency rules | WL-004 | Transition table, invalid cases, retries, tabs/devices defined | Done |
| WL-006 | Finalize time-calculation rules and example catalog | WL-004, WL-005 | At least 25 cases with expected results | Done |
| WL-007 | Finalize absence, entitlement, privacy, overlap, and cancellation rules | WL-003, WL-004 | Policy matrix and ledger effects accepted | Done |
| WL-008 | Finalize monthly submission, approval, locking, and adjustment rules | WL-003, WL-004, WL-006 | State transitions and immutable snapshot rules accepted | Done |
| WL-009 | Finalize route map, screen states, responsive behavior, and accessibility criteria | WL-002, WL-003 | Every MVP workflow maps to routes/states and tests | Done |
| WL-010 | Finalize security, data classification, threat model, and operations assumptions | WL-003 | Threats and release controls accepted | Done |
| WL-011 | Ratify architecture decisions and repository boundaries | WL-002, WL-004, WL-010 | ADRs accepted; dependency direction clear | Done |
| WL-012 | Execute Phase 0 gate review | WL-002–WL-011 | Gate checklist complete; exact next task selected | Done |

---

## Phase 1 — Repository foundation

| ID | Task | Depends on | Acceptance evidence | Status |
|---|---|---|---|---|
| WL-100 | Initialize private pnpm workspace, root package scripts, one lockfile, `workspace:*` policy, and cycle rejection | WL-012 | Frozen clean install; exact workspace discovery; root/apps/packages private; no cycle or publish path | Done |
| WL-101 | Scaffold `apps/web`, `apps/api`, `packages/domain`, `contracts`, `database`, `ui`, `config`, and `test-utils` with explicit exports; do not scaffold `apps/site` yet | WL-100 | Each package builds a minimal typed public entry; only ADR `0011` edges exist; no sibling-source/deep import | Done |
| WL-102 | Configure strict TypeScript, ESM, linting, formatting, and executable import-boundary checks | WL-101 | Typecheck/lint/format pass; negative fixtures reject representative forbidden edges, deep imports, cycles, and production test/config imports | Done |
| WL-103 | Configure Vitest projects, React Testing Library, API integration harness, Playwright, axe, and CI | WL-101, WL-102 | Baseline unit, component, integration, and E2E smoke tests pass in CI | Done |
| WL-104 | Configure PostgreSQL Docker development service and test database lifecycle | WL-101 | Health check and isolated integration DB test pass | Done |
| WL-105 | Implement validated environment, canonical-origin, proxy-trust, and secret schema plus safe `.env.example` | WL-101 | Missing/placeholder/invalid production config fails clearly; secrets stay out of repo/browser/logs | Done |
| WL-106 | Initialize shadcn with React Aria base; add tokens, focus, reduced-motion, and semantic examples | WL-101, WL-102 | Story/tests for button, link, field, dialog; keyboard and axe pass | Done |
| WL-107 | Write public repository status, local setup, scripts, package boundaries, contribution, license, and verified security-reporting workflow | WL-100–WL-106 | Fresh-clone instructions verified; no runnable/release/security-support claim exceeds evidence | Done |
| WL-108 | Execute Phase 1 gate review | WL-100–WL-107 | All Phase 1 gate evidence recorded, including clean install and enforced ADR `0011` boundaries | Done |

---

## Phase 2 — Domain engine

| ID | Task | Depends on | Acceptance evidence | Status |
|---|---|---|---|---|
| WL-200 | Define domain primitives: IDs, minutes, instants, local dates, date ranges, timezone IDs, result/error types | WL-108 | Invalid construction rejected; serialization boundaries documented | Done |
| WL-201 | Implement effective-dated schedule and policy resolution | WL-200 | Gaps/overlaps/date-boundary tests pass | Done |
| WL-202 | Implement attendance-state transition validation | WL-200 | All valid/invalid transitions have stable result codes | Done |
| WL-203 | Reconstruct work and break intervals from ordered immutable events | WL-202 | Normal, multiple-session, incomplete, duplicate-order tests pass | Done |
| WL-204 | Validate manual/corrected intervals and overlap constraints | WL-200, WL-203 | Overlap, negative, future, ambiguous-local-time cases covered | Done |
| WL-205 | Calculate expected, worked, credited, and daily balance minutes | WL-201, WL-203 | Core example catalog passes | Done |
| WL-206 | Split overnight sessions at local midnight and handle DST | WL-203, WL-205 | Spring-forward, fall-back, and overnight fixtures pass | Done |
| WL-207 | Integrate paid/unpaid absence credit with daily calculation | WL-205 | Full, partial, holiday, zero-hour, and overlap tests pass | Done |
| WL-208 | Calculate time-account ledger totals and explain sources | WL-205, WL-207 | Opening, daily, correction, adjustment sequences pass | Done |
| WL-209 | Produce structured warnings and submission blockers | WL-201–WL-207 | Missing punch, schedule gap, unresolved correction, conflict codes pass | Done |
| WL-210 | Execute full domain example suite and domain-calculation review | WL-200–WL-209 | Pure-domain fixtures have executable evidence; every catalog fixture maps to a scheduled owner; review checklist complete | Done |
| WL-211 | Execute Phase 2 gate review | WL-210 | Domain package dependency audit and gate evidence | Done |

---

## Phase 3 — Data, authentication, and API foundation

| ID | Task | Depends on | Acceptance evidence | Status |
|---|---|---|---|---|
| WL-300 | Design and implement initial PostgreSQL schema and generated migrations | WL-211 | Clean migration, rollback strategy note, constraints and indexes reviewed | Done |
| WL-301 | Define repository interfaces and implement transaction boundary helpers | WL-300 | Repository integration tests and no SQL leakage outside database package | Done |
| WL-302 | Integrate Better Auth invite-only credentials, database-backed sessions, CSRF/origin controls, reset/revocation profile, and auth test utilities | WL-300, WL-105 | Accepted password/cookie/timeout/freshness/reset/rate-limit/revocation/cache profile is pinned and passes integration tests | Done |
| WL-303 | Implement employee-account link, roles, manager scope, and authorization policy functions | WL-301, WL-302 | Permission matrix integration tests pass | Done |
| WL-304 | Implement API contract schemas, error envelope, request IDs, and safe error mapping | WL-101, WL-303 | Contract tests and non-leaking error tests pass | Done |
| WL-305 | Implement append-only, audience-separated domain/security audit persistence and querying foundation | WL-301, WL-303 | Atomic audit writes, field minimization, hostile-text, role separation, and redaction tests pass | Done |
| WL-306 | Implement idempotency-key persistence and replay behavior | WL-301, WL-304 | Same-key replay and conflicting-request tests pass | Done |
| WL-307 | Implement realistic seed organization, users, schedules, balances, requests, and locked history | WL-300–WL-306 | Seed is deterministic and covers scenario catalog | Done |
| WL-308 | Expose OpenAPI and typed client generation if stable with selected contracts | WL-304 | Generated artifact reproducible; no duplicate hand-written types | Done |
| WL-309 | Execute Phase 3 gate review | WL-300–WL-308 | Migration, accepted auth/session/CSRF profile, authorization, audit, secret/config, and idempotency evidence | Done |

---

## Phase 4 — Employee attendance vertical slice

| ID | Task | Depends on | Acceptance evidence | Status |
|---|---|---|---|---|
| WL-400 | Build sign-in/recovery/reset routes, authenticated app shell, read-only profile/session surface, skip link, responsive navigation, route boundaries, and permission gates | WL-309, WL-106 | Authentication recovery, keyboard navigation, route title/focus, profile field boundary, own-session revocation/expiry, and axe tests pass | Done |
| WL-401 | Implement Today query/application service/API/client query | WL-309, WL-211 | Correct state, timeline, calculation, warnings, and permissions | Done |
| WL-402 | Implement clock-in command through domain, transaction, idempotency, audit, API, and UI | WL-401 | Duplicate click/retry and unauthorized tests; accessible success feedback | Done |
| WL-403 | Implement break-start, break-end, and clock-out commands end to end | WL-402 | Full state sequence, on-break clock-out confirmation, conflict tests | Done |
| WL-404 | Build attendance timeline/list and daily calculation breakdown | WL-401–WL-403 | Values explainable; textual alternative; responsive behavior | Done |
| WL-405 | Implement stale state, two-tab/device refresh, offline, retry, and dependency-error states | WL-402, WL-403 | E2E race/retry scenarios and clear recovery UI | Done |
| WL-406 | Execute employee-attendance accessibility and mobile review | WL-400–WL-405 | Keyboard, screen-reader smoke, zoom, forced colors, reduced motion | Done |
| WL-407 | Execute Phase 4 gate review | WL-406 | Full vertical-slice evidence recorded | Done |

---

## Phase 5 — Time records and corrections

| ID | Task | Depends on | Acceptance evidence | Status |
|---|---|---|---|---|
| WL-500 | Implement My Time week/month query and the flexible-time balance/ledger portion of My Balances with URL date state, pagination/limits, and summaries | WL-407 | Correct posted/projected totals, explainable entries, restorable non-sensitive filters, and database-enabled integration verification | Done |
| WL-501 | Build daily detail, sessions, breaks, absence credit, and accessible event list | WL-500 | Normal/incomplete/overnight days understandable | Done |
| WL-502 | Build structured warning and missing-entry actions | WL-209, WL-501 | Warning codes map to precise UI/action; no prose parsing | Done |
| WL-503 | Implement employee correction request form and submission | WL-501, WL-304 | Validation, error summary, reason, proposed impact, audit | Done |
| WL-504 | Implement manager correction queue, original/proposed comparison, and decision | WL-503, WL-303 | Scope/self-approval tests and accessible comparison | Done |
| WL-505 | Apply approved correction as version/adjustment and recalculate projections | WL-504, WL-208 | Raw event unchanged; ledger/audit updated atomically | Done |
| WL-506 | Execute Phase 5 gate review | WL-500–WL-505 | Normal, rejected, approved, locked-period scenarios pass | Done |

---

## Phase 6 — Absence and leave balances

| ID | Task | Depends on | Acceptance evidence | Status |
|---|---|---|---|---|
| WL-600 | Implement absence-type configuration model and policy validation | WL-309, WL-007 | MVP defaults and invalid combinations tested | Done |
| WL-601 | Implement entitlement ledger, pending reservation, deduction, restoration, and balance query; complete the leave portion of My Balances | WL-600, WL-500 | Ledger sequence/concurrency fixtures pass and available/reserved/projected values have an accessible source-entry view | Done |
| WL-602 | Implement vacation request calculation and form | WL-601, WL-201 | Weekends/holidays/zero-hour/insufficient balance cases pass | Done |
| WL-603 | Implement sickness reporting and acknowledgement with privacy-safe DTOs | WL-600, WL-303 | No diagnosis; team/manager/HR views differ correctly | Done |
| WL-604 | Implement half-day and hourly absence | WL-602, WL-207 | Worked-plus-absence avoids double credit | Done |
| WL-605 | Build personal calendar and agenda/list alternative | WL-602–WL-604 | Keyboard, screen-reader, mobile and equivalent-information checks | Done |
| WL-606 | Implement cancellation request, decision, and entitlement reversal | WL-601–WL-605 | No deletion; ledger and audit history correct | Done |
| WL-607 | Execute Phase 6 gate review | WL-600–WL-606 | Balance, privacy, overlap, cancellation evidence | Done |

---

## Phase 7 — Manager approvals and team availability

| ID | Task | Depends on | Acceptance evidence | Status |
|---|---|---|---|---|
| WL-700 | Build unified approval inbox with URL-owned status/type/team/date filters | WL-506, WL-607 | Restorable filters, pagination, loading/empty/error states | Done |
| WL-701 | Implement approve, reject, and changes-requested decisions consistently | WL-700 | Atomic decision effects, comments, audit, self-approval denial | Done |
| WL-702 | Build privacy-safe team current-status list | WL-401, WL-303 | Scoped data and neutral unavailable labels | Done |
| WL-703 | Build team calendar and agenda/list alternative | WL-607, WL-702 | Same information in accessible alternative; coverage warnings are textual | Done |
| WL-704 | Implement notification records, the generic in-app notification route, and optional email adapter | WL-701 | Authorized generic notification history is accessible and privacy-safe; domain decision persists when delivery fails; retry diagnostics exist | Done |
| WL-705 | Execute manager authorization and accessibility review | WL-700–WL-704 | Permission matrix and critical-flow review complete | Done |
| WL-706 | Execute Phase 7 gate review | WL-705 | Gate evidence recorded | Done |

---

## Phase 8 — Monthly closure and reporting

| ID | Task | Depends on | Acceptance evidence | Status |
|---|---|---|---|---|
| WL-800 | Implement monthly period projection, totals, warnings, blockers, and snapshot version | WL-506, WL-607 | Seeded complete/incomplete months calculate correctly | Done |
| WL-801 | Implement employee review and submit transition | WL-800 | Blocking-error and warning-acknowledgement tests | Done |
| WL-802 | Implement eligible-reviewer changes request, approval, and lock | WL-801, WL-303 | Current-manager/HR-only scope, self-denial, account-first actor migration, transaction, snapshot, and audit tests | Done |
| WL-803 | Implement post-lock correction and adjustment linkage | WL-505, WL-802 | Approved snapshot preserved; delta report correct | Done |
| WL-804 | Build monthly, balance, leave, missing-record, and approval reports | WL-800–WL-803 | Scoped queries, pagination, empty/loading/error/accessibility states | Done |
| WL-805 | Implement authorized CSV export, printable monthly record, and explicit safe clipboard behavior where offered | WL-804 | Formula/encoding/filename, permission/scope-change, field-minimization, clipboard, and print tests | Done |
| WL-806 | Execute Phase 8 gate review | WL-800–WL-805 | End-to-end close/export/adjust scenario passes | Done |

---

## Phase 9 — Administration

| ID | Task | Depends on | Acceptance evidence | Status |
|---|---|---|---|---|
| WL-900 | Build HR employee create/invite/activate/deactivate/history plus separated technical-account, system-role, and session administration routes | WL-309, WL-400 | Complex-form accessibility; deactivation revokes sessions and preserves history; HR/system fields and self-role actions remain separated | Done |
| WL-901 | Build teams, manager assignments, and effective scope changes | WL-900 | Scope changes reflected immediately; historical attribution preserved | Done |
| WL-902 | Build effective-dated schedule management | WL-201, WL-900 | Overlap/gap validation; future change does not rewrite history | Done |
| WL-903 | Build time-policy management | WL-902 | Policy preview and effective-date behavior tested | Done |
| WL-904 | Build absence-type and entitlement administration | WL-600, WL-601, WL-900 | Ledger-based adjustments and audit reasons | Done |
| WL-905 | Build holiday calendar management | WL-900 | Date-only handling and recalculation impact preview | Done |
| WL-906 | Build authorized audit explorer with filters and safe detail | WL-305, WL-400 | Scope, redaction, pagination, and accessibility tests | Done |
| WL-907 | Execute Phase 9 gate review | WL-900–WL-906 | Admin workflow and historical-integrity evidence | Done |

---

## Phase 10 — Production hardening and self-hosting

| ID | Task | Depends on | Acceptance evidence | Status |
|---|---|---|---|---|
| WL-1000 | Establish the `T-001`–`T-020` evidence register, remediate confirmed application-layer Critical/High findings, complete central permission/privacy regressions, and resolve `D-504` ownership | WL-907 | Evidence baseline and exhaustive central policy matrix; no confirmed application-layer Critical/High issue remains; downstream evidence owners are explicit | Done |
| WL-1000A | Implement the resolved `D-504` locked-period absence-cancellation adjustment contract | WL-1000 | Immutable snapshot linkage, exact entitlement/time adjustments, scoped non-self decision, concurrency/idempotency, audit/notification, minimized DTO, and original-versus-adjusted evidence pass | Done |
| WL-1001 | Test expected-scale performance, indexing, pagination, and concurrent mutations | WL-907 | Defined targets and measured results | Done |
| WL-1002 | Complete full WCAG 2.2 AA audit and remediate core-flow blockers | WL-907 | Automated plus manual report | Done |
| WL-1003 | Build production Docker Compose with the Caddy reference proxy, private API/database network, trusted-header/origin controls, health/readiness, and safe config | WL-907 | Clean production-style HTTPS deployment passes direct-port, forged-header, secret, and diagnostic-shape checks | Done |
| WL-1004 | Document and execute encrypted PostgreSQL backup and isolated clean restore | WL-1003 | Manifest/access/expiry evidence; restore uses new secrets, revokes sessions/grants, disables outbound mail, and reconciles ledgers/snapshots/audit | Done |
| WL-1005 | Document and test migration/upgrade from prior release fixture | WL-1003 | Backup, readiness/maintenance, auth-profile, upgrade/rollback, and integrity checks pass | Done |
| WL-1006 | Add allowlisted structured logging, redaction, correlation IDs, failure diagnostics, and safe system-operations/technical-audit surfaces | WL-1003 | Secret/HR/query/body/hostile-text redaction, role-separated DTOs, and healthy/degraded/dependency-failure scenarios pass | Done |
| WL-1007 | Implement/document the mandatory retention profile, class-specific purge/minimization, user export, deactivation/anonymization, and backup-expiry controls | WL-1000 | Production rejects unset classes; purge/minimization/restore tests preserve ledger/snapshot/audit integrity | Done |
| WL-1008 | Execute production release gate | WL-1000A, WL-1000–WL-1007 | Release checklist signed off and every `T-001`–`T-020` row is release-ready | Done |

---

## Phase 11 — UI/UX direction, design system, and adaptable company identity

| ID | Task | Depends on | Acceptance evidence | Status |
|---|---|---|---|---|
| WL-1100 | Audit every canonical route, role, workflow, and required state; capture responsive baselines and create a prioritized UI/UX issue register | WL-1008 | Route/state inventory, representative role baselines, and evidence-linked issue register | Done |
| WL-1101 | Define and approve the WorkLedger visual direction, content hierarchy, density rules, page archetypes, and interaction principles | WL-1100 | Direction specification resolves the registered hierarchy, density, and interaction issues | Done |
| WL-1102 | Consolidate semantic design tokens and CSS ownership; remove undefined and one-off style contracts | WL-1101 | Token inventory, ownership rules, and executable rejection of undefined contracts | Done |
| WL-1103 | Implement validated company-identity configuration for organization name, logo, favicon, and brand accent | WL-1101, WL-1102 | Runtime configuration, validation, safe fallbacks, forced-colors/zoom evidence, and no source editing | Done |
| WL-1104 | Expand the local React Aria UI system for recurring application patterns | WL-1101, WL-1102 | Actions, forms, panels, statuses, alerts, tables, filters, pagination, and route states use shared accessible contracts | Done |
| WL-1105 | Redesign the application shell, navigation, authentication surfaces, and route boundaries | WL-1102–WL-1104 | Top-level startup recovery plus responsive, keyboard, zoom/reflow, forced-colors, and reduced-motion evidence across all roles | Done |
| WL-1106 | Execute the UI-foundation phase gate | WL-1100–WL-1105 | UI foundation checklist complete; every workspace manifest is `0.12.0` | Done |

---

## Phase 12 — Workflow UX remediation and product polish

| ID | Task | Depends on | Acceptance evidence | Status |
|---|---|---|---|---|
| WL-1200 | Redesign Today attendance, calculation hierarchy, warnings, recovery, and primary clock-action feedback | WL-1106 | Representative attendance states pass task-order, comprehension, responsive, and accessibility checks | Done |
| WL-1201 | Improve personal time records, balances, calendars, notifications, profile, loading, empty, and error experiences | WL-1106 | Employee collection/detail states use consistent, recoverable patterns | Done |
| WL-1202 | Improve correction, absence, cancellation, approval-history, and monthly-review workflows | WL-1106 | Type-neutral request history/detail and end-to-end workflow-state evidence | Done |
| WL-1203 | Improve manager Team, Approvals, team-calendar, filtering, decision, and narrow-screen workflows | WL-1106 | Task-critical table context/actions remain understandable and operable at supported widths | Done |
| WL-1204 | Improve employee administration, settings, reports, audit, and system-administration surfaces | WL-1106 | Dense role surfaces use consistent hierarchy, semantics, states, and responsive strategies | Done |
| WL-1205 | Complete the cross-route microcopy, responsive, state-consistency, motion, and recovery pass | WL-1200–WL-1204 | Cross-route review closes registered consistency issues without weakening domain/privacy language | Done |
| WL-1206 | Execute visual-regression, usability, accessibility, and UI release gates | WL-1200–WL-1205 | UI release checklist complete; every workspace manifest is `0.13.0` | Done |

---

## Phase 13 — Attendance clarity, operational trust, and workflow usability hardening

| ID | Task | Depends on | Acceptance evidence | Status |
|---|---|---|---|---|
| WL-1300 | Audit Phase 12 implementation, capture deterministic baselines, and register Phase 13 references and constraints | WL-1206 | Route/component/API inventory; baseline screenshots; reference image registered; risk and contradiction report | Done |
| WL-1301 | Establish authoritative Today attendance display contract and eliminate contradictory timestamps, durations, and balances | WL-1300 | Typed display contract; coherent fixture; selector/contract tests; all visible values reconcile to one `asOf` snapshot | Done |
| WL-1302 | Implement revised Today information architecture and visual hierarchy from approved reference | WL-1301 | Desktop/tablet/mobile implementation; screenshot comparison; design-token and component review | Done |
| WL-1303 | Implement complete attendance-state matrix and reliable clock-action feedback and recovery | WL-1301, WL-1302 | State stories; mutation integration tests; duplicate/stale/offline/session-expiry/two-device Playwright evidence | Done |
| WL-1304 | Separate current session, today progress, estimated completion, provisional difference, and posted flexible-time balance | WL-1301, WL-1302 | Semantic metric hierarchy; calculation tests; no provisional-debt warning; accessible progress semantics | Done |
| WL-1305 | Rebuild Today timeline and calculation details for concise and auditable explanation | WL-1301, WL-1302, WL-1304 | Timeline/list and disclosure tests; corrected/original history representation; calculation-table evidence | Done |
| WL-1306 | Replace generic warnings with actionable attention and correction-recovery workflows | WL-1301, WL-1303, WL-1305 | Attention-item contract; actionable CTAs; blocking/non-blocking behavior; recovery integration tests | Done |
| WL-1307 | Execute dedicated Today responsive, accessibility, usability, and visual sub-gate | WL-1302–WL-1306 | 1440/1024/768/390/320 evidence; keyboard, screen-reader, axe, reflow, forced-colors, reduced-motion, usability notes | Done |
| WL-1308 | Prioritize actionable work and simplify Approval inbox filtering, actions, pagination, and narrow-screen behavior | WL-1307 | Needs-review default; URL-state tests; responsive table/card evidence; privacy and permission regression | Done |
| WL-1309 | Improve Team status comprehension, filtering, row actionability, labels, and workspace navigation | WL-1307 | Interactive overview filters; actionable rows; copy/navigation review; narrow-screen and authorization tests | Done |
| WL-1310 | Improve employee and team administration search, primary actions, route separation, dense layouts, and copy | WL-1307 | Employee search and row actions; separate Teams route; admin responsive tests; history preservation evidence | Done |
| WL-1311 | Normalize cross-route navigation, microcopy, heading focus, status semantics, card density, and table-overflow behavior | WL-1308–WL-1310 | Copy lexicon; route/nav audit; conditional overflow behavior; focus and status visual review | Done |
| WL-1312 | Complete deterministic cross-route state, visual-regression, integration, accessibility, and usability coverage | WL-1307–WL-1311 | Story/state matrix; screenshot suite; Playwright flows; axe and manual audit report; no open P0/P1 UX defects | Done |
| WL-1313 | Execute Phase 13 release gate, update evidence and documentation, and bump manifests to 0.14.0 | WL-1312 | Signed release checklist; updated roadmap/task/status/docs/screenshots; version consistency; clean CI | Done |

---

## Phase 14 — Internationalization and multilingual product experience

| ID | Task | Depends on | Acceptance evidence | Status |
|---|---|---|---|---|
| WL-1400 | Audit every user-facing string and ratify the locale, translation-key, message-ownership, formatting, and fallback architecture | WL-1313 | `docs/139-phase-14-internationalization-architecture-audit.md`; ADR 0013; `docs/140-phase-14-translation-glossary.md` | Complete |
| WL-1401 | Establish the shared typed i18n foundation, local catalog loading, locale resolution, React/React Aria integration, and bundle-budget contract | WL-1400 | Typed-key, fallback, unsupported-locale, direction, initialization, and locale-chunk tests | Complete |
| WL-1402 | Implement per-account locale persistence, signed-out device preference, initial invitation locale, profile/auth selectors, and immediate language switching | WL-1401 | `docs/142-account-locale-preferences.md`; migration, API, integration, component, axe, browser, and bundle evidence | Complete |
| WL-1403 | Replace user-facing API prose dependencies with bounded message descriptors and structured presentation data | WL-1401, WL-1402 | `docs/143-api-presentation-descriptors.md`; contract, integration, and component tests for Today attention, errors, reports, notifications, and device summaries | Complete |
| WL-1404 | Translate shared UI, route titles and boundaries, authentication, application shell, navigation, profile, validation, dialogs, and announcements | WL-1402, WL-1403 | Shared and authenticated foundations render coherently in every locale | Complete |
| WL-1405 | Translate employee workflows: Today, time and balances, records, corrections, absences, calendars, notifications, and monthly review | WL-1404 | `docs/145-employee-workflow-i18n.md`; employee critical flows pass component and browser tests in all locales | Complete |
| WL-1406 | Translate manager, HR, and system workflows, including Approvals, Team, administration, settings, reports, audit, accounts, and operations | WL-1404 | `docs/146-manager-administration-system-workflow-i18n.md`; representative manager, HR, and system workflows pass in all locales and supported layouts | Complete |
| WL-1407 | Localize print, clipboard, CSV labels/statuses, notification email, invitations, and password-reset communication | WL-1402–WL-1404 | `docs/147-generated-recipient-output-i18n.md`; output tests preserve privacy, formula neutralization, ISO dates, integer minutes, and authorization | Complete |
| WL-1408 | Complete and human-review the `en-GB`, `de-DE`, and `es-ES` catalogs and add automated catalog enforcement plus a test-only pseudo-locale | WL-1405–WL-1407 | `docs/148-wl-1408-human-catalog-review.md`; machine-verifiable catalog/pseudo-locale gate passes; German approval by Vasileios Mitsaras and Spanish approval by Sol recorded on 2026-08-27 | Complete |
| WL-1409 | Execute multilingual integration, accessibility, responsive, visual, usability, security, and upgrade verification | WL-1408 | `docs/149-wl-1409-multilingual-product-quality-gate.md`; no mixed-language workflow or open P0/P1 defect in the bounded gate | Complete |
| WL-1410 | Execute the Phase 14 release gate, update evidence and documentation, and bump manifests to 0.15.0 | WL-1409 | `docs/150-phase-14-gate-review.md`; clean full and database-backed quality gates, synchronized documentation, and ten manifests at `0.15.0` | Complete |

---

## Phase 15 — WorkLedger Insights (deterministic release complete)

The accepted deterministic product passed WL-1516 at `0.16.0` (report 165). The optional
employee AI pilot has not passed and is not a release prerequisite. D-517 repairs the execution
order without reopening completed phase gates. ADR 0014 and the accepted specifications retain
the authority, privacy, grounding, isolation and evaluation contracts. Provider deployment remains
disabled, with no model approved for deployment.

### Completed deterministic product

| ID | Task | Depends on | Acceptance evidence | Status |
| --- | --- | --- | --- | --- |
| WL-1500 | Ratify Insights product boundaries, role scopes, prohibited uses, retention, egress, privacy, evaluation, and staged-gate contracts | WL-1410 | ADR 0014; `docs/151-phase-15-insights-architecture-privacy-evaluation.md`; synchronized product, permission, architecture, accessibility, security, retention, evaluation, operations, roadmap, and project-memory contracts | Done |
| WL-1501 | Implement the deterministic Insight Service and typed native-result contracts | WL-1500 | `docs/152-wl-1501-deterministic-insight-service-contracts.md`; strict contract, current-scope authorization, safe-omission, invalid-result, and PostgreSQL permission-loss evidence | Done |
| WL-1502 | Implement employee balance-change, submission-blocker, leave-projection, and Today-explanation insights | WL-1501 | `docs/153-wl-1502-employee-insight-computations.md`; exact integer-minute/date fixtures, posted-versus-provisional semantics, source links, permission tests, and no invented policy | Done |
| WL-1503 | Build the accessible, role-scoped Insights route and native result presentation | WL-1501, WL-1502 | `docs/154-wl-1503-accessible-native-insights-route.md`; native results remain primary; authenticated no-store transport, keyboard and focus behavior, announcements, unavailable and error states, 320 pixel reflow, forced colors, reduced motion, and all supported locales pass | Done |
| WL-1504 | Add bounded contextual entry points from Today, My Time, My Balances, Requests, and Reports, then execute the Insights foundation sub-gate | WL-1502, WL-1503 | `docs/155-wl-1504-insights-foundation-gate.md`; visible removable context, no DOM/data dump, safe URL/session state, deterministic operation without Ollama, and signed foundation evidence | Done |
| WL-1508G | Reconcile Phase 15 around deterministic provider-independent Insights after the employee model pilot closes | Historical pilot closure decision; WL-1504 (not parent success) | `docs/160-wl-1508g-phase-15-deterministic-continuation.md`; accepted remaining tasks, obsolete tasks, replacement dependencies, release evidence, non-goals, and no runtime or version change | Done |
| WL-1509 | Implement deterministic manager action-summary and team-coverage insights | WL-1504, WL-1508G | `docs/161-wl-1509-manager-insights.md`; current-direct-report scope, neutral `UNAVAILABLE`, factual counts, native source actions, timezone/date boundaries, multilingual accessible Manager route, and zero provider calls | Done |
| WL-1512 | Define purpose-specific deterministic HR aggregate contracts, value sources, privacy thresholds, cohort and complement suppression, and repeated-query controls | WL-1509, WL-1508G | `docs/162-wl-1512-hr-aggregate-privacy-contract.md`; accepted ADR/data-flow review; suppression occurs before result construction; no free text, diagnosis, note, attachment, row-level sickness data, or model context | Done |
| WL-1513 | Add deterministic HR aggregate Insights only after the dedicated privacy and authorization gate passes | WL-1512 | `docs/163-wl-1513-hr-aggregate-insights.md`; purpose-specific metrics distinguish employees, cases, days, and minutes; cohort, complement, repeated-query, and scope tests prevent inference and leakage; no model, decision, or prediction output | Done |
| WL-1514 | Add deterministic isolated System Insights using allowlisted technical diagnostics only and no employee or HR data | WL-1504, WL-1508G | `docs/164-wl-1514-system-insights.md`; strict technical fact and source allowlists; honest host-owned backup limitation; current System authorization; multilingual accessible `/system/insights`; public diagnostic minimization remains intact; zero provider calls | Done |
| WL-1516 | Execute deterministic multilingual, accessibility, security, privacy, usability, provider-disabled, upgrade, and Phase 15 release gates | WL-1509, WL-1512–WL-1514 | `docs/165-wl-1516-phase-15-gate-review.md`; signed deterministic Phase 15 checklist; no accepted route depends on Ollama; provider remains disabled; no open P0/P1 defect; synchronized documentation; ten manifests at `0.16.0` | Done |

### English-only optional AI enhancement

| ID | Task | Depends on | Acceptance evidence | Status |
| --- | --- | --- | --- | --- |
| WL-1508N | Implement and evaluate optional local AI topic suggestions for Employee Insights | D-520 / ADR 0015 best-effort English amendment; completed deterministic Insights and provider controls | [Report 201](201-wl-1508n-best-effort-english-suggestions.md): full local verification passed, truthful English copy and mandatory confirmation/native execution. Separate assessment of report 200's existing 60 responses passes amended criteria: English 40/40, p95 510 ms. UNKNOWN 12/20 remains a strict failure; cold first request 20.754 seconds. Original artifacts preserved, no fresh inference or deployment | Done — bounded best-effort English support |

### Legacy optional employee interpretation pilot — deferred

[The execution plan](196-roadmap-reconciliation-and-pilot-execution-plan.md) defines the concrete
files, entry criteria, verification, evidence reuse and failure exits for these tasks. L is complete
with report 197; M is now blocked and the pilot deferred under D-519/report 198. No legacy interpretation task is ready.
B/C/D retain their task IDs and original acceptance boundaries; C adds a historical
regression preflight before its unchanged full matrix. A failed attempt does not automatically
reopen completed work or authorize another attempt.

| ID | Task | Depends on | Acceptance evidence | Status |
| --- | --- | --- | --- | --- |
| WL-1508M | Resolve report-195 fact/action completeness in one bounded implementation slice | WL-1508L (Done); accepted question-intent amendment or new causal defect evidence | [Report 198](198-wl-1508m-fact-action-recovery-disposition.md): both failures traced, 101 boundary tests passed; no supported complete repair within current contract. D-519 defers pilot; M remains unchecked. No prompt replay or new diagnosis task | Blocked |
| WL-1508B | Pass the existing two-group employee acceptance screen once | WL-1508L, WL-1508M; valid exact qualification | Fresh submission-actions 9/9, then today-posted 9/9; mandatory health, frozen sources/configuration, verified artifacts and cleanup. Report 195 is the latest failed attempt: 3/9; no second group | Blocked |
| WL-1508C | Pass historical regression preflight and the uninterrupted full evaluation | WL-1508B on the same frozen configuration | balance-summary, balance-projection and balance-closing each pass 9/9, then one unfiltered 216/216 full artifact under existing per-question acceptance. No stitched results or tuning. Reports 168/172 remain historical failures | Blocked |
| WL-1508D | Review evidence and close the optional employee pilot | WL-1508C | Exact passing candidate; applicable quality checks, privacy/security, degraded-provider native fallback, traces, localization and accessibility evidence reviewed; required skips resolved; project memory synchronized; deployment disabled | Blocked |
| WL-1508 | Pass the optional employee local AI pilot sub-gate | WL-1507, WL-1508D | Parent milestone only; evaluation infrastructure exists but all fresh acceptance and closure evidence must pass. No extra execution after D and no phase/version/deployment change | Blocked |

### Completed pilot infrastructure and historical qualification

These tasks remain done for their recorded scope. Assess relevant qualification inputs before
fresh evaluation; do not replay the history. D-515 acceptance and D-516 health residency are also
implemented (reports 188/192), and report 194 qualifies the latter lifecycle.

| ID | Task | Depends on | Acceptance evidence | Status |
| --- | --- | --- | --- | --- |
| WL-1505 | Implement a reusable read-only Insight tool registry with independent authorization and active-workspace scope | WL-1504 | `docs/156-wl-1505-read-only-insight-tool-registry.md`; narrow purpose-specific tools; deny-by-default policy metadata; current employee/manager scope; combined-role isolation; no generic query/SQL capability | Done |
| WL-1506 | Implement an AI-provider abstraction and optional local Ollama adapter with configuration, capability, and health checks | WL-1505 | `docs/157-wl-1506-ai-provider-private-ollama-adapter.md`; disabled by default, exact private origin and address pinning, local digest and capability proof, no redirects or proxy routing, bounded timeout and concurrency, cancellation, safe health, and deterministic fallback evidence | Done |
| WL-1507 | Implement employee-only Ask My Ledger interpretation, tool orchestration, structured output, cancellation, and source attribution | WL-1506 | `docs/158-wl-1507-employee-ask-my-ledger-interpretation.md`; session-only context, current self-scoped tools, exact visible scope, bounded cancellation and rate controls, strict grounded references, native value rendering, and attributed sources | Done |
| WL-1508A | Qualify one replacement private model name and exact digest | WL-1507 | Cold-start WorkLedger health passed in 4.623 seconds for `qwen2.5-coder:14b` digest `9ec8897f747e246e970bc5cfdda85d22f1123dc2e3d34978a010a75968716849` with chat, structured-output, and tool capabilities; existing provider controls remained unchanged | Done |
| WL-1508E | Qualify the remaining installed `qwen3-coder:30b` digest before resuming the regression screen | WL-1508A | Cold-start WorkLedger health passed in 45.570 seconds for exact digest `06c1097efce0431c2045fe7b2e5108366e43bee1b4603a7aded8f21689e90bca` with chat, structured-output, and tool capabilities; synthetic probe only and existing provider controls unchanged | Done |
| WL-1508F | Make Employee Insight registry execution server-owned and constrain the single provider response with the existing structured-output contract | WL-1508A, WL-1508E | `docs/specs/_root/0001-server-owned-insight-orchestration/index.md`; implementation and deterministic evidence complete; exact registry reauthorization before provider context; one tool-free schema-constrained generation; unchanged runtime validators, provider controls, endpoint, UI, and data model; no real model case | Done |
| WL-1508H | Prepare the employee pilot rerun and requalify one exact private candidate | WL-1508F, D-510 | Report 166: Windows preparation, pinned toolchain, cold health and verified isolation for the recorded tuple; zero employee cases | Done |
| WL-1508I | Implement duplicate-safe generation and bounded field diagnostics | WL-1508F, D-511 | Spec 0002; report 170: strict selection codec, bounded diagnostics, preserved grounding and deterministic verification | Done |
| WL-1508J | Implement schema-enforcement admission and material completeness | WL-1508I, D-512 | Spec 0003; report 177: schema admission, qualification tooling, material completeness, qualifiers and deterministic verification | Done |
| WL-1508K | Qualify an exact schema-enforcing provider | WL-1508J | Report 178: exact 0.33.3/qwen3.6 candidate qualified for the recorded lifecycle; report 194 supplies newer D-516 cold-health/schema evidence | Done |
| WL-1508L | Make Windows verification and staged pilot invocation reproducible; restore CI configuration | WL-1508J; implemented D-515/D-516 | [Report 197](197-wl-1508l-reproducible-verification.md): pinned children, model-disabled verification, LF checkout, bounded workers, strict stages/provenance, immutable exits and mocked stops; full local command passed 69 script, 598 unit/component, 64 integration and 52 browser tests plus build. Database repairs include authorized atomic retention. Two integration and one browser skips recorded; remote CI not run; no inference | Done |

### Excluded proposals — not queued

| ID | Proposal | Status | Requirement before scheduling |
| --- | --- | --- | --- |
| WL-1510 | Manager model interpretation | Obsolete | New scope and applicable model/privacy gates |
| WL-1511 | Natural-language report generation | Obsolete | Separately scoped product proposal |
| WL-1515 | Optional MCP adapter | Obsolete | Separate roadmap, ADR, exposure allowlist and threat review |

Portfolio presentation remains an unscheduled draft; no later phase is started by this plan.
