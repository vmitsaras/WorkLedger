import { z } from 'zod';

import { createSuccessEnvelopeSchema } from './api.js';
import { absenceCoverageInputSchema } from './vacation-requests.js';

const dateSchema = z.iso.date();
const instantSchema = z.iso.datetime({ offset: true });
const opaqueIdentifierSchema = z.uuid();
const minuteOfDaySchema = z.number().int().min(0).max(1_439);
const minuteEndSchema = z.number().int().min(1).max(1_440);

/** Sickness accepts the same coverage units but deliberately no note, diagnosis, or attachment. */
export const submitSicknessReportSchema = absenceCoverageInputSchema;

export const reportedSicknessCoverageSchema = z.strictObject({
  creditMinutes: z.number().int().min(0).max(1_440),
  endsAtMinute: minuteEndSchema.nullable(),
  holiday: z.boolean(),
  kind: z.enum(['FULL_DAY', 'FIRST_HALF', 'SECOND_HALF', 'MINUTE_INTERVAL']),
  localDate: dateSchema,
  startsAtMinute: minuteOfDaySchema.nullable(),
});

export const submittedSicknessReportSchema = z.strictObject({
  coverage: z.array(reportedSicknessCoverageSchema).min(1).max(366),
  id: opaqueIdentifierSchema,
  reportedAt: instantSchema,
  status: z.literal('REPORTED'),
  version: z.number().int().positive(),
});
export const submittedSicknessReportEnvelopeSchema = createSuccessEnvelopeSchema(
  submittedSicknessReportSchema,
);

export const acknowledgeSicknessReportSchema = z.strictObject({
  expectedVersion: z.number().int().positive(),
});
export const acknowledgedSicknessReportSchema = z.strictObject({
  id: opaqueIdentifierSchema,
  status: z.literal('ACKNOWLEDGED'),
  version: z.number().int().positive(),
});
export const acknowledgedSicknessReportEnvelopeSchema = createSuccessEnvelopeSchema(
  acknowledgedSicknessReportSchema,
);

export type SubmitSicknessReport = z.infer<typeof submitSicknessReportSchema>;
export type SubmittedSicknessReport = z.infer<typeof submittedSicknessReportSchema>;
export type AcknowledgeSicknessReport = z.infer<typeof acknowledgeSicknessReportSchema>;
