# Phase 4 Gate Review

**Review date:** 2026-08-12

**Task:** `WL-407`

**Outcome:** Passed. The employee-attendance vertical slice is complete. Phase 5 may begin with
`WL-500`; this gate does not authorize payroll behavior, correction workflows, absence/approval
behavior, a production deployment, package publication, Git tag, container release, or supported
external release.

## Reviewed scope

The review covers `WL-400` through `WL-406`, the authenticated application shell and account entry,
the organization-local Today read model, the complete attendance command sequence, timeline and
calculation presentation, retry/offline/device convergence, the accessibility/mobile review, the
Phase 4 roadmap/task-board entries, and the applicable domain, security, privacy, accessibility,
and definition-of-done contracts.

## Exit-criterion evidence

| Criterion | Result | Evidence |
|---|---|---|
| The complete attendance flow works across web, API, database, domain, audit, and tests | Pass | Pure-domain transition and reconstruction tests define `OFF_WORK`, `WORKING`, and `ON_BREAK`; PostgreSQL/API integration executes clock in, break, resume, ordinary clock out, and confirmed active-break clock out through authorization, CSRF, idempotency, revision locking, trusted server time, immutable punches, audit, and terminal results; Chromium completes the same state sequence through the real web application. |
| Duplicate clicks and lost responses do not duplicate events | Pass | The UI disables the complete action group for one in-memory intent. Lost-response browser/component tests retry with the identical idempotency key and expose one result. PostgreSQL/API tests prove matching concurrent requests have one transaction winner and one replay, changed fingerprints conflict, stale revisions have no effect, and rejected/replayed commands do not increment revision or append punches/audit evidence. |
| Two tabs/devices converge on server truth | Pass | Today rejects older revisions and older same-revision snapshots, polls only in the foreground, and always refetches on focus/reconnect. Component and Chromium tests update the server fixture from another device, remove the stale focused action, move focus only when that action becomes invalid, and expose one concise current-status result. |
| Current state and result are announced appropriately without timer spam | Pass | Pending actions expose a stable pending name and busy state; success/replay/device convergence use one polite `status`; terminal conflict, offline, and dependency failure use one persistent `alert`; route and state focus move only under the documented focus contract. Polling, elapsed time, and automatic retry loops create no live-region narration. The expected-announcement matrix and Playwright CLI accessibility-tree smoke are recorded in `docs/57-employee-attendance-accessibility-review.md`. |
| Keyboard-only and mobile completion pass | Pass | Chromium completes every attendance action with keyboard input, verifies modal entry/Escape restoration/confirmation, and completes clock-in with touch emulation at 390 × 844. The ten-width 320–1920 px matrix preserves task order, valid actions, 24 × 24 px minimum targets, and page-level reflow; reduced motion and forced colors retain the workflow. |
| Loading, offline, conflict, permission, and server-error states exist | Pass | Today renders a named loading indicator and route heading, offline initial/loaded states that never queue a command, stale/domain conflict with authoritative refetch, explicit non-leaking permission denial, session-expiry sign-in recovery, full-page dependency failure, stale-content background dependency failure, safe request references, and retry paths. Component, API integration, and Chromium tests cover the applicable focus, announcement, no-effect, no-leak, and recovery behavior. |
| The user can explain the displayed daily balance | Pass | The API returns server-calculated integer-minute scheduled, holiday/absence reduction, expected, worked, break, absence-credit, adjustment, credited, and signed balance values with provisional/incomplete status and structured signals. Today presents three semantic description-list groups and explicit equations, explains zero-expected holidays before positive credit, preserves timezone/event order context, and never labels the projection final or payroll overtime. Domain, API, component, 320 px long-content, and axe tests cover the arithmetic and presentation. |

## Cross-cutting review

| Area | Gate conclusion |
|---|---|
| Domain invariants | Punch events remain immutable, event sequences and attendance revisions increase exactly once per original success, breaks occur only inside work sessions, active-break clock-out appends `BREAK_END` before `CLOCK_OUT` at one instant, and the calculation uses integer minutes and Temporal organization-local boundaries. Browser code formats server results and does not own authoritative transition or calculation rules. |
| Authorization and transaction boundaries | Every Today read and attendance mutation requires active employee capability and organization scope at the API. Unsafe commands require configured-origin and session-bound CSRF validation. Mutations repeat authorization inside one serializable transaction and atomically persist punch/revision/audit/idempotency outcome; self browser state and route visibility are not authorization evidence. |
| Retry, concurrency, and cache safety | Idempotency keys remain memory-only headers and do not enter URLs or browser persistence. Only online transport/`5xx` failures receive bounded same-key retry; terminal `4xx` outcomes do not. Offline commands never pause into a queue. Revision-aware query structural sharing prevents an older snapshot from restoring invalid controls. |
| Accessibility | The slice uses native buttons/links/forms, React Aria modal behavior, one route `h1`, deliberate route/status focus, concise live regions, semantic description and ordered lists, visible solid focus, forced-colors boundaries, reduced motion, keyboard and touch equivalence, 320 px reflow, long-content wrapping, ordinary-mode axe, and documented accessibility-tree announcement expectations. Actual named OS screen-reader/browser and physical-device output is not claimed. |
| Privacy and minimization | Today responses are private/no-store and omit organization, employee, actor, command, absence-detail, and policy-detail identifiers. Errors and permission denial reveal no target attendance data. No attendance value, idempotency key, sickness context, or form payload is persisted in browser storage, URL state, analytics, or telemetry. |
| Documentation and scope | `docs/51` through `docs/57`, README, task board, TODO, roadmap, and project status describe the same completed boundary. Phase 4 did not add correction, absence, approval, payroll, monitoring, arbitrary workflow, multi-tenant, or native-mobile scope. |

## Verification

The loopback PostgreSQL service became healthy and the database-enabled canonical gate passed:

- exact pnpm `11.20.0` and Node `24.18.0` toolchain, workspace, phase-version, configuration, and
  OpenAPI drift checks;
- Prettier, ESLint, strict composite TypeScript, and the 132-file/475-import boundary scan;
- 24 native repository-contract tests;
- 24 unit/component files with 153 tests;
- all 14 integration files with 21 tests and no database skips;
- 12 Chromium scenarios covering the critical flow, axe, concurrency/recovery, responsive/touch,
  forced-colors, and reduced-motion behavior; and
- the Vite production build plus all eight emitted workspace entries.

The build retains the known 543.37 kB main-chunk warning. It is not a Phase 4 correctness,
accessibility, or security failure and remains owned by `WL-1001`; the warning is not suppressed.

## Versioning

Completing `WL-407` is the fifth zero-indexed phase gate. The root and all eight private workspace
manifests advance together from `0.4.0` to `0.5.0`; `phase:check` confirms five sequentially
completed gates and the shared version.

This is an internal milestone only. It creates no Git tag, npm publication, container image, GitHub
release, deployment, supported-version promise, or compatibility guarantee.

## Handoff

The exact next task is `WL-500`: implement My Time week/month queries and the flexible-time
balance/ledger portion of My Balances with URL-owned non-sensitive date/view/pagination state,
correct posted/projected totals, explainable source entries, and scoped API/database behavior. It
must reuse the existing immutable attendance, calculation, ledger, authorization, and route/query
ownership contracts without turning cached projections into a second source of truth.
