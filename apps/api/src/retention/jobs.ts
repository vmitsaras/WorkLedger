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
import type {
  RetentionClass,
  RetentionClassConfig,
  RetentionJobResult,
} from '@workledger/contracts';
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
    return await database.transaction(async (tx) => {
      let recordsAffected = 0;
      if (cutoffDate !== null) {
        const cutoffIso = cutoffDate.toISOString();
        switch (config.retentionClass) {
          case 'AUTH_TRANSIENT':
            recordsAffected = await tx.retention.purgeExpiredSessions(cutoffIso);
            recordsAffected += await tx.retention.purgeExpiredVerifications(cutoffIso);
            break;
          case 'NOTIFICATIONS':
            recordsAffected = await tx.retention.purgeOldNotificationDeliveries(cutoffIso);
            break;
          case 'TECHNICAL_AUDIT':
            recordsAffected = await tx.retention.purgeOldSecurityAuditEvents(cutoffIso);
            break;
          case 'SENSITIVE_HR':
            recordsAffected = await tx.retention.minimizeDecisionReasons(cutoffIso);
            break;
          case 'DOMAIN_HISTORY':
            recordsAffected = await tx.retention.minimizeInactiveEmployeeNames(cutoffIso);
            break;
          case 'OPERATIONAL_LOGS':
          case 'ACCOUNT_SECURITY':
          case 'DATABASE_BACKUPS':
            // These classes remain operator-managed outside database jobs.
            break;
        }
      }
      const durationMs = Date.now() - startTime;
      // The parent must exist before its audit fact. Data, execution and audit commit together.
      await tx.retention.recordJobExecution({
        id: jobId,
        retentionClass: config.retentionClass,
        behavior: config.behavior,
        executedAt: now.toISOString(),
        cutoffDate: cutoffDate?.toISOString() ?? null,
        recordsAffected,
        durationMs,
      });
      if (
        recordsAffected > 0 &&
        (config.retentionClass === 'DOMAIN_HISTORY' || config.retentionClass === 'SENSITIVE_HR')
      ) {
        const domainHistory = config.retentionClass === 'DOMAIN_HISTORY';
        await tx.retention.recordMinimizationFact({
          id: randomUUID(),
          retentionJobExecutionId: jobId,
          targetTable: domainHistory ? 'employees' : 'absence_decisions,correction_decisions',
          recordsMinimized: recordsAffected,
          fieldsCleared: domainHistory ? ['display_name'] : ['reason'],
          retentionClass: config.retentionClass,
        });
      }
      return {
        jobId,
        retentionClass: config.retentionClass,
        behavior: config.behavior,
        executedAt: now.toISOString(),
        recordsAffected,
        durationMs,
      };
    });
  } catch {
    const durationMs = Date.now() - startTime;
    // Database error text can contain removed HR content; retain a content-free failure only.
    const errorSummary = 'RETENTION_JOB_FAILED';
    await database.transaction(async (tx) => {
      await tx.retention.recordJobExecution({
        id: jobId,
        retentionClass: config.retentionClass,
        behavior: config.behavior,
        executedAt: now.toISOString(),
        cutoffDate: cutoffDate?.toISOString() ?? null,
        recordsAffected: 0,
        durationMs,
        errorSummary,
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
 * Get the most recent execution for each retention class.
 */
export async function getRetentionJobStatus(database: WorkLedgerDatabase): Promise<
  Array<{
    retentionClass: RetentionClass;
    lastExecutedAt: string | null;
    lastRecordsAffected: number | null;
  }>
> {
  return database.transaction((tx) => tx.retention.getJobStatus());
}
