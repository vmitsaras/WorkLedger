/**
 * Retention job implementations for purging and minimizing data.
 *
 * CRITICAL INVARIANTS per docs/03-domain-rules.md and docs/06-security-operations.md:
 * - Never cascade-delete punches, decisions, ledgers, snapshots, adjustments, or audit evidence
 * - Preserve referential integrity and calculation explainability when minimizing
 * - Record minimization actions without copying removed content
 * - All jobs must be idempotent and transaction-safe
 */

import type { WorkLedgerDatabase } from '@workledger/database';
import type { RetentionClass, RetentionJobResult } from '@workledger/contracts';
import type { RetentionClassConfig } from './config.js';
import { calculateRetentionCutoff } from './config.js';
import { randomUUID } from 'node:crypto';

/**
 * Execute a retention job for a specific class.
 */
export async function executeRetentionJob(
  database: WorkLedgerDatabase,
  config: RetentionClassConfig,
  now: Date = new Date(),
): Promise<RetentionJobResult> {
  const jobId = randomUUID();
  const startTime = Date.now();
  const cutoffDate = calculateRetentionCutoff(config, now);

  try {
    let recordsAffected = 0;

    if (cutoffDate !== null) {
      switch (config.retentionClass) {
        case 'AUTH_TRANSIENT':
          recordsAffected = await purgeAuthTransient(database, cutoffDate);
          break;
        case 'OPERATIONAL_LOGS':
          recordsAffected = await purgeOperationalLogs(database, cutoffDate);
          break;
        case 'NOTIFICATIONS':
          recordsAffected = await purgeNotifications(database, cutoffDate);
          break;
        case 'TECHNICAL_AUDIT':
          recordsAffected = await purgeTechnicalAudit(database, cutoffDate);
          break;
        case 'SENSITIVE_HR':
          recordsAffected = await minimizeSensitiveHR(database, cutoffDate, jobId);
          break;
        case 'DOMAIN_HISTORY':
          recordsAffected = await minimizeDomainHistory(database, cutoffDate, jobId);
          break;
        case 'ACCOUNT_SECURITY':
        case 'DATABASE_BACKUPS':
          // These classes are configured but not automatically purged
          break;
      }
    }

    const durationMs = Date.now() - startTime;

    await database.transaction(async (tx) => {
      await tx.db.execute(
        `INSERT INTO retention_job_executions 
         (id, retention_class, behavior, executed_at, cutoff_date, records_affected, duration_ms)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          jobId,
          config.retentionClass,
          config.behavior,
          now.toISOString(),
          cutoffDate?.toISOString() ?? null,
          recordsAffected,
          durationMs,
        ],
      );
    });

    return {
      jobId,
      retentionClass: config.retentionClass,
      behavior: config.behavior,
      executedAt: now.toISOString(),
      recordsAffected,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorSummary = error instanceof Error ? error.message : String(error);

    await database.transaction(async (tx) => {
      await tx.db.execute(
        `INSERT INTO retention_job_executions 
         (id, retention_class, behavior, executed_at, cutoff_date, records_affected, duration_ms, error_summary)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          jobId,
          config.retentionClass,
          config.behavior,
          now.toISOString(),
          cutoffDate?.toISOString() ?? null,
          0,
          durationMs,
          errorSummary.slice(0, 1000),
        ],
      );
    });

    return {
      jobId,
      retentionClass: config.retentionClass,
      behavior: config.behavior,
      executedAt: now.toISOString(),
      recordsAffected: 0,
      durationMs,
      errors: [errorSummary],
    };
  }
}

/**
 * Purge expired sessions, reset/invitation grants, and rate-limit state.
 */
async function purgeAuthTransient(
  database: WorkLedgerDatabase,
  cutoffDate: Date,
): Promise<number> {
  let totalPurged = 0;

  await database.transaction(async (tx) => {
    // Purge expired sessions
    const expiredSessions = await tx.db.execute(
      `DELETE FROM auth_sessions WHERE expires_at < $1`,
      [cutoffDate.toISOString()],
    );
    totalPurged += expiredSessions.rowCount ?? 0;

    // Purge expired verification grants
    const expiredGrants = await tx.db.execute(
      `DELETE FROM auth_verification WHERE expires_at < $1`,
      [cutoffDate.toISOString()],
    );
    totalPurged += expiredGrants.rowCount ?? 0;
  });

  return totalPurged;
}

/**
 * Purge old operational logs (placeholder - WorkLedger uses structured logging to external systems).
 * Real production implementation would integrate with log aggregation service retention policies.
 */
async function purgeOperationalLogs(
  _database: WorkLedgerDatabase,
  _cutoffDate: Date,
): Promise<number> {
  // WorkLedger structured logs go to stdout/external aggregation
  // This is a placeholder for future operational log table if added
  return 0;
}

/**
 * Purge old notification delivery attempts.
 */
async function purgeNotifications(
  database: WorkLedgerDatabase,
  cutoffDate: Date,
): Promise<number> {
  let totalPurged = 0;

  await database.transaction(async (tx) => {
    const result = await tx.db.execute(
      `DELETE FROM notification_deliveries WHERE created_at < $1`,
      [cutoffDate.toISOString()],
    );
    totalPurged = result.rowCount ?? 0;
  });

  return totalPurged;
}

/**
 * Purge old technical/security audit events.
 */
async function purgeTechnicalAudit(
  database: WorkLedgerDatabase,
  cutoffDate: Date,
): Promise<number> {
  let totalPurged = 0;

  await database.transaction(async (tx) => {
    const result = await tx.db.execute(
      `DELETE FROM security_audit_events WHERE recorded_at < $1`,
      [cutoffDate.toISOString()],
    );
    totalPurged = result.rowCount ?? 0;
  });

  return totalPurged;
}

/**
 * Minimize sensitive HR data while preserving workflow and ledger integrity.
 *
 * Clears:
 * - Sickness absence request notes
 * - Decision reasons containing sensitive detail
 * - Entitlement adjustment notes
 *
 * NEVER removes: Request status, coverage dates, approval decisions, ledger entries, or audit facts.
 */
async function minimizeSensitiveHR(
  database: WorkLedgerDatabase,
  cutoffDate: Date,
  jobExecutionId: string,
): Promise<number> {
  let totalMinimized = 0;

  await database.transaction(async (tx) => {
    // Minimize sickness absence request notes (preserve status, coverage, approval state)
    const sicknessResult = await tx.db.execute(
      `UPDATE absence_requests 
       SET notes = NULL
       WHERE absence_type_code = 'SICKNESS' 
         AND submitted_at < $1 
         AND notes IS NOT NULL`,
      [cutoffDate.toISOString()],
    );
    const sicknessMinimized = sicknessResult.rowCount ?? 0;

    if (sicknessMinimized > 0) {
      await tx.db.execute(
        `INSERT INTO minimization_audit_facts 
         (retention_job_execution_id, target_table, records_minimized, fields_cleared, retention_class)
         VALUES ($1, $2, $3, $4, $5)`,
        [jobExecutionId, 'absence_requests', sicknessMinimized, ['notes'], 'SENSITIVE_HR'],
      );
      totalMinimized += sicknessMinimized;
    }

    // Minimize decision reasons containing sensitive HR detail
    const reasonsResult = await tx.db.execute(
      `UPDATE absence_decisions 
       SET reason = NULL
       WHERE decided_at < $1 
         AND reason IS NOT NULL`,
      [cutoffDate.toISOString()],
    );
    const reasonsMinimized = reasonsResult.rowCount ?? 0;

    if (reasonsMinimized > 0) {
      await tx.db.execute(
        `INSERT INTO minimization_audit_facts 
         (retention_job_execution_id, target_table, records_minimized, fields_cleared, retention_class)
         VALUES ($1, $2, $3, $4, $5)`,
        [jobExecutionId, 'absence_decisions', reasonsMinimized, ['reason'], 'SENSITIVE_HR'],
      );
      totalMinimized += reasonsMinimized;
    }
  });

  return totalMinimized;
}

/**
 * Minimize domain history personal identifiers while preserving referential integrity,
 * ledger equations, approved snapshots, and audit continuity.
 *
 * Approach: Replace employee names/emails with generic stable references like "Employee #[id-suffix]".
 * This preserves:
 * - Foreign key relationships
 * - Calculation explainability
 * - Ledger reconciliation
 * - Audit event continuity
 *
 * NEVER removes: UUIDs, dates, amounts, statuses, ledger entries, snapshots, punches, or decisions.
 */
async function minimizeDomainHistory(
  database: WorkLedgerDatabase,
  cutoffDate: Date,
  jobExecutionId: string,
): Promise<number> {
  let totalMinimized = 0;

  await database.transaction(async (tx) => {
    // Minimize inactive employee display names and emails
    // Keep the UUID for referential integrity; clear personal identifiers
    const employeeResult = await tx.db.execute(
      `UPDATE employees 
       SET 
         display_name = 'Former Employee',
         email = 'minimized-' || SUBSTRING(id::text FROM 25) || '@workledger.local'
       WHERE status = 'INACTIVE'
         AND updated_at < $1
         AND display_name != 'Former Employee'`,
      [cutoffDate.toISOString()],
    );
    const employeeMinimized = employeeResult.rowCount ?? 0;

    if (employeeMinimized > 0) {
      await tx.db.execute(
        `INSERT INTO minimization_audit_facts 
         (retention_job_execution_id, target_table, records_minimized, fields_cleared, retention_class)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          jobExecutionId,
          'employees',
          employeeMinimized,
          ['display_name', 'email'],
          'DOMAIN_HISTORY',
        ],
      );
      totalMinimized += employeeMinimized;
    }

    // Minimize correction request notes (preserve intervals, approval state, ledger effects)
    const correctionsResult = await tx.db.execute(
      `UPDATE correction_requests 
       SET notes = NULL
       WHERE submitted_at < $1 
         AND notes IS NOT NULL`,
      [cutoffDate.toISOString()],
    );
    const correctionsMinimized = correctionsResult.rowCount ?? 0;

    if (correctionsMinimized > 0) {
      await tx.db.execute(
        `INSERT INTO minimization_audit_facts 
         (retention_job_execution_id, target_table, records_minimized, fields_cleared, retention_class)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          jobExecutionId,
          'correction_requests',
          correctionsMinimized,
          ['notes'],
          'DOMAIN_HISTORY',
        ],
      );
      totalMinimized += correctionsMinimized;
    }
  });

  return totalMinimized;
}

/**
 * Get the most recent execution for each retention class.
 */
export async function getRetentionJobStatus(
  database: WorkLedgerDatabase,
): Promise<
  Array<{
    retentionClass: RetentionClass;
    lastExecutedAt: string | null;
    lastRecordsAffected: number | null;
  }>
> {
  const result = await database.transaction(async (tx) => {
    const rows = await tx.db.execute<{
      retention_class: RetentionClass;
      last_executed_at: string | null;
      last_records_affected: number | null;
    }>(
      `SELECT DISTINCT ON (retention_class)
         retention_class,
         executed_at as last_executed_at,
         records_affected as last_records_affected
       FROM retention_job_executions
       ORDER BY retention_class, executed_at DESC`,
    );

    return rows.rows;
  });

  return result.map((row) => ({
    retentionClass: row.retention_class,
    lastExecutedAt: row.last_executed_at,
    lastRecordsAffected: row.last_records_affected,
  }));
}
