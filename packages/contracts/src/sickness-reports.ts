import { z } from 'zod';

import { createSuccessEnvelopeSchema } from './api.js';

const dateSchema = z.iso.date();
const instantSchema = z.iso.datetime({ offset: true });
const opaqueIdentifierSchema = z.uuid();

export const submitSicknessReportSchema = z
  .strictObject({ endDate: dateSchema, startDate: dateSchema })
  .refine((value) => value.startDate <= value.endDate, {
    message: 'End date must be on or after start date.',
    path: ['endDate'],
  });

export const reportedSicknessCoverageSchema = z.strictObject({
  creditMinutes: z.number().int().min(0).max(1_440),
  holiday: z.boolean(),
  localDate: dateSchema,
});

export const submittedSicknessReportSchema = z.strictObject({
  coverage: z.array(reportedSicknessCoverageSchema).min(1).max(366),
  id: opaqueIdentifierSchema,
  reportedAt: instantSchema,
  status: z.literal('REPORTED'),
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
