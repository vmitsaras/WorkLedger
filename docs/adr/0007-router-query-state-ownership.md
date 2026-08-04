# ADR 0007 — React Router and TanStack Query State Ownership

**Status:** Accepted

## Context

React Router Data Mode and TanStack Query can both fetch and mutate data. Unclear ownership creates duplicate requests and synchronization bugs.

## Decision

- React Router owns route structure, boundaries, URL state, permission gates, and optional query prefetch.
- TanStack Query owns API server state, cache, mutations, retry, and invalidation.
- Route loaders may call the same query options through `ensureQueryData`; they do not create parallel fetch implementations.
- Complex forms use React Hook Form; transient UI uses local state.

## Consequences

- One remote-state cache and mutation path.
- Search/filter state remains shareable.
- Team must resist duplicating router actions and Query mutations for the same command.
