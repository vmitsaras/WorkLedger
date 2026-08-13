import { useQuery } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';

import { myTimeQuerySchema, type MyTimeQuery } from '@workledger/contracts';

import { ApiClientError } from '../app/api-client.js';
import { formatDuration, formatLocalDate } from '../app/date-time-format.js';
import { myTimeQuery } from '../app/query.js';
import { PageHeader } from '../components/page-header.js';

type MyTimePageProps = Readonly<{ balancesOnly?: boolean }>;

const DEFAULT_LEDGER_LIMIT = 20;

export function MyTimePage({ balancesOnly = false }: MyTimePageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryInput = readQuery(searchParams);
  const query = useQuery(myTimeQuery(queryInput));

  const setQuery = (changes: Partial<MyTimeQuery>) => {
    const next = { ...queryInput, ...changes };
    setSearchParams({
      date: next.date,
      limit: next.limit.toString(),
      page: next.page.toString(),
      view: next.view,
    });
  };

  const title = balancesOnly ? 'My balances' : 'My time';
  if (query.isPending) {
    return (
      <MyTimeFrame balancesOnly={balancesOnly} title={title}>
        <MyTimeLoading />
      </MyTimeFrame>
    );
  }
  if (query.isError || query.data === undefined) {
    return (
      <MyTimeFrame balancesOnly={balancesOnly} title={title}>
        <MyTimeError error={query.error} retry={() => void query.refetch()} />
      </MyTimeFrame>
    );
  }

  const { balance, ledger, period, records, summary } = query.data;
  return (
    <MyTimeFrame balancesOnly={balancesOnly} title={title}>
      <div className="grid gap-4 rounded-xl border border-[var(--wl-border)] bg-[var(--wl-surface)] p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="grid gap-2">
          <span className="text-sm font-semibold">Time record view</span>
          <div className="flex flex-wrap gap-2" aria-label="Time record view">
            {(['WEEK', 'MONTH'] as const).map((view) => (
              <button
                key={view}
                type="button"
                aria-pressed={queryInput.view === view}
                className="wl-button-secondary"
                onClick={() => setQuery({ page: 1, view })}
              >
                {view === 'WEEK' ? 'Week' : 'Month'}
              </button>
            ))}
          </div>
        </div>
        <label className="grid gap-1 text-sm font-semibold">
          Date in period
          <input
            className="wl-text-field"
            type="date"
            value={queryInput.date}
            onChange={(event) => setQuery({ date: event.target.value, page: 1 })}
          />
        </label>
      </div>

      <section aria-labelledby="flexible-time-heading" className="grid gap-4">
        <div>
          <h2 id="flexible-time-heading" className="m-0 text-xl font-bold">
            Flexible-time balance
          </h2>
          <p className="m-0 mt-1 text-sm text-[var(--wl-text-muted)]">
            Posted entries are final ledger facts. Eligible complete records not yet posted are
            shown separately as projections.
          </p>
        </div>
        <dl className="grid gap-4 rounded-xl border border-[var(--wl-border)] p-4 sm:grid-cols-3">
          <BalanceValue label="Posted balance" value={balance.postedBalanceMinutes} />
          <BalanceValue
            label="Eligible projection"
            value={balance.eligibleProjectedMinutes}
            signed
          />
          <BalanceValue label="Projected balance" value={balance.projectedBalanceMinutes} />
        </dl>
        {balance.excludedIncompleteDates.length > 0 ? (
          <p className="wl-alert wl-alert-warning m-0 rounded-xl border p-4" role="status">
            Projected balance excludes incomplete records for:{' '}
            {balance.excludedIncompleteDates.map(formatLocalDate).join(', ')}.
          </p>
        ) : null}
      </section>

      {!balancesOnly ? (
        <section aria-labelledby="time-records-heading" className="grid gap-4">
          <div>
            <h2 id="time-records-heading" className="m-0 text-xl font-bold">
              {period.view === 'WEEK' ? 'Week' : 'Month'} summary
            </h2>
            <p className="m-0 mt-1 text-sm text-[var(--wl-text-muted)]">
              {formatLocalDate(period.startDate)} to {formatLocalDate(period.endDate)}.{' '}
              {summary.recordedDayCount} recorded day{summary.recordedDayCount === 1 ? '' : 's'};{' '}
              {summary.incompleteRecordCount} incomplete.
            </p>
          </div>
          <div className="overflow-x-auto rounded-xl border border-[var(--wl-border)]">
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">
                Daily time record summaries for the selected period
              </caption>
              <thead>
                <tr className="border-b border-[var(--wl-border)] text-sm">
                  <th scope="col" className="p-3">
                    Date
                  </th>
                  <th scope="col" className="p-3">
                    Status
                  </th>
                  <th scope="col" className="p-3">
                    Expected
                  </th>
                  <th scope="col" className="p-3">
                    Credited
                  </th>
                  <th scope="col" className="p-3">
                    Balance
                  </th>
                  <th scope="col" className="p-3">
                    Attention
                  </th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr
                    key={record.localDate}
                    className="border-b border-[var(--wl-border)] last:border-0"
                  >
                    <th scope="row" className="p-3 font-medium">
                      {record.recordId === null ? (
                        formatLocalDate(record.localDate)
                      ) : (
                        <Link to={`/time-records/${encodeURIComponent(record.recordId)}`}>
                          {formatLocalDate(record.localDate)}
                        </Link>
                      )}
                    </th>
                    <td className="p-3">{record.status.replace('_', ' ').toLowerCase()}</td>
                    <td className="p-3">
                      {record.expectedMinutes === null
                        ? '—'
                        : formatDuration(record.expectedMinutes)}
                    </td>
                    <td className="p-3">
                      {record.creditedMinutes === null
                        ? '—'
                        : formatDuration(record.creditedMinutes)}
                    </td>
                    <td className="p-3">
                      {record.balanceMinutes === null
                        ? '—'
                        : formatDuration(record.balanceMinutes, true)}
                    </td>
                    <td className="p-3">
                      {record.attention.warnings.length === 0 ? (
                        record.status === 'INCOMPLETE' ? (
                          'Review incomplete record'
                        ) : (
                          '—'
                        )
                      ) : record.recordId === null ? (
                        `${record.attention.warnings.length.toString()} warning${record.attention.warnings.length === 1 ? '' : 's'}`
                      ) : (
                        <Link to={`/time-records/${encodeURIComponent(record.recordId)}`}>
                          {record.attention.warnings.length.toString()} warning
                          {record.attention.warnings.length === 1 ? '' : 's'} — review details
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="m-0 text-sm text-[var(--wl-text-muted)]">
            Complete-record balance in this period:{' '}
            {formatDuration(summary.completeBalanceMinutes, true)}.
          </p>
        </section>
      ) : null}

      <section aria-labelledby="ledger-heading" className="grid gap-4">
        <div>
          <h2 id="ledger-heading" className="m-0 text-xl font-bold">
            Posted ledger entries
          </h2>
          <p className="m-0 mt-1 text-sm text-[var(--wl-text-muted)]">
            Every entry shows its effect and the resulting posted balance.
          </p>
        </div>
        {ledger.entries.length === 0 ? (
          <p className="m-0 rounded-xl border border-[var(--wl-border)] p-4">
            No posted flexible-time entries exist through this period.
          </p>
        ) : (
          <ol className="grid gap-3">
            {ledger.entries.map((entry) => (
              <li
                key={`${entry.postedAt}-${entry.explanationCode}`}
                className="grid gap-1 rounded-xl border border-[var(--wl-border)] p-4 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div>
                  <strong>{entry.entryType.replaceAll('_', ' ').toLowerCase()}</strong>
                  <p className="m-0 text-sm text-[var(--wl-text-muted)]">
                    Effective {formatLocalDate(entry.effectiveDate)} ·{' '}
                    {entry.explanationCode.replaceAll('_', ' ').toLowerCase()}
                  </p>
                </div>
                <div className="text-sm sm:text-right">
                  <div>{formatDuration(entry.minutes, true)}</div>
                  <div className="text-[var(--wl-text-muted)]">
                    Balance after: {formatDuration(entry.balanceAfterMinutes, true)}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
        <div className="flex items-center justify-between gap-3">
          <button
            className="wl-button-secondary"
            type="button"
            disabled={ledger.page === 1}
            onClick={() => setQuery({ page: ledger.page - 1 })}
          >
            Previous ledger page
          </button>
          <span className="text-sm text-[var(--wl-text-muted)]">
            Page {ledger.page} of {Math.max(1, Math.ceil(ledger.total / ledger.limit))}
          </span>
          <button
            className="wl-button-secondary"
            type="button"
            disabled={ledger.page * ledger.limit >= ledger.total}
            onClick={() => setQuery({ page: ledger.page + 1 })}
          >
            Next ledger page
          </button>
        </div>
      </section>
    </MyTimeFrame>
  );
}

function MyTimeFrame({
  balancesOnly,
  children,
  title,
}: Readonly<{ balancesOnly: boolean; children: ReactNode; title: string }>) {
  return (
    <section className="grid max-w-5xl gap-8">
      <PageHeader
        eyebrow="Time records"
        title={title}
        description={
          balancesOnly
            ? 'Your posted flexible-time ledger and clearly identified eligible projections.'
            : 'Review your weekly or monthly record summaries and the flexible-time balance they explain.'
        }
      />
      {children}
    </section>
  );
}

function BalanceValue({
  label,
  signed = false,
  value,
}: Readonly<{ label: string; signed?: boolean; value: number }>) {
  return (
    <div className="grid gap-1">
      <dt className="text-sm font-semibold text-[var(--wl-text-muted)]">{label}</dt>
      <dd className="m-0 text-2xl font-bold tabular-nums">{formatDuration(value, signed)}</dd>
    </div>
  );
}

function MyTimeLoading() {
  return (
    <div
      role="progressbar"
      aria-busy="true"
      aria-label="Loading time records"
      className="h-2 rounded-full bg-[var(--wl-surface-subtle)]"
    />
  );
}

function MyTimeError({ error, retry }: Readonly<{ error: unknown; retry: () => void }>) {
  const permissionDenied = error instanceof ApiClientError && error.code === 'ACCESS_DENIED';
  return (
    <div className="wl-alert wl-alert-error grid gap-3 rounded-xl border p-4" role="alert">
      <p className="m-0">
        {permissionDenied
          ? 'Your current account cannot view this data.'
          : 'Check your connection and try again.'}
      </p>
      {!permissionDenied ? (
        <button className="wl-button-secondary w-fit" type="button" onClick={retry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}

function readQuery(searchParams: URLSearchParams): MyTimeQuery {
  const parsed = myTimeQuerySchema.safeParse({
    date: searchParams.get('date') ?? defaultLocalDate(),
    limit: searchParams.get('limit') ?? DEFAULT_LEDGER_LIMIT,
    page: searchParams.get('page') ?? 1,
    view: searchParams.get('view') ?? 'WEEK',
  });
  if (parsed.success) return parsed.data;
  return Object.freeze({
    date: defaultLocalDate(),
    limit: DEFAULT_LEDGER_LIMIT,
    page: 1,
    view: 'WEEK',
  });
}

function defaultLocalDate(): string {
  return new Date().toISOString().slice(0, 10);
}
