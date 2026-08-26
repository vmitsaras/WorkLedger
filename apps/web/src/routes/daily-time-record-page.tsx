import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';

import type { DailyTimeRecord } from '@workledger/contracts';
import {
  formatCompactDuration,
  formatDateOnly,
  formatInstant,
  type I18nRuntime,
  type MessageKey,
} from '@workledger/i18n';
import { useWorkLedgerI18n, useWorkLedgerMessage } from '@workledger/i18n/react';
import { Alert, Button, Panel, RouteState, StatusBadge, buttonVariants } from '@workledger/ui';

import { ApiClientError } from '../app/api-client.js';
import { dailyTimeRecordQuery } from '../app/query.js';
import { CalculationAttention } from '../components/calculation-attention.js';
import { PageHeader } from '../components/page-header.js';

const EVENT_LABEL_KEYS = {
  BREAK_END: 'employee.records.event.breakEnd',
  BREAK_START: 'employee.records.event.breakStart',
  CLOCK_IN: 'employee.records.event.clockIn',
  CLOCK_OUT: 'employee.records.event.clockOut',
} as const satisfies Readonly<Record<DailyTimeRecord['events'][number]['type'], MessageKey>>;

const RECORD_STATUS_KEYS = {
  COMPLETE: 'employee.time.records.status.complete',
  INCOMPLETE: 'employee.time.records.status.incomplete',
  NO_RECORD: 'employee.time.records.status.noRecord',
  PROVISIONAL: 'employee.time.records.status.provisional',
} as const satisfies Readonly<Record<DailyTimeRecord['status'], MessageKey>>;

export function DailyTimeRecordPage() {
  const runtime = useWorkLedgerI18n();
  const t = useWorkLedgerMessage();
  const { recordId } = useParams();
  if (recordId === undefined) return <DailyTimeRecordError error={null} retry={null} />;
  const query = useQuery(dailyTimeRecordQuery(recordId));

  if (query.isPending) {
    return (
      <section className="grid max-w-4xl gap-6" aria-busy="true">
        <PageHeader
          eyebrow={t('employee.records.eyebrow')}
          title={t('shared.route.title.myTime')}
          description={t('employee.records.description')}
        />
        <RouteState kind="loading" title={t('employee.records.loading.title')}>
          <p>{t('employee.records.loading.description')}</p>
        </RouteState>
      </section>
    );
  }
  if (query.isError || query.data === undefined) {
    return <DailyTimeRecordError error={query.error} retry={() => void query.refetch()} />;
  }

  const record = query.data;
  const incomplete = record.status !== 'COMPLETE';
  return (
    <section className="grid max-w-4xl gap-8">
      <PageHeader
        eyebrow={t('employee.records.eyebrow')}
        title={formatDateOnly(runtime.locale, record.localDate)}
        description={t('employee.records.timeZoneDescription', { timeZone: record.timeZone })}
      />
      <Panel aria-labelledby="daily-record-summary-heading" className="grid gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="m-0 text-sm font-semibold text-[var(--wl-text-muted)]">
              {t('employee.records.state.current')}
            </p>
            <h2 id="daily-record-summary-heading" className="m-0 mt-1 text-2xl font-bold">
              {incomplete
                ? t('employee.records.state.needsReview')
                : t('employee.records.state.complete')}
            </h2>
          </div>
          <StatusBadge tone={incomplete ? 'warning' : 'success'}>
            {t(RECORD_STATUS_KEYS[record.status])}
          </StatusBadge>
        </div>
        <p className="m-0 text-sm text-[var(--wl-text-muted)]">
          {incomplete
            ? t('employee.records.state.provisionalDescription')
            : t('employee.records.state.completeDescription')}
        </p>
      </Panel>
      {incomplete ? (
        <Alert announce={false} title={t('employee.records.incomplete.title')} tone="warning">
          <p className="m-0">{t('employee.records.incomplete.description')}</p>
        </Alert>
      ) : null}
      <CalculationAttention
        attention={record.attention}
        balanceHref="/my-time#flexible-time-heading"
        calculationHref="#daily-calculation-heading"
        fixEntryHref={`/requests/new?recordId=${encodeURIComponent(recordId)}`}
        myTimeHref={`/my-time?date=${encodeURIComponent(record.localDate)}&view=WEEK`}
        requestHref="/requests"
      />
      {record.calculation === null ? (
        <Alert
          announce={false}
          title={t('employee.records.calculation.unavailable.title')}
          tone="danger"
        >
          <p className="m-0">{t('employee.records.calculation.unavailable.description')}</p>
        </Alert>
      ) : (
        <section aria-labelledby="daily-calculation-heading" className="grid gap-3">
          <h2 id="daily-calculation-heading" className="m-0 text-xl font-bold">
            {t('employee.records.calculation.heading')}
          </h2>
          <Panel density="balanced">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Value
                label={t('employee.records.calculation.expectedTime')}
                value={record.calculation.expectedMinutes}
              />
              <Value
                label={t('employee.records.calculation.workedTime')}
                value={record.calculation.workedMinutes}
              />
              <Value
                label={t('employee.records.calculation.breakTime')}
                value={record.calculation.breakMinutes}
              />
              <Value
                label={t('employee.records.calculation.absenceCredit')}
                value={record.calculation.absenceCreditMinutes}
              />
              <Value
                label={t('employee.records.calculation.creditedTime')}
                value={record.calculation.creditedMinutes}
              />
              <Value
                label={t('employee.records.calculation.balance')}
                value={record.calculation.balanceMinutes}
                signed
              />
            </dl>
          </Panel>
        </section>
      )}
      <Link
        className={buttonVariants({ variant: 'secondary', className: 'w-fit' })}
        to={`/requests/new?recordId=${encodeURIComponent(recordId)}`}
      >
        {t('employee.records.requestCorrection')}
      </Link>
      <section aria-labelledby="sessions-heading" className="grid gap-3">
        <h2 id="sessions-heading" className="m-0 text-xl font-bold">
          {t('employee.records.sessions.heading')}
        </h2>
        {record.sessions.length === 0 ? (
          <RouteState kind="empty" title={t('employee.records.sessions.empty.title')}>
            <p>{t('employee.records.sessions.empty.description')}</p>
          </RouteState>
        ) : (
          <ol className="m-0 grid list-none gap-4 p-0">
            {record.sessions.map((session, index) => (
              <li key={index}>
                <Panel as="article" className="grid gap-4" density="balanced">
                  <h3 className="m-0 text-base font-bold">
                    {t('employee.records.sessions.session', { number: index + 1 })}
                  </h3>
                  {session.continuesFromPreviousDate || session.continuesToNextDate ? (
                    <p className="m-0 text-sm text-[var(--wl-text-muted)]">
                      {session.continuesFromPreviousDate
                        ? `${t('employee.records.sessions.continuesPrevious')} `
                        : ''}
                      {session.continuesToNextDate
                        ? t('employee.records.sessions.continuesNext')
                        : ''}
                    </p>
                  ) : null}
                  <IntervalList
                    label={t('employee.records.sessions.workIntervals')}
                    intervals={session.workIntervals}
                    timeZone={record.timeZone}
                  />
                  <IntervalList
                    label={t('employee.records.sessions.breakIntervals')}
                    intervals={session.breaks}
                    timeZone={record.timeZone}
                  />
                </Panel>
              </li>
            ))}
          </ol>
        )}
        <p className="m-0 text-sm text-[var(--wl-text-muted)]">
          {t('employee.records.sessions.note')}
        </p>
      </section>
      <section aria-labelledby="events-heading" className="grid gap-3">
        <h2 id="events-heading" className="m-0 text-xl font-bold">
          {t('employee.records.events.heading')}
        </h2>
        {record.events.length === 0 ? (
          <RouteState kind="empty" title={t('employee.records.events.empty.title')}>
            <p>{t('employee.records.events.empty.description')}</p>
          </RouteState>
        ) : (
          <ol className="m-0 grid list-none gap-3 p-0">
            {record.events.map((event) => (
              <li key={event.sequence}>
                <Panel as="article" density="balanced">
                  <strong>{t(EVENT_LABEL_KEYS[event.type])}</strong>
                  <div className="text-sm text-[var(--wl-text-muted)]">
                    {formatClockTimeWithOffset(runtime, event.occurredAt, record.timeZone)} {'·'}{' '}
                    {t('employee.records.events.recordedOrder', { sequence: event.sequence })}
                  </div>
                </Panel>
              </li>
            ))}
          </ol>
        )}
        <p className="m-0 text-sm text-[var(--wl-text-muted)]">
          {t('employee.records.events.note')}
        </p>
      </section>
      <Link className={buttonVariants({ variant: 'secondary', className: 'w-fit' })} to="/my-time">
        {t('employee.records.backToTime')}
      </Link>
    </section>
  );
}

function Value({
  label,
  signed = false,
  value,
}: Readonly<{ label: string; signed?: boolean; value: number }>) {
  const runtime = useWorkLedgerI18n();
  return (
    <div className="grid gap-1">
      <dt className="text-sm font-semibold text-[var(--wl-text-muted)]">{label}</dt>
      <dd className="m-0 text-xl font-bold tabular-nums">
        {formatCompactDuration(runtime, value, signed)}
      </dd>
    </div>
  );
}

function IntervalList({
  intervals,
  label,
  timeZone,
}: Readonly<{
  intervals: readonly Readonly<{ durationMinutes: number; endsAt: string; startsAt: string }>[];
  label: string;
  timeZone: string;
}>) {
  const runtime = useWorkLedgerI18n();
  const t = useWorkLedgerMessage();
  return (
    <div className="grid gap-2">
      <h4 className="m-0 text-sm font-semibold">{label}</h4>
      {intervals.length === 0 ? (
        <p className="m-0 text-sm text-[var(--wl-text-muted)]">
          {t('employee.records.sessions.none')}
        </p>
      ) : (
        <ul className="m-0 grid gap-1 pl-5">
          {intervals.map((interval) => (
            <li key={`${interval.startsAt}-${interval.endsAt}`}>
              {t('employee.records.sessions.range', {
                duration: formatCompactDuration(runtime, interval.durationMinutes),
                end: formatClockTimeWithOffset(runtime, interval.endsAt, timeZone),
                start: formatClockTimeWithOffset(runtime, interval.startsAt, timeZone),
              })}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DailyTimeRecordError({
  error,
  retry,
}: Readonly<{ error: unknown; retry: (() => void) | null }>) {
  const t = useWorkLedgerMessage();
  const notFound = error instanceof ApiClientError && error.code === 'ROUTE_NOT_FOUND';
  const denied = error instanceof ApiClientError && error.code === 'ACCESS_DENIED';
  const title = notFound
    ? t('employee.records.error.notFound.title')
    : denied
      ? t('shared.route.boundary.permissionDenied.title')
      : t('employee.records.error.unavailable.title');
  return (
    <section className="grid max-w-4xl gap-6">
      <PageHeader
        eyebrow={t('employee.records.eyebrow')}
        title={title}
        description={
          notFound
            ? t('employee.records.error.notFound.description')
            : denied
              ? t('employee.records.error.denied.description')
              : t('employee.records.error.unavailable.description')
        }
      />
      <RouteState
        actions={
          retry === null || notFound || denied ? undefined : (
            <Button variant="secondary" onPress={retry}>
              {t('shared.action.tryAgain')}
            </Button>
          )
        }
        kind={notFound ? 'not-found' : denied ? 'permission-denied' : 'error'}
        title={title}
      >
        <p>
          {notFound
            ? t('employee.records.error.notFound.message')
            : denied
              ? t('employee.records.error.denied.message')
              : t('employee.records.error.unavailable.message')}
        </p>
      </RouteState>
    </section>
  );
}

function formatClockTimeWithOffset(
  runtime: I18nRuntime,
  instant: string,
  timeZone: string,
): string {
  return formatInstant(runtime.locale, instant, timeZone, {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'shortOffset',
  });
}
