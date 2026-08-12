# Attendance Resilience and Recovery

**Task:** `WL-405`  
**Completed:** 2026-08-11  
**Outcome:** Complete locally. Today now converges across retries, tabs, devices, focus changes,
polling, and reconnects without optimistic attendance claims or an offline mutation queue.

## Refresh and cache boundary

The Today query keeps the existing revision/`asOf` structural-sharing guard and adds a 30-second
foreground polling interval. Returning to the tab or reconnecting always requests an authoritative
snapshot even when the normal 30-second stale window has not elapsed. Polling stops in background
tabs, and ordinary estimate refreshes retain focus and use visible `Updating…` text without a live
announcement.

When a newer attendance revision removes the control that currently owns focus, focus moves to the
updated status heading and one polite message identifies the change as coming from another tab or
device. A refresh that does not remove the focused action does not move focus. Older revisions and
older same-revision snapshots still cannot replace newer cached data or restore prior controls.

## Retry and offline boundary

Attendance mutations use `networkMode: 'always'` so TanStack Query cannot pause an intent offline
and resume it later as a queued clock event. Known-offline activation is also blocked at the UI and
command-handler boundaries. The app initializes online state from `navigator.onLine`, disables the
complete attendance control group while offline, closes an open clock-out confirmation, and states
that no action will be queued.

A transport failure or `5xx` response is retried at most twice while the browser remains online.
TanStack reuses the original immutable mutation variables, including the in-memory idempotency key,
expected revision, command, and confirmation value. `4xx` authentication, validation, domain,
idempotency, and concurrency outcomes are never retried automatically. A lost response after commit
therefore resolves through the server's terminal replay and produces one success announcement.

After reconnect, Today must refetch successfully before a new attendance intent is enabled. If the
refresh fails, the last authoritative snapshot stays visible but every attendance action remains
disabled behind one persistent dependency alert, safe request reference, and `Try again` action.
Initial-load dependency failure retains the established full-page recovery boundary.

## Accessibility and guidance

Modern Web Guidance's accessibility guide reinforced the use of native buttons, deliberate
programmatic focus, one assertive region for failures that prevent safe continuation, polite status
for ordinary convergence, and no live announcements for polling or automatic retries. The
edge-case review specifically covered repeated activation, out-of-order responses, removed focused
controls, offline startup/transition, reconnect failure, multiple tabs, and stale data.

The implementation adds no custom keyboard model, animation, timer announcement, toast-only
feedback, or ARIA-disabled simulation. Disabled native buttons are accompanied by visible recovery
text so their unavailability is not hidden from users. The phase-wide screen-reader, forced-colors,
zoom, touch, translated-content, and additional viewport review remains `WL-406`.

The Today route delegates the cohesive action-control, confirmation, offline, reconnect, and
dependency panels to a focused feature component. This keeps transport/revision orchestration in
the route without creating a second source of attendance state or calculation logic.

## Verification evidence

- Component tests prove same-key replay after a lost response, one result announcement, no automatic
  retry for terminal stale conflict, offline non-submission, reconnect-before-enable, focus-safe
  device convergence, background dependency failure, request-reference recovery, and axe behavior.
- Chromium proves lost-response retry uses one key, an offline click creates no request, reconnect
  converges before enabling controls, visibility return refreshes a stale focused tab, the removed
  action transfers focus to current status, and established attendance/authentication/responsive
  paths remain accessible.
- The established PostgreSQL/API integration continues to prove one transaction winner for
  concurrent different-key commands, matching terminal replay, stale-state conflict, immutable
  events, one revision increment, and minimized audit evidence. No server contract or transaction
  code changed in this slice.
- The database-enabled canonical gate passes 24 native checks, 153 unit/component tests,
  21 integration tests, nine Chromium scenarios, reproducible OpenAPI, formatting,
  lint/boundaries, strict TypeScript, and the production build.

## Security and data review

Idempotency keys remain memory-only request headers and never enter URLs, storage, analytics,
normal logs, or browser persistence. The client neither derives nor persists an attendance effect,
and stale snapshots cannot write into the authoritative cache. Authentication and authorization
continue to run before every original request or replay; retry does not bypass session, CSRF,
employee capability, organization scope, or endpoint authorization.

## Deferred ownership

- `WL-406` owns the phase-wide manual keyboard, screen-reader, touch, 200% zoom/reflow,
  forced-colors, reduced-motion, long/translated-content, and additional viewport review.
- `WL-407` owns the Phase 4 exit gate and version milestone after that review passes.
- `WL-1001` retains the existing production-scale/bundle-splitting work; the 30-second foreground
  query is bounded by one current employee and the existing 500-event Today source limit.
