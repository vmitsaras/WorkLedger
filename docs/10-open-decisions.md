# Open Decisions and Accepted Defaults

### 2026-08-28 — WL-1512 accepts two fixed HR aggregate purposes

`docs/162-wl-1512-hr-aggregate-privacy-contract.md` is accepted as the HR aggregate addendum to ADR
0014. Phase 15 permits only organization-wide monthly closure readiness and neutral absence
coverage for one canonical organization-local month. Requests cannot select a person, team,
manager, location, schedule, employment attribute, absence type, state, range, group, comparison,
or sort.

Both purposes suppress the complete result before facts, sources, actions, limitations, logs, or
provider context exist unless the cohort contains at least 10 eligible people, a case-derived
purpose has at least 3 contributing cases, and at least 10 people remain in the non-contributing
complement. Suppression returns one generic unavailable reason and no hidden count or action.
Employees, cases, employee-days, and integer scheduled minutes remain separate units.

This does not authorize work beyond `WL-1513`, model/MCP exposure, persistence, export, subtype
breakdowns, row drilldown, recommendations, predictions, scoring, or writes. A new purpose, cohort
dimension, comparison, threshold weakening, or alternate privacy mechanism requires a superseding
decision.

Codex must not silently invent a rule in this file. Resolve blocking items before their listed phase.

## Task coordination notes

### 2026-08-28 — WL-1508G accepts deterministic Phase 15 continuation

The user continued with the next documented step after closing the optional employee model pilot.
`WL-1508G` reconciles Phase 15 around the already completed provider-independent foundation. The
instruction is interpreted as authorization to update the local roadmap and project memory, not to
start `WL-1509` implementation in the same task.

The accepted continuation keeps deterministic Manager, privacy-suppressed HR aggregate, and
isolated System Insights. It removes Manager model interpretation (`WL-1510`), natural-language
report generation (`WL-1511`), and optional MCP evaluation (`WL-1515`) from the accepted Phase 15
scope. `WL-1509`, reframed `WL-1512` and `WL-1514`, `WL-1513`, and the provider-disabled `WL-1516`
release gate no longer depend on the failed `WL-1508` pilot. Their replacement dependencies are
recorded in `docs/160-wl-1508g-phase-15-deterministic-continuation.md`.

This sequencing decision does not enable the inactive provider implementation, approve a model,
weaken any privacy or security boundary, mark `WL-1508` complete, remove a model file, or change
runtime behavior. A future model, natural-language report, or MCP proposal requires a new roadmap
decision and the applicable ADR, privacy, security, evaluation, and threat gates.

### 2026-08-28 — Employee local AI pilot closes without passing

The user explicitly closed the optional employee local AI pilot after the final qualified
`qwen2.5-coder:14b` recovery screen passed 3 of 9 attempted `submission-actions` cases and failed
the other 6. This decision ends model qualification, prompt or schema recovery, and real model
evaluation work in the current Phase 15 scope. It does not convert the failed zero-tolerance gate
into a pass.

Provider mode remains disabled. The complete deterministic Employee Insights foundation remains
the supported product path, and the completed provider, orchestration, privacy, failure, trace, and
accessibility work remains in the repository as inactive evidence. No model is approved for
deployment, and no model file, source, configuration, database object, dependency, or manifest is
removed or changed by this closure.

The assumption used for the short instruction to “close it” is that it closes the optional model
pilot only. It does not silently rescope or authorize later Manager, report-builder, HR, System, or
MCP work. Their existing dependencies remain unsatisfied. Continuing Phase 15 requires a separate
accepted roadmap decision that either removes model-dependent tasks or defines a new scope; it
cannot treat this closure as completion of `WL-1508`.

### 2026-08-28 — WL-1508F accepts server-owned Employee tool execution

Both exact qualified replacement models failed the first `WL-1508B` semantic group. The smaller
candidate returned no required tool call in nine of nine cases. The larger candidate timed out in
nine of nine cases, including three after a successful tool execution. No further model execution
was authorized at that checkpoint.

The accepted recovery decision moves the already known Employee registry call under application
control. WorkLedger derives the exact tool code and arguments from the validated Insight request,
executes it once through the current self-authorizing registry, and uses that fresh result for all
model context and final validation. The model receives no tools. It returns one response constrained
by the current output schema, while the existing parser and grounding validators remain final.

`WL-1508F` owns this implementation and deterministic verification. It runs no real model case,
changes no endpoint, database schema, UI state, provider origin, digest rule, timeout, rate,
concurrency, reasoning, retention, or disabled default, and does not weaken the 216 of 216 gate.
After it completes, only exact qualified `qwen2.5-coder:14b` digest
`9ec8897f747e246e970bc5cfdda85d22f1123dc2e3d34978a010a75968716849` may resume the 18 case
`WL-1508B` screen. Any failure stops before `WL-1508C`. See
`docs/specs/_root/0001-server-owned-insight-orchestration/index.md`.

### 2026-08-27 — WL-1500 accepts deterministic Insights before local AI

The accepted Phase 14 gate remains complete at `0.15.0`. `WL-1500` now accepts ADR 0014 and the
Phase 15 architecture, privacy, security, retention, accessibility, evaluation, operations, and
staged-gate contracts. This decision adds no product code, package, dependency, migration, database
table, configured provider, network request, MCP server, or manifest version change.

The accepted contract is:

- WorkLedger calculations and purpose-specific read models remain authoritative; the model may
  interpret or explain structured results but never calculate balances or invent policy.
- Insights are role- and active-workspace-scoped, read-only, and deny by default. Combined roles do
  not silently merge employee, manager, HR, or system contexts.
- The deterministic foundation works without AI. Optional private Ollama support is disabled by
  default and may start only after the Insights foundation sub-gate passes.
- Context is a bounded visible descriptor, never a DOM dump or bulk record export. Questions,
  conversations, tool content, model input/output, and reasoning traces are session/request only and
  never enter PostgreSQL, logs, audit, backup, analytics, URL, or persistent browser storage.
- HR aggregates require purpose-specific contracts and cohort, case, and complement suppression
  before model-context creation. System Insights remain isolated from employee and HR data.
- Tool contracts may be designed for reuse, but an MCP adapter remains a later evaluation requiring
  its own exposure allowlist, ADR, and threat review.

The roadmap deliberately rejects general-purpose chat, natural-language SQL, employee scoring,
illness prediction, approval recommendations, autonomous HR actions, and a persistent global AI
drawer. Those exclusions preserve the existing product, accessibility, security, and privacy
contracts. ADR 0014 and `docs/151-phase-15-insights-architecture-privacy-evaluation.md` are the
authoritative Phase 15 boundary.

### 2026-08-26 — Phase 14 roadmap registration preserves the completed Phase 13 gate

The Phase 14 planning request was written against an earlier repository snapshot that still named
`WL-1311` as active, expected workspace version `0.13.0`, and left `docs/135-*` available. The
authoritative repository has since completed `WL-1311` through `WL-1313`, advanced every workspace
manifest to `0.14.0`, and assigned `docs/135-*` through `docs/137-*` to Phase 13 evidence.

The internationalization roadmap therefore preserves the signed Phase 13 gate, registers
`WL-1400` as the next task, and uses `docs/138-phase-14-internationalization-roadmap.md`. This
coordination-only change does not start `WL-1400`, install a dependency, add a catalog, modify a
runtime contract, create a migration, or advance the workspace version.

### 2026-08-26 — WL-1310 employee search remains outside URL state

`WL-1310` requires useful employee administration search, while ADR 0007 and the accepted privacy
contract prohibit names, email addresses, and person-identifying free text in URLs. Search therefore
uses an authenticated, same-origin, CSRF-protected `POST /v1/hr/employees/search` read with a bounded
JSON body. The browser keeps submitted search text and search pagination in memory only; ordinary
status and page browsing remains URL-backed when no identifying search is active.

The server fixes organization and HR authority before applying the search to display name, employee
number, or the currently linked account email, and before totals and pagination. The endpoint is
private and no-store, accepts no unrestricted sort or target scope, and does not add search text to
audit, operational logs, browser persistence, or navigation. This reconciles the task without
weakening the accepted router, privacy, authorization, or employee-history contracts.

### 2026-08-25 — WL-1306 attention patterns remain source-bound

The Phase 13 handoff names break-policy warnings, previous-session recovery, and a submitted month
blocked by an incomplete record. The repository's accepted rules constrain those examples:

- The current policy records breaks manually but defines no minimum break duration or compliance
  threshold. `WL-1306` therefore rejects an invented `BREAK_POLICY_WARNING`; a positive warning
  requires a later accepted domain rule and effective-dated source.
- Overnight work sessions are valid and split at organization-local midnight. Today does not label
  every current cross-midnight session as a missed clock-out. Recovery is shown only when an
  authoritative past daily record is `INCOMPLETE` and identifies the previous-date slice.
- A monthly period with readiness blockers cannot complete submission. “Submitted month blocked”
  means the submission attempt is rejected while the workflow remains `OPEN` or
  `CHANGES_REQUESTED`; it does not create a contradictory persisted `SUBMITTED` state.
- Returned and rejected correction detail stays on the separately authorized request route. Today
  exposes the generic unresolved calculation blocker without request ID, decision reason, or a
  permanent rejected-item notification that has no acknowledgement lifecycle.

These choices preserve immutable history, permission scope, privacy, and the existing monthly
state machine. See `docs/130-today-actionable-attention-recovery.md`.

### 2026-08-25 — Phase 13 hardening supersedes the numbered portfolio phase

The explicit `WL-1300` request adopts the supplied attendance clarity and workflow usability
hardening catalog as Phase 13. This supersedes the tracked use of `WL-1300` through `WL-1305` for
portfolio presentation. The accepted portfolio scope is preserved in
`docs/drafts/portfolio-presentation.md`, but it remains an unnumbered draft because later product
phases may be inserted before it.

- Phase 13 is attendance clarity, operational trust, and workflow usability hardening
  (`WL-1300` through `WL-1313`), with gate version `0.14.0`.
- Portfolio presentation has no active task identifiers, phase number, dependency chain, or
  version gate.
- The supplied handoff pack is planning input. Ratified domain, permission, immutable-history,
  ledger, UX, and API rules remain authoritative when its examples conflict with the repository.
- The Today reference image governs hierarchy only. Its sample arithmetic is not domain evidence.

This reconciliation changes task coordination only. It does not authorize early portfolio work,
production contract changes in `WL-1300`, a manifest bump before `WL-1313`, or deletion of the
supplied handoff pack.

### 2026-08-21 — Company identity remains post-MVP bounded scope

`docs/01-scope-and-non-goals.md` lists organization branding as a nice-to-have after MVP, while the
new Phase 11 catalog assigns adaptable company identity to `WL-1103`. There is no MVP contradiction:
the Phase 10 production gate completed the MVP before this UI-foundation phase. `WL-1103` is a
post-MVP product-polish addition limited to validated organization name, optional logo/favicon, and
bounded accent configuration. It does not authorize arbitrary themes, white-labelling, custom CSS,
new organization hierarchy, or a change to authorization/domain scope.

### 2026-08-21 — Runtime company identity is presentation configuration

`WL-1103` treats the configured organization name, logo, favicon, and accent as immutable startup
presentation configuration. It does not mutate the PostgreSQL organization record or create a
second source of truth for domain scope: database organization identity still owns relationships,
authorization, history, and audit. The normalized presentation DTO is intentionally public so the
sign-in and recovery routes can identify the installation before authentication. It contains no
organization ID or domain settings, accepts same-origin `/identity/` media only, and keeps
WorkLedger attribution and product-owned interaction/state colors.

### 2026-08-21 — Phase 11/portfolio roadmap insertion

`TODO.md` was intentionally revised after the Phase 10 gate to insert a UI foundation phase and a
workflow UX remediation phase before portfolio work. The older roadmap, task board, architecture
phase labels, Phase 10 handoff, and project status still assigned portfolio work to Phase 11. The
newer task catalog is treated as the requested roadmap direction, while the accepted portfolio
scope is preserved rather than discarded.

- Phase 11 is now UI/UX direction, design system, and adaptable company identity (`WL-1100`–`WL-1106`), with gate version `0.12.0`.
- Phase 12 is workflow UX remediation and product polish (`WL-1200`–`WL-1206`), with gate version `0.13.0`.
- The existing portfolio scope moves intact to Phase 13 (`WL-1300`–`WL-1305`), with gate version `0.14.0`.
- `apps/site` and the safe portfolio demo remain deferred to Phase 13. The manual assistive-technology residual `D-502` moves to the Phase 12 UI release gate (`WL-1206`) rather than being assigned to a token task.

This reconciliation changes sequence and task identifiers only. It does not authorize early
portfolio implementation, alter the MVP boundary, or mark either new phase gate complete.

### 2026-08-13 — Phase wording reconciliation

The request to “continue with phase 4” conflicts with the canonical roadmap: `WL-400` through
`WL-407` are complete, and the Phase 4 gate passed at version `0.5.0`. The active, unblocked
successor is `WL-500` in Phase 5. Work therefore proceeds with `WL-500` unless the requester
explicitly asks to reopen a completed Phase 4 task.

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
| Monthly review authority | Current effective direct manager or organization HR, always non-self | Matches the account-first approval model, supports HR-only operational fallback, and keeps historical managers and technical administrators excluded |
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

**Status:** Resolved by `WL-002`, `WL-009`, `WL-010`, and `WL-704`.

- MVP core must work without SMTP.
- Phase 3 may define the outbound interface/fake needed by integration tests but does not add a production SMTP dependency.
- `WL-704` implements durable generic in-app notifications, a bounded post-commit delivery adapter,
  and persistent retry diagnostics without adding a production SMTP dependency. Delivery
  failure/retry never changes the committed domain outcome.

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

## Resolved Phase 7 entry decisions

### D-350 — Unified approval inbox semantics

**Status:** Resolved by `WL-700`.

- The inbox has only the generic kinds `CORRECTION`, `ABSENCE`, and `CANCELLATION`, and the generic statuses `ACTION_REQUIRED`, `WAITING_ON_EMPLOYEE`, and `COMPLETED`; `ALL` is query-only.
- A URL may express broad workflow category, generic status, current team, affected-date range, sort, direction, and page. An absence subtype, including sickness, is never a URL value or list field.
- Team is a current-date filter, not an authorization scope. Current manager or organization-HR scope, and non-self exclusion, apply before every filter, total, sort, and page.
- The initial schema excludes monthly-period rows. `WL-802` may add them under the current-manager-or-organization-HR authority resolved by `D-402`.

### D-351 — Inbox snapshot consistency

**Status:** Resolved by `WL-700`.

- Rows, total count, and authorized team options are read in one repeatable-read transaction so a concurrent workflow, assignment, or team change cannot mix snapshots within one inbox response.

### D-352 — Decision actor identity for HR-only approvals

**Status:** Resolved by `WL-701`.

- Every correction, absence, and absence-cancellation decision records the authenticated account as
  required `actor_account_id`, explicit `actor_authority`, and nullable `actor_employee_id` evidence.
  Authority is `CURRENT_MANAGER` or `ORGANIZATION_HR` for privileged decisions; employee-owned
  cancellation withdrawal uses `SELF` and requires its real employee identity.
- HR-only accounts therefore remain fully attributable without fabricated employee records or
  weakened authorization. Domain audit records use the same account-first identity and authority-
  derived role.
- Migration `0014_adorable_piledriver.sql` backfills historical account identities from the
  effective account/employee link, derives manager or HR authority at the decision instant, aborts
  on missing or ambiguous evidence, then installs required account/authority constraints while
  retaining nullable employee evidence and immutable decision triggers.
- `WL-705` revalidated HR-only attribution, linked/combined-role self-denial, current-manager scope,
  and audit evidence. The account-first actor model remains the recommended contract and does not
  need to be reopened for the Phase 7 gate.
- See `docs/75-consistent-approval-decisions.md` for the shared decision and recovery contract.

## Decisions blocking Phase 8

### D-400 — Month lock timing

**Status:** Resolved by `WL-008`.

- An eligible non-self reviewer approval creates the immutable approval snapshot and moves the period to `APPROVED`.
- A separate explicit action by an eligible non-self reviewer moves that exact approved version to `LOCKED`; it does not rebuild the snapshot.
- Automatic, scheduled, technical-administrator-only, and approval-implies-lock modes are excluded from the MVP. Before lock, an eligible reviewer may instead request changes with a reason.
- Lock rechecks current scope, self-action, expected period version, approved snapshot/source fingerprint, and ledger reconciliation atomically. There is no ordinary unlock action.

### D-401 — Approved snapshot contents

**Status:** Resolved by `WL-008`.

- The immutable canonical snapshot records schema/engine versions; organization, employee, timezone, calendar boundaries, approval cycle, period version, source/snapshot fingerprints, snapshot/actor identity, and creation instant.
- Each ordered local-date row records its status, source fingerprint, full integer-minute calculation breakdown, warnings, and the effective schedule, policy, holiday, correction, neutral absence effect, adjustment, and daily-ledger source/version references.
- Period sums, opening/closing posted time-account balances, and the ordered included ledger-entry IDs/amounts must reconcile to the rows.
- The snapshot contains no sickness classification, request/reviewer notes, diagnosis, entitlement balance, or unrestricted protected-record payload. Later adjustments reference it and never replace it.

### D-402 — Monthly approval authority

**Status:** Resolved on 2026-08-14 before `WL-802`; ADR 0010 is amended.

- `REQUEST_CHANGES`, `APPROVE`, and `LOCK` may be performed by either the employee's current
  effective direct manager under `CURRENT_MANAGER` authority or an organization HR administrator
  under `ORGANIZATION_HR` authority. Both are ordinary eligible reviewer paths for this workflow;
  HR does not need a fabricated employee record or a special override reason.
- Self-action remains prohibited across combined roles. Historical/former managers, unrelated
  managers, delegated actors, employee-only actors, and system administrators receive no decision
  or lock authority. If no eligible non-self manager or HR actor exists, the action remains
  unavailable.
- Authorization is re-evaluated at each transition. When an actor qualifies through both current-
  manager and HR roles, `CURRENT_MANAGER` is the deterministic recorded authority; otherwise the
  successful authority is recorded explicitly.
- Monthly decisions and snapshots use the account-first actor model from `D-352`: authenticated
  account ID and authority are required, while employee ID is required evidence for
  `CURRENT_MANAGER` and optional evidence for `ORGANIZATION_HR`. `WL-802` must migrate the existing
  employee-only snapshot actor shape before enabling HR-only approval or lock.
- The same state, expected-version, source-fingerprint, blocker, ledger-reconciliation,
  transaction, audit, notification, and separate-approval/lock rules apply to both authorities.
  The resolution grants no HR ability to bypass readiness, alter a snapshot, unlock a period, or
  perform a privileged self-adjustment.

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

**Status:** Dispositioned by `WL-1206` with an explicit residual. Playwright `1.61.1` exercises
Chromium, Firefox, WebKit, mobile Chromium, and mobile WebKit smoke coverage. The UI release gate
also stores a deterministic macOS Chromium visual baseline for 19 representative route and state
archetypes.

- WorkLedger does not claim an exact current and previous retail Chrome, Edge, Firefox, Safari,
  mobile Safari, or Chrome Android support warranty from bundled engine automation.
- Real VoiceOver, NVDA, and TalkBack pairing was unavailable for `WL-1206`. This is an accepted,
  recorded residual rather than a screen reader or WCAG conformance claim.
- Exact retail browser, Temporal polyfill, and real assistive technology evidence must be rerun
  before publishing a public support matrix or conformance statement.
- The complete disposition and automated evidence are recorded in
  `docs/123-phase-12-gate-review.md`.

### D-503 — Production reverse proxy

**Status:** Resolved by `WL-010`.

- Ship Caddy as the reference Docker/reverse-proxy example while keeping the documented security contract proxy-agnostic.
- Production uses one canonical HTTPS origin for web/API, publishes only proxy ports, keeps API/PostgreSQL private, and fixes the public origin in validated configuration.
- The proxy overwrites forwarded headers; the application trusts only exact configured proxy addresses. Direct client-supplied forwarded values cannot affect callback URLs, cookie security, rate limits, or audit identity.
- Equivalent proxies are supported only when they meet the TLS, header, network-isolation, timeout/limit, health, and security-header requirements in `docs/06-security-operations.md`.

### D-504 — Locked absence-cancellation adjustment contract

**Status:** Resolved by `WL-1000` and implemented by `WL-1000A`; retained as a release-gate
regression contract for `WL-1008`.

- Submission now captures immutable snapshot linkage for locked targets while submitted/approved
  periods still fail closed with `PERIOD_REOPEN_REQUIRED`. Approval writes calculation-effect,
  entitlement, component adjustment, time-account, audit, and notification evidence atomically.
- Phase 8 does not silently reinterpret this as a correction. Its exact gate criterion and `WL-803`
  task are post-lock **correction** scoped, and their linked snapshot/adjustment contract is now
  complete. The Phase 8 gate therefore passes while retaining this separate release blocker.
- Employee intent remains an absence-cancellation request and uses exact remaining coverage-segment
  identifiers. It is not converted into an attendance correction and does not edit the locked
  monthly period, approved snapshot, original absence request, coverage, effect, or ledger rows.
- Submission captures the exact locked snapshot ID and its source fingerprint for every affected
  month. Mixed locked/unlocked targets are one atomic request; they are not partially accepted.
- Decision authority remains the employee's current non-self direct manager or an organization HR
  administrator. Combined roles cannot decide their own request, former managers have no retained
  scope, and system administrators receive no domain fallback.
- Approval appends the next absence-effect version for each target, the exact positive entitlement
  restoration when applicable, and one signed time-account adjustment per affected locked snapshot.
  The adjustment is the difference between the immutable approved result and the result with the
  approved cancellation effect; zero-valued time adjustments are recorded as reconciled evidence
  but do not create a zero ledger row.
- The request version, snapshot/source fingerprints, semantic source uniqueness, row locks, and one
  serializable transaction make approval safe across retries and concurrent decisions. Rejection,
  changes requested, and stale conflicts create no financial or time effect.
- Success appends purpose-minimized domain audit and generic notification evidence in the same
  transaction. Browser and generic report DTOs omit absence subtype, note/reason text, entitlement
  detail, internal source identifiers, and sickness context. Authorized monthly/report views show
  immutable original and reconciled adjusted totals separately.
- `WL-1000A` completed the bounded schema/repository/service/contract/UI/test/documentation slice.
  Migration `0020` and database-backed regressions enforce snapshot-link immutability,
  organization consistency, component reconciliation, and stale-replay safety.

### D-505 — Phase 10 threat-evidence ownership

**Status:** Resolved by `WL-1000`.

- `WL-1000` establishes the `T-001`–`T-020` evidence register, closes confirmed application-layer
  Critical/High findings, and adds an exhaustive central permission-policy regression matrix.
- It does not claim deployment or operational evidence before that evidence exists. Expected-scale
  denial-of-service evidence belongs to `WL-1001`; proxy/CSP/network isolation to `WL-1003`;
  encrypted restore to `WL-1004`; upgrade and rollback to `WL-1005`; structured logging and safe
  diagnostics to `WL-1006`; and retention/minimization to `WL-1007`.
- Each downstream task updates the same evidence register. `WL-1008`, not `WL-1000`, is the only
  task allowed to declare every threat control release-ready and no known Critical/High issue open.
- This resolves the prior contradiction between the original `WL-1000` wording and the evidence
  that can only be produced by its later Phase 10 peer tasks.

### D-506 — Portable backup encryption and restore quarantine

**Status:** Resolved by `WL-1004`.

- WorkLedger backup artifacts use authenticated AES-256-GCM encryption with a scrypt-derived key.
  The host-only encryption key is supplied through a separate file containing at least 32 bytes;
  it is not stored with the artifact or manifest.
- The content-free `0600` manifest records application/schema version, creation and explicit expiry,
  retention class, operator identifier, encryption profile, artifact size/checksum, and access mode.
- Clean restore uses a PostgreSQL-only Compose model on an internal network with a fresh restore
  password and no published port, API, proxy, SMTP, or webhook configuration. It deletes all
  restored sessions and verification grants before access and then runs integrity reconciliation.
- `WL-1007` still owns deployment-specific expiry enforcement and restored-data retention jobs;
  `WL-1004` records and rejects expiry but does not choose a universal legal duration.

### D-507 — Multilingual product contract

**Status:** Accepted for Phase 14; architecture ratified by `WL-1400`; runtime not implemented.

- This is a post-MVP roadmap decision and does not rewrite `D-003`: English remains the only
  shipped MVP locale and the only current product locale until Phase 14 passes.
- The only supported Phase 14 production locales are `en-GB`, `de-DE`, and `es-ES`; `en-GB` is
  the required fallback. English remains the only shipped UI locale until the `WL-1410` gate.
- German and Spanish require documented review by a fluent human before release. Automated or
  machine-generated output may assist drafting but cannot satisfy the catalog-review gate.
- The authenticated account preference is authoritative. Signed-out pages use a non-sensitive
  device preference, then a supported browser-language match, then `en-GB`. Existing accounts
  migrate to `en-GB`; invitation creation selects an initial locale and defaults to `en-GB`.
- Phase 14 covers all user-facing UI and accessibility text, live announcements, validation and
  errors, print and clipboard text, CSV labels and statuses, in-app notifications, invitations,
  password resets, and optional email. User-entered names and reasons remain verbatim. API
  identifiers, audit codes, logs, OpenAPI descriptions, and internal diagnostics remain
  language-neutral or technical English.
- A dedicated internal `@workledger/i18n` package owns typed local catalogs, locale resolution,
  message rendering, and formatting. Implementation pins supported stable `i18next` and
  `react-i18next` releases; `@workledger/ui` remains translation-library-neutral.
- Catalogs are bundled locally and loaded by locale. Runtime translation SaaS, external catalog
  downloads, and user-provided translation HTML are prohibited.
- The server continues to own Today attention and recovery meaning through bounded typed message
  descriptors. The browser must not infer that meaning from minute totals, prose, or status
  combinations.
- Locale changes synchronize React, React Aria, document title, `lang`, and `dir` without resetting
  route state or focus. Locale updates are current-account-only, CSRF-protected display preferences;
  they grant no permission and create no domain or security audit event.
- German and Spanish expansion must pass 320 CSS-pixel reflow, keyboard, focus, live-region,
  forced-colors, reduced-motion, and representative screen-reader review. The non-catalog
  application baseline plus the bounded `D-508` internationalization-runtime allowance remain
  enforced; locale resources receive separate budgets and are split rather than eagerly bundled.
- RTL content, translated public documentation, translation-management integrations, and
  per-employee timezone display remain deferred.
- ADR 0013 records the accepted locale resolution, catalog namespace, semantic key, descriptor,
  formatting, package, bundle, and enforcement architecture. The implementation inventory and risk
  register are in `docs/139-phase-14-internationalization-architecture-audit.md`; the human-review
  structure is in `docs/140-phase-14-translation-glossary.md`.

### D-508 — Non-catalog budget ownership for locale runtime behavior

**Status:** Resolved by Option B in `WL-1402` and empirically amended by `WL-1404`, `WL-1405`, and `WL-1406`; no longer blocking.

- ADR 0013 and the Phase 14 roadmap require the existing 910,000-byte raw and 246,000-byte gzip
  non-catalog JavaScript budgets to remain unchanged. The verified `WL-1401` graph measured 909,306
  raw and 245,662 gzip bytes, leaving less space than the required account/device persistence,
  selector, focus, rollback, and protected-startup behavior.
- The complete `WL-1402` implementation compiles to 916,728 raw and 247,840 gzip non-catalog bytes
  under the pinned toolchain.
  The three locale resources remain separately bounded, only the resolved catalog loads, and the
  full i18next/react-i18next engine remains absent from the production graph. No application code
  has been reclassified as locale catalog data.
- Option A was measured before changing the contract. Supported Terser pass, module/toplevel,
  ECMAScript-target, and tree-shaking experiments recovered at most 356 raw and 99 gzip bytes,
  while source attribution showed that the required locale slice itself accounts for the growth.
  Recovering 6,728 raw bytes would therefore require a broad unrelated application refactor or an
  unsafe minification policy, neither of which is justified by `WL-1402`.
- Option B is accepted. The original 910,000-byte raw and 246,000-byte gzip application ceilings
  remain the named baseline. A separately named Phase 14 internationalization-runtime allowance
  adds 96,000 raw and 22,000 gzip bytes, so the enforced combined non-catalog limits are 1,006,000
  raw and 268,000 gzip bytes. Largest-chunk, CSS, and locale-catalog limits do not change, and the
  allowance is not general-purpose application headroom.
- The pinned-toolchain `WL-1402` build is 916,728 raw and 247,840 gzip bytes. A forced production
  activation of the already-pinned i18next/react-i18next bridge is 961,249 raw and 261,327 gzip
  bytes. The latter anticipates `WL-1404` and remains 3,751 raw and 2,673 gzip bytes below the
  combined gates.
- ADR 0013, the executable checker, and its regression tests now record the baseline, allowance,
  combined gates, and current consumption explicitly. Locale chunks remain excluded only through
  their verified locale filenames; no application or runtime code is catalog data.
- The completed `WL-1404` shared and authenticated integration measures 974,388 raw and 265,450
  gzip bytes. This exceeded the provisional full-engine experiment by 13,139 raw and 4,123 gzip
  bytes because that experiment did not include the completed localized authentication, Profile,
  validation, announcement, and shared-component integration. The allowance therefore moved by a
  bounded 15,000 raw and 4,000 gzip bytes while the original application baseline, largest chunk,
  CSS, and catalog limits remain unchanged.
- The completed `WL-1405` employee workflow integration measures 985,603 raw and 260,782 gzip
  non-catalog bytes. Its required source-localization behavior exceeded the previous raw ceiling
  by 5,603 bytes, so the narrowly owned raw allowance moved by 6,000 bytes. The gzip allowance and
  every unrelated budget remain unchanged.
- The completed `WL-1406` manager, HR, and system workflow integration measures 1,005,262 raw and
  258,138 gzip non-catalog bytes. Its required source-localization behavior adds 19,659 raw bytes to
  the localized main chunk compared with `WL-1405`, while gzip usage falls. The narrowly owned raw
  allowance therefore moves by a rounded 20,000 bytes; the gzip allowance, application baseline,
  largest-chunk, CSS, and locale-catalog limits remain unchanged.

### D-509 — Deterministic Insights and local AI boundary

**Status:** Resolved by ADR 0014 and `WL-1500`; no longer blocking `WL-1501`.

- WorkLedger native results remain authoritative and complete without a model. The model may only
  explain validated facts and reference existing sources, limitations, and native actions.
- One active Employee, Manager, HR, or System workspace narrows every Insight request. Current API
  authorization runs again for every tool call, and combined roles never merge context.
- The provider is disabled by default. Phase 15 accepts only one exact private, operator-controlled
  Ollama origin and one pinned local model digest after the deterministic foundation gate. Public
  providers, cloud models, redirects, and silent outbound egress remain prohibited.
- Questions, conversations, tool arguments/results, model input/output, and reasoning traces are
  request or browser-session only. Content-free provider diagnostics use the existing operational
  log retention class.
- HR aggregation is unavailable until purpose contracts suppress cohorts below 10 eligible people,
  case counts below 3, and comparison complements below 10 before model context. `WL-1512` may be
  stricter but cannot weaken those floors without a superseding decision.
- General chat, natural-language SQL, unrestricted tools, scoring, prediction, approval or staffing
  recommendations, legal conclusions, autonomous action, and model-authored domain decisions are
  excluded.
- The deterministic foundation and employee local AI pilot were separate gates. The pilot later
  closed without passing. Completed `WL-1508G` supersedes only the downstream sequence: deterministic
  Manager, HR aggregate, and System work may proceed from the completed foundation through their
  revised gates, while Manager model interpretation, natural-language reports, and MCP are removed
  from Phase 15. The inactive provider boundary remains unchanged.

### D-510 — Reopen the bounded employee AI evaluation backlog

**Status:** Resolved by explicit user instruction on 2026-09-06; planning only, no tests now.

The user requested review of unfinished AI-pilot TODOs and reopening for a new future test, while
explicitly prohibiting test execution in this task. This supersedes the 2026-08-28 closure ban in
WL-1508G and the evaluation record only for the bounded employee pilot backlog.

- Reopen WL-1508 and B/C/D without marking any failed or unexecuted work complete.
- Add WL-1508H for fresh candidate qualification, implementation/evidence drift review, Windows
  invocation preparation, and preservation of separate content-free screen artifacts. Existing
  A/E/F remain completed historical evidence; qualification must be reconfirmed for a future run.
- Assumption: reopening requests scheduling readiness, not immediate tests, model selection,
  installation, runtime changes, prompt/schema tuning, or provider enablement.
- Preserve the completed deterministic WL-1516 gate and 0.16.0 milestone. No new phase or version
  bump is needed for reevaluating the existing employee contract.
- WL-1510 (Manager interpretation), WL-1511 (natural-language reports), and WL-1515 (MCP) remain
  obsolete. Broader capabilities require a separately accepted roadmap and applicable ADR gates.
- Preserve ADR 0014 privacy/security rules, zero-tolerance thresholds, and disabled defaults.
  Sequence H → B (18/18) → C (216/216 uninterrupted) → D; failure blocks advancement.

No tests, model probes, installations, or configuration changes were performed for this decision.

**D-510 execution clarification:** The user subsequently authorized the synthetic health probe
only. It passed in 29.265 seconds on the recorded qwen3.6 digest; zero employee cases ran. This
authorization does not cover the screen, full matrix, or provider configuration changes. H remains
open pending operator cloud-denial/network-isolation evidence (startup OLLAMA_NO_CLOUD=false).

**D-510 operator continuation:** The subsequent task continuation applied reversible Ollama-only
outbound firewall rules, per-user cloud-disable/loopback settings, and disabled desktop network
exposure. Effective listener/log/firewall metadata is verified in the H report. H is complete;
zero employee cases ran and WorkLedger deployment remains provider-disabled. B still requires an
employee-test instruction. Rollback invalidates the isolation evidence.

**D-510 bounded-screen continuation:** The user continued after H completion and identification of
B as the next employee test task. B ran submission-actions (9/9), then today-posted (9/9), using
the unchanged pinned candidate and evaluation controls. The initial empty run-limit launch failed
before any semantic case; only the invocation was corrected. B is complete; C/D and deployment
enablement were not executed by this continuation.

**D-510 full-matrix continuation:** The user continued after B completed and C was identified as
the next task. One unfiltered uninterrupted 216-case run completed with 213 passes and three
Spanish balance-summary duplicate-reference failures. C remains open; D is blocked. No retry,
tuning, model switch, or weakening of the contract follows automatically. The next proposed work
is a separately scoped diagnosis; the full result is recorded in the WL-1508C report.

### D-511 — Duplicate-safe provider representation and diagnostic detail

**Status:** Implemented in WL-1508I on subsequent explicit user instruction, 2026-09-06.

Following the completed diagnosis, the user requested a design for duplicate-safe generation and
content-free field diagnostics. Spec 0002 selects fixed boolean positions over the current authorized
reference collections. Strict decoding constructs the existing public interpretation, which still
passes all unchanged reference, source-union, limitation, prose and golden acceptance checks.

This explicitly amends spec 0001's direct provider/public-format equivalence and original closed
trace-field list for the future implementation only. A nullable strict diagnostic union adds either
an allowlisted failing field and bounded duplicate counts, or a selection-field failure reason.
No native identifiers, selection bits, prompts, prose or arbitrary parser paths may be retained.
The logger sink must validate nested detail; the existing operational retention class remains.

Assumption: the request authorizes a concrete design and implementation backlog, not implementation,
tests or model execution in this task. No domain or public API rule changes, duplicate normalization,
threshold relaxation, provider enablement, additional phase or version bump is selected. I precedes
fresh B and C evidence for selection-v1; historical evidence remains unchanged and D stays blocked.

Design and acceptance criteria: `docs/specs/_root/0002-duplicate-safe-insight-generation/index.md`.

**D-511 implementation continuation:** The user explicitly requested WL-1508I implementation.
Selection-v1, strict decoding, bounded diagnostic detail, logger-sink sanitization and versioned
artifact review are implemented. Final public validators remain unchanged; exact prose validation
stays in that existing final path to preserve specific failure codes. The deterministic evidence and
baseline formatting/skipped-integration limits are recorded in report 170. B is reopened for the
new format; prior evidence remains historical. No model call, browser E2E or provider enablement
occurred. This is a bounded employee recovery, not a new phase or version milestone.

**D-511 fresh-screen continuation:** The user continued after I completion and identification of B
as the next task. Selection-v1 submission-actions passed 9/9, then today-posted passed 9/9, with
unchanged pinned controls and validated v2 artifacts. B is complete; fresh C and D were not run.
Report 171 preserves exact provenance, isolation checks, artifact paths and the remaining gate.

**D-511 full-matrix continuation:** The user continued after fresh B passed and C was identified
as next. One uninterrupted selection-v1 matrix finished with 207 grounded answers, three permitted
safe rejections and six failed cases (210/216 accepted). Report 172 records the two failure modes,
exact configuration and complete artifact review. C remains open and D blocked; no retry, tuning,
model switch, threshold relaxation or deployment enablement followed. Next is scoped diagnosis.

### D-512 — Provider schema enforcement and interpretation completeness recovery

**Status:** Recovery design specified on user request; implementation pending, 2026-09-06.

The user requested diagnosis of the two selection-v1 failure modes. Report 173 identifies a
schema bypass in Ollama 0.24.0's chat path matching the installed qwen3.5 parser, thinking capability
and think:false request. This refines D-511's generic grammar-support assumption: fixed vectors
prevent duplicate references after strict decoding, but the candidate may generate an invalid shape.
Separately, runtime grounding enforces material limitation presence without its related facts/actions;
the minimized context also omits qualifiers distinguishing posted and projected change.

The proposed next scope is a bounded recovery design: establish schema enforcement while retaining
thinking=false and exact provider qualification; specify rejection of incomplete material dependency
sets and review narrowly allowlisted semantic qualifiers. Question-specific comparison completeness
remains a separate golden obligation. Do not silently fill selections, relax the gate or infer that
fixing dependency closure alone guarantees the posted-change fact.

This diagnosis changed documentation only. No inference, tests, installation changes or implementation
were authorized by this task. Future repair and execution need their own scope; no candidate version
or upgrade is selected here. C remains failed 210/216, D blocked and deployment provider-disabled.
There is no new phase or version change. Exact output and locale-specific generation causes remain
unknown under existing content-free retention.

**D-512 design continuation:** The user requested the recovery design. Spec 0003 selects exact
source-reviewed provider profiles and version checks, synthetic schema challenges with thinking
disabled, a shared material-dependency calculation enforced after existing grounding checks, and
request-memory fact qualifiers limited to POSTED, PROJECTED, PROVISIONAL and INCOMPLETE. New
fact/action completeness failure codes carry null diagnostic detail; public DTOs and selection-v1
stay unchanged. This explicitly amends spec 0002's unchanged-final-validator/context and adapter
assumptions for the bounded implementation. It does not weaken golden comparison requirements.

WL-1508J implements application safeguards/tooling and deterministic verification. WL-1508K
separately chooses and qualifies a source-reviewed stable runtime/model before fresh B and C.
The current known-bypassing tuple is ineligible; no replacement version is presumed fixed. The
design specifies admission and qualification criteria without authorizing installation or execution.
No tests or inference ran. C/D stay open, provider deployment disabled and version 0.16.0 unchanged.
See `docs/specs/_root/0003-insight-schema-enforcement-completeness/index.md` for exact contracts,
failure precedence, qualification cases, privacy boundaries and acceptance evidence.

**D-512 implementation continuation:** The user continued after design. J now implements exact
compatibility profiles/version checks, compact schema health, the six-case qualification runner and
strict artifact reader, shared material fact/action rejection and four request-memory qualifiers.
Explicit failure vocabularies constrain v2 artifacts and logger fields. The real profile table remains
empty; no candidate or installation is qualified. Report 174 records static verification and prepared
regressions. No tests or inference ran under the earlier execution restriction, so J remains unchecked
pending deterministic execution; K/B/C/D remain gated. This is not a passing pilot or phase change.

**D-512 deterministic-verification continuation:** On continuation after pretest repairs, J passed
focused and full non-model verification (report 177). A stale boundary-count assertion was updated;
worker/test timeouts in broad overlapping runs were resolved with sequential two-worker invocations,
without weakening timeouts or assertions. J is complete; K output preparation and exact candidate
qualification remain open. Model execution flags stayed disabled; B/C/D and deployment remain gated.

### D-513 — Question-relevant navigation coverage within B recovery

On the user's request to start B after report 180, implement the bounded instruction recovery
in report 181. Explicitly request each available navigation destination needed by the question,
including multiple destinations without material limitations. Keep unrelated actions optional and
retain all privacy/grounding/golden boundaries. This improves model instructions without claiming
a trusted free-text intent classifier or deterministic semantic enforcement. No schema, runtime
validation, context allowlist, golden expectation or inference control changes are accepted here.
The failed screen stays preserved; a fresh bounded B assesses the new instruction before C.

**D-513 execution outcome:** Report 181 records 52 deterministic passes and a single new first-group
screen failing 0/9 with FINAL_SCHEMA_REFERENCE_CARDINALITY_INVALID after successful health. No
retry or second group followed. The instruction change remains unvalidated pending diagnosis and
revision/withdrawal review; B is not complete. Candidate stopped, deployment disabled.

### D-514 — Minimum evidence and closed cardinality diagnostics

Design specified on continuation in report 183. Revise navigation guidance to preserve relevant
supporting facts and their exact source union, retaining the current schema and public minima.
Add only REFERENCE_CARDINALITY with closed field/reason vocabulary, fixed first-violation order
and matched logger/artifact enforcement. No counts or content are retained. Historical null details
remain unchanged. Implementation and verification are next; this design runs no tests or inference.
This extends D-513 diagnostics scope without changing golden acceptance or provider qualification.

**D-514 implementation outcome:** Report 184 implements the specified prompts and closed diagnostics.
Compile, lint, scoped formatting, 581 unit/component tests and 13 integration tests pass; 52 gated
integration tests skipped. No inference ran. B remains open pending a separately continued screen;
C/D remain gated, K complete, and deployment disabled. Historical failed evidence is unchanged.

**D-514 fresh screen outcome:** Report 185 records 0/9 accepted after successful health. English
and Spanish each omit the golden-required submission-count fact in three runtime-valid answers;
German fails all three with factReferences/EMPTY_REQUIRED. No retry, today-posted or C followed.
The owned runtime is stopped. Diagnose evidence selection next; B remains open and deployment disabled.

**D-514 diagnosis outcome:** Report 186 confirms that the navigation-only question does not ask for
the exact blocker-count fact required by its golden fixture, while D-514 prohibits unrelated minimum
filler. English/Spanish selected other grounded evidence and both requested actions; German selected
no facts. Runtime cannot enforce question-specific relevance because it receives no trusted required
fact intent. No schema, decoder, locale-fixture or authorization defect was found. Before another
screen, a separate bounded decision must align the question and accepted supporting evidence; no
tests, inference or implementation change occurred in the diagnosis.

### D-515 — Acceptance-aligned navigation evidence

Keep `submission-actions` as a navigation-only question and keep both requested actions mandatory.
Do not rewrite it to request the blocker count because `submission-count` already covers that
semantic obligation. Accept only a nonempty subset of the month-count and pending-request facts;
schedule and ledger blocker facts cannot pass this question. Actions and their exact sources cover
each requested destination, while facts support the statement as a whole.

Implement this as a fixture-only required-group/optional-allowlist contract. Existing exact fact
requirements become singleton groups, preserving all other golden semantics. Add generic model
guidance that navigation evidence must share a source relationship with an action/source for a
requested destination. Do not pass golden metadata into production, infer trusted intent from free
text, repair output or change runtime grounding.

Spec 0004 and report 187 define the implementation and deterministic cases. This design changes
documentation only and authorizes no model run. K remains complete because provider/schema controls
do not change. B stays open; today-posted, C and D remain gated; deployment stays disabled at
`0.16.0`.

**Implementation outcome:** Report 188 records the completed fixture contract, evaluator ordering,
both navigation instructions and deterministic verification. Typecheck, lint, 57 script tests, 592
unit/component tests, 13 available integration tests and build pass; 52 gated integrations skip.
Repository-wide formatting retains the known CRLF baseline, while scoped formatting passes. No
health probe, schema qualification or model inference ran. A separately continued B screen is next;
its first group remains the 9/9 stop gate.

**Fresh-screen outcome:** Report 189 records that the exact candidate, isolation, toolchain and
eleven fresh source hashes passed preflight, but the mandatory provider health operation returned
unavailable/TIMEOUT before the evaluator entered the golden-set loop. Its first chat completed after
about 80 seconds; the second was canceled during model loading when the shared unchanged 120-second
deadline expired. Zero employee cases ran, no fresh evaluation artifact exists, and this is not a
0/9 D-515 semantic result. No retry, tuning, today-posted or C followed. The owned portable processes
were stopped and final isolation checks passed. Diagnose the health timeout before another attempt;
B remains open and deployment disabled.

**Health diagnosis outcome:** Report 190 confirms the shared deadline expired during the second
model load after an approximately 80-second capability request. Both probes request immediate
unloading. Cancellation and readiness behavior match spec 0003; memory snapshots do not establish
a single host-level cause. Next is a bounded design for finite synthetic health residency and
cleanup, preserving a cold first probe, both validations, one slot and the unchanged deadline.
This is a proposal, not an accepted control change or model-run authorization. No tests or inference
ran; B remains open without D-515 semantic evidence and deployment stays disabled at 0.16.0.
