# WL-012 Phase 0 Exit-Gate Review

**Review date:** 2026-08-04

**Task:** `WL-012`

**Outcome:** **Passed.** Phase 1 may begin with `WL-100` when explicitly requested. This gate does not itself create scaffold files, install dependencies, commit, push, publish, release, or deploy.

## 1. Scope reviewed

- Root controls, public planning README, current status, compact TODO, detailed task board, and license.
- Product scope/non-goals, roles/permissions, domain rules/invariants, architecture, UX/accessibility, security/operations, roadmap, definition of done, open decisions, example catalog, repository structure, API conventions, seed scenarios, review checklists, technology baseline, planning audit, architecture ratification, and ADRs `0001`–`0011`.
- Current repository contents to confirm that Phase 0 remains documentation-only.

## 2. Gate result

| Phase 0 criterion | Result | Evidence |
|---|---|---|
| Every Phase 1-entry decision is resolved; later decisions have owners/deadlines | Pass | D-001/D-002/D-004 are resolved by `WL-011`; D-200/D-204 → `WL-304`, D-201/D-202 → `WL-300`, and D-502 → `WL-103`/`WL-1002`; D-203 is resolved with optional delivery owned by `WL-704` |
| At least 25 calculation/workflow examples have explicit outcomes | Pass | `docs/11-example-calculation-catalog.md` contains every ID from `EX-001` through `EX-085`, each with one accepted result; calculation, absence, monthly, authorization, reporting, and privacy evidence owners are named |
| No rule contradicts permissions, state machines, or ledgers | Pass | 95 stable invariants, complete attendance/absence/monthly transition rules, 43 permission actions, self-action overrides, immutable source history, append-only ledger/reversal rules, and exact snapshot/lock behavior agree across canonical documents |
| Every MVP feature has role, route/workflow, data owner, and test strategy | Pass | 31 application routes and three host-operator workflows have valid implementation task owners; permission, route-family, fixture, security, and task-board evidence cover each scope family |
| Non-goals are explicit | Pass | 14 explicit first-release non-goals plus bounded later ideas and the scope-control rule prevent payroll, monitoring, geolocation, native/offline, SaaS, arbitrary workflow, AI-decision, and legal-claim creep |
| Architecture boundaries/dependency directions are accepted | Pass | ADRs `0001`–`0011` are accepted; ADR `0011` and `docs/04-architecture.md` define exact imports, private packages, exports, cycle rejection, and Phase 1 negative checks |
| Exact first scaffold task is identified | Pass | `WL-100 — Initialize the private pnpm workspace, single lockfile, cycle rejection, and root tooling` |

## 3. Quantitative evidence

| Evidence | Verified value |
|---|---:|
| Stable TODO/task-board task IDs | 103, exact parity |
| Roadmap phases with objective, deliverables, and gate | 12 (`0`–`11`) |
| Accepted ADRs | 11 |
| Example fixtures | 85 contiguous IDs |
| Domain invariants | 95 unique IDs |
| Permission resource/action rows | 43 |
| Required authorization-test cases | 15 |
| Application route patterns | 31 |
| Host-operator workflows | 3 |
| Threats | 20 contiguous IDs (`T-001`–`T-020`) |
| Explicit first-release non-goals | 14 |

Counts are completeness signals, not substitutes for the linked qualitative review.

## 4. MVP ownership coverage

| Feature family | Eligible roles/operator | Route or workflow ownership | Authoritative data/rules | Planned evidence |
|---|---|---|---|---|
| Credentials, account, session, profile | Unauthenticated grant holder; self; eligible HR/system administrator | Authentication routes, `/profile`, `/employees*`, `/system/accounts`; `WL-302`, `WL-400`, `WL-900` | Better Auth PostgreSQL records plus WorkLedger account/employee/role policy | Auth/session/security integration, recovery E2E, field-minimization and accessibility checks |
| Organization, schedules, policies, holidays | Self/report read; non-self HR write | `/employees/:employeeId`, `/settings/time`, `/settings/absence`, `/settings/calendars`; `WL-900`–`WL-905` | Effective-dated PostgreSQL facts resolved through domain rules | Domain boundary fixtures, migration/integration, impact preview, complex-form accessibility |
| Attendance and daily calculation | Active employee self; current manager/HR scoped read | `/today`, `/my-time`, `/time-records/:recordId`; `WL-200`–`WL-211`, `WL-400`–`WL-505` | Immutable punches, domain engine, identified projections, time-account ledger | Unit/property, transaction/idempotency/concurrency, API, component, E2E, manual accessibility |
| Corrections and privileged adjustments | Self request; current non-self manager/HR decision; non-self HR adjustment | Type-neutral request/approval and record routes; `WL-503`–`WL-505`, `WL-803` | Versioned request/decision, preserved source, append-only recalculation/post-lock effect | Comparison/state tests, permission/self-action tests, ledger and audit reconciliation |
| Absence, entitlement, cancellation, calendars | Self; current non-self manager/HR; privacy-safe team consumers | `/my-balances`, `/requests*`, `/calendar`, `/approvals*`, `/team*`; `WL-600`–`WL-704` | Versioned policy/coverage, entitlement ledger, neutral availability DTO | 27 exact fixtures, overlap/conservation/property tests, privacy contracts, calendar/agenda equivalence |
| Monthly review, approval, lock, adjustment | Self; current non-self manager/HR | `/monthly-periods/:periodId`, approvals/requests; `WL-800`–`WL-803` | Period state/version, immutable approval snapshot, linked adjustments/ledger | 20 correction/monthly fixtures, reconciliation/race tests, original-versus-adjusted UI/accessibility |
| Reports, CSV/print, notifications, audit | Self/current report/HR by report; system administrator for technical audit only | `/reports*`, `/notifications`, `/audit`, `/system/audit`; `WL-704`, `WL-804`–`WL-805`, `WL-906`, `WL-1006` | Scoped queries and purpose DTOs; separated domain/security audit; generic notifications | Scope-before-count tests, exact CSV neutralization, export/privacy inspection, table/reflow tests |
| Self-hosting and operations | Authorized host operator; limited system-administrator diagnostics | External configure/backup/restore/upgrade workflows and `/system/operations`; `WL-1003`–`WL-1007` | PostgreSQL, validated configuration, private network/proxy, backup/restore/retention procedures | Production-style deploy, forged-header/direct-port, clean restore, migration, retention, threat and WCAG gates |

## 5. Contradiction review

The gate specifically rechecked these high-risk relationships:

- current manager scope versus historical attribution and excluded delegation;
- self-action prohibitions versus combined manager/HR/system roles;
- attendance state/revision/idempotency ordering versus immutable punch creation;
- work intervals versus break subtraction and daily credited/balance arithmetic;
- pending entitlement reservation versus final deduction/restoration;
- correction/cancellation versus preserved source, ledger, audit, and locked history;
- separate approval and lock versus snapshot immutability and post-lock adjustments;
- sickness classification versus team, URL, browser cache, notification, export, and technical boundaries;
- router/UI gates versus server authorization;
- internal package boundaries versus browser, database, domain, and contract ownership.

No live contradiction remains. Historical findings in `docs/17-planning-audit.md` are retained as audit context and marked resolved/superseded.

## 6. Verification performed

- Documentation whitespace/diff check.
- Stable-ID parity and dependency-owner validation.
- Contiguous example/threat-ID checks and per-example outcome scan.
- Route and host-workflow owner validation against the task board.
- Permission/non-goal/invariant/phase/ADR/decision metadata counts.
- Markdown table and local-link validation across root/docs files.
- Manual cross-document review of domain, authorization, accessibility, privacy, operations, and architecture boundaries.

No pnpm command was applicable: Phase 0 intentionally contains no `package.json`, `pnpm-lock.yaml`, application source, migrations, container, or executable test suite.

## 7. Remaining owned risks

- Planning outcomes are not executable evidence. Phase 1 creates enforcement infrastructure; Phase 2 and later tasks turn fixtures/contracts into tests.
- D-201/D-202 must resolve before the first application schema migration; D-200/D-204 before the shared API contract is accepted.
- D-502 needs an executable development matrix in `WL-103` and final production revalidation in `WL-1002`.
- Exact stable dependency/runtime versions must be checked and pinned during their installation task.
- At Phase 0 completion ADR `0011` boundaries were prose; `WL-102` subsequently supplied executable manifest/reference/source checks and negative fixtures.
- The public repository still needs a verified security-reporting channel under `WL-107`.
- All `T-001`–`T-020` controls, backup/restore, retention, performance, and WCAG evidence remain production gates, not Phase 0 claims.

## 8. Handoff

Phase 0 is complete. The exact next task is `WL-100`. That task may create only the private pnpm workspace/root tooling slice in its accepted scope; it must not scaffold all applications/packages early or begin feature/domain implementation.
