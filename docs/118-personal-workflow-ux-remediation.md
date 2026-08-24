# WL-1201 Personal Workflow UX Remediation

**Task:** `WL-1201`

**Status:** Complete on 2026-08-24.

## Scope

This slice applies the Quiet Ledger personal collection, record detail, calendar, and route state
patterns to `/my-time`, `/my-balances`, `/time-records/:recordId`, `/calendar`, `/notifications`,
and `/profile`.

It changes presentation only. Existing API contracts, authorization, query ownership, mutation
rules, and domain calculations remain unchanged.

## Value sources

| Displayed value | Authoritative source |
|---|---|
| Selected period, record summaries, flexible time totals, ledger rows, and leave totals | Existing `GET /v1/me/time` response and URL owned query state |
| Daily calculation, intervals, immutable events, timezone, and attention items | Existing `GET /v1/me/time-records/:recordId` response |
| Calendar month, holidays, personal absence coverage, and workflow state | Existing `GET /v1/me/calendar` response and URL owned month |
| Notification copy, destination, state, and delivery status | Existing `GET /v1/me/notifications` response |
| Account, employee, role, and minimized session facts | Existing `GET /v1/me/profile` response |

No displayed value is derived from hidden browser storage or a new client side source.

## Presentation outcome

My Time and My Balances now lead with the selected period and authoritative balance summary before
the period controls. Incomplete projections receive a clear warning and recovery instruction. The
desktop record table uses the shared semantic table contract, while narrow screens receive a
labelled record list with the same dates, states, values, attention, and detail links.

Daily record detail now follows state, warning, attention, calculation, valid correction action,
and immutable evidence order. Complete and incomplete state is textual. Loading, unavailable,
permission denied, not found, empty interval, and empty event states use the shared route state
contract.

Personal Calendar now selects the agenda presentation by default below 48 rem unless the user has
chosen a view. The month grid remains available and equivalent. Its deliberate horizontal region
is labelled, keyboard focusable, locally contained, and paired with a visible instruction to
scroll horizontally.

Notifications and Profile now use the shared panel, status, alert, route state, and pagination
contracts. Notification dismissal still retains the item and keyboard focus. Profile remains read
only and keeps the existing current session revocation behavior.

## Accessibility

The narrow My Time list removes the need to pan across independent daily records. The Calendar
agenda is the narrow default, while the optional grid retains a caption, real table structure,
focusable named scroll region, and equivalent content. Shared controls keep the 44 pixel target,
visible focus, forced colors, and reduced motion contracts.

Focused component and axe coverage exercises the record collection, daily detail, calendar,
notification, and profile surfaces. Browser coverage verifies route heading focus, narrow list and
agenda defaults, calendar view switching, internal grid overflow, visible scroll guidance, 320
pixel page reflow, notification focus retention, and protected profile cleanup.

Manual VoiceOver, NVDA, and TalkBack evidence remains owned by `D-502` and `WL-1206`.

## Security and data

The personal routes continue to rely on their existing self scoped, private, no store endpoints.
Notification copy remains generic and destinations reauthorize at use time. Profile continues to
exclude raw session tokens, IP addresses, and complete user agent values. Personal Calendar shows
only the signed in employee's authorized absence information. No new log, cache, storage,
telemetry, API, database, export, or mutation surface was introduced.

## Verification

The focused component suites and the new Chromium responsive scenario pass. The final repository
quality gate is recorded in `PROJECT_STATUS.md`.

## Remaining work

`WL-1202` owns the correction, absence, cancellation, approval history, and monthly review
workflow remediation. `WL-1205` owns the final cross route state and microcopy pass. `WL-1206`
owns systematic visual regression and manual assistive technology evidence.
