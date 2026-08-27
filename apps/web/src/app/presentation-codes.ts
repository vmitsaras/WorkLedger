import type {
  ApiFieldErrorCode,
  CalculationBlockerCode,
  CalculationWarningCode,
  NotificationEvent,
  ReportKey,
  SelfSessionSummary,
  TodayAttentionRecovery,
} from '@workledger/contracts';
import {
  translate,
  type I18nRuntime,
  type MessageArguments,
  type MessageKey,
} from '@workledger/i18n';

type AttentionCode = CalculationBlockerCode | CalculationWarningCode;

type AttentionPresentation = Readonly<{
  reason: string;
  title: string;
  whatHappensNext: string;
}>;

type AttentionPresentationKeys = Readonly<{
  reason: MessageKey;
  title: MessageKey;
  whatHappensNext: MessageKey;
}>;

type MessageTranslator = <Key extends MessageKey>(
  key: Key,
  ...args: MessageArguments<Key>
) => string;

const ATTENTION_PRESENTATION: Readonly<Record<AttentionCode, AttentionPresentationKeys>> = {
  ABSENCE_APPROVAL_PENDING: {
    reason: 'employee.today.attention.descriptor.absenceApprovalPending.reason',
    title: 'employee.today.attention.descriptor.absenceApprovalPending.title',
    whatHappensNext: 'employee.today.attention.descriptor.absenceApprovalPending.next',
  },
  ATTENDANCE_INCOMPLETE: recoveryPresentation(
    'employee.today.attention.descriptor.attendanceIncomplete.title',
  ),
  ATTENDANCE_INVALID_EVENT_ORDER: recoveryPresentation(
    'employee.today.attention.descriptor.attendanceInvalidEventOrder.title',
  ),
  ATTENDANCE_INVALID_EVENT_PRECISION: recoveryPresentation(
    'employee.today.attention.descriptor.attendanceInvalidEventPrecision.title',
  ),
  ATTENDANCE_OVERLAP: recoveryPresentation(
    'employee.today.attention.descriptor.attendanceOverlap.title',
  ),
  CORRECTION_UNRESOLVED: {
    reason: 'employee.today.attention.descriptor.correctionUnresolved.reason',
    title: 'employee.today.attention.descriptor.correctionUnresolved.title',
    whatHappensNext: 'employee.today.attention.descriptor.correctionUnresolved.next',
  },
  FLEX_NEGATIVE_THRESHOLD_EXCEEDED: {
    reason: 'employee.today.attention.descriptor.flexNegative.reason',
    title: 'employee.today.attention.descriptor.flexNegative.title',
    whatHappensNext: 'employee.today.attention.descriptor.flexNegative.next',
  },
  FLEX_POSITIVE_THRESHOLD_EXCEEDED: {
    reason: 'employee.today.attention.descriptor.flexPositive.reason',
    title: 'employee.today.attention.descriptor.flexPositive.title',
    whatHappensNext: 'employee.today.attention.descriptor.flexPositive.next',
  },
  LEDGER_SOURCE_MISMATCH: administratorPresentation(
    'employee.today.attention.descriptor.ledgerSourceMismatch.title',
  ),
  POLICY_ASSIGNMENT_OVERLAP: administratorPresentation(
    'employee.today.attention.descriptor.policyAssignmentOverlap.title',
  ),
  POLICY_CONFIGURATION_INVALID: administratorPresentation(
    'employee.today.attention.descriptor.policyConfigurationInvalid.title',
  ),
  POLICY_NOT_ASSIGNED: administratorPresentation(
    'employee.today.attention.descriptor.policyNotAssigned.title',
  ),
  SCHEDULE_ASSIGNMENT_OVERLAP: administratorPresentation(
    'employee.today.attention.descriptor.scheduleAssignmentOverlap.title',
  ),
  SCHEDULE_NOT_ASSIGNED: administratorPresentation(
    'employee.today.attention.descriptor.scheduleNotAssigned.title',
  ),
  WORK_DURING_ABSENCE: recoveryPresentation(
    'employee.today.attention.descriptor.workDuringAbsence.title',
  ),
  WORK_ON_HOLIDAY: calculationPresentation(
    'employee.today.attention.descriptor.workOnHoliday.title',
  ),
  WORK_ON_ZERO_EXPECTED_DAY: calculationPresentation(
    'employee.today.attention.descriptor.workOnZeroExpectedDay.title',
  ),
};

const REPORT_PRESENTATION: Readonly<
  Record<ReportKey, Readonly<{ description: MessageKey; title: MessageKey }>>
> = {
  'monthly-time': {
    description: 'manager.report.catalog.monthlyTime.description',
    title: 'manager.report.catalog.monthlyTime.title',
  },
  'flexible-time': {
    description: 'manager.report.catalog.flexibleTime.description',
    title: 'manager.report.catalog.flexibleTime.title',
  },
  leave: {
    description: 'manager.report.catalog.leave.description',
    title: 'manager.report.catalog.leave.title',
  },
  'missing-records': {
    description: 'manager.report.catalog.missingRecords.description',
    title: 'manager.report.catalog.missingRecords.title',
  },
  'pending-approvals': {
    description: 'manager.report.catalog.pendingApprovals.description',
    title: 'manager.report.catalog.pendingApprovals.title',
  },
};

const NOTIFICATION_PRESENTATION: Readonly<
  Record<NotificationEvent, Readonly<{ body: MessageKey; title: MessageKey }>>
> = {
  ITEM_ACKNOWLEDGED: {
    body: 'employee.notifications.presentation.acknowledged.body',
    title: 'employee.notifications.presentation.acknowledged.title',
  },
  ITEM_APPROVED: {
    body: 'employee.notifications.presentation.approved.body',
    title: 'employee.notifications.presentation.approved.title',
  },
  ITEM_CHANGES_REQUESTED: {
    body: 'employee.notifications.presentation.changesRequested.body',
    title: 'employee.notifications.presentation.changesRequested.title',
  },
  ITEM_REJECTED: {
    body: 'employee.notifications.presentation.rejected.body',
    title: 'employee.notifications.presentation.rejected.title',
  },
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

export function attentionPresentation(
  code: AttentionCode,
  t: MessageTranslator,
): AttentionPresentation {
  const presentation = ATTENTION_PRESENTATION[code];
  return {
    reason: t(presentation.reason),
    title: t(presentation.title),
    whatHappensNext: t(presentation.whatHappensNext),
  };
}

export function attentionRecoveryLabel(
  recovery: TodayAttentionRecovery,
  t: MessageTranslator,
): string {
  switch (recovery.action) {
    case 'FIX_ENTRY':
      return t('employee.today.attention.recovery.fixEntry');
    case 'REVIEW_BALANCE_HISTORY':
      return t('employee.today.attention.recovery.reviewBalanceHistory');
    case 'REVIEW_CALCULATION':
      return t('employee.today.attention.recovery.reviewCalculation');
    case 'REVIEW_RECORD':
      return t('employee.today.attention.recovery.reviewRecord');
    case 'REVIEW_REQUEST':
      return t('employee.today.attention.recovery.reviewRequest');
    case 'REVIEW_TIMELINE':
      return t('employee.today.attention.recovery.reviewTimeline');
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
  t: MessageTranslator,
): Readonly<{ body: string; title: string }> {
  const presentation = NOTIFICATION_PRESENTATION[event];
  return { body: t(presentation.body), title: t(presentation.title) };
}

export function reportPresentation(
  key: ReportKey,
  t: MessageTranslator,
): Readonly<{ description: string; title: string }> {
  const presentation = REPORT_PRESENTATION[key];
  return { description: t(presentation.description), title: t(presentation.title) };
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

function administratorPresentation(title: MessageKey): AttentionPresentationKeys {
  return {
    reason: 'employee.today.attention.descriptor.administrator.reason',
    title,
    whatHappensNext: 'employee.today.attention.descriptor.administrator.next',
  };
}

function calculationPresentation(title: MessageKey): AttentionPresentationKeys {
  return {
    reason: 'employee.today.attention.descriptor.calculation.reason',
    title,
    whatHappensNext: 'employee.today.attention.descriptor.calculation.next',
  };
}

function recoveryPresentation(title: MessageKey): AttentionPresentationKeys {
  return {
    reason: 'employee.today.attention.descriptor.recovery.reason',
    title,
    whatHappensNext: 'employee.today.attention.descriptor.recovery.next',
  };
}
