import type {
  CalculationBlockerCode,
  CalculationWarningCode,
  SupportedLocale,
} from '@workledger/contracts';
import type {
  InsightFact,
  InsightKind,
  InsightPeriod,
  InsightSource,
  InsightVisibleContext,
} from '@workledger/contracts/insights';
import { formatDateOnly, type MessageArguments, type MessageKey } from '@workledger/i18n';

import { attentionPresentation } from './presentation-codes.js';

type MessageTranslator = <Key extends MessageKey>(
  key: Key,
  ...args: MessageArguments<Key>
) => string;
type InsightFactQualifier = InsightFact['qualifiers'][number];
type InsightNativeActionDestination = InsightSource['destination'];
type InsightSourceKind = InsightSource['kind'];
type InsightContextKind = InsightVisibleContext['kind'];

const INSIGHT_KIND_KEYS = {
  'balance-change': {
    description: 'employee.insights.kind.balanceChange.description',
    title: 'employee.insights.kind.balanceChange.title',
  },
  'leave-projection': {
    description: 'employee.insights.kind.leaveProjection.description',
    title: 'employee.insights.kind.leaveProjection.title',
  },
  'submission-blockers': {
    description: 'employee.insights.kind.submissionBlockers.description',
    title: 'employee.insights.kind.submissionBlockers.title',
  },
  'today-explanation': {
    description: 'employee.insights.kind.todayExplanation.description',
    title: 'employee.insights.kind.todayExplanation.title',
  },
  'manager-action-summary': {
    description: 'manager.insights.kind.actionSummary.description',
    title: 'manager.insights.kind.actionSummary.title',
  },
  'team-coverage': {
    description: 'manager.insights.kind.teamCoverage.description',
    title: 'manager.insights.kind.teamCoverage.title',
  },
} as const satisfies Readonly<
  Record<InsightKind, Readonly<{ description: MessageKey; title: MessageKey }>>
>;

const FACT_LABEL_KEYS: Readonly<Record<string, MessageKey>> = {
  BALANCE_CHANGE_MINUTES: 'employee.insights.fact.balanceChange',
  BALANCE_CLOSING_MINUTES: 'employee.insights.fact.balanceClosing',
  BALANCE_INCOMPLETE_DATE_COUNT: 'employee.insights.fact.balanceIncompleteDates',
  BALANCE_OPENING_MINUTES: 'employee.insights.fact.balanceOpening',
  LEAVE_ACCOUNT_COUNT: 'employee.insights.fact.leaveAccountCount',
  LEAVE_AVAILABLE_MINUTES: 'employee.insights.fact.leaveAvailable',
  LEAVE_PROJECTED_REMAINING_MINUTES: 'employee.insights.fact.leaveProjectedRemaining',
  LEAVE_PROJECTION_AVAILABLE: 'employee.insights.fact.leaveProjectionAvailable',
  LEAVE_RESERVED_MINUTES: 'employee.insights.fact.leaveReserved',
  MONTHLY_COMPLETE_DATE_COUNT: 'employee.insights.fact.monthlyCompleteDates',
  MONTHLY_COVERED_DATE_COUNT: 'employee.insights.fact.monthlyCoveredDates',
  MONTHLY_READINESS_STATUS: 'employee.insights.fact.monthlyReadiness',
  MONTHLY_WORKFLOW_STATUS: 'employee.insights.fact.monthlyWorkflow',
  MONTH_ENDED: 'employee.insights.fact.monthEnded',
  POSTED_BALANCE_MINUTES: 'employee.insights.fact.postedBalance',
  SUBMISSION_BLOCKER: 'employee.insights.fact.submissionBlocker',
  SUBMISSION_BLOCKERS_AVAILABLE: 'employee.insights.fact.submissionBlockersAvailable',
  SUBMISSION_BLOCKER_COUNT: 'employee.insights.fact.submissionBlockerCount',
  TODAY_ABSENCE_CREDIT_MINUTES: 'employee.insights.fact.todayAbsenceCredit',
  TODAY_ABSENCE_EXPECTED_REDUCTION_MINUTES: 'employee.insights.fact.todayAbsenceExpectedReduction',
  TODAY_ACTIVE_ELAPSED_MINUTES: 'employee.insights.fact.todayActiveElapsed',
  TODAY_APPROVED_CORRECTION_MINUTES: 'employee.insights.fact.todayApprovedCorrection',
  TODAY_ATTENDANCE_STATE: 'employee.insights.fact.todayAttendanceState',
  TODAY_ATTENTION: 'employee.insights.fact.todayAttention',
  TODAY_BREAK_MINUTES: 'employee.insights.fact.todayBreak',
  TODAY_CALCULATION_STATUS: 'employee.insights.fact.todayCalculationStatus',
  TODAY_CREDITED_MINUTES: 'employee.insights.fact.todayCredited',
  TODAY_DIFFERENCE_MINUTES: 'employee.insights.fact.todayDifference',
  TODAY_ESTIMATED_FINISH_AT: 'employee.insights.fact.todayEstimatedFinish',
  TODAY_EXPECTED_MINUTES: 'employee.insights.fact.todayExpected',
  TODAY_EXPLANATION_AVAILABLE: 'employee.insights.fact.todayExplanationAvailable',
  TODAY_HOLIDAY_EXPECTED_REDUCTION_MINUTES: 'employee.insights.fact.todayHolidayExpectedReduction',
  TODAY_OTHER_APPROVED_ADJUSTMENT_MINUTES: 'employee.insights.fact.todayOtherApprovedAdjustment',
  TODAY_REMAINING_EXPECTED_MINUTES: 'employee.insights.fact.todayRemainingExpected',
  TODAY_SCHEDULED_MINUTES: 'employee.insights.fact.todayScheduled',
  TODAY_WORKED_MINUTES: 'employee.insights.fact.todayWorked',
  MANAGER_ACTION_REQUIRED_COUNT: 'manager.insights.fact.actionRequired',
  MANAGER_INSIGHT_AVAILABLE: 'manager.insights.fact.available',
  TEAM_MEMBER_COUNT: 'manager.insights.fact.teamMembers',
  TEAM_OFF_WORK_COUNT: 'manager.insights.fact.offWork',
  TEAM_ON_BREAK_COUNT: 'manager.insights.fact.onBreak',
  TEAM_UNAVAILABLE_COUNT: 'manager.insights.fact.unavailable',
  TEAM_UNRESOLVED_RECORD_COUNT: 'manager.insights.fact.unresolvedRecords',
  TEAM_WORKING_COUNT: 'manager.insights.fact.working',
};

const QUALIFIER_KEYS = {
  CURRENT: 'employee.insights.qualifier.current',
  INCOMPLETE: 'employee.insights.qualifier.incomplete',
  POSTED: 'employee.insights.qualifier.posted',
  PROJECTED: 'employee.insights.qualifier.projected',
  PROVISIONAL: 'employee.insights.qualifier.provisional',
  RESERVED: 'employee.insights.qualifier.reserved',
  SUPPRESSED: 'employee.insights.qualifier.suppressed',
  UNAVAILABLE: 'employee.insights.qualifier.unavailable',
} as const satisfies Readonly<Record<InsightFactQualifier, MessageKey>>;

const SOURCE_KIND_KEYS = {
  DAILY_TIME_RECORD: 'employee.insights.source.dailyTimeRecord',
  LEAVE_ENTITLEMENT_LEDGER: 'employee.insights.source.leaveEntitlementLedger',
  MONTHLY_PERIOD: 'employee.insights.source.monthlyPeriod',
  PERSONAL_REQUEST: 'employee.insights.source.personalRequest',
  REPORT: 'employee.insights.source.report',
  TIME_ACCOUNT_LEDGER: 'employee.insights.source.timeAccountLedger',
  TODAY_ATTENDANCE: 'employee.insights.source.todayAttendance',
  APPROVAL_INBOX: 'shared.route.title.approvalInbox',
  TEAM_STATUS: 'shared.route.title.teamStatus',
} as const satisfies Readonly<Record<InsightSourceKind, MessageKey>>;

const DESTINATION_KEYS = {
  MONTHLY_REVIEW: 'employee.insights.destination.monthlyReview',
  MY_BALANCES: 'employee.insights.destination.myBalances',
  MY_REQUESTS: 'employee.insights.destination.myRequests',
  MY_TIME: 'employee.insights.destination.myTime',
  REPORTS: 'employee.insights.destination.reports',
  TODAY: 'employee.insights.destination.today',
  APPROVAL_INBOX: 'shared.route.title.approvalInbox',
  TEAM_STATUS: 'shared.route.title.teamStatus',
} as const satisfies Readonly<Record<InsightNativeActionDestination, MessageKey>>;

const CONTEXT_KEYS = {
  MY_BALANCES: 'shared.route.title.myBalances',
  MY_REQUESTS: 'shared.route.title.requests',
  MY_TIME: 'shared.route.title.myTime',
  REPORTS: 'shared.route.title.reports',
  TODAY: 'shared.route.title.today',
} as const satisfies Readonly<Record<InsightContextKind, MessageKey>>;

const LIMITATION_KEYS: Readonly<Record<string, MessageKey>> = {
  INCOMPLETE_DATES_EXCLUDED_FROM_PROJECTION: 'employee.insights.limitation.incompleteDatesExcluded',
  LEAVE_ACCOUNT_DETAILS_LIMITED: 'employee.insights.limitation.leaveAccountDetailsLimited',
  LEAVE_ENTITLEMENT_NOT_AVAILABLE: 'employee.insights.limitation.leaveEntitlementNotAvailable',
  MONTHLY_PERIOD_NOT_AVAILABLE: 'employee.insights.limitation.monthlyPeriodNotAvailable',
  MONTH_NOT_ENDED: 'employee.insights.limitation.monthNotEnded',
  REQUESTED_DATE_IS_NOT_TODAY: 'employee.insights.limitation.requestedDateNotToday',
  SUBMISSION_BLOCKER_DETAILS_LIMITED:
    'employee.insights.limitation.submissionBlockerDetailsLimited',
  SUBMISSION_NOT_AVAILABLE_IN_CURRENT_STATE: 'employee.insights.limitation.submissionNotAvailable',
  TODAY_CALCULATION_INCOMPLETE: 'employee.insights.limitation.todayCalculationIncomplete',
  TODAY_TIMELINE_TRUNCATED: 'employee.insights.limitation.todayTimelineTruncated',
  TODAY_VALUES_PROVISIONAL: 'employee.insights.limitation.todayValuesProvisional',
  ACTION_SUMMARY_DATE_NOT_CURRENT: 'manager.insights.limitation.currentDateOnly',
  TEAM_COVERAGE_DATE_NOT_CURRENT: 'manager.insights.limitation.currentDateOnly',
};

const STATE_KEYS: Readonly<Record<string, MessageKey>> = {
  COMPLETE: 'employee.insights.state.complete',
  INCOMPLETE: 'employee.insights.state.incomplete',
  LOCKED: 'shared.workflow.status.locked',
  OFF_WORK: 'employee.today.attendance.state.offWork',
  ON_BREAK: 'employee.today.attendance.state.onBreak',
  OPEN: 'shared.workflow.status.open',
  PROVISIONAL: 'employee.insights.state.provisional',
  READY_FOR_SUBMISSION: 'employee.monthly.readiness.label.ready',
  SUBMITTED: 'shared.workflow.status.submitted',
  APPROVED: 'shared.workflow.status.approved',
  CHANGES_REQUESTED: 'shared.workflow.status.changesRequested',
  WORKING: 'employee.today.attendance.state.working',
};

type AttentionCode = CalculationBlockerCode | CalculationWarningCode;

const ATTENTION_CODES: ReadonlySet<string> = new Set([
  'ABSENCE_APPROVAL_PENDING',
  'ATTENDANCE_INCOMPLETE',
  'ATTENDANCE_INVALID_EVENT_ORDER',
  'ATTENDANCE_INVALID_EVENT_PRECISION',
  'ATTENDANCE_OVERLAP',
  'CORRECTION_UNRESOLVED',
  'FLEX_NEGATIVE_THRESHOLD_EXCEEDED',
  'FLEX_POSITIVE_THRESHOLD_EXCEEDED',
  'LEDGER_SOURCE_MISMATCH',
  'POLICY_ASSIGNMENT_OVERLAP',
  'POLICY_CONFIGURATION_INVALID',
  'POLICY_NOT_ASSIGNED',
  'SCHEDULE_ASSIGNMENT_OVERLAP',
  'SCHEDULE_NOT_ASSIGNED',
  'WORK_DURING_ABSENCE',
  'WORK_ON_HOLIDAY',
  'WORK_ON_ZERO_EXPECTED_DAY',
]);

export function insightKindPresentation(kind: InsightKind, t: MessageTranslator) {
  const keys = INSIGHT_KIND_KEYS[kind];
  return Object.freeze({ description: t(keys.description), title: t(keys.title) });
}

export function insightFactLabel(code: string, t: MessageTranslator): string {
  const key = FACT_LABEL_KEYS[code];
  return key === undefined ? t('employee.insights.fact.unrecognized') : t(key);
}

export function insightQualifierLabel(
  qualifier: InsightFactQualifier,
  t: MessageTranslator,
): string {
  return t(QUALIFIER_KEYS[qualifier]);
}

export function insightSourceKindLabel(kind: InsightSourceKind, t: MessageTranslator): string {
  return t(SOURCE_KIND_KEYS[kind]);
}

export function insightDestinationLabel(
  destination: InsightNativeActionDestination,
  t: MessageTranslator,
): string {
  return t(DESTINATION_KEYS[destination]);
}

export function insightContextLabel(kind: InsightContextKind, t: MessageTranslator): string {
  return t(CONTEXT_KEYS[kind]);
}

export function formatInsightPeriod(
  period: InsightPeriod,
  locale: SupportedLocale,
  t: MessageTranslator,
): string {
  switch (period.kind) {
    case 'DATE':
      return formatDateOnly(locale, period.date);
    case 'DATE_RANGE':
      return t('employee.insights.period.range', {
        end: formatDateOnly(locale, period.endDate),
        start: formatDateOnly(locale, period.startDate),
      });
    case 'MONTH':
      return formatDateOnly(locale, period.monthStart, { month: 'long', year: 'numeric' });
  }
}

export function insightLimitationLabel(code: string, t: MessageTranslator): string {
  const key = LIMITATION_KEYS[code];
  return key === undefined ? t('employee.insights.limitation.unrecognized') : t(key);
}

export function insightStateLabel(fact: InsightFact, t: MessageTranslator): string {
  if (fact.value?.kind !== 'STATE') return t('employee.insights.value.unavailable');
  const value = fact.value.value;
  if (
    (fact.code === 'SUBMISSION_BLOCKER' || fact.code === 'TODAY_ATTENTION') &&
    isAttentionCode(value)
  ) {
    return attentionPresentation(value, t).title;
  }
  const key = STATE_KEYS[value];
  return key === undefined ? t('employee.insights.value.unrecognizedState') : t(key);
}

function isAttentionCode(value: string): value is AttentionCode {
  return ATTENTION_CODES.has(value);
}

export function insightDestinationPath(
  destination: InsightNativeActionDestination,
  period: InsightPeriod | undefined,
): string {
  if (destination === 'MY_REQUESTS') return '/requests';
  if (destination === 'APPROVAL_INBOX') return '/approvals';
  if (destination === 'TEAM_STATUS') return '/team';
  if (destination === 'REPORTS') return '/reports';
  if (destination === 'TODAY') return '/today';
  const base = destination === 'MY_BALANCES' ? '/my-balances' : '/my-time';
  if (period === undefined) return base;
  const date =
    period.kind === 'DATE'
      ? period.date
      : period.kind === 'DATE_RANGE'
        ? period.startDate
        : period.monthStart;
  const view = period.kind === 'MONTH' ? 'MONTH' : 'WEEK';
  const search = new URLSearchParams({ date, limit: '20', page: '1', view });
  return `${base}?${search.toString()}`;
}
