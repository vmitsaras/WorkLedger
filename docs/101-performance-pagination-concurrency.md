# 101. Performance, pagination, indexing, and concurrency review

## Status and scope

`WL-1001` is complete. WorkLedger's documented deployment target is 10–250 employees, not
5,000. The earlier 5,000-employee estimates were unsupported, arithmetically inconsistent, and are
withdrawn. The executable `performance.integration.test.ts` now creates a deterministic upper-bound
fixture, verifies index plans and latency, and exercises a 20-way optimistic-concurrency race.

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

## PostgreSQL measurement

Measured on 2026-08-16 using the repository's PostgreSQL 18.4 Docker service on an arm64 development
host. Each latency result is ten warm iterations; the small sample's p95 is conservatively the maximum.

| Fixture/query | Evidence |
|---|---:|
| Employees | 250 |
| Daily projections (365 days) | 91,250 |
| Punch events (four/day for 90 days) | 90,000 |
| Domain audit events (20/day for 90 days) | 450,000 |
| Annual employee projection query | p50 1.32 ms; p95/max 3.25 ms |
| Audit page at offset 10,000 plus matching count | p50 12.08 ms; p95/max 12.71 ms |

JSON plans must name `daily_projections_employee_date_uidx` and
`domain_audit_events_organization_time_idx`. The concurrent mutation check launches 20 updates
against the same attendance revision and requires exactly one winner. CI fails above a deliberately
portable 1,000 ms p95 ceiling; recorded local values provide the review baseline rather than a brittle
machine-specific gate.

The fixture is included in `scripts/run-postgres-integration.mjs`, so normal database verification
cannot silently omit it. Future schema or query changes should add representative scenarios rather
than increasing unsupported organization size. Deep offset remains acceptable at measured scale;
cursor pagination should be reconsidered if supported scale or audit-retention volume increases.
