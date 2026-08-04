# WorkLedger Project Status

**Current phase:** Phase 0 — Product and domain contract
**Current milestone:** Monthly submission, approval, locking, and adjustment finalization
**Active task:** `WL-008`
**Status:** Ready
**Last verified:** 2026-08-04

## Current objective

Finalize monthly-period readiness, submission, changes-requested, approval, explicit locking, immutable snapshot, and post-lock adjustment behavior before scaffolding application code.

## Verified decisions

- Product name: WorkLedger.
- One organization per self-hosted installation for the initial release.
- React web application with a separate Fastify API.
- PostgreSQL source of truth.
- React Aria plus shadcn React Aria source components and Tailwind.
- TanStack Query for server state.
- Framework-independent domain engine before UI feature development.
- WCAG 2.2 AA baseline.
- Immutable punch events, ledger-based balances, effective-dated policies, and monthly locking.
- Teams are the only MVP organization grouping; departments are deferred.
- Approval delegation is excluded from the MVP.
- English is the only shipped MVP locale; formatting remains locale-aware.
- Employee self-service profile data is read-only; HR-owned employment facts are not self-editable.
- In-app notification records are core; external email delivery is optional and non-transactional.
- Manager scope is current direct reports only and is evaluated when each request is handled.
- Explicit unauthorized targets return `403`; scoped collections apply authorization before counts and pagination.
- Self-approval and privileged self-adjustment are prohibited even for combined roles.
- System-administrator capability grants technical access only, not HR/domain data.
- A work session runs from clock-in to clock-out and contains break-free work intervals; breaks are excluded exactly once.
- Effective-date ranges are half-open, and stable employee identity survives non-overlapping employment periods.
- Account/employee links are one-to-one while active; team and manager assignments have one current value per employee.
- Derived intervals split at organization-local midnight while source sessions/events remain intact.
- Ordinary clock actions use one trusted server occurrence instant and strictly increasing per-employee event sequence numbers.
- Every attendance command carries the latest `attendanceRevision`; one successful command increments it once, while rejection and replay do not.
- Every attendance mutation requires a scoped, fingerprinted `Idempotency-Key`; matching retries replay the terminal outcome and attendance keys do not expire in the MVP.
- Confirmed on-break clock-out atomically appends `BREAK_END` then `CLOCK_OUT` at one instant and increments the attendance revision once.
- Punch occurrence/manual attendance inputs use minute precision; interval, daily, policy, and display calculations apply no later rounding.
- Daily calculations have identified inputs and `PROVISIONAL`, `INCOMPLETE`, or `COMPLETE` status; only complete past dates may post.
- Holiday dates reduce expected and default absence consumption/credit to zero while preserving actual worked credit.
- Nonexistent manual local times are rejected; ambiguous times require one valid explicit UTC offset.
- Ordinary organization-timezone changes are blocked after time-dependent employee facts exist.
- Complete past dates post one base daily delta; later unlocked recalculations append only the difference, and locked changes use post-lock adjustment.
- Leave entitlement, reservation, deduction, restoration, coverage, credit, and expected-reduction amounts use integer minutes; day equivalents are presentation only.
- Half-day absence is an exact first/second obligation partition; minute coverage cannot mix with full/half coverage on the same local date.
- Approval-required entitlement absence reserves on submission, releases and deducts on approval, and releases without deduction on rejection, changes requested, or withdrawal.
- Negative vacation approval is manager-blocked and requires an eligible non-self HR override with a reason.
- Report-and-acknowledge sickness is effective once on report; acknowledgement adds no second effect, and the default retrospective window is seven configurable calendar days.
- Unpaid leave reduces covered expectation by default and contributes no absence credit.
- Cancellation is a separate versioned workflow that may target exact remaining coverage, restores no more than the linked deduction, and never rewrites the original request/decision.
- Sickness has no diagnosis, note, clinician, or attachment field; type and sensitive context stay out of team DTOs, URLs, browser persistence, generic notifications/exports, technical audit, and operational logs.

## Work completed

- [x] Planning files reviewed for consistency (`WL-001`; see `docs/17-planning-audit.md`).
- [x] MVP scope, non-goals, assumptions, and success criteria finalized (`WL-002`).
- [x] Roles, resource scopes, permission matrix, and self-action rules finalized (`WL-003`).
- [x] Canonical domain vocabulary, concept relationships, and invariant catalog finalized (`WL-004`).
- [x] Attendance transitions, invalid actions, deterministic event order, idempotency, retry, and tab/device conflict behavior finalized (`WL-005`).
- [x] Daily calculation, DST/manual-time, holiday, timezone, posting, and 35 exact calculation fixtures finalized (`WL-006`).
- [x] Absence policy, entitlement ledger, coverage/overlap, workflow, cancellation, privacy, and 27 exact absence fixtures finalized (`WL-007`).
- [ ] Phase 0 blocking decisions resolved.
- [ ] Domain example catalog approved.
- [x] Roadmap and task-board mapping verified.
- [ ] Phase 0 exit gate passed.

## Latest completed task

### `WL-007` — Finalize absence, entitlement, privacy, overlap, and cancellation rules

- Changed: finalized the bounded absence policy matrix, exact full/half/minute coverage rules, entitlement equations and signed transition entries, approval/report state machines, overlap behavior, negative-balance override, retrospective sickness boundary, unpaid-leave expectation reduction, and partial/full cancellation reversal.
- Verified: 27 accepted absence fixtures cover arithmetic, policy effects, reservation conservation, acknowledgement, overlap, work intersection, cancellation concurrency, locked history, authorization, privacy channels, and invalid configuration; all 75 example headings and 88 invariant IDs are unique; all referenced absence/warning codes exist.
- Commands: Markdown table-shape and decision-status script, example/invariant uniqueness and count script, API-code coverage comparison, task-ID parity check, stale-decision searches, `git diff --check`, and focused diff review. No package quality commands exist before Phase 1 scaffolding.
- Decisions: resolved `D-300`–`D-304`; leave minutes, exact first/second half partition, reasoned non-self HR negative override, configurable seven-day default sickness window, and unpaid expected-time neutralization.
- Privacy: added the absence data inventory and high-risk control matrix for collection, purpose-specific DTOs, browser/cache/URL state, notifications, logs, exports, telemetry, retention, and correction/cancellation user control.
- Remaining risk: `D-500` still owns exact production retention/anonymization periods; `WL-008` must finalize locked-date adjustment mechanics; Phase 2/3/6 must prove calculations, source uniqueness, authorization, rollback, cache clearing, and privacy-shaped serialization in executable tests.
- Next task: `WL-008`.

## Current blockers

See `docs/10-open-decisions.md` and the unresolved findings in `docs/17-planning-audit.md`.

## Next task

`WL-008 — Finalize monthly submission, approval, locking, and adjustment rules.`

## Update rules

After every completed task, record:

- What changed.
- What was verified.
- Commands/tests run.
- New decisions or ADRs.
- Remaining risks.
- Exact next task ID.
