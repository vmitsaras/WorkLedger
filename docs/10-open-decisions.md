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
| Credential policy | Invite-only; 15–128 characters; local common-password rejection; 30-minute reset and 24-hour invitation grants | Meets the password-only security floor without arbitrary composition or periodic changes |
| Session profile | PostgreSQL-backed/revocable; no stateless/cache/remember-me; 30-minute idle, 12-hour absolute, 15-minute freshness | Makes revocation immediate and bounds stolen-session lifetime while supporting a workday |
| Browser mutation security | Same-origin HTTPS, secure host-only cookie, Better Auth checks plus WorkLedger session-bound CSRF token | SameSite is defense in depth rather than the only CSRF control |
| Retention | Mandatory deployment-owned rules by data class; no universal legal duration or silent indefinite value | Preserves jurisdiction choice while making privacy/backup behavior explicit before production |
| Reference proxy | Caddy example; proxy-agnostic contract | Gives self-hosters one maintained HTTPS path without coupling application security to one proxy |
| Date/time domain | Temporal semantics with polyfill as required | Correct instant, local date, timezone, and DST handling |
| Repository publication | Public GitHub repository `vmitsaras/WorkLedger` | The planning repository is already public; public visibility does not authorize npm/container/release publication |
| Source license | MIT (`LICENSE` at repository root) | Permissive self-hosting, modification, contribution, and portfolio use with a short standard notice |
| Workspace package publication | Internal-only private packages using `workspace:*` | Prevents accidental registry publication while package APIs and product boundaries are still evolving |

## Resolved Phase 1 repository decisions

These were confirmed from repository evidence and the architecture ratification.

### D-001 — Repository naming and publication

**Status:** Resolved by `WL-011` from repository evidence.

- The canonical product and repository display name is `WorkLedger`; the current remote is `https://github.com/vmitsaras/WorkLedger` and GitHub reports it as public.
- Public visibility is accepted from the planning stage. It does not authorize pushing changes, publishing packages/images, creating releases, or deploying an instance; those remain separately permissioned workflows.
- `WL-107` replaced the planning-oriented README with verified setup, contribution, license, and
  private security-reporting instructions. It distinguishes the runnable foundation preview from a
  product application and states that no supported release or production deployment exists.
- Public changes must keep examples secret-free and use the dependency, generated-artifact, security, and documentation checks assigned to the relevant task.

### D-002 — License

**Status:** Resolved by `WL-011` as MIT.

- Keep the existing root `LICENSE`, whose text and copyright line were checked against the Open Source Initiative MIT template and which GitHub identifies as MIT.
- Root and workspace package metadata use the SPDX identifier `MIT`. Internal package `private` flags prevent registry publication; they do not change the repository's source license.
- The MIT license applies to WorkLedger-owned source. Third-party dependencies, copied React Aria/shadcn source, fonts, icons, and other assets retain their own notices and must be reviewed before distribution.
- A future license change is a repository-governance decision requiring explicit owner approval; it is not an implementation refactor.

### D-004 — Package publication

**Status:** Resolved by `WL-011` as internal-only for the MVP.

- The root and every `apps/*` and `packages/*` manifest use `"private": true`; there is no npm publish script, registry credential, Changesets/release workflow, or public-package compatibility promise.
- Internal package names use the `@workledger/*` scope and cross-workspace dependencies use `workspace:*`, so local resolution cannot silently fall back to a registry package.
- Container/application release work is separate from npm package publication. No workspace package is packed or published as an MVP release artifact.
- Publishing any package later requires a new ADR covering scope ownership, stable public API/exports, semantic versioning, build artifacts, dependency/license/security review, provenance, registry access, documentation, and migration/compatibility expectations.

## Resolved Phase 1 product decisions

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

### D-007 — shadcn source alias boundary

**Status:** Resolved by `WL-106` in favor of ADR `0011` package boundaries.

- The root `components.json` uses the current `aria-nova` style identifier, which explicitly selects
  the shadcn React Aria base.
- The current shadcn `info` command requires TypeScript or package-import source aliases. WorkLedger
  does not add them because the accepted executable boundary contract rejects alias, deep, and
  sibling-source imports that can bypass package public roots.
- React Aria shadcn source may still be retrieved with the base selected explicitly, copied into
  `packages/ui`, converted to local relative imports, and reviewed as WorkLedger-owned source.
- A future request for alias-based CLI installation requires an ADR change and matching executable
  boundary rules; tool convenience alone is not sufficient justification.

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

### D-106 — Phase 2 `WL-204` task wording

**Status:** Resolved by the repository task-authority rule on 2026-08-10.

- `docs/08-task-board.md` declares itself authoritative for task IDs and dependencies and assigns
  `WL-204` to manual/corrected interval validation and overlap constraints.
- The compact `TODO.md` previously described `WL-204` as break and multiple-session calculations.
  That wording conflicts with the task board and with `WL-203`'s accepted reconstruction evidence.
- `WL-203` owns source-event reconstruction, including normal, multiple, and incomplete sessions.
  `WL-204` owns manually entered/applied-correction interval validation, overlap, negative,
  future, and ambiguous-local-time behavior. `TODO.md` is normalized to the authoritative task
  board wording in the `WL-203` completion change.

### D-107 — Phase 2 `WL-210` catalog acceptance boundary

**Status:** Resolved by the user's continuation directive on 2026-08-10.

- `docs/11-example-calculation-catalog.md` requires every accepted `EX-001`–`EX-085` fixture to
  become executable during Phase 2, while its fixtures include later-phase API/database behavior:
  idempotency, transaction/audit writes, authorization, entitlement workflow, correction/period
  state machines, snapshots, exports, and deactivation.
- `docs/08-task-board.md` assigns those implementation surfaces to `WL-301`–`WL-306`,
  `WL-400`–`WL-405`, `WL-503`–`WL-505`, `WL-600`–`WL-607`, `WL-800`–`WL-805`, and `WL-900`.
  The phase-order rule prohibits implementing them early without explicit user override.
- `docs/39-domain-example-review.md` maps every catalog fixture to current direct/partial
  evidence or its later implementation owner.
- `WL-210` now requires executable coverage for the pure-domain subset and an explicit mapping for
  later-phase fixtures. Each workflow fixture retains its scheduled owner for final executable
  evidence; no later vertical slice is pulled forward.

## Decisions blocking Phase 3

### D-200 — API contract implementation

**Status:** Resolved by `WL-304` and `WL-308`; see ADR 0012 and
`docs/49-openapi-exposure.md`.

- Strict Zod schemas in `packages/contracts` are the single request/response source.
- Fastify uses the Zod type provider for inferred types, validation, and response serialization.
- The same schemas generate stable OpenAPI 3.1 through `@fastify/swagger`; `WL-308` exposes JSON at
  `/openapi.json` and adds a deterministic tracked-artifact check.
- Typed-client generation remains deferred because the narrow stable candidate excludes the
  pinned TypeScript 7 compiler through its peer range, while the compatible SDK candidate is
  pre-1.0 and disproportionate to the selected contract surface. No second handwritten transport
  type source is introduced.


### D-204 — Validation HTTP status

**Status:** Resolved by `WL-304`; see ADR 0012.

- Syntactically valid JSON that fails request-schema validation returns `422 VALIDATION_FAILED`.
- Malformed JSON returns `400 MALFORMED_REQUEST`.

### D-201 — Database identifier type

**Status:** Resolved by `WL-300`.

- Application/domain records use PostgreSQL `uuid` primary keys with the PostgreSQL 18 native
  `uuidv7()` default. Stable domain identifiers remain opaque strings outside the persistence
  boundary; UUID timestamp bits are never authorization, ordering, or business-time truth.
- Caller-supplied UUIDs remain possible for deterministic import/test workflows, but normal inserts
  use the database default. No UUID extension is required.

### D-202 — Calculation projection persistence

**Status:** Resolved by `WL-300`, using the completed Phase 2 domain/test evidence.

- Raw punch events, applied interpretations, absence effects, and append-only ledgers remain the
  authoritative facts.
- One replaceable `daily_projections` row per employee/local date stores the calculation status,
  engine/projection version, exact source fingerprint, explanatory source references, structured
  warning codes, and reconciled minute totals. It is a query/report cache, never a ledger fact.
- Projection rebuild is an explicit application/operations command. It recomputes from identified
  sources, increments the projection version when persisted content changes, and never runs as an
  unannounced side effect of a read.
- Only `COMPLETE` eligible past projections may produce append-only time-account entries. Approved
  monthly snapshots copy canonical versioned evidence into an immutable, independently
  fingerprinted snapshot; later rebuilds cannot replace that snapshot.

### D-203 — Email delivery

**Status:** Resolved by `WL-002`, `WL-009`, and `WL-010`; implementation owner `WL-704`.

- MVP core must work without SMTP.
- Phase 3 may define the outbound interface/fake needed by integration tests but does not add a production SMTP dependency.
- `WL-704` implements durable generic in-app notifications and may add the optional privacy-safe SMTP adapter. Delivery failure/retry never changes the committed domain outcome.

### D-205 — Part-time seed reservation arithmetic

**Status:** Resolved by `WL-307` from the accepted schedule-relative entitlement contract.

- `docs/14-seed-scenarios.md` originally required Leon to work 360 minutes Monday–Thursday while a
  weekend-spanning two-obligation-date vacation reserved 960 minutes. Those requirements cannot
  both satisfy schedule-relative integer-minute entitlement consumption.
- The deterministic seed preserves Leon's accepted six-hour schedule and the cross-weekend story.
  Its covered Thursday and Monday obligations total 720 minutes, so the seed appends
  `RESERVATION -720` against an `ALLOCATION +4800`, yielding projected remaining 4,080.
- This reconciliation changes no domain rule: day equivalents remain presentation only, and a seed
  cannot use a fixed 480-minute day to bypass an employee's effective schedule.

### D-206 — Roadmap phase-gate checkbox drift

**Status:** Resolved by `WL-309` from canonical task and gate-review evidence.

- `TODO.md`, `PROJECT_STATUS.md`, and `docs/40-phase-2-gate-review.md` already recorded the Phase 2
  gate as passed with version `0.3.0`, but the individual Phase 2 criteria in `docs/07-roadmap.md`
  remained unchecked.
- `WL-309` reconciles those stale Phase 2 boxes and the newly passed Phase 3 boxes to their accepted
  criterion-by-criterion reviews. This is documentation-state normalization only; it changes no
  domain rule, implementation evidence, dependency, or historical version.

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

**Status:** Resolved by `WL-010` as a deployment-owned retention profile; implementation evidence remains a production gate.

- WorkLedger hardcodes no universal legal duration. Production readiness requires an explicit non-placeholder rule for authentication transient data, account/security metadata, operational logs, notification delivery, sensitive HR data/free text, domain source/ledger/snapshot/audit history, technical audit, and backups.
- Each class records duration/expiry, purge versus minimization, backup effect, responsible operator, and deployment policy/jurisdiction owner. Silent indefinite retention is invalid.
- Ordinary delete/deactivation never cascade-deletes punches, decisions, ledgers, approved snapshots, adjustments, or required audit evidence. `WL-1007` must implement source-preserving minimization/anonymization and reapply it to restored backups before activation.

### D-501 — Password and session policies

**Status:** Resolved by `WL-010`; `WL-302` must prove the selected stable Better Auth version against this profile.

- Invite-only credentials use 15–128 character passwords, accept paste/password managers/Unicode, reject a local common-password set, and impose no composition or routine periodic-rotation rule.
- Sessions are PostgreSQL-backed and revocable; stateless sessions, session/cookie cache, and persistent “remember me” are disabled. The server enforces 30-minute idle, 12-hour absolute, and 15-minute freshness boundaries.
- Session cookies use `__Host-`, `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/`, and no `Domain`. WorkLedger unsafe mutations also require current-origin validation and a session-bound CSRF token.
- Reset grants expire after 30 minutes; invitations after 24 hours. Both are protected, single use, rate limited, URL/log/referrer minimized, and same-origin only. Password reset revokes all sessions and returns to normal sign-in.
- Password reset, account deactivation/unlink, and privileged role change revoke all sessions. High-risk account/privilege operations require a fresh session; ordinary domain work still requires current server authorization.

### D-502 — Browser support matrix

**Status:** Open; initial evidence owner `WL-103`, final production owner `WL-1002`. Record the executable development matrix in Phase 1 and revalidate exact supported versions, Temporal/polyfill behavior, and accessibility before the production gate.

- Proposed: current and previous stable Chrome, Edge, Firefox, Safari; current mobile Safari and Chrome Android.
- Confirm against selected packages and Temporal polyfill.

### D-503 — Production reverse proxy

**Status:** Resolved by `WL-010`.

- Ship Caddy as the reference Docker/reverse-proxy example while keeping the documented security contract proxy-agnostic.
- Production uses one canonical HTTPS origin for web/API, publishes only proxy ports, keeps API/PostgreSQL private, and fixes the public origin in validated configuration.
- The proxy overwrites forwarded headers; the application trusts only exact configured proxy addresses. Direct client-supplied forwarded values cannot affect callback URLs, cookie security, rate limits, or audit identity.
- Equivalent proxies are supported only when they meet the TLS, header, network-isolation, timeout/limit, health, and security-header requirements in `docs/06-security-operations.md`.
