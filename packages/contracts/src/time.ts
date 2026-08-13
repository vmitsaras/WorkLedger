import { z } from 'zod';

import { createSuccessEnvelopeSchema } from './api.js';
import { calculationBlockerCodeSchema, calculationWarningCodeSchema } from './today.js';

export const MY_TIME_VIEWS = ['WEEK', 'MONTH'] as const;
export const TIME_RECORD_STATUSES = ['NO_RECORD', 'PROVISIONAL', 'INCOMPLETE', 'COMPLETE'] as const;
export const TIME_ACCOUNT_ENTRY_TYPES = [
  'OPENING_BALANCE',
  'DAILY_DELTA',
  'DAILY_RECALCULATION_DELTA',
  'POST_LOCK_ADJUSTMENT',
  'MANUAL_ADMINISTRATIVE_ADJUSTMENT',
] as const;
export const LEAVE_ENTITLEMENT_ENTRY_TYPES = [
  'ALLOCATION',
  'PENDING_RESERVATION',
  'RESERVATION_RELEASE',
  'APPROVED_DEDUCTION',
  'CANCELLATION_RESTORATION',
  'CARRYOVER',
  'EXPIRY',
  'MANUAL_ADJUSTMENT',
] as const;

const dateSchema = z.iso.date();
const instantSchema = z.iso.datetime({ offset: true });
const minuteSchema = z.number().int().safe().min(0);
const signedMinuteSchema = z.number().int().safe();
const opaqueIdentifierSchema = z.string().min(1).max(128);

export const myTimeQuerySchema = z.strictObject({
  date: dateSchema,
  limit: z.coerce.number().int().min(10).max(50).default(20),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  view: z.enum(MY_TIME_VIEWS).default('WEEK'),
});

export const dailyTimeAttentionSchema = z.strictObject({
  blockers: z.array(calculationBlockerCodeSchema).max(12),
  warnings: z.array(calculationWarningCodeSchema).max(5),
});

export const timeRecordSchema = z.strictObject({
  attention: dailyTimeAttentionSchema,
  balanceMinutes: signedMinuteSchema.nullable(),
  creditedMinutes: minuteSchema.nullable(),
  expectedMinutes: minuteSchema.nullable(),
  localDate: dateSchema,
  recordId: opaqueIdentifierSchema.nullable(),
  status: z.enum(TIME_RECORD_STATUSES),
});

export const dailyTimeIntervalSchema = z.strictObject({
  durationMinutes: minuteSchema,
  endsAt: instantSchema,
  startsAt: instantSchema,
});

export const dailyTimeSessionSchema = z.strictObject({
  breaks: z.array(dailyTimeIntervalSchema).max(100),
  continuesFromPreviousDate: z.boolean(),
  continuesToNextDate: z.boolean(),
  workIntervals: z.array(dailyTimeIntervalSchema).max(100),
});

export const dailyTimeEventSchema = z.strictObject({
  occurredAt: instantSchema,
  sequence: z.number().int().positive(),
  type: z.enum(['CLOCK_IN', 'BREAK_START', 'BREAK_END', 'CLOCK_OUT']),
});

export const dailyTimeCalculationSchema = z.strictObject({
  absenceCreditMinutes: minuteSchema,
  adjustmentMinutes: signedMinuteSchema,
  balanceMinutes: signedMinuteSchema,
  breakMinutes: minuteSchema,
  creditedMinutes: minuteSchema,
  expectedMinutes: minuteSchema,
  workedMinutes: minuteSchema,
});

export const dailyTimeRecordSchema = z.strictObject({
  attention: dailyTimeAttentionSchema,
  calculation: dailyTimeCalculationSchema.nullable(),
  events: z.array(dailyTimeEventSchema).max(500),
  localDate: dateSchema,
  sessions: z.array(dailyTimeSessionSchema).max(100),
  status: z.enum(TIME_RECORD_STATUSES),
  timeZone: z.string().min(1).max(255),
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

export const leaveEntitlementAccountSchema = z.strictObject({
  availableMinutes: signedMinuteSchema,
  name: z.string().min(1).max(160),
  projectedRemainingMinutes: signedMinuteSchema,
  reservedMinutes: minuteSchema,
});

export const leaveEntitlementLedgerEntrySchema = z.strictObject({
  absenceTypeName: z.string().min(1).max(160),
  availableAfterMinutes: signedMinuteSchema,
  effectiveOn: dateSchema,
  entryType: z.enum(LEAVE_ENTITLEMENT_ENTRY_TYPES),
  minutes: signedMinuteSchema,
  postedAt: instantSchema,
  projectedAfterMinutes: signedMinuteSchema,
  reservedAfterMinutes: minuteSchema,
});

export const leaveEntitlementLedgerPageSchema = z.strictObject({
  entries: z.array(leaveEntitlementLedgerEntrySchema).max(50),
  limit: z.number().int().min(10).max(50),
  page: z.number().int().min(1).max(10_000),
  total: z.number().int().min(0),
});

export const leaveBalanceSchema = z.strictObject({
  accounts: z.array(leaveEntitlementAccountSchema).max(20),
  ledger: leaveEntitlementLedgerPageSchema,
});

export const myTimeSchema = z.strictObject({
  balance: flexibleTimeBalanceSchema,
  leave: leaveBalanceSchema,
  ledger: timeAccountLedgerPageSchema,
  period: myTimePeriodSchema,
  records: z.array(timeRecordSchema).max(31),
  summary: myTimeSummarySchema,
  timeZone: z.string().min(1).max(255),
});

export const myTimeEnvelopeSchema = createSuccessEnvelopeSchema(myTimeSchema);
export const dailyTimeRecordEnvelopeSchema = createSuccessEnvelopeSchema(dailyTimeRecordSchema);

export type FlexibleTimeBalance = z.infer<typeof flexibleTimeBalanceSchema>;
export type LeaveBalance = z.infer<typeof leaveBalanceSchema>;
export type LeaveEntitlementAccount = z.infer<typeof leaveEntitlementAccountSchema>;
export type LeaveEntitlementLedgerEntry = z.infer<typeof leaveEntitlementLedgerEntrySchema>;
export type DailyTimeAttention = z.infer<typeof dailyTimeAttentionSchema>;
export type DailyTimeRecord = z.infer<typeof dailyTimeRecordSchema>;
export type MyTime = z.infer<typeof myTimeSchema>;
export type MyTimeQuery = z.infer<typeof myTimeQuerySchema>;
export type MyTimeView = z.infer<typeof myTimePeriodSchema>['view'];
export type TimeAccountLedgerEntry = z.infer<typeof timeAccountLedgerEntrySchema>;
export type TimeRecord = z.infer<typeof timeRecordSchema>;
