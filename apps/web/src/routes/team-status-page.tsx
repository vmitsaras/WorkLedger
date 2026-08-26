import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useLoaderData, useNavigate, useSearchParams } from 'react-router';

import type { TeamAvailabilityState, TeamStatus, TeamStatusMember } from '@workledger/contracts';
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
import { formatLocalDate, formatTime } from '../app/date-time-format.js';
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

const STATUS_LABELS: Readonly<Record<TeamAvailabilityState, string>> = Object.freeze({
  OFF_WORK: 'Not working now',
  ON_BREAK: 'On break',
  UNAVAILABLE: 'Unavailable today',
  WORKING: 'Working now',
});

const AVAILABILITY_FILTERS: readonly Readonly<{
  label: string;
  value: TeamAvailabilityFilter;
}>[] = [
  { label: 'All direct reports', value: 'ALL' },
  { label: STATUS_LABELS.WORKING, value: 'WORKING' },
  { label: STATUS_LABELS.ON_BREAK, value: 'ON_BREAK' },
  { label: STATUS_LABELS.UNAVAILABLE, value: 'UNAVAILABLE' },
  { label: STATUS_LABELS.OFF_WORK, value: 'OFF_WORK' },
];

export function TeamStatusPage() {
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
        eyebrow="Team workspace"
        title="Team status"
        description="Check current availability, focus the list, and move directly to team work that needs follow-up."
      >
        <nav aria-label="Team workspace shortcuts" className="flex flex-wrap gap-2">
          <Link className={buttonVariants({ variant: 'secondary' })} to="/approvals">
            Approval inbox
          </Link>
          <Link className={buttonVariants({ variant: 'quiet' })} to="/team-calendar">
            Team calendar
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
  const members = filterMembers(data.members, view);
  const filtered = !isDefaultView(view);

  return (
    <>
      <Panel aria-labelledby="team-summary-heading" className="wl-team-overview" density="compact">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="team-summary-heading" className="m-0 text-xl font-bold">
              Current overview
            </h2>
            <p className="m-0 mt-1 text-sm text-[var(--wl-text-muted)]">
              {formatLocalDate(data.localDate)}, as of {formatTime(data.asOf, data.timeZone)} (
              {data.timeZone}).
            </p>
          </div>
          <p
            className="m-0 min-h-6 text-sm text-[var(--wl-text-muted)]"
            role="status"
            aria-label="Team refresh status"
            aria-live="polite"
            aria-atomic="true"
          >
            {refreshing
              ? 'Refreshing status…'
              : `Status current for ${data.summary.total.toString()} direct report${data.summary.total === 1 ? '' : 's'}.`}
          </p>
        </div>
        <div className="grid gap-3">
          <p
            id="team-availability-filter-label"
            className="m-0 text-sm font-semibold text-[var(--wl-text-muted)]"
          >
            Filter by current availability
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
                label={filter.label}
                pressed={view.availability === filter.value}
                routeFocusKey={`team-availability-${filter.value}`}
                onPress={() => onViewChange({ ...view, availability: filter.value })}
              />
            ))}
          </div>
        </div>
        <div className="grid gap-2 border-t border-[var(--wl-border)] pt-4">
          <div aria-label="Record filters" className="wl-team-overview__record-filter" role="group">
            <OverviewFilter
              count={data.summary.unresolved}
              label="People with open records"
              pressed={view.records === 'OPEN'}
              routeFocusKey="team-records-OPEN"
              onPress={() =>
                onViewChange({ ...view, records: view.records === 'OPEN' ? 'ALL' : 'OPEN' })
              }
            />
          </div>
          <p className="m-0 max-w-2xl text-sm text-[var(--wl-text-muted)]">
            Open records can include work that needs your review, an employee response, or final
            application. The label does not expose the workflow or absence type.
          </p>
        </div>
      </Panel>
      <section aria-labelledby="team-members-heading" className="grid gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="team-members-heading" className="m-0 text-xl font-bold">
              Team members
            </h2>
            <p
              className="m-0 mt-1 text-sm text-[var(--wl-text-muted)]"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              {teamResultsSummary(members.length, data.summary.total, view)}
            </p>
          </div>
          {filtered && members.length > 0 ? (
            <Button
              className="w-fit"
              type="button"
              variant="quiet"
              onPress={() => onViewChange(DEFAULT_TEAM_STATUS_VIEW)}
            >
              Show all direct reports
            </Button>
          ) : null}
        </div>
        {data.members.length === 0 ? (
          <RouteState kind="empty" title="No current direct reports">
            <p>You have no current direct reports to show.</p>
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
                Show all direct reports
              </Button>
            }
            kind="empty"
            title="No team members match this view"
          >
            <p>Change the overview filters to see other current direct reports.</p>
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
  return (
    <Button
      aria-label={`${label}: ${count.toString()}`}
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

  if (!wideLayout) {
    return (
      <ol className="m-0 grid list-none gap-3 p-0" aria-label="Team status results">
        {members.map((member, index) => (
          <li key={memberKey(member, index)}>
            <Panel as="article" className="grid min-w-0 gap-3" density="compact">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h3 className="m-0 text-lg font-bold">{member.displayName}</h3>
                <StatusBadge tone={availabilityTone(member.availability)}>
                  {STATUS_LABELS[member.availability]}
                </StatusBadge>
              </div>
              <dl className="m-0 grid gap-2 text-sm">
                <div className="grid gap-1">
                  <dt className="font-semibold text-[var(--wl-text-muted)]">Current team</dt>
                  <dd className="m-0">{member.teamName ?? 'No current team'}</dd>
                </div>
                <div className="grid gap-1">
                  <dt className="font-semibold text-[var(--wl-text-muted)]">Records</dt>
                  <dd className="m-0">
                    <StatusBadge tone={member.hasUnresolvedRecords ? 'warning' : 'neutral'}>
                      {member.hasUnresolvedRecords ? 'Open records' : 'No open records'}
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
      caption="Current availability, open record state, and next steps for direct reports."
      className="min-w-[50rem]"
      scrollLabel="Team status table"
    >
      <thead>
        <tr>
          <th scope="col">Employee</th>
          <th scope="col">Current team</th>
          <th scope="col">Availability</th>
          <th scope="col">Record state</th>
          <th scope="col">Next step</th>
        </tr>
      </thead>
      <tbody>
        {members.map((member, index) => (
          <tr key={memberKey(member, index)}>
            <th scope="row">{member.displayName}</th>
            <td>{member.teamName ?? 'No current team'}</td>
            <td>
              <StatusBadge tone={availabilityTone(member.availability)}>
                {STATUS_LABELS[member.availability]}
              </StatusBadge>
            </td>
            <td>
              <StatusBadge tone={member.hasUnresolvedRecords ? 'warning' : 'neutral'}>
                {member.hasUnresolvedRecords ? 'Open records' : 'No open records'}
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
  if (member.hasUnresolvedRecords) {
    return (
      <Link
        aria-label={`Open approval inbox to find open records for ${member.displayName}`}
        className={buttonVariants({
          variant: 'secondary',
          className: presentation === 'list' ? 'w-full' : 'w-fit',
        })}
        to="/approvals?status=ALL&sort=EMPLOYEE&direction=ASC"
      >
        Open inbox
      </Link>
    );
  }

  if (member.availability === 'UNAVAILABLE') {
    return (
      <Link
        aria-label={`View team calendar for ${member.displayName}`}
        className={buttonVariants({
          variant: 'secondary',
          className: presentation === 'list' ? 'w-full' : 'w-fit',
        })}
        to={`/team-calendar?month=${localDate.slice(0, 7)}`}
      >
        View calendar
      </Link>
    );
  }

  return <span className="text-sm text-[var(--wl-text-muted)]">No follow-up</span>;
}

function TeamStatusLoading() {
  return (
    <RouteState kind="loading" title="Loading team status">
      <p>Preparing current availability and unresolved record counts.</p>
    </RouteState>
  );
}

function TeamStatusError({ retry }: Readonly<{ retry: () => void }>) {
  return (
    <Alert title="Team status is unavailable" tone="danger">
      <p>Team status could not be loaded. Check your connection and try again.</p>
      <Button className="w-fit" type="button" variant="secondary" onPress={retry}>
        Try again
      </Button>
    </Alert>
  );
}

function TeamPermissionDenied() {
  useBoundaryPresentation('Permission denied');
  return (
    <section className="grid max-w-2xl gap-6">
      <PageHeader
        eyebrow="Route status"
        title="Permission denied"
        description="Your current account cannot view team status. No employee availability was disclosed."
      />
      <Link className={buttonVariants({ variant: 'secondary' })} to="/">
        Go to my home
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

function teamResultsSummary(visible: number, total: number, view: TeamStatusView): string {
  if (isDefaultView(view)) {
    return `${total.toString()} current direct report${total === 1 ? '' : 's'}.`;
  }
  const availability =
    view.availability === 'ALL'
      ? 'all availability states'
      : STATUS_LABELS[view.availability].toLowerCase();
  const records = view.records === 'OPEN' ? ' with open records' : '';
  return `Showing ${visible.toString()} of ${total.toString()} direct reports: ${availability}${records}.`;
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
