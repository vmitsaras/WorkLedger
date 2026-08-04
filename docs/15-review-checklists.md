# Review Checklists

## Domain review

- Does the implementation use the schedule/policy valid on the target date?
- Are canonical terms from `docs/03-domain-rules.md` used consistently?
- Are durations integer minutes?
- Are elapsed times derived from instants?
- Are local dates derived through explicit timezone?
- Are punch occurrences minute-aligned with no later interval/daily rounding?
- Does the calculation retain an identified source fingerprint and injected clock where applicable?
- Are overnight and DST cases tested?
- Are local-day boundaries derived from timezone-aware start-of-date instants, including the 23/25-hour fixtures without assuming all zones shift by one hour?
- Are breaks excluded exactly once?
- Are schedule, policy, holiday, absence-credit/reduction, correction, and adjustment inputs versioned and non-overlapping?
- Are expected, worked, break, absence-credit, adjustment, credited, and balance formulas exact and uncapped?
- Are raw events preserved?
- Is a command distinguished from its immutable events, and a work session from its work intervals?
- Is a projection distinguished from a ledger entry or approved snapshot?
- Does every balance change have a source ledger entry?
- Are incomplete and conflict states structured?
- Are `PROVISIONAL`, `INCOMPLETE`, and `COMPLETE` calculation results kept distinct, with final fields only on complete results?
- Can only a complete past date post one base daily delta, including zero, under a unique semantic source key?
- Does unlocked recalculation append only the difference while locked changes use post-lock adjustment?
- Are posted and projected balances separately labelled, with incomplete dates excluded from the projection?
- Do full/half/minute absence segments use the exact coverage and overlap rules, including odd-minute partition and no mixed minute/full-half coverage on one date?
- Do entitlement views satisfy `available - active reserved = projected`, with reservations excluded from final available balance?
- Does approval release and deduct once, while rejection/changes/withdrawal release once and cancellation restores only still-effective deducted coverage?
- Is report-and-acknowledge absence effective once on report, with acknowledgement producing no duplicate time effect and rejection unavailable?
- Does paid absence avoid overlapping work credit while unpaid leave supplies the configured expected reduction rather than hidden negative flex?
- Do partial cancellation, concurrent cancellation, negative-balance override, and locked-date paths preserve append-only source history?
- Does every attendance state/action pair produce the exact transition or code in the canonical matrix?
- Are punch events ordered by per-employee sequence rather than timestamp, identifier, or database order?
- Does one attendance command increment its revision once, including confirmed on-break clock-out?
- Are locked periods protected?

## API review

- Is input validated?
- Is output serialized through a schema/contract?
- Is authentication required?
- Is resource authorization checked?
- Is self-approval blocked?
- Is privileged self-adjustment blocked even for combined roles?
- Is the transaction boundary correct?
- Is idempotency required and implemented?
- Is `Idempotency-Key` header validation, organization/actor scope, and canonical fingerprinting exact?
- Does matching replay precede attendance revision validation but follow authentication, authorization, and CSRF checks?
- Does same-key concurrency produce one terminal outcome, while different-key stale contenders receive safe current state/revision?
- Are successful attendance response, punch events, revision, audit event, and idempotency outcome atomic?
- Are stale versions handled?
- Does every absence workflow mutation require the expected resource version and reject a losing transition without partial ledger/calculation effects?
- Are absence conflict/insufficient-balance contexts restricted to the purpose-specific actor DTO and free of sickness/type leakage?
- Does ambiguous manual local time require a valid explicit offset, and does nonexistent time fail without persistence?
- Does timezone change fail after time-dependent employee facts exist?
- Is the error code stable and safe?
- Is audit behavior present?

## Database review

- Is there a generated migration?
- Are nullability and defaults intentional?
- Are unique/check/foreign-key constraints useful here?
- Are common filters indexed?
- Can cascade behavior destroy history?
- Are effective-date overlaps prevented or validated transactionally?
- Does the query apply organization and permission scope before pagination?
- Is test cleanup isolated?

## React/UI review

- Is the component using the correct semantic element?
- Is a link still a link and an action still a button?
- Is accessible name/description correct?
- Can keyboard users complete the flow?
- Is focus moved only when necessary?
- Are validation errors linked and summarized?
- Is dynamic feedback announced without noise?
- Do pending clock actions prevent repeat activation locally without claiming optimistic attendance state?
- Are success, confirmation-required, stale, offline, and retry outcomes announced once with usable recovery text?
- Is status more than color?
- Are loading, empty, error, permission, and stale states present?
- Does narrow layout remain understandable?
- Is motion reduced appropriately?
- Has React Aria behavior been preserved?

## Security/privacy review

- Could an actor change the target identifier to access another record?
- Does a former manager retain access accidentally?
- Could a system admin see HR data unnecessarily?
- Could logs/errors/audit include sickness details or secrets?
- Could absence type, sickness, notes, reasons, entitlement, or identifying search values reach URLs, browser persistence, shared caches, generic notifications, exports, clipboard, telemetry, technical audit, or operational logs?
- Does the sickness contract omit diagnosis, unrestricted note, clinician, and attachment fields rather than merely hiding them in the UI?
- Do team availability DTOs omit request IDs, absence type, sickness classification, notes, entitlement, and reviewer history?
- Does logout/session expiry clear sensitive in-memory query data, and do sensitive responses prevent shared caching?
- Are retention, cancellation/correction user control, backup expiry, and future anonymization behavior documented without a universal legal claim?
- Could CSV content execute as a formula?
- Could a mutation replay or race create duplicates?
- Could an idempotency replay bypass current session, employee capability, organization scope, CSRF, or endpoint authorization?
- Could raw idempotency keys or fingerprints reach URLs, logs, analytics, or audit data?
- Could a privileged adjustment occur without reason?
- Could an HR or combined-role actor change their own employment, role, schedule assignment, entitlement, balance, or locked period?
- Does an explicit unauthorized target return `403` while collections apply scope before counts and pagination?
- Could an attachment become public?
- Does deactivation revoke sessions?

## Documentation review

- Does the README explain the user problem, not only packages?
- Are commands current and verified?
- Are architecture decisions consistent with code?
- Are accessibility notes specific?
- Are known limitations honest?
- Are migration/config changes documented?
- Are task status and next task updated?
