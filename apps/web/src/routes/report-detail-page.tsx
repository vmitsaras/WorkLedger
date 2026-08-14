import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLoaderData, useNavigate, useSearchParams } from 'react-router';

import {
  reportQuerySchema,
  reportSortSchema,
  type ReportCatalog,
  type ReportCatalogItem,
  type ReportKey,
  type ReportQuery,
  type ReportResult,
  type ReportRow,
  type ReportSort,
} from '@workledger/contracts';
import { Button, buttonVariants } from '@workledger/ui';

import { ApiClientError, clearSessionMemory } from '../app/api-client.js';
import { formatDuration, formatLocalDate, formatTimeWithOffset } from '../app/date-time-format.js';
import { reportResultQuery } from '../app/query.js';
import { setPendingSignInNotice } from '../app/session-notice.js';
import { PageHeader } from '../components/page-header.js';
import { ReportPortabilityActions } from '../components/report-portability-actions.js';

export type ReportRouteLoaderData = Readonly<{
  catalog: ReportCatalog;
  query: ReportQuery;
  report: ReportCatalogItem;
  reportKey: ReportKey;
}>;

type FilterDraft = Readonly<{
  direction: ReportQuery['direction'];
  from: string;
  sort: ReportSort;
  to: string;
}>;

export function ReportDetailPage() {
  const loaderData = useLoaderData<ReportRouteLoaderData>();
  const [, setSearchParams] = useSearchParams();
  const query = useQuery(reportResultQuery(loaderData.reportKey, loaderData.query));
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<FilterDraft>(() => toDraft(loaderData.query));
  const [filterError, setFilterError] = useState<string>();

  useEffect(() => {
    setDraft(toDraft(loaderData.query));
    setFilterError(undefined);
  }, [loaderData.query]);

  useEffect(() => {
    if (query.data === undefined) return;
    const lastPage = Math.max(1, query.data.pagination.totalPages);
    if (loaderData.query.page <= lastPage) return;
    setSearchParams(toSearchParams({ ...loaderData.query, page: lastPage }), { replace: true });
  }, [loaderData.query, query.data, setSearchParams]);

  useEffect(() => {
    if (!isAuthenticationError(query.error)) return;
    clearSessionMemory();
    queryClient.clear();
    if (query.error.code === 'AUTH_SESSION_EXPIRED') {
      setPendingSignInNotice('SESSION_EXPIRED');
    }
    void navigate('/sign-in', { replace: true });
  }, [navigate, query.error, queryClient]);

  const submitFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = reportQuerySchema.safeParse({
      direction: draft.direction,
      ...(loaderData.query.employeeId === undefined
        ? {}
        : { employeeId: loaderData.query.employeeId }),
      from: draft.from,
      limit: loaderData.query.limit,
      page: 1,
      sort: draft.sort,
      to: draft.to,
    });
    if (!parsed.success || !loaderData.report.availableSorts.includes(parsed.data.sort)) {
      setFilterError(
        'Enter both dates in order, keep the range within 366 days, and choose an available sort.',
      );
      return;
    }
    setFilterError(undefined);
    setSearchParams(toSearchParams(parsed.data));
  };

  const resetFilters = () => {
    const reset = reportQuerySchema.parse({
      direction: 'ASC',
      from: loaderData.catalog.defaultRange.from,
      limit: loaderData.query.limit,
      page: 1,
      sort: loaderData.report.defaultSort,
      to: loaderData.catalog.defaultRange.to,
    });
    setFilterError(undefined);
    setSearchParams(toSearchParams(reset));
  };

  return (
    <section className="grid gap-6">
      <div className="grid gap-3">
        <Link className="w-fit text-sm font-semibold" to="/reports">
          Back to reports
        </Link>
        <PageHeader
          eyebrow="Report"
          title={loaderData.report.title}
          description={loaderData.report.description}
        />
      </div>
      <ReportFilters
        draft={draft}
        error={filterError}
        onChange={setDraft}
        onReset={resetFilters}
        onSubmit={submitFilters}
        query={loaderData.query}
        report={loaderData.report}
      />
      {query.isPending ? (
        <ReportLoading />
      ) : query.isError || query.data === undefined ? (
        <ReportError error={query.error} retry={() => void query.refetch()} />
      ) : (
        <ReportResults
          data={query.data}
          isFetching={query.isFetching}
          onPage={(page) => setSearchParams(toSearchParams({ ...loaderData.query, page }))}
          query={loaderData.query}
          refresh={async () => {
            const refreshed = await query.refetch({ throwOnError: true });
            if (refreshed.data === undefined) throw new Error('Report refresh returned no data.');
            return refreshed.data;
          }}
          report={loaderData.report}
        />
      )}
    </section>
  );
}

function ReportFilters({
  draft,
  error,
  onChange,
  onReset,
  onSubmit,
  query,
  report,
}: Readonly<{
  draft: FilterDraft;
  error: string | undefined;
  onChange: (draft: FilterDraft) => void;
  onReset: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  query: ReportQuery;
  report: ReportCatalogItem;
}>) {
  return (
    <section className="grid gap-3" aria-labelledby="report-filters-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="report-filters-heading" className="m-0 text-xl font-bold">
            Date range and order
          </h2>
          <p className="m-0 mt-1 text-sm text-[var(--wl-text-muted)]">
            Applied: {formatLocalDate(query.from)} through {formatLocalDate(query.to)};{' '}
            {sortLabel(query.sort).toLocaleLowerCase()}, {query.direction.toLocaleLowerCase()}.
            {query.employeeId === undefined ? '' : ' One authorized employee target is applied.'}
          </p>
        </div>
        <Button type="button" variant="quiet" className="w-fit" onPress={onReset}>
          Reset report filters
        </Button>
      </div>
      <form
        className="grid gap-4 rounded-xl border border-[var(--wl-border)] bg-[var(--wl-surface-raised)] p-4"
        onSubmit={onSubmit}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="grid gap-2 text-sm font-semibold" htmlFor="report-from">
            From
            <input
              aria-describedby={error === undefined ? undefined : 'report-filter-error'}
              aria-invalid={error === undefined ? undefined : true}
              className="wl-field-control"
              id="report-from"
              name="from"
              type="date"
              value={draft.from}
              onChange={(event) => onChange({ ...draft, from: event.currentTarget.value })}
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold" htmlFor="report-to">
            To
            <input
              aria-describedby={error === undefined ? undefined : 'report-filter-error'}
              aria-invalid={error === undefined ? undefined : true}
              className="wl-field-control"
              id="report-to"
              name="to"
              type="date"
              value={draft.to}
              onChange={(event) => onChange({ ...draft, to: event.currentTarget.value })}
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold" htmlFor="report-sort">
            Sort by
            <select
              className="wl-field-control"
              id="report-sort"
              name="sort"
              value={draft.sort}
              onChange={(event) => {
                const parsed = reportSortSchema.safeParse(event.currentTarget.value);
                if (parsed.success) onChange({ ...draft, sort: parsed.data });
              }}
            >
              {report.availableSorts.map((sort) => (
                <option key={sort} value={sort}>
                  {sortLabel(sort)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold" htmlFor="report-direction">
            Direction
            <select
              className="wl-field-control"
              id="report-direction"
              name="direction"
              value={draft.direction}
              onChange={(event) =>
                onChange({
                  ...draft,
                  direction: event.currentTarget.value === 'DESC' ? 'DESC' : 'ASC',
                })
              }
            >
              <option value="ASC">Ascending</option>
              <option value="DESC">Descending</option>
            </select>
          </label>
        </div>
        {error === undefined ? null : (
          <p
            className="m-0 text-sm font-semibold text-[var(--wl-danger)]"
            id="report-filter-error"
            role="alert"
          >
            {error}
          </p>
        )}
        <Button className="w-fit" type="submit">
          Apply report filters
        </Button>
      </form>
    </section>
  );
}

function ReportResults({
  data,
  isFetching,
  onPage,
  query,
  refresh,
  report,
}: Readonly<{
  data: ReportResult;
  isFetching: boolean;
  onPage: (page: number) => void;
  query: ReportQuery;
  refresh: () => Promise<ReportResult>;
  report: ReportCatalogItem;
}>) {
  return (
    <section className="grid gap-5" aria-labelledby="report-results-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="report-results-heading" className="m-0 text-xl font-bold">
            Results
          </h2>
          <p className="m-0 mt-1 text-sm text-[var(--wl-text-muted)]">
            {data.pagination.total} row{data.pagination.total === 1 ? '' : 's'} in{' '}
            {scopeLabel(data.scope)} scope. Totals cover all matching rows, not only this page.
          </p>
        </div>
        <p
          className="m-0 min-h-6 text-sm text-[var(--wl-text-muted)]"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {isFetching
            ? 'Refreshing report…'
            : `Report generated ${formatTimeWithOffset(data.generatedAt, data.timeZone)}.`}
        </p>
      </div>
      {data.partial ? (
        <p className="wl-alert wl-alert-warning m-0 rounded-xl border p-4">
          This report is partial because one or more daily records are incomplete. Totals may change
          after those records are resolved.
        </p>
      ) : null}
      <ReportSummary data={data} />
      {data.rows.length === 0 ? (
        <p className="wl-alert m-0 rounded-xl border p-4">
          No report rows match the applied date range and permission scope.
        </p>
      ) : (
        <ReportTable data={data} query={query} />
      )}
      <ReportPagination data={data} onPage={onPage} />
      <ReportPortabilityActions data={data} query={query} refresh={refresh} report={report} />
    </section>
  );
}

function ReportSummary({ data }: Readonly<{ data: ReportResult }>) {
  const items: readonly [string, ReactNode][] = (() => {
    switch (data.summary.kind) {
      case 'MONTHLY_TIME':
        return [
          ['Expected', formatDuration(data.summary.expectedMinutes)],
          ['Worked', formatDuration(data.summary.workedMinutes)],
          ['Credited', formatDuration(data.summary.creditedMinutes)],
          ['Balance', formatDuration(data.summary.balanceMinutes, true)],
          ['Post-lock change', formatDuration(data.summary.postLockDeltaMinutes, true)],
          ['Incomplete records', data.summary.incompleteRecordCount.toLocaleString()],
        ];
      case 'FLEXIBLE_TIME':
        return [
          ['Opening balance', formatDuration(data.summary.openingBalanceMinutes, true)],
          ['Range change', formatDuration(data.summary.rangeChangeMinutes, true)],
          ['Closing balance', formatDuration(data.summary.closingBalanceMinutes, true)],
        ];
      case 'LEAVE':
        return [
          ['Opening available', formatDuration(data.summary.openingAvailableMinutes, true)],
          ['Available change', formatDuration(data.summary.availableChangeMinutes, true)],
          ['Closing available', formatDuration(data.summary.closingAvailableMinutes, true)],
          ['Reserved', formatDuration(data.summary.reservedMinutes)],
          ['Projected remaining', formatDuration(data.summary.projectedRemainingMinutes, true)],
        ];
      case 'MISSING_RECORD':
        return [['Incomplete records', data.summary.recordCount.toLocaleString()]];
      case 'PENDING_APPROVAL':
        return [['Actionable approvals', data.summary.itemCount.toLocaleString()]];
    }
  })();
  return (
    <dl className="m-0 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(([label, value]) => (
        <div
          key={label}
          className="rounded-xl border border-[var(--wl-border)] bg-[var(--wl-surface-raised)] p-4"
        >
          <dt className="text-sm font-semibold text-[var(--wl-text-muted)]">{label}</dt>
          <dd className="m-0 mt-1 text-xl font-bold">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ReportTable({ data, query }: Readonly<{ data: ReportResult; query: ReportQuery }>) {
  const content = tableContent(data.key, data.rows, query, data.timeZone);
  return (
    <div
      aria-label={`${reportKeyLabel(data.key)} report table`}
      className="overflow-x-auto rounded-xl border border-[var(--wl-border)]"
      role="region"
      tabIndex={0}
    >
      <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
        <caption className="sr-only">
          {reportKeyLabel(data.key)} rows for {formatLocalDate(data.range.from)} through{' '}
          {formatLocalDate(data.range.to)}
        </caption>
        {content}
      </table>
    </div>
  );
}

function tableContent(
  key: ReportKey,
  rows: ReportResult['rows'],
  query: ReportQuery,
  timeZone: string,
): ReactNode {
  switch (key) {
    case 'monthly-time':
      return (
        <>
          <ReportTableHead
            columns={[
              ['Employee', 'EMPLOYEE'],
              ['Month', 'DATE'],
              ['Status', 'STATUS'],
              ['Expected'],
              ['Worked'],
              ['Credited'],
              ['Balance', 'VALUE'],
              ['Incomplete'],
              ['Post-lock change'],
            ]}
            query={query}
          />
          <tbody>{rows.map((row, index) => monthlyTimeRow(row, index))}</tbody>
        </>
      );
    case 'flexible-time':
      return (
        <>
          <ReportTableHead
            columns={[
              ['Employee', 'EMPLOYEE'],
              ['Opening'],
              ['Range change'],
              ['Closing', 'VALUE'],
            ]}
            query={query}
          />
          <tbody>{rows.map((row, index) => flexibleTimeRow(row, index))}</tbody>
        </>
      );
    case 'leave':
      return (
        <>
          <ReportTableHead
            columns={[
              ['Employee', 'EMPLOYEE'],
              ['Leave account'],
              ['Opening'],
              ['Available change'],
              ['Closing'],
              ['Reserved'],
              ['Projected', 'VALUE'],
            ]}
            query={query}
          />
          <tbody>{rows.map((row, index) => leaveRow(row, index))}</tbody>
        </>
      );
    case 'missing-records':
      return (
        <>
          <ReportTableHead
            columns={[
              ['Employee', 'EMPLOYEE'],
              ['Date', 'DATE'],
              ['Status'],
              ['Expected'],
              ['Worked'],
              ['Warnings'],
            ]}
            query={query}
          />
          <tbody>{rows.map((row, index) => missingRecordRow(row, index))}</tbody>
        </>
      );
    case 'pending-approvals':
      return (
        <>
          <ReportTableHead
            columns={[
              ['Employee', 'EMPLOYEE'],
              ['Workflow'],
              ['Affected dates'],
              ['Submitted', 'DATE'],
              ['Action'],
            ]}
            query={query}
          />
          <tbody>{rows.map((row, index) => pendingApprovalRow(row, index, timeZone))}</tbody>
        </>
      );
  }
}

type TableColumn = readonly [label: string, sort?: ReportSort];

function ReportTableHead({
  columns,
  query,
}: Readonly<{ columns: readonly TableColumn[]; query: ReportQuery }>) {
  return (
    <thead className="bg-[var(--wl-surface-subtle)]">
      <tr>
        {columns.map(([label, sort]) => (
          <th
            key={label}
            aria-sort={
              sort === query.sort
                ? query.direction === 'ASC'
                  ? 'ascending'
                  : 'descending'
                : undefined
            }
            className="border-b border-[var(--wl-border)] px-4 py-3 font-bold"
            scope="col"
          >
            {label}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function monthlyTimeRow(row: ReportRow, index: number): ReactNode {
  if (row.kind !== 'MONTHLY_TIME') return null;
  return (
    <tr
      key={`${row.monthlyPeriodId}:${index.toString()}`}
      className="border-b border-[var(--wl-border)] last:border-b-0"
    >
      <th className="px-4 py-3 font-semibold" scope="row">
        {row.employeeDisplayName}
      </th>
      <td className="px-4 py-3">
        <Link to={`/monthly-periods/${row.monthlyPeriodId}`}>
          {formatLocalDate(row.monthStart)}
        </Link>
      </td>
      <td className="px-4 py-3">{humanize(row.workflowStatus)}</td>
      <td className="px-4 py-3 tabular-nums">{formatDuration(row.expectedMinutes)}</td>
      <td className="px-4 py-3 tabular-nums">{formatDuration(row.workedMinutes)}</td>
      <td className="px-4 py-3 tabular-nums">{formatDuration(row.creditedMinutes)}</td>
      <td className="px-4 py-3 tabular-nums">{formatDuration(row.balanceMinutes, true)}</td>
      <td className="px-4 py-3 tabular-nums">{row.incompleteRecordCount}</td>
      <td className="px-4 py-3 tabular-nums">{formatDuration(row.postLockDeltaMinutes, true)}</td>
    </tr>
  );
}

function flexibleTimeRow(row: ReportRow, index: number): ReactNode {
  if (row.kind !== 'FLEXIBLE_TIME') return null;
  return (
    <tr
      key={`${row.employeeDisplayName}:${index.toString()}`}
      className="border-b border-[var(--wl-border)] last:border-b-0"
    >
      <th className="px-4 py-3 font-semibold" scope="row">
        {row.employeeDisplayName}
      </th>
      <td className="px-4 py-3 tabular-nums">{formatDuration(row.openingBalanceMinutes, true)}</td>
      <td className="px-4 py-3 tabular-nums">{formatDuration(row.rangeChangeMinutes, true)}</td>
      <td className="px-4 py-3 tabular-nums">{formatDuration(row.closingBalanceMinutes, true)}</td>
    </tr>
  );
}

function leaveRow(row: ReportRow, index: number): ReactNode {
  if (row.kind !== 'LEAVE') return null;
  return (
    <tr
      key={`${row.employeeDisplayName}:${row.accountName}:${index.toString()}`}
      className="border-b border-[var(--wl-border)] last:border-b-0"
    >
      <th className="px-4 py-3 font-semibold" scope="row">
        {row.employeeDisplayName}
      </th>
      <td className="px-4 py-3">{row.accountName}</td>
      <td className="px-4 py-3 tabular-nums">
        {formatDuration(row.openingAvailableMinutes, true)}
      </td>
      <td className="px-4 py-3 tabular-nums">{formatDuration(row.availableChangeMinutes, true)}</td>
      <td className="px-4 py-3 tabular-nums">
        {formatDuration(row.closingAvailableMinutes, true)}
      </td>
      <td className="px-4 py-3 tabular-nums">{formatDuration(row.reservedMinutes)}</td>
      <td className="px-4 py-3 tabular-nums">
        {formatDuration(row.projectedRemainingMinutes, true)}
      </td>
    </tr>
  );
}

function missingRecordRow(row: ReportRow, index: number): ReactNode {
  if (row.kind !== 'MISSING_RECORD') return null;
  return (
    <tr
      key={`${row.employeeDisplayName}:${row.localDate}:${index.toString()}`}
      className="border-b border-[var(--wl-border)] last:border-b-0"
    >
      <th className="px-4 py-3 font-semibold" scope="row">
        {row.employeeDisplayName}
      </th>
      <td className="px-4 py-3">{formatLocalDate(row.localDate)}</td>
      <td className="px-4 py-3">Incomplete</td>
      <td className="px-4 py-3 tabular-nums">{formatDuration(row.expectedMinutes)}</td>
      <td className="px-4 py-3 tabular-nums">{formatDuration(row.workedMinutes)}</td>
      <td className="px-4 py-3">
        {row.warningCodes.length === 0
          ? 'No warning code'
          : row.warningCodes.map(humanize).join(', ')}
      </td>
    </tr>
  );
}

function pendingApprovalRow(row: ReportRow, index: number, timeZone: string): ReactNode {
  if (row.kind !== 'PENDING_APPROVAL') return null;
  return (
    <tr
      key={`${row.approvalId}:${index.toString()}`}
      className="border-b border-[var(--wl-border)] last:border-b-0"
    >
      <th className="px-4 py-3 font-semibold" scope="row">
        {row.employeeDisplayName}
      </th>
      <td className="px-4 py-3">{humanize(row.approvalKind)}</td>
      <td className="px-4 py-3">
        {formatLocalDate(row.affectedStartDate)}
        {row.affectedEndDate === row.affectedStartDate
          ? ''
          : ` – ${formatLocalDate(row.affectedEndDate)}`}
      </td>
      <td className="px-4 py-3">
        {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone }).format(
          new Date(row.submittedAt),
        )}
      </td>
      <td className="px-4 py-3">
        <Link to={`/approvals/${row.approvalId}`}>Review</Link>
      </td>
    </tr>
  );
}

function ReportPagination({
  data,
  onPage,
}: Readonly<{ data: ReportResult; onPage: (page: number) => void }>) {
  if (data.pagination.totalPages <= 1) return null;
  return (
    <nav aria-label="Report pages" className="flex flex-wrap items-center justify-between gap-3">
      <p className="m-0 text-sm text-[var(--wl-text-muted)]">
        Page {data.pagination.page} of {data.pagination.totalPages}
      </p>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          isDisabled={data.pagination.page <= 1}
          onPress={() => onPage(data.pagination.page - 1)}
        >
          Previous page
        </Button>
        <Button
          variant="secondary"
          isDisabled={data.pagination.page >= data.pagination.totalPages}
          onPress={() => onPage(data.pagination.page + 1)}
        >
          Next page
        </Button>
      </div>
    </nav>
  );
}

function ReportLoading() {
  return (
    <p className="wl-alert m-0 rounded-xl border p-4" role="status">
      Running report…
    </p>
  );
}

function ReportError({ error, retry }: Readonly<{ error: unknown; retry: () => void }>) {
  const denied = error instanceof ApiClientError && error.status === 403;
  return (
    <div className="wl-alert wl-alert-error grid gap-3 rounded-xl border p-4" role="alert">
      <p className="m-0 font-semibold">
        {denied
          ? 'You no longer have permission to run this report.'
          : 'The report could not be loaded.'}
      </p>
      {denied ? (
        <Link className={buttonVariants({ variant: 'secondary' })} to="/reports">
          Return to reports
        </Link>
      ) : (
        <Button className="w-fit" variant="secondary" onPress={retry}>
          Try again
        </Button>
      )}
    </div>
  );
}

function toDraft(query: ReportQuery): FilterDraft {
  return Object.freeze({
    direction: query.direction,
    from: query.from,
    sort: query.sort,
    to: query.to,
  });
}

export function toReportSearchParams(query: ReportQuery): URLSearchParams {
  return toSearchParams(query);
}

function toSearchParams(query: ReportQuery): URLSearchParams {
  const search = new URLSearchParams({
    direction: query.direction,
    from: query.from,
    limit: query.limit.toString(),
    page: query.page.toString(),
    sort: query.sort,
    to: query.to,
  });
  if (query.employeeId !== undefined) search.set('employeeId', query.employeeId);
  return search;
}

function sortLabel(sort: ReportSort): string {
  return { DATE: 'Date', EMPLOYEE: 'Employee', STATUS: 'Status', VALUE: 'Value' }[sort];
}

function reportKeyLabel(key: ReportKey): string {
  return {
    'flexible-time': 'Flexible time',
    leave: 'Leave balances',
    'missing-records': 'Missing records',
    'monthly-time': 'Monthly time',
    'pending-approvals': 'Pending approvals',
  }[key];
}

function scopeLabel(scope: ReportResult['scope']): string {
  return {
    ORGANIZATION: 'organization',
    REPORTS: 'current direct reports',
    SELF: 'your own records',
    SELF_AND_REPORTS: 'your own records and current direct reports',
  }[scope];
}

function humanize(value: string): string {
  const normalized = value.toLocaleLowerCase().replaceAll('_', ' ');
  return normalized.charAt(0).toLocaleUpperCase() + normalized.slice(1);
}

function isAuthenticationError(error: unknown): error is ApiClientError {
  return (
    error instanceof ApiClientError &&
    ['AUTH_REQUIRED', 'AUTH_SESSION_EXPIRED'].includes(error.code)
  );
}
