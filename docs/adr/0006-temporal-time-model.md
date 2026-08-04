# ADR 0006 — Temporal Time Model

**Status:** Accepted

## Context

Working-time software must distinguish instants, local dates, local times, timezones, durations, overnight work, and daylight-saving changes. JavaScript `Date` arithmetic is too error-prone for the domain.

## Decision

Use Temporal semantics in `packages/domain`, with a maintained polyfill wherever runtime support is incomplete. Use explicit IANA timezone IDs, date-only values, instants, and integer-minute durations.

`WL-006` clarifies that punch occurrence/manual attendance inputs are minute-aligned, local-day boundaries are timezone-aware start-of-date instants, ambiguous manual local time requires an explicit valid offset, and nonexistent local time is rejected. The MVP blocks ordinary organization-timezone changes after time-dependent employee facts exist.

## Consequences

- DST and overnight behavior are explicit and testable.
- Runtime/polyfill configuration must be consistent across API, tests, and browser.
- Adapters are required at React Aria and database boundaries.
