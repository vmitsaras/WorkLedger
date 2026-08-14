import { z } from 'zod';

import { createSuccessEnvelopeSchema } from './api.js';

const monthSchema = z.string().regex(/^\d{4}-(?:0[1-9]|1[0-2])$/);
const dateSchema = z.iso.date();

export const TEAM_CALENDAR_COVERAGE_KINDS = [
  'FULL_DAY',
  'FIRST_HALF',
  'SECOND_HALF',
  'MINUTE_INTERVAL',
] as const;

export const teamCalendarQuerySchema = z.strictObject({ month: monthSchema.optional() });

export const teamCalendarEntrySchema = z
  .strictObject({
    availability: z.literal('UNAVAILABLE'),
    coverageKind: z.enum(TEAM_CALENDAR_COVERAGE_KINDS),
    employeeDisplayName: z.string().min(1).max(160),
    endsAtMinute: z.number().int().min(1).max(1_440).nullable(),
    localDate: dateSchema,
    startsAtMinute: z.number().int().min(0).max(1_439).nullable(),
    teamName: z.string().min(1).max(160).nullable(),
  })
  .superRefine((entry, context) => {
    if (entry.coverageKind === 'MINUTE_INTERVAL') {
      if (
        entry.startsAtMinute === null ||
        entry.endsAtMinute === null ||
        entry.startsAtMinute >= entry.endsAtMinute
      ) {
        context.addIssue({
          code: 'custom',
          message: 'Minute interval coverage requires ordered start and end minutes.',
          path: ['startsAtMinute'],
        });
      }
      return;
    }
    if (entry.startsAtMinute !== null || entry.endsAtMinute !== null) {
      context.addIssue({
        code: 'custom',
        message: 'Non-minute coverage must not include clock minutes.',
        path: ['startsAtMinute'],
      });
    }
  });

export const teamCalendarSchema = z.strictObject({
  days: z.array(dateSchema).min(28).max(31),
  entries: z.array(teamCalendarEntrySchema).max(100_000),
  leadingEmptyDays: z.number().int().min(0).max(6),
  month: monthSchema,
  scopeAsOfLocalDate: dateSchema,
  timeZone: z.string().min(1).max(255),
});

export const teamCalendarEnvelopeSchema = createSuccessEnvelopeSchema(teamCalendarSchema);

export type TeamCalendar = z.infer<typeof teamCalendarSchema>;
export type TeamCalendarEntry = z.infer<typeof teamCalendarEntrySchema>;
export type TeamCalendarQuery = z.infer<typeof teamCalendarQuerySchema>;
