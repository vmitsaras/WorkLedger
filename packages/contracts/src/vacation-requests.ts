import { z } from 'zod';

import { createSuccessEnvelopeSchema } from './api.js';

const dateSchema = z.iso.date();
const instantSchema = z.iso.datetime({ offset: true });
const opaqueIdentifierSchema = z.uuid();
const minutesSchema = z
  .number()
  .int()
  .min(0)
  .max(1_440 * 366);

export const submitVacationRequestSchema = z
  .strictObject({
    endDate: dateSchema,
    startDate: dateSchema,
  })
  .refine((value) => value.startDate <= value.endDate, {
    message: 'End date must be on or after start date.',
    path: ['endDate'],
  });

export const vacationRequestCoverageSchema = z.strictObject({
  entitlementMinutes: minutesSchema,
  holiday: z.boolean(),
  localDate: dateSchema,
  scheduledMinutes: z.number().int().min(0).max(1_440),
});

export const submittedVacationRequestSchema = z.strictObject({
  coverage: z.array(vacationRequestCoverageSchema).min(1).max(366),
  entitlementMinutes: minutesSchema,
  id: opaqueIdentifierSchema,
  projectedRemainingMinutes: z.number().int(),
  status: z.literal('PENDING_APPROVAL'),
  submittedAt: instantSchema,
});

export const submittedVacationRequestEnvelopeSchema = createSuccessEnvelopeSchema(
  submittedVacationRequestSchema,
);

export type SubmitVacationRequest = z.infer<typeof submitVacationRequestSchema>;
export type SubmittedVacationRequest = z.infer<typeof submittedVacationRequestSchema>;
