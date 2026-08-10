# WorkLedger Detailed Task Board

## Status values

- `Not started`
- `Ready`
- `In progress`
- `Blocked`
- `In review`
- `Done`

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
| WL-107 | Write public repository status, local setup, scripts, package boundaries, contribution, license, and verified security-reporting workflow | WL-100–WL-106 | Fresh-clone instructions verified; no runnable/release/security-support claim exceeds evidence | Not started |
| WL-108 | Execute Phase 1 gate review | WL-100–WL-107 | All Phase 1 gate evidence recorded, including clean install and enforced ADR `0011` boundaries | Not started |

---

## Phase 2 — Domain engine

| ID | Task | Depends on | Acceptance evidence | Status |
|---|---|---|---|---|
| WL-200 | Define domain primitives: IDs, minutes, instants, local dates, date ranges, timezone IDs, result/error types | WL-108 | Invalid construction rejected; serialization boundaries documented | Not started |
| WL-201 | Implement effective-dated schedule and policy resolution | WL-200 | Gaps/overlaps/date-boundary tests pass | Not started |
| WL-202 | Implement attendance-state transition validation | WL-200 | All valid/invalid transitions have stable result codes | Not started |
| WL-203 | Reconstruct work and break intervals from ordered immutable events | WL-202 | Normal, multiple-session, incomplete, duplicate-order tests pass | Not started |
| WL-204 | Validate manual/corrected intervals and overlap constraints | WL-200, WL-203 | Overlap, negative, future, ambiguous-local-time cases covered | Not started |
| WL-205 | Calculate expected, worked, credited, and daily balance minutes | WL-201, WL-203 | Core example catalog passes | Not started |
| WL-206 | Split overnight sessions at local midnight and handle DST | WL-203, WL-205 | Spring-forward, fall-back, and overnight fixtures pass | Not started |
| WL-207 | Integrate paid/unpaid absence credit with daily calculation | WL-205 | Full, partial, holiday, zero-hour, and overlap tests pass | Not started |
| WL-208 | Calculate time-account ledger totals and explain sources | WL-205, WL-207 | Opening, daily, correction, adjustment sequences pass | Not started |
| WL-209 | Produce structured warnings and submission blockers | WL-201–WL-207 | Missing punch, schedule gap, unresolved correction, conflict codes pass | Not started |
| WL-210 | Execute full domain example suite and domain-calculation review | WL-200–WL-209 | All documented cases map to tests; review checklist complete | Not started |
| WL-211 | Execute Phase 2 gate review | WL-210 | Domain package dependency audit and gate evidence | Not started |

---

## Phase 3 — Data, authentication, and API foundation

| ID | Task | Depends on | Acceptance evidence | Status |
|---|---|---|---|---|
| WL-300 | Design and implement initial PostgreSQL schema and generated migrations | WL-211 | Clean migration, rollback strategy note, constraints and indexes reviewed | Not started |
| WL-301 | Define repository interfaces and implement transaction boundary helpers | WL-300 | Repository integration tests and no SQL leakage outside database package | Not started |
| WL-302 | Integrate Better Auth invite-only credentials, database-backed sessions, CSRF/origin controls, reset/revocation profile, and auth test utilities | WL-300, WL-105 | Accepted password/cookie/timeout/freshness/reset/rate-limit/revocation/cache profile is pinned and passes integration tests | Not started |
| WL-303 | Implement employee-account link, roles, manager scope, and authorization policy functions | WL-301, WL-302 | Permission matrix integration tests pass | Not started |
| WL-304 | Implement API contract schemas, error envelope, request IDs, and safe error mapping | WL-101, WL-303 | Contract tests and non-leaking error tests pass | Not started |
| WL-305 | Implement append-only, audience-separated domain/security audit persistence and querying foundation | WL-301, WL-303 | Atomic audit writes, field minimization, hostile-text, role separation, and redaction tests pass | Not started |
| WL-306 | Implement idempotency-key persistence and replay behavior | WL-301, WL-304 | Same-key replay and conflicting-request tests pass | Not started |
| WL-307 | Implement realistic seed organization, users, schedules, balances, requests, and locked history | WL-300–WL-306 | Seed is deterministic and covers scenario catalog | Not started |
| WL-308 | Expose OpenAPI and typed client generation if stable with selected contracts | WL-304 | Generated artifact reproducible; no duplicate hand-written types | Not started |
| WL-309 | Execute Phase 3 gate review | WL-300–WL-308 | Migration, accepted auth/session/CSRF profile, authorization, audit, secret/config, and idempotency evidence | Not started |

---

## Phase 4 — Employee attendance vertical slice

| ID | Task | Depends on | Acceptance evidence | Status |
|---|---|---|---|---|
| WL-400 | Build sign-in/recovery/reset routes, authenticated app shell, read-only profile/session surface, skip link, responsive navigation, route boundaries, and permission gates | WL-309, WL-106 | Authentication recovery, keyboard navigation, route title/focus, profile field boundary, own-session revocation/expiry, and axe tests pass | Not started |
| WL-401 | Implement Today query/application service/API/client query | WL-309, WL-211 | Correct state, timeline, calculation, warnings, and permissions | Not started |
| WL-402 | Implement clock-in command through domain, transaction, idempotency, audit, API, and UI | WL-401 | Duplicate click/retry and unauthorized tests; accessible success feedback | Not started |
| WL-403 | Implement break-start, break-end, and clock-out commands end to end | WL-402 | Full state sequence, on-break clock-out confirmation, conflict tests | Not started |
| WL-404 | Build attendance timeline/list and daily calculation breakdown | WL-401–WL-403 | Values explainable; textual alternative; responsive behavior | Not started |
| WL-405 | Implement stale state, two-tab/device refresh, offline, retry, and dependency-error states | WL-402, WL-403 | E2E race/retry scenarios and clear recovery UI | Not started |
| WL-406 | Execute employee-attendance accessibility and mobile review | WL-400–WL-405 | Keyboard, screen-reader smoke, zoom, forced colors, reduced motion | Not started |
| WL-407 | Execute Phase 4 gate review | WL-406 | Full vertical-slice evidence recorded | Not started |

---

## Phase 5 — Time records and corrections

| ID | Task | Depends on | Acceptance evidence | Status |
|---|---|---|---|---|
| WL-500 | Implement My Time week/month query and the flexible-time balance/ledger portion of My Balances with URL date state, pagination/limits, and summaries | WL-407 | Correct posted/projected totals, explainable entries, and restorable non-sensitive filters | Not started |
| WL-501 | Build daily detail, sessions, breaks, absence credit, and accessible event list | WL-500 | Normal/incomplete/overnight days understandable | Not started |
| WL-502 | Build structured warning and missing-entry actions | WL-209, WL-501 | Warning codes map to precise UI/action; no prose parsing | Not started |
| WL-503 | Implement employee correction request form and submission | WL-501, WL-304 | Validation, error summary, reason, proposed impact, audit | Not started |
| WL-504 | Implement manager correction queue, original/proposed comparison, and decision | WL-503, WL-303 | Scope/self-approval tests and accessible comparison | Not started |
| WL-505 | Apply approved correction as version/adjustment and recalculate projections | WL-504, WL-208 | Raw event unchanged; ledger/audit updated atomically | Not started |
| WL-506 | Execute Phase 5 gate review | WL-500–WL-505 | Normal, rejected, approved, locked-period scenarios pass | Not started |

---

## Phase 6 — Absence and leave balances

| ID | Task | Depends on | Acceptance evidence | Status |
|---|---|---|---|---|
| WL-600 | Implement absence-type configuration model and policy validation | WL-309, WL-007 | MVP defaults and invalid combinations tested | Not started |
| WL-601 | Implement entitlement ledger, pending reservation, deduction, restoration, and balance query; complete the leave portion of My Balances | WL-600, WL-500 | Ledger sequence/concurrency fixtures pass and available/reserved/projected values have an accessible source-entry view | Not started |
| WL-602 | Implement vacation request calculation and form | WL-601, WL-201 | Weekends/holidays/zero-hour/insufficient balance cases pass | Not started |
| WL-603 | Implement sickness reporting and acknowledgement with privacy-safe DTOs | WL-600, WL-303 | No diagnosis; team/manager/HR views differ correctly | Not started |
| WL-604 | Implement half-day and hourly absence | WL-602, WL-207 | Worked-plus-absence avoids double credit | Not started |
| WL-605 | Build personal calendar and agenda/list alternative | WL-602–WL-604 | Keyboard, screen-reader, mobile and equivalent-information checks | Not started |
| WL-606 | Implement cancellation request, decision, and entitlement reversal | WL-601–WL-605 | No deletion; ledger and audit history correct | Not started |
| WL-607 | Execute Phase 6 gate review | WL-600–WL-606 | Balance, privacy, overlap, cancellation evidence | Not started |

---

## Phase 7 — Manager approvals and team availability

| ID | Task | Depends on | Acceptance evidence | Status |
|---|---|---|---|---|
| WL-700 | Build unified approval inbox with URL-owned status/type/team/date filters | WL-506, WL-607 | Restorable filters, pagination, loading/empty/error states | Not started |
| WL-701 | Implement approve, reject, and changes-requested decisions consistently | WL-700 | Atomic decision effects, comments, audit, self-approval denial | Not started |
| WL-702 | Build privacy-safe team current-status list | WL-401, WL-303 | Scoped data and neutral unavailable labels | Not started |
| WL-703 | Build team calendar and agenda/list alternative | WL-607, WL-702 | Same information in accessible alternative; coverage warnings are textual | Not started |
| WL-704 | Implement notification records, the generic in-app notification route, and optional email adapter | WL-701 | Authorized generic notification history is accessible and privacy-safe; domain decision persists when delivery fails; retry diagnostics exist | Not started |
| WL-705 | Execute manager authorization and accessibility review | WL-700–WL-704 | Permission matrix and critical-flow review complete | Not started |
| WL-706 | Execute Phase 7 gate review | WL-705 | Gate evidence recorded | Not started |

---

## Phase 8 — Monthly closure and reporting

| ID | Task | Depends on | Acceptance evidence | Status |
|---|---|---|---|---|
| WL-800 | Implement monthly period projection, totals, warnings, blockers, and snapshot version | WL-506, WL-607 | Seeded complete/incomplete months calculate correctly | Not started |
| WL-801 | Implement employee review and submit transition | WL-800 | Blocking-error and warning-acknowledgement tests | Not started |
| WL-802 | Implement manager changes request, approval, and lock | WL-801, WL-303 | Scope/self-approval, transaction, snapshot, audit tests | Not started |
| WL-803 | Implement post-lock correction and adjustment linkage | WL-505, WL-802 | Approved snapshot preserved; delta report correct | Not started |
| WL-804 | Build monthly, balance, leave, missing-record, and approval reports | WL-800–WL-803 | Scoped queries, pagination, empty/loading/error/accessibility states | Not started |
| WL-805 | Implement authorized CSV export, printable monthly record, and explicit safe clipboard behavior where offered | WL-804 | Formula/encoding/filename, permission/scope-change, field-minimization, clipboard, and print tests | Not started |
| WL-806 | Execute Phase 8 gate review | WL-800–WL-805 | End-to-end close/export/adjust scenario passes | Not started |

---

## Phase 9 — Administration

| ID | Task | Depends on | Acceptance evidence | Status |
|---|---|---|---|---|
| WL-900 | Build HR employee create/invite/activate/deactivate/history plus separated technical-account, system-role, and session administration routes | WL-309, WL-400 | Complex-form accessibility; deactivation revokes sessions and preserves history; HR/system fields and self-role actions remain separated | Not started |
| WL-901 | Build teams, manager assignments, and effective scope changes | WL-900 | Scope changes reflected immediately; historical attribution preserved | Not started |
| WL-902 | Build effective-dated schedule management | WL-201, WL-900 | Overlap/gap validation; future change does not rewrite history | Not started |
| WL-903 | Build time-policy management | WL-902 | Policy preview and effective-date behavior tested | Not started |
| WL-904 | Build absence-type and entitlement administration | WL-600, WL-601, WL-900 | Ledger-based adjustments and audit reasons | Not started |
| WL-905 | Build holiday calendar management | WL-900 | Date-only handling and recalculation impact preview | Not started |
| WL-906 | Build authorized audit explorer with filters and safe detail | WL-305, WL-400 | Scope, redaction, pagination, and accessibility tests | Not started |
| WL-907 | Execute Phase 9 gate review | WL-900–WL-906 | Admin workflow and historical-integrity evidence | Not started |

---

## Phase 10 — Production hardening and self-hosting

| ID | Task | Depends on | Acceptance evidence | Status |
|---|---|---|---|---|
| WL-1000 | Complete `T-001`–`T-020` threat-model remediation and permission/privacy regression suite | WL-907 | Every control has evidence and no unresolved Critical/High issue remains | Not started |
| WL-1001 | Test expected-scale performance, indexing, pagination, and concurrent mutations | WL-907 | Defined targets and measured results | Not started |
| WL-1002 | Complete full WCAG 2.2 AA audit and remediate core-flow blockers | WL-907 | Automated plus manual report | Not started |
| WL-1003 | Build production Docker Compose with the Caddy reference proxy, private API/database network, trusted-header/origin controls, health/readiness, and safe config | WL-907 | Clean production-style HTTPS deployment passes direct-port, forged-header, secret, and diagnostic-shape checks | Not started |
| WL-1004 | Document and execute encrypted PostgreSQL backup and isolated clean restore | WL-1003 | Manifest/access/expiry evidence; restore uses new secrets, revokes sessions/grants, disables outbound mail, and reconciles ledgers/snapshots/audit | Not started |
| WL-1005 | Document and test migration/upgrade from prior release fixture | WL-1003 | Backup, readiness/maintenance, auth-profile, upgrade/rollback, and integrity checks pass | Not started |
| WL-1006 | Add allowlisted structured logging, redaction, correlation IDs, failure diagnostics, and safe system-operations/technical-audit surfaces | WL-1003 | Secret/HR/query/body/hostile-text redaction, role-separated DTOs, and healthy/degraded/dependency-failure scenarios pass | Not started |
| WL-1007 | Implement/document the mandatory retention profile, class-specific purge/minimization, user export, deactivation/anonymization, and backup-expiry controls | WL-1000 | Production rejects unset classes; purge/minimization/restore tests preserve ledger/snapshot/audit integrity | Not started |
| WL-1008 | Execute production release gate | WL-1000–WL-1007 | Release checklist signed off | Not started |

---

## Phase 11 — Portfolio presentation

| ID | Task | Depends on | Acceptance evidence | Status |
|---|---|---|---|---|
| WL-1100 | Scaffold Astro project site and case-study information architecture | WL-1008 | Accessible public shell and project narrative | Not started |
| WL-1101 | Add safe demo mode, demo accounts, reset, and clear data disclaimer | WL-1008 | Demo cannot expose production-style secrets; deterministic reset | Not started |
| WL-1102 | Publish architecture, domain, accessibility, security, and tradeoff documentation | WL-1100 | Diagrams/text match implementation | Not started |
| WL-1103 | Add screenshots, workflow media, and example calculations | WL-1100, WL-1101 | Media has alternatives/captions and reflects real states | Not started |
| WL-1104 | Finalize public README, setup, scripts, limitations, and roadmap | WL-1100–WL-1103 | Fresh-user documentation review | Not started |
| WL-1105 | Execute portfolio release gate | WL-1100–WL-1104 | Public quality checklist complete | Not started |
