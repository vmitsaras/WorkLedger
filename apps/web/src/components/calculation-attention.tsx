import type {
  CalculationBlockerCode,
  CalculationWarningCode,
  DailyTimeAttention,
} from '@workledger/contracts';

type AttentionItem = Readonly<{
  action: string;
  description: string;
  href: 'BALANCE' | 'CALCULATION' | 'EVENTS' | null;
  title: string;
}>;

const BLOCKER_ATTENTION: Readonly<Record<CalculationBlockerCode, AttentionItem>> = {
  ABSENCE_APPROVAL_PENDING: {
    action: 'Wait for the absence decision before relying on this record.',
    description: 'An approval-required absence may still change this day’s calculation.',
    href: null,
    title: 'Absence decision pending',
  },
  ATTENDANCE_INCOMPLETE: {
    action:
      'Review the recorded events. If the day is still open, use Today to record only the next valid attendance action.',
    description: 'One or more attendance intervals touching this date have not been completed.',
    href: 'EVENTS',
    title: 'Attendance entry incomplete',
  },
  ATTENDANCE_INVALID_EVENT_ORDER: {
    action: 'Review the recorded events. This historical record cannot be changed from this page.',
    description: 'The immutable attendance events cannot be reconstructed in a valid order.',
    href: 'EVENTS',
    title: 'Attendance event order needs review',
  },
  ATTENDANCE_INVALID_EVENT_PRECISION: {
    action: 'Review the recorded events. This historical record cannot be changed from this page.',
    description: 'An immutable attendance event is not aligned to a whole minute.',
    href: 'EVENTS',
    title: 'Attendance event time needs review',
  },
  ATTENDANCE_OVERLAP: {
    action: 'Review the recorded events. This historical record cannot be changed from this page.',
    description: 'The derived attendance intervals overlap and cannot form a reliable calculation.',
    href: 'EVENTS',
    title: 'Attendance intervals overlap',
  },
  CORRECTION_UNRESOLVED: {
    action: 'Wait for the correction decision before relying on this record.',
    description: 'A submitted correction can still change this day’s calculation.',
    href: null,
    title: 'Correction decision pending',
  },
  LEDGER_SOURCE_MISMATCH: {
    action:
      'No employee action is available. Ask your organization administrator to reconcile the record.',
    description: 'The calculation source does not match its posted ledger evidence.',
    href: null,
    title: 'Ledger reconciliation needed',
  },
  POLICY_ASSIGNMENT_OVERLAP: {
    action:
      'No employee action is available. Ask your organization administrator to resolve the policy assignment.',
    description: 'More than one time policy applies to this date.',
    href: null,
    title: 'Time-policy assignment overlap',
  },
  POLICY_CONFIGURATION_INVALID: {
    action:
      'No employee action is available. Ask your organization administrator to correct the time policy.',
    description: 'The assigned time policy cannot produce a reliable calculation.',
    href: null,
    title: 'Time-policy configuration needs review',
  },
  POLICY_NOT_ASSIGNED: {
    action:
      'No employee action is available. Ask your organization administrator to assign a time policy.',
    description: 'No time policy applies to this date.',
    href: null,
    title: 'Time policy missing',
  },
  SCHEDULE_ASSIGNMENT_OVERLAP: {
    action:
      'No employee action is available. Ask your organization administrator to resolve the work-schedule assignment.',
    description: 'More than one work schedule applies to this date.',
    href: null,
    title: 'Work-schedule assignment overlap',
  },
  SCHEDULE_NOT_ASSIGNED: {
    action:
      'No employee action is available. Ask your organization administrator to assign a work schedule.',
    description: 'No work schedule applies to this date.',
    href: null,
    title: 'Work schedule missing',
  },
};

const WARNING_ATTENTION: Readonly<Record<CalculationWarningCode, AttentionItem>> = {
  FLEX_NEGATIVE_THRESHOLD_EXCEEDED: {
    action: 'Review your posted and projected flexible-time balance.',
    description: 'The daily balance is below your configured flexible-time warning threshold.',
    href: 'BALANCE',
    title: 'Negative flexible-time threshold reached',
  },
  FLEX_POSITIVE_THRESHOLD_EXCEEDED: {
    action: 'Review your posted and projected flexible-time balance.',
    description: 'The daily balance is above your configured flexible-time warning threshold.',
    href: 'BALANCE',
    title: 'Positive flexible-time threshold reached',
  },
  WORK_DURING_ABSENCE: {
    action: 'Review the recorded attendance events and calculation.',
    description: 'Recorded work overlaps credited absence time. No absence category is shown here.',
    href: 'EVENTS',
    title: 'Work overlaps credited absence',
  },
  WORK_ON_HOLIDAY: {
    action: 'Review the calculation that explains the zero expected time.',
    description: 'Work is recorded on a public holiday and remains credited separately.',
    href: 'CALCULATION',
    title: 'Work recorded on a public holiday',
  },
  WORK_ON_ZERO_EXPECTED_DAY: {
    action: 'Review the calculation that explains the zero expected time.',
    description: 'Work is recorded on a day with no expected working time.',
    href: 'CALCULATION',
    title: 'Work recorded on a zero-expected day',
  },
};

export function CalculationAttention({
  attention,
  balanceHref,
  calculationHref,
  eventHref,
}: Readonly<{
  attention: DailyTimeAttention;
  balanceHref: string;
  calculationHref: string;
  eventHref: string;
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
          links={{ balanceHref, calculationHref, eventHref }}
          title="Calculation blockers"
        />
      )}
      {attention.warnings.length === 0 ? null : (
        <AttentionGroup
          items={attention.warnings.map((code) => WARNING_ATTENTION[code])}
          kind="warning"
          links={{ balanceHref, calculationHref, eventHref }}
          title="Warnings"
        />
      )}
    </section>
  );
}

function AttentionGroup({
  items,
  kind,
  links,
  title,
}: Readonly<{
  items: readonly AttentionItem[];
  kind: 'blocker' | 'warning';
  links: Readonly<{ balanceHref: string; calculationHref: string; eventHref: string }>;
  title: string;
}>) {
  return (
    <div className={`wl-alert ${kind === 'blocker' ? 'wl-alert-error' : ''} rounded-xl border p-4`}>
      <h3 className="m-0 text-lg font-bold">{title}</h3>
      <ul className="mb-0 mt-3 grid gap-3 pl-5">
        {items.map((item) => (
          <li key={item.title} className="grid gap-1">
            <strong>{item.title}</strong>
            <span>{item.description}</span>
            {item.href === null ? (
              <span>{item.action}</span>
            ) : (
              <a href={links[actionHrefKey(item.href)]}>{item.action}</a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function actionHrefKey(
  href: Exclude<AttentionItem['href'], null>,
): 'balanceHref' | 'calculationHref' | 'eventHref' {
  switch (href) {
    case 'BALANCE':
      return 'balanceHref';
    case 'CALCULATION':
      return 'calculationHref';
    case 'EVENTS':
      return 'eventHref';
  }
}
