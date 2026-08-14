import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router';

import type { TeamAvailabilityState, TeamStatus } from '@workledger/contracts';
import { Button, buttonVariants } from '@workledger/ui';

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
        description="See current attendance and neutral availability for your current direct reports. Absence types and private context are never shown here."
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
      <section aria-labelledby="team-summary-heading" className="grid gap-4">
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
              : `Status current for ${data.summary.total.toString()} authorized team member${data.summary.total === 1 ? '' : 's'}.`}
          </p>
        </div>
        <dl className="wl-team-summary m-0 grid gap-3" aria-label="Team status totals">
          <SummaryItem label="Working" value={data.summary.working} />
          <SummaryItem label="On break" value={data.summary.onBreak} />
          <SummaryItem label="Unavailable today" value={data.summary.unavailable} />
          <SummaryItem label="Not working" value={data.summary.offWork} />
          <SummaryItem label="Unresolved records" value={data.summary.unresolved} />
        </dl>
      </section>
      <section aria-labelledby="team-members-heading" className="grid gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="team-members-heading" className="m-0 text-xl font-bold">
              Current direct reports
            </h2>
            <p className="m-0 mt-1 text-sm text-[var(--wl-text-muted)]">
              {data.summary.total} authorized team member{data.summary.total === 1 ? '' : 's'}.
            </p>
          </div>
          {data.summary.unresolved > 0 ? (
            <Link className={buttonVariants({ variant: 'secondary' })} to="/approvals">
              Open approval inbox
            </Link>
          ) : null}
        </div>
        {data.members.length === 0 ? (
          <p className="wl-alert m-0 rounded-xl border p-4">
            You have no current direct reports to show.
          </p>
        ) : (
          <TeamMembers members={data.members} />
        )}
      </section>
    </>
  );
}

function SummaryItem({ label, value }: Readonly<{ label: string; value: number }>) {
  return (
    <div className="rounded-xl border border-[var(--wl-border)] bg-[var(--wl-surface-raised)] p-4">
      <dt className="text-sm font-semibold text-[var(--wl-text-muted)]">{label}</dt>
      <dd className="m-0 mt-1 text-2xl font-bold">{value}</dd>
    </div>
  );
}

function TeamMembers({ members }: Readonly<{ members: TeamStatus['members'] }>) {
  return (
    <div
      className="overflow-x-auto rounded-xl border border-[var(--wl-border)]"
      role="region"
      aria-label="Scrollable team status"
      tabIndex={0}
    >
      <table className="w-full min-w-[42rem] border-collapse text-left">
        <caption className="p-3 text-left text-sm text-[var(--wl-text-muted)]">
          Privacy-safe current status for authorized direct reports.
        </caption>
        <thead>
          <tr className="border-y border-[var(--wl-border)] text-sm">
            <th scope="col" className="p-3">
              Employee
            </th>
            <th scope="col" className="p-3">
              Current team
            </th>
            <th scope="col" className="p-3">
              Availability
            </th>
            <th scope="col" className="p-3">
              Records
            </th>
          </tr>
        </thead>
        <tbody>
          {members.map((member, index) => (
            <tr key={memberKey(member, index)} className="border-b border-[var(--wl-border)]">
              <th scope="row" className="p-3 font-semibold">
                {member.displayName}
              </th>
              <td className="p-3">{member.teamName ?? 'No current team'}</td>
              <td className="p-3 font-semibold">{STATUS_LABELS[member.availability]}</td>
              <td className="p-3">
                {member.hasUnresolvedRecords ? 'Unresolved record' : 'No unresolved records'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TeamStatusLoading() {
  return (
    <div className="wl-panel grid gap-2" aria-busy="true">
      <h2 className="m-0 text-xl font-bold">Loading team status</h2>
      <p className="m-0 text-[var(--wl-text-muted)]">Checking current authorized availability…</p>
    </div>
  );
}

function TeamStatusError({ retry }: Readonly<{ retry: () => void }>) {
  return (
    <div className="wl-alert wl-alert-error grid gap-3 rounded-xl border p-4" role="alert">
      <h2 className="m-0 text-xl font-bold">Team status is unavailable</h2>
      <p className="m-0">
        No restricted team details were displayed. Try loading the current authorized view again.
      </p>
      <Button className="w-fit" type="button" variant="secondary" onPress={retry}>
        Try again
      </Button>
    </div>
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

function isAuthenticationError(error: unknown): error is ApiClientError {
  return (
    error instanceof ApiClientError &&
    ['AUTH_REQUIRED', 'AUTH_SESSION_EXPIRED'].includes(error.code)
  );
}
