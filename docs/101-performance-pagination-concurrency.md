# 101. Performance, pagination, indexing, and concurrency review

## Status and scope

`WL-1001` remains in progress. WorkLedger's documented deployment target is 10–250 employees, not
5,000. The earlier 5,000-employee estimates were unsupported, arithmetically inconsistent, and are
withdrawn. A reproducible PostgreSQL expected-scale fixture, query-plan capture, latency results, and
concurrent-mutation run are still required before this task is complete.

At the upper supported bound, one daily projection per employee is about 91,250 rows per year.
Attendance, ledger, and audit volume depends on actual workflows; no invented per-employee event rate
is used as acceptance evidence.

## Enforced web budget

`pnpm build` now fails when the production web output exceeds any of these ceilings:

| Measure | Ceiling | 2026-08-16 result |
|---|---:|---:|
| Largest JavaScript chunk | 500,000 bytes | 348,925 bytes |
| Total JavaScript | 850,000 bytes | 825,452 bytes |
| Total gzip JavaScript | 230,000 bytes | 221,519 bytes |
| Total CSS | 50,000 bytes | 33,063 bytes |

The check is implemented by `scripts/check-web-bundle-budget.mjs` and has a regression test. Chunk
boundaries separate React, accessibility primitives, query infrastructure, and remaining vendors for
cache stability. These are regression ceilings, not proof of acceptable user-perceived performance;
route-level loading and field measurements remain possible later improvements.

## Existing database design evidence

- Employee/date and organization/time B-tree indexes support bounded attendance, projection, ledger,
  and audit queries.
- Audit endpoints use capped offset pagination. Deep-offset behavior must be measured at the supported
  dataset size before deciding whether cursor pagination is necessary.
- User-facing timeline endpoints use bounded date ranges rather than unbounded history payloads.
- Idempotency scope keys and transactional attendance heads protect duplicate clock mutations.
- Locked records are preserved through explicit adjustments rather than rewritten.

## Evidence still required

1. Generate a deterministic 250-employee dataset with documented attendance, ledger, request, and
   audit volumes.
2. Capture `EXPLAIN (ANALYZE, BUFFERS)` for the highest-risk list and calculation queries.
3. Record repeatable p50/p95 timings on named hardware and PostgreSQL configuration.
4. Exercise duplicate and conflicting mutations concurrently and record outcomes.
5. Revisit sequential transaction queries where eliminating the driver warning may have added extra
   round trips; combine queries only when measurements justify it.
