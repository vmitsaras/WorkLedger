import { z } from 'zod';

import { createSuccessEnvelopeSchema } from './api.js';

export const ATTENDANCE_STATES = ['OFF_WORK', 'WORKING', 'ON_BREAK'] as const;
export const ATTENDANCE_COMMANDS = ['CLOCK_IN', 'START_BREAK', 'RESUME', 'CLOCK_OUT'] as const;
export const PUNCH_EVENT_TYPES = ['CLOCK_IN', 'BREAK_START', 'BREAK_END', 'CLOCK_OUT'] as const;
export const TODAY_CALCULATION_STATUSES = ['PROVISIONAL', 'INCOMPLETE'] as const;
export const CALCULATION_WARNING_CODES = [
  'WORK_ON_ZERO_EXPECTED_DAY',
  'WORK_ON_HOLIDAY',
  'WORK_DURING_ABSENCE',
  'FLEX_POSITIVE_THRESHOLD_EXCEEDED',
  'FLEX_NEGATIVE_THRESHOLD_EXCEEDED',
] as const;
export const CALCULATION_BLOCKER_CODES = [
  'ATTENDANCE_INCOMPLETE',
  'ATTENDANCE_OVERLAP',
  'ATTENDANCE_INVALID_EVENT_ORDER',
  'ATTENDANCE_INVALID_EVENT_PRECISION',
  'SCHEDULE_NOT_ASSIGNED',
  'SCHEDULE_ASSIGNMENT_OVERLAP',
  'POLICY_NOT_ASSIGNED',
  'POLICY_ASSIGNMENT_OVERLAP',
  'POLICY_CONFIGURATION_INVALID',
  'CORRECTION_UNRESOLVED',
  'ABSENCE_APPROVAL_PENDING',
  'LEDGER_SOURCE_MISMATCH',
] as const;

const opaqueIdentifierSchema = z.string().min(1).max(128);
const instantSchema = z.iso.datetime({ offset: true });
const minuteSchema = z.number().int().safe().min(0);
const signedMinuteSchema = z.number().int().safe();

export const attendanceStateSchema = z.enum(ATTENDANCE_STATES);
export const attendanceCommandSchema = z.enum(ATTENDANCE_COMMANDS);
export const punchEventTypeSchema = z.enum(PUNCH_EVENT_TYPES);
export const todayCalculationStatusSchema = z.enum(TODAY_CALCULATION_STATUSES);
export const calculationWarningCodeSchema = z.enum(CALCULATION_WARNING_CODES);
export const calculationBlockerCodeSchema = z.enum(CALCULATION_BLOCKER_CODES);

export const todayAttendanceStateSchema = z.strictObject({
  activeSince: instantSchema.nullable(),
  attendanceRevision: z.number().int().safe().min(0),
  state: attendanceStateSchema,
  validActions: z.array(attendanceCommandSchema).max(3),
});

export const todayTimelineEventSchema = z.strictObject({
  id: opaqueIdentifierSchema,
  occurredAt: instantSchema,
  type: punchEventTypeSchema,
});

export const todayAttendanceEstimateSchema = z.strictObject({
  absenceCreditMinutes: minuteSchema,
  absenceExpectedReductionMinutes: minuteSchema,
  adjustmentMinutes: signedMinuteSchema,
  balanceMinutes: signedMinuteSchema,
  breakMinutes: minuteSchema,
  creditedMinutes: minuteSchema,
  expectedMinutes: minuteSchema,
  holidayExpectedReductionMinutes: minuteSchema,
  scheduledMinutes: minuteSchema,
  workedMinutes: minuteSchema,
});

export const todayCalculationSchema = z.strictObject({
  blockers: z.array(calculationBlockerCodeSchema).max(CALCULATION_BLOCKER_CODES.length),
  estimate: todayAttendanceEstimateSchema.nullable(),
  holidayName: z.string().min(1).max(160).nullable(),
  status: todayCalculationStatusSchema,
  warnings: z.array(calculationWarningCodeSchema).max(CALCULATION_WARNING_CODES.length),
});

export const todayAttendanceSchema = z.strictObject({
  asOf: instantSchema,
  attendance: todayAttendanceStateSchema,
  calculation: todayCalculationSchema,
  localDate: z.iso.date(),
  timeZone: z.string().min(1).max(255),
  timeline: z.array(todayTimelineEventSchema).max(500),
  timelineTruncated: z.boolean(),
});

export const todayAttendanceEnvelopeSchema = createSuccessEnvelopeSchema(todayAttendanceSchema);

export type AttendanceCommand = z.infer<typeof attendanceCommandSchema>;
export type AttendanceState = z.infer<typeof attendanceStateSchema>;
export type CalculationBlockerCode = z.infer<typeof calculationBlockerCodeSchema>;
export type CalculationWarningCode = z.infer<typeof calculationWarningCodeSchema>;
export type TodayAttendance = z.infer<typeof todayAttendanceSchema>;
export type TodayAttendanceEstimate = z.infer<typeof todayAttendanceEstimateSchema>;
export type TodayTimelineEvent = z.infer<typeof todayTimelineEventSchema>;
