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
  type SupportedLocale,
} from '@workledger/contracts';
import { formatDateOnly, formatInstant, type MessageKey } from '@workledger/i18n';
import { useWorkLedgerI18n, useWorkLedgerMessage } from '@workledger/i18n/react';
import {
  Alert,
  Button,
  buttonVariants,
  DataTable,
  FilterBar,
  RouteState,
  StatusBadge,
} from '@workledger/ui';
import { Pagination } from '../components/pagination.js';

import { ApiClientError, clearSessionMemory } from '../app/api-client.js';
import { formatDuration } from '../app/date-time-format.js';
import { reportResultQuery } from '../app/query.js';
import { attentionPresentation, reportPresentation } from '../app/presentation-codes.js';
import { setPendingSignInNotice } from '../app/session-notice.js';
import { PageHeader } from '../components/page-header.js';
import { ReportPortabilityActions } from '../components/report-portability-actions.js';
import { WorkflowStatusBadge } from '../components/workflow-status-badge.js';

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

const REPORT_SUMMARY_KEYS = Object.freeze({
  ActionableApprovals: 'manager.report.detail.summary.actionableApprovals',
  AvailableChange: 'manager.report.detail.summary.availableChange',
  Balance: 'manager.report.detail.summary.balance',
  ClosingAvailable: 'manager.report.detail.summary.closingAvailable',
  ClosingBalance: 'manager.report.detail.summary.closingBalance',
  Credited: 'manager.report.detail.summary.credited',
  Expected: 'manager.report.detail.summary.expected',
  IncompleteRecords: 'manager.report.detail.summary.incompleteRecords',
  OpeningAvailable: 'manager.report.detail.summary.openingAvailable',
  OpeningBalance: 'manager.report.detail.summary.openingBalance',
  PostLockChange: 'manager.report.detail.summary.postLockChange',
  ProjectedRemaining: 'manager.report.detail.summary.projectedRemaining',
  RangeChange: 'manager.report.detail.summary.rangeChange',
  Reserved: 'manager.report.detail.summary.reserved',
  Worked: 'manager.report.detail.summary.worked',
} as const satisfies Readonly<Record<string, MessageKey>>);

const SORT_LABEL_KEYS = Object.freeze({
  DATE: 'manager.report.common.sort.date',
  EMPLOYEE: 'manager.report.common.sort.employee',
  STATUS: 'manager.report.common.sort.status',
  VALUE: 'manager.report.common.sort.value',
} as const satisfies Readonly<Record<ReportSort, MessageKey>>);

const REPORT_KEY_LABEL_KEYS = Object.freeze({
  'flexible-time': 'manager.report.catalog.flexibleTime.title',
  leave: 'manager.report.catalog.leave.title',
  'missing-records': 'manager.report.catalog.missingRecords.title',
  'monthly-time': 'manager.report.catalog.monthlyTime.title',
  'pending-approvals': 'manager.report.catalog.pendingApprovals.title',
} as const satisfies Readonly<Record<ReportKey, MessageKey>>);

const SCOPE_KEYS = Object.freeze({
  ORGANIZATION: 'manager.report.common.scope.organization',
  REPORTS: 'manager.report.common.scope.currentDirectReports',
  SELF: 'manager.report.common.scope.self',
  SELF_AND_REPORTS: 'manager.report.common.scope.selfAndDirectReports',
} as const satisfies Readonly<Record<ReportResult['scope'], MessageKey>>);

const PENDING_APPROVAL_KIND_KEYS = Object.freeze({
  ABSENCE: 'manager.approval.common.workflow.absenceRequest',
  CANCELLATION: 'manager.approval.common.workflow.absenceCancellation',
  CORRECTION: 'manager.approval.common.workflow.correction',
  MONTHLY_PERIOD: 'manager.approval.common.workflow.monthlyPeriod',
} as const satisfies Readonly<Record<string, MessageKey>>);

export function ReportDetailPage() {
  const t = useWorkLedgerMessage();
  const loaderData = useLoaderData<ReportRouteLoaderData>();
  const [, setSearchParams] = useSearchParams();
  const query = useQuery(reportResultQuery(loaderData.reportKey, loaderData.query));
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<FilterDraft>(() => toDraft(loaderData.query));
  const [filterError, setFilterError] = useState<string>();
  const presentation = reportPresentation(loaderData.report.key, t);

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
      setFilterError(t('manager.report.detail.filter.error'));
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
          {t('manager.report.detail.action.back')}
        </Link>
        <PageHeader
          eyebrow={t('manager.report.detail.page.eyebrow')}
          title={presentation.title}
          description={presentation.description}
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
            if (refreshed.data === undefined) {
              throw new Error(t('manager.report.detail.error.refreshNoData'));
            }
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
  const runtime = useWorkLedgerI18n();
  const t = useWorkLedgerMessage();
  const locale = runtime.locale as SupportedLocale;
  return (
    <FilterBar
      description={
        <>
          {t('manager.report.detail.filter.applied.summary', {
            direction:
              query.direction === 'ASC'
                ? t('manager.report.detail.filter.direction.ascending')
                : t('manager.report.detail.filter.direction.descending'),
            from: formatDateOnly(locale, query.from, { dateStyle: 'full' }),
            sort: sortLabel(query.sort, t).toLocaleLowerCase(locale),
            to: formatDateOnly(locale, query.to, { dateStyle: 'full' }),
          })}
          {query.employeeId === undefined
            ? ''
            : ` ${t('manager.report.detail.filter.applied.employee')}`}
        </>
      }
      onSubmit={onSubmit}
      title={t('manager.report.detail.filter.heading')}
    >
      <label className="grid gap-2 text-sm font-semibold" htmlFor="report-from">
        {t('manager.report.detail.filter.from')}
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
        {t('manager.report.detail.filter.to')}
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
        {t('manager.report.detail.filter.sort')}
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
              {sortLabel(sort, t)}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-2 text-sm font-semibold" htmlFor="report-direction">
        {t('manager.report.detail.filter.direction.label')}
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
          <option value="ASC">{t('manager.report.detail.filter.direction.ascending')}</option>
          <option value="DESC">{t('manager.report.detail.filter.direction.descending')}</option>
        </select>
      </label>
      {error === undefined ? null : (
        <p
          className="m-0 basis-full text-sm font-semibold text-[var(--wl-danger)]"
          id="report-filter-error"
          role="alert"
        >
          {error}
        </p>
      )}
      <Button className="w-fit" type="submit">
        {t('manager.report.detail.filter.apply')}
      </Button>
      <Button type="button" variant="quiet" className="w-fit" onPress={onReset}>
        {t('manager.report.detail.filter.reset')}
      </Button>
    </FilterBar>
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
  const runtime = useWorkLedgerI18n();
  const t = useWorkLedgerMessage();
  const locale = runtime.locale as SupportedLocale;
  return (
    <section className="grid gap-5" aria-labelledby="report-results-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="report-results-heading" className="m-0 text-xl font-bold">
            {t('manager.report.detail.results.heading')}
          </h2>
          <p className="m-0 mt-1 text-sm text-[var(--wl-text-muted)]">
            {t('manager.report.detail.results.summary', {
              count: data.pagination.total,
              scope: t(SCOPE_KEYS[data.scope]),
            })}
          </p>
        </div>
        <p
          className="m-0 min-h-6 text-sm text-[var(--wl-text-muted)]"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {isFetching
            ? t('manager.report.detail.results.refreshing')
            : t('manager.report.detail.results.generated', {
                value: formatInstant(locale, data.generatedAt, data.timeZone, {
                  hour: 'numeric',
                  minute: '2-digit',
                  timeZoneName: 'shortOffset',
                }),
              })}
        </p>
      </div>
      {data.partial ? (
        <Alert
          announce={false}
          headingLevel="h3"
          title={t('manager.report.detail.partial.title')}
          tone="warning"
        >
          <p>{t('manager.report.detail.partial.description')}</p>
        </Alert>
      ) : null}
      <ReportSummary data={data} />
      {data.rows.length === 0 ? (
        <RouteState kind="empty" title={t('manager.report.detail.empty.title')}>
          {t('manager.report.detail.empty.description')}
        </RouteState>
      ) : (
        <ReportTable data={data} query={query} />
      )}
      <ReportPagination data={data} onPage={onPage} />
      <ReportPortabilityActions data={data} query={query} refresh={refresh} report={report} />
    </section>
  );
}

function ReportSummary({ data }: Readonly<{ data: ReportResult }>) {
  const t = useWorkLedgerMessage();
  const items: readonly [string, ReactNode][] = (() => {
    switch (data.summary.kind) {
      case 'MONTHLY_TIME':
        return [
          [t(REPORT_SUMMARY_KEYS.Expected), formatDuration(data.summary.expectedMinutes)],
          [t(REPORT_SUMMARY_KEYS.Worked), formatDuration(data.summary.workedMinutes)],
          [t(REPORT_SUMMARY_KEYS.Credited), formatDuration(data.summary.creditedMinutes)],
          [t(REPORT_SUMMARY_KEYS.Balance), formatDuration(data.summary.balanceMinutes, true)],
          [
            t(REPORT_SUMMARY_KEYS.PostLockChange),
            formatDuration(data.summary.postLockDeltaMinutes, true),
          ],
          [
            t(REPORT_SUMMARY_KEYS.IncompleteRecords),
            data.summary.incompleteRecordCount.toLocaleString(),
          ],
        ];
      case 'FLEXIBLE_TIME':
        return [
          [
            t(REPORT_SUMMARY_KEYS.OpeningBalance),
            formatDuration(data.summary.openingBalanceMinutes, true),
          ],
          [
            t(REPORT_SUMMARY_KEYS.RangeChange),
            formatDuration(data.summary.rangeChangeMinutes, true),
          ],
          [
            t(REPORT_SUMMARY_KEYS.ClosingBalance),
            formatDuration(data.summary.closingBalanceMinutes, true),
          ],
        ];
      case 'LEAVE':
        return [
          [
            t(REPORT_SUMMARY_KEYS.OpeningAvailable),
            formatDuration(data.summary.openingAvailableMinutes, true),
          ],
          [
            t(REPORT_SUMMARY_KEYS.AvailableChange),
            formatDuration(data.summary.availableChangeMinutes, true),
          ],
          [
            t(REPORT_SUMMARY_KEYS.ClosingAvailable),
            formatDuration(data.summary.closingAvailableMinutes, true),
          ],
          [t(REPORT_SUMMARY_KEYS.Reserved), formatDuration(data.summary.reservedMinutes)],
          [
            t(REPORT_SUMMARY_KEYS.ProjectedRemaining),
            formatDuration(data.summary.projectedRemainingMinutes, true),
          ],
        ];
      case 'MISSING_RECORD':
        return [
          [t(REPORT_SUMMARY_KEYS.IncompleteRecords), data.summary.recordCount.toLocaleString()],
        ];
      case 'PENDING_APPROVAL':
        return [
          [t(REPORT_SUMMARY_KEYS.ActionableApprovals), data.summary.itemCount.toLocaleString()],
        ];
    }
  })();
  return (
    <dl className="m-0 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(([label, value]) => (
        <div key={label} className="wl-panel wl-panel--compact">
          <dt className="text-sm font-semibold text-[var(--wl-text-muted)]">{label}</dt>
          <dd className="m-0 mt-1 text-xl font-bold">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ReportTable({ data, query }: Readonly<{ data: ReportResult; query: ReportQuery }>) {
  const runtime = useWorkLedgerI18n();
  const t = useWorkLedgerMessage();
  const locale = runtime.locale as SupportedLocale;
  const content = tableContent(data.key, data.rows, query, data.timeZone, locale, t);
  return (
    <DataTable
      caption={t('manager.report.detail.table.caption', {
        from: formatDateOnly(locale, data.range.from, { dateStyle: 'full' }),
        report: t(REPORT_KEY_LABEL_KEYS[data.key]),
        to: formatDateOnly(locale, data.range.to, { dateStyle: 'full' }),
      })}
      className="min-w-[48rem] text-sm"
      scrollHint={t('manager.report.detail.table.scrollHint')}
      scrollLabel={t('manager.report.detail.table.scrollLabel', {
        report: t(REPORT_KEY_LABEL_KEYS[data.key]),
      })}
    >
      {content}
    </DataTable>
  );
}

function tableContent(
  key: ReportKey,
  rows: ReportResult['rows'],
  query: ReportQuery,
  timeZone: string,
  locale: SupportedLocale,
  t: ReturnType<typeof useWorkLedgerMessage>,
): ReactNode {
  switch (key) {
    case 'monthly-time':
      return (
        <>
          <ReportTableHead
            columns={[
              [t('manager.report.detail.column.employee'), 'EMPLOYEE'],
              [t('manager.report.detail.column.month'), 'DATE'],
              [t('manager.report.detail.column.status'), 'STATUS'],
              [t(REPORT_SUMMARY_KEYS.Expected)],
              [t(REPORT_SUMMARY_KEYS.Worked)],
              [t(REPORT_SUMMARY_KEYS.Credited)],
              [t(REPORT_SUMMARY_KEYS.Balance), 'VALUE'],
              [t('manager.report.detail.column.incomplete')],
              [t(REPORT_SUMMARY_KEYS.PostLockChange)],
            ]}
            query={query}
          />
          <tbody>{rows.map((row, index) => monthlyTimeRow(row, index, locale))}</tbody>
        </>
      );
    case 'flexible-time':
      return (
        <>
          <ReportTableHead
            columns={[
              [t('manager.report.detail.column.employee'), 'EMPLOYEE'],
              [t('manager.report.detail.column.opening')],
              [t(REPORT_SUMMARY_KEYS.RangeChange)],
              [t('manager.report.detail.column.closing'), 'VALUE'],
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
              [t('manager.report.detail.column.employee'), 'EMPLOYEE'],
              [t('manager.report.detail.column.leaveAccount')],
              [t('manager.report.detail.column.opening')],
              [t(REPORT_SUMMARY_KEYS.AvailableChange)],
              [t('manager.report.detail.column.closing')],
              [t(REPORT_SUMMARY_KEYS.Reserved)],
              [t('manager.report.detail.column.projected'), 'VALUE'],
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
              [t('manager.report.detail.column.employee'), 'EMPLOYEE'],
              [t('manager.report.common.sort.date'), 'DATE'],
              [t('manager.report.detail.column.status')],
              [t(REPORT_SUMMARY_KEYS.Expected)],
              [t(REPORT_SUMMARY_KEYS.Worked)],
              [t('manager.report.detail.column.warnings')],
            ]}
            query={query}
          />
          <tbody>{rows.map((row, index) => missingRecordRow(row, index, locale, t))}</tbody>
        </>
      );
    case 'pending-approvals':
      return (
        <>
          <ReportTableHead
            columns={[
              [t('manager.report.detail.column.employee'), 'EMPLOYEE'],
              [t('manager.report.detail.column.workflow')],
              [t('manager.report.detail.column.affectedDates')],
              [t('manager.report.detail.column.submitted'), 'DATE'],
              [t('manager.report.detail.column.action')],
            ]}
            query={query}
          />
          <tbody>
            {rows.map((row, index) => pendingApprovalRow(row, index, timeZone, locale, t))}
          </tbody>
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

function monthlyTimeRow(row: ReportRow, index: number, locale: SupportedLocale): ReactNode {
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
          {formatDateOnly(locale, row.monthStart, { dateStyle: 'full' })}
        </Link>
      </td>
      <td className="px-4 py-3">
        <WorkflowStatusBadge status={row.workflowStatus} />
      </td>
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

function missingRecordRow(
  row: ReportRow,
  index: number,
  locale: SupportedLocale,
  t: ReturnType<typeof useWorkLedgerMessage>,
): ReactNode {
  if (row.kind !== 'MISSING_RECORD') return null;
  return (
    <tr
      key={`${row.employeeDisplayName}:${row.localDate}:${index.toString()}`}
      className="border-b border-[var(--wl-border)] last:border-b-0"
    >
      <th className="px-4 py-3 font-semibold" scope="row">
        {row.employeeDisplayName}
      </th>
      <td className="px-4 py-3">{formatDateOnly(locale, row.localDate, { dateStyle: 'full' })}</td>
      <td className="px-4 py-3">
        <StatusBadge tone="warning">{t('manager.report.detail.column.incomplete')}</StatusBadge>
      </td>
      <td className="px-4 py-3 tabular-nums">{formatDuration(row.expectedMinutes)}</td>
      <td className="px-4 py-3 tabular-nums">{formatDuration(row.workedMinutes)}</td>
      <td className="px-4 py-3">
        {row.warningCodes.length === 0
          ? t('manager.report.detail.missingRecords.noWarningCode')
          : row.warningCodes.map((code) => attentionPresentation(code, t).title).join(', ')}
      </td>
    </tr>
  );
}

function pendingApprovalRow(
  row: ReportRow,
  index: number,
  timeZone: string,
  locale: SupportedLocale,
  t: ReturnType<typeof useWorkLedgerMessage>,
): ReactNode {
  if (row.kind !== 'PENDING_APPROVAL') return null;
  return (
    <tr
      key={`${row.approvalId}:${index.toString()}`}
      className="border-b border-[var(--wl-border)] last:border-b-0"
    >
      <th className="px-4 py-3 font-semibold" scope="row">
        {row.employeeDisplayName}
      </th>
      <td className="px-4 py-3">{t(PENDING_APPROVAL_KIND_KEYS[row.approvalKind])}</td>
      <td className="px-4 py-3">
        {formatDateOnly(locale, row.affectedStartDate, { dateStyle: 'full' })}
        {row.affectedEndDate === row.affectedStartDate
          ? ''
          : ` – ${formatDateOnly(locale, row.affectedEndDate, { dateStyle: 'full' })}`}
      </td>
      <td className="px-4 py-3">
        {formatInstant(locale, row.submittedAt, timeZone, { dateStyle: 'medium' })}
      </td>
      <td className="px-4 py-3">
        <Link to={`/approvals/${row.approvalId}`}>{t('manager.report.detail.action.review')}</Link>
      </td>
    </tr>
  );
}

function ReportPagination({
  data,
  onPage,
}: Readonly<{ data: ReportResult; onPage: (page: number) => void }>) {
  const t = useWorkLedgerMessage();
  return (
    <Pagination
      ariaLabel={t('manager.report.detail.pagination.label')}
      currentPage={data.pagination.page}
      onPageChange={onPage}
      pageCount={data.pagination.totalPages}
      summary={t('manager.report.detail.pagination.summary', {
        count: data.pagination.total,
        current: data.pagination.page,
        total: Math.max(1, data.pagination.totalPages),
      })}
    />
  );
}

function ReportLoading() {
  const t = useWorkLedgerMessage();
  return (
    <RouteState kind="loading" title={t('manager.report.detail.loading.title')}>
      {t('manager.report.detail.loading.description')}
    </RouteState>
  );
}

function ReportError({ error, retry }: Readonly<{ error: unknown; retry: () => void }>) {
  const t = useWorkLedgerMessage();
  const denied = error instanceof ApiClientError && error.status === 403;
  return (
    <RouteState
      actions={
        denied ? (
          <Link className={buttonVariants({ variant: 'secondary' })} to="/reports">
            {t('manager.report.detail.action.return')}
          </Link>
        ) : (
          <Button className="w-fit" variant="secondary" onPress={retry}>
            {t('shared.action.tryAgain')}
          </Button>
        )
      }
      kind={denied ? 'permission-denied' : 'error'}
      title={
        denied
          ? t('manager.report.detail.error.deniedTitle')
          : t('manager.report.detail.error.unavailableTitle')
      }
    >
      <p>
        {denied
          ? t('manager.report.detail.error.deniedDescription')
          : t('manager.report.detail.error.unavailableDescription')}
      </p>
    </RouteState>
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

function sortLabel(sort: ReportSort, t: ReturnType<typeof useWorkLedgerMessage>): string {
  return t(SORT_LABEL_KEYS[sort]);
}

function isAuthenticationError(error: unknown): error is ApiClientError {
  return (
    error instanceof ApiClientError &&
    ['AUTH_REQUIRED', 'AUTH_SESSION_EXPIRED'].includes(error.code)
  );
}
