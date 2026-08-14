# Manager authorization and accessibility review

**Task:** `WL-705`

## Outcome

The Phase 7 manager surfaces retain the accepted current-manager-or-HR boundary, non-self decision
rule, and privacy-minimized team/notification contracts. The review found no authorization grant
that bypasses the central policy. It added endpoint-level evidence for the denial matrix and fixed
four accessibility defects in the approval decision flow.

`D-352` should remain resolved as implemented. An authenticated-account-first decision actor with
explicit `CURRENT_MANAGER` or `ORGANIZATION_HR` authority and optional employee evidence is the
right model for HR-only approvals: it preserves attribution without inventing an employee record,
and it keeps combined-role self-denial independent from whether an employee link exists.

## Permission matrix

| Case | Approval and team result | Evidence |
|---|---|---|
| No authenticated session | Protected routes return `401`; no workflow data is serialized | API integration and shared auth pre-handlers |
| Inactive account with an existing cookie | Context is rejected as expired with `401` | Approval PostgreSQL integration |
| Employee-only account | No approval/team navigation grant; direct approval inbox access returns `403` | Route component and API integration |
| Manager with active employee capability | Inbox, detail, status, and calendar are limited to current direct reports | Central policy plus approval/team PostgreSQL integration |
| Missing employee link where manager scope requires it | Manager collection scope is denied; it is never treated as organization scope | Central authorization policy unit coverage |
| Former or unrelated manager | Rows are absent before count/page construction; direct detail returns `403` | Approval/team PostgreSQL integration |
| Manager reviewing their own item | Own rows are excluded and direct detail is denied | Approval PostgreSQL integration and central policy |
| HR account without an employee link | Organization-scoped inbox/team reads and decisions are allowed and attributed to the account with `actor_employee_id = null` | Approval/team PostgreSQL integration and `D-352` migration evidence |
| Linked HR or combined HR/manager reviewing self | Own rows are excluded and direct detail returns `403` | Approval PostgreSQL integration and central policy |
| System-administrator-only account | Approval and team routes return `403`; technical role is not an HR grant | Approval/team PostgreSQL integration |
| Cross-organization identifier | Organization-scoped lookup returns non-disclosing `404` | Approval PostgreSQL integration and central policy cross-organization coverage |
| Foreign notification identifier | Dismissal returns the same `404` as a missing record | Approval/notification PostgreSQL integration |

Authorization is resolved from current account roles, employee capability, effective direct-manager
assignment, organization, and organization-local date inside the same transaction as each read or
decision. Inbox scope is applied before filters, totals, sorting, team options, and pagination.
Detail and decision routes re-resolve the source target and current authority. Every decision uses
serializable state/version checks, same-origin CSRF protection, account-first actor evidence, and a
domain audit event.

## Accessibility review and fixes

The review followed the repository's WCAG 2.2 AA contract and current Modern Web Guidance for
native forms, tables, filters, pagination, async status, and equivalent calendar presentations.
The critical path remains semantic and keyboard complete: real links navigate; native buttons and
form controls act; captioned tables retain row/column relationships; agenda and month views expose
the same neutral availability; status is textual rather than color-only.

Four defects were fixed:

1. The approval route first focused its loading heading, then removed it when the authorized detail
   arrived. The final review heading now receives focus once for each loaded approval.
2. A short decision reason produced only a focused alert summary. The textarea now also exposes
   `aria-invalid`, references a visible field error, and clears the error relationship when edited.
3. The absence-coverage table overflowed at 320 px but its named scroll region was not keyboard
   focusable. The region now participates in the tab order while page-level horizontal overflow
   remains absent.
4. `buttonVariants` was reused correctly on native buttons and real links, but its focus ring only
   recognized React Aria's `data-focus-visible` state. It now also supports the native
   `:focus-visible` pseudo-class, including forced-colors presentation.

Approval result counts, team refresh completion, notification refresh completion, and calendar
month/date changes now use bounded polite live feedback. Dependency errors on team and
notification surfaces are alerts; initial loading remains `aria-busy` without repeated live noise.

## Critical-flow evidence

- Approval inbox: URL restoration, strict privacy-safe filters, date validation, clear/reset,
  global pagination, current-manager/HR scope, keyboard focus retention, browser back, permission
  loss, 320 px reflow, named table scrolling, and axe.
- Approval decision: final-heading focus after async load, linked field error plus focused summary,
  keyboard submission, pending disablement, success/conflict focus, negative-balance override,
  keyboard-scrollable coverage, 320 px reflow, reduced motion, forced-colors focus, and axe.
- Team status/calendar: current-scope projection, neutral labels, equivalent month/agenda content,
  selected-date feedback, HR-only access, employee/system denial, contained narrow scrolling,
  empty/error states, reduced motion, and axe.
- Notifications: self-only generic history, retained focused dismissal, generic delivery state,
  polite completion, dependency failure, pagination, 320 px reflow, and axe.

Automated axe and accessibility-tree assertions catch a meaningful subset of defects but do not
prove WCAG conformance or real assistive-technology usability. The Phase 7 gate should retain a
short manual smoke with VoiceOver or NVDA, Windows High Contrast/forced colors, keyboard-only
decision and filtering, and browser zoom/reflow before release evidence is considered complete.

## Verification commands

- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` — 24 repository-contract tests and 219 unit/component tests passed
- `pnpm test:integration` — 8 environment-independent tests passed; 25 database tests skipped
  because this command had no database URL
- `pnpm db:test` — 17 canonical live PostgreSQL tests passed
- focused live PostgreSQL approval/team command — 2 tests passed, including the expanded matrix
- `pnpm test:e2e` — 16 Chromium tests passed
- `pnpm build` — passed with the pre-existing main-chunk size warning
