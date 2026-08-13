import { z } from 'zod';

import { createSuccessEnvelopeSchema } from './api.js';

const dateSchema = z.iso.date();
const instantSchema = z.iso.datetime({ offset: true });
const opaqueIdentifierSchema = z.string().uuid();
const localTimeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const utcOffsetSchema = z.string().regex(/^[+-](?:0\d|1\d|2[0-3]):[0-5]\d$/);

export const correctionRequestIntervalInputSchema = z.strictObject({
  endsAtUtcOffset: utcOffsetSchema.nullable(),
  endsAtLocalTime: localTimeSchema,
  startsAtUtcOffset: utcOffsetSchema.nullable(),
  startsAtLocalTime: localTimeSchema,
});

export const submitCorrectionRequestSchema = z.strictObject({
  interval: correctionRequestIntervalInputSchema,
  reason: z.string().trim().min(10).max(1_000),
  recordId: opaqueIdentifierSchema,
});

export const submittedCorrectionRequestSchema = z.strictObject({
  id: opaqueIdentifierSchema,
  localDate: dateSchema,
  proposedDurationMinutes: z.number().int().min(0),
  status: z.literal('SUBMITTED'),
  submittedAt: instantSchema,
});

export const submitCorrectionRequestEnvelopeSchema = createSuccessEnvelopeSchema(
  submittedCorrectionRequestSchema,
);

const correctionEventSchema = z.strictObject({
  occurredAt: instantSchema,
  sequence: z.number().int().positive(),
  type: z.string().min(1).max(32),
});
const correctionCalculationSchema = z.strictObject({
  balanceMinutes: z.number().int(),
  breakMinutes: z.number().int().min(0),
  creditedMinutes: z.number().int().min(0),
  expectedMinutes: z.number().int().min(0),
  workedMinutes: z.number().int().min(0),
});
export const correctionReviewItemSchema = z.strictObject({
  employeeDisplayName: z.string().min(1).max(160),
  events: z.array(correctionEventSchema).max(500),
  id: opaqueIdentifierSchema,
  localDate: dateSchema,
  originalCalculation: correctionCalculationSchema,
  proposedEndsAt: instantSchema,
  proposedStartsAt: instantSchema,
  reason: z.string().min(10).max(1_000),
  status: z.enum(['SUBMITTED', 'CHANGES_REQUESTED', 'APPROVED']),
  version: z.number().int().positive(),
});
export const correctionReviewQueueSchema = z.strictObject({
  items: z.array(correctionReviewItemSchema).max(500),
});
export const correctionReviewQueueEnvelopeSchema = createSuccessEnvelopeSchema(
  correctionReviewQueueSchema,
);
export const correctionDecisionRequestSchema = z.strictObject({
  action: z.enum(['APPROVE', 'REJECT', 'REQUEST_CHANGES']),
  expectedVersion: z.number().int().positive(),
  reason: z.string().trim().min(10).max(1_000),
});
export const correctionDecisionResultSchema = z.strictObject({
  id: opaqueIdentifierSchema,
  status: z.enum(['APPROVED', 'REJECTED', 'CHANGES_REQUESTED']),
  version: z.number().int().positive(),
});
export const correctionDecisionEnvelopeSchema = createSuccessEnvelopeSchema(
  correctionDecisionResultSchema,
);
export const applyCorrectionRequestSchema = z.strictObject({
  expectedVersion: z.number().int().positive(),
});
export const applyCorrectionResultSchema = z.strictObject({
  balanceDeltaMinutes: z.number().int(),
  id: opaqueIdentifierSchema,
  status: z.literal('APPLIED'),
  workedMinutes: z.number().int().min(0),
});
export const applyCorrectionEnvelopeSchema = createSuccessEnvelopeSchema(
  applyCorrectionResultSchema,
);

export type SubmitCorrectionRequest = z.infer<typeof submitCorrectionRequestSchema>;
export type SubmittedCorrectionRequest = z.infer<typeof submittedCorrectionRequestSchema>;
export type CorrectionReviewItem = z.infer<typeof correctionReviewItemSchema>;
export type CorrectionDecisionRequest = z.infer<typeof correctionDecisionRequestSchema>;
