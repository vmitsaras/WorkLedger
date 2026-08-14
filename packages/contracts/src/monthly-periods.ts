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
export const MONTHLY_PERIOD_ACTIONS = ['SUBMIT', 'REQUEST_CHANGES', 'APPROVE', 'LOCK'] as const;
export const MONTHLY_PERIOD_REVIEW_ACTIONS = ['REQUEST_CHANGES', 'APPROVE'] as const;

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

export const monthlyPeriodReviewHistoryItemSchema = z.strictObject({
  action: z.enum(['REQUEST_CHANGES', 'APPROVE', 'LOCK']),
  actorAuthority: z.enum(['CURRENT_MANAGER', 'ORGANIZATION_HR']),
  decidedAt: instantSchema,
  reason: z.string().min(10).max(2_000).nullable(),
  resultingStatus: z.enum(['CHANGES_REQUESTED', 'APPROVED', 'LOCKED']),
  version: z.number().int().positive(),
});

export const monthlyPeriodApprovedRecordSchema = z.strictObject({
  approvalCycle: z.number().int().positive(),
  approvedAt: instantSchema,
  calculationEngineVersion: z.string().min(1).max(64),
  periodVersion: z.number().int().positive(),
  rows: z.array(monthlyPeriodRowSchema).max(31),
  schemaVersion: z.literal(1),
  snapshotFingerprint: fingerprintSchema,
  sourceFingerprint: fingerprintSchema,
  totals: monthlyPeriodTotalsSchema,
});

export const monthlyPostLockAdjustmentSchema = z.strictObject({
  adjustmentVersion: z.number().int().positive(),
  createdAt: instantSchema,
  id: identifierSchema,
  localDate: dateSchema,
  minutes: signedMinuteSchema,
  proposedWorkedMinutes: minuteSchema,
  previousAdjustedWorkedMinutes: minuteSchema,
  reversesAdjustmentId: identifierSchema.nullable(),
  sourceRequestId: identifierSchema,
});

export const monthlyPostLockViewSchema = z.strictObject({
  adjustedClosingBalanceMinutes: signedMinuteSchema,
  adjustments: z.array(monthlyPostLockAdjustmentSchema).max(256),
  cumulativeDeltaMinutes: signedMinuteSchema,
  currentViewVersion: z.number().int().min(0),
  originalClosingBalanceMinutes: signedMinuteSchema,
  status: z.enum(['LOCKED_BASELINE', 'ADJUSTED_AFTER_LOCK']),
});

export const monthlyPeriodSchema = z.strictObject({
  approvedRecord: monthlyPeriodApprovedRecordSchema.nullable(),
  availableActions: z.array(z.enum(MONTHLY_PERIOD_ACTIONS)).max(3),
  attention: monthlyPeriodAttentionSchema,
  employeeDisplayName: z.string().min(1).max(160),
  id: identifierSchema,
  monthEnd: dateSchema,
  monthStart: dateSchema,
  postLockView: monthlyPostLockViewSchema.nullable(),
  readiness: monthlyPeriodReadinessSchema,
  reviewHistory: z.array(monthlyPeriodReviewHistoryItemSchema).max(64),
  rows: z.array(monthlyPeriodRowSchema).max(31),
  snapshotVersion: monthlyPeriodSnapshotVersionSchema,
  timeZone: z.string().min(1).max(255),
  totals: monthlyPeriodTotalsSchema,
  workflow: monthlyPeriodWorkflowSchema,
});

export const monthlyPeriodEnvelopeSchema = createSuccessEnvelopeSchema(monthlyPeriodSchema);

export const monthlyPeriodSubmissionRequestSchema = z.strictObject({
  acknowledgedSourceFingerprint: fingerprintSchema,
  expectedPeriodVersion: z.number().int().positive(),
});

export const monthlyPeriodReviewRequestSchema = z.discriminatedUnion('action', [
  z.strictObject({
    action: z.literal('REQUEST_CHANGES'),
    expectedPeriodVersion: z.number().int().positive(),
    expectedSourceFingerprint: fingerprintSchema,
    reason: z.string().trim().min(10).max(2_000),
  }),
  z.strictObject({
    action: z.literal('APPROVE'),
    expectedPeriodVersion: z.number().int().positive(),
    expectedSourceFingerprint: fingerprintSchema,
  }),
]);

export const monthlyPeriodLockRequestSchema = z.strictObject({
  expectedPeriodVersion: z.number().int().positive(),
  expectedSnapshotFingerprint: fingerprintSchema,
  expectedSourceFingerprint: fingerprintSchema,
});

export type MonthlyPeriod = z.infer<typeof monthlyPeriodSchema>;
export type MonthlyPeriodAction = (typeof MONTHLY_PERIOD_ACTIONS)[number];
export type MonthlyPeriodAttention = z.infer<typeof monthlyPeriodAttentionSchema>;
export type MonthlyPeriodApprovedRecord = z.infer<typeof monthlyPeriodApprovedRecordSchema>;
export type MonthlyPeriodLockRequest = z.infer<typeof monthlyPeriodLockRequestSchema>;
export type MonthlyPeriodReviewHistoryItem = z.infer<typeof monthlyPeriodReviewHistoryItemSchema>;
export type MonthlyPeriodReviewRequest = z.infer<typeof monthlyPeriodReviewRequestSchema>;
export type MonthlyPeriodRow = z.infer<typeof monthlyPeriodRowSchema>;
export type MonthlyPeriodStatus = z.infer<typeof monthlyPeriodWorkflowSchema>['status'];
export type MonthlyReadinessStatus = z.infer<typeof monthlyPeriodReadinessSchema>['status'];
export type MonthlyPeriodSubmissionRequest = z.infer<typeof monthlyPeriodSubmissionRequestSchema>;
