import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';

import { ApiClientError } from '../app/api-client.js';
import { formatDuration, formatLocalDate, formatTimeWithOffset } from '../app/date-time-format.js';
import { dailyTimeRecordQuery } from '../app/query.js';
import { CalculationAttention } from '../components/calculation-attention.js';
import { PageHeader } from '../components/page-header.js';

const EVENT_LABELS = {
  BREAK_END: 'Break ended',
  BREAK_START: 'Break started',
  CLOCK_IN: 'Clocked in',
  CLOCK_OUT: 'Clocked out',
} as const;

export function DailyTimeRecordPage() {
  const { recordId } = useParams();
  if (recordId === undefined) return <DailyTimeRecordError error={null} retry={null} />;
  const query = useQuery(dailyTimeRecordQuery(recordId));

  if (query.isPending) {
    return (
      <section className="grid max-w-4xl gap-6" aria-busy="true">
        <PageHeader
          eyebrow="Time records"
          title="Daily record"
          description="Loading the daily record…"
        />
        <div
          aria-label="Loading daily record"
          role="progressbar"
          className="h-2 rounded-full bg-[var(--wl-surface-subtle)]"
        />
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
        eyebrow="Time records"
        title={formatLocalDate(record.localDate)}
        description={`Daily record · ${record.status.replace('_', ' ').toLowerCase()} · ${record.timeZone}`}
      />
      <p
        className={
          incomplete
            ? 'wl-alert wl-alert-warning m-0 rounded-xl border p-4'
            : 'm-0 text-sm text-[var(--wl-text-muted)]'
        }
        role={incomplete ? 'status' : undefined}
      >
        {incomplete
          ? 'This record is incomplete. Its calculation is not a final posted result.'
          : 'This completed record shows immutable events and exact elapsed intervals.'}
      </p>
      <CalculationAttention
        attention={record.attention}
        balanceHref="/my-time#flexible-time-heading"
        calculationHref="#daily-calculation-heading"
        eventHref="#events-heading"
      />
      {record.calculation === null ? (
        <p className="wl-alert wl-alert-error m-0 rounded-xl border p-4" role="alert">
          This record’s attendance events cannot be reconstructed. No calculation detail is shown.
        </p>
      ) : (
        <section aria-labelledby="daily-calculation-heading" className="grid gap-3">
          <h2 id="daily-calculation-heading" className="m-0 text-xl font-bold">
            Calculation
          </h2>
          <dl className="grid gap-4 rounded-xl border border-[var(--wl-border)] p-4 sm:grid-cols-2">
            <Value label="Expected time" value={record.calculation.expectedMinutes} />
            <Value label="Worked time" value={record.calculation.workedMinutes} />
            <Value label="Break time" value={record.calculation.breakMinutes} />
            <Value label="Absence credit" value={record.calculation.absenceCreditMinutes} />
            <Value label="Credited time" value={record.calculation.creditedMinutes} />
            <Value label="Balance" value={record.calculation.balanceMinutes} signed />
          </dl>
        </section>
      )}
      <section aria-labelledby="sessions-heading" className="grid gap-3">
        <h2 id="sessions-heading" className="m-0 text-xl font-bold">
          Work sessions and breaks
        </h2>
        {record.sessions.length === 0 ? (
          <p className="m-0 rounded-xl border border-[var(--wl-border)] p-4">
            No completed work or break interval falls within this local date.
          </p>
        ) : (
          <ol className="grid gap-4">
            {record.sessions.map((session, index) => (
              <li
                key={index}
                className="grid gap-4 rounded-xl border border-[var(--wl-border)] p-4"
              >
                <h3 className="m-0 text-base font-bold">Session {index + 1}</h3>
                {session.continuesFromPreviousDate || session.continuesToNextDate ? (
                  <p className="m-0 text-sm text-[var(--wl-text-muted)]">
                    {session.continuesFromPreviousDate
                      ? 'Continues from the previous local date. '
                      : ''}
                    {session.continuesToNextDate ? 'Continues into the next local date.' : ''}
                  </p>
                ) : null}
                <IntervalList
                  label="Work intervals"
                  intervals={session.workIntervals}
                  timeZone={record.timeZone}
                />
                <IntervalList
                  label="Break intervals"
                  intervals={session.breaks}
                  timeZone={record.timeZone}
                />
              </li>
            ))}
          </ol>
        )}
        <p className="m-0 text-sm text-[var(--wl-text-muted)]">
          Intervals that cross midnight are split at the organization-local date boundary. Durations
          use the recorded instants, including daylight-saving changes.
        </p>
      </section>
      <section aria-labelledby="events-heading" className="grid gap-3">
        <h2 id="events-heading" className="m-0 text-xl font-bold">
          Recorded events
        </h2>
        {record.events.length === 0 ? (
          <p className="m-0 rounded-xl border border-[var(--wl-border)] p-4">
            No attendance event was recorded on this local date.
          </p>
        ) : (
          <ol className="grid gap-3">
            {record.events.map((event) => (
              <li key={event.sequence} className="rounded-xl border border-[var(--wl-border)] p-4">
                <strong>{EVENT_LABELS[event.type]}</strong>
                <div className="text-sm text-[var(--wl-text-muted)]">
                  {formatTimeWithOffset(event.occurredAt, record.timeZone)} · Recorded order{' '}
                  {event.sequence}
                </div>
              </li>
            ))}
          </ol>
        )}
        <p className="m-0 text-sm text-[var(--wl-text-muted)]">
          Times include the UTC offset so repeated local times remain distinguishable.
        </p>
      </section>
      <Link className="wl-button-secondary w-fit" to="/my-time">
        Back to My time
      </Link>
    </section>
  );
}

function Value({
  label,
  signed = false,
  value,
}: Readonly<{ label: string; signed?: boolean; value: number }>) {
  return (
    <div className="grid gap-1">
      <dt className="text-sm font-semibold text-[var(--wl-text-muted)]">{label}</dt>
      <dd className="m-0 text-xl font-bold tabular-nums">{formatDuration(value, signed)}</dd>
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
  return (
    <div className="grid gap-2">
      <h4 className="m-0 text-sm font-semibold">{label}</h4>
      {intervals.length === 0 ? (
        <p className="m-0 text-sm text-[var(--wl-text-muted)]">None</p>
      ) : (
        <ul className="m-0 grid gap-1 pl-5">
          {intervals.map((interval) => (
            <li key={`${interval.startsAt}-${interval.endsAt}`}>
              {formatTimeWithOffset(interval.startsAt, timeZone)} to{' '}
              {formatTimeWithOffset(interval.endsAt, timeZone)} ·{' '}
              {formatDuration(interval.durationMinutes)}
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
  const notFound = error instanceof ApiClientError && error.code === 'ROUTE_NOT_FOUND';
  const denied = error instanceof ApiClientError && error.code === 'ACCESS_DENIED';
  return (
    <section className="grid max-w-4xl gap-6">
      <PageHeader
        eyebrow="Time records"
        title={
          notFound ? 'Record not found' : denied ? 'Permission denied' : 'Daily record unavailable'
        }
        description={
          notFound
            ? 'This daily record is not available.'
            : denied
              ? 'You do not have access to this daily record.'
              : 'WorkLedger could not load this daily record.'
        }
      />
      {retry === null ? null : (
        <button className="wl-button-secondary w-fit" type="button" onClick={retry}>
          Try again
        </button>
      )}
    </section>
  );
}
