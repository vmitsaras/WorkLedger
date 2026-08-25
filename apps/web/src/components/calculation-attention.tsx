import type {
  CalculationBlockerCode,
  CalculationWarningCode,
  DailyTimeAttention,
} from '@workledger/contracts';
import { Alert } from '@workledger/ui';

type AttentionItem = Readonly<{
  action: string;
  description: string;
  href: 'BALANCE' | 'CALCULATION' | 'FIX_ENTRY' | 'MY_TIME' | 'REQUESTS';
  title: string;
}>;

const BLOCKER_ATTENTION: Readonly<Record<CalculationBlockerCode, AttentionItem>> = {
  ABSENCE_APPROVAL_PENDING: {
    action: 'Review request',
    description: 'An approval-required absence may still change this day’s calculation.',
    href: 'REQUESTS',
    title: 'Absence decision pending',
  },
  ATTENDANCE_INCOMPLETE: {
    action: 'Fix entry',
    description: 'One or more attendance intervals touching this date have not been completed.',
    href: 'FIX_ENTRY',
    title: 'Attendance entry incomplete',
  },
  ATTENDANCE_INVALID_EVENT_ORDER: {
    action: 'Fix entry',
    description: 'The recorded attendance events cannot be reconstructed in a valid order.',
    href: 'FIX_ENTRY',
    title: 'Attendance event order needs review',
  },
  ATTENDANCE_INVALID_EVENT_PRECISION: {
    action: 'Fix entry',
    description: 'A recorded attendance event is not aligned to a whole minute.',
    href: 'FIX_ENTRY',
    title: 'Attendance event time needs review',
  },
  ATTENDANCE_OVERLAP: {
    action: 'Fix entry',
    description: 'The derived attendance intervals overlap and cannot form a reliable calculation.',
    href: 'FIX_ENTRY',
    title: 'Attendance intervals overlap',
  },
  CORRECTION_UNRESOLVED: {
    action: 'Review request',
    description: 'A submitted correction can still change this day’s calculation.',
    href: 'REQUESTS',
    title: 'Correction decision pending',
  },
  LEDGER_SOURCE_MISMATCH: {
    action: 'Review affected period',
    description: 'The calculation source does not match its posted ledger evidence.',
    href: 'MY_TIME',
    title: 'Ledger reconciliation needed',
  },
  POLICY_ASSIGNMENT_OVERLAP: {
    action: 'Review affected period',
    description: 'More than one time policy applies to this date.',
    href: 'MY_TIME',
    title: 'Time-policy assignment overlap',
  },
  POLICY_CONFIGURATION_INVALID: {
    action: 'Review affected period',
    description: 'The assigned time policy cannot produce a reliable calculation.',
    href: 'MY_TIME',
    title: 'Time-policy configuration needs review',
  },
  POLICY_NOT_ASSIGNED: {
    action: 'Review affected period',
    description: 'No time policy applies to this date.',
    href: 'MY_TIME',
    title: 'Time policy missing',
  },
  SCHEDULE_ASSIGNMENT_OVERLAP: {
    action: 'Review affected period',
    description: 'More than one work schedule applies to this date.',
    href: 'MY_TIME',
    title: 'Work-schedule assignment overlap',
  },
  SCHEDULE_NOT_ASSIGNED: {
    action: 'Review affected period',
    description: 'No work schedule applies to this date.',
    href: 'MY_TIME',
    title: 'Work schedule missing',
  },
};

const WARNING_ATTENTION: Readonly<Record<CalculationWarningCode, AttentionItem>> = {
  FLEX_NEGATIVE_THRESHOLD_EXCEEDED: {
    action: 'View balance history',
    description: 'The daily balance is below your configured flexible-time warning threshold.',
    href: 'BALANCE',
    title: 'Negative flexible-time threshold reached',
  },
  FLEX_POSITIVE_THRESHOLD_EXCEEDED: {
    action: 'View balance history',
    description: 'The daily balance is above your configured flexible-time warning threshold.',
    href: 'BALANCE',
    title: 'Positive flexible-time threshold reached',
  },
  WORK_DURING_ABSENCE: {
    action: 'Fix entry',
    description: 'Recorded work overlaps credited absence time. No absence category is shown here.',
    href: 'FIX_ENTRY',
    title: 'Work overlaps credited absence',
  },
  WORK_ON_HOLIDAY: {
    action: 'Review calculation',
    description: 'Work is recorded on a public holiday and remains credited separately.',
    href: 'CALCULATION',
    title: 'Work recorded on a public holiday',
  },
  WORK_ON_ZERO_EXPECTED_DAY: {
    action: 'Review calculation',
    description: 'Work is recorded on a day with no expected working time.',
    href: 'CALCULATION',
    title: 'Work recorded on a zero-expected day',
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
  if (attention.blockers.length === 0 && attention.warnings.length === 0) return null;
  return (
    <section className="grid gap-4" aria-labelledby="calculation-attention-title">
      <h2 id="calculation-attention-title" className="m-0 text-2xl font-bold">
        Needs attention
      </h2>
      {attention.blockers.length === 0 ? null : (
        <AttentionGroup
          items={attention.blockers.map((code) => BLOCKER_ATTENTION[code])}
          kind="blocker"
          links={{ balanceHref, calculationHref, fixEntryHref, myTimeHref, requestHref }}
          {...(onCalculationDetailsRequest === undefined ? {} : { onCalculationDetailsRequest })}
          title="Calculation blockers"
        />
      )}
      {attention.warnings.length === 0 ? null : (
        <AttentionGroup
          items={attention.warnings.map((code) => warningAttention(code, thresholdBasis))}
          kind="warning"
          links={{ balanceHref, calculationHref, fixEntryHref, myTimeHref, requestHref }}
          {...(onCalculationDetailsRequest === undefined ? {} : { onCalculationDetailsRequest })}
          title="Warnings"
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
        ? 'The posted flexible-time balance is below your configured warning threshold.'
        : 'The posted flexible-time balance is above your configured warning threshold.',
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
            <strong>{item.title}</strong>
            <span>{item.description}</span>
            <a
              href={links[actionHrefKey(item.href)]}
              onClick={item.href === 'CALCULATION' ? onCalculationDetailsRequest : undefined}
            >
              {item.action}
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
