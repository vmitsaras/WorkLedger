# 105. Migration and upgrade

## Status and boundary

`WL-1005` supplies a documented upgrade procedure for self-hosted installations. It covers migration application, readiness validation, version compatibility, rollback strategy, and post-upgrade verification. The WorkLedger system-administrator application role has no direct schema or migration access; database changes require host-operator execution outside the browser.

## Version compatibility and release support

WorkLedger uses zero-indexed phase-gate versioning: `0.<completed phase-gate count>.0`. Version `0.10.0` marks Phase 9 completion; `0.11.0` will mark Phase 10 completion.

- **Schema migrations are cumulative and forward-only.** Each version includes all prior migrations.
- **Backward compatibility within Phase 10 is not guaranteed.** The MVP remains pre-1.0 development.
- **Test upgrades from at least the prior supported release** before applying to production.
- **Current supported upgrade path:** `0.9.0` → `0.10.0` → future releases.

Future breaking changes to authentication, session handling, or core domain contracts will be documented in release notes with explicit migration procedures.

## Pre-upgrade checklist

Before upgrading any self-hosted installation:

1. **Record current state:**
   - Application version (`package.json` or deployment manifest)
   - Latest applied migration tag (query `drizzle.__drizzle_migrations` or check logs)
   - Organization count, employee count, and sample ledger/snapshot totals
   - Active sessions and pending requests

2. **Create an encrypted backup:**
   ```sh
   pnpm run backup:create -- \
     --env-file /etc/workledger/workledger.env \
     --output-dir /srv/workledger-backups \
     --encryption-key-file /etc/workledger/secrets/backup_key \
     --retention-days 90 \
     --operator pre-upgrade-operator-id
   ```

3. **Verify backup integrity:**
   - Confirm manifest creation with correct version and migration tag
   - Test restore in quarantine (see [docs/104-backup-and-clean-restore.md](./104-backup-and-clean-restore.md))
   - Keep backup and manifest secure until post-upgrade verification succeeds

4. **Review release notes and breaking changes:**
   - Check for authentication/session contract changes
   - Identify required configuration or secret updates
   - Note any data-migration warnings or manual steps

5. **Plan maintenance window:**
   - During schema migration, readiness checks fail and the application should not serve traffic
   - Coordinate downtime with users; a typical migration completes in seconds to low minutes
   - Prepare rollback plan if upgrade validation fails

## Upgrade procedure

### Step 1: Stop application traffic

Drain active connections and stop the application containers. Do not stop PostgreSQL.

```sh
docker compose --env-file /etc/workledger/workledger.env -f infra/compose/production.yml stop api web
```

### Step 2: Apply new application version

Check out or deploy the new application version. Verify that `package.json` shows the expected version and that `packages/database/migrations/meta/_journal.json` contains the expected migration tags.

### Step 3: Apply database migrations

Run the migration CLI against the production database. This must complete before starting the new application version.

```sh
pnpm install --frozen-lockfile
pnpm --filter @workledger/database build
node packages/database/dist/migrate-cli.js
```

The CLI reads `WORKLEDGER_DATABASE_URL` or `WORKLEDGER_DATABASE_URL_FILE` from the environment. It applies only unapplied migrations, records each in `drizzle.__drizzle_migrations`, and exits with status `0` on success or `1` on failure.

**On migration failure:**
- Do not start the new application version
- Review migration logs and error output
- Execute rollback procedure (see below)
- Restore from backup if rollback is not viable

### Step 4: Start new application version

Start the upgraded application containers:

```sh
docker compose --env-file /etc/workledger/workledger.env -f infra/compose/production.yml up -d
```

Wait for health and readiness checks to pass. Readiness validates:
- Database connection
- Applied migrations match application expectations
- No schema version mismatch

### Step 5: Verify upgrade success

Run post-upgrade verification:

```sh
pnpm run production:verify --runtime --base-url https://your-domain.example
```

Check:
- Health endpoint responds
- Readiness endpoint confirms compatible migrations
- Organization, employee, and audit row counts match pre-upgrade baseline
- Authentication and session behavior works as expected
- Ledger and snapshot integrity checks pass
- No unexpected errors in application logs

Test critical workflows:
- Sign in with an existing account
- View Today screen and attendance status
- Clock in/out if applicable
- View time records and balances
- Manager approval queue (if applicable)
- HR administration screens (if applicable)

### Step 6: Record upgrade evidence

Document:
- Upgrade date and operator
- Source version → target version
- Pre-upgrade backup manifest identifier
- Migration duration
- Verification results and spot-check outcomes
- Any warnings or manual adjustments required

Do not record domain rows, credentials, or personal data in the evidence log.

## Rollback procedure

If post-upgrade verification fails and forward-recovery is not viable, execute rollback:

### Option A: Rollback via restore

This is the safest rollback path when schema changes are incompatible or data integrity is uncertain.

1. Stop all application containers:
   ```sh
   docker compose --env-file /etc/workledger/workledger.env -f infra/compose/production.yml down
   ```

2. Restore from the pre-upgrade encrypted backup (see [docs/104-backup-and-clean-restore.md](./104-backup-and-clean-restore.md)):
   ```sh
   pnpm run backup:restore -- \
     --manifest /srv/workledger-backups/workledger-<timestamp>.dump.enc.manifest.json \
     --encryption-key-file /etc/workledger/secrets/backup_key \
     --env-file /etc/workledger/workledger.env
   ```

3. Revert to the previous application version and restart.

4. Verify restored state matches pre-upgrade baseline.

5. **Important:** All sessions created between backup and restore are lost. Invalidated sessions must re-authenticate.

### Option B: Rollback via migration revert (if supported)

Some migrations may support explicit revert. This is **not guaranteed** for all schema changes.

1. Stop application containers.
2. Check if the failed migration has a documented revert script.
3. Apply revert manually with PostgreSQL superuser access.
4. Update `drizzle.__drizzle_migrations` to remove the failed migration entry.
5. Revert application code to the previous version.
6. Restart and verify.

**Prefer Option A (restore) unless you have explicit confidence in manual schema revert.**

## Migration readiness and maintenance mode

The `/health` endpoint always returns a generic process health response. It does not expose migration state or dependency details to unauthenticated callers.

The application's internal readiness checks validate:
- Database connectivity
- Applied migration tags match the application's expected schema version
- No version skew between application and database

During an incompatible migration or version mismatch:
- Readiness fails
- Orchestrators should not route traffic to non-ready instances
- Application logs indicate schema version mismatch or pending migrations

This prevents serving traffic with an incompatible schema.

## Testing upgrade paths

The `WL-1005` integration test validates upgrade from a prior release fixture:

```sh
pnpm test:integration --grep "upgrade from prior release"
```

The test:
1. Creates a database schema at the `0.9.0` migration checkpoint
2. Seeds representative domain data
3. Applies migrations from `0.9.0` through current
4. Validates that no data corruption occurred
5. Re-runs integrity checks (ledger reconciliation, snapshot links, auth profile)
6. Confirms backward-compatible authentication and session behavior

This automated test does not replace manual production-shaped verification, but it catches schema-breaking changes and data-migration errors during development.

## Authentication and session compatibility

WorkLedger uses Better Auth for credential and session management. Schema changes to Better Auth tables (`user`, `account`, `session`, `verification`) require careful review:

- **Session cookie contract:** Changes to cookie name, domain, path, or security flags invalidate existing sessions.
- **Password hashing:** Changing the algorithm or cost factor does not invalidate existing verifiers; new hashes apply only to new/changed passwords.
- **CSRF token handling:** Changes to CSRF validation logic must not break in-flight requests.
- **Verification grants:** One-time reset/invitation URLs remain valid across compatible upgrades unless explicitly revoked.

**Post-upgrade auth verification:**
- Existing sessions remain valid (unless schema or cookie contract changed)
- Sign-in with existing credentials succeeds
- Password reset flow works
- Invitation URLs created pre-upgrade remain consumable (if not expired)

If a breaking auth change is required, release notes will document:
- Which sessions/grants must be invalidated
- Whether users must re-authenticate
- Any manual cleanup steps

## Dependency and library upgrades

Upgrading Node.js, PostgreSQL, or core dependencies follows the same pre-upgrade checklist:

- Review release notes and breaking changes
- Create encrypted backup
- Test in production-shaped staging environment
- Verify application and schema compatibility
- Document dependency version in upgrade evidence

**PostgreSQL major version upgrades:**
- Require explicit `pg_upgrade` or dump/restore procedure
- Test with WorkLedger's schema and constraints
- Verify UUIDv7, JSONB, and trigger behavior
- Re-run full integration and migration test suite

**Node.js LTS upgrades:**
- Verify Temporal polyfill, Better Auth, Drizzle, and Fastify compatibility
- Re-run full test suite and build verification
- Check for deprecated API warnings

**Better Auth or Drizzle upgrades:**
- Trigger ADR/security review if session, cookie, hashing, or migration behavior changes
- Review upstream changelogs for schema or contract changes
- Test authentication flows and concurrent session behavior

## Monitoring and failure recovery

After upgrade:
- Monitor application logs for unexpected errors, deprecation warnings, or schema mismatches
- Watch database query performance for migration-introduced index or constraint changes
- Verify that scheduled retention/cleanup jobs (if configured) continue working
- Check email delivery and notification behavior

If degraded behavior appears post-upgrade:
- Review logs and structured diagnostics (see `WL-1006` when available)
- Compare query plans and slow-query logs to pre-upgrade baseline
- If severity is high and forward-recovery is unclear, execute rollback procedure

## Future migration strategy

As WorkLedger approaches `1.0.0` and supports production multi-tenant or large-scale deployments:
- Migration procedures will include online/zero-downtime strategies where feasible
- Long-running data migrations will provide progress feedback
- Explicit compatibility windows will define supported upgrade paths (e.g., N-1 or N-2 versions)
- Canary or blue-green deployment patterns will be documented

These are not part of the MVP `0.x` series but are noted for future operational requirements.

## Related documentation

- [docs/06-security-operations.md](./06-security-operations.md) — Security, proxy, and release controls
- [docs/103-production-deployment.md](./103-production-deployment.md) — Docker Compose and Caddy reference deployment
- [docs/104-backup-and-clean-restore.md](./104-backup-and-clean-restore.md) — Encrypted backup and isolated restore procedures
- [packages/database/src/migrate-cli.ts](../packages/database/src/migrate-cli.ts) — Migration CLI source
- [packages/database/migrations/](../packages/database/migrations/) — Committed SQL migration files

