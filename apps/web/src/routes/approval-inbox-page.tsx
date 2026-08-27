import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLoaderData, useNavigate, useSearchParams } from 'react-router';

import {
  approvalInboxQuerySchema,
  approvalInboxStatusSchema,
  type ApprovalInbox,
  type ApprovalInboxDirection,
  type ApprovalInboxQuery,
  type ApprovalInboxSort,
  type ApprovalInboxStatus,
  type ApprovalInboxType,
} from '@workledger/contracts';
import { formatDateOnly, formatInstant, formatNumber, type MessageKey } from '@workledger/i18n';
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
  type StatusBadgeProps,
} from '@workledger/ui';
import { Pagination } from '../components/pagination.js';

import { ApiClientError, clearSessionMemory } from '../app/api-client.js';
import { approvalInboxQuery } from '../app/query.js';
import { useBoundaryPresentation } from '../app/route-presentation.js';
import { setPendingSignInNotice } from '../app/session-notice.js';
import { PageHeader } from '../components/page-header.js';

type FilterDraft = Readonly<{
  direction: ApprovalInboxDirection;
  from: string;
  sort: ApprovalInboxSort;
  status: ApprovalInboxStatus;
  team: string;
  to: string;
  type: ApprovalInboxType;
}>;

const WORKFLOW_MESSAGE_KEYS = Object.freeze({
  ABSENCE: 'manager.approval.common.workflow.absenceRequest',
  CANCELLATION: 'manager.approval.common.workflow.absenceCancellation',
  CORRECTION: 'manager.approval.common.workflow.correction',
  MONTHLY_PERIOD: 'manager.approval.common.workflow.monthlyPeriod',
} as const satisfies Readonly<Record<Exclude<ApprovalInboxType, 'ALL'>, MessageKey>>);

const TYPE_FILTER_MESSAGE_KEYS = Object.freeze({
  ALL: 'manager.approval.inbox.filter.category.all',
  ABSENCE: 'manager.approval.common.workflow.absenceRequest',
  CANCELLATION: 'manager.approval.common.workflow.absenceCancellation',
  CORRECTION: 'manager.approval.common.workflow.correction',
  MONTHLY_PERIOD: 'manager.approval.common.workflow.monthlyPeriod',
} as const satisfies Readonly<Record<ApprovalInboxType, MessageKey>>);

const ITEM_STATUS_MESSAGE_KEYS = Object.freeze({
  ACTION_REQUIRED: 'manager.approval.common.status.actionRequired',
  ALL: 'manager.approval.common.status.allRecords',
  COMPLETED: 'manager.approval.common.status.completed',
  WAITING_ON_EMPLOYEE: 'manager.approval.common.status.waitingOnEmployee',
} as const satisfies Readonly<Record<ApprovalInboxStatus, MessageKey>>);

const QUEUE_STATUS_MESSAGE_KEYS = Object.freeze({
  ACTION_REQUIRED: 'manager.approval.inbox.queue.needsReview',
  ALL: 'manager.approval.common.status.allRecords',
  COMPLETED: 'manager.approval.common.status.completed',
  WAITING_ON_EMPLOYEE: 'manager.approval.common.status.waitingOnEmployee',
} as const satisfies Readonly<Record<ApprovalInboxStatus, MessageKey>>);

export function ApprovalInboxPage() {
  const t = useWorkLedgerMessage();
  const queryInput = useLoaderData<ApprovalInboxQuery>();
  const [, setSearchParams] = useSearchParams();
  const query = useQuery(approvalInboxQuery(queryInput));
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<FilterDraft>(() => toDraft(queryInput));
  const [filterError, setFilterError] = useState<string>();

  useEffect(() => {
    setDraft(toDraft(queryInput));
    setFilterError(undefined);
  }, [queryInput]);

  useEffect(() => {
    if (query.data === undefined) return;
    const lastPage = Math.max(1, query.data.pagination.totalPages);
    if (queryInput.page <= lastPage) return;
    setSearchParams(toSearchParams({ ...queryInput, page: lastPage }), { replace: true });
  }, [query.data, queryInput, setSearchParams]);

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
    const parsed = approvalInboxQuerySchema.safeParse({
      direction: draft.direction,
      ...(draft.from === '' ? {} : { from: draft.from }),
      limit: queryInput.limit,
      page: 1,
      sort: draft.sort,
      status: draft.status,
      ...(draft.team === '' ? {} : { team: draft.team }),
      ...(draft.to === '' ? {} : { to: draft.to }),
      type: draft.type,
    });
    if (!parsed.success) {
      setFilterError(t('manager.approval.inbox.filter.error'));
      return;
    }
    setFilterError(undefined);
    setSearchParams(toSearchParams(parsed.data));
  };

  const clearFilters = () => {
    const defaults = approvalInboxQuerySchema.parse({});
    setFilterError(undefined);
    setSearchParams(toSearchParams(defaults));
  };
  const setPage = (page: number) => {
    setSearchParams(toSearchParams({ ...queryInput, page }));
  };
  const setQueueStatus = (status: ApprovalInboxStatus) => {
    setSearchParams(toSearchParams({ ...queryInput, page: 1, status }));
  };

  if (query.isError && isAccessDenied(query.error)) return <ApprovalInboxPermissionDenied />;

  return (
    <section className="grid gap-6">
      <PageHeader
        eyebrow={t('manager.approval.inbox.page.eyebrow')}
        title={t('shared.route.title.approvalInbox')}
        description={t('manager.approval.inbox.page.description')}
      />
      {query.isPending ? (
        <ApprovalInboxLoading />
      ) : query.isError || query.data === undefined ? (
        <ApprovalInboxError error={query.error} retry={() => void query.refetch()} />
      ) : (
        <ApprovalWorkspace
          data={query.data}
          draft={draft}
          error={filterError}
          isFetching={query.isFetching}
          onChange={setDraft}
          onClear={clearFilters}
          onPage={setPage}
          onQueueStatus={setQueueStatus}
          onSubmit={submitFilters}
          query={queryInput}
        />
      )}
    </section>
  );
}

function ApprovalInboxPermissionDenied() {
  const t = useWorkLedgerMessage();
  useBoundaryPresentation(t('shared.route.boundary.permissionDenied.title'));
  return (
    <section className="grid max-w-2xl gap-6">
      <PageHeader
        eyebrow={t('manager.approval.inbox.permission.eyebrow')}
        title={t('shared.route.boundary.permissionDenied.title')}
        description={t('manager.approval.inbox.permission.description')}
      />
      <Link className={buttonVariants({ variant: 'secondary' })} to="/">
        {t('shared.action.goHome')}
      </Link>
    </section>
  );
}

function ApprovalFilters({
  draft,
  error,
  onChange,
  onSubmit,
  teams,
}: Readonly<{
  draft: FilterDraft;
  error: string | undefined;
  onChange: (draft: FilterDraft) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  teams: ApprovalInbox['filterOptions']['teams'];
}>) {
  const [open, setOpen] = useState(false);
  const t = useWorkLedgerMessage();

  return (
    <div className="grid gap-3">
      <details
        className="wl-approval-filter-disclosure rounded-xl border border-[var(--wl-border)] bg-[var(--wl-surface-raised)]"
        open={open}
        onToggle={(event) => {
          setOpen(event.currentTarget.open);
        }}
      >
        <summary className="wl-approval-filter-summary">
          {open ? t('manager.approval.inbox.filter.hide') : t('manager.approval.inbox.filter.show')}
        </summary>
        <FilterBar
          aria-label={t('manager.approval.inbox.filter.ariaLabel')}
          className="border-0 p-4"
          onSubmit={onSubmit}
        >
          <div className="grid w-full gap-4">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <SelectFilter
                id="approval-type"
                label={t('manager.approval.inbox.filter.category.label')}
                value={draft.type}
                onChange={(type) => onChange({ ...draft, type: type as ApprovalInboxType })}
                options={[
                  ['ALL', t('manager.approval.inbox.filter.category.all')],
                  ['CORRECTION', t('manager.approval.common.workflow.correction')],
                  ['ABSENCE', t('manager.approval.common.workflow.absenceRequest')],
                  ['CANCELLATION', t('manager.approval.common.workflow.absenceCancellation')],
                  ['MONTHLY_PERIOD', t('manager.approval.common.workflow.monthlyPeriod')],
                ]}
              />
              <label className="grid gap-2 text-sm font-semibold" htmlFor="approval-team">
                {t('manager.approval.inbox.filter.team.label')}
                <select
                  id="approval-team"
                  data-route-focus-key="approval-filter-team"
                  className={inputClassName}
                  value={draft.team}
                  onChange={(event) => onChange({ ...draft, team: event.target.value })}
                >
                  <option value="">{t('manager.approval.inbox.filter.team.all')}</option>
                  {draft.team !== '' && !teams.some((team) => team.id === draft.team) ? (
                    <option value={draft.team}>
                      {t('manager.approval.inbox.filter.team.selected')}
                    </option>
                  ) : null}
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </label>
              <SelectFilter
                id="approval-order"
                label={t('manager.approval.inbox.filter.order.label')}
                value={`${draft.sort}:${draft.direction}`}
                onChange={(order) => {
                  const [sort, direction] = order.split(':');
                  onChange({
                    ...draft,
                    direction: direction === 'ASC' ? 'ASC' : 'DESC',
                    sort: sort === 'AFFECTED_DATE' || sort === 'EMPLOYEE' ? sort : 'SUBMITTED_AT',
                  });
                }}
                options={[
                  ['SUBMITTED_AT:DESC', t('manager.approval.inbox.filter.order.newestSubmitted')],
                  ['SUBMITTED_AT:ASC', t('manager.approval.inbox.filter.order.oldestSubmitted')],
                  ['AFFECTED_DATE:ASC', t('manager.approval.inbox.filter.order.earliestAffected')],
                  ['AFFECTED_DATE:DESC', t('manager.approval.inbox.filter.order.latestAffected')],
                  ['EMPLOYEE:ASC', t('manager.approval.inbox.filter.order.employeeAscending')],
                  ['EMPLOYEE:DESC', t('manager.approval.inbox.filter.order.employeeDescending')],
                ]}
              />
              <label className="grid gap-2 text-sm font-semibold" htmlFor="approval-from">
                {t('manager.approval.inbox.filter.from')}
                <input
                  id="approval-from"
                  data-route-focus-key="approval-filter-from"
                  aria-describedby={error === undefined ? undefined : 'approval-date-range-error'}
                  aria-invalid={error === undefined ? undefined : true}
                  className={inputClassName}
                  type="date"
                  value={draft.from}
                  onChange={(event) => onChange({ ...draft, from: event.target.value })}
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold" htmlFor="approval-to">
                {t('manager.approval.inbox.filter.to')}
                <input
                  id="approval-to"
                  data-route-focus-key="approval-filter-to"
                  aria-describedby={error === undefined ? undefined : 'approval-date-range-error'}
                  aria-invalid={error === undefined ? undefined : true}
                  className={inputClassName}
                  type="date"
                  value={draft.to}
                  onChange={(event) => onChange({ ...draft, to: event.target.value })}
                />
              </label>
            </div>
            {error === undefined ? null : (
              <Alert
                headingLevel="h3"
                id="approval-date-range-error"
                title={t('manager.approval.inbox.filter.errorTitle')}
                tone="danger"
              >
                <p>{error}</p>
              </Alert>
            )}
            <Button type="submit" className="w-fit" data-route-focus-key="approval-apply-filters">
              {t('manager.approval.inbox.filter.apply')}
            </Button>
          </div>
        </FilterBar>
      </details>
    </div>
  );
}

function useWideApprovalLayout(): boolean {
  const [wide, setWide] = useState(readWideApprovalLayout);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(min-width: 72rem)');
    const update = () => setWide(media.matches);
    media.addEventListener('change', update);
    update();
    return () => media.removeEventListener('change', update);
  }, []);

  return wide;
}

function readWideApprovalLayout(): boolean {
  return typeof window.matchMedia !== 'function' || window.matchMedia('(min-width: 72rem)').matches;
}

function SelectFilter({
  id,
  label,
  onChange,
  options,
  value,
}: Readonly<{
  id: string;
  label: string;
  onChange: (value: string) => void;
  options: readonly (readonly [string, string])[];
  value: string;
}>) {
  return (
    <label className="grid gap-2 text-sm font-semibold" htmlFor={id}>
      {label}
      <select
        id={id}
        data-route-focus-key={`approval-filter-${id}`}
        className={inputClassName}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function ApprovalWorkspace({
  data,
  draft,
  error,
  isFetching,
  onChange,
  onClear,
  onPage,
  onQueueStatus,
  onSubmit,
  query,
}: Readonly<{
  data: ApprovalInbox;
  draft: FilterDraft;
  error: string | undefined;
  isFetching: boolean;
  onChange: (draft: FilterDraft) => void;
  onClear: () => void;
  onPage: (page: number) => void;
  onQueueStatus: (status: ApprovalInboxStatus) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  query: ApprovalInboxQuery;
}>) {
  const runtime = useWorkLedgerI18n();
  const t = useWorkLedgerMessage();
  const locale = runtime.locale as Parameters<typeof formatDateOnly>[0];
  const { pagination } = data;
  const filtered = hasNonDefaultFilters(query);
  const wideLayout = useWideApprovalLayout();
  const pageCount = Math.max(1, pagination.totalPages);
  return (
    <section aria-labelledby="approval-results-heading" className="grid gap-4">
      <div className="grid gap-4 border-b border-[var(--wl-border)] pb-4">
        <div className="grid gap-1">
          <p className="m-0 text-xs font-bold uppercase tracking-[0.12em] text-[var(--wl-text-muted)]">
            {t('manager.approval.inbox.queue.label')}
          </p>
          <h2 id="approval-results-heading" className="m-0 text-2xl font-bold">
            {t(QUEUE_STATUS_MESSAGE_KEYS[query.status])}
            {': '}
            {formatNumber(locale, pagination.total)}
          </h2>
        </div>
        <div>
          <SelectFilter
            id="approval-queue-view"
            label={t('manager.approval.inbox.queue.viewLabel')}
            value={query.status}
            onChange={(status) => onQueueStatus(approvalInboxStatusSchema.parse(status))}
            options={[
              ['ACTION_REQUIRED', t('manager.approval.inbox.queue.needsReview')],
              ['WAITING_ON_EMPLOYEE', t('manager.approval.common.status.waitingOnEmployee')],
              ['COMPLETED', t('manager.approval.common.status.completed')],
              ['ALL', t('manager.approval.common.status.allRecords')],
            ]}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 text-sm text-[var(--wl-text-muted)]">
          <strong className="text-[var(--wl-text)]">
            {t('manager.approval.inbox.applied.label')}
          </strong>{' '}
          {appliedFilterSummary(query, data.filterOptions.teams, locale, t)}
        </p>
        {filtered ? (
          <Button type="button" variant="quiet" className="w-fit" onPress={onClear}>
            {t('manager.approval.inbox.applied.reset')}
          </Button>
        ) : null}
      </div>
      <ApprovalFilters
        draft={draft}
        error={error}
        onChange={onChange}
        onSubmit={onSubmit}
        teams={data.filterOptions.teams}
      />
      <p
        className={isFetching ? 'm-0 text-sm font-semibold text-[var(--wl-text-muted)]' : 'sr-only'}
        role="status"
        aria-label={t('manager.approval.inbox.results.statusLabel')}
        aria-live="polite"
        aria-atomic="true"
      >
        {isFetching ? t('manager.approval.inbox.results.refreshing') : ''}
      </p>
      {data.items.length === 0 ? (
        <RouteState
          actions={
            filtered ? (
              <Button type="button" variant="secondary" className="w-fit" onPress={onClear}>
                {t('manager.approval.inbox.results.clearFilters')}
              </Button>
            ) : undefined
          }
          kind="empty"
          title={
            filtered
              ? t('manager.approval.inbox.empty.filteredTitle')
              : t('manager.approval.inbox.empty.defaultTitle')
          }
        >
          <p className="m-0">
            {filtered
              ? t('manager.approval.inbox.empty.filteredDescription')
              : t('manager.approval.inbox.empty.defaultDescription')}
          </p>
        </RouteState>
      ) : wideLayout ? (
        <ApprovalResultsTable data={data} isFetching={isFetching} query={query} />
      ) : (
        <ApprovalResultsList data={data} isFetching={isFetching} />
      )}
      {pageCount > 1 ? (
        <Pagination
          ariaLabel={t('manager.approval.inbox.pagination.label')}
          currentPage={pagination.page}
          nextFocusKey="approval-next-page"
          onPageChange={onPage}
          pageCount={pageCount}
          previousFocusKey="approval-previous-page"
          summary={approvalPageSummary(pagination, t)}
        />
      ) : null}
    </section>
  );
}

function ApprovalResultsTable({
  data,
  isFetching,
  query,
}: Readonly<{ data: ApprovalInbox; isFetching: boolean; query: ApprovalInboxQuery }>) {
  const runtime = useWorkLedgerI18n();
  const t = useWorkLedgerMessage();
  const locale = runtime.locale as Parameters<typeof formatDateOnly>[0];
  return (
    <DataTable
      caption={t('manager.approval.inbox.results.caption')}
      className="min-w-[46rem]"
      scrollLabel={t('manager.approval.inbox.results.tableLabel')}
    >
      <thead>
        <tr>
          <SortHeader active={query.sort === 'EMPLOYEE'} direction={query.direction}>
            {t('manager.approval.inbox.column.employee')}
          </SortHeader>
          <th scope="col">{t('manager.approval.inbox.column.workflow')}</th>
          <th scope="col">{t('manager.approval.inbox.column.status')}</th>
          <SortHeader active={query.sort === 'AFFECTED_DATE'} direction={query.direction}>
            {t('manager.approval.inbox.column.affectedDates')}
          </SortHeader>
          <SortHeader active={query.sort === 'SUBMITTED_AT'} direction={query.direction}>
            {t('manager.approval.inbox.column.submitted')}
          </SortHeader>
          <th scope="col">{t('manager.approval.inbox.column.action')}</th>
        </tr>
      </thead>
      <tbody>
        {data.items.map((item) => (
          <tr key={`${item.kind}-${item.id}`}>
            <th scope="row">
              <span className="grid gap-1">
                <span>{item.employeeDisplayName}</span>
                <span className="text-xs font-normal text-[var(--wl-text-muted)]">
                  {item.team?.name ?? t('manager.approval.inbox.team.none')}
                </span>
              </span>
            </th>
            <td>{workflowLabel(item.kind, t)}</td>
            <td>
              <StatusBadge tone={approvalStatusTone(item.status)}>
                {t(ITEM_STATUS_MESSAGE_KEYS[item.status])}
              </StatusBadge>
            </td>
            <td>{formatAffectedDates(item, locale, t)}</td>
            <td>{formatSubmittedAt(item.submittedAt, data.timeZone, locale)}</td>
            <td>{approvalAction(item, isFetching, 'table', t)}</td>
          </tr>
        ))}
      </tbody>
    </DataTable>
  );
}

function ApprovalResultsList({
  data,
  isFetching,
}: Readonly<{ data: ApprovalInbox; isFetching: boolean }>) {
  const runtime = useWorkLedgerI18n();
  const t = useWorkLedgerMessage();
  const locale = runtime.locale as Parameters<typeof formatDateOnly>[0];
  return (
    <ol
      className="m-0 grid list-none gap-3 p-0"
      aria-label={t('manager.approval.inbox.results.listLabel')}
    >
      {data.items.map((item) => (
        <li key={`${item.kind}-${item.id}`}>
          <Panel as="article" className="grid min-w-0 gap-3" density="compact">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="grid gap-1">
                <h3 className="m-0 text-lg font-bold">{item.employeeDisplayName}</h3>
                <p className="m-0 text-sm text-[var(--wl-text-muted)]">
                  {workflowLabel(item.kind, t)}
                </p>
              </div>
              <StatusBadge tone={approvalStatusTone(item.status)}>
                {t(ITEM_STATUS_MESSAGE_KEYS[item.status])}
              </StatusBadge>
            </div>
            <dl className="m-0 grid gap-2 text-sm">
              <ApprovalFact
                label={t('manager.approval.inbox.column.affectedDates')}
                value={formatAffectedDates(item, locale, t)}
              />
              <ApprovalFact
                label={t('manager.approval.inbox.column.submitted')}
                value={formatSubmittedAt(item.submittedAt, data.timeZone, locale)}
              />
              <ApprovalFact
                label={t('manager.approval.inbox.filter.team.label')}
                value={item.team?.name ?? t('manager.approval.inbox.team.none')}
              />
            </dl>
            {approvalAction(item, isFetching, 'list', t)}
          </Panel>
        </li>
      ))}
    </ol>
  );
}

function ApprovalFact({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="grid gap-1">
      <dt className="font-semibold text-[var(--wl-text-muted)]">{label}</dt>
      <dd className="m-0">{value}</dd>
    </div>
  );
}

function approvalAction(
  item: ApprovalInbox['items'][number],
  isFetching: boolean,
  presentation: 'list' | 'table',
  t: ReturnType<typeof useWorkLedgerMessage>,
): ReactNode {
  if (isFetching) {
    return (
      <span className="text-sm text-[var(--wl-text-muted)]">
        {t('manager.approval.inbox.action.wait')}
      </span>
    );
  }
  return (
    <Link
      aria-label={t('manager.approval.inbox.action.ariaLabel', {
        employee: item.employeeDisplayName,
        workflow: workflowLabel(item.kind, t),
      })}
      className={buttonVariants({
        variant: item.status === 'ACTION_REQUIRED' ? 'primary' : 'secondary',
        className: presentation === 'list' ? 'w-full' : 'w-fit',
      })}
      to={
        item.kind === 'MONTHLY_PERIOD'
          ? `/monthly-periods/${encodeURIComponent(item.id)}`
          : `/approvals/${encodeURIComponent(item.id)}`
      }
    >
      {presentation === 'table'
        ? t('manager.approval.inbox.action.review')
        : item.status === 'ACTION_REQUIRED'
          ? t('manager.approval.inbox.action.reviewAndDecide')
          : t('manager.approval.inbox.action.reviewRecord')}
    </Link>
  );
}

function SortHeader({
  active,
  children,
  direction,
}: Readonly<{
  active: boolean;
  children: ReactNode;
  direction: ApprovalInboxDirection;
}>) {
  return (
    <th
      scope="col"
      className="p-3"
      aria-sort={active ? (direction === 'ASC' ? 'ascending' : 'descending') : undefined}
    >
      {children}
    </th>
  );
}

function ApprovalInboxLoading() {
  const t = useWorkLedgerMessage();
  return (
    <RouteState kind="loading" title={t('manager.approval.inbox.loading.title')}>
      <p>{t('manager.approval.inbox.loading.description')}</p>
    </RouteState>
  );
}

function ApprovalInboxError({ error, retry }: Readonly<{ error: unknown; retry: () => void }>) {
  const t = useWorkLedgerMessage();
  const denied = error instanceof ApiClientError && error.code === 'ACCESS_DENIED';
  return (
    <Alert
      title={
        denied
          ? t('manager.approval.inbox.error.deniedTitle')
          : t('manager.approval.inbox.error.unavailableTitle')
      }
      tone="danger"
    >
      <p>
        {denied
          ? t('manager.approval.inbox.error.deniedDescription')
          : t('manager.approval.inbox.error.unavailableDescription')}
      </p>
      {!denied ? (
        <>
          {error instanceof ApiClientError && error.requestId !== undefined ? (
            <p className="m-0 text-sm">
              {t('manager.approval.inbox.error.requestReference', { requestId: error.requestId })}
            </p>
          ) : null}
          <Button type="button" variant="secondary" className="w-fit" onPress={retry}>
            {t('shared.action.tryAgain')}
          </Button>
        </>
      ) : null}
    </Alert>
  );
}

function toDraft(query: ApprovalInboxQuery): FilterDraft {
  return Object.freeze({
    direction: query.direction,
    from: query.from ?? '',
    sort: query.sort,
    status: query.status,
    team: query.team ?? '',
    to: query.to ?? '',
    type: query.type,
  });
}

export function toApprovalInboxSearchParams(query: ApprovalInboxQuery): URLSearchParams {
  return toSearchParams(query);
}

function toSearchParams(query: ApprovalInboxQuery): URLSearchParams {
  const params = new URLSearchParams({
    direction: query.direction,
    limit: query.limit.toString(),
    page: query.page.toString(),
    sort: query.sort,
    status: query.status,
    type: query.type,
  });
  if (query.from !== undefined) params.set('from', query.from);
  if (query.team !== undefined) params.set('team', query.team);
  if (query.to !== undefined) params.set('to', query.to);
  return params;
}

function appliedFilterSummary(
  query: ApprovalInboxQuery,
  teams: ApprovalInbox['filterOptions']['teams'],
  locale: Parameters<typeof formatDateOnly>[0],
  t: ReturnType<typeof useWorkLedgerMessage>,
): string {
  const selectedTeam = teams.find((team) => team.id === query.team);
  const values = [
    t(QUEUE_STATUS_MESSAGE_KEYS[query.status]),
    t(TYPE_FILTER_MESSAGE_KEYS[query.type]),
    query.team === undefined
      ? t('manager.approval.inbox.filter.team.allCurrent')
      : (selectedTeam?.name ?? t('manager.approval.inbox.filter.team.selected')),
  ];
  if (query.from !== undefined && query.to !== undefined) {
    values.push(
      t('manager.approval.inbox.applied.dateRange', {
        from: formatDateOnly(locale, query.from, { dateStyle: 'full' }),
        to: formatDateOnly(locale, query.to, { dateStyle: 'full' }),
      }),
    );
  } else {
    values.push(t('manager.approval.inbox.filter.anyAffectedDate'));
  }
  values.push(orderLabel(query, t));
  return values.join(', ');
}

function hasNonDefaultFilters(query: ApprovalInboxQuery): boolean {
  return (
    query.status !== 'ACTION_REQUIRED' ||
    query.type !== 'ALL' ||
    query.team !== undefined ||
    query.from !== undefined ||
    query.to !== undefined ||
    query.sort !== 'SUBMITTED_AT' ||
    query.direction !== 'DESC'
  );
}

function approvalPageSummary(
  pagination: ApprovalInbox['pagination'],
  t: ReturnType<typeof useWorkLedgerMessage>,
): string {
  if (pagination.total === 0) return t('manager.approval.inbox.pagination.none');
  const first = (pagination.page - 1) * pagination.limit + 1;
  const last = Math.min(pagination.page * pagination.limit, pagination.total);
  return t('manager.approval.inbox.pagination.summary', { first, last, total: pagination.total });
}

function formatAffectedDates(
  item: ApprovalInbox['items'][number],
  locale: Parameters<typeof formatDateOnly>[0],
  t: ReturnType<typeof useWorkLedgerMessage>,
): string {
  return item.affectedStartDate === item.affectedEndDate
    ? formatDateOnly(locale, item.affectedStartDate, { dateStyle: 'full' })
    : t('manager.approval.inbox.applied.dateRange', {
        from: formatDateOnly(locale, item.affectedStartDate, { dateStyle: 'full' }),
        to: formatDateOnly(locale, item.affectedEndDate, { dateStyle: 'full' }),
      });
}

function approvalStatusTone(status: ApprovalInboxStatus): NonNullable<StatusBadgeProps['tone']> {
  if (status === 'ACTION_REQUIRED') return 'warning';
  if (status === 'WAITING_ON_EMPLOYEE') return 'info';
  if (status === 'COMPLETED') return 'success';
  return 'neutral';
}

function workflowLabel(
  kind: ApprovalInbox['items'][number]['kind'],
  t: ReturnType<typeof useWorkLedgerMessage>,
): string {
  return t(WORKFLOW_MESSAGE_KEYS[kind]);
}

function orderLabel(
  value: Pick<ApprovalInboxQuery, 'direction' | 'sort'>,
  t: ReturnType<typeof useWorkLedgerMessage>,
): string {
  if (value.sort === 'SUBMITTED_AT') {
    return value.direction === 'ASC'
      ? t('manager.approval.inbox.filter.order.oldestSubmitted')
      : t('manager.approval.inbox.filter.order.newestSubmitted');
  }
  if (value.sort === 'AFFECTED_DATE') {
    return value.direction === 'ASC'
      ? t('manager.approval.inbox.filter.order.earliestAffected')
      : t('manager.approval.inbox.filter.order.latestAffected');
  }
  return value.direction === 'ASC'
    ? t('manager.approval.inbox.filter.order.employeeAscending')
    : t('manager.approval.inbox.filter.order.employeeDescending');
}

function formatSubmittedAt(
  value: string,
  timeZone: string,
  locale: Parameters<typeof formatDateOnly>[0],
): string {
  return formatInstant(locale, value, timeZone);
}

function isAuthenticationError(error: unknown): error is ApiClientError {
  return (
    error instanceof ApiClientError &&
    ['AUTH_REQUIRED', 'AUTH_SESSION_EXPIRED'].includes(error.code)
  );
}

function isAccessDenied(error: unknown): boolean {
  return error instanceof ApiClientError && error.code === 'ACCESS_DENIED';
}

const inputClassName =
  'min-h-11 rounded-lg border border-[var(--wl-border-strong)] bg-[var(--wl-surface-raised)] px-3 py-2 text-base text-[var(--wl-text)] outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--wl-focus-ring)]';
