import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';

import type { TeamAvailabilityState, TeamStatus } from '@workledger/contracts';
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
import { PageHeader } from '../components/page-header.js';

const STATUS_LABELS: Readonly<Record<TeamAvailabilityState, string>> = Object.freeze({
  OFF_WORK: 'Not working',
  ON_BREAK: 'On break',
  UNAVAILABLE: 'Unavailable today',
  WORKING: 'Working',
});

export function TeamStatusPage() {
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
        eyebrow="Manager workspace"
        title="Team status"
        description="See who is working now, who is unavailable, and which current direct reports have records that need attention."
      />
      {query.isPending ? (
        <TeamStatusLoading />
      ) : query.isError || query.data === undefined ? (
        <TeamStatusError retry={() => void query.refetch()} />
      ) : (
        <TeamStatusContent data={query.data} refreshing={query.isFetching} />
      )}
    </section>
  );
}

function TeamStatusContent({
  data,
  refreshing,
}: Readonly<{ data: TeamStatus; refreshing: boolean }>) {
  return (
    <>
      <Panel aria-labelledby="team-summary-heading" className="grid gap-4" density="compact">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="team-summary-heading" className="m-0 text-xl font-bold">
              Current overview
            </h2>
            <p className="m-0 mt-1 text-sm text-[var(--wl-text-muted)]">
              As of {formatTime(data.asOf, data.timeZone)} on {formatLocalDate(data.localDate)} (
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
              : `Status current for ${data.summary.total.toString()} team member${data.summary.total === 1 ? '' : 's'}.`}
          </p>
        </div>
        <dl className="wl-team-summary m-0 grid gap-3" aria-label="Team status totals">
          <SummaryItem label="Working" value={data.summary.working} />
          <SummaryItem label="On break" value={data.summary.onBreak} />
          <SummaryItem label="Unavailable today" value={data.summary.unavailable} />
          <SummaryItem label="Not working" value={data.summary.offWork} />
          <SummaryItem label="Unresolved records" value={data.summary.unresolved} />
        </dl>
      </Panel>
      <section aria-labelledby="team-members-heading" className="grid gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="team-members-heading" className="m-0 text-xl font-bold">
              Current direct reports
            </h2>
            <p className="m-0 mt-1 text-sm text-[var(--wl-text-muted)]">
              {data.summary.total} team member{data.summary.total === 1 ? '' : 's'}.
            </p>
          </div>
          {data.summary.unresolved > 0 ? (
            <Link className={buttonVariants({ variant: 'secondary' })} to="/approvals">
              Open approval inbox
            </Link>
          ) : null}
        </div>
        {data.members.length === 0 ? (
          <RouteState kind="empty" title="No current direct reports">
            <p>You have no current direct reports to show.</p>
          </RouteState>
        ) : (
          <TeamMembers members={data.members} />
        )}
      </section>
    </>
  );
}

function SummaryItem({ label, value }: Readonly<{ label: string; value: number }>) {
  return (
    <div className="grid gap-1 border-l border-[var(--wl-border-strong)] pl-3">
      <dt className="text-sm font-semibold text-[var(--wl-text-muted)]">{label}</dt>
      <dd className="m-0 text-2xl font-bold tabular-nums">{value}</dd>
    </div>
  );
}

function TeamMembers({ members }: Readonly<{ members: TeamStatus['members'] }>) {
  const wideLayout = useWideTeamLayout();

  if (!wideLayout) {
    return (
      <ol className="m-0 grid list-none gap-3 p-0" aria-label="Current direct reports">
        {members.map((member, index) => (
          <li key={memberKey(member, index)}>
            <Panel as="article" className="grid gap-3" density="compact">
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
                      {member.hasUnresolvedRecords ? 'Unresolved record' : 'No unresolved records'}
                    </StatusBadge>
                  </dd>
                </div>
              </dl>
            </Panel>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <DataTable
      caption="Current availability and unresolved records for direct reports."
      className="min-w-[42rem]"
      scrollHint="Scroll horizontally if the full team status does not fit."
      scrollLabel="Team status table"
    >
      <thead>
        <tr>
          <th scope="col">Employee</th>
          <th scope="col">Current team</th>
          <th scope="col">Availability</th>
          <th scope="col">Records</th>
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
                {member.hasUnresolvedRecords ? 'Unresolved record' : 'No unresolved records'}
              </StatusBadge>
            </td>
          </tr>
        ))}
      </tbody>
    </DataTable>
  );
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
    const media = window.matchMedia('(min-width: 48rem)');
    const update = () => setWide(media.matches);
    media.addEventListener('change', update);
    update();
    return () => media.removeEventListener('change', update);
  }, []);

  return wide;
}

function readWideTeamLayout(): boolean {
  return typeof window.matchMedia !== 'function' || window.matchMedia('(min-width: 48rem)').matches;
}

function isAuthenticationError(error: unknown): error is ApiClientError {
  return (
    error instanceof ApiClientError &&
    ['AUTH_REQUIRED', 'AUTH_SESSION_EXPIRED'].includes(error.code)
  );
}
