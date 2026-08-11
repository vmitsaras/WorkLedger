import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';

import type {
  AttendanceCommand,
  AttendanceState,
  CalculationBlockerCode,
  CalculationWarningCode,
  TodayAttendance,
  TodayAttendanceEstimate,
  TodayTimelineEvent,
} from '@workledger/contracts';
import { Button } from '@workledger/ui';

import { ApiClientError, clearSessionMemory } from '../app/api-client.js';
import { todayAttendanceQuery } from '../app/query.js';
import { setPendingSignInNotice } from '../app/session-notice.js';
import { PageHeader } from '../components/page-header.js';

const STATE_LABELS: Readonly<Record<AttendanceState, string>> = {
  OFF_WORK: 'Off work',
  ON_BREAK: 'On break',
  WORKING: 'Working',
};

const ACTION_LABELS: Readonly<Record<AttendanceCommand, string>> = {
  CLOCK_IN: 'Clock in',
  CLOCK_OUT: 'Clock out',
  RESUME: 'Resume work',
  START_BREAK: 'Start break',
};

const EVENT_LABELS: Readonly<Record<TodayTimelineEvent['type'], string>> = {
  BREAK_END: 'Break ended',
  BREAK_START: 'Break started',
  CLOCK_IN: 'Clocked in',
  CLOCK_OUT: 'Clocked out',
};

const WARNING_MESSAGES: Readonly<Record<CalculationWarningCode, string>> = {
  FLEX_NEGATIVE_THRESHOLD_EXCEEDED:
    'Today’s estimated balance is below your configured flexible-time warning threshold.',
  FLEX_POSITIVE_THRESHOLD_EXCEEDED:
    'Today’s estimated balance is above your configured flexible-time warning threshold.',
  WORK_DURING_ABSENCE: 'Recorded work overlaps an absence credited for today.',
  WORK_ON_HOLIDAY: 'Work is recorded on a public holiday.',
  WORK_ON_ZERO_EXPECTED_DAY: 'Work is recorded on a day with no expected working time.',
};

const BLOCKER_MESSAGES: Readonly<Record<CalculationBlockerCode, string>> = {
  ABSENCE_APPROVAL_PENDING: 'An absence affecting today is awaiting approval.',
  ATTENDANCE_INCOMPLETE: 'Today’s attendance source is incomplete.',
  ATTENDANCE_INVALID_EVENT_ORDER: 'Today’s attendance events are not in a valid order.',
  ATTENDANCE_INVALID_EVENT_PRECISION: 'An attendance event is not aligned to a whole minute.',
  ATTENDANCE_OVERLAP: 'Today’s attendance contains overlapping work intervals.',
  CORRECTION_UNRESOLVED: 'A correction affecting today is still unresolved.',
  LEDGER_SOURCE_MISMATCH: 'The calculation source does not match its recorded ledger entry.',
  POLICY_ASSIGNMENT_OVERLAP: 'More than one time policy is assigned for today.',
  POLICY_CONFIGURATION_INVALID: 'Today’s assigned time policy is not valid.',
  POLICY_NOT_ASSIGNED: 'No time policy is assigned for today.',
  SCHEDULE_ASSIGNMENT_OVERLAP: 'More than one work schedule is assigned for today.',
  SCHEDULE_NOT_ASSIGNED: 'No work schedule is assigned for today.',
};

export function TodayPage() {
  const query = useQuery(todayAttendanceQuery());
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const authenticationError = isAuthenticationError(query.error);

  useEffect(() => {
    if (!authenticationError) return;
    clearSessionMemory();
    queryClient.clear();
    if (query.error instanceof ApiClientError && query.error.code === 'AUTH_SESSION_EXPIRED') {
      setPendingSignInNotice('SESSION_EXPIRED');
    }
    void navigate('/sign-in', { replace: true });
  }, [authenticationError, navigate, query.error, queryClient]);

  if (query.isPending || authenticationError) return renderTodayLoading();
  if (query.isError) {
    return renderTodayLoadError({ error: query.error, retry: () => void query.refetch() });
  }

  return renderTodayReady({ today: query.data, updating: query.isFetching });
}

function renderTodayLoading() {
  return (
    <section className="grid max-w-3xl gap-6" aria-busy="true">
      <PageHeader
        eyebrow="Attendance"
        title="Today"
        description="Loading your current attendance state and calculation…"
      />
      <div
        aria-label="Loading today’s attendance"
        role="progressbar"
        className="h-2 overflow-hidden rounded-full bg-[var(--wl-surface-subtle)]"
      >
        <span className="block h-full w-1/3 rounded-full bg-[var(--wl-action-primary)]" />
      </div>
    </section>
  );
}

function renderTodayLoadError({ error, retry }: Readonly<{ error: unknown; retry: () => void }>) {
  const requestId = error instanceof ApiClientError ? error.requestId : undefined;
  return (
    <section className="grid max-w-3xl gap-6">
      <PageHeader
        eyebrow="Attendance"
        title="Today"
        description="Your attendance information could not be loaded. No clock action was submitted."
      />
      <div className="wl-alert wl-alert-error grid gap-3 rounded-xl border p-4" role="alert">
        <div className="grid gap-1">
          <h2 className="m-0 text-lg font-bold">Today is temporarily unavailable</h2>
          <p className="m-0 text-sm leading-6">
            Try again. If the problem continues, share the request reference with your
            administrator.
          </p>
          {requestId === undefined ? null : (
            <p className="m-0 break-all text-xs">Request reference: {requestId}</p>
          )}
        </div>
        <div>
          <Button variant="secondary" onPress={retry}>
            Try again
          </Button>
        </div>
      </div>
    </section>
  );
}

function renderTodayReady({
  today,
  updating,
}: Readonly<{ today: TodayAttendance; updating: boolean }>) {
  const attendance = today.attendance;
  const calculation = today.calculation;
  const activeDescription =
    attendance.activeSince === null
      ? 'No active attendance interval.'
      : `${STATE_LABELS[attendance.state]} since ${formatTime(attendance.activeSince, today.timeZone)}.`;

  return (
    <section className="grid gap-8">
      <PageHeader
        eyebrow={formatLocalDate(today.localDate)}
        title="Today"
        description="Current attendance and an explainable estimate for your organization-local day."
      >
        {updating ? (
          <p className="m-0 text-sm font-semibold text-[var(--wl-text-muted)]">Updating…</p>
        ) : (
          <p className="m-0 text-sm text-[var(--wl-text-muted)]">
            Estimate updated {formatTime(today.asOf, today.timeZone)}
          </p>
        )}
      </PageHeader>

      <div className="wl-today-grid grid gap-6">
        <section
          className="wl-panel grid content-start gap-5"
          aria-labelledby="current-status-title"
        >
          <div className="grid gap-1">
            <p className="m-0 text-sm font-bold uppercase tracking-[0.1em] text-[var(--wl-text-muted)]">
              Current status
            </p>
            <h2 id="current-status-title" className="m-0 text-3xl font-bold">
              {STATE_LABELS[attendance.state]}
            </h2>
            <p className="m-0 text-sm leading-6 text-[var(--wl-text-muted)]">{activeDescription}</p>
          </div>
          <div className="grid gap-1 border-t border-[var(--wl-border)] pt-4">
            <h3 className="m-0 text-sm font-bold">Available next</h3>
            <p className="m-0 text-sm leading-6 text-[var(--wl-text-muted)]">
              {attendance.validActions.map((action) => ACTION_LABELS[action]).join(' or ')}. Clock
              controls arrive in the next attendance slice.
            </p>
          </div>
        </section>

        <section className="wl-panel grid content-start gap-5" aria-labelledby="calculation-title">
          <div className="grid gap-1">
            <p className="m-0 text-sm font-bold uppercase tracking-[0.1em] text-[var(--wl-text-muted)]">
              {calculation.status === 'PROVISIONAL'
                ? 'Provisional estimate'
                : 'Calculation incomplete'}
            </p>
            <h2 id="calculation-title" className="m-0 text-3xl font-bold">
              {calculation.estimate === null
                ? 'Not available'
                : formatMinutes(calculation.estimate.balanceMinutes)}
            </h2>
            <p className="m-0 text-sm leading-6 text-[var(--wl-text-muted)]">
              {calculation.estimate === null
                ? 'WorkLedger cannot produce a reliable estimate until the items below are resolved.'
                : 'Estimated flexible-time balance for today. It is not a locked or final record.'}
            </p>
          </div>
          {calculation.holidayName === null ? null : (
            <p className="m-0 rounded-lg bg-[var(--wl-surface-subtle)] p-3 text-sm font-semibold">
              Public holiday: {calculation.holidayName}
            </p>
          )}
        </section>
      </div>

      <CalculationMessages blockers={calculation.blockers} warnings={calculation.warnings} />

      {calculation.estimate === null ? null : (
        <CalculationBreakdown estimate={calculation.estimate} />
      )}

      <Timeline
        events={today.timeline}
        timeZone={today.timeZone}
        truncated={today.timelineTruncated}
      />
    </section>
  );
}

function CalculationMessages({
  blockers,
  warnings,
}: Readonly<{
  blockers: readonly CalculationBlockerCode[];
  warnings: readonly CalculationWarningCode[];
}>) {
  if (blockers.length === 0 && warnings.length === 0) return null;
  return (
    <section className="grid gap-4" aria-labelledby="today-attention-title">
      <h2 id="today-attention-title" className="m-0 text-2xl font-bold">
        Needs attention
      </h2>
      {blockers.length === 0 ? null : (
        <div className="wl-alert wl-alert-error rounded-xl border p-4">
          <h3 className="m-0 text-lg font-bold">Calculation blockers</h3>
          <ul className="mb-0 mt-2 grid gap-2 pl-5">
            {blockers.map((blocker) => (
              <li key={blocker}>{BLOCKER_MESSAGES[blocker]}</li>
            ))}
          </ul>
        </div>
      )}
      {warnings.length === 0 ? null : (
        <div className="wl-alert rounded-xl border p-4">
          <h3 className="m-0 text-lg font-bold">Warnings</h3>
          <ul className="mb-0 mt-2 grid gap-2 pl-5">
            {warnings.map((warning) => (
              <li key={warning}>{WARNING_MESSAGES[warning]}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function CalculationBreakdown({ estimate }: Readonly<{ estimate: TodayAttendanceEstimate }>) {
  const entries: readonly (readonly [string, number])[] = [
    ['Scheduled time', estimate.scheduledMinutes],
    ['Public-holiday reduction', -estimate.holidayExpectedReductionMinutes],
    ['Absence reduction', -estimate.absenceExpectedReductionMinutes],
    ['Expected time', estimate.expectedMinutes],
    ['Worked time', estimate.workedMinutes],
    ['Break time', estimate.breakMinutes],
    ['Absence credit', estimate.absenceCreditMinutes],
    ['Approved adjustments', estimate.adjustmentMinutes],
    ['Credited time', estimate.creditedMinutes],
    ['Estimated balance', estimate.balanceMinutes],
  ];
  return (
    <section className="grid gap-4" aria-labelledby="calculation-breakdown-title">
      <div className="grid gap-1">
        <h2 id="calculation-breakdown-title" className="m-0 text-2xl font-bold">
          Calculation breakdown
        </h2>
        <p className="m-0 max-w-2xl text-sm leading-6 text-[var(--wl-text-muted)]">
          Every value is shown in hours and minutes. Reductions lower expected time; credits and
          adjustments affect credited time.
        </p>
      </div>
      <dl className="wl-panel wl-calculation-grid m-0 grid gap-x-8 gap-y-0">
        {entries.map(([term, minutes]) => (
          <div
            key={term}
            className="flex min-w-0 items-baseline justify-between gap-4 border-b border-[var(--wl-border)] py-3 last:border-0"
          >
            <dt className="text-sm font-semibold text-[var(--wl-text-muted)]">{term}</dt>
            <dd className="m-0 shrink-0 font-bold tabular-nums">{formatMinutes(minutes)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Timeline({
  events,
  timeZone,
  truncated,
}: Readonly<{
  events: readonly TodayTimelineEvent[];
  timeZone: string;
  truncated: boolean;
}>) {
  return (
    <section className="grid gap-4" aria-labelledby="today-timeline-title">
      <div className="grid gap-1">
        <h2 id="today-timeline-title" className="m-0 text-2xl font-bold">
          Today’s timeline
        </h2>
        <p className="m-0 text-sm leading-6 text-[var(--wl-text-muted)]">
          Immutable attendance events in recorded order.
        </p>
      </div>
      {events.length === 0 ? (
        <div className="wl-panel">
          <p className="m-0">No attendance events have been recorded today.</p>
        </div>
      ) : (
        <ol className="m-0 grid list-none gap-3 p-0">
          {events.map((event) => (
            <li key={event.id} className="wl-panel flex items-baseline justify-between gap-4 py-4">
              <span className="font-semibold">{EVENT_LABELS[event.type]}</span>
              <time className="shrink-0 tabular-nums" dateTime={event.occurredAt}>
                {formatTime(event.occurredAt, timeZone)}
              </time>
            </li>
          ))}
        </ol>
      )}
      {truncated ? (
        <p className="wl-alert wl-alert-error m-0 rounded-xl border p-4 text-sm">
          The timeline is too long to show completely. The calculation is marked incomplete.
        </p>
      ) : null}
    </section>
  );
}

function isAuthenticationError(error: unknown): boolean {
  return (
    error instanceof ApiClientError &&
    ['AUTH_REQUIRED', 'AUTH_SESSION_EXPIRED'].includes(error.code)
  );
}

function formatLocalDate(localDate: string): string {
  const [year, month, day] = localDate.split('-').map(Number);
  if (year === undefined || month === undefined || day === undefined) return localDate;
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
}

function formatTime(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  }).format(new Date(value));
}

function formatMinutes(minutes: number): string {
  const sign = minutes < 0 ? '−' : minutes > 0 ? '+' : '';
  const absolute = Math.abs(minutes);
  const hours = Math.floor(absolute / 60);
  const remaining = absolute % 60;
  return `${sign}${hours}h ${remaining.toString().padStart(2, '0')}m`;
}
