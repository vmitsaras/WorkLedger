# WL-1205 Cross-route Consistency and Recovery Pass

**Completed:** 2026-08-25  
**Scope:** Canonical employee, manager, HR, report, audit, and system routes after the five
workflow-family remediation slices.  
**Version:** `0.12.0` remains unchanged because `WL-1205` is not a phase exit gate.

## Outcome

The Phase 12 workflow families now use one shared visual and semantic language for alerts, route
states, panels, actions, loading, validation, permission loss, and recovery. The remaining legacy
app-owned alert/action roots were removed, and two unregistered route modules were deleted after
confirming that neither the router nor another source file imported them.

Primary route copy now describes the actor's task, current state, direct effect, and next valid
action before preservation or privacy guarantees. Those guarantees remain visible where they
affect trust or a decision. They no longer substitute for the task description.

This work closes `UI-007`, `UI-012`, and `UI-013`. Systematic visual-baseline comparison remains
`UI-014` and is intentionally assigned to the `WL-1206` release gate.

## Shared state contract

The shared `Alert` contract now supports:

- a forwarded root ref for deliberate focus after a complex validation failure or mutation result;
- an `h2` or `h3` title so nested state messages preserve heading order;
- dynamic announcement by default, with warning/danger mapped to `alert` and info/success mapped to
  `status`;
- `announce={false}` for persistent warnings and explanatory state that should be read normally but
  should not announce just because the route rendered.

Canonical loading, empty, permission-denied, not-found, and dependency-error blocks use
`RouteState`. Route-level permission and dependency failures retain a descriptive `h1`, update the
document title, receive focus, hide invalid controls, and expose only a valid parent or retry action.
Form error summaries and focused mutation feedback use one alert owner rather than duplicating the
same message in multiple live regions.

## Cross-route adoption

The consistency sweep covered:

- Today attendance recovery, calculation warnings, timeline empty/truncated states, and route
  loading/failure;
- correction, vacation, and sickness validation summaries, success results, pending controls, and
  inaccessible/missing records;
- approval detail decisions, inbox filtering errors, monthly loading, attention, submission,
  review, printing, permission loss, and dependency recovery;
- personal time and daily-record actions, notifications, calendars, reports, and report
  portability;
- schedule, policy, entitlement, absence, employee, account, audit, and operations states;
- application-shell sign-out failure and shared route boundaries.

Unregistered `manager-correction-queue-page.tsx` and `placeholder-page.tsx` were removed. Their
deletion changes no route: type-neutral approval and request routes already own those workflows.

## Copy decisions

The pass preserves the Quiet Ledger sequence: orientation, current state, next task, effect, then
supporting evidence.

Representative changes include:

| Surface | Task-first result | Preserved consequence or trust context |
|---|---|---|
| Team status | Current availability and unresolved records for direct reports | Absence subtype and medical detail remain absent |
| Correction | Original events stay available alongside the proposed correction | Approval preserves history and applies the authorized version or adjustment |
| Locked correction | Approval adds an adjustment to the locked month | The approved monthly record remains unchanged |
| Monthly print | Print the latest monthly status, totals, daily values, baseline, and adjustments | Private absence details and decision reasons are omitted |
| Effective-dated settings | The new version was created and can now be assigned | Existing employee assignments remain unchanged until an authorized assignment action |
| Approval permission loss | The current account cannot view the inbox | No approval rows, filters, or identifiers remain rendered |

Terms such as immutable, authorized, purpose-minimized, and privacy-safe remain appropriate in
technical, policy, test-name, or supporting documentation contexts. They are no longer the primary
instruction on routine task surfaces.

## Responsive, motion, and recovery evidence

Existing source order and surface-specific responsive contracts were retained. No new viewport
branch or motion dependency was introduced. The focused Chromium regression verifies:

- 320 px approval detail with a keyboard-scrollable named data region and no page-level horizontal
  overflow;
- field-linked validation, one focused alert, keyboard submission, and focused persistent success;
- forced-colors borders and focus outline on the decision action;
- `0.001s` transition duration under reduced motion;
- 390 px focus-managed navigation drawer, no dialog animation or transform under reduced motion,
  focus restoration through route navigation, and narrow team record-list presentation;
- the corresponding axe checks.

Component coverage verifies the static-alert opt-out, nested heading level, forwarded focus ref,
route permission/title behavior, recovery actions, task-first copy, and affected workflow states.

## Security and data boundary

No API contract, authorization rule, query scope, domain rule, database schema, migration, session
behavior, CSRF behavior, audit event, export rule, or browser persistence changed. Permission and
privacy copy was simplified only after confirming that the protected data remained absent. The UI
continues to reauthorize through the existing server requests and to display only the existing
purpose-limited response contracts.

## Verification boundary

Focused strict TypeScript and 88 affected component tests passed. The two focused Chromium
scenarios passed after the shared-state assertions were updated. The final repository-wide format,
lint, boundary, type, unit/component, integration, E2E, and production-build evidence is recorded
in `PROJECT_STATUS.md`.

Manual assistive-technology pairing and systematic screenshot comparison remain release-gate work
under `D-502`, `UI-014`, and `WL-1206`.
