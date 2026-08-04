# ADR 0007 — React Router and TanStack Query State Ownership

**Status:** Accepted

## Context

React Router Data Mode and TanStack Query can both fetch and mutate data. Unclear ownership creates duplicate requests and synchronization bugs.

## Decision

- React Router owns route structure, boundaries, permitted URL state, permission gates, and optional query prefetch. URL state is public-ish: sensitive values such as absence type/sickness classification, notes/reasons, entitlement, or person-identifying search terms are not URL state.
- TanStack Query owns API server state, cache, mutations, retry, and invalidation.
- Route loaders may call the same query options through `ensureQueryData`; they do not create parallel fetch implementations.
- Complex forms use React Hook Form; transient UI uses local state.

## Consequences

- One remote-state cache and mutation path.
- Non-sensitive search/filter state remains shareable; sensitive workflow state stays in the form or authorized server-state boundary.
- Team must resist duplicating router actions and Query mutations for the same command.
