import { z } from 'zod';

import { createSuccessEnvelopeSchema } from './api.js';

const monthSchema = z.string().regex(/^\d{4}-(?:0[1-9]|1[0-2])$/);
const dateSchema = z.iso.date();
const minuteOfDaySchema = z.number().int().min(0).max(1_439);
const minuteEndSchema = z.number().int().min(1).max(1_440);

export const personalCalendarQuerySchema = z.strictObject({ month: monthSchema.optional() });

export const personalCalendarHolidaySchema = z.strictObject({
  localDate: dateSchema,
  name: z.string().min(1).max(160),
});

export const personalCalendarAbsenceSchema = z.strictObject({
  absenceTypeName: z.string().min(1).max(160),
  endsAtMinute: minuteEndSchema.nullable(),
  kind: z.enum(['FULL_DAY', 'FIRST_HALF', 'SECOND_HALF', 'MINUTE_INTERVAL']),
  localDate: dateSchema,
  startsAtMinute: minuteOfDaySchema.nullable(),
  status: z.enum([
    'SUBMITTED',
    'REPORTED',
    'ACKNOWLEDGED',
    'CHANGES_REQUESTED',
    'APPROVED',
    'PARTIALLY_CANCELLED',
  ]),
});

export const personalCalendarSchema = z.strictObject({
  absences: z.array(personalCalendarAbsenceSchema),
  days: z.array(dateSchema).min(28).max(31),
  holidays: z.array(personalCalendarHolidaySchema),
  leadingEmptyDays: z.number().int().min(0).max(6),
  month: monthSchema,
});
export const personalCalendarEnvelopeSchema = createSuccessEnvelopeSchema(personalCalendarSchema);

export type PersonalCalendar = z.infer<typeof personalCalendarSchema>;
export type PersonalCalendarQuery = z.infer<typeof personalCalendarQuerySchema>;
