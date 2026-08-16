/**
 * System operations contracts.
 *
 * These DTOs provide technical diagnostics and operations status for system administrators.
 * They contain NO domain/HR data, employee counts, sickness information, or personal data.
 *
 * See docs/02-roles-permissions.md and docs/06-security-operations.md section 16.
 */

import { z } from 'zod';

/**
 * Detailed diagnostic status response.
 * Authorized to system administrators and host operators only.
 * Never exposed to employees or HR administrators.
 */
export const systemDiagnosticsResponseSchema = z.strictObject({
  service: z.string(),
  version: z.string(),
  environment: z.string(),
  timestamp: z.string().datetime(),
  dependencies: z.strictObject({
    database: z.strictObject({
      status: z.enum(['healthy', 'degraded', 'unavailable']),
      latencyMs: z.number().int().min(0).optional(),
      error: z.string().optional(),
    }),
    authentication: z.strictObject({
      status: z.enum(['healthy', 'degraded', 'unavailable']),
      error: z.string().optional(),
    }),
  }),
  retention: z
    .strictObject({
      profileConfigured: z.boolean(),
      productionReady: z.boolean(),
      issues: z.array(z.string()).optional(),
    })
    .optional(),
  health: z.enum(['healthy', 'degraded', 'critical']),
});

export type SystemDiagnosticsResponse = z.infer<typeof systemDiagnosticsResponseSchema>;

/**
 * Safe dependency status for readiness checks.
 * Contains only status, no error details or latency.
 */
export const readinessStatusResponseSchema = z.strictObject({
  status: z.enum(['ready', 'not_ready']),
  details: z
    .strictObject({
      database: z.enum(['ready', 'not_ready']),
      migrations: z.enum(['ready', 'not_ready']),
    })
    .optional(),
});

export type ReadinessStatusResponse = z.infer<typeof readinessStatusResponseSchema>;
