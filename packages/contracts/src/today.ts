import { z } from 'zod';

import { createSuccessEnvelopeSchema } from './api.js';

export const ATTENDANCE_STATES = ['OFF_WORK', 'WORKING', 'ON_BREAK'] as const;
export const ATTENDANCE_COMMANDS = ['CLOCK_IN', 'START_BREAK', 'RESUME', 'CLOCK_OUT'] as const;
export const PUNCH_EVENT_TYPES = ['CLOCK_IN', 'BREAK_START', 'BREAK_END', 'CLOCK_OUT'] as const;
export const TODAY_CALCULATION_STATUSES = ['PROVISIONAL', 'INCOMPLETE'] as const;
export const TODAY_ACTION_BLOCKING_REASONS = ['CURRENT_ATTENDANCE_STATE'] as const;
export const TODAY_ESTIMATED_FINISH_UNAVAILABLE_REASONS = [
  'CALCULATION_UNAVAILABLE',
  'CALCULATION_INCOMPLETE',
  'NOT_WORKING',
  'ON_BREAK',
  'NO_REMAINING_EXPECTATION',
] as const;
export const TODAY_ATTENTION_ACTIONS = [
  'FIX_ENTRY',
  'REVIEW_BALANCE_HISTORY',
  'REVIEW_CALCULATION',
  'REVIEW_RECORD',
  'REVIEW_REQUEST',
  'REVIEW_TIMELINE',
] as const;
export const TODAY_ATTENTION_DESTINATIONS = [
  'MY_BALANCES',
  'MY_REQUESTS',
  'MY_TIME',
  'TODAY_CALCULATION',
  'TODAY_TIMELINE',
] as const;
export const TODAY_ATTENTION_SEVERITIES = ['BLOCKER', 'WARNING'] as const;
export const TODAY_ATTENTION_SOURCES = ['CURRENT_DAY_CALCULATION', 'POSTED_FLEX_BALANCE'] as const;
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
export const todayActionBlockingReasonSchema = z.enum(TODAY_ACTION_BLOCKING_REASONS);
export const todayEstimatedFinishUnavailableReasonSchema = z.enum(
  TODAY_ESTIMATED_FINISH_UNAVAILABLE_REASONS,
);
export const todayAttentionActionSchema = z.enum(TODAY_ATTENTION_ACTIONS);
export const todayAttentionDestinationSchema = z.enum(TODAY_ATTENTION_DESTINATIONS);
export const todayAttentionSeveritySchema = z.enum(TODAY_ATTENTION_SEVERITIES);
export const todayAttentionSourceSchema = z.enum(TODAY_ATTENTION_SOURCES);

export const todayActionAvailabilitySchema = z.discriminatedUnion('available', [
  z.strictObject({
    available: z.literal(true),
    blockingReason: z.null(),
    command: attendanceCommandSchema,
  }),
  z.strictObject({
    available: z.literal(false),
    blockingReason: todayActionBlockingReasonSchema,
    command: attendanceCommandSchema,
  }),
]);

export const todayAttendanceStateSchema = z
  .strictObject({
    actionAvailability: z.array(todayActionAvailabilitySchema).length(ATTENDANCE_COMMANDS.length),
    activeElapsedMinutes: minuteSchema.nullable(),
    activeSince: instantSchema.nullable(),
    attendanceRevision: z.number().int().safe().min(0),
    state: attendanceStateSchema,
    validActions: z.array(attendanceCommandSchema).max(3),
  })
  .superRefine((attendance, context) => {
    const commands = attendance.actionAvailability.map(({ command }) => command);
    if (new Set(commands).size !== ATTENDANCE_COMMANDS.length) {
      context.addIssue({
        code: 'custom',
        message: 'Action availability must contain every attendance command exactly once.',
        path: ['actionAvailability'],
      });
    }
    const availableActions = attendance.actionAvailability
      .filter(({ available }) => available)
      .map(({ command }) => command);
    if (
      availableActions.length !== attendance.validActions.length ||
      availableActions.some((command, index) => command !== attendance.validActions[index])
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Available actions must reconcile with valid actions.',
        path: ['actionAvailability'],
      });
    }
    const activeValuesArePaired =
      (attendance.activeSince === null) === (attendance.activeElapsedMinutes === null);
    if (
      !activeValuesArePaired ||
      (attendance.state === 'OFF_WORK') !== (attendance.activeSince === null)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Active attendance timing must reconcile with the current state.',
        path: ['activeSince'],
      });
    }
  });

export const todayTimelineEventSchema = z.strictObject({
  id: opaqueIdentifierSchema,
  occurredAt: instantSchema,
  type: punchEventTypeSchema,
});

export const todayAppliedCorrectionSchema = z.strictObject({
  correctedWorkedMinutes: minuteSchema,
  originalWorkedMinutes: minuteSchema,
});

export const todayCalculationSourcesSchema = z.strictObject({
  absenceCreditMinutes: minuteSchema,
  absenceExpectedReductionMinutes: minuteSchema,
  approvedCorrectionMinutes: signedMinuteSchema,
  breakMinutesToday: minuteSchema,
  holidayExpectedReductionMinutes: minuteSchema,
  otherApprovedAdjustmentMinutes: signedMinuteSchema,
  scheduledMinutes: minuteSchema,
  workedMinutesToday: minuteSchema,
});

export const todayProvisionalCalculationSchema = z.strictObject({
  calculationSources: todayCalculationSourcesSchema,
  creditedMinutesToday: minuteSchema,
  expectedMinutesToday: minuteSchema,
  provisionalDifferenceMinutes: signedMinuteSchema,
});

export const todayAttentionRecoverySchema = z.strictObject({
  action: todayAttentionActionSchema,
  destination: todayAttentionDestinationSchema,
  label: z.string().min(1).max(80),
  statusAfterAction: z.string().min(1).max(240),
});

export const todayAttentionItemSchema = z.strictObject({
  affectedDate: z.iso.date(),
  blocksSubmission: z.boolean(),
  code: z.union([calculationBlockerCodeSchema, calculationWarningCodeSchema]),
  reason: z.string().min(1).max(240),
  recovery: todayAttentionRecoverySchema,
  severity: todayAttentionSeveritySchema,
  source: todayAttentionSourceSchema,
  title: z.string().min(1).max(100),
});

export const todayCalculationSchema = z.strictObject({
  attentionItems: z
    .array(todayAttentionItemSchema)
    .max(CALCULATION_BLOCKER_CODES.length + CALCULATION_WARNING_CODES.length),
  estimatedFinishAt: instantSchema.nullable(),
  estimatedFinishUnavailableReason: todayEstimatedFinishUnavailableReasonSchema.nullable(),
  holidayName: z.string().min(1).max(160).nullable(),
  isPeriodPostedOrLocked: z.literal(false),
  provisional: todayProvisionalCalculationSchema.nullable(),
  remainingExpectedMinutes: minuteSchema.nullable(),
  status: todayCalculationStatusSchema,
});

const blockerCodeSet = new Set<string>(CALCULATION_BLOCKER_CODES);
const thresholdWarningCodeSet = new Set<string>([
  'FLEX_NEGATIVE_THRESHOLD_EXCEEDED',
  'FLEX_POSITIVE_THRESHOLD_EXCEEDED',
]);
const expectedAttentionAction: Readonly<
  Record<
    (typeof CALCULATION_BLOCKER_CODES)[number] | (typeof CALCULATION_WARNING_CODES)[number],
    (typeof TODAY_ATTENTION_ACTIONS)[number]
  >
> = {
  ABSENCE_APPROVAL_PENDING: 'REVIEW_REQUEST',
  ATTENDANCE_INCOMPLETE: 'FIX_ENTRY',
  ATTENDANCE_INVALID_EVENT_ORDER: 'FIX_ENTRY',
  ATTENDANCE_INVALID_EVENT_PRECISION: 'FIX_ENTRY',
  ATTENDANCE_OVERLAP: 'FIX_ENTRY',
  CORRECTION_UNRESOLVED: 'REVIEW_REQUEST',
  FLEX_NEGATIVE_THRESHOLD_EXCEEDED: 'REVIEW_BALANCE_HISTORY',
  FLEX_POSITIVE_THRESHOLD_EXCEEDED: 'REVIEW_BALANCE_HISTORY',
  LEDGER_SOURCE_MISMATCH: 'REVIEW_RECORD',
  POLICY_ASSIGNMENT_OVERLAP: 'REVIEW_RECORD',
  POLICY_CONFIGURATION_INVALID: 'REVIEW_RECORD',
  POLICY_NOT_ASSIGNED: 'REVIEW_RECORD',
  SCHEDULE_ASSIGNMENT_OVERLAP: 'REVIEW_RECORD',
  SCHEDULE_NOT_ASSIGNED: 'REVIEW_RECORD',
  WORK_DURING_ABSENCE: 'FIX_ENTRY',
  WORK_ON_HOLIDAY: 'REVIEW_CALCULATION',
  WORK_ON_ZERO_EXPECTED_DAY: 'REVIEW_CALCULATION',
};
const expectedAttentionDestination: Readonly<
  Record<(typeof TODAY_ATTENTION_ACTIONS)[number], (typeof TODAY_ATTENTION_DESTINATIONS)[number]>
> = {
  FIX_ENTRY: 'MY_TIME',
  REVIEW_BALANCE_HISTORY: 'MY_BALANCES',
  REVIEW_CALCULATION: 'TODAY_CALCULATION',
  REVIEW_RECORD: 'MY_TIME',
  REVIEW_REQUEST: 'MY_REQUESTS',
  REVIEW_TIMELINE: 'TODAY_TIMELINE',
};

export const todayAttendanceSchema = z
  .strictObject({
    appliedCorrections: z.array(todayAppliedCorrectionSchema).max(500),
    asOf: instantSchema,
    attendance: todayAttendanceStateSchema,
    calculation: todayCalculationSchema,
    localDate: z.iso.date(),
    postedFlexBalanceMinutes: signedMinuteSchema,
    postedThroughDate: z.iso.date().nullable(),
    snapshotCapturedAt: instantSchema,
    timeZone: z.string().min(1).max(255),
    timeline: z.array(todayTimelineEventSchema).max(500),
    timelineTruncated: z.boolean(),
  })
  .superRefine((today, context) => {
    const provisional = today.calculation.provisional;
    if (today.calculation.status === 'PROVISIONAL' && provisional === null) {
      context.addIssue({
        code: 'custom',
        message: 'A provisional Today calculation must include its source values.',
        path: ['calculation', 'provisional'],
      });
    }
    if (provisional === null) {
      if (today.calculation.remainingExpectedMinutes !== null) {
        context.addIssue({
          code: 'custom',
          message: 'Remaining expected time is unavailable without a provisional calculation.',
          path: ['calculation', 'remainingExpectedMinutes'],
        });
      }
    } else {
      const sources = provisional.calculationSources;
      const expectedMinutes =
        sources.scheduledMinutes -
        sources.holidayExpectedReductionMinutes -
        sources.absenceExpectedReductionMinutes;
      const creditedMinutes =
        sources.workedMinutesToday +
        sources.absenceCreditMinutes +
        sources.approvedCorrectionMinutes +
        sources.otherApprovedAdjustmentMinutes;
      const provisionalDifference = creditedMinutes - expectedMinutes;
      const remainingExpectedMinutes = Math.max(expectedMinutes - creditedMinutes, 0);
      const valuesReconcile =
        expectedMinutes === provisional.expectedMinutesToday &&
        creditedMinutes === provisional.creditedMinutesToday &&
        provisionalDifference === provisional.provisionalDifferenceMinutes &&
        remainingExpectedMinutes === today.calculation.remainingExpectedMinutes;
      if (!valuesReconcile) {
        context.addIssue({
          code: 'custom',
          message: 'Today calculation values must reconcile to one provisional source set.',
          path: ['calculation', 'provisional'],
        });
      }
    }

    const finishFieldsArePaired =
      (today.calculation.estimatedFinishAt === null) !==
      (today.calculation.estimatedFinishUnavailableReason === null);
    if (!finishFieldsArePaired) {
      context.addIssue({
        code: 'custom',
        message: 'Estimated finish must include either an instant or an unavailable reason.',
        path: ['calculation', 'estimatedFinishAt'],
      });
    }

    const attentionCodes = new Set<string>();
    let blockerCount = 0;
    for (const [index, item] of today.calculation.attentionItems.entries()) {
      if (attentionCodes.has(item.code)) {
        context.addIssue({
          code: 'custom',
          message: 'Today attention codes must be unique.',
          path: ['calculation', 'attentionItems', index, 'code'],
        });
      }
      attentionCodes.add(item.code);
      const isBlocker = blockerCodeSet.has(item.code);
      const expectedAffectedDate = thresholdWarningCodeSet.has(item.code)
        ? (today.postedThroughDate ?? today.localDate)
        : today.localDate;
      if (isBlocker) blockerCount += 1;
      if (
        item.affectedDate !== expectedAffectedDate ||
        item.blocksSubmission !== isBlocker ||
        item.recovery.action !== expectedAttentionAction[item.code] ||
        item.recovery.destination !== expectedAttentionDestination[item.recovery.action] ||
        item.severity !== (isBlocker ? 'BLOCKER' : 'WARNING') ||
        (thresholdWarningCodeSet.has(item.code)
          ? item.source !== 'POSTED_FLEX_BALANCE'
          : item.source !== 'CURRENT_DAY_CALCULATION')
      ) {
        context.addIssue({
          code: 'custom',
          message: 'Today attention metadata must match its code and authoritative source date.',
          path: ['calculation', 'attentionItems', index],
        });
      }
    }

    if (blockerCount > 0 !== (today.calculation.status === 'INCOMPLETE')) {
      context.addIssue({
        code: 'custom',
        message: 'Today calculation status must reconcile with its blocking attention.',
        path: ['calculation', 'status'],
      });
    }

    const expectedUnavailableReason =
      today.calculation.status === 'INCOMPLETE'
        ? provisional === null
          ? 'CALCULATION_UNAVAILABLE'
          : 'CALCULATION_INCOMPLETE'
        : today.attendance.state === 'OFF_WORK'
          ? 'NOT_WORKING'
          : today.attendance.state === 'ON_BREAK'
            ? 'ON_BREAK'
            : today.calculation.remainingExpectedMinutes === 0
              ? 'NO_REMAINING_EXPECTATION'
              : null;
    if (
      today.calculation.estimatedFinishUnavailableReason !== expectedUnavailableReason ||
      (expectedUnavailableReason === null) !== (today.calculation.estimatedFinishAt !== null)
    ) {
      context.addIssue({
        code: 'custom',
        message:
          'Estimated finish availability must reconcile with calculation and attendance state.',
        path: ['calculation', 'estimatedFinishUnavailableReason'],
      });
    }

    if (today.postedThroughDate !== null && today.postedThroughDate >= today.localDate) {
      context.addIssue({
        code: 'custom',
        message: 'The posted flexible-time balance must be bounded before the current local date.',
        path: ['postedThroughDate'],
      });
    }
  });

export const todayAttendanceEnvelopeSchema = createSuccessEnvelopeSchema(todayAttendanceSchema);

export const clockInRequestSchema = z.strictObject({
  expectedAttendanceRevision: z.number().int().safe().min(0),
});

export const startBreakRequestSchema = clockInRequestSchema;
export const resumeAttendanceRequestSchema = clockInRequestSchema;
export const clockOutRequestSchema = z.strictObject({
  confirmActiveBreak: z.boolean().optional(),
  expectedAttendanceRevision: z.number().int().safe().min(0),
});

const attendanceResultShape = {
  attendanceRevision: z.number().int().safe().min(1),
  occurredAt: instantSchema,
  validActions: z.array(attendanceCommandSchema).max(3),
};

const punchResult = <Type extends (typeof PUNCH_EVENT_TYPES)[number]>(type: Type) =>
  z.strictObject({ id: opaqueIdentifierSchema, type: z.literal(type) });

export const clockInResultSchema = z.strictObject({
  ...attendanceResultShape,
  command: z.literal('CLOCK_IN'),
  createdEvents: z.tuple([punchResult('CLOCK_IN')]),
  resultingState: z.literal('WORKING'),
});

export const startBreakResultSchema = z.strictObject({
  ...attendanceResultShape,
  command: z.literal('START_BREAK'),
  createdEvents: z.tuple([punchResult('BREAK_START')]),
  resultingState: z.literal('ON_BREAK'),
});

export const resumeAttendanceResultSchema = z.strictObject({
  ...attendanceResultShape,
  command: z.literal('RESUME'),
  createdEvents: z.tuple([punchResult('BREAK_END')]),
  resultingState: z.literal('WORKING'),
});

export const clockOutResultSchema = z.strictObject({
  ...attendanceResultShape,
  command: z.literal('CLOCK_OUT'),
  createdEvents: z.union([
    z.tuple([punchResult('CLOCK_OUT')]),
    z.tuple([punchResult('BREAK_END'), punchResult('CLOCK_OUT')]),
  ]),
  resultingState: z.literal('OFF_WORK'),
});

export const attendanceCommandResultSchema = z.discriminatedUnion('command', [
  clockInResultSchema,
  startBreakResultSchema,
  resumeAttendanceResultSchema,
  clockOutResultSchema,
]);

export const clockInEnvelopeSchema = createSuccessEnvelopeSchema(clockInResultSchema);
export const startBreakEnvelopeSchema = createSuccessEnvelopeSchema(startBreakResultSchema);
export const resumeAttendanceEnvelopeSchema = createSuccessEnvelopeSchema(
  resumeAttendanceResultSchema,
);
export const clockOutEnvelopeSchema = createSuccessEnvelopeSchema(clockOutResultSchema);

export type AttendanceCommand = z.infer<typeof attendanceCommandSchema>;
export type AttendanceCommandResult = z.infer<typeof attendanceCommandResultSchema>;
export type AttendanceState = z.infer<typeof attendanceStateSchema>;
export type CalculationBlockerCode = z.infer<typeof calculationBlockerCodeSchema>;
export type CalculationWarningCode = z.infer<typeof calculationWarningCodeSchema>;
export type ClockInRequest = z.infer<typeof clockInRequestSchema>;
export type ClockInResult = z.infer<typeof clockInResultSchema>;
export type ClockOutRequest = z.infer<typeof clockOutRequestSchema>;
export type ClockOutResult = z.infer<typeof clockOutResultSchema>;
export type ResumeAttendanceRequest = z.infer<typeof resumeAttendanceRequestSchema>;
export type ResumeAttendanceResult = z.infer<typeof resumeAttendanceResultSchema>;
export type StartBreakRequest = z.infer<typeof startBreakRequestSchema>;
export type StartBreakResult = z.infer<typeof startBreakResultSchema>;
export type TodayAttendance = z.infer<typeof todayAttendanceSchema>;
export type TodayActionAvailability = z.infer<typeof todayActionAvailabilitySchema>;
export type TodayAppliedCorrection = z.infer<typeof todayAppliedCorrectionSchema>;
export type TodayAttentionItem = z.infer<typeof todayAttentionItemSchema>;
export type TodayAttentionRecovery = z.infer<typeof todayAttentionRecoverySchema>;
export type TodayCalculationSources = z.infer<typeof todayCalculationSourcesSchema>;
export type TodayProvisionalCalculation = z.infer<typeof todayProvisionalCalculationSchema>;
export type TodayTimelineEvent = z.infer<typeof todayTimelineEventSchema>;
