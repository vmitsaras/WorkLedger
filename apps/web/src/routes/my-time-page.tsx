import { useQuery } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';

import {
  myTimeQuerySchema,
  type LeaveEntitlementLedgerEntry,
  type MyTime,
  type MyTimeQuery,
  type TimeAccountLedgerEntry,
} from '@workledger/contracts';
import {
  formatCompactDuration,
  formatDateOnly,
  formatList,
  type MessageArguments,
  type MessageKey,
} from '@workledger/i18n';
import { useWorkLedgerI18n, useWorkLedgerMessage } from '@workledger/i18n/react';
import {
  Alert,
  Button,
  DataTable,
  FilterBar,
  Panel,
  RouteState,
  StatusBadge,
  buttonVariants,
} from '@workledger/ui';
import { Pagination } from '../components/pagination.js';

import { ApiClientError } from '../app/api-client.js';
import { myTimeQuery } from '../app/query.js';
import { PageHeader } from '../components/page-header.js';

type MyTimePageProps = Readonly<{ balancesOnly?: boolean }>;

const DEFAULT_LEDGER_LIMIT = 20;

type MessageTranslator = <Key extends MessageKey>(
  key: Key,
  ...args: MessageArguments<Key>
) => string;

const RECORD_STATUS_KEYS = {
  COMPLETE: 'employee.time.records.status.complete',
  INCOMPLETE: 'employee.time.records.status.incomplete',
  NO_RECORD: 'employee.time.records.status.noRecord',
  PROVISIONAL: 'employee.time.records.status.provisional',
} as const satisfies Readonly<Record<MyTime['records'][number]['status'], MessageKey>>;

const TIME_ENTRY_TYPE_KEYS = {
  DAILY_DELTA: 'employee.time.entryType.dailyDelta',
  DAILY_RECALCULATION_DELTA: 'employee.time.entryType.dailyRecalculationDelta',
  MANUAL_ADMINISTRATIVE_ADJUSTMENT: 'employee.time.entryType.manualAdministrativeAdjustment',
  OPENING_BALANCE: 'employee.time.entryType.openingBalance',
  POST_LOCK_ADJUSTMENT: 'employee.time.entryType.postLockAdjustment',
} as const satisfies Readonly<Record<TimeAccountLedgerEntry['entryType'], MessageKey>>;

const LEAVE_ENTRY_TYPE_KEYS = {
  ALLOCATION: 'employee.time.entryType.allocation',
  APPROVED_DEDUCTION: 'employee.time.entryType.approvedDeduction',
  CANCELLATION_RESTORATION: 'employee.time.entryType.cancellationRestoration',
  CARRYOVER: 'employee.time.entryType.carryover',
  EXPIRY: 'employee.time.entryType.expiry',
  MANUAL_ADJUSTMENT: 'employee.time.entryType.manualAdjustment',
  PENDING_RESERVATION: 'employee.time.entryType.pendingReservation',
  RESERVATION_RELEASE: 'employee.time.entryType.reservationRelease',
} as const satisfies Readonly<Record<LeaveEntitlementLedgerEntry['entryType'], MessageKey>>;

export function MyTimePage({ balancesOnly = false }: MyTimePageProps) {
  const runtime = useWorkLedgerI18n();
  const t = useWorkLedgerMessage();
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

  const title = balancesOnly ? t('employee.time.balancesTitle') : t('employee.time.title');
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
              {period.view === 'WEEK'
                ? t('employee.time.period.week')
                : t('employee.time.period.month')}
            </p>
            <h2 id="personal-time-summary-heading" className="m-0 mt-1 text-2xl font-bold">
              {t('employee.time.period.range', {
                end: formatDateOnly(runtime.locale, period.endDate),
                start: formatDateOnly(runtime.locale, period.startDate),
              })}
            </h2>
            {!balancesOnly ? (
              <p className="m-0 mt-2 text-sm text-[var(--wl-text-muted)]">
                {formatList(
                  runtime.locale,
                  [
                    t('employee.time.period.summary.recordedDays', {
                      count: summary.recordedDayCount,
                    }),
                    t('employee.time.period.summary.incomplete', {
                      count: summary.incompleteRecordCount,
                    }),
                    t('employee.time.period.summary.balance', {
                      balance: formatCompactDuration(runtime, summary.completeBalanceMinutes, true),
                    }),
                  ],
                  { style: 'long', type: 'unit' },
                )}
              </p>
            ) : null}
          </div>
          {period.view === 'MONTH' && period.monthlyPeriodId !== null && !balancesOnly ? (
            <Link
              className={buttonVariants({ variant: 'secondary', className: 'inline-flex' })}
              to={`/monthly-periods/${encodeURIComponent(period.monthlyPeriodId)}`}
            >
              {t('employee.time.period.reviewMonthly')}
            </Link>
          ) : null}
        </div>
        <section aria-labelledby="flexible-time-heading" className="grid gap-3">
          <div>
            <h3 id="flexible-time-heading" className="m-0 text-lg font-bold">
              {t('employee.time.balance.heading')}
            </h3>
            <p className="m-0 mt-1 text-sm text-[var(--wl-text-muted)]">
              {t('employee.time.balance.help')}
            </p>
          </div>
          <dl className="grid gap-4 sm:grid-cols-3">
            <BalanceValue
              label={t('employee.time.balance.posted')}
              value={balance.postedBalanceMinutes}
            />
            <BalanceValue
              label={t('employee.time.balance.eligibleProjection')}
              value={balance.eligibleProjectedMinutes}
              signed
            />
            <BalanceValue
              label={t('employee.time.balance.projected')}
              value={balance.projectedBalanceMinutes}
            />
          </dl>
        </section>
      </Panel>

      <FilterBar
        onSubmit={(event) => event.preventDefault()}
        title={t('employee.time.filter.title')}
        description={t('employee.time.filter.description')}
      >
        <div className="grid gap-2">
          <span className="text-sm font-semibold">{t('employee.time.filter.view')}</span>
          <div className="flex flex-wrap gap-2" aria-label={t('employee.time.filter.viewLabel')}>
            {(['WEEK', 'MONTH'] as const).map((view) => (
              <Button
                key={view}
                type="button"
                aria-pressed={queryInput.view === view}
                variant="secondary"
                onPress={() => setQuery({ page: 1, view })}
              >
                {view === 'WEEK' ? t('employee.time.filter.week') : t('employee.time.filter.month')}
              </Button>
            ))}
          </div>
        </div>
        <label className="grid gap-1 text-sm font-semibold">
          {t('employee.time.filter.date')}
          <input
            className="wl-text-field"
            type="date"
            value={queryInput.date}
            onChange={(event) => setQuery({ date: event.target.value, page: 1 })}
          />
        </label>
      </FilterBar>

      {balance.excludedIncompleteDates.length > 0 ? (
        <Alert announce={false} title={t('employee.time.balance.excluded.title')} tone="warning">
          <p className="m-0">
            {t('employee.time.balance.excluded.description', {
              dates: formatList(
                runtime.locale,
                balance.excludedIncompleteDates.map((date) => formatDateOnly(runtime.locale, date)),
              ),
            })}
          </p>
        </Alert>
      ) : null}

      {!balancesOnly ? (
        <section aria-labelledby="time-records-heading" className="grid gap-4">
          <div>
            <h2 id="time-records-heading" className="m-0 text-xl font-bold">
              {t('employee.time.records.heading')}
            </h2>
            <p className="m-0 mt-1 text-sm text-[var(--wl-text-muted)]">
              {t('employee.time.records.description')}
            </p>
          </div>
          <div className="hidden md:block">
            <DataTable
              caption={t('employee.time.records.caption')}
              scrollLabel={t('employee.time.records.scrollLabel')}
            >
              <thead>
                <tr>
                  <th scope="col">{t('employee.time.records.column.date')}</th>
                  <th scope="col">{t('employee.time.records.column.status')}</th>
                  <th scope="col">{t('employee.time.records.column.expected')}</th>
                  <th scope="col">{t('employee.time.records.column.credited')}</th>
                  <th scope="col">{t('employee.time.records.column.balance')}</th>
                  <th scope="col">{t('employee.time.records.column.attention')}</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.localDate}>
                    <th scope="row">
                      {record.recordId === null ? (
                        formatDateOnly(runtime.locale, record.localDate)
                      ) : (
                        <Link to={`/time-records/${encodeURIComponent(record.recordId)}`}>
                          {formatDateOnly(runtime.locale, record.localDate)}
                        </Link>
                      )}
                    </th>
                    <td>
                      <RecordStatus status={record.status} />
                    </td>
                    <td>
                      {record.expectedMinutes === null
                        ? '—'
                        : formatCompactDuration(runtime, record.expectedMinutes)}
                    </td>
                    <td>
                      {record.creditedMinutes === null
                        ? '—'
                        : formatCompactDuration(runtime, record.creditedMinutes)}
                    </td>
                    <td>
                      {record.balanceMinutes === null
                        ? '—'
                        : formatCompactDuration(runtime, record.balanceMinutes, true)}
                    </td>
                    <td>{recordAttention(record, t)}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </div>
          <ol
            className="m-0 grid list-none gap-3 p-0 md:hidden"
            aria-label={t('employee.time.records.caption')}
          >
            {records.map((record) => (
              <li key={record.localDate}>
                <Panel as="article" className="grid gap-4" density="balanced">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h3 className="m-0 text-lg font-bold">
                      {record.recordId === null ? (
                        formatDateOnly(runtime.locale, record.localDate)
                      ) : (
                        <Link to={`/time-records/${encodeURIComponent(record.recordId)}`}>
                          {formatDateOnly(runtime.locale, record.localDate)}
                        </Link>
                      )}
                    </h3>
                    <RecordStatus status={record.status} />
                  </div>
                  <dl className="grid grid-cols-3 gap-3">
                    <CompactRecordValue
                      label={t('employee.time.records.column.expected')}
                      value={record.expectedMinutes}
                    />
                    <CompactRecordValue
                      label={t('employee.time.records.column.credited')}
                      value={record.creditedMinutes}
                    />
                    <CompactRecordValue
                      label={t('employee.time.records.column.balance')}
                      signed
                      value={record.balanceMinutes}
                    />
                  </dl>
                  <p className="m-0 text-sm text-[var(--wl-text-muted)]">
                    {recordAttention(record, t)}
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
            {t('employee.time.ledger.heading')}
          </h2>
          <p className="m-0 mt-1 text-sm text-[var(--wl-text-muted)]">
            {t('employee.time.ledger.description')}
          </p>
        </div>
        {ledger.entries.length === 0 ? (
          <RouteState kind="empty" title={t('employee.time.ledger.empty.title')}>
            <p>{t('employee.time.ledger.empty.description')}</p>
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
                    <strong>{t(TIME_ENTRY_TYPE_KEYS[entry.entryType])}</strong>
                    <p className="m-0 text-sm text-[var(--wl-text-muted)]">
                      {t('employee.time.ledger.effective', {
                        date: formatDateOnly(runtime.locale, entry.effectiveDate),
                      })}
                    </p>
                  </div>
                  <div className="text-sm tabular-nums sm:text-right">
                    <div>{formatCompactDuration(runtime, entry.minutes, true)}</div>
                    <div className="text-[var(--wl-text-muted)]">
                      {t('employee.time.ledger.balanceAfter', {
                        balance: formatCompactDuration(runtime, entry.balanceAfterMinutes, true),
                      })}
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
          summary={t('employee.time.ledger.pagination', {
            current: ledger.page,
            total: Math.max(1, Math.ceil(ledger.total / ledger.limit)),
          })}
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
  const runtime = useWorkLedgerI18n();
  const t = useWorkLedgerMessage();
  return (
    <section aria-labelledby="leave-balance-heading" className="grid gap-4">
      <div>
        <h2 id="leave-balance-heading" className="m-0 text-xl font-bold">
          {t('employee.time.leave.heading')}
        </h2>
        <p className="m-0 mt-1 text-sm text-[var(--wl-text-muted)]">
          {t('employee.time.leave.description')}
        </p>
      </div>
      {leave.accounts.length === 0 ? (
        <RouteState kind="empty" title={t('employee.time.leave.empty.title')}>
          <p>{t('employee.time.leave.empty.description')}</p>
        </RouteState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {leave.accounts.map((account) => (
            <Panel as="article" density="balanced" key={account.name}>
              <dl className="grid gap-3">
                <div>
                  <dt className="text-sm font-semibold text-[var(--wl-text-muted)]">
                    {t('employee.time.leave.account')}
                  </dt>
                  <dd className="m-0 text-lg font-bold">{account.name}</dd>
                </div>
                <BalanceValue
                  label={t('employee.time.leave.available')}
                  value={account.availableMinutes}
                />
                <BalanceValue
                  label={t('employee.time.leave.pendingReservation')}
                  value={account.reservedMinutes}
                />
                <BalanceValue
                  label={t('employee.time.leave.projectedRemaining')}
                  value={account.projectedRemainingMinutes}
                />
              </dl>
            </Panel>
          ))}
        </div>
      )}
      <div>
        <h3 className="m-0 text-lg font-bold">{t('employee.time.leave.ledger.heading')}</h3>
        <p className="m-0 mt-1 text-sm text-[var(--wl-text-muted)]">
          {t('employee.time.leave.ledger.description')}
        </p>
      </div>
      {leave.ledger.entries.length === 0 ? (
        <RouteState kind="empty" title={t('employee.time.leave.ledger.empty.title')}>
          <p>{t('employee.time.leave.ledger.empty.description')}</p>
        </RouteState>
      ) : (
        <ol className="m-0 grid list-none gap-3 p-0">
          {leave.ledger.entries.map((entry, index) => (
            <li key={`${entry.postedAt}-${entry.entryType}-${index.toString()}`}>
              <Panel as="article" className="grid gap-3" density="balanced">
                <div>
                  <strong>{t(LEAVE_ENTRY_TYPE_KEYS[entry.entryType])}</strong>
                  <p className="m-0 text-sm text-[var(--wl-text-muted)]">
                    {entry.absenceTypeName} {'·'}{' '}
                    {t('employee.time.ledger.effective', {
                      date: formatDateOnly(runtime.locale, entry.effectiveOn),
                    })}
                  </p>
                </div>
                <dl className="grid gap-2 text-sm sm:grid-cols-4">
                  <BalanceValue
                    label={t('employee.time.leave.entry')}
                    value={entry.minutes}
                    signed
                  />
                  <BalanceValue
                    label={t('employee.time.leave.availableAfter')}
                    value={entry.availableAfterMinutes}
                  />
                  <BalanceValue
                    label={t('employee.time.leave.reservedAfter')}
                    value={entry.reservedAfterMinutes}
                  />
                  <BalanceValue
                    label={t('employee.time.leave.projectedAfter')}
                    value={entry.projectedAfterMinutes}
                  />
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
        summary={t('employee.time.leave.ledger.pagination', {
          current: leave.ledger.page,
          total: Math.max(1, Math.ceil(leave.ledger.total / leave.ledger.limit)),
        })}
      />
    </section>
  );
}

function MyTimeFrame({
  balancesOnly,
  children,
  title,
}: Readonly<{ balancesOnly: boolean; children: ReactNode; title: string }>) {
  const t = useWorkLedgerMessage();
  return (
    <section className="grid max-w-5xl gap-8">
      <PageHeader
        eyebrow={t('employee.time.eyebrow')}
        title={title}
        description={
          balancesOnly ? t('employee.time.balancesDescription') : t('employee.time.description')
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
  const runtime = useWorkLedgerI18n();
  return (
    <div className="grid gap-1">
      <dt className="text-sm font-semibold text-[var(--wl-text-muted)]">{label}</dt>
      <dd className="m-0 text-2xl font-bold tabular-nums">
        {formatCompactDuration(runtime, value, signed)}
      </dd>
    </div>
  );
}

function CompactRecordValue({
  label,
  signed = false,
  value,
}: Readonly<{ label: string; signed?: boolean; value: number | null }>) {
  const runtime = useWorkLedgerI18n();
  return (
    <div className="grid gap-1">
      <dt className="text-xs font-semibold text-[var(--wl-text-muted)]">{label}</dt>
      <dd className="m-0 text-sm font-bold tabular-nums">
        {value === null ? '—' : formatCompactDuration(runtime, value, signed)}
      </dd>
    </div>
  );
}

function RecordStatus({ status }: Readonly<{ status: MyTime['records'][number]['status'] }>) {
  const t = useWorkLedgerMessage();
  const tone = status === 'COMPLETE' ? 'success' : status === 'INCOMPLETE' ? 'warning' : 'info';
  return <StatusBadge tone={tone}>{t(RECORD_STATUS_KEYS[status])}</StatusBadge>;
}

function recordAttention(record: MyTime['records'][number], t: MessageTranslator): ReactNode {
  if (record.attention.warnings.length === 0) {
    return record.status === 'INCOMPLETE'
      ? t('employee.time.records.attention.incomplete')
      : t('employee.time.records.attention.none');
  }
  const label = t('employee.time.records.attention.warnings', {
    count: record.attention.warnings.length,
  });
  if (record.recordId === null) return label;
  return (
    <Link to={`/time-records/${encodeURIComponent(record.recordId)}`}>
      {t('employee.time.records.attention.review', {
        count: record.attention.warnings.length,
      })}
    </Link>
  );
}

function MyTimeLoading() {
  const t = useWorkLedgerMessage();
  return (
    <RouteState kind="loading" title={t('employee.time.loading.title')}>
      <p>{t('employee.time.loading.description')}</p>
    </RouteState>
  );
}

function MyTimeError({ error, retry }: Readonly<{ error: unknown; retry: () => void }>) {
  const t = useWorkLedgerMessage();
  const permissionDenied = error instanceof ApiClientError && error.code === 'ACCESS_DENIED';
  return (
    <RouteState
      actions={
        permissionDenied ? undefined : (
          <Button variant="secondary" onPress={retry}>
            {t('shared.action.tryAgain')}
          </Button>
        )
      }
      kind={permissionDenied ? 'permission-denied' : 'error'}
      title={
        permissionDenied
          ? t('employee.time.error.denied.title')
          : t('employee.time.error.unavailable.title')
      }
    >
      <p className="m-0">
        {permissionDenied
          ? t('employee.time.error.denied.description')
          : t('employee.time.error.unavailable.description')}
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
