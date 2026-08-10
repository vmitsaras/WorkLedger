# Initial PostgreSQL schema and migrations

**Task:** `WL-300`  
**Outcome:** Complete locally.

## Decisions

`D-201` selects PostgreSQL 18's native `uuidv7()` as the default for application/domain primary
keys. UUIDs remain opaque at domain and contract boundaries; embedded generation time is not used
as business chronology, authorization evidence, or an alternative to explicit timestamps and event
sequences.

`D-202` persists one replaceable daily projection per employee and organization-local date. The row
contains calculation/engine versions, a SHA-256-shaped source fingerprint, source references,
structured warning codes, status, and reconciled integer-minute outputs. Explicit rebuilds may
replace this row. Punches, applied corrections, absence effects, ledgers, and approved monthly
snapshots remain the authoritative history. Reads never trigger a silent rebuild.

## Schema boundary

The initial schema contains 28 tables covering:

- organization, employees, employment periods, teams, and effective-dated assignments;
- versioned weekly schedules, time policies, absence types, and holidays;
- attendance heads, immutable punch events, correction requests/decisions, and applied versions;
- absence requests, coverage, decisions, calculated effects, and entitlement entries;
- replaceable daily projections and append-only time-account entries;
- monthly workflow records, immutable approved snapshots, and post-lock adjustments; and
- scoped, hashed idempotency claims ready for the later command implementation.

Authentication/session tables remain owned by `WL-302`, application-role/account links by
`WL-303`, audience-separated audit records by `WL-305`, notification records by `WL-704`, and later
feature-specific workflow additions by their owning tasks. Their future migrations must preserve
this schema's organization and immutable-history constraints.

The Drizzle schema is internal to `packages/database`; it is deliberately not exported from the
package root. API/application code will receive narrow repository methods in `WL-301`, never rows,
query builders, or an unrestricted client.

## Integrity and indexes

- Half-open effective-date ranges reject overlaps per employee with GiST exclusion constraints.
- Composite organization/identity foreign keys reject cross-organization relationships even though
  the MVP has one installation organization.
- Punches, decisions, applied corrections, absence effects, time/leave ledger entries, monthly
  snapshots, and post-lock adjustments reject update/delete through database triggers.
- Unique indexes cover employee numbers, employee/date projections, employee/month periods,
  event sequences, source-linked ledger entries, snapshot versions, and retry-key scope.
- Query indexes cover organization/status, employee/date, manager/date, request status/date, and
  monthly status/date paths.
- Database checks enforce schedule minute bounds, positive versions/sequences, half-open ranges,
  absence coverage shape, fingerprint shape, JSON container shape, and daily arithmetic
  reconciliation.

The database constraints support but do not replace domain validation or API authorization.
Transactions, row locking, state transitions, current-manager scope, self-action checks, and safe
JSON construction remain application/repository responsibilities.

## Migration and recovery strategy

`0000_initial_schema.sql` and its snapshots are generated from the Drizzle schema. The separately
generated custom `0001_integrity_constraints.sql` records PostgreSQL features not represented by the
Drizzle declarations. Both files are committed and applied in order; schema push is not a release
path.

This is a greenfield migration with no supported predecessor data. During development, a failed
apply is recovered by fixing the unapplied migration while it is still unreleased and recreating
the disposable local/test database. Once any migration has shipped, it is immutable: recovery uses
a backup restore or a new forward migration, never editing an applied file or attempting a
best-effort down migration that could delete ledger, event, decision, or snapshot history. The
production upgrade task must take and verify a backup, drain incompatible application traffic, and
prove forward recovery on a production-shaped copy.

## Verification

- Database package TypeScript build passes with WorkLedger source strictly checked.
- Schema unit tests verify the projection/ledger identities and committed migration journal.
- A PostgreSQL 18 integration test applies both migrations into a fresh isolated schema and proves
  all 28 tables exist, generated identifiers are UUIDv7, effective-date overlaps fail, immutable
  punch updates fail, and inconsistent projection arithmetic fails.
- The test drops its isolated schema in a `finally` block. It does not create employee seed data or
  retain test records.

## Remaining work

`WL-301` owns repository interfaces, mappings, pool construction, and transaction helpers. The
current schema does not authorize direct SQL or Drizzle access outside `packages/database`.
