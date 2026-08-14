import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLoaderData, useNavigate, useSearchParams } from 'react-router';

import {
  approvalInboxQuerySchema,
  type ApprovalInbox,
  type ApprovalInboxDirection,
  type ApprovalInboxQuery,
  type ApprovalInboxSort,
  type ApprovalInboxStatus,
  type ApprovalInboxType,
} from '@workledger/contracts';
import { Button, buttonVariants } from '@workledger/ui';

import { ApiClientError, clearSessionMemory } from '../app/api-client.js';
import { formatLocalDate } from '../app/date-time-format.js';
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

  if (query.isError && isAccessDenied(query.error)) return <ApprovalInboxPermissionDenied />;

  return (
    <section className="grid gap-6">
      <PageHeader
        eyebrow="Approvals"
        title="Approval inbox"
        description="Review current, authorized work across corrections, absence requests, absence cancellations, and monthly periods. Filters never expose absence subtypes or employee search text."
      />
      <ApprovalFilters
        draft={draft}
        error={filterError}
        onChange={setDraft}
        onClear={clearFilters}
        onSubmit={submitFilters}
        query={queryInput}
        teams={query.data?.filterOptions.teams ?? []}
      />
      {query.isPending ? (
        <ApprovalInboxLoading />
      ) : query.isError || query.data === undefined ? (
        <ApprovalInboxError error={query.error} retry={() => void query.refetch()} />
      ) : (
        <ApprovalResults
          data={query.data}
          isFetching={query.isFetching}
          onClear={clearFilters}
          onPage={setPage}
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
        description="Your current account cannot view the approval inbox. No restricted approval details were disclosed."
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
  onClear,
  onSubmit,
  query,
  teams,
}: Readonly<{
  draft: FilterDraft;
  error: string | undefined;
  onChange: (draft: FilterDraft) => void;
  onClear: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  query: ApprovalInboxQuery;
  teams: ApprovalInbox['filterOptions']['teams'];
}>) {
  const wideLayout = useWideApprovalFilterLayout();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <section aria-labelledby="approval-filters-heading" className="grid gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="approval-filters-heading" className="m-0 text-xl font-bold">
            Filter and sort
          </h2>
          <p className="m-0 mt-1 text-sm text-[var(--wl-text-muted)]">
            Applied: {appliedFilterSummary(query)}
          </p>
        </div>
        <Button type="button" variant="quiet" className="w-fit" onPress={onClear}>
          Clear approval filters
        </Button>
      </div>
      <details
        className="wl-approval-filter-disclosure rounded-xl border border-[var(--wl-border)] bg-[var(--wl-surface-raised)]"
        open={wideLayout || mobileOpen}
        onToggle={(event) => {
          if (!wideLayout) setMobileOpen(event.currentTarget.open);
        }}
      >
        <summary className="wl-approval-filter-summary">
          {!wideLayout && mobileOpen ? 'Hide approval filters' : 'Show approval filters'}
        </summary>
        <form className="wl-approval-filter-panel grid gap-4 p-4" onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SelectFilter
              id="approval-status"
              label="Queue status"
              value={draft.status}
              onChange={(status) => onChange({ ...draft, status: status as ApprovalInboxStatus })}
              options={[
                ['ACTION_REQUIRED', 'Action required'],
                ['WAITING_ON_EMPLOYEE', 'Waiting on employee'],
                ['COMPLETED', 'Completed'],
                ['ALL', 'All statuses'],
              ]}
            />
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
                <option value="">All authorized teams</option>
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
              id="approval-sort"
              label="Sort by"
              value={draft.sort}
              onChange={(sort) => onChange({ ...draft, sort: sort as ApprovalInboxSort })}
              options={[
                ['SUBMITTED_AT', 'Submitted time'],
                ['AFFECTED_DATE', 'Affected date'],
                ['EMPLOYEE', 'Employee name'],
              ]}
            />
            <SelectFilter
              id="approval-direction"
              label="Sort direction"
              value={draft.direction}
              onChange={(direction) =>
                onChange({ ...draft, direction: direction as ApprovalInboxDirection })
              }
              options={[
                ['DESC', 'Descending'],
                ['ASC', 'Ascending'],
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
            <p
              id="approval-date-range-error"
              className="wl-alert wl-alert-error m-0 rounded-xl border p-3"
              role="alert"
            >
              {error}
            </p>
          )}
          <Button type="submit" className="w-fit" data-route-focus-key="approval-apply-filters">
            Apply filters
          </Button>
        </form>
      </details>
    </section>
  );
}

function useWideApprovalFilterLayout(): boolean {
  const [wide, setWide] = useState(readWideApprovalFilterLayout);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(min-width: 48rem)');
    const update = () => setWide(media.matches);
    media.addEventListener('change', update);
    update();
    return () => media.removeEventListener('change', update);
  }, []);

  return wide;
}

function readWideApprovalFilterLayout(): boolean {
  return typeof window.matchMedia !== 'function' || window.matchMedia('(min-width: 48rem)').matches;
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

function ApprovalResults({
  data,
  isFetching,
  onClear,
  onPage,
  query,
}: Readonly<{
  data: ApprovalInbox;
  isFetching: boolean;
  onClear: () => void;
  onPage: (page: number) => void;
  query: ApprovalInboxQuery;
}>) {
  const { pagination } = data;
  const filtered = hasNonDefaultFilters(query);
  return (
    <section aria-labelledby="approval-results-heading" className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="approval-results-heading" className="m-0 text-xl font-bold">
            Results
          </h2>
          <p
            className="m-0 mt-1 text-sm text-[var(--wl-text-muted)]"
            role="status"
            aria-label="Approval results status"
            aria-live="polite"
            aria-atomic="true"
          >
            {isFetching
              ? 'Updating results…'
              : `${pagination.total.toString()} authorized item${pagination.total === 1 ? '' : 's'} after scope and filters.`}
          </p>
        </div>
      </div>
      {data.items.length === 0 ? (
        <div className="grid gap-3 rounded-xl border border-[var(--wl-border)] p-4">
          <p className="m-0">
            {filtered
              ? 'No approvals match the applied filters.'
              : 'No approvals currently require your action.'}
          </p>
          {filtered ? (
            <Button type="button" variant="secondary" className="w-fit" onPress={onClear}>
              Clear filters
            </Button>
          ) : null}
        </div>
      ) : (
        <div
          className="overflow-x-auto rounded-xl border border-[var(--wl-border)]"
          role="region"
          aria-label="Scrollable approval inbox results"
          tabIndex={0}
        >
          <table className="w-full min-w-[58rem] border-collapse text-left">
            <caption className="p-3 text-left text-sm text-[var(--wl-text-muted)]">
              Unified approval inbox. Monthly periods link to their dedicated review page; absence
              subtypes remain hidden.
            </caption>
            <thead>
              <tr className="border-y border-[var(--wl-border)] text-sm">
                <SortHeader active={query.sort === 'EMPLOYEE'} direction={query.direction}>
                  Employee
                </SortHeader>
                <th scope="col" className="p-3">
                  Workflow
                </th>
                <th scope="col" className="p-3">
                  Status
                </th>
                <SortHeader active={query.sort === 'AFFECTED_DATE'} direction={query.direction}>
                  Affected dates
                </SortHeader>
                <SortHeader active={query.sort === 'SUBMITTED_AT'} direction={query.direction}>
                  Submitted
                </SortHeader>
                <th scope="col" className="p-3">
                  Current team
                </th>
                <th scope="col" className="p-3">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={`${item.kind}-${item.id}`} className="border-b border-[var(--wl-border)]">
                  <th scope="row" className="p-3 font-semibold">
                    {item.employeeDisplayName}
                  </th>
                  <td className="p-3">{workflowLabel(item.kind)}</td>
                  <td className="p-3">{statusLabel(item.status)}</td>
                  <td className="p-3">
                    {item.affectedStartDate === item.affectedEndDate
                      ? formatLocalDate(item.affectedStartDate)
                      : `${formatLocalDate(item.affectedStartDate)} to ${formatLocalDate(item.affectedEndDate)}`}
                  </td>
                  <td className="p-3">{formatSubmittedAt(item.submittedAt, data.timeZone)}</td>
                  <td className="p-3">{item.team?.name ?? 'No current team'}</td>
                  <td className="p-3">
                    {!isFetching ? (
                      <Link
                        aria-label={`Review ${workflowLabel(item.kind).toLowerCase()} for ${item.employeeDisplayName}`}
                        className={buttonVariants({ variant: 'secondary' })}
                        to={
                          item.kind === 'MONTHLY_PERIOD'
                            ? `/monthly-periods/${encodeURIComponent(item.id)}`
                            : `/approvals/${encodeURIComponent(item.id)}`
                        }
                      >
                        Review
                      </Link>
                    ) : (
                      <span className="text-sm text-[var(--wl-text-muted)]">No list action</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <nav aria-label="Approval inbox pages" className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          isDisabled={pagination.page <= 1}
          data-route-focus-key="approval-previous-page"
          onPress={() => onPage(pagination.page - 1)}
        >
          Previous page
        </Button>
        <span className="text-sm text-[var(--wl-text-muted)]">
          Page {pagination.page} of {Math.max(1, pagination.totalPages)}
        </span>
        <Button
          type="button"
          variant="secondary"
          isDisabled={pagination.page >= Math.max(1, pagination.totalPages)}
          data-route-focus-key="approval-next-page"
          onPress={() => onPage(pagination.page + 1)}
        >
          Next page
        </Button>
      </nav>
    </section>
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
    <div className="grid gap-3" aria-busy="true">
      <p className="m-0">Loading authorized approvals…</p>
      <div
        role="progressbar"
        aria-label="Loading approval inbox"
        className="h-2 rounded-full bg-[var(--wl-surface-subtle)]"
      />
    </div>
  );
}

function ApprovalInboxError({ error, retry }: Readonly<{ error: unknown; retry: () => void }>) {
  const denied = error instanceof ApiClientError && error.code === 'ACCESS_DENIED';
  return (
    <div className="wl-alert wl-alert-error grid gap-3 rounded-xl border p-4" role="alert">
      <p className="m-0">
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
    </div>
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

function appliedFilterSummary(query: ApprovalInboxQuery): string {
  const values = [statusLabel(query.status), typeFilterLabel(query.type)];
  if (query.team !== undefined) values.push('one current team');
  if (query.from !== undefined && query.to !== undefined) {
    values.push(`${formatLocalDate(query.from)} to ${formatLocalDate(query.to)}`);
  }
  values.push(
    `sorted by ${sortLabel(query.sort)}, ${query.direction === 'ASC' ? 'ascending' : 'descending'}`,
  );
  return values.join('; ');
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
        : 'All statuses';
}

function typeFilterLabel(type: ApprovalInboxType): string {
  return type === 'ALL' ? 'all workflow categories' : workflowLabel(type);
}

function sortLabel(sort: ApprovalInboxSort): string {
  return sort === 'SUBMITTED_AT'
    ? 'submitted time'
    : sort === 'AFFECTED_DATE'
      ? 'affected date'
      : 'employee name';
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
