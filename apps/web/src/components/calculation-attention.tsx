import type {
  CalculationBlockerCode,
  CalculationWarningCode,
  DailyTimeAttention,
} from '@workledger/contracts';
import type { MessageKey } from '@workledger/i18n';
import { useWorkLedgerMessage } from '@workledger/i18n/react';
import { Alert } from '@workledger/ui';

type AttentionItem = Readonly<{
  action: MessageKey;
  description: MessageKey;
  href: 'BALANCE' | 'CALCULATION' | 'FIX_ENTRY' | 'MY_TIME' | 'REQUESTS';
  title: MessageKey;
}>;

const BLOCKER_ATTENTION: Readonly<Record<CalculationBlockerCode, AttentionItem>> = {
  ABSENCE_APPROVAL_PENDING: {
    action: 'employee.today.attention.recovery.reviewRequest',
    description: 'employee.records.attention.description.absenceApprovalPending',
    href: 'REQUESTS',
    title: 'employee.today.attention.descriptor.absenceApprovalPending.title',
  },
  ATTENDANCE_INCOMPLETE: {
    action: 'employee.today.attention.recovery.fixEntry',
    description: 'employee.records.attention.description.attendanceIncomplete',
    href: 'FIX_ENTRY',
    title: 'employee.today.attention.descriptor.attendanceIncomplete.title',
  },
  ATTENDANCE_INVALID_EVENT_ORDER: {
    action: 'employee.today.attention.recovery.fixEntry',
    description: 'employee.records.attention.description.attendanceInvalidEventOrder',
    href: 'FIX_ENTRY',
    title: 'employee.today.attention.descriptor.attendanceInvalidEventOrder.title',
  },
  ATTENDANCE_INVALID_EVENT_PRECISION: {
    action: 'employee.today.attention.recovery.fixEntry',
    description: 'employee.records.attention.description.attendanceInvalidEventPrecision',
    href: 'FIX_ENTRY',
    title: 'employee.today.attention.descriptor.attendanceInvalidEventPrecision.title',
  },
  ATTENDANCE_OVERLAP: {
    action: 'employee.today.attention.recovery.fixEntry',
    description: 'employee.records.attention.description.attendanceOverlap',
    href: 'FIX_ENTRY',
    title: 'employee.today.attention.descriptor.attendanceOverlap.title',
  },
  CORRECTION_UNRESOLVED: {
    action: 'employee.today.attention.recovery.reviewRequest',
    description: 'employee.records.attention.description.correctionUnresolved',
    href: 'REQUESTS',
    title: 'employee.today.attention.descriptor.correctionUnresolved.title',
  },
  LEDGER_SOURCE_MISMATCH: {
    action: 'employee.records.attention.action.reviewPeriod',
    description: 'employee.records.attention.description.ledgerSourceMismatch',
    href: 'MY_TIME',
    title: 'employee.today.attention.descriptor.ledgerSourceMismatch.title',
  },
  POLICY_ASSIGNMENT_OVERLAP: {
    action: 'employee.records.attention.action.reviewPeriod',
    description: 'employee.records.attention.description.policyAssignmentOverlap',
    href: 'MY_TIME',
    title: 'employee.today.attention.descriptor.policyAssignmentOverlap.title',
  },
  POLICY_CONFIGURATION_INVALID: {
    action: 'employee.records.attention.action.reviewPeriod',
    description: 'employee.records.attention.description.policyConfigurationInvalid',
    href: 'MY_TIME',
    title: 'employee.today.attention.descriptor.policyConfigurationInvalid.title',
  },
  POLICY_NOT_ASSIGNED: {
    action: 'employee.records.attention.action.reviewPeriod',
    description: 'employee.records.attention.description.policyNotAssigned',
    href: 'MY_TIME',
    title: 'employee.today.attention.descriptor.policyNotAssigned.title',
  },
  SCHEDULE_ASSIGNMENT_OVERLAP: {
    action: 'employee.records.attention.action.reviewPeriod',
    description: 'employee.records.attention.description.scheduleAssignmentOverlap',
    href: 'MY_TIME',
    title: 'employee.today.attention.descriptor.scheduleAssignmentOverlap.title',
  },
  SCHEDULE_NOT_ASSIGNED: {
    action: 'employee.records.attention.action.reviewPeriod',
    description: 'employee.records.attention.description.scheduleNotAssigned',
    href: 'MY_TIME',
    title: 'employee.today.attention.descriptor.scheduleNotAssigned.title',
  },
};

const WARNING_ATTENTION: Readonly<Record<CalculationWarningCode, AttentionItem>> = {
  FLEX_NEGATIVE_THRESHOLD_EXCEEDED: {
    action: 'employee.today.attention.recovery.reviewBalanceHistory',
    description: 'employee.records.attention.description.flexNegativeDaily',
    href: 'BALANCE',
    title: 'employee.today.attention.descriptor.flexNegative.title',
  },
  FLEX_POSITIVE_THRESHOLD_EXCEEDED: {
    action: 'employee.today.attention.recovery.reviewBalanceHistory',
    description: 'employee.records.attention.description.flexPositiveDaily',
    href: 'BALANCE',
    title: 'employee.today.attention.descriptor.flexPositive.title',
  },
  WORK_DURING_ABSENCE: {
    action: 'employee.today.attention.recovery.fixEntry',
    description: 'employee.records.attention.description.workDuringAbsence',
    href: 'FIX_ENTRY',
    title: 'employee.today.attention.descriptor.workDuringAbsence.title',
  },
  WORK_ON_HOLIDAY: {
    action: 'employee.today.attention.recovery.reviewCalculation',
    description: 'employee.records.attention.description.workOnHoliday',
    href: 'CALCULATION',
    title: 'employee.today.attention.descriptor.workOnHoliday.title',
  },
  WORK_ON_ZERO_EXPECTED_DAY: {
    action: 'employee.today.attention.recovery.reviewCalculation',
    description: 'employee.records.attention.description.workOnZeroExpectedDay',
    href: 'CALCULATION',
    title: 'employee.today.attention.descriptor.workOnZeroExpectedDay.title',
  },
};

export function CalculationAttention({
  attention,
  balanceHref,
  calculationHref,
  fixEntryHref,
  myTimeHref,
  onCalculationDetailsRequest,
  requestHref,
  thresholdBasis = 'DAILY_BALANCE',
}: Readonly<{
  attention: DailyTimeAttention;
  balanceHref: string;
  calculationHref: string;
  fixEntryHref: string;
  myTimeHref: string;
  onCalculationDetailsRequest?: () => void;
  requestHref: string;
  thresholdBasis?: 'DAILY_BALANCE' | 'POSTED_BALANCE';
}>) {
  const t = useWorkLedgerMessage();
  if (attention.blockers.length === 0 && attention.warnings.length === 0) return null;
  return (
    <section className="grid gap-4" aria-labelledby="calculation-attention-title">
      <h2 id="calculation-attention-title" className="m-0 text-2xl font-bold">
        {t('employee.today.attention.title')}
      </h2>
      {attention.blockers.length === 0 ? null : (
        <AttentionGroup
          items={attention.blockers.map((code) => BLOCKER_ATTENTION[code])}
          kind="blocker"
          links={{ balanceHref, calculationHref, fixEntryHref, myTimeHref, requestHref }}
          {...(onCalculationDetailsRequest === undefined ? {} : { onCalculationDetailsRequest })}
          title={t('employee.records.attention.blockers')}
        />
      )}
      {attention.warnings.length === 0 ? null : (
        <AttentionGroup
          items={attention.warnings.map((code) => warningAttention(code, thresholdBasis))}
          kind="warning"
          links={{ balanceHref, calculationHref, fixEntryHref, myTimeHref, requestHref }}
          {...(onCalculationDetailsRequest === undefined ? {} : { onCalculationDetailsRequest })}
          title={t('employee.today.attention.warnings')}
        />
      )}
    </section>
  );
}

function warningAttention(
  code: CalculationWarningCode,
  thresholdBasis: 'DAILY_BALANCE' | 'POSTED_BALANCE',
): AttentionItem {
  const item = WARNING_ATTENTION[code];
  if (
    thresholdBasis === 'DAILY_BALANCE' ||
    (code !== 'FLEX_NEGATIVE_THRESHOLD_EXCEEDED' && code !== 'FLEX_POSITIVE_THRESHOLD_EXCEEDED')
  ) {
    return item;
  }
  return {
    ...item,
    description:
      code === 'FLEX_NEGATIVE_THRESHOLD_EXCEEDED'
        ? 'employee.records.attention.description.flexNegativePosted'
        : 'employee.records.attention.description.flexPositivePosted',
  };
}

function AttentionGroup({
  items,
  kind,
  links,
  onCalculationDetailsRequest,
  title,
}: Readonly<{
  items: readonly AttentionItem[];
  kind: 'blocker' | 'warning';
  links: Readonly<{
    balanceHref: string;
    calculationHref: string;
    fixEntryHref: string;
    myTimeHref: string;
    requestHref: string;
  }>;
  onCalculationDetailsRequest?: () => void;
  title: string;
}>) {
  const t = useWorkLedgerMessage();
  return (
    <Alert
      announce={false}
      headingLevel="h3"
      title={title}
      tone={kind === 'blocker' ? 'danger' : 'warning'}
    >
      <ul className="mb-0 mt-3 grid gap-3 pl-5">
        {items.map((item) => (
          <li key={item.title} className="grid gap-1">
            <strong>{t(item.title)}</strong>
            <span>{t(item.description)}</span>
            <a
              href={links[actionHrefKey(item.href)]}
              onClick={item.href === 'CALCULATION' ? onCalculationDetailsRequest : undefined}
            >
              {t(item.action)}
            </a>
          </li>
        ))}
      </ul>
    </Alert>
  );
}

function actionHrefKey(
  href: AttentionItem['href'],
): 'balanceHref' | 'calculationHref' | 'fixEntryHref' | 'myTimeHref' | 'requestHref' {
  switch (href) {
    case 'BALANCE':
      return 'balanceHref';
    case 'CALCULATION':
      return 'calculationHref';
    case 'FIX_ENTRY':
      return 'fixEntryHref';
    case 'MY_TIME':
      return 'myTimeHref';
    case 'REQUESTS':
      return 'requestHref';
  }
}
