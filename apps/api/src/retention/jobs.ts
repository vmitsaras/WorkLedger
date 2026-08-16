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
import type { RetentionClass, RetentionClassConfig, RetentionJobResult } from '@workledger/contracts';
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
      const cutoffIso = cutoffDate.toISOString();

      switch (config.retentionClass) {
        case 'AUTH_TRANSIENT':
          recordsAffected = await purgeAuthTransient(database, cutoffIso);
          break;
        case 'OPERATIONAL_LOGS':
          // WorkLedger structured logs go to stdout/external aggregation; no DB table to purge.
          break;
        case 'NOTIFICATIONS':
          recordsAffected = await purgeNotifications(database, cutoffIso);
          break;
        case 'TECHNICAL_AUDIT':
          recordsAffected = await purgeTechnicalAudit(database, cutoffIso);
          break;
        case 'SENSITIVE_HR':
          recordsAffected = await minimizeSensitiveHR(database, cutoffIso, jobId);
          break;
        case 'DOMAIN_HISTORY':
          recordsAffected = await minimizeDomainHistory(database, cutoffIso, jobId);
          break;
        case 'ACCOUNT_SECURITY':
        case 'DATABASE_BACKUPS':
          // Configured but not automatically purged; enforced outside application layer.
          break;
      }
    }

    const durationMs = Date.now() - startTime;

    await database.transaction(async (tx) => {
      await tx.retention.recordJobExecution({
        id: jobId,
        retentionClass: config.retentionClass,
        behavior: config.behavior,
        executedAt: now.toISOString(),
        cutoffDate: cutoffDate?.toISOString() ?? null,
        recordsAffected,
        durationMs,
      });
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
      await tx.retention.recordJobExecution({
        id: jobId,
        retentionClass: config.retentionClass,
        behavior: config.behavior,
        executedAt: now.toISOString(),
        cutoffDate: cutoffDate?.toISOString() ?? null,
        recordsAffected: 0,
        durationMs,
        errorSummary: errorSummary.slice(0, 1000),
      });
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
 * Purge expired sessions, reset/invitation grants.
 */
async function purgeAuthTransient(database: WorkLedgerDatabase, cutoffIso: string): Promise<number> {
  let totalPurged = 0;

  await database.transaction(async (tx) => {
    totalPurged += await tx.retention.purgeExpiredSessions(cutoffIso);
    totalPurged += await tx.retention.purgeExpiredVerifications(cutoffIso);
  });

  return totalPurged;
}

/**
 * Purge old notification delivery attempts.
 */
async function purgeNotifications(database: WorkLedgerDatabase, cutoffIso: string): Promise<number> {
  return database.transaction((tx) => tx.retention.purgeOldNotificationDeliveries(cutoffIso));
}

/**
 * Purge old security audit events.
 */
async function purgeTechnicalAudit(database: WorkLedgerDatabase, cutoffIso: string): Promise<number> {
  return database.transaction((tx) => tx.retention.purgeOldSecurityAuditEvents(cutoffIso));
}

/**
 * Minimize sensitive HR decision reasons while preserving workflow and ledger integrity.
 *
 * Clears:
 * - Decision reasons on absence decisions
 * - Decision reasons on correction decisions
 *
 * NEVER removes: Request status, coverage dates, approval decisions, ledger entries, or audit facts.
 */
async function minimizeSensitiveHR(
  database: WorkLedgerDatabase,
  cutoffIso: string,
  jobExecutionId: string,
): Promise<number> {
  return database.transaction(async (tx) => {
    const totalMinimized = await tx.retention.minimizeDecisionReasons(cutoffIso);

    if (totalMinimized > 0) {
      await tx.retention.recordMinimizationFact({
        id: randomUUID(),
        retentionJobExecutionId: jobExecutionId,
        targetTable: 'absence_decisions,correction_decisions',
        recordsMinimized: totalMinimized,
        fieldsCleared: ['reason'],
        retentionClass: 'SENSITIVE_HR',
      });
    }

    return totalMinimized;
  });
}

/**
 * Minimize domain history personal identifiers while preserving referential integrity,
 * ledger equations, approved snapshots, and audit continuity.
 *
 * Replaces inactive employee display names with "Former Employee".
 * Foreign key UUIDs are never modified.
 *
 * NEVER removes: UUIDs, dates, amounts, statuses, ledger entries, snapshots, punches, or decisions.
 */
async function minimizeDomainHistory(
  database: WorkLedgerDatabase,
  cutoffIso: string,
  jobExecutionId: string,
): Promise<number> {
  return database.transaction(async (tx) => {
    const minimized = await tx.retention.minimizeInactiveEmployeeNames(cutoffIso);

    if (minimized > 0) {
      await tx.retention.recordMinimizationFact({
        id: randomUUID(),
        retentionJobExecutionId: jobExecutionId,
        targetTable: 'employees',
        recordsMinimized: minimized,
        fieldsCleared: ['display_name'],
        retentionClass: 'DOMAIN_HISTORY',
      });
    }

    return minimized;
  });
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
  return database.transaction((tx) => tx.retention.getJobStatus());
}
