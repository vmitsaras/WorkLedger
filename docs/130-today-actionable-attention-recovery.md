# Today actionable attention and correction recovery

**Task:** `WL-1306`  
**Completed:** 2026-08-25  
**Outcome:** Today attention now carries and renders one server-owned title, explanation, affected
source date, severity, blocking effect, permitted action, destination, and expected next state for
every emitted issue. Daily-record blockers lead into the existing immutable correction workflow,
and recoverable correction failures preserve the employee's entered proposal.

## Scope and authority

This slice changes the Today response and browser presentation but adds no attendance transition,
calculation rule, break-duration rule, permission, database column, migration, dependency, or
ledger behavior. PostgreSQL and the domain engine still decide whether an issue exists. The browser
does not infer attention from prose, minutes, request status, a current overnight session, or a
normal provisional difference.

The API contract deliberately remains purpose-minimized. Attention contains no employee,
organization, request, decision, punch, ledger-row, absence-subtype, sickness, note, reason, actor,
or policy-configuration identifier. Request and decision detail remains on the separately
authorized Requests route.

## Actionable attention contract

Each `TodayAttentionItem` now supplies:

- stable calculation code and concise server-owned title;
- safe plain-language reason;
- the current-day source date, or the posted-through date for a flexible-time threshold;
- `BLOCKER` or `WARNING` severity and an explicit `blocksSubmission` value;
- a typed recovery action and matching destination;
- one concise link label; and
- `statusAfterAction`, which explains what changes, what stays preserved, and what must happen
  next.

The recovery object uses typed action and destination enums. Contract reconciliation rejects a
mismatched action/destination pair, an action incompatible with its issue code, duplicate codes, an
unsupported warning code, and extra workflow identifiers. Threshold attention must use
`POSTED_FLEX_BALANCE`, its bounded posted-through date, and `REVIEW_BALANCE_HISTORY`; every other
current item uses the authorized current-day calculation source.

| Source pattern | Permitted action | Browser destination | Expected state after navigation |
|---|---|---|---|
| Incomplete, overlapping, invalid-order, or invalid-precision attendance | `FIX_ENTRY` | Filtered My Time week, then the daily record and correction request | Original events remain immutable while a submitted correction awaits review |
| Pending absence or unresolved correction | `REVIEW_REQUEST` | My requests | The separately authorized request page shows whether review or employee changes are next |
| Missing or conflicting schedule/policy, invalid policy, or ledger mismatch | `REVIEW_RECORD` | Filtered My Time week | The record remains blocked until an authorized administrator resolves its source |
| Holiday or zero-expectation work | `REVIEW_CALCULATION` | Today's calculation disclosure | The explanation opens; no record is mutated |
| Posted flexible-time threshold | `REVIEW_BALANCE_HISTORY` | My balances ledger | The warning remains until later posted ledger evidence returns within the configured threshold |
| Work during an approved absence source | `FIX_ENTRY` | Filtered My Time week | The correction workflow preserves both original attendance and privacy-safe absence boundaries |

## Presentation and announcement behavior

Today now consumes `calculation.attentionItems` directly. The removed browser selector no longer
reduces the response to code arrays, and the Today route no longer rebuilds titles, descriptions,
or destinations from a second client map.

The section is absent when the array is empty. When present, it separates blocking issues from
warnings, shows `Blocks month submission` or `Does not block submission` in text, labels the
affected source date, explains what happens next, and provides a real link for every item. Static
route-load attention uses `announce={false}`. Only a blocker whose code appears after the component
has already mounted creates one concise assertive announcement; ordinary warnings and unchanged
background refreshes remain silent.

Historical daily records now replace wait-only prose with `Fix entry`, `Review request`, `Review
affected period`, `Review calculation`, or `View balance history` links. Attendance fixes open the
canonical correction form for that record. The form keeps all local values after validation,
transport, and dependency failures, focuses the error summary, and resubmits the same proposal only
after another deliberate activation. A successful locked-period proposal explains that approval
will append a post-lock adjustment rather than rewrite the approved monthly record, then focuses
the success result and links to the request detail.

## Required-pattern disposition

| Required pattern | Authoritative owner and evidence | Disposition |
|---|---|---|
| Missing clock-out | Past daily record emits `ATTENDANCE_INCOMPLETE`; daily-record component routes `Fix entry` to the exact correction target | Positive automated coverage |
| Open or incomplete previous session | Daily session evidence marks `continuesFromPreviousDate`; the incomplete record and correction CTA are tested together | Positive automated coverage; a legitimate current overnight session is not guessed to be an error |
| Overlap or impossible interval awaiting correction | `ATTENDANCE_OVERLAP` and invalid event codes use the same exact correction destination | Positive contract, selector, and component coverage |
| Correction returned for changes | Authorized request detail exposes `CHANGES_REQUESTED`, decision history, unchanged-record explanation, and preserved source evidence | Positive component and existing API workflow coverage |
| Correction rejected with decision available | Authorized request detail exposes `REJECTED`, decision history, terminal no-effect explanation, and preserved source evidence | Positive component and existing API workflow coverage |
| Break-policy warning | The accepted policy has manual break recording but no minimum-duration or compliance threshold from which to derive a warning | Negative contract test rejects invented `BREAK_POLICY_WARNING`; no false issue is rendered |
| Month submission blocked by an incomplete record | Monthly readiness keeps the period open or changes-requested and returns the exact daily blocker; submission fails with no partial transition | Existing component and PostgreSQL integration coverage |
| Posted flexible-time threshold crossed | Repeatable-read Today composition evaluates only the bounded posted ledger balance and links to My balances | Positive contract, selector, API, component, and privacy coverage |
| Server calculation temporarily unavailable | Today query dependency recovery remains separate from calculation attention, disables attendance actions, shows a safe request reference, and offers `Try again` | Existing component and browser recovery coverage |

“Submitted month blocked” is interpreted as a submission attempt blocked before the state can
become `SUBMITTED`. A persisted submitted period does not simultaneously advertise unresolved
readiness blockers. Server unavailability stays a route/query recovery state because no reliable
calculation snapshot exists from which to construct an attention item.

## Accessibility and privacy evidence

- Links are native router links or anchors with visible action names; no button is styled as a
  navigation link.
- Blocking state, severity, date, title, explanation, destination, and next state are textual and
  do not rely on color.
- Static attention has no alert role. Component evidence proves that only a newly added blocker is
  announced assertively.
- The attention groups, correction recovery state, returned/rejected request details, and narrow
  Today path pass axe automation. Exact retail assistive-technology speech remains `WL-1307` work.
- Generic Today and history views continue to exclude sickness detail and private workflow fields.
  Request decision text appears only after the owner opens the authorized request detail.

## Source boundaries retained

The accepted repository still has no exact source fact for partial-day work-versus-absence overlap
or calculation-to-ledger mismatch, and Today continues to pass those facts as false. `WL-1306` adds
an actionable representation for those stable codes but does not claim they can currently be
emitted. The break-policy handoff example also lacks an accepted duration rule. Adding any of these
signals later requires a dedicated repository or domain source and its own privacy, historical,
and reconciliation evidence.

The validated recovery metadata and renderer add 2,470 uncompressed JavaScript bytes relative to
the `WL-1305` verified build. The total JavaScript budget moves by 3,000 bytes, or 0.34 percent, from
895,000 to 898,000; no largest-chunk, gzip, or CSS budget changes. No screenshot baseline changes:
the deterministic `WL-1305` fixture has no attention item, and the historical Phase 12 snapshot
files remain unchanged. No dependency, lockfile, manifest, migration, workspace version, publication,
deployment, or tag changes.

## Verification

The exact `pnpm verify` workflow passed under Node `24.18.0` and pnpm `11.20.0`. The existing
workspace-state warning was retained with `verify-deps-before-run=warn`; no dependency install,
purge, or registry refresh was allowed.

- Runtime configuration, reproducible OpenAPI, formatting, ESLint, the 289-source/1,515-import
  boundary contract, CSS ownership, strict TypeScript, the workspace graph, and the phase/version
  contract passed.
- All 37 tooling tests and all 368 unit/component tests passed.
- All 13 available integration tests passed. Another 45 PostgreSQL-dependent tests were skipped
  because no test database URL was configured; the existing `WL-1305` correction-history database
  case therefore remains locally unexecuted.
- Playwright passed 36 scenarios across the configured browser matrix. The separate opt-in
  `WL-1305` visual capture was skipped as intended, and no screenshot changed.
- The production build and all public-root imports passed. Measured output is 370,142 bytes for the
  largest JavaScript asset, 897,325 total JavaScript bytes, 242,635 gzip JavaScript bytes, and
  49,993 CSS bytes.
- The additional historical `pnpm run test:visual` command did not pass: 27 scenarios passed, one
  Phase 13 capture skipped, and four Phase 12 screenshot comparisons failed. Approvals, My Time,
  and Employees each showed small one-percent raster differences. Today differed in height because
  the preserved Phase 12 image predates the cumulative Phase 13 hierarchy; visual inspection
  confirmed the current no-attention fixture did not exercise this task's new renderer. No
  historical image was overwritten. `WL-1307` owns the new Today visual evidence, while the later
  cross-route visual gate owns the other preserved-snapshot drift.
