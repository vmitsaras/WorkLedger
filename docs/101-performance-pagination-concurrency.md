# 101. Performance, pagination, indexing, and concurrency review

## Performance Targets

WorkLedger is designed for small and medium-sized organizations (up to 5,000 employees). 
The data model scales linearly with time and employees.

### Expected scale dimensions:
- **Employees**: Up to 5,000 per organization.
- **Punch Events**: Up to 10-15 per employee per day (~15-20M rows/year).
- **Time Account Entries**: ~10 per employee per day (~13M rows/year).
- **Daily Projections**: 1 per employee per day (~1.8M rows/year).
- **Audit Events**: ~50 per employee per day (~60M rows/year).

## Indexing Strategy

Critical queries have covering or heavily filtering B-tree indexes defined in `packages/database/src/schema/index.ts`:

1. **Employee queries**: 
   - `punch_events_employee_occurred_idx` supports ordered timeline retrieval.
   - `time_account_entries_employee_date_idx` supports ledger balance projections.
   - `daily_projections_employee_date_uidx` speeds up daily recalculations.

2. **Audit & Log queries**:
   - `domain_audit_events_organization_time_idx` (organizationId, occurredAt, id) and `domain_audit_events_employee_time_idx` provide efficient ordering for the paginated audit explorer.
   - `security_audit_events` follow the same structure.

3. **Approval queues (Absence & Corrections)**:
   - `absence_requests_employee_status_submitted_idx` supports employee view of their pending requests.
   - `correction_requests_employee_date_status_idx` provides the same for correction requests.

## Pagination

1. **API endpoints**:
   - The Audit explorer uses offset-based pagination (`limit`/`offset`) capped at 100 items per page, secured by the `domain_audit_events_organization_time_idx`. Deep pagination offset penalties are mitigated by the B-tree index and organization-level scope, which is acceptable for back-office audit tools.
   - User-facing timeline queries (My Time, Today) do not paginate, but rather filter by a bounded date range (e.g., current week or month). Bounded ranges guarantee predictable JSON payload sizes.

2. **UI & State**:
   - React Router URL search params manage shareable pagination state.
   - `dist/browser` chunk sizes are managed through Rollup/Rolldown `manualChunks` configuration, separating `vendor` dependencies into stable caching chunks and successfully resolving the Vite main-chunk-size advisory.

## Concurrency and Mutations

1. **PostgreSQL Transactions & driver warnings**:
   - Resolved the `pg` concurrent-query deprecation warning by sequentializing database queries within a single transaction in `postgres.ts`. `Promise.all` over `this.transaction.select()` blocks was converting to synchronous parallel execution, violating the pg driver's single-query-per-connection rule.

2. **Idempotency & Race Conditions**:
   - High-throughput mutations like `punch_events` use an `idempotency_records` mechanism (with a `scope_key` unique index constraint) and database-level sequences.
   - Double-clicks or duplicate requests from offline-retry sync are caught securely.

3. **Snapshots and Locking**:
   - Changes to absence configurations or past corrections apply atomic adjustments to future ledgers instead of rewriting locked historical snapshots. `post_lock_adjustments` captures exact delta linkages for audit trails.
