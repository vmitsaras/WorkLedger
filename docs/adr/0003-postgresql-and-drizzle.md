# ADR 0003 — PostgreSQL and Drizzle

**Status:** Accepted

## Context

The domain is relational, transactional, report-heavy, historical, and requires constraints, concurrency control, migrations, and auditability.

## Decision

Use PostgreSQL as the production source of truth and Drizzle ORM with the `pg`/node-postgres driver and generated, committed SQL migrations.

## Consequences

- Relational integrity and explicit SQL migrations.
- Type-safe query construction without hiding SQL completely.
- Schema and migration discipline are mandatory.
- SQLite may be used only for disposable isolated experiments if behavior remains PostgreSQL-compatible; production and integration truth is PostgreSQL.
