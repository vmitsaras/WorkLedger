import { useQuery } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';

import { myTimeQuerySchema, type MyTime, type MyTimeQuery } from '@workledger/contracts';
import {
  Alert,
  Button,
  DataTable,
  FilterBar,
  Pagination,
  Panel,
  RouteState,
  StatusBadge,
  buttonVariants,
} from '@workledger/ui';

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

  const { balance, leave, ledger, period, records, summary } = query.data;
  return (
    <MyTimeFrame balancesOnly={balancesOnly} title={title}>
      <Panel
        aria-labelledby="personal-time-summary-heading"
        className="grid gap-5"
        density="balanced"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="m-0 text-sm font-semibold text-[var(--wl-text-muted)]">
              {period.view === 'WEEK' ? 'Selected week' : 'Selected month'}
            </p>
            <h2 id="personal-time-summary-heading" className="m-0 mt-1 text-2xl font-bold">
              {formatLocalDate(period.startDate)} to {formatLocalDate(period.endDate)}
            </h2>
            {!balancesOnly ? (
              <p className="m-0 mt-2 text-sm text-[var(--wl-text-muted)]">
                {summary.recordedDayCount} recorded day{summary.recordedDayCount === 1 ? '' : 's'} ·{' '}
                {summary.incompleteRecordCount} incomplete · complete-record balance{' '}
                {formatDuration(summary.completeBalanceMinutes, true)}
              </p>
            ) : null}
          </div>
          {period.view === 'MONTH' && period.monthlyPeriodId !== null && !balancesOnly ? (
            <Link
              className={buttonVariants({ variant: 'secondary', className: 'inline-flex' })}
              to={`/monthly-periods/${encodeURIComponent(period.monthlyPeriodId)}`}
            >
              Review monthly period
            </Link>
          ) : null}
        </div>
        <section aria-labelledby="flexible-time-heading" className="grid gap-3">
          <div>
            <h3 id="flexible-time-heading" className="m-0 text-lg font-bold">
              Flexible-time balance
            </h3>
            <p className="m-0 mt-1 text-sm text-[var(--wl-text-muted)]">
              Posted entries are final. Eligible complete records not yet posted remain separate.
            </p>
          </div>
          <dl className="grid gap-4 sm:grid-cols-3">
            <BalanceValue label="Posted balance" value={balance.postedBalanceMinutes} />
            <BalanceValue
              label="Eligible projection"
              value={balance.eligibleProjectedMinutes}
              signed
            />
            <BalanceValue label="Projected balance" value={balance.projectedBalanceMinutes} />
          </dl>
        </section>
      </Panel>

      <FilterBar
        onSubmit={(event) => event.preventDefault()}
        title="Choose time period"
        description="Choose a weekly or monthly view and the date you want to review."
      >
        <div className="grid gap-2">
          <span className="text-sm font-semibold">View</span>
          <div className="flex flex-wrap gap-2" aria-label="Time record view">
            {(['WEEK', 'MONTH'] as const).map((view) => (
              <Button
                key={view}
                type="button"
                aria-pressed={queryInput.view === view}
                variant="secondary"
                onPress={() => setQuery({ page: 1, view })}
              >
                {view === 'WEEK' ? 'Week' : 'Month'}
              </Button>
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
      </FilterBar>

      {balance.excludedIncompleteDates.length > 0 ? (
        <Alert
          announce={false}
          title="Projected balance excludes incomplete records"
          tone="warning"
        >
          <p className="m-0">
            Review {balance.excludedIncompleteDates.map(formatLocalDate).join(', ')} before relying
            on the projected total.
          </p>
        </Alert>
      ) : null}

      {!balancesOnly ? (
        <section aria-labelledby="time-records-heading" className="grid gap-4">
          <div>
            <h2 id="time-records-heading" className="m-0 text-xl font-bold">
              Daily records
            </h2>
            <p className="m-0 mt-1 text-sm text-[var(--wl-text-muted)]">
              Open a recorded date for its calculation, work sessions, events, and recovery
              guidance.
            </p>
          </div>
          <div className="hidden md:block">
            <DataTable
              caption="Daily time record summaries for the selected period"
              scrollLabel="Daily time records table"
            >
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Status</th>
                  <th scope="col">Expected</th>
                  <th scope="col">Credited</th>
                  <th scope="col">Balance</th>
                  <th scope="col">Attention</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.localDate}>
                    <th scope="row">
                      {record.recordId === null ? (
                        formatLocalDate(record.localDate)
                      ) : (
                        <Link to={`/time-records/${encodeURIComponent(record.recordId)}`}>
                          {formatLocalDate(record.localDate)}
                        </Link>
                      )}
                    </th>
                    <td>
                      <RecordStatus status={record.status} />
                    </td>
                    <td>
                      {record.expectedMinutes === null
                        ? '—'
                        : formatDuration(record.expectedMinutes)}
                    </td>
                    <td>
                      {record.creditedMinutes === null
                        ? '—'
                        : formatDuration(record.creditedMinutes)}
                    </td>
                    <td>
                      {record.balanceMinutes === null
                        ? '—'
                        : formatDuration(record.balanceMinutes, true)}
                    </td>
                    <td>{recordAttention(record)}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </div>
          <ol
            className="m-0 grid list-none gap-3 p-0 md:hidden"
            aria-label="Daily time record summaries for the selected period"
          >
            {records.map((record) => (
              <li key={record.localDate}>
                <Panel as="article" className="grid gap-4" density="balanced">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h3 className="m-0 text-lg font-bold">
                      {record.recordId === null ? (
                        formatLocalDate(record.localDate)
                      ) : (
                        <Link to={`/time-records/${encodeURIComponent(record.recordId)}`}>
                          {formatLocalDate(record.localDate)}
                        </Link>
                      )}
                    </h3>
                    <RecordStatus status={record.status} />
                  </div>
                  <dl className="grid grid-cols-3 gap-3">
                    <CompactRecordValue label="Expected" value={record.expectedMinutes} />
                    <CompactRecordValue label="Credited" value={record.creditedMinutes} />
                    <CompactRecordValue label="Balance" signed value={record.balanceMinutes} />
                  </dl>
                  <p className="m-0 text-sm text-[var(--wl-text-muted)]">
                    {recordAttention(record)}
                  </p>
                </Panel>
              </li>
            ))}
          </ol>
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
          <RouteState kind="empty" title="No posted flexible-time entries">
            <p>No final ledger entries exist through this period.</p>
          </RouteState>
        ) : (
          <ol className="m-0 grid list-none gap-3 p-0">
            {ledger.entries.map((entry) => (
              <li key={`${entry.postedAt}-${entry.explanationCode}`}>
                <Panel
                  as="article"
                  className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center"
                  density="balanced"
                >
                  <div>
                    <strong>{entry.entryType.replaceAll('_', ' ').toLowerCase()}</strong>
                    <p className="m-0 text-sm text-[var(--wl-text-muted)]">
                      Effective {formatLocalDate(entry.effectiveDate)} ·{' '}
                      {entry.explanationCode.replaceAll('_', ' ').toLowerCase()}
                    </p>
                  </div>
                  <div className="text-sm tabular-nums sm:text-right">
                    <div>{formatDuration(entry.minutes, true)}</div>
                    <div className="text-[var(--wl-text-muted)]">
                      Balance after: {formatDuration(entry.balanceAfterMinutes, true)}
                    </div>
                  </div>
                </Panel>
              </li>
            ))}
          </ol>
        )}
        <Pagination
          currentPage={ledger.page}
          onPageChange={(page) => setQuery({ page })}
          pageCount={Math.max(1, Math.ceil(ledger.total / ledger.limit))}
          summary={`Flexible-time ledger page ${ledger.page} of ${Math.max(1, Math.ceil(ledger.total / ledger.limit))}`}
        />
      </section>

      {balancesOnly ? (
        <LeaveBalanceSection leave={leave} onPage={(page) => setQuery({ page })} />
      ) : null}
    </MyTimeFrame>
  );
}

function LeaveBalanceSection({
  leave,
  onPage,
}: Readonly<{ leave: MyTime['leave']; onPage: (page: number) => void }>) {
  return (
    <section aria-labelledby="leave-balance-heading" className="grid gap-4">
      <div>
        <h2 id="leave-balance-heading" className="m-0 text-xl font-bold">
          Leave balances
        </h2>
        <p className="m-0 mt-1 text-sm text-[var(--wl-text-muted)]">
          Available minutes exclude pending reservations. Projected remaining includes them.
        </p>
      </div>
      {leave.accounts.length === 0 ? (
        <RouteState kind="empty" title="No leave entitlement accounts">
          <p>No leave allocation has been posted yet.</p>
        </RouteState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {leave.accounts.map((account) => (
            <Panel as="article" density="balanced" key={account.name}>
              <dl className="grid gap-3">
                <div>
                  <dt className="text-sm font-semibold text-[var(--wl-text-muted)]">Account</dt>
                  <dd className="m-0 text-lg font-bold">{account.name}</dd>
                </div>
                <BalanceValue label="Available" value={account.availableMinutes} />
                <BalanceValue label="Pending reservation" value={account.reservedMinutes} />
                <BalanceValue
                  label="Projected remaining"
                  value={account.projectedRemainingMinutes}
                />
              </dl>
            </Panel>
          ))}
        </div>
      )}
      <div>
        <h3 className="m-0 text-lg font-bold">Leave entitlement source entries</h3>
        <p className="m-0 mt-1 text-sm text-[var(--wl-text-muted)]">
          Every entry shows its exact effect and the resulting available, reserved, and projected
          amounts.
        </p>
      </div>
      {leave.ledger.entries.length === 0 ? (
        <RouteState kind="empty" title="No leave source entries">
          <p>No entitlement, reservation, or adjustment entry exists yet.</p>
        </RouteState>
      ) : (
        <ol className="m-0 grid list-none gap-3 p-0">
          {leave.ledger.entries.map((entry, index) => (
            <li key={`${entry.postedAt}-${entry.entryType}-${index.toString()}`}>
              <Panel as="article" className="grid gap-3" density="balanced">
                <div>
                  <strong>{entry.entryType.replaceAll('_', ' ').toLowerCase()}</strong>
                  <p className="m-0 text-sm text-[var(--wl-text-muted)]">
                    {entry.absenceTypeName} · effective {formatLocalDate(entry.effectiveOn)}
                  </p>
                </div>
                <dl className="grid gap-2 text-sm sm:grid-cols-4">
                  <BalanceValue label="Entry" value={entry.minutes} signed />
                  <BalanceValue label="Available after" value={entry.availableAfterMinutes} />
                  <BalanceValue label="Reserved after" value={entry.reservedAfterMinutes} />
                  <BalanceValue label="Projected after" value={entry.projectedAfterMinutes} />
                </dl>
              </Panel>
            </li>
          ))}
        </ol>
      )}
      <Pagination
        currentPage={leave.ledger.page}
        onPageChange={onPage}
        pageCount={Math.max(1, Math.ceil(leave.ledger.total / leave.ledger.limit))}
        summary={`Leave ledger page ${leave.ledger.page} of ${Math.max(1, Math.ceil(leave.ledger.total / leave.ledger.limit))}`}
      />
    </section>
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
            ? 'Your flexible-time and leave balances, with clearly identified projections and source entries.'
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

function CompactRecordValue({
  label,
  signed = false,
  value,
}: Readonly<{ label: string; signed?: boolean; value: number | null }>) {
  return (
    <div className="grid gap-1">
      <dt className="text-xs font-semibold text-[var(--wl-text-muted)]">{label}</dt>
      <dd className="m-0 text-sm font-bold tabular-nums">
        {value === null ? '—' : formatDuration(value, signed)}
      </dd>
    </div>
  );
}

function RecordStatus({ status }: Readonly<{ status: MyTime['records'][number]['status'] }>) {
  const tone = status === 'COMPLETE' ? 'success' : status === 'INCOMPLETE' ? 'warning' : 'info';
  return <StatusBadge tone={tone}>{status.replaceAll('_', ' ').toLowerCase()}</StatusBadge>;
}

function recordAttention(record: MyTime['records'][number]): ReactNode {
  if (record.attention.warnings.length === 0) {
    return record.status === 'INCOMPLETE' ? 'Review incomplete record' : 'No attention needed';
  }
  const label = `${record.attention.warnings.length.toString()} warning${record.attention.warnings.length === 1 ? '' : 's'}`;
  if (record.recordId === null) return label;
  return (
    <Link to={`/time-records/${encodeURIComponent(record.recordId)}`}>
      {label} · review details
    </Link>
  );
}

function MyTimeLoading() {
  return (
    <RouteState kind="loading" title="Loading your records">
      <p>Checking the selected period, balances, and source entries.</p>
    </RouteState>
  );
}

function MyTimeError({ error, retry }: Readonly<{ error: unknown; retry: () => void }>) {
  const permissionDenied = error instanceof ApiClientError && error.code === 'ACCESS_DENIED';
  return (
    <RouteState
      actions={
        permissionDenied ? undefined : (
          <Button variant="secondary" onPress={retry}>
            Try again
          </Button>
        )
      }
      kind={permissionDenied ? 'permission-denied' : 'error'}
      title={permissionDenied ? 'You cannot view these records' : 'Your records are unavailable'}
    >
      <p className="m-0">
        {permissionDenied
          ? 'Your current account does not have employee self-service access.'
          : 'No time, balance, or ledger values were displayed. Check your connection and try again.'}
      </p>
    </RouteState>
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
