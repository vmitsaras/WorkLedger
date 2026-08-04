# Open Decisions and Accepted Defaults

Codex must not silently invent a rule in this file. Resolve blocking items before their listed phase.

## Accepted defaults for the MVP

| Decision | Default | Rationale |
|---|---|---|
| Installation tenancy | One organization per installation | Reduces authorization and operations complexity while retaining organization IDs for defense in depth |
| Primary timezone | One IANA organization timezone | Keeps daily attribution deterministic for MVP |
| Time precision | Punch occurrence and manual time inputs are whole-minute; durations and balances are integer minutes | Makes elapsed arithmetic exact without fractional-minute storage |
| Rounding | None after minute-precision capture/resolution | Preserve recorded time; avoid hidden interval, daily, or policy rounding |
| Break handling | Employee records breaks; warnings only by default | Avoid silent invented time deductions |
| On-break clock-out | Explicit confirmation, atomic break end plus clock out | Supports common recovery without invalid history |
| Ordinary clock event time | One server-captured occurrence instant per command; no client-supplied time | Prevents device-clock manipulation and gives multi-event commands one causal timestamp |
| Attendance event ordering | Strictly increasing per-employee event sequence; multi-event commands receive consecutive values | Makes equal-instant reconstruction deterministic without relying on database order or identifiers |
| Attendance concurrency | Every command submits the latest `attendanceRevision`; one successful command increments it once | Gives tabs/devices a stable stale-state contract even when one command creates two events |
| Attendance idempotency | Required `Idempotency-Key` header, organization-and-actor scope, canonical fingerprint, no MVP expiry | Makes response-loss retries safe and prevents an old key from becoming a later clock action |
| Holiday calculation | A configured holiday reduces expected minutes and default absence consumption/credit to zero; worked time remains credited | Avoids negative balance for an approved non-working day without discarding actual attendance |
| Organization timezone change | Allowed only before time-dependent employee facts exist; ordinary changes are then blocked | Prevents silent historical local-date reattribution in the MVP |
| Daily time-account posting | Complete past dates post one base daily delta; later unlocked changes append recalculation differences | Keeps balances current and append-only without posting provisional/incomplete results |
| Overtime | Not formalized; flexible-time delta only | Payroll/legal overtime is separate scope |
| Monthly period | Calendar month | Simple, explainable initial closure model |
| Vacation pending behavior | Reserve pending amount for display; deduct finally on approval | Prevents misleading available balance |
| Leave entitlement unit | Integer minutes; schedule-relative days/hours are display values | Preserves exact partial-day arithmetic and append-only ledger sums |
| Half-day coverage | `FIRST_HALF`/`SECOND_HALF` partition local-date expectation exactly; no AM/PM meaning | Supports flexible schedules without inventing clock-time coverage |
| Negative vacation approval | Block manager approval; eligible non-self HR may override with a required reason | Keeps policy exceptions explicit, attributable, and unavailable for self-adjustment |
| Retroactive sickness | Effective policy configures `0`–`365` calendar days; default `7` | Bounds retrospective reporting without presenting a universal legal rule |
| Unpaid-leave balance | Reduce covered expectation by default and report unpaid absence separately | Approved unpaid leave does not masquerade as an attendance deficit |
| Public holidays | Administrator-managed calendar | Avoid dependence on jurisdiction/legal API in core |
| Sickness details | No diagnosis; team sees “Unavailable” | Data minimization |
| Attachments | Excluded from MVP | Significant security and retention surface |
| Offline clocking | Excluded from MVP | Conflict resolution and trust requirements are non-trivial |
| Organization grouping | Teams only; departments deferred | Avoid an unused hierarchy with unclear authorization and reporting behavior |
| Approval delegation | Excluded from MVP | Single-stage approval through the current direct manager or authorized HR keeps scope and audit behavior explicit |
| Default UI locale | English only for MVP; locale-aware formatting and language-neutral API/domain codes | Keeps the first release bounded without blocking later translation |
| Employee profile | Read-only self-service context and account/session actions | Employment, schedule, team, and role data remain HR-owned |
| Notification delivery | In-app records are core; external email is optional | Domain decisions must not depend on SMTP availability |
| Manager scope | Current effective direct reports only | Historical relationships and deferred delegation grant no continuing access |
| Explicit unauthorized target | Return `403 ACCESS_DENIED` | Makes tampering and recovery behavior stable while avoiding partial success |
| Privileged self-action | Prohibited, including HR adjustments and period locking | Combining roles must not enable self-approval or invisible balance changes |
| System administrator access | Technical operations and limited security metadata only | Authentication/server operation does not imply HR authority |
| Privileged role assignment | Non-self HR assigns employee/manager/HR roles; non-self system administrator assigns technical roles; audited bootstrap handles initial/recovery setup | Prevents either role from silently expanding its own authority |
| Work-session representation | A work session runs from clock-in to clock-out; derived work intervals exclude breaks | Keeps “multiple sessions” distinct from break-free intervals and prevents double subtraction |
| Effective-date ranges | Half-open: start included, end excluded | Makes adjacent assignments unambiguous |
| Current team membership | At most one effective team assignment per employee | Keeps the MVP organization model and team views bounded |
| Account/employee link | At most one active link in either direction | Prevents two login identities from acting as the same employee concurrently |
| Employment history | Stable employee identity with non-overlapping employment periods | Re-employment preserves prior attendance, ledger, period, and audit history |
| Manager hierarchy | At most one current direct manager per employee; no self-edge or cycle | Keeps scope derivation deterministic and prevents invalid reporting loops |
| Global client state | None initially | Router, Query, forms, and local state cover current needs |
| UI primitive | React Aria-based shadcn components | Consistent accessibility behavior and design freedom |
| ORM/driver | Drizzle with `pg`/node-postgres and generated SQL migrations | Type-safe SQL-oriented persistence, standard pooling, and reviewable migrations |
| Authentication | Better Auth for credentials/sessions | Avoid custom credential/session implementation |
| Date/time domain | Temporal semantics with polyfill as required | Correct instant, local date, timezone, and DST handling |

## Decisions blocking Phase 1

These should be confirmed during `WL-001`–`WL-012`.

### D-001 — Repository naming and publication

- Proposed repository: `workledger`.
- Decide whether it is public from the first commit or made public after foundation.
- Does not affect architecture, but affects README/security disclosure workflow.

### D-002 — License

- Choose an open-source license before public publication.
- Candidate decision must consider self-hosted use and desired contribution model.
- Do not copy a license text from memory; use an official source when selected.

### D-004 — Package publication

- Proposed: internal workspace packages only for MVP.
- Do not publish `packages/domain` or `packages/ui` until APIs stabilize.

## Resolved Phase 1 entry decisions

### D-003 — Default locale

**Status:** Resolved by `WL-002`.

- English is the only shipped UI language in the MVP.
- Dates, times, numbers, and durations use locale-aware formatting rather than hardcoded English formats.
- Domain/API messages use stable language-neutral codes; the UI owns user-facing prose.
- German, Greek, and other translations are deferred.

### D-005 — Approval delegation boundary

**Status:** Resolved by `WL-002` and reconciled by `WL-003`.

- Approval delegation is excluded from the MVP and grants no access.
- The MVP uses one current direct manager per employee plus authorized HR exceptional paths.
- A future delegation feature requires an ADR and explicit authorization, expiry, audit, administration, UI, and test work.

### D-006 — Departments in the organization model

**Status:** Resolved by `WL-002`.

- Teams are the only organization grouping in the MVP.
- Departments have no MVP data model, authorization effect, route, report, seed, or administration workflow.
- Additional organization hierarchies require a later scoped feature and evidence of need.

## Resolved Phase 2 entry decisions

### D-100 — Credited-time representation

**Status:** Resolved by `WL-004`.

- A work session contains derived work intervals separated by break intervals.
- Work intervals already exclude breaks, so `workedMinutes` is net work.
- `breakMinutes` is reported separately and is never subtracted again.

### D-101 — Midnight split policy

**Status:** Resolved by `WL-004`.

- Split derived work and break intervals at organization-local midnight for daily calculation.
- Preserve the original events and source work-session linkage.

### D-102 — Manually entered ambiguous local time

**Status:** Resolved by `WL-006`.

- Manual attendance input uses minute-precision local date/time under the organization-timezone version applicable to the target date.
- A nonexistent local time is rejected with `ATTENDANCE_NONEXISTENT_LOCAL_TIME` and no persisted interpretation.
- An ambiguous local time requires one of its valid explicit UTC offsets. Missing or invalid disambiguation returns `ATTENDANCE_AMBIGUOUS_LOCAL_TIME`; the server never silently chooses earlier or later.

### D-103 — Holiday expected time

**Status:** Resolved by `WL-006`.

- A configured holiday reduces scheduled expected minutes to zero and is counted once.
- Default absence credit and entitlement consumption on that holiday are zero.
- Actual worked minutes remain credited and produce the transparent flexible-time delta; this is not a payroll/overtime classification.

### D-104 — Organization timezone changes

**Status:** Resolved by `WL-006` with a narrower MVP boundary than the earlier effective-dated recommendation.

- The organization timezone may be corrected before the first punch event, applied correction, absence request, daily time-account posting, or monthly period exists.
- After any such fact exists, ordinary change returns `ORGANIZATION_TIMEZONE_LOCKED` and leaves configuration/history unchanged.
- Supporting a later operational timezone migration requires an ADR, explicit cutover/reconstruction rules, dry-run validation, backup/recovery, and preserved approved/locked attribution.

### D-105 — Daily time-account posting lifecycle

**Status:** Resolved by `WL-006`.

- `PROVISIONAL` and `INCOMPLETE` daily records never post.
- A `COMPLETE` past date posts exactly one base `DAILY_DELTA`, including zero, under a unique semantic source key.
- Later unlocked source changes append `DAILY_RECALCULATION_DELTA` equal to the new daily balance minus the net effect already linked to that local date.
- A zero recalculation difference produces no balance entry but retains source/recalculation/audit evidence.
- Locked changes use the post-lock adjustment workflow and preserve the approved snapshot.
- Posted and projected balances remain separately labelled.

## Decisions blocking Phase 3

### D-200 — API contract implementation

Evaluate during scaffold:

- Zod-based Fastify type provider and OpenAPI generation, or
- JSON Schema/TypeBox contracts with generated client.

Acceptance criteria:

- one source for request/response validation,
- reliable Fastify serialization,
- generated or inferred TypeScript types,
- stable OpenAPI,
- no duplicated manual interfaces.

Do not choose solely for fashion; create an ADR from a small spike.


### D-204 — Validation HTTP status

- Choose one status for semantic request validation and use it consistently.
- Recommended: `422 Unprocessable Content` for syntactically valid JSON that fails field/semantic validation; reserve `400` for malformed requests.

### D-201 — Database identifier type

- Proposed: UUIDv7 or another sortable opaque identifier for domain records.
- Confirm PostgreSQL/runtime support and migration ergonomics during schema design.

### D-202 — Calculation projection persistence

Choose exact Phase 3/8 approach:

- raw events remain authoritative,
- daily projections may be stored for reports,
- approved monthly snapshot is persisted and versioned,
- rebuild behavior is explicit.

### D-203 — Email delivery

- MVP core must work without SMTP.
- Decide whether Phase 3 includes only an email interface/fake adapter or a real SMTP adapter later in Phase 7.
- Recommended: interface and in-app notifications first; SMTP in Phase 7.

## Resolved Phase 6 entry decisions

### D-300 — Vacation entitlement unit

**Status:** Resolved by `WL-007`.

- Store allocations, reservations, deductions, restorations, expiry, carryover, and adjustments as signed integer minutes.
- APIs and domain calculations use minutes only. The UI may present hours and schedule-relative day equivalents, but never stores or sums floating-point days.
- Zero-hour/weekend/holiday coverage remains visible and consumes zero entitlement by default.

### D-301 — Half-day definition

**Status:** Resolved by `WL-007`.

- `HALF_DAY` requires `FIRST_HALF` or `SECOND_HALF` and partitions base expected minutes for the selected local date.
- First half is `floor(baseExpectedMinutes / 2)`; second half is the remainder, so an odd-minute expectation loses no minute.
- The portions are schedule-obligation labels, not AM/PM clock ranges. A time-specific absence uses a minute-aligned local interval instead.
- Minute coverage cannot mix with full/half coverage on the same date because the overlap relationship would be unknowable for a flexible schedule.

### D-302 — Negative vacation balance

**Status:** Resolved by `WL-007`.

- A pending request may reserve into a negative projected balance so the request and shortage remain visible.
- Ordinary manager approval is blocked when the final available entitlement would become negative.
- An eligible non-self HR administrator may explicitly override the block with a required reason; decision, reason, deduction, negative result, audit event, and recalculation effects are atomic.
- A combined-role requester cannot override their own balance.

### D-303 — Retroactive sickness reporting

**Status:** Resolved by `WL-007`.

- Each effective sickness policy requires a maximum retrospective window from `0` through `365` organization-local calendar days; the product default is `7`.
- The sickness start date cannot be in the future. Coverage may include a declared future end subject to the policy's duration validation.
- The value is an organization workflow setting, not a claim about legal reporting deadlines.


### D-304 — Unpaid-leave daily balance behavior

**Status:** Resolved by `WL-007`.

- The built-in unpaid-leave default is `REDUCE_COVERED_EXPECTATION`: approved coverage supplies expected-reduction minutes and supplies no absence-credit minutes.
- A fully covered 480-minute day therefore has expected `0`, credited `0`, and balance `0`; unpaid absence remains separately reportable.
- A versioned organization policy may deliberately choose `NO_TIME_EFFECT` for future requests. Existing requests retain the policy version they captured.

## Decisions blocking Phase 8

### D-400 — Month lock timing

**Status:** Resolved by `WL-008`.

- Manager approval creates the immutable approval snapshot and moves the period to `APPROVED`.
- A separate explicit action by the eligible current non-self manager moves that exact approved version to `LOCKED`; it does not rebuild the snapshot.
- Automatic, scheduled, administrator-only, and approval-implies-lock modes are excluded from the MVP. Before lock, the manager may instead request changes with a reason.
- Lock rechecks current scope, self-action, expected period version, approved snapshot/source fingerprint, and ledger reconciliation atomically. There is no ordinary unlock action.

### D-401 — Approved snapshot contents

**Status:** Resolved by `WL-008`.

- The immutable canonical snapshot records schema/engine versions; organization, employee, timezone, calendar boundaries, approval cycle, period version, source/snapshot fingerprints, snapshot/actor identity, and creation instant.
- Each ordered local-date row records its status, source fingerprint, full integer-minute calculation breakdown, warnings, and the effective schedule, policy, holiday, correction, neutral absence effect, adjustment, and daily-ledger source/version references.
- Period sums, opening/closing posted time-account balances, and the ordered included ledger-entry IDs/amounts must reconcile to the rows.
- The snapshot contains no sickness classification, request/reviewer notes, diagnosis, entitlement balance, or unrestricted protected-record payload. Later adjustments reference it and never replace it.

## Decisions blocking production release

### D-500 — Data retention defaults

- No universal legal period is hardcoded.
- Provide configurable retention and deployment documentation.

### D-501 — Password and session policies

- Confirm defaults from the selected auth library and tighten for production.
- Define session duration, freshness, reset behavior, and administrative revocation.

### D-502 — Browser support matrix

- Proposed: current and previous stable Chrome, Edge, Firefox, Safari; current mobile Safari and Chrome Android.
- Confirm against selected packages and Temporal polyfill.

### D-503 — Production reverse proxy

- Documentation may show one recommended example while remaining proxy-agnostic.
- Decide whether project ships Caddy, Traefik, or plain proxy guidance.
