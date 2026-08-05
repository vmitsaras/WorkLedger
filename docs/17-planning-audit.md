# WL-001 Planning Pack Audit

**Audit date:** 2026-08-04
**Task:** `WL-001`
**Original outcome:** Ratified as the working contract for the remaining Phase 0 tasks; Phase 0 was incomplete at `WL-001`. `WL-012` later passed the superseding gate in `docs/19-phase-0-gate-review.md`.

## Scope reviewed

- Root project controls: `AGENTS.md`, `README.md`, `CODEX_MASTER_PROMPT.md`, `PROJECT_STATUS.md`, and `TODO.md`.
- Product, domain, architecture, UX/accessibility, security/operations, roadmap, task-board, definition-of-done, decision, example, repository, API, seed, review, and technology documents under `docs/`.
- ADRs `0001` through `0010` at the original audit; `WL-011` later ratified them and added boundary ADR `0011`.
- Repository state, license file, task identifiers, and current file layout.

## Ratification evidence

- The project consistently starts with the product/domain contract, then repository foundations, then the framework-independent domain engine. Product code is explicitly blocked until Phase 0 passes.
- The compact TODO and detailed task board contain the same 103 stable task IDs.
- All 11 implementation phases have an objective, deliverables, and an exit gate in the roadmap; the detailed task board supplies task dependencies and acceptance evidence.
- Package ownership and dependency direction consistently keep business rules in `packages/domain`, persistence in `packages/database`, HTTP orchestration in `apps/api`, and presentation in `apps/web` and `packages/ui`.
- The time model covers real instants, IANA timezones, organization-local dates, integer minutes, effective dates, overnight splitting, and daylight-saving transitions.
- Authorization, self-approval prevention, immutable history, ledger effects, idempotency, concurrency, locking, CSV safety, backup, restore, and sensitive-data minimization are represented before their implementation phases.
- WCAG 2.2 AA, keyboard completion, focus behavior, validation, live-region restraint, equivalent calendar views, reduced motion, zoom/reflow, forced colors, and touch use are represented in acceptance criteria.
- At this audit the example catalog contained 45 numbered cases, exceeding the numerical minimum of 25. Later Phase 0 tasks expanded and made the catalog exact through `EX-085`; `WL-012` verifies the superseding gate result.

## Findings and required follow-up

| ID | Finding | Effect | Resolution owner |
|---|---|---|---|
| PA-001 | Approval delegation is listed as post-MVP in `docs/01-scope-and-non-goals.md`, while the authorization model, data areas, and `EX-042` treat active delegation as usable scope. | The permission model and tests cannot be finalized consistently. | Resolve `D-005` during `WL-003`; until then, assume delegation grants no MVP access. |
| PA-002 | Departments are included in MVP organization scope, but the roadmap, task board, route map, seed plan, and target repository structure cover teams only. | An MVP data concept has no implementation or acceptance owner. | Resolve `D-006` during `WL-002`; either remove departments from MVP or add explicit ownership and tasks. |
| PA-003 | Sign-in/password-recovery screens and routes are required by the accessibility test matrix and authentication scope but are not present in the route map or assigned clearly to an implementation task. | A critical user journey could fall between the API foundation and application shell tasks. | Define routes, states, accessibility criteria, and task ownership in `WL-009`, then reconcile the task board. |
| PA-004 | `/my-balances` is an MVP route for flexible-time and leave ledgers, but no task explicitly owns the complete employee-facing balance view. | A named MVP route could be left as an unimplemented shell. | Assign the route to a bounded Phase 5/6 task during `WL-009` and reconcile dependencies. |
| PA-005 | `/profile` appears in navigation and the employee role includes profile access, but its fields, security boundary, routes, and implementation task are unspecified. | Account and HR-owned profile data could be mixed accidentally. | Define the minimum self-service profile/session scope in `WL-002`, `WL-003`, `WL-009`, and `WL-010`. |
| PA-006 | `EX-018` and `EX-019` defer exact DST instants/results; `EX-035` permits two alternative outcomes; `EX-044` does not choose reject-versus-filter behavior. | Not every catalog case has one executable expected result, so the Phase 0 example gate is not yet satisfied. | Make DST fixtures exact in `WL-006`, submitted-period behavior exact in `WL-008`, and scoped-report behavior exact in `WL-003`/`WL-010`. |
| PA-007 | `D-001` through `D-004` remain recorded as proposals even though the repository name, remote, `LICENSE`, seed locale, and internal-package direction provide partial evidence. | Phase 1 entry decisions are not formally ratified. | Confirm the evidence and convert each decision to an accepted or deferred record during `WL-002` and `WL-011`. |
| PA-008 | The root README and master prompt referenced a repository-local `.agents/` directory that does not exist. | First-run documentation described files that cannot be copied or reviewed. | Corrected as part of `WL-001`; Codex skills remain environment-provided rather than repository content. |

## Resolution tracking

- `PA-001`: resolved by `WL-002` and `WL-003`; delegation is excluded and grants no access.
- `PA-002`: resolved by `WL-002`; teams are the only MVP organization grouping.
- `PA-003`: resolved by `WL-009`; `/sign-in`, `/forgot-password`, and `/reset-password` now have route/state/accessibility contracts and `WL-302`/`WL-400` ownership.
- `PA-004`: resolved by `WL-009`; `WL-500` owns the flexible-time balance/ledger surface and `WL-601` completes `/my-balances` with the leave-entitlement surface.
- `PA-005`: resolved by `WL-002`, `WL-003`, `WL-009`, and `WL-010`; `/profile` is read-only for HR-owned facts, session DTOs omit tokens, protected cache is memory-only/no-store, reset grants have bounded same-origin handling, and session/security task ownership is explicit.
- `PA-006`: resolved by `WL-003`, `WL-006`, and `WL-008`; scoped reports, exact DST fixtures, and submitted-period outcomes now each have one accepted result.
- `PA-007`: resolved by `WL-002` and `WL-011`; the repository is the public `vmitsaras/WorkLedger` project, the existing MIT license is accepted, and all MVP workspace packages remain private/internal under ADR `0011`.
- `PA-008`: resolved by `WL-001`.

## Non-blocking clarifications

- Attachment concepts in authorization, data classification, and future data areas are treated as safety requirements for a later feature, not authorization to implement attachments in the MVP.
- Cross-organization denial tests remain intentional defense in depth even though one organization per installation is the MVP deployment model.
- The separate `APPROVED` and `LOCKED` monthly states remain intentional; `WL-008` resolved D-400 with separate explicit manager actions and no MVP combined/automatic policy mode.
- The example catalog is planning evidence only. `WL-012` later accepted all 85 single-outcome cases; `WL-210` must map the applicable cases to executable domain tests and later phase tasks own their integration/E2E evidence.

## Gate assessment

`WL-001` is complete because the planning pack has been reviewed, contradictions and missing ownership have been recorded, task-ID parity has been verified, and follow-up work has explicit owners.

At `WL-001`, the Phase 0 exit gate was not passed and the next task was `WL-002`. That historical assessment is superseded by the passed `WL-012` review in `docs/19-phase-0-gate-review.md`; the current next task is `WL-100`.
