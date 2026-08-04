# ADR 0004 — Immutable Punch Events

**Status:** Accepted

## Context

Time records must remain explainable after corrections, manager decisions, and monthly closure.

## Decision

Raw clock-in, break-start, break-end, and clock-out events are immutable facts. Corrections create proposed/approved versions or adjustment records linked to originals.

## Consequences

- Historical truth remains available.
- Calculated projections may need rebuilding/versioning.
- UI must distinguish recorded, corrected, and approved values.
- Deletion is replaced by controlled invalidation/reversal where necessary.
