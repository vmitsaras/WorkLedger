import { z } from 'zod';

import { createSuccessEnvelopeSchema } from './api.js';

export const MY_TIME_VIEWS = ['WEEK', 'MONTH'] as const;
export const TIME_RECORD_STATUSES = ['NO_RECORD', 'PROVISIONAL', 'INCOMPLETE', 'COMPLETE'] as const;
export const TIME_ACCOUNT_ENTRY_TYPES = [
  'OPENING_BALANCE',
  'DAILY_DELTA',
  'DAILY_RECALCULATION_DELTA',
  'POST_LOCK_ADJUSTMENT',
  'MANUAL_ADMINISTRATIVE_ADJUSTMENT',
] as const;

const dateSchema = z.iso.date();
const instantSchema = z.iso.datetime({ offset: true });
const minuteSchema = z.number().int().safe().min(0);
const signedMinuteSchema = z.number().int().safe();

export const myTimeQuerySchema = z.strictObject({
  date: dateSchema,
  limit: z.coerce.number().int().min(10).max(50).default(20),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  view: z.enum(MY_TIME_VIEWS).default('WEEK'),
});

export const timeRecordSchema = z.strictObject({
  balanceMinutes: signedMinuteSchema.nullable(),
  creditedMinutes: minuteSchema.nullable(),
  expectedMinutes: minuteSchema.nullable(),
  localDate: dateSchema,
  status: z.enum(TIME_RECORD_STATUSES),
});

export const myTimePeriodSchema = z.strictObject({
  endDate: dateSchema,
  startDate: dateSchema,
  view: z.enum(MY_TIME_VIEWS),
});

export const myTimeSummarySchema = z.strictObject({
  completeBalanceMinutes: signedMinuteSchema,
  incompleteRecordCount: z.number().int().min(0).max(31),
  recordedDayCount: z.number().int().min(0).max(31),
});

export const timeAccountLedgerEntrySchema = z.strictObject({
  balanceAfterMinutes: signedMinuteSchema,
  effectiveDate: dateSchema,
  entryType: z.enum(TIME_ACCOUNT_ENTRY_TYPES),
  explanationCode: z.string().min(1).max(128),
  minutes: signedMinuteSchema,
  postedAt: instantSchema,
});

export const timeAccountLedgerPageSchema = z.strictObject({
  entries: z.array(timeAccountLedgerEntrySchema).max(50),
  limit: z.number().int().min(10).max(50),
  page: z.number().int().min(1).max(10_000),
  total: z.number().int().min(0),
});

export const flexibleTimeBalanceSchema = z.strictObject({
  eligibleProjectedMinutes: signedMinuteSchema,
  excludedIncompleteDates: z.array(dateSchema).max(31),
  postedBalanceMinutes: signedMinuteSchema,
  projectedBalanceMinutes: signedMinuteSchema,
});

export const myTimeSchema = z.strictObject({
  balance: flexibleTimeBalanceSchema,
  ledger: timeAccountLedgerPageSchema,
  period: myTimePeriodSchema,
  records: z.array(timeRecordSchema).max(31),
  summary: myTimeSummarySchema,
  timeZone: z.string().min(1).max(255),
});

export const myTimeEnvelopeSchema = createSuccessEnvelopeSchema(myTimeSchema);

export type FlexibleTimeBalance = z.infer<typeof flexibleTimeBalanceSchema>;
export type MyTime = z.infer<typeof myTimeSchema>;
export type MyTimeQuery = z.infer<typeof myTimeQuerySchema>;
export type MyTimeView = z.infer<typeof myTimePeriodSchema>['view'];
export type TimeAccountLedgerEntry = z.infer<typeof timeAccountLedgerEntrySchema>;
export type TimeRecord = z.infer<typeof timeRecordSchema>;
