# WL-1202 Request and Monthly Workflow UX Remediation

**Task:** `WL-1202`

**Status:** Complete on 2026-08-24.

## Scope

This slice completes the employee request route contract and applies the Quiet Ledger state,
action, effect, and evidence hierarchy to correction, absence, cancellation, approval history, and
monthly review workflows.

The canonical employee routes are `/requests`, `/requests/new`, and `/requests/:requestId`.
`/requests/sickness` is removed. The former correction route redirects to the neutral chooser with
an opaque daily-record target so existing in-product links and bookmarks do not retain a second
form route.

## Authoritative value sources

| Displayed value | Authoritative source |
|---|---|
| Broad request kind, current state, affected dates, submitted time, version, and pagination | New employee-scoped repository union exposed by `GET /v1/me/requests` |
| Correction proposal, original calculation, immutable punch events, application mode, and decision history | Existing correction request, decision, and applied-correction records exposed by owner detail |
| Absence name, workflow, exact calculated coverage, current state, and related cancellations | Existing absence type version, stored coverage, request, decision, and cancellation records exposed by owner detail |
| Cancellation coverage, original absence link, current state, and decision history | Existing cancellation, selected coverage, source absence, and decision records exposed by owner detail |
| Monthly readiness, totals, daily values, approved baseline, and post-lock chain | Existing monthly period response; no client calculation or API change |

PostgreSQL remains authoritative. TanStack Query owns the remote history and detail state. Request
filters and pagination use React Router search parameters. Workflow choice on `/requests/new` is
transient component state and is never written to a URL or browser storage.

## Request collection and detail

The request collection applies organization and active employee scope before broad type or progress
filters, count, order, and pagination. The strict list response contains no employee identity,
absence type, sickness classification, reason, note, entitlement, coverage segment, reviewer, or
source event field.

The detail service accepts only an opaque request ID, loads the candidate within the current
organization, verifies that the active employee owns it, and then selects a correction, absence, or
cancellation response. Detail responses are private and no store. Exact facts and decision reasons
are intentionally available to the owner on this record view. Non-owners receive no record body.

Correction detail keeps original calculation and immutable events beside the proposed interval.
Absence detail explains whether coverage is effective on report or after approval. Cancellation
detail links back to the preserved original absence. Ordered history identifies only the owner, an
authorized reviewer, or WorkLedger as actor categories.

## Actions and recovery

Only actions returned by the owner detail response are rendered. An effective absence can start a
separate cancellation review when no other cancellation is pending. A pending or changes-requested
cancellation can be withdrawn. Both paths retain existing CSRF and optimistic-version checks and
refetch authoritative detail and history after success.

The interface explains the unchanged effect before each action: requesting cancellation does not
remove effective absence coverage until approval, and withdrawing a cancellation does not change
the original absence. Stale state, locked-period requirements, load failures, empty collections,
background refresh, validation summaries, and successful mutations have visible textual recovery.

## Monthly review

Monthly workflow behavior is unchanged. Shared panels now group workflow state, totals, approved
evidence, and post-lock reconciliation. Textual status badges distinguish readiness and daily row
state. Daily and post-lock tables use the shared captioned data-table contract with visible scroll
guidance and named keyboard-focusable local overflow regions.

## Accessibility

The chooser uses real buttons and one route heading. Form validation retains linked summaries and
focus. History uses a semantic ordered list of record panels with textual state. Detail uses a
single route heading followed by ordered state, action, evidence, and history sections. Status is
never color only, mutation results use semantic alerts, and deliberate dense tables retain captions,
focusable local scrolling, and instructions.

Focused component and axe tests cover the chooser, all three forms, neutral list labels, authorized
absence detail, decision evidence, original absence linkage, and cancellation withdrawal. Monthly
component coverage continues to exercise open, blocked, submitted, changes-requested, approved,
locked, post-lock, print, conflict, and permission states.

A focused Chromium workflow verifies that list and network filters remain type neutral, owner
detail restores exact evidence, the canonical URL contains only an opaque request ID, cancellation
submission sends the expected version, narrow layout does not create page overflow, route focus is
preserved across lazy modules, and the rendered states have no automated axe violations.

Manual VoiceOver, NVDA, and TalkBack evidence remains owned by `D-502` and `WL-1206`.

## Performance

The three new request route modules load on demand. The production build keeps the main application
chunk at 350,398 bytes and places history, detail, and chooser/forms in separate 5,722 byte, 14,926
byte, and 28,007 byte chunks. The complete application now measures 878,217 JavaScript bytes and
236,969 gzip bytes.

The aggregate JavaScript ceilings increased from 850,000 to 890,000 raw bytes and from 230,000 to
240,000 gzip bytes to account for the three complete canonical workflows. The largest-chunk ceiling
remains 500,000 bytes, and the CSS ceiling remains 50,000 bytes. The resulting CSS is 49,925 bytes.
This keeps both initial-route chunk size and full-application growth explicit and executable.

## Security and data

No migration is required. The repository uses existing immutable request, decision, applied
correction, coverage, and cancellation records. Read operations use a repeatable-read transaction.
The endpoints require an active authenticated employee, re-evaluate self authorization, validate
and serialize strict contracts, and return `private, no-store`.

Sensitive subtype and reason values do not enter request list URLs or responses. The only contextual
form query value is an opaque daily-record ID for correction. There is no new local storage,
telemetry, log payload, attachment, export, or external notification surface.

## Verification

Focused contract and component tests pass. The PostgreSQL integration scenario compiles and covers
owner scope, non-owner denial, neutral collection data, and rejection of a sickness-valued filter;
it requires the repository integration database and is skipped when that service is unavailable.
The final repository quality-gate evidence is recorded in `PROJECT_STATUS.md`.

## Remaining work

`WL-1203` owns Team, Approvals, team-calendar, filtering, manager decision, and narrow-screen manager
workflow remediation. `WL-1205` owns the final cross-route state and microcopy pass. `WL-1206` owns
systematic visual regression, manual assistive-technology evidence, and the Phase 12 release gate.
