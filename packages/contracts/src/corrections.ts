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

export type SubmitCorrectionRequest = z.infer<typeof submitCorrectionRequestSchema>;
export type SubmittedCorrectionRequest = z.infer<typeof submittedCorrectionRequestSchema>;
