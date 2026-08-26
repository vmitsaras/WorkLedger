import type {
  ApiFieldErrorCode,
  CalculationBlockerCode,
  CalculationWarningCode,
  NotificationEvent,
  ReportKey,
  SelfSessionSummary,
  TodayAttentionRecovery,
} from '@workledger/contracts';
import { translate, type I18nRuntime, type MessageKey } from '@workledger/i18n';

type AttentionCode = CalculationBlockerCode | CalculationWarningCode;

type AttentionPresentation = Readonly<{
  reason: string;
  title: string;
  whatHappensNext: string;
}>;

const ATTENTION_PRESENTATION: Readonly<Record<AttentionCode, AttentionPresentation>> = {
  ABSENCE_APPROVAL_PENDING: {
    reason: 'An approval-required absence may still change this calculation.',
    title: 'Absence decision pending',
    whatHappensNext: 'The request remains pending until an authorized reviewer records a decision.',
  },
  ATTENDANCE_INCOMPLETE: recoveryPresentation('Attendance record incomplete'),
  ATTENDANCE_INVALID_EVENT_ORDER: recoveryPresentation('Attendance event order needs review'),
  ATTENDANCE_INVALID_EVENT_PRECISION: recoveryPresentation('Attendance event time needs review'),
  ATTENDANCE_OVERLAP: recoveryPresentation('Attendance intervals overlap'),
  CORRECTION_UNRESOLVED: {
    reason: 'A submitted correction may still change this calculation.',
    title: 'Correction request needs review',
    whatHappensNext:
      'The request page shows whether review or employee changes are next; original events stay unchanged until an approved correction is applied.',
  },
  FLEX_NEGATIVE_THRESHOLD_EXCEEDED: {
    reason: 'The posted flexible-time balance is below the configured warning threshold.',
    title: 'Negative flexible-time threshold reached',
    whatHappensNext:
      'The warning clears only after posted ledger entries bring the balance back within the configured threshold.',
  },
  FLEX_POSITIVE_THRESHOLD_EXCEEDED: {
    reason: 'The posted flexible-time balance is above the configured warning threshold.',
    title: 'Positive flexible-time threshold reached',
    whatHappensNext:
      'The warning clears only after posted ledger entries bring the balance back within the configured threshold.',
  },
  LEDGER_SOURCE_MISMATCH: administratorPresentation('Ledger reconciliation needed'),
  POLICY_ASSIGNMENT_OVERLAP: administratorPresentation('Time-policy assignment overlap'),
  POLICY_CONFIGURATION_INVALID: administratorPresentation('Time-policy configuration needs review'),
  POLICY_NOT_ASSIGNED: administratorPresentation('Time policy missing'),
  SCHEDULE_ASSIGNMENT_OVERLAP: administratorPresentation('Work-schedule assignment overlap'),
  SCHEDULE_NOT_ASSIGNED: administratorPresentation('Work schedule missing'),
  WORK_DURING_ABSENCE: recoveryPresentation('Work overlaps credited absence'),
  WORK_ON_HOLIDAY: calculationPresentation('Work recorded on a public holiday'),
  WORK_ON_ZERO_EXPECTED_DAY: calculationPresentation('Work recorded on a zero-expected day'),
};

const REPORT_PRESENTATION: Readonly<
  Record<ReportKey, Readonly<{ description: string; title: string }>>
> = {
  'monthly-time': {
    description:
      'Monthly expected, worked, credited, and balance minutes with workflow and post-lock adjustment context.',
    title: 'Monthly time',
  },
  'flexible-time': {
    description:
      'Opening, in-range change, and closing flexible-time balances from the append-only time account.',
    title: 'Flexible time',
  },
  leave: {
    description:
      'Leave availability, reservation, and projected balances without sickness classification or request detail.',
    title: 'Leave balances',
  },
  'missing-records': {
    description:
      'Incomplete daily records that need attention in the selected range, without private workflow detail.',
    title: 'Missing records',
  },
  'pending-approvals': {
    description:
      'Current actionable correction, absence, cancellation, and monthly approvals in reviewer scope.',
    title: 'Pending approvals',
  },
};

const NOTIFICATION_PRESENTATION: Readonly<
  Record<NotificationEvent, Readonly<{ body: string; title: string }>>
> = {
  ITEM_ACKNOWLEDGED: {
    body: 'An item you submitted was acknowledged.',
    title: 'Item acknowledged',
  },
  ITEM_APPROVED: { body: 'An item you submitted was approved.', title: 'Item approved' },
  ITEM_CHANGES_REQUESTED: {
    body: 'An item you submitted needs changes.',
    title: 'Changes requested',
  },
  ITEM_REJECTED: { body: 'An item you submitted was not approved.', title: 'Item not approved' },
};

const FIELD_ERROR_PRESENTATION: Readonly<Record<ApiFieldErrorCode, MessageKey>> = {
  INVALID_FORMAT: 'shared.validation.invalidFormat',
  INVALID_TYPE: 'shared.validation.invalidType',
  INVALID_VALUE: 'shared.validation.invalidValue',
  REQUIRED: 'shared.validation.required',
  UNKNOWN_FIELD: 'shared.validation.unknownField',
  VALUE_TOO_LARGE: 'shared.validation.valueTooLarge',
  VALUE_TOO_SMALL: 'shared.validation.valueTooSmall',
};
const FIELD_ERROR_ENGLISH: Readonly<Record<ApiFieldErrorCode, string>> = {
  INVALID_FORMAT: 'Use the required format.',
  INVALID_TYPE: 'Use the required value type.',
  INVALID_VALUE: 'Choose an allowed value.',
  REQUIRED: 'Enter a value.',
  UNKNOWN_FIELD: 'Remove fields that are not supported.',
  VALUE_TOO_LARGE: 'Use a smaller value.',
  VALUE_TOO_SMALL: 'Use a larger value.',
};

export function attentionPresentation(code: AttentionCode): AttentionPresentation {
  return ATTENTION_PRESENTATION[code];
}

export function attentionRecoveryLabel(recovery: TodayAttentionRecovery): string {
  switch (recovery.action) {
    case 'FIX_ENTRY':
      return 'Fix entry';
    case 'REVIEW_BALANCE_HISTORY':
      return 'View balance history';
    case 'REVIEW_CALCULATION':
      return 'Review calculation';
    case 'REVIEW_RECORD':
      return 'Review affected day';
    case 'REVIEW_REQUEST':
      return 'Review request';
    case 'REVIEW_TIMELINE':
      return 'Review timeline';
  }
}

export function fieldErrorPresentation(
  code: ApiFieldErrorCode,
  runtime: I18nRuntime | null,
): string {
  return runtime === null
    ? FIELD_ERROR_ENGLISH[code]
    : translate(runtime, FIELD_ERROR_PRESENTATION[code]);
}

export function notificationPresentation(
  event: NotificationEvent,
): Readonly<{ body: string; title: string }> {
  return NOTIFICATION_PRESENTATION[event];
}

export function reportPresentation(
  key: ReportKey,
): Readonly<{ description: string; title: string }> {
  return REPORT_PRESENTATION[key];
}

export function sessionDevicePresentation(
  session: Pick<SelfSessionSummary, 'browser' | 'platform'>,
): string {
  const browser =
    session.browser === 'UNRECOGNIZED'
      ? 'Unrecognized device'
      : session.browser === 'BROWSER'
        ? 'Browser'
        : `${session.browser.slice(0, 1)}${session.browser.slice(1).toLocaleLowerCase()}`;
  if (session.browser === 'UNRECOGNIZED' || session.platform === null) return browser;
  const platform =
    session.platform === 'IOS'
      ? 'iOS'
      : session.platform === 'MACOS'
        ? 'macOS'
        : `${session.platform.slice(0, 1)}${session.platform.slice(1).toLocaleLowerCase()}`;
  return `${browser} on ${platform}`;
}

function administratorPresentation(title: string): AttentionPresentation {
  return {
    reason: 'The assigned configuration cannot produce a reliable calculation.',
    title,
    whatHappensNext:
      'The record remains blocked until an authorized administrator resolves the configuration issue.',
  };
}

function calculationPresentation(title: string): AttentionPresentation {
  return {
    reason: 'Work is recorded on a day with no expected working time.',
    title,
    whatHappensNext: 'The calculation explanation confirms why this record needs review.',
  };
}

function recoveryPresentation(title: string): AttentionPresentation {
  return {
    reason: 'This attendance record needs correction before it can be relied on.',
    title,
    whatHappensNext:
      'Choose the affected day and submit a correction. Original events remain unchanged while the request is reviewed.',
  };
}
