import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';

import type { TodayAttentionItem } from '@workledger/contracts';
import { formatDateOnly, type MessageArguments, type MessageKey } from '@workledger/i18n';
import { useWorkLedgerLocale, useWorkLedgerMessage } from '@workledger/i18n/react';
import { Alert, StatusBadge } from '@workledger/ui';

import { attentionPresentation, attentionRecoveryLabel } from '../app/presentation-codes.js';

type MessageTranslator = <Key extends MessageKey>(
  key: Key,
  ...args: MessageArguments<Key>
) => string;

export function TodayAttention({ items }: Readonly<{ items: readonly TodayAttentionItem[] }>) {
  const t = useWorkLedgerMessage();
  const urgentAnnouncement = useNewUrgentAttentionAnnouncement(items, t);
  if (items.length === 0) return null;

  const blockers = items.filter((item) => item.blocksSubmission);
  const warnings = items.filter((item) => !item.blocksSubmission);

  return (
    <section className="grid gap-4" aria-labelledby="today-attention-title">
      <h2 id="today-attention-title" className="m-0 text-2xl font-bold">
        {t('employee.today.attention.title')}
      </h2>
      {urgentAnnouncement === null ? null : (
        <p className="sr-only" role="alert">
          {urgentAnnouncement}
        </p>
      )}
      {blockers.length === 0 ? null : (
        <AttentionGroup
          items={blockers}
          title={t('employee.today.attention.blockingIssues')}
          tone="danger"
        />
      )}
      {warnings.length === 0 ? null : (
        <AttentionGroup
          items={warnings}
          title={t('employee.today.attention.warnings')}
          tone="warning"
        />
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
  const locale = useWorkLedgerLocale();
  const t = useWorkLedgerMessage();
  return (
    <Alert announce={false} headingLevel="h3" title={title} tone={tone}>
      <ul className="mb-0 mt-3 grid gap-4 pl-5">
        {items.map((item) => (
          <li key={item.message.code} className="grid gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <strong>{attentionPresentation(item.message.code, t).title}</strong>
              <StatusBadge tone={item.blocksSubmission ? 'danger' : 'warning'}>
                {item.blocksSubmission
                  ? t('employee.today.attention.blocksSubmission')
                  : t('employee.today.attention.doesNotBlockSubmission')}
              </StatusBadge>
            </div>
            <span className="text-sm text-[var(--wl-text-muted)]">
              {item.source === 'POSTED_FLEX_BALANCE'
                ? t('employee.today.attention.postedBalanceThrough')
                : t('employee.today.attention.affectedDate')}
              {':'}{' '}
              <time dateTime={item.affectedDate}>
                {formatDateOnly(locale.locale, item.affectedDate)}
              </time>
            </span>
            <span>{attentionPresentation(item.message.code, t).reason}</span>
            <span className="text-sm text-[var(--wl-text-muted)]">
              {t('employee.today.attention.next')}
              {':'} {attentionPresentation(item.message.code, t).whatHappensNext}
            </span>
            <AttentionDestination item={item} />
          </li>
        ))}
      </ul>
    </Alert>
  );
}

function AttentionDestination({ item }: Readonly<{ item: TodayAttentionItem }>) {
  const t = useWorkLedgerMessage();
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
        {attentionRecoveryLabel(item.recovery, t)}
      </a>
    );
  }
  if (item.recovery.destination === 'TODAY_TIMELINE') {
    return <a href={href}>{attentionRecoveryLabel(item.recovery, t)}</a>;
  }
  return <Link to={href}>{attentionRecoveryLabel(item.recovery, t)}</Link>;
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

function useNewUrgentAttentionAnnouncement(
  items: readonly TodayAttentionItem[],
  t: MessageTranslator,
): string | null {
  const previousCodesRef = useRef<ReadonlySet<string> | null>(null);
  const [announcement, setAnnouncement] = useState<string | null>(null);

  useEffect(() => {
    const currentCodes = new Set(items.map(({ message }) => message.code));
    const previousCodes = previousCodesRef.current;
    previousCodesRef.current = currentCodes;
    if (previousCodes === null) return;

    const newBlockers = items.filter(
      (item) => item.blocksSubmission && !previousCodes.has(item.message.code),
    );
    setAnnouncement(
      newBlockers.length === 0
        ? null
        : t('employee.today.attention.newUrgent', {
            titles: newBlockers
              .map(({ message }) => attentionPresentation(message.code, t).title)
              .join('; '),
          }),
    );
  }, [items, t]);

  return announcement;
}
