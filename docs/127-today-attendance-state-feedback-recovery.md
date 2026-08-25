# Today attendance state, feedback, and recovery matrix

**Task:** `WL-1303`  
**Completed:** 2026-08-25  
**Outcome:** Today now has explicit state stories for every authoritative attendance state and a
complete action-feedback/recovery contract for pending, replay, stale, offline, dependency,
permission, session-expiry, and other-device transitions.

## Scope and classification

This is a React application route with an asynchronous status/action-helper pattern. It is not a
custom ARIA widget and adds no custom keyboard model or DOM lifecycle event. React Router owns the
route and permission presentation, TanStack Query owns the in-memory Today snapshot and mutations,
and the API remains authoritative for attendance state, revision, valid actions, and terminal
outcomes.

This slice preserves the `WL-1301` display contract and the `WL-1302` layout. It changes no domain
transition, API schema, database record, calculation, timeline, warning, CSS token, or dependency.

## Authoritative attendance stories

| State | Trigger / entry condition | Visual UI | DOM / semantic state | Keyboard behavior | Expected screen-reader information | CSS / classes | Lifecycle event | Automated evidence | Documentation | Risk |
|---|---|---|---|---|---|---|---|---|---|---|
| `OFF_WORK` | Server snapshot has `state: OFF_WORK` | Off work, no active session, one Clock in action | Focusable status `h2`; labelled action group; real submit button | Tab to Clock in; Enter or Space submits | Status, no-active-session text, and Clock in are likely exposed in reading order | Existing `wl-today-overview`, `wl-today-action-footer` | Today query success | Component state story; keyboard sequence E2E | This file; `docs/05-ux-accessibility.md` section 9 | High if any non-authoritative action appears |
| `WORKING` | Server snapshot has `state: WORKING` | Working, start/current interval, Start break and direct Clock out | Focusable status `h2`; two real submit buttons in the labelled group | Native activation for either action | Working state, interval context, and both valid actions are likely exposed | Existing Today task/action classes | Today query success | Component state story; component and E2E command sequence | This file | High if break or clock-out is missing or optimistic |
| `ON_BREAK` | Server snapshot has `state: ON_BREAK` | On break, break start/current interval, Resume work and Clock out | Focusable status `h2`; Resume is a submit button; Clock out is a dialog trigger | Resume activates natively; Clock out opens the named dialog; Escape cancels | On-break context and both actions are likely exposed; dialog supplies title, consequence, Cancel, and confirm action | Existing action group and `wl-dialog-modal` | Today query success; dialog open/close | Component state story; component and E2E dialog flow | This file | High if Clock out bypasses confirmation |
| Incomplete calculation | Calculation is `INCOMPLETE` while attendance state remains authoritative | State/actions remain; estimate says Not available; blockers explain why | Danger status text and semantic attention content; no fabricated total | Attendance actions remain native when otherwise safe | State and blocker text are likely exposed without a false final amount | Existing status and attention classes | Today query success | Component incomplete-calculation story | `docs/125-today-authoritative-display-contract.md` | High if a partial amount looks final |

The dedicated component table asserts the exact action list for all three states. Unavailable
commands are absent, not disabled placeholders. The browser still submits the server-provided
attendance revision and one new memory-only intent key for each deliberate intent.

## Mutation and recovery matrix

| State | Trigger / entry condition | Visual UI | DOM / semantic state | Keyboard / focus | Expected screen-reader information | CSS / classes | Lifecycle event | Automated evidence | Documentation | Risk |
|---|---|---|---|---|---|---|---|---|---|---|
| Mutation pending | A valid action was submitted and has not resolved | Initiating label becomes Clocking/Starting/Resuming; all attendance actions disable | Initiating form exposes `aria-busy="true"`; native buttons are disabled | Focus stays on the initiating control or open dialog | Pending label and disabled state are likely exposed once; retries are silent | Existing disabled and action-footer styles | Mutation start | Component duplicate-click assertion; E2E sequence | `docs/56-attendance-resilience-recovery.md` | Blocker if duplicate activation remains possible |
| Original success | API returns a terminal success | Persistent Attendance updated message; authoritative state replaces prior state | One polite status region; no toast-only result | If the used control disappears, focus moves to current-status `h2` | One concise result is expected | Existing success alert tone | Mutation `onSuccess`, then query invalidation | Component and E2E sequence | `docs/53-clock-in-mutation.md` | High if success is claimed before refetch |
| Lost-response replay | Bounded retry reuses the same key and receives the terminal result | Same success presentation as the original result | One polite status; replay metadata is not exposed as a second event | Same focus rule as success | At most one result is expected for the intent | Existing success alert | Mutation retry and `onSuccess` | Component and E2E same-key replay; PostgreSQL concurrent replay | `docs/56-attendance-resilience-recovery.md` | Blocker if a replay creates or announces a second event |
| Stale revision | API returns `ATTENDANCE_STATE_CHANGED` | No-effect alert names the refreshed current status | One assertive alert; safe request reference only | Refetch first; focus current status when the initiating action is gone | One no-effect explanation and current status are expected | Existing danger alert | Mutation `onError`, query invalidation | Component and new E2E stale-intent flow; API stale contender | This file | High if an optimistic effect remains visible |
| Invalid attendance action | API returns another terminal `ATTENDANCE_*` conflict | No-effect alert says the action is invalid for current state | One assertive alert | Refetch; retain action focus if it remains valid, otherwise focus status | One no-effect explanation is expected | Existing danger alert | Mutation `onError` | Domain full transition matrix; API invalid-action and confirmation tests | `docs/03-domain-rules.md` section 9 | High if conflict is automatically retried |
| Break confirmation required after a race | Direct Clock out reaches a server that is now on break | No clock-out claimed; refreshed On break state offers the confirmation trigger | Assertive no-effect alert followed by the named dialog only after a new activation | Replaced direct control cannot strand focus; status becomes the recovery anchor | Conflict, current status, and later dialog are expected as separate deliberate steps | Existing danger alert and dialog | Mutation `onError`, query invalidation | API terminal confirmation evidence; same-command replacement component evidence | This file | High if confirmation is silently assumed |
| Active-break dialog open | User activates Clock out while `ON_BREAK` | Named modal with consequence, Cancel, and Close break and clock out | React Aria modal dialog | Initial focus enters; Escape/Cancel restores trigger; confirm remains disabled while pending | Dialog name, consequence, and actions are likely exposed | `wl-dialog-modal` | Dialog open/change | Component and E2E keyboard flows | `docs/54-attendance-command-sequence.md` | Blocker if cancel has an effect or focus escapes |
| Rate limited | API returns `RATE_LIMITED` | Definitive no-effect alert and later-retry guidance | One assertive alert; no countdown | Initiating action retains focus and is available after authoritative refresh | One no-effect result is expected | Existing danger alert | Mutation `onError`; no automatic retry | New component evidence | This file | Medium if copy implies an unknown outcome |
| Unknown transport/dependency outcome | Network/`5xx` retries are exhausted | Copy says WorkLedger could not confirm the outcome and requires current-state review | One assertive alert with optional safe request reference | Refetch before another intent; focus changes only when action presentation is invalidated | One unknown-outcome explanation is expected; retry loop is silent | Existing danger alert | Mutation `onError`, query invalidation | Component dependency evidence; lost-response replay evidence | `docs/56-attendance-resilience-recovery.md` | High if a second intent starts before reconciliation |
| Permission loss | Today read or mutation returns `ACCESS_DENIED` | Focused Permission denied route; no attendance data, action, or request reference remains | Route `h1`; safe home link; exact Today query is disabled and removed | Focus moves to the denial `h1`; only safe navigation remains | A neutral denial is expected without confirming attendance detail | Existing route-heading and button-link styles | Query/mutation error; boundary presentation | New component cache/field/focus/axe evidence; API inactive-employee no-effect evidence | This file; `docs/06-security-operations.md` | High if cached personal data remains rendered or queryable |
| Session expiry | Today read or mutation returns `AUTH_SESSION_EXPIRED` | Sign-in route with one neutral expiry notice | Protected Query state and CSRF memory clear before sign-in | Focus moves to Sign in `h1` | One expiry notice is expected | Existing authentication route state | Authentication error effect and navigation | Component and new E2E expiry flow; API revoked-session-before-replay evidence | `docs/06-security-operations.md` section 7 | Blocker if protected data survives into sign-in |

## Connectivity, refresh, and focus matrix

| State | Trigger / entry condition | Visual UI | DOM / semantic state | Keyboard / focus | Expected screen-reader information | CSS / classes | Lifecycle event | Automated evidence | Documentation | Risk |
|---|---|---|---|---|---|---|---|---|---|---|
| Initial offline | No cached Today data and browser is offline | Offline route copy; no action group | One danger alert under the route heading | Focus stays on route `h1` | Offline/no-queue explanation is expected once | Existing alert style | Online manager reports offline | Component coverage | `docs/56-attendance-resilience-recovery.md` | High if a clock intent is queued |
| Offline with cached data | Connection drops after Today loaded | Cached state remains, all actions disable, offline alert appears | One assertive alert adjacent to disabled native controls | Current focus remains logical; no action can activate | One loss/no-queue explanation is expected | Existing recovery alert | Online transition | Component and E2E offline evidence | Same | High if cached controls still submit |
| Reconnecting | Connection returns | Connection restored; refreshing before actions enable | Informational status content; actions remain disabled | Focus does not move unless refreshed state invalidates the old action | One recovery/update result is expected, not repeated polling | Existing info alert | Online transition and query refetch | Component and E2E offline convergence | Same | High if actions enable before refresh |
| Background refresh | Poll/focus/reconnect refetch with cached data | Existing content remains and header says Updating | No new live announcement for an unchanged snapshot | Focus and scroll remain | Silent unless actor-relevant state changes | Existing header text | Query fetch | Component cache ordering; existing E2E focus refresh | `docs/05-ux-accessibility.md` section 16 | Medium if polling becomes noisy |
| Other device removes focused action | Newer revision no longer includes the focused command | One Attendance refreshed message and the new state/actions | One polite status | Focus moves to current-status `h2` | One device-change result and current status are expected | Existing info alert | Query data revision change | Component and E2E device convergence | This file | High if focus remains on removed content |
| Other device changes Clock out mode | Newer revision crosses into or out of `ON_BREAK` while Clock out is focused | Clock out remains named the same but changes between submit and dialog-trigger behavior | Old control is replaced by the correct semantic control | Focus moves to current status before the user encounters the changed consequence | One device-change result and new status are expected | Existing action/dialog styles | Query data revision change | New component same-command replacement evidence | This file | High if focus is lost or confirmation is bypassed |
| Older response | Lower revision, older `asOf`, or older capture arrives later | Newer state remains visible | No semantic rollback | Focus does not move | No announcement | No class change | Query structural sharing | Component cache-ordering tests | `docs/125-today-authoritative-display-contract.md` | High if old controls return |
| Dependency failure without cache | Initial Today query fails | Today temporarily unavailable with Try again and safe request reference | Danger alert; no action group | Route focus remains; retry is a real button | One route-level failure is expected | Existing route/alert styles | Query error | Component load-failure evidence | `docs/05-ux-accessibility.md` section 16 | High if a blank or actionable stale page appears |
| Dependency failure with cache | Background refresh fails | Cached data stays readable; actions disable; retry appears | One assertive recovery alert | Focus remains unless a later refresh invalidates the action | One persistent failure is expected | Existing recovery alert | Query error | Component background-failure evidence | `docs/56-attendance-resilience-recovery.md` | High if an uncertain action remains enabled |

Actual VoiceOver, NVDA, JAWS, Narrator, and TalkBack speech is not claimed. Component roles, live
regions, DOM focus, axe, and Chromium behavior establish the implementation contract; exact retail
assistive-technology/browser pairings remain the `WL-1307` and `D-502` manual residual.

## Findings fixed

### High — Permission loss retained the ordinary Today presentation

Previously, `ACCESS_DENIED` followed generic dependency or unknown-mutation handling and could keep
cached attendance visible. Today now latches the denial, disables and removes the exact Today query,
closes transient attendance UI, omits request references and attendance facts, updates the document
title, and focuses a neutral permission `h1` with one safe destination.

### High — Clock out could change semantics without satisfying the focus contract

`CLOCK_OUT` is valid while working and on break, but it is a direct submit action in the first state
and a confirmation-dialog trigger in the second. A remote transition could therefore replace the
focused control without being detected by the former valid-command-only check. The route now treats
crossing the on-break boundary as an action-presentation change and focuses the authoritative status
before the user encounters the changed consequence.

### Medium — Rate-limit copy described a known no-effect result as unknown

A structured `RATE_LIMITED` response occurs before an attendance effect. The message now says that
no action was recorded, gives later-retry guidance, stays on the initiating control, and receives no
automatic retry.

## Security and transaction evidence

The API integration fixture now proves two additional boundaries around the existing mutation
transaction:

- inactive-employee denial adds no punch, audit event, revision, or idempotency record; and
- deleting the authenticated session prevents replay of an earlier successful key before
  idempotency lookup and adds no idempotency record.

Idempotency keys remain memory-only headers. Permission and session handling expose no employee,
organization, punch, key, source, or request identifier in the denial/sign-in presentation.

## Verification ownership

- Component stories own the three authoritative ready states, pending/success/conflict/replay,
  active-break dialog, rate limiting, permission loss, offline/reconnect, dependency failure,
  session expiry, device convergence, focus, live regions, and axe.
- PostgreSQL/API integration owns authorization-before-replay, no-effect denial, same-key replay,
  stale contenders, all four valid commands, active-break atomicity, immutable events, revision,
  idempotency, and audit effects.
- Chromium owns the keyboard sequence plus duplicate/lost response, stale mutation, offline,
  session expiry, and other-device convergence.

No screenshot baseline changed because the deterministic `WL-1302` ready fixture and layout are
unchanged. Permission loss is a semantic route state rather than a visual-redesign task.

## Remaining manual checks

- Confirm the matrix with named retail screen-reader/browser pairings in `WL-1307`.
- Confirm physical touch behavior in the dedicated Today sub-gate.
- Keep exact partial-day work-versus-absence and ledger-source mismatch recovery assigned to their
  repository-fact and later attention tasks; this slice does not infer them.
