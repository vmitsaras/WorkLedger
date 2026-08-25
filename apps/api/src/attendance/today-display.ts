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

const attentionTitles: Readonly<Record<AttentionCode, string>> = {
  ABSENCE_APPROVAL_PENDING: 'Absence decision pending',
  ATTENDANCE_INCOMPLETE: 'Attendance record incomplete',
  ATTENDANCE_INVALID_EVENT_ORDER: 'Attendance event order needs review',
  ATTENDANCE_INVALID_EVENT_PRECISION: 'Attendance event time needs review',
  ATTENDANCE_OVERLAP: 'Attendance intervals overlap',
  CORRECTION_UNRESOLVED: 'Correction request needs review',
  FLEX_NEGATIVE_THRESHOLD_EXCEEDED: 'Negative flexible-time threshold reached',
  FLEX_POSITIVE_THRESHOLD_EXCEEDED: 'Positive flexible-time threshold reached',
  LEDGER_SOURCE_MISMATCH: 'Ledger reconciliation needed',
  POLICY_ASSIGNMENT_OVERLAP: 'Time-policy assignment overlap',
  POLICY_CONFIGURATION_INVALID: 'Time-policy configuration needs review',
  POLICY_NOT_ASSIGNED: 'Time policy missing',
  SCHEDULE_ASSIGNMENT_OVERLAP: 'Work-schedule assignment overlap',
  SCHEDULE_NOT_ASSIGNED: 'Work schedule missing',
  WORK_DURING_ABSENCE: 'Work overlaps credited absence',
  WORK_ON_HOLIDAY: 'Work recorded on a public holiday',
  WORK_ON_ZERO_EXPECTED_DAY: 'Work recorded on a zero-expected day',
};

const attentionRecovery = {
  ABSENCE_APPROVAL_PENDING: {
    action: 'REVIEW_REQUEST',
    destination: 'MY_REQUESTS',
    label: 'Review request',
    statusAfterAction:
      'The request remains pending until an authorized reviewer records a decision.',
  },
  ATTENDANCE_INCOMPLETE: fixEntryRecovery(),
  ATTENDANCE_INVALID_EVENT_ORDER: fixEntryRecovery(),
  ATTENDANCE_INVALID_EVENT_PRECISION: fixEntryRecovery(),
  ATTENDANCE_OVERLAP: fixEntryRecovery(),
  CORRECTION_UNRESOLVED: {
    action: 'REVIEW_REQUEST',
    destination: 'MY_REQUESTS',
    label: 'Review request',
    statusAfterAction:
      'The request page shows whether review or employee changes are next; the original events stay unchanged until an approved correction is applied.',
  },
  FLEX_NEGATIVE_THRESHOLD_EXCEEDED: balanceRecovery(),
  FLEX_POSITIVE_THRESHOLD_EXCEEDED: balanceRecovery(),
  LEDGER_SOURCE_MISMATCH: administratorRecovery(
    'The record remains blocked until an authorized administrator reconciles the calculation and posted ledger evidence.',
  ),
  POLICY_ASSIGNMENT_OVERLAP: administratorRecovery(
    'The record remains blocked until an authorized administrator resolves the overlapping time-policy assignment.',
  ),
  POLICY_CONFIGURATION_INVALID: administratorRecovery(
    'The record remains blocked until an authorized administrator corrects the assigned time policy.',
  ),
  POLICY_NOT_ASSIGNED: administratorRecovery(
    'The record remains blocked until an authorized administrator assigns a time policy.',
  ),
  SCHEDULE_ASSIGNMENT_OVERLAP: administratorRecovery(
    'The record remains blocked until an authorized administrator resolves the overlapping work-schedule assignment.',
  ),
  SCHEDULE_NOT_ASSIGNED: administratorRecovery(
    'The record remains blocked until an authorized administrator assigns a work schedule.',
  ),
  WORK_DURING_ABSENCE: fixEntryRecovery(),
  WORK_ON_HOLIDAY: calculationRecovery(
    'The calculation explanation confirms why expected time is zero; reviewing it does not change the record.',
  ),
  WORK_ON_ZERO_EXPECTED_DAY: calculationRecovery(
    'The calculation explanation confirms why no working time was expected; reviewing it does not change the record.',
  ),
} satisfies Readonly<Record<AttentionCode, TodayAttentionItem['recovery']>>;

function fixEntryRecovery(): TodayAttentionItem['recovery'] {
  return Object.freeze({
    action: 'FIX_ENTRY',
    destination: 'MY_TIME',
    label: 'Fix entry',
    statusAfterAction:
      'Choose the affected day and submit a correction. Original events remain unchanged while the request is reviewed.',
  });
}

function balanceRecovery(): TodayAttentionItem['recovery'] {
  return Object.freeze({
    action: 'REVIEW_BALANCE_HISTORY',
    destination: 'MY_BALANCES',
    label: 'View balance history',
    statusAfterAction:
      'The warning clears only after posted ledger entries bring the balance back within the configured threshold.',
  });
}

function administratorRecovery(statusAfterAction: string): TodayAttentionItem['recovery'] {
  return Object.freeze({
    action: 'REVIEW_RECORD',
    destination: 'MY_TIME',
    label: 'Review affected day',
    statusAfterAction,
  });
}

function calculationRecovery(statusAfterAction: string): TodayAttentionItem['recovery'] {
  return Object.freeze({
    action: 'REVIEW_CALCULATION',
    destination: 'TODAY_CALCULATION',
    label: 'Review calculation',
    statusAfterAction,
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
    code,
    reason: attentionReasons[code],
    recovery: attentionRecovery[code],
    severity: isBlocker ? 'BLOCKER' : 'WARNING',
    source: isThresholdWarning(code) ? 'POSTED_FLEX_BALANCE' : 'CURRENT_DAY_CALCULATION',
    title: attentionTitles[code],
  });
}
