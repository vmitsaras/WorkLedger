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
import { formatLocalDate } from '../app/date-time-format.js';
import { approvalInboxQuery } from '../app/query.js';
import { canonicalRouteLabel } from '../app/route-copy.js';
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

export function ApprovalInboxPage() {
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
      setFilterError('Enter both dates in order and keep the range within 366 calendar days.');
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
        eyebrow="Approvals"
        title={canonicalRouteLabel('/approvals')}
        description="Review the corrections, absence requests, cancellations, and monthly periods that need your decision."
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
  useBoundaryPresentation('Permission denied');
  return (
    <section className="grid max-w-2xl gap-6">
      <PageHeader
        eyebrow="Route status"
        title="Permission denied"
        description="Your current account cannot view the approval inbox."
      />
      <Link className={buttonVariants({ variant: 'secondary' })} to="/">
        Go to my home
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
          {open ? 'Hide filters' : 'Refine this view'}
        </summary>
        <FilterBar aria-label="Approval filters" className="border-0 p-4" onSubmit={onSubmit}>
          <div className="grid w-full gap-4">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <SelectFilter
                id="approval-type"
                label="Workflow category"
                value={draft.type}
                onChange={(type) => onChange({ ...draft, type: type as ApprovalInboxType })}
                options={[
                  ['ALL', 'All categories'],
                  ['CORRECTION', 'Correction'],
                  ['ABSENCE', 'Absence request'],
                  ['CANCELLATION', 'Absence cancellation'],
                  ['MONTHLY_PERIOD', 'Monthly period'],
                ]}
              />
              <label className="grid gap-2 text-sm font-semibold" htmlFor="approval-team">
                Current team
                <select
                  id="approval-team"
                  data-route-focus-key="approval-filter-team"
                  className={inputClassName}
                  value={draft.team}
                  onChange={(event) => onChange({ ...draft, team: event.target.value })}
                >
                  <option value="">All available teams</option>
                  {draft.team !== '' && !teams.some((team) => team.id === draft.team) ? (
                    <option value={draft.team}>Selected current team</option>
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
                label="Order"
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
                  ['SUBMITTED_AT:DESC', 'Newest submitted first'],
                  ['SUBMITTED_AT:ASC', 'Oldest submitted first'],
                  ['AFFECTED_DATE:ASC', 'Earliest affected first'],
                  ['AFFECTED_DATE:DESC', 'Latest affected first'],
                  ['EMPLOYEE:ASC', 'Employee A to Z'],
                  ['EMPLOYEE:DESC', 'Employee Z to A'],
                ]}
              />
              <label className="grid gap-2 text-sm font-semibold" htmlFor="approval-from">
                Affected from
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
                Affected through
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
                title="Check the date range"
                tone="danger"
              >
                <p>{error}</p>
              </Alert>
            )}
            <Button type="submit" className="w-fit" data-route-focus-key="approval-apply-filters">
              Apply filters
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
  const { pagination } = data;
  const filtered = hasNonDefaultFilters(query);
  const wideLayout = useWideApprovalLayout();
  const pageCount = Math.max(1, pagination.totalPages);
  return (
    <section aria-labelledby="approval-results-heading" className="grid gap-4">
      <div className="grid gap-4 border-b border-[var(--wl-border)] pb-4">
        <div className="grid gap-1">
          <p className="m-0 text-xs font-bold uppercase tracking-[0.12em] text-[var(--wl-text-muted)]">
            Current queue
          </p>
          <h2 id="approval-results-heading" className="m-0 text-2xl font-bold">
            {query.status === 'ACTION_REQUIRED' ? 'Needs review' : statusLabel(query.status)}:{' '}
            {pagination.total.toLocaleString()}
          </h2>
        </div>
        <div>
          <SelectFilter
            id="approval-queue-view"
            label="Queue view"
            value={query.status}
            onChange={(status) => onQueueStatus(approvalInboxStatusSchema.parse(status))}
            options={[
              ['ACTION_REQUIRED', 'Needs review'],
              ['WAITING_ON_EMPLOYEE', 'Waiting on employee'],
              ['COMPLETED', 'Completed'],
              ['ALL', 'All records'],
            ]}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 text-sm text-[var(--wl-text-muted)]">
          <strong className="text-[var(--wl-text)]">Applied view:</strong>{' '}
          {appliedFilterSummary(query, data.filterOptions.teams)}
        </p>
        {filtered ? (
          <Button type="button" variant="quiet" className="w-fit" onPress={onClear}>
            Reset to needs review
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
        aria-label="Approval results status"
        aria-live="polite"
        aria-atomic="true"
      >
        {isFetching ? 'Updating approval results…' : ''}
      </p>
      {data.items.length === 0 ? (
        <RouteState
          actions={
            filtered ? (
              <Button type="button" variant="secondary" className="w-fit" onPress={onClear}>
                Clear filters
              </Button>
            ) : undefined
          }
          kind="empty"
          title={filtered ? 'No approvals match these filters' : 'No approvals need action'}
        >
          <p className="m-0">
            {filtered
              ? 'No approvals match the applied filters.'
              : 'No approvals currently require your action.'}
          </p>
        </RouteState>
      ) : wideLayout ? (
        <ApprovalResultsTable data={data} isFetching={isFetching} query={query} />
      ) : (
        <ApprovalResultsList data={data} isFetching={isFetching} />
      )}
      {pageCount > 1 ? (
        <Pagination
          ariaLabel="Approval inbox pages"
          currentPage={pagination.page}
          nextFocusKey="approval-next-page"
          onPageChange={onPage}
          pageCount={pageCount}
          previousFocusKey="approval-previous-page"
          summary={approvalPageSummary(pagination)}
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
  return (
    <DataTable
      caption="Approval inbox results"
      className="min-w-[46rem]"
      scrollLabel="Approval inbox results table"
    >
      <thead>
        <tr>
          <SortHeader active={query.sort === 'EMPLOYEE'} direction={query.direction}>
            Employee
          </SortHeader>
          <th scope="col">Workflow</th>
          <th scope="col">Status</th>
          <SortHeader active={query.sort === 'AFFECTED_DATE'} direction={query.direction}>
            Affected dates
          </SortHeader>
          <SortHeader active={query.sort === 'SUBMITTED_AT'} direction={query.direction}>
            Submitted
          </SortHeader>
          <th scope="col">Action</th>
        </tr>
      </thead>
      <tbody>
        {data.items.map((item) => (
          <tr key={`${item.kind}-${item.id}`}>
            <th scope="row">
              <span className="grid gap-1">
                <span>{item.employeeDisplayName}</span>
                <span className="text-xs font-normal text-[var(--wl-text-muted)]">
                  {item.team?.name ?? 'No current team'}
                </span>
              </span>
            </th>
            <td>{workflowLabel(item.kind)}</td>
            <td>
              <StatusBadge tone={approvalStatusTone(item.status)}>
                {statusLabel(item.status)}
              </StatusBadge>
            </td>
            <td>{formatAffectedDates(item)}</td>
            <td>{formatSubmittedAt(item.submittedAt, data.timeZone)}</td>
            <td>{approvalAction(item, isFetching, 'table')}</td>
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
  return (
    <ol className="m-0 grid list-none gap-3 p-0" aria-label="Approval inbox results">
      {data.items.map((item) => (
        <li key={`${item.kind}-${item.id}`}>
          <Panel as="article" className="grid min-w-0 gap-3" density="compact">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="grid gap-1">
                <h3 className="m-0 text-lg font-bold">{item.employeeDisplayName}</h3>
                <p className="m-0 text-sm text-[var(--wl-text-muted)]">
                  {workflowLabel(item.kind)}
                </p>
              </div>
              <StatusBadge tone={approvalStatusTone(item.status)}>
                {statusLabel(item.status)}
              </StatusBadge>
            </div>
            <dl className="m-0 grid gap-2 text-sm">
              <ApprovalFact label="Affected dates" value={formatAffectedDates(item)} />
              <ApprovalFact
                label="Submitted"
                value={formatSubmittedAt(item.submittedAt, data.timeZone)}
              />
              <ApprovalFact label="Current team" value={item.team?.name ?? 'No current team'} />
            </dl>
            {approvalAction(item, isFetching, 'list')}
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
): ReactNode {
  if (isFetching) {
    return (
      <span className="text-sm text-[var(--wl-text-muted)]">Review after update finishes</span>
    );
  }
  return (
    <Link
      aria-label={`Review ${workflowLabel(item.kind).toLowerCase()} for ${item.employeeDisplayName}`}
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
        ? 'Review'
        : item.status === 'ACTION_REQUIRED'
          ? 'Review and decide'
          : 'Review record'}
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
  return (
    <RouteState kind="loading" title="Loading approval inbox">
      <p>Preparing the requests and monthly periods available for review.</p>
    </RouteState>
  );
}

function ApprovalInboxError({ error, retry }: Readonly<{ error: unknown; retry: () => void }>) {
  const denied = error instanceof ApiClientError && error.code === 'ACCESS_DENIED';
  return (
    <Alert
      title={denied ? 'Approval inbox unavailable' : 'Approval inbox could not be loaded'}
      tone="danger"
    >
      <p>
        {denied
          ? 'Your current account cannot view the approval inbox.'
          : 'WorkLedger could not load the approval inbox. No approval information is available.'}
      </p>
      {!denied ? (
        <>
          {error instanceof ApiClientError && error.requestId !== undefined ? (
            <p className="m-0 text-sm">Request reference: {error.requestId}</p>
          ) : null}
          <Button type="button" variant="secondary" className="w-fit" onPress={retry}>
            Try again
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
): string {
  const selectedTeam = teams.find((team) => team.id === query.team);
  const values = [
    statusLabel(query.status),
    typeFilterLabel(query.type),
    query.team === undefined
      ? 'all current teams'
      : (selectedTeam?.name ?? 'selected current team'),
  ];
  if (query.from !== undefined && query.to !== undefined) {
    values.push(`${formatLocalDate(query.from)} to ${formatLocalDate(query.to)}`);
  } else {
    values.push('any affected date');
  }
  values.push(orderLabel(query));
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

function approvalPageSummary(pagination: ApprovalInbox['pagination']): string {
  if (pagination.total === 0) return 'No approvals';
  const first = (pagination.page - 1) * pagination.limit + 1;
  const last = Math.min(pagination.page * pagination.limit, pagination.total);
  return `Showing ${first.toString()}–${last.toString()} of ${pagination.total.toString()}`;
}

function formatAffectedDates(item: ApprovalInbox['items'][number]): string {
  return item.affectedStartDate === item.affectedEndDate
    ? formatLocalDate(item.affectedStartDate)
    : `${formatLocalDate(item.affectedStartDate)} to ${formatLocalDate(item.affectedEndDate)}`;
}

function approvalStatusTone(status: ApprovalInboxStatus): NonNullable<StatusBadgeProps['tone']> {
  if (status === 'ACTION_REQUIRED') return 'warning';
  if (status === 'WAITING_ON_EMPLOYEE') return 'info';
  if (status === 'COMPLETED') return 'success';
  return 'neutral';
}

function workflowLabel(kind: ApprovalInbox['items'][number]['kind']): string {
  return kind === 'CORRECTION'
    ? 'Correction'
    : kind === 'ABSENCE'
      ? 'Absence request'
      : kind === 'CANCELLATION'
        ? 'Absence cancellation'
        : 'Monthly period';
}

function statusLabel(status: ApprovalInboxStatus): string {
  return status === 'ACTION_REQUIRED'
    ? 'Action required'
    : status === 'WAITING_ON_EMPLOYEE'
      ? 'Waiting on employee'
      : status === 'COMPLETED'
        ? 'Completed'
        : 'All records';
}

function typeFilterLabel(type: ApprovalInboxType): string {
  return type === 'ALL' ? 'all workflow categories' : workflowLabel(type);
}

function orderLabel(value: Pick<ApprovalInboxQuery, 'direction' | 'sort'>): string {
  if (value.sort === 'SUBMITTED_AT') {
    return value.direction === 'ASC' ? 'oldest submitted first' : 'newest submitted first';
  }
  if (value.sort === 'AFFECTED_DATE') {
    return value.direction === 'ASC' ? 'earliest affected first' : 'latest affected first';
  }
  return value.direction === 'ASC' ? 'employee A to Z' : 'employee Z to A';
}

function formatSubmittedAt(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(new Date(value));
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
