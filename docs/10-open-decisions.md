# Open Decisions and Accepted Defaults

Codex must not silently invent a rule in this file. Resolve blocking items before their listed phase.

## Accepted defaults for the MVP

| Decision | Default | Rationale |
|---|---|---|
| Installation tenancy | One organization per installation | Reduces authorization and operations complexity while retaining organization IDs for defense in depth |
| Primary timezone | One IANA organization timezone | Keeps daily attribution deterministic for MVP |
| Time precision | Integer minutes | Clear reporting; avoids floating-point errors |
| Rounding | None | Preserve recorded time; avoid hidden policy assumptions |
| Break handling | Employee records breaks; warnings only by default | Avoid silent invented time deductions |
| On-break clock-out | Explicit confirmation, atomic break end plus clock out | Supports common recovery without invalid history |
| Overtime | Not formalized; flexible-time delta only | Payroll/legal overtime is separate scope |
| Monthly period | Calendar month | Simple, explainable initial closure model |
| Vacation pending behavior | Reserve pending amount for display; deduct finally on approval | Prevents misleading available balance |
| Public holidays | Administrator-managed calendar | Avoid dependence on jurisdiction/legal API in core |
| Sickness details | No diagnosis; team sees “Unavailable” | Data minimization |
| Attachments | Excluded from MVP | Significant security and retention surface |
| Offline clocking | Excluded from MVP | Conflict resolution and trust requirements are non-trivial |
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

### D-003 — Default locale

- Proposed default UI locale: English.
- Plan German and Greek localization-ready formatting, but do not build full translations in MVP unless requested.
- Domain/API messages use codes; UI owns localized prose.

### D-004 — Package publication

- Proposed: internal workspace packages only for MVP.
- Do not publish `packages/domain` or `packages/ui` until APIs stabilize.

## Decisions blocking Phase 2

### D-100 — Credited-time representation

Confirm the implementation model:

- Recommended: reconstructed work intervals already exclude breaks, so `workedMinutes` is net work.
- `breakMinutes` is reported separately for explanation.
- Never subtract breaks twice.

### D-101 — Midnight split policy

- Accepted proposal: split working intervals at organization-local midnight for daily records.
- Preserve source session linkage.

### D-102 — Manually entered ambiguous local time

Choose UX/API behavior during fall-back DST:

- Recommended: require explicit offset/occurrence disambiguation when a local time maps to two instants.
- Reject impossible spring-forward local times with a field error.

### D-103 — Holiday expected time

- Proposed: configured holiday sets expected minutes to zero when the employee would have been scheduled.
- Confirm that absence on a holiday consumes zero entitlement by default.

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

## Decisions blocking Phase 6

### D-300 — Vacation entitlement unit

- Proposed storage: entitlement in minutes for accurate partial-day arithmetic, with UI display in schedule-relative days/hours.
- Alternative: separate day-unit ledger plus hourly requests.
- Resolve before leave schema implementation.

### D-301 — Half-day definition

- Proposed: half of expected minutes for the selected local date.
- Decide how AM/PM affects scheduling and overlap display.

### D-302 — Negative vacation balance

- Proposed default: block approval when final available balance would be negative, with HR override requiring a reason.

### D-303 — Retroactive sickness reporting

- Proposed: configurable maximum retrospective window; no hardcoded legal rule.


### D-304 — Unpaid-leave daily balance behavior

Choose one configurable policy before implementing unpaid leave:

- count zero credited minutes against scheduled expectation, producing a negative flexible-time delta, or
- neutralize expected time for the approved unpaid interval so flexible-time balance is unchanged.

Recommended product default: neutralize the approved unpaid interval for flexible-time accounting while reporting it separately as unpaid absence. This avoids treating approved unpaid leave as an attendance deficit.

## Decisions blocking Phase 8

### D-400 — Month lock timing

- Decide whether manager approval immediately locks or an administrator/scheduled close locks later.
- Recommended MVP: manager approval records approval; explicit lock action follows, potentially combined by policy.

### D-401 — Approved snapshot contents

Define exact snapshot fields and version metadata needed to reproduce:

- expected,
- worked,
- credited absence,
- adjustments,
- daily balances,
- period total,
- schedule/policy versions,
- calculation engine version.

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
