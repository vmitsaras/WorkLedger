import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLoaderData, useNavigate, useSearchParams } from 'react-router';

import {
  personalRequestQuerySchema,
  type PersonalRequestFilterStatus,
  type PersonalRequestListItem,
  type PersonalRequestQuery,
  type PersonalRequestType,
} from '@workledger/contracts';
import { formatDateOnly, formatInstant, type MessageKey } from '@workledger/i18n';
import { useWorkLedgerI18n, useWorkLedgerMessage } from '@workledger/i18n/react';
import { Button, FilterBar, Panel, RouteState, buttonVariants } from '@workledger/ui';

import { ApiClientError, clearSessionMemory } from '../app/api-client.js';
import { personalRequestHistoryQuery } from '../app/query.js';
import { setPendingSignInNotice } from '../app/session-notice.js';
import { InsightEntryPoint } from '../components/insight-entry-point.js';
import { PageHeader } from '../components/page-header.js';
import { Pagination } from '../components/pagination.js';
import { WorkflowStatusBadge } from '../components/workflow-status-badge.js';

type FilterDraft = Readonly<{
  status: PersonalRequestFilterStatus;
  type: PersonalRequestType;
}>;

const REQUEST_KIND_KEYS = {
  ABSENCE: 'employee.requests.history.kind.absence',
  CANCELLATION: 'employee.requests.history.kind.cancellation',
  CORRECTION: 'employee.requests.history.kind.correction',
} as const satisfies Readonly<Record<PersonalRequestListItem['kind'], MessageKey>>;

export function RequestHistoryPage() {
  const t = useWorkLedgerMessage();
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
        eyebrow={t('employee.requests.history.eyebrow')}
        title={t('shared.route.title.requests')}
        description={t('employee.requests.history.description')}
      >
        <Link className={`${buttonVariants()} w-fit`} to="/requests/new">
          {t('employee.requests.history.new')}
        </Link>
      </PageHeader>
      <InsightEntryPoint contextKind="MY_REQUESTS" />
      <FilterBar
        title={t('employee.requests.history.filter.title')}
        description={t('employee.requests.history.filter.description')}
        onSubmit={applyFilters}
      >
        <label className="grid gap-2 text-sm font-semibold" htmlFor="request-status-filter">
          {t('employee.requests.history.filter.status.label')}
          <select
            className="wl-text-field"
            id="request-status-filter"
            value={draft.status}
            onChange={(event) =>
              setDraft({ ...draft, status: event.target.value as PersonalRequestFilterStatus })
            }
          >
            <option value="ALL">{t('employee.requests.history.filter.status.all')}</option>
            <option value="IN_PROGRESS">
              {t('employee.requests.history.filter.status.inProgress')}
            </option>
            <option value="COMPLETED">
              {t('employee.requests.history.filter.status.completed')}
            </option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold" htmlFor="request-type-filter">
          {t('employee.requests.history.filter.workflow.label')}
          <select
            className="wl-text-field"
            id="request-type-filter"
            value={draft.type}
            onChange={(event) =>
              setDraft({ ...draft, type: event.target.value as PersonalRequestType })
            }
          >
            <option value="ALL">{t('employee.requests.history.filter.workflow.all')}</option>
            <option value="CORRECTION">
              {t('employee.requests.history.filter.workflow.correction')}
            </option>
            <option value="ABSENCE">
              {t('employee.requests.history.filter.workflow.absence')}
            </option>
            <option value="CANCELLATION">
              {t('employee.requests.history.filter.workflow.cancellation')}
            </option>
          </select>
        </label>
        <Button type="submit">{t('employee.requests.history.filter.action.apply')}</Button>
        <Button type="button" variant="quiet" onPress={clearFilters}>
          {t('employee.requests.history.filter.action.clear')}
        </Button>
      </FilterBar>
      {query.isPending ? (
        <RouteState kind="loading" title={t('employee.requests.history.loading.title')}>
          <p>{t('employee.requests.history.loading.description')}</p>
        </RouteState>
      ) : query.isError || query.data === undefined ? (
        <RouteState
          actions={
            <Button onPress={() => void query.refetch()}>{t('shared.action.tryAgain')}</Button>
          }
          kind="error"
          title={t('employee.requests.history.error.title')}
        >
          <p>{t('employee.requests.history.error.description')}</p>
        </RouteState>
      ) : query.data.items.length === 0 ? (
        <RouteState
          actionHref="/requests/new"
          actionLabel={t('employee.requests.history.empty.action')}
          kind="empty"
          title={t('employee.requests.history.empty.title')}
        >
          <p>{t('employee.requests.history.empty.description')}</p>
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
  const runtime = useWorkLedgerI18n();
  const t = useWorkLedgerMessage();
  const clientTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  return (
    <section aria-labelledby="request-results-heading" className="grid gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="request-results-heading" className="m-0 text-xl font-bold">
          {t('employee.requests.history.results.heading')}
        </h2>
        <p className="m-0 text-sm text-[var(--wl-text-muted)]" aria-live="polite">
          {t('employee.requests.history.results.count', { count: pagination.total })}
          {fetching ? ` ${t('employee.requests.history.results.refreshing')}` : ''}
        </p>
      </div>
      <ol className="m-0 grid list-none gap-3 p-0">
        {data.map((request) => (
          <li key={`${request.kind}-${request.id}`}>
            <Panel as="article" className="grid gap-3" density="balanced">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="grid gap-1">
                  <h3 className="m-0 text-lg font-bold">{t(REQUEST_KIND_KEYS[request.kind])}</h3>
                  <p className="m-0 text-sm text-[var(--wl-text-muted)]">
                    {dateRange(
                      runtime.locale,
                      request.affectedStartDate,
                      request.affectedEndDate,
                      t,
                    )}
                  </p>
                </div>
                <WorkflowStatusBadge status={request.status} />
              </div>
              <p className="m-0 text-sm text-[var(--wl-text-muted)]">
                {t('employee.requests.history.submitted', {
                  date: formatInstant(runtime.locale, request.submittedAt, clientTimeZone),
                })}
              </p>
              <Link className="w-fit font-semibold" to={`/requests/${request.id}`}>
                {t('employee.requests.history.viewDetails')}
              </Link>
            </Panel>
          </li>
        ))}
      </ol>
      <Pagination
        currentPage={pagination.page}
        onPageChange={onPage}
        pageCount={pagination.totalPages}
        summary={t('employee.requests.history.results.pagination', {
          current: pagination.page,
          pages: pagination.totalPages,
          total: pagination.total,
        })}
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

function dateRange(
  locale: Parameters<typeof formatDateOnly>[0],
  start: string,
  end: string,
  t: ReturnType<typeof useWorkLedgerMessage>,
): string {
  const formattedStart = formatDateOnly(locale, start);
  if (start === end) return formattedStart;
  return t('employee.requests.history.dateRange', {
    end: formatDateOnly(locale, end),
    start: formattedStart,
  });
}

function isAuthenticationError(error: unknown): error is ApiClientError {
  return (
    error instanceof ApiClientError &&
    (error.code === 'AUTH_REQUIRED' || error.code === 'AUTH_SESSION_EXPIRED')
  );
}
