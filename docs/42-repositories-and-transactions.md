# Repository interfaces and transaction boundaries

**Task:** `WL-301`  
**Outcome:** Complete locally.

## Public persistence boundary

`@workledger/database` exposes one package root. Its public API contains the database factory,
bounded configuration and transaction errors, domain-facing records, seven repository interfaces,
and the transaction callback contract. Drizzle schemas, inferred rows, query builders, SQL values,
the `pg` pool, and the unrestricted transaction client remain internal.

Repository results reconstruct branded domain identifiers, instants, local dates, and minute values.
Invalid persisted values fail with `DatabaseValueError`, which identifies only the table and column;
it does not include the persisted value. Returned records and collections are frozen at the boundary.

The initial repository surface is deliberately narrow:

- organizations and employees support organization-scoped identity reads;
- attendance supports head creation, row locking, optimistic revision/sequence advancement,
  immutable event append, and ordered event reads;
- daily projections support organization-scoped reads and exact next-version replacement; and
- time-account entries support append and deterministic organization-scoped reads.

`WL-303` added authoritative authorization resolution. `WL-305` adds a physically separated audit
repository: domain/security append methods share the caller's transaction, while employee-domain
and organization-security queries expose different record types and enforce bounded pagination.
Audit facts are allowlisted and validated before SQL; invalid errors identify only the field, never
the rejected value.

Authorization is not inferred from repository scoping. `WL-303` must still apply actor/resource
policy before calling these methods.

## Transaction contract

Every repository is available only inside `WorkLedgerDatabase.transaction`. The callback receives a
frozen bundle rather than a pool, SQL executor, or nested transaction primitive. The default
isolation level is PostgreSQL `READ COMMITTED`; callers may explicitly request `REPEATABLE READ` or
`SERIALIZABLE` for a complete application operation.

Attendance mutation is designed for one transaction that:

1. ensures the employee attendance head exists;
2. locks that organization-scoped head with `FOR UPDATE`;
3. validates the command against the locked state in the application/domain layer;
4. advances the head only when both the expected attendance revision and next event sequence still
   match; and
5. appends the immutable punch event or events before committing.

A stale optimistic update returns `null`, allowing the application service to produce the later
stable conflict contract. The transaction rolls back all repository writes when its callback
throws.

Automatic retry is off by default. It can be enabled only with the explicit `DATABASE_ONLY` mode,
between two and five total attempts, and only for PostgreSQL serialization (`40001`) or deadlock
(`40P01`) failures. A retryable callback must keep all effects inside the database transaction; it
must not send messages, mutate external systems, or otherwise repeat non-transactional effects.

Pool configuration is bounded, uses a validated PostgreSQL URL and safe application name, and does
not include secret values in configuration errors. Closing is idempotent, and new transactions are
rejected after close.

## Schema alignment discovered during implementation

The time-account persistence enum and row shape were corrected before release to match the Phase 2
domain contract exactly: canonical entry types, explicit account/system actor provenance,
explanation code, and one employee/source identity. The greenfield generated migration and custom
integrity migration were regenerated together, and a clean migration remains the supported proof.

## Verification

- Unit tests cover bounded/non-leaking client configuration, explicit retry validation, idempotent
  close, schema identities, and the emitted public declaration closure.
- The public-boundary test follows every local declaration reachable from the package root and
  rejects SQL, Drizzle, `pg`, schema-table, or query-builder types.
- PostgreSQL 18 integration tests apply both migrations in isolated schemas and cover scoped reads,
  attendance head locking and advancement, stale revisions, immutable event append, ledger
  round-trip mapping, projection next-version replacement, rollback, cross-organization denial, and
  explicit serialization retry.
- Test schemas are isolated, serialized while installing shared PostgreSQL extensions, and dropped
  during cleanup. No personal or seed data is retained.

## Accessibility

No user interface changed. Later application services must translate stale/retry/error outcomes
into the focus, announcement, and recovery behavior specified by the route and UX contracts.

## Remaining work

`WL-302` owns Better Auth credentials and database-backed session storage. `WL-303` adds the
transaction-scoped authorization repository and central application policy. `WL-304`, `WL-305`,
and `WL-306` complete safe API errors, audit persistence, and protected attendance idempotency
claims/replay. Later attendance application services compose those boundaries in the accepted
authorization and transaction order. Ordinary domain repositories still do not pre-authorize
their callers.
