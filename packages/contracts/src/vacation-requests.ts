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
const minuteOfDaySchema = z.number().int().min(0).max(1_439);
const minuteEndSchema = z.number().int().min(1).max(1_440);

export const absenceCoverageInputSchema = z.discriminatedUnion('kind', [
  z
    .strictObject({ endDate: dateSchema, kind: z.literal('FULL_DAY'), startDate: dateSchema })
    .refine((value) => value.startDate <= value.endDate, {
      message: 'End date must be on or after start date.',
      path: ['endDate'],
    }),
  z.strictObject({ kind: z.literal('FIRST_HALF'), localDate: dateSchema }),
  z.strictObject({ kind: z.literal('SECOND_HALF'), localDate: dateSchema }),
  z
    .strictObject({
      endsAtMinute: minuteEndSchema,
      kind: z.literal('MINUTE_INTERVAL'),
      localDate: dateSchema,
      startsAtMinute: minuteOfDaySchema,
    })
    .refine((value) => value.startsAtMinute < value.endsAtMinute, {
      message: 'End time must be after start time.',
      path: ['endsAtMinute'],
    }),
]);

export const submitVacationRequestSchema = absenceCoverageInputSchema;

export const vacationRequestCoverageSchema = z.strictObject({
  endsAtMinute: minuteEndSchema.nullable(),
  entitlementMinutes: minutesSchema,
  holiday: z.boolean(),
  kind: z.enum(['FULL_DAY', 'FIRST_HALF', 'SECOND_HALF', 'MINUTE_INTERVAL']),
  localDate: dateSchema,
  scheduledMinutes: z.number().int().min(0).max(1_440),
  startsAtMinute: minuteOfDaySchema.nullable(),
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

export type AbsenceCoverageInput = z.infer<typeof absenceCoverageInputSchema>;
export type SubmitVacationRequest = z.infer<typeof submitVacationRequestSchema>;
export type SubmittedVacationRequest = z.infer<typeof submittedVacationRequestSchema>;
