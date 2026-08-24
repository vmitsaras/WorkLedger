import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLoaderData, useNavigate, useSearchParams } from 'react-router';

import {
  personalRequestQuerySchema,
  type PersonalRequestFilterStatus,
  type PersonalRequestItemStatus,
  type PersonalRequestListItem,
  type PersonalRequestQuery,
  type PersonalRequestType,
} from '@workledger/contracts';
import {
  Button,
  FilterBar,
  Pagination,
  Panel,
  RouteState,
  StatusBadge,
  buttonVariants,
} from '@workledger/ui';

import { formatLocalDate } from '../app/date-time-format.js';
import { ApiClientError, clearSessionMemory } from '../app/api-client.js';
import { personalRequestHistoryQuery } from '../app/query.js';
import { setPendingSignInNotice } from '../app/session-notice.js';
import { PageHeader } from '../components/page-header.js';

type FilterDraft = Readonly<{
  status: PersonalRequestFilterStatus;
  type: PersonalRequestType;
}>;

export function RequestHistoryPage() {
  const queryInput = useLoaderData<PersonalRequestQuery>();
  const [, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const query = useQuery(personalRequestHistoryQuery(queryInput));
  const [draft, setDraft] = useState<FilterDraft>(() => toDraft(queryInput));

  useEffect(() => setDraft(toDraft(queryInput)), [queryInput]);
  useEffect(() => {
    if (!isAuthenticationError(query.error)) return;
    clearSessionMemory();
    queryClient.clear();
    if (query.error.code === 'AUTH_SESSION_EXPIRED') setPendingSignInNotice('SESSION_EXPIRED');
    void navigate('/sign-in', { replace: true });
  }, [navigate, query.error, queryClient]);
  useEffect(() => {
    if (query.data === undefined) return;
    const lastPage = Math.max(1, query.data.pagination.totalPages);
    if (queryInput.page <= lastPage) return;
    setSearchParams(toSearchParams({ ...queryInput, page: lastPage }), { replace: true });
  }, [query.data, queryInput, setSearchParams]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = personalRequestQuerySchema.parse({
      limit: queryInput.limit,
      page: 1,
      status: draft.status,
      type: draft.type,
    });
    setSearchParams(toSearchParams(parsed));
  }

  function clearFilters() {
    setSearchParams(toSearchParams(personalRequestQuerySchema.parse({})));
  }

  return (
    <section className="grid gap-6">
      <PageHeader
        eyebrow="Requests"
        title="My requests"
        description="Review corrections, absence requests, and cancellation requests in one history. Sensitive absence details appear only after you open your record."
      >
        <Link className={`${buttonVariants()} w-fit`} to="/requests/new">
          New request
        </Link>
      </PageHeader>
      <FilterBar
        title="Filter request history"
        description="Filters are stored in the address so this view can be bookmarked."
        onSubmit={applyFilters}
      >
        <label className="grid gap-2 text-sm font-semibold" htmlFor="request-status-filter">
          Status
          <select
            className="wl-text-field"
            id="request-status-filter"
            value={draft.status}
            onChange={(event) =>
              setDraft({ ...draft, status: event.target.value as PersonalRequestFilterStatus })
            }
          >
            <option value="ALL">All statuses</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold" htmlFor="request-type-filter">
          Workflow
          <select
            className="wl-text-field"
            id="request-type-filter"
            value={draft.type}
            onChange={(event) =>
              setDraft({ ...draft, type: event.target.value as PersonalRequestType })
            }
          >
            <option value="ALL">All workflows</option>
            <option value="CORRECTION">Corrections</option>
            <option value="ABSENCE">Absence requests</option>
            <option value="CANCELLATION">Cancellation requests</option>
          </select>
        </label>
        <Button type="submit">Apply filters</Button>
        <Button type="button" variant="quiet" onPress={clearFilters}>
          Clear filters
        </Button>
      </FilterBar>
      {query.isPending ? (
        <RouteState kind="loading" title="Loading request history">
          <p>Your request records are being loaded.</p>
        </RouteState>
      ) : query.isError || query.data === undefined ? (
        <RouteState
          actions={<Button onPress={() => void query.refetch()}>Try again</Button>}
          kind="error"
          title="Request history unavailable"
        >
          <p>Your records were not changed. Try loading the history again.</p>
        </RouteState>
      ) : query.data.items.length === 0 ? (
        <RouteState
          actionHref="/requests/new"
          actionLabel="Create a request"
          kind="empty"
          title="No requests match these filters"
        >
          <p>Clear the filters to review other records, or start a new request.</p>
        </RouteState>
      ) : (
        <RequestResults
          data={query.data.items}
          fetching={query.isFetching}
          onPage={(page) => setSearchParams(toSearchParams({ ...queryInput, page }))}
          pagination={query.data.pagination}
        />
      )}
    </section>
  );
}

function RequestResults({
  data,
  fetching,
  onPage,
  pagination,
}: Readonly<{
  data: readonly PersonalRequestListItem[];
  fetching: boolean;
  onPage: (page: number) => void;
  pagination: Readonly<{ page: number; total: number; totalPages: number }>;
}>) {
  return (
    <section aria-labelledby="request-results-heading" className="grid gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="request-results-heading" className="m-0 text-xl font-bold">
          Request history
        </h2>
        <p className="m-0 text-sm text-[var(--wl-text-muted)]" aria-live="polite">
          {pagination.total} record{pagination.total === 1 ? '' : 's'}
          {fetching ? '. Refreshing results.' : ''}
        </p>
      </div>
      <ol className="m-0 grid list-none gap-3 p-0">
        {data.map((request) => (
          <li key={`${request.kind}-${request.id}`}>
            <Panel as="article" className="grid gap-3" density="balanced">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="grid gap-1">
                  <h3 className="m-0 text-lg font-bold">{kindLabel(request.kind)}</h3>
                  <p className="m-0 text-sm text-[var(--wl-text-muted)]">
                    {dateRange(request.affectedStartDate, request.affectedEndDate)}
                  </p>
                </div>
                <StatusBadge tone={statusTone(request.status)}>
                  {statusLabel(request.status)}
                </StatusBadge>
              </div>
              <p className="m-0 text-sm text-[var(--wl-text-muted)]">
                Submitted {formatSubmittedAt(request.submittedAt)}
              </p>
              <Link className="w-fit font-semibold" to={`/requests/${request.id}`}>
                View request details
              </Link>
            </Panel>
          </li>
        ))}
      </ol>
      <Pagination
        currentPage={pagination.page}
        onPageChange={onPage}
        pageCount={pagination.totalPages}
        summary={`Page ${pagination.page} of ${pagination.totalPages}. ${pagination.total} total records.`}
      />
    </section>
  );
}

function toDraft(query: PersonalRequestQuery): FilterDraft {
  return { status: query.status, type: query.type };
}

export function toPersonalRequestSearchParams(query: PersonalRequestQuery): URLSearchParams {
  return toSearchParams(query);
}

function toSearchParams(query: PersonalRequestQuery): URLSearchParams {
  return new URLSearchParams({
    limit: query.limit.toString(),
    page: query.page.toString(),
    status: query.status,
    type: query.type,
  });
}

function kindLabel(kind: PersonalRequestListItem['kind']): string {
  if (kind === 'CORRECTION') return 'Time correction';
  if (kind === 'ABSENCE') return 'Absence request';
  return 'Cancellation request';
}

function statusLabel(status: PersonalRequestItemStatus): string {
  return status
    .replaceAll('_', ' ')
    .toLocaleLowerCase()
    .replace(/^./u, (value) => value.toUpperCase());
}

function statusTone(
  status: PersonalRequestItemStatus,
): 'danger' | 'info' | 'neutral' | 'success' | 'warning' {
  if (['APPROVED', 'ACKNOWLEDGED', 'APPLIED'].includes(status)) return 'success';
  if (['REJECTED', 'CANCELLED'].includes(status)) return 'danger';
  if (['CHANGES_REQUESTED', 'PARTIALLY_CANCELLED'].includes(status)) return 'warning';
  if (status === 'WITHDRAWN') return 'neutral';
  return 'info';
}

function dateRange(start: string, end: string): string {
  if (start === end) return formatLocalDate(start);
  return `${formatLocalDate(start)} through ${formatLocalDate(end)}`;
}

function formatSubmittedAt(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );
}

function isAuthenticationError(error: unknown): error is ApiClientError {
  return (
    error instanceof ApiClientError &&
    (error.code === 'AUTH_REQUIRED' || error.code === 'AUTH_SESSION_EXPIRED')
  );
}
