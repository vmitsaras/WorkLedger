import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useLoaderData, useNavigate, useSearchParams } from 'react-router';

import type { TeamAvailabilityState, TeamStatus, TeamStatusMember } from '@workledger/contracts';
import { formatDateOnly, formatInstant, type MessageKey } from '@workledger/i18n';
import { useWorkLedgerI18n, useWorkLedgerMessage } from '@workledger/i18n/react';
import {
  Alert,
  Button,
  DataTable,
  Panel,
  RouteState,
  StatusBadge,
  buttonVariants,
  type StatusBadgeProps,
} from '@workledger/ui';

import { ApiClientError, clearSessionMemory } from '../app/api-client.js';
import { teamStatusQuery } from '../app/query.js';
import { useBoundaryPresentation } from '../app/route-presentation.js';
import { setPendingSignInNotice } from '../app/session-notice.js';
import {
  DEFAULT_TEAM_STATUS_VIEW,
  toTeamStatusSearchParams,
  type TeamAvailabilityFilter,
  type TeamStatusView,
} from '../app/team-status-view.js';
import { PageHeader } from '../components/page-header.js';

const STATUS_LABELS = Object.freeze({
  OFF_WORK: 'manager.team.status.availability.offWork',
  ON_BREAK: 'manager.team.status.availability.onBreak',
  UNAVAILABLE: 'manager.team.status.availability.unavailable',
  WORKING: 'manager.team.status.availability.working',
} as const satisfies Readonly<Record<TeamAvailabilityState, MessageKey>>);

const AVAILABILITY_FILTERS: readonly Readonly<{
  label: MessageKey;
  value: TeamAvailabilityFilter;
}>[] = [
  { label: 'manager.team.status.filter.allDirectReports', value: 'ALL' },
  { label: STATUS_LABELS.WORKING, value: 'WORKING' },
  { label: STATUS_LABELS.ON_BREAK, value: 'ON_BREAK' },
  { label: STATUS_LABELS.UNAVAILABLE, value: 'UNAVAILABLE' },
  { label: STATUS_LABELS.OFF_WORK, value: 'OFF_WORK' },
];

export function TeamStatusPage() {
  const t = useWorkLedgerMessage();
  const view = useLoaderData<TeamStatusView>();
  const [, setSearchParams] = useSearchParams();
  const query = useQuery(teamStatusQuery());
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticationError(query.error)) return;
    clearSessionMemory();
    queryClient.clear();
    if (query.error.code === 'AUTH_SESSION_EXPIRED') {
      setPendingSignInNotice('SESSION_EXPIRED');
    }
    void navigate('/sign-in', { replace: true });
  }, [navigate, query.error, queryClient]);

  if (
    query.isError &&
    query.error instanceof ApiClientError &&
    query.error.code === 'ACCESS_DENIED'
  ) {
    return <TeamPermissionDenied />;
  }

  return (
    <section className="grid gap-6">
      <PageHeader
        eyebrow={t('manager.team.status.page.eyebrow')}
        title={t('shared.route.title.teamStatus')}
        description={t('manager.team.status.page.description')}
      >
        <nav aria-label={t('manager.team.status.page.shortcuts')} className="flex flex-wrap gap-2">
          <Link className={buttonVariants({ variant: 'secondary' })} to="/approvals">
            {t('shared.route.title.approvalInbox')}
          </Link>
          <Link className={buttonVariants({ variant: 'quiet' })} to="/team-calendar">
            {t('shared.route.title.teamCalendar')}
          </Link>
        </nav>
      </PageHeader>
      {query.isPending ? (
        <TeamStatusLoading />
      ) : query.isError || query.data === undefined ? (
        <TeamStatusError retry={() => void query.refetch()} />
      ) : (
        <TeamStatusContent
          data={query.data}
          refreshing={query.isFetching}
          view={view}
          onViewChange={(nextView) => setSearchParams(toTeamStatusSearchParams(nextView))}
        />
      )}
    </section>
  );
}

function TeamStatusContent({
  data,
  onViewChange,
  refreshing,
  view,
}: Readonly<{
  data: TeamStatus;
  onViewChange: (view: TeamStatusView) => void;
  refreshing: boolean;
  view: TeamStatusView;
}>) {
  const runtime = useWorkLedgerI18n();
  const t = useWorkLedgerMessage();
  const members = filterMembers(data.members, view);
  const filtered = !isDefaultView(view);

  return (
    <>
      <Panel aria-labelledby="team-summary-heading" className="wl-team-overview" density="compact">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="team-summary-heading" className="m-0 text-xl font-bold">
              {t('manager.team.status.summary.heading')}
            </h2>
            <p className="m-0 mt-1 text-sm text-[var(--wl-text-muted)]">
              {t('manager.team.status.summary.asOf', {
                date: formatDateOnly(runtime.locale, data.localDate, { dateStyle: 'full' }),
                time: formatInstant(runtime.locale, data.asOf, data.timeZone, {
                  hour: 'numeric',
                  minute: '2-digit',
                }),
                timeZone: data.timeZone,
              })}
            </p>
          </div>
          <p
            className="m-0 min-h-6 text-sm text-[var(--wl-text-muted)]"
            role="status"
            aria-label={t('manager.team.status.summary.refreshLabel')}
            aria-live="polite"
            aria-atomic="true"
          >
            {refreshing
              ? t('manager.team.status.summary.refreshing')
              : t('manager.team.status.summary.current', { count: data.summary.total })}
          </p>
        </div>
        <div className="grid gap-3">
          <p
            id="team-availability-filter-label"
            className="m-0 text-sm font-semibold text-[var(--wl-text-muted)]"
          >
            {t('manager.team.status.filter.heading')}
          </p>
          <div
            aria-labelledby="team-availability-filter-label"
            className="wl-team-overview__filters"
            role="group"
          >
            {AVAILABILITY_FILTERS.map((filter) => (
              <OverviewFilter
                count={availabilityCount(data, filter.value)}
                key={filter.value}
                label={t(filter.label)}
                pressed={view.availability === filter.value}
                routeFocusKey={`team-availability-${filter.value}`}
                onPress={() => onViewChange({ ...view, availability: filter.value })}
              />
            ))}
          </div>
        </div>
        <div className="grid gap-2 border-t border-[var(--wl-border)] pt-4">
          <div
            aria-label={t('manager.team.status.filter.recordLabel')}
            className="wl-team-overview__record-filter"
            role="group"
          >
            <OverviewFilter
              count={data.summary.unresolved}
              label={t('manager.team.status.filter.openRecords')}
              pressed={view.records === 'OPEN'}
              routeFocusKey="team-records-OPEN"
              onPress={() =>
                onViewChange({ ...view, records: view.records === 'OPEN' ? 'ALL' : 'OPEN' })
              }
            />
          </div>
          <p className="m-0 max-w-2xl text-sm text-[var(--wl-text-muted)]">
            {t('manager.team.status.filter.description')}
          </p>
        </div>
      </Panel>
      <section aria-labelledby="team-members-heading" className="grid gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="team-members-heading" className="m-0 text-xl font-bold">
              {t('manager.team.status.members.heading')}
            </h2>
            <p
              className="m-0 mt-1 text-sm text-[var(--wl-text-muted)]"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              {teamResultsSummary(members.length, data.summary.total, view, t)}
            </p>
          </div>
          {filtered && members.length > 0 ? (
            <Button
              className="w-fit"
              type="button"
              variant="quiet"
              onPress={() => onViewChange(DEFAULT_TEAM_STATUS_VIEW)}
            >
              {t('manager.team.status.members.showAll')}
            </Button>
          ) : null}
        </div>
        {data.members.length === 0 ? (
          <RouteState kind="empty" title={t('manager.team.status.empty.noReportsTitle')}>
            <p>{t('manager.team.status.empty.noReportsDescription')}</p>
          </RouteState>
        ) : members.length === 0 ? (
          <RouteState
            actions={
              <Button
                className="w-fit"
                type="button"
                variant="secondary"
                onPress={() => onViewChange(DEFAULT_TEAM_STATUS_VIEW)}
              >
                {t('manager.team.status.members.showAll')}
              </Button>
            }
            kind="empty"
            title={t('manager.team.status.empty.filteredTitle')}
          >
            <p>{t('manager.team.status.empty.filteredDescription')}</p>
          </RouteState>
        ) : (
          <TeamMembers localDate={data.localDate} members={members} />
        )}
      </section>
    </>
  );
}

function OverviewFilter({
  count,
  label,
  onPress,
  pressed,
  routeFocusKey,
}: Readonly<{
  count: number;
  label: string;
  onPress: () => void;
  pressed: boolean;
  routeFocusKey: string;
}>) {
  const t = useWorkLedgerMessage();
  return (
    <Button
      aria-label={t('manager.team.status.filter.option', { count, label })}
      aria-pressed={pressed}
      className="wl-team-overview__filter"
      data-route-focus-key={routeFocusKey}
      type="button"
      variant="secondary"
      onPress={onPress}
    >
      <span className="wl-team-overview__filter-label text-sm font-semibold">{label}</span>
      <span
        aria-hidden="true"
        className="wl-team-overview__filter-count text-2xl font-bold tabular-nums"
      >
        {count}
      </span>
    </Button>
  );
}

function TeamMembers({
  localDate,
  members,
}: Readonly<{ localDate: string; members: TeamStatus['members'] }>) {
  const wideLayout = useWideTeamLayout();
  const t = useWorkLedgerMessage();

  if (!wideLayout) {
    return (
      <ol
        className="m-0 grid list-none gap-3 p-0"
        aria-label={t('manager.team.status.results.listLabel')}
      >
        {members.map((member, index) => (
          <li key={memberKey(member, index)}>
            <Panel as="article" className="grid min-w-0 gap-3" density="compact">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h3 className="m-0 text-lg font-bold">{member.displayName}</h3>
                <StatusBadge tone={availabilityTone(member.availability)}>
                  {t(STATUS_LABELS[member.availability])}
                </StatusBadge>
              </div>
              <dl className="m-0 grid gap-2 text-sm">
                <div className="grid gap-1">
                  <dt className="font-semibold text-[var(--wl-text-muted)]">
                    {t('manager.team.status.results.currentTeam')}
                  </dt>
                  <dd className="m-0">
                    {member.teamName ?? t('manager.team.status.results.noTeam')}
                  </dd>
                </div>
                <div className="grid gap-1">
                  <dt className="font-semibold text-[var(--wl-text-muted)]">
                    {t('manager.team.status.results.records')}
                  </dt>
                  <dd className="m-0">
                    <StatusBadge tone={member.hasUnresolvedRecords ? 'warning' : 'neutral'}>
                      {member.hasUnresolvedRecords
                        ? t('manager.team.status.results.openRecords')
                        : t('manager.team.status.results.noOpenRecords')}
                    </StatusBadge>
                  </dd>
                </div>
              </dl>
              <TeamMemberAction localDate={localDate} member={member} presentation="list" />
            </Panel>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <DataTable
      caption={t('manager.team.status.results.caption')}
      className="min-w-[50rem]"
      scrollLabel={t('manager.team.status.results.tableLabel')}
    >
      <thead>
        <tr>
          <th scope="col">{t('manager.team.status.column.employee')}</th>
          <th scope="col">{t('manager.team.status.column.currentTeam')}</th>
          <th scope="col">{t('manager.team.status.column.availability')}</th>
          <th scope="col">{t('manager.team.status.column.recordState')}</th>
          <th scope="col">{t('manager.team.status.column.nextStep')}</th>
        </tr>
      </thead>
      <tbody>
        {members.map((member, index) => (
          <tr key={memberKey(member, index)}>
            <th scope="row">{member.displayName}</th>
            <td>{member.teamName ?? t('manager.team.status.results.noTeam')}</td>
            <td>
              <StatusBadge tone={availabilityTone(member.availability)}>
                {t(STATUS_LABELS[member.availability])}
              </StatusBadge>
            </td>
            <td>
              <StatusBadge tone={member.hasUnresolvedRecords ? 'warning' : 'neutral'}>
                {member.hasUnresolvedRecords
                  ? t('manager.team.status.results.openRecords')
                  : t('manager.team.status.results.noOpenRecords')}
              </StatusBadge>
            </td>
            <td>
              <TeamMemberAction localDate={localDate} member={member} presentation="table" />
            </td>
          </tr>
        ))}
      </tbody>
    </DataTable>
  );
}

function TeamMemberAction({
  localDate,
  member,
  presentation,
}: Readonly<{
  localDate: string;
  member: TeamStatusMember;
  presentation: 'list' | 'table';
}>) {
  const t = useWorkLedgerMessage();
  if (member.hasUnresolvedRecords) {
    return (
      <Link
        aria-label={t('manager.team.status.action.openInboxLabel', {
          employee: member.displayName,
        })}
        className={buttonVariants({
          variant: 'secondary',
          className: presentation === 'list' ? 'w-full' : 'w-fit',
        })}
        to="/approvals?status=ALL&sort=EMPLOYEE&direction=ASC"
      >
        {t('manager.team.status.action.openInbox')}
      </Link>
    );
  }

  if (member.availability === 'UNAVAILABLE') {
    return (
      <Link
        aria-label={t('manager.team.status.action.viewCalendarLabel', {
          employee: member.displayName,
        })}
        className={buttonVariants({
          variant: 'secondary',
          className: presentation === 'list' ? 'w-full' : 'w-fit',
        })}
        to={`/team-calendar?month=${localDate.slice(0, 7)}`}
      >
        {t('manager.team.status.action.viewCalendar')}
      </Link>
    );
  }

  return (
    <span className="text-sm text-[var(--wl-text-muted)]">
      {t('manager.team.status.action.none')}
    </span>
  );
}

function TeamStatusLoading() {
  const t = useWorkLedgerMessage();
  return (
    <RouteState kind="loading" title={t('manager.team.status.loading.title')}>
      <p>{t('manager.team.status.loading.description')}</p>
    </RouteState>
  );
}

function TeamStatusError({ retry }: Readonly<{ retry: () => void }>) {
  const t = useWorkLedgerMessage();
  return (
    <Alert title={t('manager.team.status.error.title')} tone="danger">
      <p>{t('manager.team.status.error.description')}</p>
      <Button className="w-fit" type="button" variant="secondary" onPress={retry}>
        {t('shared.action.tryAgain')}
      </Button>
    </Alert>
  );
}

function TeamPermissionDenied() {
  const t = useWorkLedgerMessage();
  useBoundaryPresentation(t('shared.route.boundary.permissionDenied.title'));
  return (
    <section className="grid max-w-2xl gap-6">
      <PageHeader
        eyebrow={t('manager.team.status.permission.eyebrow')}
        title={t('shared.route.boundary.permissionDenied.title')}
        description={t('manager.team.status.permission.description')}
      />
      <Link className={buttonVariants({ variant: 'secondary' })} to="/">
        {t('shared.action.goHome')}
      </Link>
    </section>
  );
}

function memberKey(member: TeamStatus['members'][number], index: number): string {
  return `${member.displayName}-${member.teamName ?? 'none'}-${index.toString()}`;
}

function availabilityCount(data: TeamStatus, filter: TeamAvailabilityFilter): number {
  if (filter === 'ALL') return data.summary.total;
  if (filter === 'WORKING') return data.summary.working;
  if (filter === 'ON_BREAK') return data.summary.onBreak;
  if (filter === 'UNAVAILABLE') return data.summary.unavailable;
  return data.summary.offWork;
}

function filterMembers(
  members: TeamStatus['members'],
  view: TeamStatusView,
): TeamStatus['members'] {
  return members.filter(
    (member) =>
      (view.availability === 'ALL' || member.availability === view.availability) &&
      (view.records === 'ALL' || member.hasUnresolvedRecords),
  );
}

function isDefaultView(view: TeamStatusView): boolean {
  return (
    view.availability === DEFAULT_TEAM_STATUS_VIEW.availability &&
    view.records === DEFAULT_TEAM_STATUS_VIEW.records
  );
}

function teamResultsSummary(
  visible: number,
  total: number,
  view: TeamStatusView,
  t: ReturnType<typeof useWorkLedgerMessage>,
): string {
  if (isDefaultView(view)) {
    return t('manager.team.status.members.currentCount', { count: total });
  }
  const availability =
    view.availability === 'ALL'
      ? t('manager.team.status.filter.allAvailability')
      : t(STATUS_LABELS[view.availability]).toLocaleLowerCase();
  const records = view.records === 'OPEN' ? t('manager.team.status.filter.withOpenRecords') : '';
  return t('manager.team.status.members.filteredCount', { availability, records, total, visible });
}

function availabilityTone(state: TeamAvailabilityState): NonNullable<StatusBadgeProps['tone']> {
  if (state === 'WORKING') return 'success';
  if (state === 'ON_BREAK') return 'info';
  if (state === 'UNAVAILABLE') return 'warning';
  return 'neutral';
}

function useWideTeamLayout(): boolean {
  const [wide, setWide] = useState(readWideTeamLayout);

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

function readWideTeamLayout(): boolean {
  return typeof window.matchMedia !== 'function' || window.matchMedia('(min-width: 72rem)').matches;
}

function isAuthenticationError(error: unknown): error is ApiClientError {
  return (
    error instanceof ApiClientError &&
    ['AUTH_REQUIRED', 'AUTH_SESSION_EXPIRED'].includes(error.code)
  );
}
