import { z } from 'zod';

import { createSuccessEnvelopeSchema } from './api.js';
import { calculationBlockerCodeSchema, calculationWarningCodeSchema } from './today.js';

export const MONTHLY_PERIOD_STATUSES = [
  'OPEN',
  'SUBMITTED',
  'CHANGES_REQUESTED',
  'APPROVED',
  'LOCKED',
] as const;
export const MONTHLY_READINESS_STATUSES = ['INCOMPLETE', 'READY_FOR_SUBMISSION'] as const;
export const MONTHLY_DAILY_STATUSES = ['MISSING', 'PROVISIONAL', 'INCOMPLETE', 'COMPLETE'] as const;

const dateSchema = z.iso.date();
const instantSchema = z.iso.datetime({ offset: true });
const minuteSchema = z.number().int().safe().min(0);
const signedMinuteSchema = z.number().int().safe();
const identifierSchema = z.string().min(1).max(128);
const fingerprintSchema = z.string().regex(/^[0-9a-f]{64}$/u);

export const monthlyPeriodWorkflowSchema = z.strictObject({
  approvedAt: instantSchema.nullable(),
  lockedAt: instantSchema.nullable(),
  periodVersion: z.number().int().positive(),
  status: z.enum(MONTHLY_PERIOD_STATUSES),
  submittedAt: instantSchema.nullable(),
});

export const monthlyPeriodReadinessSchema = z.strictObject({
  completeDateCount: z.number().int().min(0).max(31),
  coveredDateCount: z.number().int().min(0).max(31),
  monthEnded: z.boolean(),
  status: z.enum(MONTHLY_READINESS_STATUSES).nullable(),
});

export const monthlyPeriodBlockerSchema = z.strictObject({
  code: calculationBlockerCodeSchema,
  localDate: dateSchema.nullable(),
  recordId: identifierSchema.nullable(),
});

export const monthlyPeriodWarningSchema = z.strictObject({
  code: calculationWarningCodeSchema,
  localDate: dateSchema,
  recordId: identifierSchema,
});

export const monthlyPeriodAttentionSchema = z.strictObject({
  blockers: z.array(monthlyPeriodBlockerSchema).max(128),
  warnings: z.array(monthlyPeriodWarningSchema).max(155),
});

export const monthlyPeriodRowSchema = z.strictObject({
  absenceCreditMinutes: minuteSchema.nullable(),
  adjustmentMinutes: signedMinuteSchema.nullable(),
  balanceMinutes: signedMinuteSchema.nullable(),
  breakMinutes: minuteSchema.nullable(),
  creditedMinutes: minuteSchema.nullable(),
  expectedMinutes: minuteSchema.nullable(),
  localDate: dateSchema,
  recordId: identifierSchema.nullable(),
  status: z.enum(MONTHLY_DAILY_STATUSES),
  workedMinutes: minuteSchema.nullable(),
});

export const monthlyPeriodTotalsSchema = z.strictObject({
  absenceCreditMinutes: minuteSchema,
  adjustmentMinutes: signedMinuteSchema,
  balanceMinutes: signedMinuteSchema,
  breakMinutes: minuteSchema,
  creditedMinutes: minuteSchema,
  expectedMinutes: minuteSchema,
  ledgerClosingBalanceMinutes: signedMinuteSchema,
  ledgerOpeningBalanceMinutes: signedMinuteSchema,
  ledgerPeriodDeltaMinutes: signedMinuteSchema,
  workedMinutes: minuteSchema,
});

export const monthlyPeriodSnapshotVersionSchema = z.strictObject({
  schemaVersion: z.literal(1),
  sourceFingerprint: fingerprintSchema,
});

export const monthlyPeriodSchema = z.strictObject({
  attention: monthlyPeriodAttentionSchema,
  employeeDisplayName: z.string().min(1).max(160),
  id: identifierSchema,
  monthEnd: dateSchema,
  monthStart: dateSchema,
  readiness: monthlyPeriodReadinessSchema,
  rows: z.array(monthlyPeriodRowSchema).max(31),
  snapshotVersion: monthlyPeriodSnapshotVersionSchema,
  timeZone: z.string().min(1).max(255),
  totals: monthlyPeriodTotalsSchema,
  workflow: monthlyPeriodWorkflowSchema,
});

export const monthlyPeriodEnvelopeSchema = createSuccessEnvelopeSchema(monthlyPeriodSchema);

export type MonthlyPeriod = z.infer<typeof monthlyPeriodSchema>;
export type MonthlyPeriodAttention = z.infer<typeof monthlyPeriodAttentionSchema>;
export type MonthlyPeriodRow = z.infer<typeof monthlyPeriodRowSchema>;
export type MonthlyPeriodStatus = z.infer<typeof monthlyPeriodWorkflowSchema>['status'];
export type MonthlyReadinessStatus = z.infer<typeof monthlyPeriodReadinessSchema>['status'];
