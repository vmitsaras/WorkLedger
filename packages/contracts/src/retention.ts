/**
 * Retention, minimization, and user export contracts.
 *
 * Implements the deployment-owned retention profile and user-controlled data export
 * required by docs/06-security-operations.md section 19.
 */

import { z } from 'zod';

/**
 * Eight mandatory retention classes per docs/06-security-operations.md.
 */
export const retentionClassSchema = z.enum([
  'AUTH_TRANSIENT',
  'ACCOUNT_SECURITY',
  'OPERATIONAL_LOGS',
  'NOTIFICATIONS',
  'SENSITIVE_HR',
  'DOMAIN_HISTORY',
  'TECHNICAL_AUDIT',
  'DATABASE_BACKUPS',
]);

export type RetentionClass = z.infer<typeof retentionClassSchema>;

export const retentionBehaviorSchema = z.enum(['PURGE', 'MINIMIZE', 'RETAIN']);

export type RetentionBehavior = z.infer<typeof retentionBehaviorSchema>;

/**
 * Retention class configuration.
 * Production deployment requires all eight classes explicitly configured.
 */
export const retentionClassConfigSchema = z.object({
  retentionClass: retentionClassSchema,
  durationDays: z.number().int().min(0).nullable(),
  behavior: retentionBehaviorSchema,
  applyToBackups: z.boolean(),
  operator: z.string().min(1).max(200),
  jurisdictionOwner: z.string().min(1).max(500),
  notes: z.string().max(2000).optional(),
});

export type RetentionClassConfig = z.infer<typeof retentionClassConfigSchema>;

/**
 * Complete retention profile for a deployment.
 */
export const retentionProfileSchema = z.object({
  version: z.literal('1.0'),
  effectiveDate: z.string().datetime(),
  classes: z.array(retentionClassConfigSchema).length(8),
});

export type RetentionProfile = z.infer<typeof retentionProfileSchema>;

/**
 * Retention job execution result.
 */
export const retentionJobResultSchema = z.object({
  jobId: z.string().uuid(),
  retentionClass: retentionClassSchema,
  behavior: retentionBehaviorSchema,
  executedAt: z.string().datetime(),
  recordsAffected: z.number().int().min(0),
  durationMs: z.number().int().min(0),
  errors: z.array(z.string()).optional(),
});

export type RetentionJobResult = z.infer<typeof retentionJobResultSchema>;

/**
 * User data export request.
 */
export const userExportRequestSchema = z.object({
  includeAttendance: z.boolean().default(true),
  includeAbsence: z.boolean().default(true),
  includeBalances: z.boolean().default(true),
  includeRequests: z.boolean().default(true),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
});

export type UserExportRequest = z.infer<typeof userExportRequestSchema>;

/**
 * User data export metadata response.
 */
export const userExportMetadataResponseSchema = z.object({
  exportId: z.string().uuid(),
  requestedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  downloadUrl: z.string().url(),
  sizeBytes: z.number().int().min(0),
  format: z.literal('application/zip'),
});

export type UserExportMetadataResponse = z.infer<typeof userExportMetadataResponseSchema>;

/**
 * Retention status for system diagnostics.
 */
export const retentionStatusResponseSchema = z.object({
  profileConfigured: z.boolean(),
  allClassesSet: z.boolean(),
  lastJobExecutions: z.array(
    z.object({
      retentionClass: retentionClassSchema,
      lastExecutedAt: z.string().datetime().nullable(),
      lastRecordsAffected: z.number().int().min(0).nullable(),
    }),
  ),
  productionReady: z.boolean(),
});

export type RetentionStatusResponse = z.infer<typeof retentionStatusResponseSchema>;

/**
 * Minimization summary for audit (no removed content).
 */
export const minimizationAuditFactSchema = z.object({
  targetTable: z.string().min(1).max(100),
  recordsMinimized: z.number().int().min(0),
  fieldsCleared: z.array(z.string().min(1).max(100)),
  executedAt: z.string().datetime(),
  retentionClass: retentionClassSchema,
});

export type MinimizationAuditFact = z.infer<typeof minimizationAuditFactSchema>;
