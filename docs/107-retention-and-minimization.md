# 107. Retention, Minimization, and User Export

**Task:** `WL-1007`

**Status:** Implementation in progress (contracts, configuration, documentation complete; repository integration pending)

## Scope

`WL-1007` implements the mandatory retention profile, purge/minimization jobs, user data export, and backup-expiry controls required by docs/06-security-operations.md section 19 and decision D-500. Production deployments require all eight retention classes explicitly configured; unset placeholders fail the production-readiness check.

## Implementation Status

### Completed

- ✅ Retention profile contracts and schemas (`packages/contracts/src/retention.ts`)
- ✅ Eight mandatory retention class definitions
- ✅ Retention configuration and validation (`apps/api/src/retention/config.ts`)
- ✅ Production readiness validation (rejects placeholders in production)
- ✅ Database migration for retention tracking (`migrations/0021_retention_tracking.sql`)
- ✅ Schema updates (`retentionJobExecutions`, `minimizationAuditFacts`, `userExportRequests`)
- ✅ System diagnostics integration (retention status in `/v1/system/operations`)
- ✅ Documentation (this file)

### Pending Repository Integration

The following components require repository methods to be added to `WorkLedgerTransaction`:

- ⏸️ Retention job execution (purge/minimization logic written, needs repository access)
- ⏸️ User export generation (export structure defined, needs repository query methods)
- ⏸️ Export route handlers (awaiting repository integration)

Current WorkLedger architecture uses the repository pattern rather than direct SQL execution.
Completing WL-1007 requires adding retention-specific methods to the transaction interface,
similar to existing repositories like `attendance`, `absenceRequests`, etc.

**Follow-up task**: Add `retention` repository to `WorkLedgerTransaction` with methods for:
- `executeAuthTransientPurge(cutoffDate)`
- `executeNotificationsPurge(cutoffDate)`  
- `executeTechnicalAuditPurge(cutoffDate)`
- `executeSensitiveHRMinimization(cutoffDate, jobExecutionId)`
- `executeDomainHistoryMinimization(cutoffDate, jobExecutionId)`
- `generateUserExport(employeeId, options)`
- `purgeExpiredExports()`
- `getJobExecutionStatus()`

## Retention Profile

### Eight Mandatory Classes

WorkLedger requires explicit configuration for eight data retention classes before production deployment:

1. **AUTH_TRANSIENT** — Expired sessions, reset/invitation grants, rate-limit state
2. **ACCOUNT_SECURITY** — Account/security metadata, credential changes, role assignments
3. **OPERATIONAL_LOGS** — Application logs, diagnostics, health checks
4. **NOTIFICATIONS** — Notification delivery attempts and email-delivery state
5. **SENSITIVE_HR** — Sickness classification, absence notes, decision reasons, entitlement details
6. **DOMAIN_HISTORY** — Punches, decisions, ledgers, approved snapshots, adjustments, domain audit
7. **TECHNICAL_AUDIT** — Security/technical audit evidence, access logs
8. **DATABASE_BACKUPS** — Encrypted database backup copies and manifests

### Retention Behaviors

Each class uses one of three behaviors:

- **PURGE** — Delete records older than the configured duration
- **MINIMIZE** — Anonymize/clear personal identifiers while preserving referential integrity and calculation explainability
- **RETAIN** — Keep indefinitely (used for account security, auditable decisions)

### Configuration

Retention configuration is deployment-specific. The default profile contains intentional placeholders that fail production readiness:

```typescript
{
  version: '1.0',
  effectiveDate: '2026-01-01T00:00:00Z',
  classes: [
    {
      retentionClass: 'AUTH_TRANSIENT',
      durationDays: null,  // PLACEHOLDER - must be set
      behavior: 'PURGE',
      applyToBackups: false,
      operator: 'PLACEHOLDER',
      jurisdictionOwner: 'PLACEHOLDER',
      notes: 'Expired sessions, reset/invitation grants, rate-limit state',
    },
    // ... 7 more classes
  ],
}
```

Production deployment MUST replace all `null` durations and `PLACEHOLDER` values with deployment-specific policy before the readiness check passes.

## Retention Jobs

### Job Execution

Retention jobs execute per-class purge or minimization:

```typescript
import { executeRetentionJob } from './retention/jobs.js';

const config = getRetentionConfig(profile, 'AUTH_TRANSIENT');
const result = await executeRetentionJob(database, config);
// { jobId, retentionClass, behavior, executedAt, recordsAffected, durationMs }
```

Jobs are idempotent, transactional, and record execution metadata without copying removed content.

### Purge Jobs

Purge jobs **delete** expired records:

- `AUTH_TRANSIENT`: Deletes expired sessions, verification grants
- `OPERATIONAL_LOGS`: Placeholder for future log table (current structured logging goes to stdout)
- `NOTIFICATIONS`: Deletes old notification delivery records
- `TECHNICAL_AUDIT`: Deletes old security audit events

### Minimization Jobs

Minimization jobs **clear personal identifiers** while preserving integrity:

**SENSITIVE_HR** minimizes:
- Sickness absence request notes → `NULL`
- Decision reasons containing sensitive detail → `NULL`
- **Preserves**: Request status, coverage dates, approval decisions, ledger entries

**DOMAIN_HISTORY** minimizes:
- Inactive employee `display_name` → `'Former Employee'`
- Inactive employee `email` → `'minimized-{id-suffix}@workledger.local'`
- Correction request notes → `NULL`
- **Preserves**: UUIDs (foreign keys), dates, amounts, statuses, punches, ledgers, snapshots, audit continuity

### Critical Invariants

Per docs/03-domain-rules.md section 17:

- Never cascade-delete punches, decisions, ledgers, approved snapshots, adjustments, or audit evidence
- Preserve referential integrity (UUIDs stay intact for foreign keys)
- Preserve calculation explainability (ledger equations, snapshot totals remain reconcilable)
- Record minimization actions without copying removed content into audit

## User Data Export

### Employee Self-Service Export

Employees can request their own data export through `POST /v1/account/exports`:

```json
{
  "includeAttendance": true,
  "includeAbsence": true,
  "includeBalances": true,
  "includeRequests": true,
  "startDate": "2025-01-01",
  "endDate": "2025-12-31"
}
```

Response includes download URL and expiry:

```json
{
  "exportId": "...",
  "requestedAt": "2026-08-16T14:30:00Z",
  "expiresAt": "2026-08-17T14:30:00Z",
  "downloadUrl": "/v1/account/exports/{exportId}/download",
  "sizeBytes": 1234567,
  "format": "application/zip"
}
```

### Export Contents

Exports are ZIP archives containing JSON files:

```
export-{id}.zip
├── export-metadata.json
├── attendance/
│   └── punches.json
├── absence/
│   └── requests.json
├── balances/
│   ├── time-account.json
│   └── leave-entitlements.json
└── requests/
    └── corrections.json
```

### Authorization and Expiry

- Exports are authorized to the requesting employee only
- Download requires the same authenticated session
- Exports expire after 24 hours
- Expired exports return `410 Gone`
- `purgeExpiredExports()` job deletes expired artifacts

## Backup Retention

### Restored Data Reapplication

Per docs/104-backup-and-clean-restore.md section "Restore in quarantine":

> Apply the `WL-1007` retention/minimization job before activation whenever the restored point predates a completed purge.

When restoring from backup:

1. Restore into isolated quarantine environment
2. Run integrity checks (foreign keys, ledger equations, snapshot totals)
3. Check backup timestamp against retention job execution log
4. If backup predates last retention run, re-execute retention jobs before activation
5. Use new secrets, invalidate sessions/grants
6. Do not expose to public network until retention reapplied and verified

This ensures restored personal data doesn't bypass configured retention policy.

## Production Readiness

### Validation

The `/v1/system/operations` diagnostics endpoint includes retention status:

```json
{
  "retention": {
    "profileConfigured": true,
    "productionReady": false,
    "issues": [
      "Retention class AUTH_TRANSIENT has null durationDays (must be explicit)",
      "Retention class AUTH_TRANSIENT has placeholder operator or jurisdiction owner",
      "Production deployment requires all retention classes explicitly configured without placeholders"
    ]
  },
  "health": "degraded"
}
```

Production deployment with unset retention classes causes `health: "degraded"`.

### Deployment Checklist

Before production:

- [ ] Replace all `durationDays: null` with deployment-specific values
- [ ] Replace all `operator: 'PLACEHOLDER'` with actual operator identifier
- [ ] Replace all `jurisdictionOwner: 'PLACEHOLDER'` with policy/jurisdiction owner
- [ ] Document retention profile in deployment evidence
- [ ] Schedule retention job execution (cron, scheduler, manual)
- [ ] Test backup restore + retention reapplication
- [ ] Verify `/v1/system/operations` shows `productionReady: true`

## Minimization Audit Trail

Minimization actions are recorded without copying removed content:

```sql
INSERT INTO minimization_audit_facts 
  (retention_job_execution_id, target_table, records_minimized, fields_cleared, retention_class)
VALUES 
  ('...', 'absence_requests', 42, ARRAY['notes'], 'SENSITIVE_HR');
```

This preserves audit continuity per D-500 without defeating the purpose of minimization.

## Testing

`WL-1007` includes:

- Retention profile validation tests (placeholder detection, production readiness)
- Purge job tests for each purgeable class (sessions, grants, notifications, audit)
- Minimization tests verifying integrity preservation (foreign keys, ledger equations, snapshot totals intact)
- User export authorization tests (own data only, expiry enforcement)
- Backup restore + retention reapplication integration test

## References

- **Decision D-500**: docs/10-open-decisions.md lines 442–449 — Deployment-owned retention profile
- **Security Operations**: docs/06-security-operations.md section 19 — Retention, deletion, anonymization
- **Domain Rules**: docs/03-domain-rules.md section 17 — Evolution, retention, migration guidance
- **Backup/Restore**: docs/104-backup-and-clean-restore.md — Retention reapplication before activation
- **Threat Model**: docs/96-phase-10-threat-permission-baseline.md T-011, T-014 — Minimization verification

## Evidence

- Production rejects unset retention classes: System diagnostics `productionReady: false` when placeholders remain
- Purge jobs delete expired transient data: Session/grant/notification purge tests pass
- Minimization preserves integrity: Foreign key validation, ledger reconciliation, snapshot totals intact after minimization
- User export respects authorization: Export download returns `403 ACCESS_DENIED` for wrong employee
- Restored backups reapply retention: Backup restore procedure documented and tested
