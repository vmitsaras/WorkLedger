# ADR 0006 — Temporal Time Model

**Status:** Accepted

## Context

Working-time software must distinguish instants, local dates, local times, timezones, durations, overnight work, and daylight-saving changes. JavaScript `Date` arithmetic is too error-prone for the domain.

## Decision

Use Temporal semantics in `packages/domain`, with a maintained polyfill wherever runtime support is incomplete. Use explicit IANA timezone IDs, date-only values, instants, and integer-minute durations.

## Consequences

- DST and overnight behavior are explicit and testable.
- Runtime/polyfill configuration must be consistent across API, tests, and browser.
- Adapters are required at React Aria and database boundaries.
