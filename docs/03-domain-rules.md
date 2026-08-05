# WorkLedger Domain Rules

## 1. Model boundary and authority

This document is the canonical implementation-neutral vocabulary and invariant registry for the WorkLedger MVP. Later state-machine, calculation, absence, and monthly-period tasks may add detail, but they must preserve these meanings or record an explicit decision and update this document.

- PostgreSQL is authoritative for persisted domain facts, assignments, workflow records, ledgers, snapshots, and audit history.
- `packages/domain` is authoritative for deterministic validation, reconstruction, calculation, and state-transition rules.
- A projection or DTO is never a second source of truth. It is derived from identified source facts and versioned rule inputs.
- Every domain record belongs to the installation organization, including records that are reachable only through an employee.
- This conceptual model does not select identifier types, tables, indexes, ORM shapes, or API payloads.

## 2. Assumptions and open decisions

| Item | Status | Modeling impact | Owner / evidence needed |
|---|---|---|---|
| One organization, one current team, and at most one current direct manager per employee | Accepted MVP boundary | Bounds tenancy, grouping, and authorization relationships. | `WL-002`–`WL-004` evidence. |
| Work intervals exclude breaks and daily segments split at local midnight | Accepted | Fixes session/interval vocabulary and credited-time inputs. | `D-100` and `D-101`, resolved by `WL-004`. |
| Attendance commands, revisions, event order, and idempotency | Accepted | Fixes ordinary transition outcomes, deterministic sequencing, retry safety, and tab/device conflicts. | Section 9, resolved by `WL-005`. |
| Ambiguous/nonexistent manually entered local time | Accepted | Nonexistent input is rejected; ambiguous input requires one valid explicit UTC offset. | `D-102`, resolved by `WL-006`. |
| Holiday expected-time and entitlement behavior | Accepted MVP default | A configured holiday reduces expected minutes to zero; default absence credit, expected reduction, and entitlement consumption for that date are zero while coverage remains visible. | `D-103`, resolved by `WL-006` and applied by `WL-007`. |
| Organization timezone changes | Accepted MVP boundary | The timezone may change only before time-dependent employee facts exist; afterward ordinary changes are blocked. | `D-104`, resolved by `WL-006`. |
| Daily time-account posting lifecycle | Accepted | Complete past dates post one base daily delta; later unlocked recalculation appends the difference, and locked changes use post-lock adjustment. | `D-105`, resolved by `WL-006` and mapped to `WL-208`. |
| Physical identifier type | Open, non-conceptual | Affects migration and database ergonomics, not stable domain identity semantics. | `D-201`, resolve before Phase 3 schema. |
| Daily projection persistence | Open | Determines rebuild/version behavior and persistence boundaries. | `D-202`, resolve before Phase 3 schema. |
| Leave units, half-day definition, negative balance, sickness reporting, and unpaid-leave behavior | Accepted | Leave uses integer minutes; half-days partition date expectation; negative vacation approval needs a non-self HR override; sickness has a bounded retrospective window; unpaid leave reduces covered expectation by default. | `D-300`–`D-304`, resolved by `WL-007`. |
| Month-lock timing and exact approved snapshot schema | Accepted | Approval creates one immutable snapshot; a separate eligible non-self manager lock transition makes it final, and post-lock effects reference that baseline. | `D-400` and `D-401`, resolved by `WL-008`. |
| Retention/anonymization | Accepted contract; implementation remains a production gate | A deployment-owned class profile controls purge/minimization and backup expiry without cascade loss of ledger, snapshot, decision, or audit integrity. | `D-500`, resolved by `WL-010`; implement/verify in `WL-1007`. |

## 3. Canonical domain vocabulary

| Term | Canonical meaning | Avoided ambiguity |
|---|---|---|
| Organization | The single company or institution served by one MVP installation. | Not a SaaS tenant or department. Organization identity still scopes every domain record. |
| Account | Authentication identity, credentials, and sessions managed through the authentication boundary. | Not the employee record and not proof of an application role. |
| Employee | Stable WorkLedger identity for one person whose employment, attendance, requests, balances, and history are recorded. | Deactivation ends capability; it does not replace or delete historical identity. |
| Employment period | Effective-dated interval in which an employee is employed and may receive employee capability. | Separate from account activation and from a work schedule. |
| Team | The only MVP organization grouping for employees. | Not an authorization scope for HR data and not a department hierarchy. |
| Team assignment | Effective-dated membership connecting an employee to at most one current team. | Historical membership does not grant current access. |
| Manager assignment | Effective-dated relationship naming one employee as another employee's direct manager. | Team leadership and historical approval do not imply manager scope. |
| Work schedule | Versioned weekly expectation definition, including expected minutes by weekday. | Not an employee assignment and not recorded attendance. |
| Schedule assignment | Effective-dated relationship selecting the work schedule for an employee and local date. | A missing assignment is a configuration problem, not an implicit zero-hour schedule. |
| Time policy | Versioned organization rule set for attendance warnings and calculation behavior. | Not a schedule and not a legal-compliance claim. |
| Policy assignment | Effective-dated relationship selecting the time policy for an employee and local date. | Historical calculations retain the version that applied. |
| Holiday | Organization-owned date-only rule that changes expected-time treatment for one local date. | Not a midnight instant and not an external legal assertion. |
| Local date | Calendar date interpreted in the explicit organization timezone. | Never represented as a midnight timestamp. |
| Instant | Unambiguous point on the global timeline used for occurred and recorded times. | Not a wall-clock local time. |
| Attendance action | Actor command such as clock in, start break, resume, or clock out. | A command is not the persisted fact; one command may atomically create more than one punch event. |
| Punch event | Immutable attendance fact of type `CLOCK_IN`, `BREAK_START`, `BREAK_END`, or `CLOCK_OUT` at an occurred instant. | “Clock event” and “raw event” are informal synonyms; `BREAK_END` is the event created by the Resume action. |
| Attendance state | Current derived state `OFF_WORK`, `WORKING`, or `ON_BREAK` for one employee. | It is server-derived truth, not tab-local state. |
| Work session | One attendance sequence beginning with `CLOCK_IN` and ending with `CLOCK_OUT`; it may contain breaks and multiple work intervals. | Do not use “session” for each break-free interval or for an authentication session. |
| Work interval | Derived elapsed interval during which attendance state is `WORKING`; it excludes break time. | Worked minutes sum these intervals, so breaks are never subtracted twice. |
| Break interval | Derived elapsed interval from `BREAK_START` to `BREAK_END` during a work session. | It is not work and cannot exist outside a work session. |
| Daily record | Deterministic projection for one employee and one organization-local date. | It may be incomplete or provisional; it is not automatically an immutable ledger fact. |
| Calculation source fingerprint | Stable identity of the exact event/correction, configuration, timezone-rule, absence/adjustment, engine-version, and applicable clock inputs used by a daily calculation. | It detects source equality; it is not a substitute for retaining source references. |
| Calculation status | `PROVISIONAL`, `INCOMPLETE`, or `COMPLETE` classification controlling which totals are final and whether posting is allowed. | UI loading state and monthly workflow state are separate concepts. |
| Posted balance | Sum of authorized time-account ledger entries. | It excludes unposted daily projections. |
| Projected balance | Posted balance plus explicitly identified eligible unposted projections. | It is labelled as projected and excludes incomplete dates. |
| Warning | Structured non-blocking issue or policy signal with a stable code and source context. | The UI never infers it by parsing prose. |
| Submission blocker | Structured issue that prevents monthly submission until resolved. | Not every warning is a blocker. |
| Correction request | Auditable workflow proposing a change to how an existing record is interpreted. | It never edits or deletes the original punch event. |
| Applied correction | Approved, versioned interpretation used by calculation for an unlocked record. | Distinct from the immutable original and from a post-lock adjustment. |
| Adjustment | Source-linked signed effect that changes a ledger or adjusted view without rewriting its source history. | Not a generic mutable balance field. |
| Time account | Employee's flexible-time ledger and its derived balance. | “Flex balance” is a display label, not a separate source of truth. |
| Time-account entry | Append-only signed ledger fact explaining one flexible-time effect. | A cached total is not an entry. |
| Absence type | Organization configuration defining workflow, allowed duration, entitlement, credit, privacy, and incompatibility behavior. | Attachments are not an MVP attribute. |
| Absence coverage segment | One immutable requested unit of coverage: a full local date, the first or second obligation half of a date, or a minute-specific local interval. | Coverage identity is distinct from its calculated entitlement, credit, or expected-reduction minutes. |
| Absence request | Employee workflow record for proposed or reported absence over one or more non-overlapping coverage segments. | A request is distinct from the entitlement and time-calculation effects it may cause. |
| Absence decision | Auditable approval, acknowledgement, rejection, changes-requested, or cancellation decision. | Status alone is not sufficient history. |
| Absence cancellation request | Workflow record targeting all or a non-overlapping subset of an effective absence request's remaining coverage. | It does not mutate or delete the original request or approval. |
| Absence effect | Versioned, source-linked approved or reported input supplied to entitlement and daily calculation. | Pending approval has no time-calculation effect; acknowledgement never applies the reported effect a second time. |
| Leave entitlement account | Employee's append-only leave ledger for one entitlement category. | The displayed available amount is a derived balance. |
| Leave-entitlement entry | Append-only signed ledger fact allocating, reserving, deducting, releasing, restoring, expiring, or adjusting entitlement. | A cancellation appends restoration; it does not edit the deduction. |
| Reservation | Pending leave-entitlement effect that reduces projected availability without being an approved deduction. | Approval must release/consume the reservation exactly once. |
| Monthly period | Reviewable calendar-month record for one employee, with workflow state, blockers, decisions, and locking. | “Timesheet period” is an avoided synonym in new code and contracts. |
| Approved snapshot | Immutable, versioned reproduction input/output set recorded for an approved or locked monthly period. | Later adjusted views do not replace it. |
| Idempotency record | Retry-safety record binding organization/actor scope, command, key, request fingerprint, and original outcome. | It is not a punch event and does not authorize a command. |
| Audit event | Append-only, data-minimized record of who performed a security- or domain-relevant action, when, and why. | It is not an operational log and does not replace domain history. |
| Notification record | User-facing delivery record created after a domain outcome. | Delivery failure cannot undo the domain transaction. |

### Daily calculation terms

| Term | Meaning |
|---|---|
| Expected minutes | Scheduled obligation for the local date after applicable holiday and accepted policy treatment. |
| Worked minutes | Sum of valid work-interval elapsed minutes; breaks are already excluded. |
| Break minutes | Sum of valid break-interval elapsed minutes, reported separately for explanation. |
| Absence-credit minutes | Effective approved-or-reported absence minutes credited toward the daily obligation under its snapshotted policy. |
| Adjustment minutes | Sum of approved signed correction or administrative effects applicable to the daily calculation. |
| Credited minutes | Worked minutes plus absence-credit minutes plus signed adjustment minutes. |
| Daily balance minutes | Credited minutes minus expected minutes; the result may be positive, zero, or negative. |

## 4. Concept classification and lifecycle

| Concept | Kind and identity | Authority / mutability | Lifecycle summary |
|---|---|---|---|
| Organization | Stable entity | Organization configuration under HR/technical boundaries | Created at installation; not ordinarily deleted. |
| Account | Authentication entity | Authentication boundary; technical operations | Invited, activated, reset, revoked, deactivated; security history retained. |
| Employee | Stable domain entity | HR-owned fields; employee read-only self-service | Created, activated through employment/account state, deactivated, optionally re-employed; history retained. |
| Employment period | Effective-dated entity | HR-managed, audited | Added or ended; periods never overlap for one employee. |
| Team | Reference entity | HR-managed, audited | Created, renamed, deactivated; historical references remain. |
| Team/manager/schedule/policy assignment | Effective-dated relationship entity | HR-managed, audited | Added, ended, superseded by non-overlapping future ranges; history retained. |
| Work schedule/time policy | Versioned configuration entity | HR-managed, audited | New effective version replaces future use; approved history retains prior version reference. |
| Holiday | Date-only reference fact | HR-managed, audited | Added/corrected with explicit impact; approved history is not silently rebuilt. |
| Punch event | Immutable domain event | Created only by a valid attendance command transaction | Never edited or ordinarily deleted; correction links to it. |
| Work session/work interval/break interval | Derived concepts | Reconstructed by domain rules | Rebuilt deterministically from ordered source facts and accepted corrections. |
| Daily record | Projection identified by employee and local date | Deterministic calculation; versioned if persisted | Incomplete/provisional while sources are incomplete; approved history uses snapshot/version references. |
| Correction request/decision | Workflow entities with stable identity | Requester proposes; eligible non-self actor decides | Submitted, changes requested, approved, or rejected; every decision remains attributable. |
| Time-account/leave-entitlement entry | Immutable ledger event | Trusted transaction only | Appended, never edited; reversals and corrections append compensating entries. |
| Absence type | Versioned configuration entity | HR-managed, audited | Activated/deactivated or superseded without rewriting decided requests. |
| Absence request/decision/cancellation | Workflow entities with stable identity | Employee requests/reports/cancels; eligible non-self actor decides | Pending, reported, decided, partially cancelled, or cancelled through recorded transitions; every effect is linked. |
| Monthly period | Workflow entity unique per employee/calendar month | Employee, manager, and HR actions according to permission/state | Open through submission, approval, lock, and linked post-lock adjustment. |
| Approved snapshot | Immutable snapshot entity | Created by approval/locking transaction | Never replaced; later adjustments reference it. |
| Idempotency record | Immutable terminal retry-safety record | Created by retry-sensitive command processing | Replayed for a matching fingerprint; attendance-command records do not expire in the MVP. |
| Audit event | Immutable audit event | Trusted application/technical process | Appended with safe metadata; retention is defined before production release. |
| Notification record | Delivery entity | Trusted application process | Created after domain outcome; delivery attempts may change without changing the outcome. |

## 5. Relationship plan

| From | Relationship | To | Cardinality / optionality | Ownership and history behavior |
|---|---|---|---|---|
| Organization | contains | All domain records | One-to-many; required organization identity | Deleting a parent must not cascade away audit/history. |
| Account | links to | Employee | Zero-or-one active employee link per account; at most one active account link per employee | Link changes are audited; deactivation preserves both histories. |
| Employee | has | Employment period | One-to-many; periods do not overlap | Ending employment removes capability without deleting records. |
| Employee | has | Team assignment | Zero-to-many historically; zero-or-one current | Team deactivation/end preserves prior membership. |
| Employee | has current manager through | Manager assignment | Zero-to-many historically; zero-or-one current | Scope uses only the current effective assignment; self/cyclic relationships are invalid. |
| Employee | resolves | Schedule/policy assignment | Exactly one applicable assignment is required for a calculable scheduled date | Gaps/overlaps are explicit configuration failures. |
| Work session | derives from | Punch events | One clock-in, one clock-out when complete, ordered interior break events | Events own history; session is reconstructable. |
| Daily record | derives from | Intervals, assignments, holidays, absence effects, adjustments | One projection per employee/local date/rule-input version | Persisted projection keeps source/version references and is rebuildable explicitly. |
| Correction request | targets | Event, interval, or daily record interpretation | Exactly one target plus original/proposed values | Approval adds applied interpretation or adjustment; target remains. |
| Ledger entry | explains | Source record/action | Exactly one source identity and explanation code | Source and entry are written atomically when both are persisted. |
| Absence request | uses | Absence type and affected local dates/minutes | Exactly one type; one or more affected dates/segments | Decided request keeps type/version and decision history. |
| Absence cancellation request | targets | Effective absence request coverage | One original request; one or more still-effective segments or subsegments | Approval subtracts only targeted coverage and links compensating effects; rejection changes nothing. |
| Monthly period | covers | Daily records | Exactly one employee and calendar month | Ordinary sources are protected by submitted/locked state. |
| Approved snapshot | belongs to | Monthly period | Exactly one immutable approval baseline per approval cycle; a returned period may later create a new numbered cycle, while lock fixes the latest approved cycle as the permanent baseline | Every later adjustment references that locked snapshot. |
| Idempotency record | binds retry outcome for | Attendance command intent | At most one terminal outcome per organization, actor account, and key | Matching fingerprint replays it; conflicting fingerprint has no attendance effect. |
| Audit event | references | Actor and target | One actor/system process and one primary target, with optional safe correlation | Target deletion/deactivation does not remove audit attribution. |

## 6. Permissions and data ownership

- Account credentials and sessions are controlled by the authentication boundary; they do not own employee or HR data.
- HR owns mutable employment, team, manager, schedule, policy, holiday, absence-type, and entitlement configuration under the non-self rules in `docs/02-roles-permissions.md`.
- Employees own the initiation of their attendance commands and personal requests but do not own immutable facts in the sense of being able to erase them.
- Managers receive current-direct-report decision scope, not ownership or transfer rights.
- Trusted application transactions alone append punch, ledger, snapshot, idempotency, audit, and notification records.
- PostgreSQL remains the persisted source of truth; UI caches, URLs, local state, exports, and notifications do not become authorities.
- Organization scope, field minimization, current relationship scope, and self-action restrictions apply independently from entity relationships.

## 7. Lifecycle and history

- Current state is derived from effective assignments, workflow transitions, and immutable facts; it does not replace history.
- Deactivation ends current capability while preserving stable identities and dependent records. Re-employment adds a non-overlapping employment period rather than creating an unrelated history by default.
- Configuration changes create new effective versions or ranges. Previously approved/locked results keep the identifiers and versions used to calculate them.
- Workflow status is the current projection of recorded submissions and decisions. Decision history remains append-only and attributable.
- Corrections, cancellations, and reversals add interpretations or compensating effects; they do not delete the original.
- Retention/anonymization may minimize identity or sensitive free-text fields after the configured class period, but it must preserve ledger, snapshot, decision, audit, and referential explainability according to `D-500` and `docs/06-security-operations.md`.

## 8. Time, identity, and effective-date semantics

- Domain identifiers are stable, opaque, organization-scoped, and never reused. Exact identifier type remains `D-201`.
- Date ranges use half-open semantics: `validFrom` is included and `validTo` is excluded; an absent end is open-ended.
- Date-only values remain dates. Event occurrence, decision, submission, recording, and audit times are instants.
- A punch event distinguishes the occurred instant from the later recorded/processing instant when they differ. Punch occurrence instants are minute-aligned; ordinary commands record the start of the trusted server minute while `recordedAt` retains normal instant precision.
- Elapsed durations use instant differences. Organization-local date attribution uses the explicit IANA timezone and records the timezone/rule version used by persisted projections or snapshots.
- Event reconstruction requires a deterministic total order. Equal occurred instants need explicit ordering evidence; database retrieval order is never a business rule.
- Configuration valid on the target local date controls calculations. Later configuration changes do not silently rewrite approved or locked history.
- A manually entered local date/time is resolved under the organization-timezone version applicable to the target date. Zero matching instants is `ATTENDANCE_NONEXISTENT_LOCAL_TIME`; two matching instants require the user to submit one of the valid UTC offsets or fail with `ATTENDANCE_AMBIGUOUS_LOCAL_TIME`.
- The organization timezone may be corrected before the first punch event, applied correction, absence request, daily time-account posting, or monthly period exists. After any such fact exists, ordinary timezone change fails with `ORGANIZATION_TIMEZONE_LOCKED`; a future migration requires its own ADR and validated reattribution plan.

## 9. Attendance command, state, and idempotency contract

This section is the accepted `WL-005` contract for ordinary employee clock actions. Manual or historical changes use the correction workflow and never impersonate an ordinary clock command.

### 9.1 Commands, state, and revision

The stable attendance command names are `CLOCK_IN`, `START_BREAK`, `RESUME`, and `CLOCK_OUT`. `RESUME` produces a `BREAK_END` event; the API route may use `/end-break`, but domain code and user-facing copy use “resume.”

The current attendance view contains:

- the server-derived state `OFF_WORK`, `WORKING`, or `ON_BREAK`;
- an integer `attendanceRevision`, initially `0`, which increments exactly once for each successfully committed attendance command;
- the valid actions for that state.

Every command submits the non-negative integer `expectedAttendanceRevision` most recently read from the server. A mismatched revision fails with `ATTENDANCE_STATE_CHANGED` before action/state validation and returns safe recovery context containing the current state, revision, and valid actions. A successful command increments the revision once even when it creates two events. A rejected command and an idempotent replay do not increment it.

The valid-action sets are:

| State | Valid actions |
|---|---|
| `OFF_WORK` | `CLOCK_IN` |
| `WORKING` | `START_BREAK`, `CLOCK_OUT` |
| `ON_BREAK` | `RESUME`, confirmed `CLOCK_OUT` |

An open session or break may cross a local-date boundary. It is incomplete for final daily calculation until closed, but the active state remains valid and accepts its normal closing action.

### 9.2 Complete transition and invalid-action matrix

| Current state | Command | Result | Next state | Events, in order |
|---|---|---|---|---|
| `OFF_WORK` | `CLOCK_IN` | Success | `WORKING` | `CLOCK_IN` |
| `OFF_WORK` | `START_BREAK` | `ATTENDANCE_NOT_WORKING` | Unchanged | None |
| `OFF_WORK` | `RESUME` | `ATTENDANCE_NOT_ON_BREAK` | Unchanged | None |
| `OFF_WORK` | `CLOCK_OUT` | `ATTENDANCE_ALREADY_OFF_WORK` | Unchanged | None |
| `WORKING` | `CLOCK_IN` | `ATTENDANCE_ALREADY_WORKING` | Unchanged | None |
| `WORKING` | `START_BREAK` | Success | `ON_BREAK` | `BREAK_START` |
| `WORKING` | `RESUME` | `ATTENDANCE_NOT_ON_BREAK` | Unchanged | None |
| `WORKING` | `CLOCK_OUT` | Success | `OFF_WORK` | `CLOCK_OUT` |
| `ON_BREAK` | `CLOCK_IN` | `ATTENDANCE_ALREADY_WORKING` | Unchanged | None |
| `ON_BREAK` | `START_BREAK` | `ATTENDANCE_ALREADY_ON_BREAK` | Unchanged | None |
| `ON_BREAK` | `RESUME` | Success | `WORKING` | `BREAK_END` |
| `ON_BREAK` | `CLOCK_OUT` without `confirmActiveBreak: true` | `ATTENDANCE_BREAK_CONFIRMATION_REQUIRED` | Unchanged | None |
| `ON_BREAK` | `CLOCK_OUT` with `confirmActiveBreak: true` | Success | `OFF_WORK` | `BREAK_END`, then `CLOCK_OUT` |

The confirmation flag is meaningful only for `CLOCK_OUT`. Sending it for another command is a validation failure rather than a new behavior. After a confirmation-required result, the confirmed user intent is a new request with a new idempotency key because its request fingerprint differs.

### 9.3 Event time and deterministic ordering

- Ordinary clock commands do not accept a client-supplied occurrence time. After locking and validation, the server observes the trusted clock once and records `occurredAt` at the start of that observed UTC minute; this is source precision, not later duration rounding.
- Accepted events have a strictly increasing per-employee `eventSequence`. Reconstruction orders by this sequence; identifiers, occurrence timestamps, insertion order, and database retrieval order are not tie-breakers.
- Every event from one command uses the same `occurredAt`, command identity, actor, and correlation identity. A multi-event command receives consecutive sequence numbers.
- Confirmed clock-out from `ON_BREAK` always appends `BREAK_END` first and `CLOCK_OUT` second at the same instant. This closes the break without inventing work after the break start.
- The captured instant must not precede the employee's latest accepted event instant. A detected server-clock regression is a retryable operational failure with no event, revision, audit, or terminal idempotency outcome; it is never silently clamped or treated as user input.
- `recordedAt` may be later than `occurredAt`, but both are persisted. A clock command uses organization-timezone rules only to attribute the event to local-date projections; it never converts a client wall-clock value into the occurrence instant.

The accepted event transitions used for reconstruction are `OFF_WORK + CLOCK_IN`, `WORKING + BREAK_START`, `ON_BREAK + BREAK_END`, and `WORKING + CLOCK_OUT`. Any other stored order is `ATTENDANCE_INVALID_EVENT_ORDER`; the engine returns structured incompleteness/conflict instead of guessing a state.

### 9.4 Authoritative processing order and transaction boundary

Each request is handled in this order:

1. Authenticate the account, validate CSRF protection, resolve the active employee, and authorize the command.
2. Validate the idempotency header and request shape, then compute the canonical request fingerprint.
3. Start one transaction and claim or load the idempotency key within its organization-and-actor scope.
4. If a terminal record exists, replay a matching fingerprint or reject a different fingerprint with `IDEMPOTENCY_KEY_CONFLICT`; do not re-run state validation.
5. Lock and load the employee's current ordered attendance facts, derived state, and `attendanceRevision`.
6. Reject a stale `expectedAttendanceRevision` with `ATTENDANCE_STATE_CHANGED`.
7. Validate the command against the transition matrix, including on-break clock-out confirmation.
8. Capture the trusted occurrence instant once, allocate the event sequence number or numbers, and append all required punch events.
9. Increment the attendance revision once and append exactly one data-minimized attendance audit event that references every created event.
10. Persist the terminal idempotency outcome and commit all effects together before returning it.

A successful command cannot expose or commit a partial state. In particular, confirmed on-break clock-out cannot persist only `BREAK_END`, only `CLOCK_OUT`, an incremented revision without both events, or an audit/idempotency result detached from the events. A rollback leaves the pre-command state intact.

Authentication, authorization, CSRF, malformed JSON, an invalid/missing idempotency key, and request-schema failures occur before a terminal idempotency outcome is recorded. Once a valid request fingerprint is claimed, deterministic domain and stale-state conflicts are terminal outcomes for that key. Retryable dependency/internal failures are not terminal unless the business transaction actually committed.

The terminal success snapshot identifies the command, the server occurrence instant, created event identities/types/order, resulting state, resulting attendance revision, and valid actions. A terminal error snapshot contains its stable code and only safe recovery context. Domain/concurrency rejection creates no punch event, revision increment, or attendance audit event; its idempotency record is the only persisted retry artifact. Replaying any terminal outcome creates no new attendance audit event.

### 9.5 Idempotency key and fingerprint rules

- Every attendance mutation requires one `Idempotency-Key` HTTP header. It is an opaque, client-generated value matching `[A-Za-z0-9._~-]{16,128}`; a UUID is an accepted form. It is never accepted from the request body.
- Key uniqueness is scoped by organization and authenticated actor account, not by endpoint. Reusing a key for another command is therefore a fingerprint conflict.
- The fingerprint includes organization, actor account, resolved employee, HTTP method, command, and normalized body. The normalized body contains `expectedAttendanceRevision`; `CLOCK_OUT` additionally normalizes an omitted `confirmActiveBreak` to `false`. Object-key order is irrelevant, and unknown fields are rejected. The fingerprint excludes the key itself, request/correlation IDs, cookies/tokens, transport timing, and server-generated occurrence time.
- Same scope, key, and fingerprint returns the original terminal HTTP status and semantic data/error snapshot. The replay has a fresh transport `requestId` and identifies `idempotentReplay: true`; these transport fields are not part of semantic equality.
- Same scope and key with a different fingerprint returns `IDEMPOTENCY_KEY_CONFLICT` with no attendance effect. The response does not reveal the original request body.
- Concurrent requests with the same key serialize on the unique claim: one processes, and the other replays the committed terminal result. They cannot both append events.
- Attendance idempotency records have no MVP expiry and remain linked to attendance history. A future retention change may minimize the stored key to a safe digest/tombstone, but it must preserve collision detection and replay safety.
- Idempotency keys and fingerprints are sensitive operational metadata: do not place raw values in URLs, analytics, audit events, or normal logs.

Idempotency is not authorization. Authentication, current employee capability, organization scope, CSRF, and endpoint authorization are checked before any replay, so an old key cannot restore a revoked session or capability.

### 9.6 Retry, stale-state, tab, and device behavior

| Situation | Required outcome |
|---|---|
| Double-click or automatic retry of one intent | Reuse the same key. One terminal command outcome and at most one event set exist. |
| Response lost after commit | Retry with the same key replays the committed outcome. |
| Failure before commit | Retry with the same key may process normally; no partial event set exists. |
| Same key, edited command or confirmation | `IDEMPOTENCY_KEY_CONFLICT`; the changed intent must use a new key. |
| Two tabs/devices, different keys, same revision | Transaction locking lets one valid command commit. The loser returns `ATTENDANCE_STATE_CHANGED` and the current state/revision. |
| Deliberate invalid action using the current revision | Return the state-specific conflict from the transition matrix; no event or revision change. |
| Old key replayed after later valid commands | Return the original operation snapshot marked as a replay; it must not overwrite a newer client cache. |
| Browser offline before sending | No server effect and no offline queue. Reconnect, refetch, then create a new deliberate intent. |
| Network result unknown | Keep the same key while retrying that same intent; refetch authoritative state before starting a different intent. |

The web client does not optimistically claim a new attendance state. It disables repeat activation for the pending command in that tab, uses bounded automatic retry only for network/retryable server failures with the same key, and never retries validation/domain/concurrency conflicts automatically. After every definitive success, replay, or conflict, it invalidates/refetches the authoritative Today query; a response with an older `attendanceRevision` cannot replace a newer cached view.

Pending state is conveyed through text and control state, not motion alone. Success is announced once. Confirmation-required, stale-state, offline, and dependency failures receive concise recovery text; a state refresh does not unexpectedly move focus unless a dialog or error-summary rule requires it. No running timer or retry loop is announced repeatedly.

## 10. Daily calculation contract

`WL-006` fixes the deterministic daily calculation boundary. The absence domain supplies effective approved-or-reported credit or expected-reduction inputs, but it cannot change the arithmetic or double-credit covered time.

### 10.1 Identified inputs and output identity

One calculation targets one employee and one organization-local date. Its identified input set contains:

- ordered immutable punch events and the applied correction versions used to reconstruct intervals;
- the work-schedule and time-policy assignment/version effective on the local date;
- the holiday fact, if any, for that local date;
- effective approved-or-reported absence-credit and expected-reduction segments supplied by the absence domain;
- approved signed daily adjustments;
- organization timezone ID plus the timezone-rule data/version used for attribution;
- calculation-engine version; and
- a trusted injected `calculationAsOf` instant for provisional or incomplete estimates.

A source fingerprint identifies those inputs and their versions. The same fingerprint produces the same complete result. `calculationAsOf` participates in a provisional/incomplete fingerprint but not in a complete historical result. A persisted projection retains its fingerprint and source/version references; it never becomes authority over its inputs.

### 10.2 Expected minutes

The weekly schedule supplies integer `scheduledMinutes` for the weekday in the target local date. The accepted range is `0` through `1440`; zero is a deliberate zero-hour day, while a missing or overlapping schedule/policy assignment is a structured blocker.

```text
expected minutes = scheduled minutes
                 - holiday expected-reduction minutes
                 - effective absence expected-reduction minutes
```

- A configured holiday contributes a reduction equal to scheduled minutes, so expected minutes are zero.
- Holiday reduction is applied once even if configuration overlaps, and default absence credit/entitlement consumption on the holiday is zero.
- An absence expected reduction is an explicit effective policy input owned by `WL-007`; it is zero unless that policy chooses expectation neutralization.
- Reduction segments cannot overlap each other, cannot reduce the same scheduled minute twice, and cannot make expected minutes negative.
- The weekday expectation does not expand or contract because a daylight-saving local date contains 23 or 25 elapsed hours.

### 10.3 Worked and break minutes

The domain reconstructs work sessions from event sequence, derives non-overlapping work and break intervals, and then intersects each interval with the target local-day boundaries.

- Local-day boundaries are the instants represented by the start of the local date and the start of the following local date in the organization timezone. Their elapsed distance is derived from timezone rules and must never be assumed to be 1440 minutes; the Athens fixtures include 1380- and 1500-minute dates.
- A cross-midnight interval is split at that instant boundary. Source events and work-session identity remain intact.
- Segment duration is the exact difference between minute-aligned instants. The engine applies no per-event, per-interval, daily, policy, or display rounding.
- `workedMinutes` is the sum of work-segment durations. `breakMinutes` is the separate sum of break-segment durations and is never subtracted from worked minutes again.
- Across every local-date split of a complete session, work-segment minutes plus break-segment minutes equal the session's elapsed instant duration; splitting cannot lose or duplicate a minute.
- Valid zero-duration intervals are non-negative and contribute zero. Overlap returns `ATTENDANCE_OVERLAP`; negative duration/invalid order returns `ATTENDANCE_INVALID_EVENT_ORDER`; non-minute-aligned source input returns `ATTENDANCE_INVALID_EVENT_PRECISION`. Each produces structured incompleteness rather than guessed minutes.

### 10.4 Credited minutes and balance

```text
worked minutes = sum(valid daily work-segment elapsed minutes)

break minutes = sum(valid daily break-segment elapsed minutes)

credited minutes = worked minutes
                 + effective absence-credit minutes
                 + approved signed adjustment minutes

daily balance minutes = credited minutes - expected minutes
```

Effective absence-credit segments cannot overlap credited work or another credited absence segment. `creditedMinutes` must remain non-negative; an input set that would make it negative is invalid rather than silently clamped. `dailyBalanceMinutes` is signed and may be positive, zero, or negative.

The engine reports the real credited and balance minutes before policy warnings. It does not cap positive or negative flexible-time delta, silently discard time, infer a break, or classify the result as payable/legal overtime.

### 10.5 Calculation status and provisional values

`calculationStatus` is one of:

| Status | Meaning | Final credited/balance values | Posting eligibility |
|---|---|---|---|
| `PROVISIONAL` | The target is the current local date and may still receive attendance or approved source changes. | Absent; a separately named provisional breakdown may be shown using `calculationAsOf`. | Not eligible. |
| `INCOMPLETE` | Required configuration is missing/overlapping, event order/overlap is invalid, or a session/break touching a past date remains open. | Absent; a clearly labelled estimate may be shown when safe. | Not eligible; submission blocker. |
| `COMPLETE` | The local date has ended, required inputs resolve, and every attendance sequence touching it is complete and valid. | Required and deterministic. | Eligible for daily posting. |

`INCOMPLETE` takes precedence whenever required inputs are missing or invalid. Otherwise the current local date is `PROVISIONAL`; a past local date is `COMPLETE` only when every touching sequence is closed and valid.

Future schedule previews are not daily attendance records. For a provisional active `WORKING` interval, the estimate ends at the earlier of `calculationAsOf` and the target local-day end; for `ON_BREAK`, worked minutes stop at `BREAK_START` while provisional break minutes continue to that bound. Once the date has ended, an open sequence is `INCOMPLETE`, not final.

Every response exposes the status in text, not color alone. Provisional/incomplete estimates use distinct field names and never populate final credited/balance fields, enter the posted balance, or satisfy monthly submission readiness.

## 11. Corrections and adjustments

A correction request records target, original value, proposed value, requester, reason, submission instant, decisions, final applied interpretation, resulting impact, and locked-period context.

- Original punch events remain immutable.
- Ordinary corrections require an eligible non-self decision.
- Approval of an unlocked correction creates a source-linked applied interpretation and recalculation; it does not mutate the event.
- A correction affecting a locked period creates a linked post-lock adjustment and leaves the approved snapshot unchanged.
- HR privileged adjustments use their own explicit source, reason, non-self actor, and audit event.
- Reversal appends another source-linked correction/adjustment; it never deletes history.

## 12. Absence, entitlement, and cancellation contract

`WL-007` fixes the bounded policy model, coverage arithmetic, workflow transitions, entitlement effects, overlap behavior, cancellation reversals, and sickness privacy boundary. Every request snapshots the effective absence-type version; later configuration changes never reinterpret a submitted, reported, decided, or cancelled request.

### 12.1 Versioned policy matrix

An absence-type version contains a stable code and display name, effective range, active state, workflow, allowed coverage units, optional entitlement-account category, pending-reservation behavior, time-calculation treatment, lead/retrospective limits, request-note mode, and neutral availability behavior. Its configuration is bounded rather than an arbitrary workflow builder:

- workflow is `APPROVAL_REQUIRED` or `REPORT_AND_ACKNOWLEDGE`;
- allowed coverage is a non-empty subset of `FULL_DAY`, `HALF_DAY`, and `MINUTES`;
- time treatment is `CREDIT_COVERED_EXPECTATION`, `REDUCE_COVERED_EXPECTATION`, or `NO_TIME_EFFECT`;
- request-note mode is `DISABLED`, `OPTIONAL`, or `REQUIRED`; sickness forces `DISABLED`;
- an entitlement account is optional, but `RESERVE_PENDING` requires both an entitlement account and `APPROVAL_REQUIRED`;
- `REPORT_AND_ACKNOWLEDGE` cannot deduct an entitlement account in the MVP; and
- all team/agenda projections serialize `UNAVAILABLE` with localized neutral text, never the absence-type name.

| Type | Workflow default | Entitlement behavior | Time-calculation default | Coverage / note default | Team projection |
|---|---|---|---|---|---|
| Vacation | `APPROVAL_REQUIRED` | Vacation account; reserve on submission, deduct on approval | `CREDIT_COVERED_EXPECTATION` | Full day, half day, minutes; optional operational note | `UNAVAILABLE` |
| Sickness | `REPORT_AND_ACKNOWLEDGE` | None | `CREDIT_COVERED_EXPECTATION`; versioned organization policy may choose another treatment | Full day, half day, minutes; note disabled; no attachment | `UNAVAILABLE` |
| Unpaid leave | `APPROVAL_REQUIRED` | None | `REDUCE_COVERED_EXPECTATION` | Full day, half day, minutes; optional operational note | `UNAVAILABLE` |
| Other | Either bounded workflow | None or one configured entitlement account; entitlement requires approval | One configured treatment | Configured allowed units and note mode, subject to the constraints above | `UNAVAILABLE` |

These defaults are product behavior, not a statement of employment law. HR may create a future effective policy version, but a version cannot rewrite existing request effects.

### 12.2 Coverage units and minute arithmetic

For one employee/local date, let `baseExpectedMinutes` be scheduled minutes after the holiday reduction and before absence reductions. It is an integer from `0` through `1440`.

| Coverage unit | Required input | Nominal covered-obligation minutes | Overlap identity |
|---|---|---:|---|
| `FULL_DAY` | One local date | `baseExpectedMinutes` | Overlaps every absence segment on that date. |
| `HALF_DAY` | One local date and `FIRST_HALF` or `SECOND_HALF` | `FIRST_HALF = floor(baseExpectedMinutes / 2)`; `SECOND_HALF = baseExpectedMinutes - FIRST_HALF` | The two portions are disjoint; equal portions overlap. They are obligation portions, not AM/PM clock ranges. |
| `MINUTES` | One local date plus minute-aligned half-open local interval `[start, end)` | The interval's valid elapsed minutes, limited to the remaining `baseExpectedMinutes` for the request/date | Overlaps another minute segment by interval intersection. It cannot coexist with full/half coverage on that date because their clock-time relationship is undefined. |

- A multi-date request expands to immutable per-date coverage segments. Weekend, zero-hour, and holiday dates remain visible coverage but contribute zero default entitlement, credit, or expected reduction.
- Full/half coverage is schedule-relative. A person needing a clock-specific absence chooses `MINUTES`; the UI must not relabel `FIRST_HALF`/`SECOND_HALF` as morning/afternoon.
- For an odd expectation, the deterministic partition preserves every minute: `481` becomes `240` first-half minutes and `241` second-half minutes. This is a partition, not a later rounding rule.
- Minute-specific local boundaries use the same timezone semantics as manual attendance: nonexistent local time returns `ABSENCE_NONEXISTENT_LOCAL_TIME`, and ambiguous time without one valid explicit offset returns `ABSENCE_AMBIGUOUS_LOCAL_TIME`. A segment cannot cross local midnight; clients split it into date segments.
- The sum of one request's nominal segments for a date cannot exceed `baseExpectedMinutes`. Duplicate or overlapping request segments fail before persistence.

Entitlement consumption and expected reduction use nominal covered-obligation minutes. Paid absence credit must additionally avoid credited work:

- for `FULL_DAY`/`HALF_DAY`, effective absence credit fills at most the unworked part of that date's covered obligation, so work plus quantity-based absence credit cannot credit the same obligation twice;
- for `MINUTES`, subtract the exact intersection with credited work; non-overlapping work remains fully credited and may produce positive flexible time; and
- work intersecting effective absence produces `WORK_DURING_ABSENCE` for review. It does not silently reduce the approved entitlement deduction; cancellation or correction changes that history.

### 12.3 Entitlement ledger equations and transition effects

Leave entitlement uses integer minutes. Hours and schedule-relative day equivalents are presentation values only; calculations, validation, APIs, and ledger entries never use floating-point days.

```text
available entitlement minutes = sum(final-balance entitlement entries)

active reserved minutes = -sum(active reservation-dimension entries)

projected remaining minutes = available entitlement minutes
                            - active reserved minutes
```

Final-balance entries include allocation, approved deduction, cancellation restoration, carryover, expiry, and manual adjustment. Reservation-dimension entries are `PENDING_RESERVATION` with `-N` and its linked `RESERVATION_RELEASE` with `+N`; they do not also change available entitlement.

| Source transition | Reservation entries | Final-balance entries | Time-calculation effect |
|---|---|---|---|
| Submit/resubmit approval-required entitlement request | `PENDING_RESERVATION -N` | None | None while pending. |
| Approve | `RESERVATION_RELEASE +N` | `APPROVED_DEDUCTION -N` | Create the approved effect from the decided request version. |
| Reject or requester withdraws pending request | `RESERVATION_RELEASE +N` | None | None. |
| Reviewer requests changes | `RESERVATION_RELEASE +N` | None | None until a new version is resubmitted and reserved. |
| Approve cancellation of entitlement-backed coverage | None | `CANCELLATION_RESTORATION +C` linked to the deduction | Remove the targeted effective effect and recalculate. |
| Reject cancellation | None | None | Original effective coverage remains. |

`N` is the submitted version's nominal covered minutes and `C` is the still-effective cancelled subset, never more than the linked deduction remaining unrestored. Approval atomically releases the reservation and deducts the same amount; this changes available and pending values while leaving projected remaining unchanged.

A request may reserve enough minutes to make projected remaining negative so the need remains reviewable. Ordinary manager approval then fails with `ABSENCE_INSUFFICIENT_BALANCE`. Only an eligible non-self HR administrator may approve with an explicit negative-balance override and reason; the decision, reason, negative result, deduction, source links, and audit event commit together. The requester can never use a combined HR role to override their own balance.

### 12.4 Workflow state and decision matrix

Every mutation submits the expected request/cancellation version. A stale or concurrent transition fails with `ABSENCE_STATE_CHANGED`; unique semantic source keys prevent repeated reservation, release, deduction, restoration, and calculation effects.

#### Approval-required requests

| Current state | Action / actor | Next state | Required effect |
|---|---|---|---|
| New | Submit / employee | `PENDING_APPROVAL` | Validate coverage/scope/overlap and append reservation when configured. |
| `CHANGES_REQUESTED` | Resubmit new version / employee | `PENDING_APPROVAL` | Preserve prior version; revalidate and append a reservation for the new version. |
| `PENDING_APPROVAL` | Approve / eligible non-self manager or HR | `APPROVED` | Release reservation, deduct entitlement when configured, create effective absence, recalculate affected unlocked dates, audit. |
| `PENDING_APPROVAL` | Reject / eligible non-self manager or HR | `REJECTED` | Reason required; release reservation; no absence effect. |
| `PENDING_APPROVAL` | Request changes / eligible non-self manager or HR | `CHANGES_REQUESTED` | Reason required; release reservation; no absence effect. |
| `PENDING_APPROVAL` or `CHANGES_REQUESTED` | Withdraw / requester | `WITHDRAWN` | Release any active reservation; no absence effect. |

#### Report-and-acknowledge requests

| Current state | Action / actor | Next state | Required effect |
|---|---|---|---|
| New | Report / employee | `REPORTED` | Validate policy/coverage/retrospective limit/overlap, create the effective absence immediately, recalculate affected unlocked dates, audit. |
| `REPORTED` | Acknowledge / eligible non-self manager or HR | `ACKNOWLEDGED` | Record acknowledgement only; never add entitlement or time effect again. |
| `REPORTED` or `ACKNOWLEDGED` | Request changes / eligible non-self manager or HR | `CHANGES_REQUESTED` | Reason required; keep the latest reported version effective until replacement or cancellation. |
| `CHANGES_REQUESTED` | Resubmit corrected version / employee | `REPORTED` | Atomically replace the current effect, revalidate overlap, and recalculate only the difference. |

Report-and-acknowledge requests cannot be rejected as if approval were required. If reported coverage must cease, the requester uses the cancellation workflow. The default sickness retrospective limit is `7` organization-local calendar days, configurable per effective policy from `0` through `365`; the start date cannot be in the future, and no hardcoded legal claim is implied.

### 12.5 Overlap and effective-coverage rules

- Pending approval, reported, acknowledged, approved, changes-requested-with-effective-report, and cancellation-pending coverage blocks incompatible new coverage. Rejected, withdrawn, and fully cancelled coverage does not.
- `FULL_DAY` conflicts with any segment on its date. Equal half portions conflict; first and second halves may coexist. Minute intervals may coexist only when their half-open ranges are disjoint. Any mixture of minute and full/half units on the same date is rejected as ambiguous.
- The rule applies across vacation, sickness, unpaid leave, and other types. An absence-type version cannot configure double credit or allow two effective effects to cover the same segment.
- Overlap validation, current-scope authorization, entitlement validation, workflow write, ledger effects, daily-source replacement/recalculation request, notification record, and audit event are one transaction. A conflict writes none of them.
- Conflict responses reveal only coverage already authorized to the actor. Team availability never becomes an overlap-inspection API.

### 12.6 Cancellation and reversal

An employee may request cancellation of all or a strict non-overlapping subset of the original request's still-effective coverage. Cancellation is never a delete or an edit of the request, decision, deduction, or prior daily posting.

Cancellation is a separate workflow with states `PENDING_DECISION`, `CHANGES_REQUESTED`, `APPROVED`, `REJECTED`, and `WITHDRAWN`. The original request/decision state remains historical; its derived effective-coverage view may additionally show `CANCELLATION_PENDING`, `PARTIALLY_CANCELLED`, or `CANCELLED`.

| Cancellation state | Action / actor | Next state | Effect on original absence |
|---|---|---|---|
| New | Submit subset / requester | `PENDING_DECISION` | None; target is marked cancellation-pending and remains effective. |
| `PENDING_DECISION` | Approve / eligible non-self manager or HR | `APPROVED` | Remove exact target, restore linked entitlement when applicable, and recalculate atomically. |
| `PENDING_DECISION` | Reject / eligible non-self manager or HR | `REJECTED` | Reason required; target remains effective. |
| `PENDING_DECISION` | Request changes / eligible non-self manager or HR | `CHANGES_REQUESTED` | Reason required; target remains effective. |
| `CHANGES_REQUESTED` | Resubmit valid subset / requester | `PENDING_DECISION` | Preserve prior cancellation version; revalidate against still-effective coverage. |
| `PENDING_DECISION` or `CHANGES_REQUESTED` | Withdraw / requester | `WITHDRAWN` | Clear pending marker; original coverage remains effective. |

1. Submission validates that every targeted minute/portion is still effective and not already cancellation-pending. The original absence remains effective while cancellation is pending.
2. An eligible current manager or HR administrator other than the requester approves, rejects, or requests changes with optimistic concurrency. Rejection/changes requested has no entitlement or calculation effect.
3. Approval records the cancellation decision, subtracts exactly the targeted effective coverage, appends any linked entitlement restoration, replaces the absence calculation input, initiates unlocked-date recalculation, and appends audit/notification evidence atomically.
4. Remaining effective coverage yields `PARTIALLY_CANCELLED`; no remaining coverage yields `CANCELLED`. Additional cancellation may target only the remaining coverage.
5. A retry or concurrent cancellation cannot restore or remove the same coverage twice. `ABSENCE_CANNOT_CANCEL` returns safe remaining-coverage context to an authorized actor.
6. An ordinary cancellation containing a locked date fails with `PERIOD_ADJUSTMENT_REQUIRED`; locked and unlocked coverage must be submitted separately, and the locked portion follows the `WL-008` post-lock contract without changing the approved snapshot.

### 12.7 Sickness privacy and data minimization

- Sickness classification is sensitive HR data. There is no diagnosis, symptom, treatment, clinician, medical-document, unrestricted note, or attachment field in the MVP.
- The employee sees their own type, coverage, status, and decision history. A current manager's review DTO contains only employee identity, `SICKNESS`, coverage, workflow status, submission/decision context, and safe actions. HR receives only the additional administration fields required by the workflow.
- Team status/calendar/agenda, generic notifications, technical audit, operational logs, and generic report/export DTOs use neutral `UNAVAILABLE`/absence action data and never expose sickness classification.
- Absence type, request note, decision reason, entitlement amount, or sickness classification is never placed in a URL. Detailed privacy, cache, export, logging, notification, retention, and user-control rules are in `docs/06-security-operations.md`.

## 13. Monthly-period contract

### 13.1 Persisted state and derived presentation

Persisted workflow states are `OPEN`, `SUBMITTED`, `CHANGES_REQUESTED`, `APPROVED`, and `LOCKED`. `INCOMPLETE` and `READY_FOR_SUBMISSION` are derived readiness values while `OPEN` or `CHANGES_REQUESTED`; `ADJUSTED_AFTER_LOCK` is a derived flag/view over `LOCKED`, never a replacement workflow state. A period has a strictly increasing `periodVersion`; every mutation supplies the expected version.

A period covers exactly one employee and one organization-local calendar month. The organization timezone is already immutable once period facts exist, so its date boundaries cannot drift. Readiness is recalculated from identified daily results and workflow sources, not manually assigned.

### 13.2 Readiness and submission

A period is `READY_FOR_SUBMISSION` only after the month has ended in the organization timezone and every covered employed date has a final `COMPLETE` daily result, all eligible dates have their base daily posting, and no submission blocker remains. Blockers include incomplete/overlapping attendance, missing schedule or policy, unresolved correction requests affecting the month, unresolved approval-required absence affecting the month, and any source-to-ledger inconsistency. Non-blocking warnings do not prevent submission, but the employee must acknowledge the exact current warning-code/source set; any source/version change invalidates that acknowledgement.

Employee submission validates self ownership, current employee capability, readiness, warning acknowledgement, and `expectedPeriodVersion`. It atomically changes `OPEN` or `CHANGES_REQUESTED` to `SUBMITTED`, records the submitted source fingerprint, actor and instant, increments the version once, and appends audit/notification evidence. It creates no snapshot. Ordinary attendance, absence, correction, policy, posting, or administrative mutation that would affect a `SUBMITTED` or `APPROVED` month returns `PERIOD_REOPEN_REQUIRED`; no caller may silently mutate and recompute it.

### 13.3 Review transitions and authorization

Only the employee's current effective direct manager may review, approve, request changes, or lock. Scope is re-evaluated for every action; historical scope and delegation grant no access. No actor may approve or lock their own employee period, including through combined roles. HR and system-administrator capability do not independently grant period approval or lock capability.

| Current state | Command | Required reason | Result |
|---|---|---|---|
| `SUBMITTED` | Request changes | Yes | `CHANGES_REQUESTED`; records decision, invalidates the submitted fingerprint, and permits ordinary source correction before resubmission. |
| `SUBMITTED` | Approve | No | `APPROVED`; creates the next immutable numbered approval snapshot and decision atomically. |
| `APPROVED` | Request changes | Yes | `CHANGES_REQUESTED`; allowed only before lock, preserves the superseded approval snapshot as history, and requires a new submission/approval cycle. |
| `APPROVED` | Lock | No | `LOCKED`; fixes the latest approval snapshot as the locked baseline without rebuilding it. |
| Any other state | Any review command | N/A | `PERIOD_STATE_CONFLICT`; no partial effect. |

Approval and lock are deliberately separate manager actions for the MVP (`D-400`). Installations cannot configure automatic or approval-implies-lock behavior in the initial release. Before either action commits, authorization, state, expected version, source fingerprint, ledger reconciliation, and current blocker status are rechecked inside one transaction. Approval fails if sources differ from submission; lock fails if current sources or ledger differ from the approved snapshot. Each successful command records actor, instant, prior/new state, version, and safe audit/notification data.

### 13.4 Immutable approval snapshot

An approval snapshot is a canonical persisted document with `snapshotSchemaVersion`, `calculationEngineVersion`, organization/employee/period identity, organization timezone, calendar boundaries, approval-cycle number, snapshot ID, creation instant, approver identity, approved `periodVersion`, submitted source fingerprint, and a canonical snapshot fingerprint.

It contains an ordered row for every local date with calculation status; source fingerprint; scheduled, holiday-reduction, absence-expected-reduction, expected, worked, break, absence-credit, adjustment, credited, and daily-balance integer minutes; structured warning codes; and references to the effective schedule, policy, holiday, applied-correction, neutral absence-effect, adjustment, and daily-ledger source/version IDs needed for reproduction. It also contains period sums for each minute field, opening and closing posted time-account balances, and the exact ordered ledger-entry IDs/amounts included through month end.

The snapshot stores neutral absence-effect references and aggregate minutes, not sickness classification, request/reviewer notes, diagnosis, entitlement balances, or other purpose-incompatible HR detail. Referenced protected records remain independently authorized. Snapshot rows and totals must reconcile exactly; approval writes the snapshot, decision, state/version, audit, and notification records atomically. Snapshots are append-only and never rebuilt, edited, or deleted by ordinary flows.

### 13.5 Lock and post-lock adjustment

Locking changes workflow state only; it does not create a second snapshot or ledger effect. A locked period rejects ordinary source mutation, cancellation, recalculation posting, return, or unlock. There is no MVP unlock command.

A post-lock correction/cancellation begins a separate request that names the locked snapshot, target source and local dates, original/proposed interpretation, reason, and expected adjustment-request version. An eligible current manager may decide it under ordinary correction scope; when the change requires privileged HR authority (for example entitlement override), the eligible non-self HR actor supplies that authority and reason. No actor may decide or privileged-adjust their own period.

Approval atomically preserves the original sources and snapshot; creates the approved interpretation/effect; appends one or more uniquely source-keyed `POST_LOCK_ADJUSTMENT` time-account entries and any exact leave-entitlement compensating entries; records per-date signed deltas and a net delta against the locked baseline; advances the adjustment/current-view version; and writes decision, audit, and notifications. Zero time-account delta retains the decision and linked adjustment record without a zero ledger entry. Rejection changes no calculation or ledger effect.

The approved view always renders the immutable snapshot. The current adjusted view renders that baseline plus the ordered, non-superseded adjustment chain and separately reports original closing balance, cumulative post-lock delta, and adjusted closing balance. Reversal appends a compensating linked adjustment; it never deletes or edits an earlier adjustment. Concurrent decisions serialize by expected versions and semantic source uniqueness so at most one effect commits.

## 14. Ledger semantics

Time-account entry types are opening balance, daily delta, daily recalculation delta, post-lock adjustment, manual administrative adjustment, and later explicitly supported carryover/expiry types. A correction to an unlocked date is one source of a daily recalculation delta rather than a mutable “corrected balance.”

Leave-entitlement entry types are `ALLOCATION`, `PENDING_RESERVATION`, `RESERVATION_RELEASE`, `APPROVED_DEDUCTION`, `CANCELLATION_RESTORATION`, `CARRYOVER`, `EXPIRY`, and `MANUAL_ADJUSTMENT`. Reservation/release entries affect the pending-reservation dimension; the other types affect final available entitlement. A projection may combine those dimensions, but it cannot sum a reservation as both pending and final.

- Entries are append-only signed facts; a negative account balance is valid where policy permits, while a duration itself is never negative.
- Every entry records organization, subject employee, source identity, actor or system process, recorded instant, effective date, signed integer-minute amount, and explanation code.
- Reversal uses a new entry linked to the original.
- Displayed balances and projections are sums of authorized entries plus clearly distinguished unposted projections when applicable.
- Every entitlement-backed absence transition uses the exact signed sequence in section 12.3. Source uniqueness includes request identity, request version, coverage identity, transition, and entitlement account so retries cannot double-reserve, release, deduct, or restore.

### Daily time-account posting lifecycle

1. `PROVISIONAL` and `INCOMPLETE` daily records never post a time-account effect.
2. An idempotent posting process may post a `COMPLETE` past date. It appends exactly one base `DAILY_DELTA` equal to that calculation's `dailyBalanceMinutes`, including a zero-minute entry when the balance is zero, and links the employee, local date, source fingerprint, and calculation version.
3. The base entry, posting marker/result, and audit event commit atomically. A unique semantic source key makes retries return the existing result rather than append another entry.
4. If an unlocked date later receives an approved correction, absence effect, or other authorized source change, recalculate it. Append one `DAILY_RECALCULATION_DELTA` equal to the new daily balance minus the net time-account effect already linked to that local date. Do not mutate the base entry.
5. If that difference is zero, append no balance entry; preserve the source decision and recalculation/audit evidence.
6. A locked-date change never uses ordinary recalculation posting. It follows the post-lock adjustment contract and preserves the approved snapshot.

`postedBalanceMinutes` is the sum of time-account ledger entries. A separately labelled `projectedBalanceMinutes` may add eligible unposted complete/provisional projections; it excludes incomplete dates and lists them as blockers. A projected balance never replaces or masquerades as the posted ledger balance.

## 15. Invariant catalog

These IDs are stable references for domain errors, tests, reviews, and later persistence constraints. A later task may refine enforcement details without changing the meaning silently.

### Identity and organization

| ID | Invariant |
|---|---|
| `INV-ID-001` | Every domain record belongs to exactly one organization; cross-organization references are invalid. |
| `INV-ID-002` | Stable domain identities are never reused for a different logical record. |
| `INV-ID-003` | An account links to at most one active employee, and an employee has at most one active account link. |
| `INV-ID-004` | Employment periods for one employee do not overlap; at most one is current. |
| `INV-ID-005` | Team assignments for one employee do not overlap; at most one is current. |
| `INV-ID-006` | Manager assignments for one employee do not overlap; at most one is current, no employee manages themselves, and the current manager graph is acyclic. |
| `INV-ID-007` | Account or employee deactivation never deletes attendance, workflow, ledger, snapshot, or audit history. |

### Time and configuration

| ID | Invariant |
|---|---|
| `INV-TIME-001` | Durations and balances use integer minutes; durations are non-negative and signed balances/ledger amounts may be negative. |
| `INV-TIME-002` | Event times are instants, business dates are date-only values, and every local-date conversion uses an explicit IANA timezone. |
| `INV-TIME-003` | Effective ranges are half-open and require `validFrom < validTo` when an end exists. |
| `INV-TIME-004` | Schedule and policy assignments for one employee do not overlap for the same local date. |
| `INV-TIME-005` | A required schedule or policy gap is a structured configuration failure, never an implicit zero/default. |
| `INV-TIME-006` | At most one holiday effect is counted for an organization/local date, even if configuration sources overlap. |
| `INV-TIME-007` | A later schedule, policy, holiday, timezone, or calculation-engine change cannot silently rewrite an approved/locked result. |
| `INV-TIME-008` | Punch occurrence instants and manual attendance time inputs are minute-aligned; elapsed calculations apply no later rounding. |
| `INV-TIME-009` | Daily interval boundaries use timezone-aware start-of-date instants; calculation never assumes every local date contains 1440 elapsed minutes. |
| `INV-TIME-010` | Nonexistent manual local time is rejected; ambiguous manual local time requires one valid explicit UTC offset. |
| `INV-TIME-011` | Once time-dependent employee facts exist, ordinary organization-timezone change is prohibited. |

### Attendance and reconstruction

| ID | Invariant |
|---|---|
| `INV-ATT-001` | Punch events are immutable after creation and retain occurred/recorded time, actor/source, organization, employee, and event type. |
| `INV-ATT-002` | An employee has exactly one derived active attendance state at a time. |
| `INV-ATT-003` | Accepted punch events have deterministic total order; reconstruction never relies on unspecified storage order. |
| `INV-ATT-004` | A work session begins with one clock-in and, when complete, ends with one clock-out later in the event sequence. |
| `INV-ATT-005` | A break begins and ends inside one work session; breaks cannot overlap or nest. |
| `INV-ATT-006` | Derived work and break intervals have non-negative duration and do not overlap illegally. |
| `INV-ATT-007` | Work intervals exclude break intervals, so break time is subtracted exactly once. |
| `INV-ATT-008` | Overnight work is split for daily calculation at organization-local midnight without splitting or rewriting source events. |
| `INV-ATT-009` | Elapsed minutes use instant differences, including across daylight-saving transitions. |
| `INV-ATT-010` | The same idempotency key and fingerprint returns the original outcome; the same key with a different fingerprint cannot create another effect. |
| `INV-ATT-011` | State validation, all events from one attendance action, idempotency outcome, and audit effect are atomic. |
| `INV-ATT-012` | Ordinary attendance commands use one trusted server occurrence instant and a strictly increasing per-employee event sequence; they never accept a client occurrence time. |
| `INV-ATT-013` | One successful attendance command increments `attendanceRevision` exactly once; rejection and replay do not increment it. |
| `INV-ATT-014` | Confirmed clock-out from `ON_BREAK` appends consecutive `BREAK_END` then `CLOCK_OUT` events at one instant or appends neither. |

### Calculation, corrections, and ledgers

| ID | Invariant |
|---|---|
| `INV-CAL-001` | The same identified source facts, configuration versions, timezone rules, calculation-engine version, and clock input produce the same result. |
| `INV-CAL-002` | Worked minutes sum work intervals; credited minutes add effective absence credit and signed adjustments; daily balance equals credited minus expected. |
| `INV-CAL-003` | Incomplete or conflicting attendance cannot produce an unlabeled final credited result or final ledger effect. |
| `INV-CAL-004` | Expected minutes equal scheduled minutes minus non-overlapping holiday and effective absence expected reductions and cannot be negative. |
| `INV-CAL-005` | Only a `COMPLETE` past-date calculation may expose final credited/balance values or become eligible for daily posting. |
| `INV-CAL-006` | Calculation applies no hidden rounding, cap, inferred break, discarded time, or payroll/overtime classification. |
| `INV-CAL-007` | Worked and effective absence credit cannot cover the same minute twice, and credited minutes cannot be negative. |
| `INV-CAL-008` | Across daily splits of a complete session, work minutes plus break minutes equal the session's elapsed instant duration without loss or duplication. |
| `INV-COR-001` | A correction never mutates or deletes its original punch event. |
| `INV-COR-002` | Only an approved applied correction or privileged adjustment affects calculation; rejected/proposed values remain history only. |
| `INV-COR-003` | A locked-period correction leaves the approved snapshot unchanged and creates a linked post-lock adjustment. |
| `INV-COR-004` | Reversing a correction or adjustment appends a linked compensating action rather than deleting history. |
| `INV-LED-001` | Time-account and leave-entitlement entries are append-only. |
| `INV-LED-002` | Every ledger effect has one identified source, actor/system process, recorded instant, effective date, signed amount, and explanation code. |
| `INV-LED-003` | One semantic source effect is posted at most once; retries or workflow transitions cannot double-post it. |
| `INV-LED-004` | A displayed balance is derivable from ledger entries and explicitly identified projections; no unexplained mutable balance is authoritative. |
| `INV-LED-005` | Source record, decision, ledger entries, and audit event created by one business action are committed atomically. |
| `INV-LED-006` | A complete past local date has at most one base `DAILY_DELTA`, including an explicit zero-minute entry when applicable. |
| `INV-LED-007` | An unlocked recalculation appends only the difference from the net time-account effect already linked to that local date; it never mutates prior entries. |

### Absence, privacy, and monthly periods

| ID | Invariant |
|---|---|
| `INV-ABS-001` | WorkLedger stores no medical diagnosis field in the MVP. |
| `INV-ABS-002` | Privacy-safe team views expose neutral availability only, never sickness classification, reason, comments, entitlement, or attachments. |
| `INV-ABS-003` | Incompatible absence overlap is rejected before reservation, deduction, restoration, or time-credit effects are written. |
| `INV-ABS-004` | Worked time and absence credit cannot credit the same covered minute twice. |
| `INV-ABS-005` | A pending reservation, approval deduction/release, rejection release, and cancellation restoration each occur at most once per source transition. |
| `INV-ABS-006` | Absence cancellation is a recorded workflow and restoration, never deletion of the original request or decision. |
| `INV-ABS-007` | Entitlement, reservation, coverage, credit, and expected-reduction amounts are non-negative integer minutes; floating-point day units are presentation only. |
| `INV-ABS-008` | First- and second-half coverage partition base expected minutes exactly, including odd-minute expectations, and do not imply AM/PM clock time. |
| `INV-ABS-009` | A request snapshots one effective absence-type version; later policy changes cannot reinterpret its workflow, entitlement, privacy, or time effect. |
| `INV-ABS-010` | Approval-required absence has no time-calculation effect before approval; a reported absence is effective once and acknowledgement adds no second effect. |
| `INV-ABS-011` | Approving entitlement-backed absence releases the exact active reservation and appends the exact approved deduction in the same transaction. |
| `INV-ABS-012` | Rejection, changes requested, or withdrawal of a pending entitlement-backed request releases its active reservation exactly once and appends no deduction. |
| `INV-ABS-013` | Available entitlement excludes reservations; projected remaining equals available entitlement minus active reserved minutes. |
| `INV-ABS-014` | Negative vacation approval is blocked unless an eligible non-self HR actor records an explicit override reason in the same transaction. |
| `INV-ABS-015` | An approved cancellation restores no more than the still-effective, previously deducted coverage it targets and cannot restore the same coverage twice. |
| `INV-ABS-016` | Partial cancellation preserves untargeted effective coverage and yields a current projection linked to the complete original and cancellation history. |
| `INV-ABS-017` | Sickness reports contain no request note or attachment, and sickness classification never enters team DTOs, URLs, generic exports/notifications, technical audit, or operational logs. |
| `INV-ABS-018` | Absence decisions use current actor scope, prohibit self-decision, validate an expected version, and commit workflow, entitlement, calculation-source, audit, and notification effects atomically. |
| `INV-ABS-019` | Ordinary cancellation cannot alter locked-date absence effects; it must use a linked post-lock adjustment path that preserves the approved snapshot. |
| `INV-ABS-020` | Full-day coverage conflicts with all same-date absence coverage; equal half portions and intersecting minute ranges conflict; minute and full/half units cannot mix on one date. |
| `INV-ABS-021` | A report-and-acknowledge request cannot be rejected as an approval request; coverage removal uses the recorded cancellation workflow. |
| `INV-ABS-022` | Holiday and zero-hour coverage remains visible but contributes zero default entitlement consumption, absence credit, or expected reduction. |
| `INV-PER-001` | At most one monthly period exists for an employee and calendar month. |
| `INV-PER-002` | Submitted periods reject ordinary mutation until an accepted changes-requested/return transition reopens them. |
| `INV-PER-003` | Approval and locking record an eligible non-self actor, decision time, and reproducible immutable snapshot. |
| `INV-PER-004` | Locked periods reject ordinary mutation. |
| `INV-PER-005` | Post-lock changes append linked adjustments and preserve both the approved view and current adjusted view. |
| `INV-PER-006` | `INCOMPLETE`/`READY_FOR_SUBMISSION` and `ADJUSTED_AFTER_LOCK` are derived values; persisted period state is never assigned from presentation state. |
| `INV-PER-007` | Submission is allowed only after month end with complete posted dates, no blockers, and acknowledgement of the exact current warning/source set. |
| `INV-PER-008` | Approval and lock are separate transitions; approval creates one immutable snapshot for that cycle and lock fixes it without rebuilding it. |
| `INV-PER-009` | Every period transition validates current scope, self-action prohibition, expected period version, state, and relevant source fingerprint in one transaction. |
| `INV-PER-010` | Snapshot daily rows, period totals, and included ledger entries reconcile exactly and retain schema, engine, source, configuration, actor, and version identity. |
| `INV-PER-011` | A locked period has no ordinary unlock or recalculation path; every later effect is a uniquely source-linked post-lock adjustment against its snapshot. |
| `INV-PER-012` | Period snapshots and generic views contain neutral absence effects and minutes, never sickness classification, request/reviewer notes, or entitlement balances. |

### Authorization, audit, and concurrency

| ID | Invariant |
|---|---|
| `INV-AUTH-001` | API authorization uses authenticated identity, role, organization, resource, current scope, state, and self-action rules; UI visibility never grants access. |
| `INV-AUTH-002` | Manager scope uses only the current effective direct-manager assignment; historical assignment and delegation grant no MVP access. |
| `INV-AUTH-003` | No actor may approve or privileged-adjust their own employee record, even through combined roles. |
| `INV-AUTH-004` | Explicit unauthorized targets fail with `403 ACCESS_DENIED`; collections apply scope before counts, totals, sorting, and pagination. |
| `INV-AUD-001` | Every decision records actor, decision/status code, instant, target, organization, and required reason without forbidden sensitive payloads. |
| `INV-AUD-002` | Domain and security audit events are append-only and remain attributable after role, manager, account, or employment changes. |
| `INV-CON-001` | Approvals, cancellations, ledger effects, locking, and multi-event attendance actions are transactional. |
| `INV-CON-002` | Stale version/state mutations fail with a structured conflict and cannot partially apply. |
| `INV-CON-003` | Idempotency lookup never bypasses current authentication, authorization, CSRF, organization scope, or employee capability. |
| `INV-CON-004` | Concurrent matching attendance requests under one idempotency key produce one terminal outcome and at most one event set. |

## 16. Validation and enforcement ownership

| Rule kind | Primary authority | Supporting enforcement |
|---|---|---|
| Value construction and deterministic calculation | `packages/domain` | Contract validation at boundaries and focused unit/property-oriented tests. |
| Request/response shape and field format | `packages/contracts` and API transport | Fastify serialization/validation and client form validation for feedback. |
| Actor/resource authorization | API application service and centralized policy functions | Scoped repository queries and integration tests; never UI-only. |
| Cross-record state transition and ledger effect | Domain rule invoked inside one application transaction | Database constraints/uniqueness where practical plus integration tests. |
| Immutable history and referential integrity | Application transaction and `packages/database` | Append-only repository APIs, constraints, and audit tests. |
| Accessibility wording/presentation | Web feature and shared UI | Stable domain codes, component tests, and manual review; UI prose is not parsed as a rule. |

## 17. Evolution, retention, and migration guidance

- The repository is greenfield and has no production schema to migrate yet. Phase 3 must map every persisted concept back to this vocabulary rather than mirroring screens or request payloads.
- Additive model changes preserve stable identities and old versions. Semantic or breaking changes require an ADR, explicit source mapping, compatibility plan, validation, and recovery strategy.
- Never invent missing historical instants, local dates, policy versions, reasons, or ledger sources during a backfill. Unrecoverable values become explicit unknown/configuration issues.
- Rebuilding a projection is an explicit versioned operation with validation and audit; approved snapshots are not rebuild targets.
- Ordinary deletion is restricted for records needed by attendance, workflow, ledger, snapshot, or audit history. The accepted `D-500` deployment profile and `WL-1007` process must preserve explainability and referential integrity while minimizing data whose configured period has ended.
- Before implementation, every open decision affecting calculation or persistence must have an owner and executable example evidence.

## 18. Risks and edge cases

- Two events may share an occurred instant; reconstruction therefore relies on the accepted per-employee event sequence rather than timestamp or database order.
- A server clock regression behind the employee's latest accepted event must fail without an attendance effect and surface an operational diagnostic; it must not be clamped silently.
- A timezone change can move an instant to another local date; the MVP therefore blocks ordinary timezone changes after time-dependent employee facts exist.
- A current day can gain another work session after an earlier clock-out; it remains provisional and unposted until the local date has ended.
- A posting or recalculation retry must collide on its semantic source key and return the existing effect rather than append a duplicate.
- Re-employment or account replacement must reconnect to stable employee history without creating two active identities.
- A manager change during a pending request transfers current review scope while preserving the former manager's historical decisions.
- When no eligible non-self approver/HR actor exists, the operation remains pending rather than bypassing self-action rules.
- Concurrent absence decisions or cancellations may race over the same reservation/effective coverage; expected versions and semantic source uniqueness must make one complete transition win and the other fail without partial effects.
- Quantity-based full/half absence and clock-specific minute absence have different overlap evidence; mixing them on one date is rejected rather than guessed.
- Sickness is health-related even without diagnosis fields; caches, URLs, logs, notifications, exports, and technical operations must preserve the purpose-specific DTO boundary.
- Projection rebuild failure must leave the last identified projection/snapshot intact and surface a structured operational issue.
- Future retention or anonymization cannot break source links required to explain balances, decisions, or locked periods.

## 19. Readiness checklist

- [x] Canonical terms distinguish entities, value concepts, commands, events, relationships, projections, ledgers, and snapshots.
- [x] Important concepts have stable identity, authority/mutability, and lifecycle definitions.
- [x] Relationships state cardinality, optionality, scope use, and history/delete behavior.
- [x] Field, cross-record, state, history, privacy, authorization, and concurrency invariants have stable IDs.
- [x] Effective dates, instants, local dates, timezone use, ordering, and version inputs are explicit.
- [x] Daily expected, worked, break, credited, balance, status, posting, and recalculation rules are explicit.
- [x] Permissions/data ownership and current-versus-immutable history are explicit.
- [x] Greenfield evolution, backfill, rebuild, validation, and recovery constraints are recorded.
- [x] Consequential unresolved choices have decision IDs and owners.
- [x] Absence policy, entitlement, coverage, overlap, cancellation, and privacy decisions have exact rules and example owners.
- [x] Period and retention rules required for Phase 0 are resolved; physical persistence choices have explicit Phase 3 owners and acceptance deadlines.
