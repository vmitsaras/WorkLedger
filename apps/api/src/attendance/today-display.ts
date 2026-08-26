import {
  ATTENDANCE_COMMANDS,
  todayAttendanceSchema,
  type CalculationBlockerCode,
  type CalculationWarningCode,
  type TodayAttendance,
  type TodayAttentionItem,
  type TodayTimelineEvent,
} from '@workledger/contracts';
import {
  validAttendanceActions,
  type AttendanceState,
  type CurrentDayAttendance,
  type Instant,
  type LocalDate,
  type NonNegativeMinutes,
  type SignedMinutes,
  type TimeZoneId,
} from '@workledger/domain';

type AttentionCode = CalculationBlockerCode | CalculationWarningCode;

export type TodayDisplaySelectionInput = Readonly<{
  appliedCorrections: TodayAttendance['appliedCorrections'];
  asOf: Instant;
  approvedCorrectionMinutes: SignedMinutes;
  attendanceRevision: number;
  attendanceState: AttendanceState;
  currentDay: CurrentDayAttendance;
  flexNegativeThresholdMinutes: NonNegativeMinutes | null;
  flexPositiveThresholdMinutes: NonNegativeMinutes | null;
  holidayName: string | null;
  localDate: LocalDate;
  otherApprovedAdjustmentMinutes: SignedMinutes;
  postedFlexBalanceMinutes: SignedMinutes;
  postedThroughDate: LocalDate | null;
  snapshotCapturedAt: Instant;
  timeZone: TimeZoneId;
  timeline: readonly TodayTimelineEvent[];
  timelineTruncated: boolean;
}>;

const blockerCodes = new Set<AttentionCode>([
  'ABSENCE_APPROVAL_PENDING',
  'ATTENDANCE_INCOMPLETE',
  'ATTENDANCE_INVALID_EVENT_ORDER',
  'ATTENDANCE_INVALID_EVENT_PRECISION',
  'ATTENDANCE_OVERLAP',
  'CORRECTION_UNRESOLVED',
  'LEDGER_SOURCE_MISMATCH',
  'POLICY_ASSIGNMENT_OVERLAP',
  'POLICY_CONFIGURATION_INVALID',
  'POLICY_NOT_ASSIGNED',
  'SCHEDULE_ASSIGNMENT_OVERLAP',
  'SCHEDULE_NOT_ASSIGNED',
]);

const attentionRecovery = {
  ABSENCE_APPROVAL_PENDING: {
    action: 'REVIEW_REQUEST',
    destination: 'MY_REQUESTS',
  },
  ATTENDANCE_INCOMPLETE: fixEntryRecovery(),
  ATTENDANCE_INVALID_EVENT_ORDER: fixEntryRecovery(),
  ATTENDANCE_INVALID_EVENT_PRECISION: fixEntryRecovery(),
  ATTENDANCE_OVERLAP: fixEntryRecovery(),
  CORRECTION_UNRESOLVED: {
    action: 'REVIEW_REQUEST',
    destination: 'MY_REQUESTS',
  },
  FLEX_NEGATIVE_THRESHOLD_EXCEEDED: balanceRecovery(),
  FLEX_POSITIVE_THRESHOLD_EXCEEDED: balanceRecovery(),
  LEDGER_SOURCE_MISMATCH: administratorRecovery(),
  POLICY_ASSIGNMENT_OVERLAP: administratorRecovery(),
  POLICY_CONFIGURATION_INVALID: administratorRecovery(),
  POLICY_NOT_ASSIGNED: administratorRecovery(),
  SCHEDULE_ASSIGNMENT_OVERLAP: administratorRecovery(),
  SCHEDULE_NOT_ASSIGNED: administratorRecovery(),
  WORK_DURING_ABSENCE: fixEntryRecovery(),
  WORK_ON_HOLIDAY: calculationRecovery(),
  WORK_ON_ZERO_EXPECTED_DAY: calculationRecovery(),
} satisfies Readonly<Record<AttentionCode, TodayAttentionItem['recovery']>>;

function fixEntryRecovery(): TodayAttentionItem['recovery'] {
  return Object.freeze({
    action: 'FIX_ENTRY',
    destination: 'MY_TIME',
  });
}

function balanceRecovery(): TodayAttentionItem['recovery'] {
  return Object.freeze({
    action: 'REVIEW_BALANCE_HISTORY',
    destination: 'MY_BALANCES',
  });
}

function administratorRecovery(): TodayAttentionItem['recovery'] {
  return Object.freeze({
    action: 'REVIEW_RECORD',
    destination: 'MY_TIME',
  });
}

function calculationRecovery(): TodayAttentionItem['recovery'] {
  return Object.freeze({
    action: 'REVIEW_CALCULATION',
    destination: 'TODAY_CALCULATION',
  });
}

export function selectTodayAttendanceDisplay(input: TodayDisplaySelectionInput): TodayAttendance {
  const validActions = [...validAttendanceActions(input.attendanceState)];
  const thresholdWarnings = postedBalanceWarnings(input);
  const attentionCodes = [
    ...input.currentDay.blockers,
    ...input.currentDay.warnings.filter((code) => !isThresholdWarning(code)),
    ...thresholdWarnings,
  ];
  const estimate = input.currentDay.estimate;

  return todayAttendanceSchema.parse({
    appliedCorrections: input.appliedCorrections,
    asOf: input.asOf,
    attendance: {
      actionAvailability: ATTENDANCE_COMMANDS.map((command) =>
        validActions.includes(command)
          ? { available: true as const, blockingReason: null, command }
          : {
              available: false as const,
              blockingReason: 'CURRENT_ATTENDANCE_STATE' as const,
              command,
            },
      ),
      activeElapsedMinutes: input.currentDay.activeElapsedMinutes,
      activeSince: input.currentDay.activeSince,
      attendanceRevision: input.attendanceRevision,
      state: input.attendanceState,
      validActions,
    },
    calculation: {
      attentionItems: attentionCodes.map((code) =>
        attentionItem(
          code,
          isThresholdWarning(code) ? (input.postedThroughDate ?? input.localDate) : input.localDate,
        ),
      ),
      estimatedFinishAt: input.currentDay.estimatedFinishAt,
      estimatedFinishUnavailableReason: input.currentDay.estimatedFinishUnavailableReason,
      holidayName: input.holidayName,
      isPeriodPostedOrLocked: input.currentDay.isPeriodPostedOrLocked,
      provisional:
        estimate === null
          ? null
          : {
              calculationSources: {
                absenceCreditMinutes: estimate.absenceCreditMinutes,
                absenceExpectedReductionMinutes: estimate.absenceExpectedReductionMinutes,
                approvedCorrectionMinutes: input.approvedCorrectionMinutes,
                breakMinutesToday: estimate.breakMinutes,
                holidayExpectedReductionMinutes: estimate.holidayExpectedReductionMinutes,
                otherApprovedAdjustmentMinutes: input.otherApprovedAdjustmentMinutes,
                scheduledMinutes: estimate.scheduledMinutes,
                workedMinutesToday: estimate.workedMinutes,
              },
              creditedMinutesToday: estimate.creditedMinutes,
              expectedMinutesToday: estimate.expectedMinutes,
              provisionalDifferenceMinutes: estimate.dailyBalanceMinutes,
            },
      remainingExpectedMinutes: input.currentDay.remainingExpectedMinutes,
      status: input.currentDay.calculationStatus,
    },
    localDate: input.localDate,
    postedFlexBalanceMinutes: input.postedFlexBalanceMinutes,
    postedThroughDate: input.postedThroughDate,
    snapshotCapturedAt: input.snapshotCapturedAt,
    timeZone: input.timeZone,
    timeline: input.timeline,
    timelineTruncated: input.timelineTruncated,
  });
}

function postedBalanceWarnings(
  input: Pick<
    TodayDisplaySelectionInput,
    'flexNegativeThresholdMinutes' | 'flexPositiveThresholdMinutes' | 'postedFlexBalanceMinutes'
  >,
): readonly CalculationWarningCode[] {
  if (
    input.flexPositiveThresholdMinutes !== null &&
    input.postedFlexBalanceMinutes > input.flexPositiveThresholdMinutes
  ) {
    return Object.freeze(['FLEX_POSITIVE_THRESHOLD_EXCEEDED']);
  }
  if (
    input.flexNegativeThresholdMinutes !== null &&
    input.postedFlexBalanceMinutes < -input.flexNegativeThresholdMinutes
  ) {
    return Object.freeze(['FLEX_NEGATIVE_THRESHOLD_EXCEEDED']);
  }
  return Object.freeze([]);
}

function isThresholdWarning(
  code: AttentionCode,
): code is Extract<
  CalculationWarningCode,
  'FLEX_NEGATIVE_THRESHOLD_EXCEEDED' | 'FLEX_POSITIVE_THRESHOLD_EXCEEDED'
> {
  return code === 'FLEX_NEGATIVE_THRESHOLD_EXCEEDED' || code === 'FLEX_POSITIVE_THRESHOLD_EXCEEDED';
}

function attentionItem(code: AttentionCode, affectedDate: LocalDate): TodayAttentionItem {
  const isBlocker = blockerCodes.has(code);
  return Object.freeze({
    affectedDate,
    blocksSubmission: isBlocker,
    message: { code, parameters: {} },
    recovery: attentionRecovery[code],
    severity: isBlocker ? 'BLOCKER' : 'WARNING',
    source: isThresholdWarning(code) ? 'POSTED_FLEX_BALANCE' : 'CURRENT_DAY_CALCULATION',
  });
}
