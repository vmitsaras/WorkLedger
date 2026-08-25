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
  asOf: Instant;
  attendanceRevision: number;
  attendanceState: AttendanceState;
  currentDay: CurrentDayAttendance;
  flexNegativeThresholdMinutes: NonNegativeMinutes | null;
  flexPositiveThresholdMinutes: NonNegativeMinutes | null;
  holidayName: string | null;
  localDate: LocalDate;
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

const attentionReasons: Readonly<Record<AttentionCode, string>> = {
  ABSENCE_APPROVAL_PENDING: 'An approval-required absence may still change this calculation.',
  ATTENDANCE_INCOMPLETE: 'One or more attendance intervals for this date are incomplete.',
  ATTENDANCE_INVALID_EVENT_ORDER: 'The attendance events cannot be reconstructed in a valid order.',
  ATTENDANCE_INVALID_EVENT_PRECISION:
    'A recorded attendance event is not aligned to a whole minute.',
  ATTENDANCE_OVERLAP: 'The derived attendance intervals overlap.',
  CORRECTION_UNRESOLVED: 'A submitted correction may still change this calculation.',
  FLEX_NEGATIVE_THRESHOLD_EXCEEDED:
    'The posted flexible-time balance is below the configured warning threshold.',
  FLEX_POSITIVE_THRESHOLD_EXCEEDED:
    'The posted flexible-time balance is above the configured warning threshold.',
  LEDGER_SOURCE_MISMATCH: 'The calculation source does not match its posted ledger evidence.',
  POLICY_ASSIGNMENT_OVERLAP: 'More than one time policy applies to this date.',
  POLICY_CONFIGURATION_INVALID: 'The assigned time policy cannot produce a reliable calculation.',
  POLICY_NOT_ASSIGNED: 'No time policy applies to this date.',
  SCHEDULE_ASSIGNMENT_OVERLAP: 'More than one work schedule applies to this date.',
  SCHEDULE_NOT_ASSIGNED: 'No work schedule applies to this date.',
  WORK_DURING_ABSENCE: 'Recorded work overlaps credited absence time.',
  WORK_ON_HOLIDAY: 'Work is recorded on a public holiday.',
  WORK_ON_ZERO_EXPECTED_DAY: 'Work is recorded on a day with no expected working time.',
};

const recoveryActions: Readonly<Record<AttentionCode, TodayAttentionItem['recoveryAction']>> = {
  ABSENCE_APPROVAL_PENDING: 'REVIEW_REQUESTS',
  ATTENDANCE_INCOMPLETE: 'REVIEW_TIMELINE',
  ATTENDANCE_INVALID_EVENT_ORDER: 'REVIEW_TIMELINE',
  ATTENDANCE_INVALID_EVENT_PRECISION: 'REVIEW_TIMELINE',
  ATTENDANCE_OVERLAP: 'REVIEW_TIMELINE',
  CORRECTION_UNRESOLVED: 'REVIEW_REQUESTS',
  FLEX_NEGATIVE_THRESHOLD_EXCEEDED: 'REVIEW_BALANCE',
  FLEX_POSITIVE_THRESHOLD_EXCEEDED: 'REVIEW_BALANCE',
  LEDGER_SOURCE_MISMATCH: 'CONTACT_ADMINISTRATOR',
  POLICY_ASSIGNMENT_OVERLAP: 'CONTACT_ADMINISTRATOR',
  POLICY_CONFIGURATION_INVALID: 'CONTACT_ADMINISTRATOR',
  POLICY_NOT_ASSIGNED: 'CONTACT_ADMINISTRATOR',
  SCHEDULE_ASSIGNMENT_OVERLAP: 'CONTACT_ADMINISTRATOR',
  SCHEDULE_NOT_ASSIGNED: 'CONTACT_ADMINISTRATOR',
  WORK_DURING_ABSENCE: 'REVIEW_TIMELINE',
  WORK_ON_HOLIDAY: 'REVIEW_CALCULATION',
  WORK_ON_ZERO_EXPECTED_DAY: 'REVIEW_CALCULATION',
};

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
      attentionItems: attentionCodes.map((code) => attentionItem(code, input.localDate)),
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
                approvedAdjustmentMinutes: estimate.approvedAdjustmentMinutes,
                breakMinutesToday: estimate.breakMinutes,
                holidayExpectedReductionMinutes: estimate.holidayExpectedReductionMinutes,
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
    code,
    reason: attentionReasons[code],
    recoveryAction: recoveryActions[code],
    severity: isBlocker ? 'BLOCKER' : 'WARNING',
    source: isThresholdWarning(code) ? 'POSTED_FLEX_BALANCE' : 'CURRENT_DAY_CALCULATION',
  });
}
