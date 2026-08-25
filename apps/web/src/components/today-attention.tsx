import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';

import type { TodayAttentionItem } from '@workledger/contracts';
import { Alert, StatusBadge } from '@workledger/ui';

import { formatLocalDate } from '../app/date-time-format.js';

export function TodayAttention({ items }: Readonly<{ items: readonly TodayAttentionItem[] }>) {
  const urgentAnnouncement = useNewUrgentAttentionAnnouncement(items);
  if (items.length === 0) return null;

  const blockers = items.filter((item) => item.blocksSubmission);
  const warnings = items.filter((item) => !item.blocksSubmission);

  return (
    <section className="grid gap-4" aria-labelledby="today-attention-title">
      <h2 id="today-attention-title" className="m-0 text-2xl font-bold">
        Needs attention
      </h2>
      {urgentAnnouncement === null ? null : (
        <p className="sr-only" role="alert">
          {urgentAnnouncement}
        </p>
      )}
      {blockers.length === 0 ? null : (
        <AttentionGroup items={blockers} title="Blocking issues" tone="danger" />
      )}
      {warnings.length === 0 ? null : (
        <AttentionGroup items={warnings} title="Warnings" tone="warning" />
      )}
    </section>
  );
}

function AttentionGroup({
  items,
  title,
  tone,
}: Readonly<{
  items: readonly TodayAttentionItem[];
  title: string;
  tone: 'danger' | 'warning';
}>) {
  return (
    <Alert announce={false} headingLevel="h3" title={title} tone={tone}>
      <ul className="mb-0 mt-3 grid gap-4 pl-5">
        {items.map((item) => (
          <li key={item.code} className="grid gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <strong>{item.title}</strong>
              <StatusBadge tone={item.blocksSubmission ? 'danger' : 'warning'}>
                {item.blocksSubmission ? 'Blocks month submission' : 'Does not block submission'}
              </StatusBadge>
            </div>
            <span className="text-sm text-[var(--wl-text-muted)]">
              {item.source === 'POSTED_FLEX_BALANCE' ? 'Posted balance through' : 'Affected date'}:{' '}
              {formatLocalDate(item.affectedDate)}
            </span>
            <span>{item.reason}</span>
            <span className="text-sm text-[var(--wl-text-muted)]">
              What happens next: {item.recovery.statusAfterAction}
            </span>
            <AttentionDestination item={item} />
          </li>
        ))}
      </ul>
    </Alert>
  );
}

function AttentionDestination({ item }: Readonly<{ item: TodayAttentionItem }>) {
  const href = destinationHref(item);
  if (item.recovery.destination === 'TODAY_CALCULATION') {
    return (
      <a
        href={href}
        onClick={() => {
          const details = document.querySelector<HTMLDetailsElement>('#calculation-details');
          if (details !== null) details.open = true;
        }}
      >
        {item.recovery.label}
      </a>
    );
  }
  if (item.recovery.destination === 'TODAY_TIMELINE') {
    return <a href={href}>{item.recovery.label}</a>;
  }
  return <Link to={href}>{item.recovery.label}</Link>;
}

function destinationHref(item: TodayAttentionItem): string {
  switch (item.recovery.destination) {
    case 'MY_BALANCES':
      return '/my-balances#ledger-heading';
    case 'MY_REQUESTS':
      return '/requests';
    case 'MY_TIME':
      return `/my-time?date=${encodeURIComponent(item.affectedDate)}&view=WEEK`;
    case 'TODAY_CALCULATION':
      return '#calculation-details';
    case 'TODAY_TIMELINE':
      return '#today-timeline-title';
  }
}

function useNewUrgentAttentionAnnouncement(items: readonly TodayAttentionItem[]): string | null {
  const previousCodesRef = useRef<ReadonlySet<string> | null>(null);
  const [announcement, setAnnouncement] = useState<string | null>(null);

  useEffect(() => {
    const currentCodes = new Set(items.map(({ code }) => code));
    const previousCodes = previousCodesRef.current;
    previousCodesRef.current = currentCodes;
    if (previousCodes === null) return;

    const newBlockers = items.filter(
      (item) => item.blocksSubmission && !previousCodes.has(item.code),
    );
    setAnnouncement(
      newBlockers.length === 0
        ? null
        : `New urgent issue: ${newBlockers.map(({ title }) => title).join('; ')}.`,
    );
  }, [items]);

  return announcement;
}
