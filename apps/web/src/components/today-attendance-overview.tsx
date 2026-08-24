import type { RefObject } from 'react';

import type { AttendanceCommand, AttendanceState, TodayAttendance } from '@workledger/contracts';
import { Panel, StatusBadge } from '@workledger/ui';

import { formatDuration, formatTime } from '../app/date-time-format.js';
import type { AttendanceCommandIntent } from '../app/api-client.js';
import {
  AttendanceRecovery,
  TodayAttendanceControls,
  type AttendanceRecoveryMode,
} from './today-attendance-controls.js';

const STATE_LABELS: Readonly<Record<AttendanceState, string>> = {
  OFF_WORK: 'Off work',
  ON_BREAK: 'On break',
  WORKING: 'Working',
};

export type TodayAttendanceFeedback = Readonly<{
  command: AttendanceCommand;
  intentKey: string;
  kind: 'ERROR' | 'INFO' | 'SUCCESS';
  message: string;
  requestId?: string;
  resultingRevision?: number;
  shouldFocusStatus: boolean;
}>;

export function TodayAttendanceOverview({
  controlsDisabled,
  controlsRef,
  clockOutConfirmationOpen,
  dependencyError,
  feedback,
  onActionFocus,
  onAttendanceCommand,
  pendingIntent,
  recoveryMode,
  retryToday,
  setClockOutConfirmationOpen,
  statusHeadingRef,
  today,
}: Readonly<{
  controlsDisabled: boolean;
  controlsRef: RefObject<HTMLDivElement | null>;
  clockOutConfirmationOpen: boolean;
  dependencyError: unknown;
  feedback: TodayAttendanceFeedback | null;
  onActionFocus: (command: AttendanceCommand) => void;
  onAttendanceCommand: (
    command: AttendanceCommand,
    expectedAttendanceRevision: number,
    confirmActiveBreak?: boolean,
  ) => void;
  pendingIntent: AttendanceCommandIntent | null;
  recoveryMode: AttendanceRecoveryMode;
  retryToday: () => void;
  setClockOutConfirmationOpen: (isOpen: boolean) => void;
  statusHeadingRef: RefObject<HTMLHeadingElement | null>;
  today: TodayAttendance;
}>) {
  const { attendance, calculation } = today;
  const activeDescription =
    attendance.activeSince === null
      ? 'No active work session.'
      : `Since ${formatTime(attendance.activeSince, today.timeZone)}.`;
  const estimate = calculation.estimate;

  return (
    <Panel aria-labelledby="current-status-title" density="comfortable">
      <div className="wl-today-grid grid gap-6">
        <div className="grid min-w-0 content-start gap-5">
          <div className="grid gap-1">
            <p className="m-0 text-sm font-bold uppercase tracking-[0.1em] text-[var(--wl-text-muted)]">
              Current status
            </p>
            <h2
              ref={statusHeadingRef}
              id="current-status-title"
              className="m-0 text-3xl font-bold outline-none"
              tabIndex={-1}
            >
              {STATE_LABELS[attendance.state]}
            </h2>
            <p className="m-0 text-sm leading-6 text-[var(--wl-text-muted)]">{activeDescription}</p>
          </div>

          <div className="grid gap-3 border-t border-[var(--wl-border)] pt-4">
            <div className="grid gap-1">
              <h3 className="m-0 text-lg font-bold">Next action</h3>
              <p className="m-0 text-sm leading-6 text-[var(--wl-text-muted)]">
                Only actions valid for your current attendance state are available.
              </p>
            </div>
            <TodayAttendanceControls
              attendance={attendance}
              controlsDisabled={controlsDisabled}
              controlsRef={controlsRef}
              clockOutConfirmationOpen={clockOutConfirmationOpen}
              onActionFocus={onActionFocus}
              onAttendanceCommand={onAttendanceCommand}
              pendingIntent={pendingIntent}
              setClockOutConfirmationOpen={setClockOutConfirmationOpen}
            />
            <AttendanceRecovery error={dependencyError} mode={recoveryMode} retry={retryToday} />
            {feedback === null ? null : (
              <div
                className={`wl-alert ${feedbackToneClass(feedback.kind)} grid gap-1`}
                role={feedback.kind === 'ERROR' && recoveryMode === null ? 'alert' : 'status'}
              >
                <p className="m-0 text-sm font-semibold">{feedback.message}</p>
                {feedback.requestId === undefined ? null : (
                  <p className="m-0 break-all text-xs">Request reference: {feedback.requestId}</p>
                )}
              </div>
            )}
          </div>
        </div>

        <section className="grid min-w-0 content-start gap-4" aria-labelledby="calculation-title">
          <StatusBadge tone={calculation.status === 'PROVISIONAL' ? 'info' : 'danger'}>
            {calculation.status === 'PROVISIONAL'
              ? 'Provisional estimate'
              : 'Calculation incomplete'}
          </StatusBadge>
          <div className="grid gap-2">
            <h2 id="calculation-title" className="m-0 text-lg font-bold">
              Today’s balance estimate
            </h2>
            <p className="m-0 text-3xl font-bold tabular-nums">
              {estimate === null ? 'Not available' : formatDuration(estimate.balanceMinutes, true)}
            </p>
            <p className="m-0 text-sm font-semibold leading-6">
              {estimate !== null
                ? `${formatDuration(estimate.creditedMinutes)} credited − ${formatDuration(estimate.expectedMinutes)} expected`
                : 'Resolve the blockers below before relying on today’s calculation.'}
            </p>
            <p className="m-0 text-sm leading-6 text-[var(--wl-text-muted)]">
              {estimate !== null
                ? 'This current-day value can still change. It is not posted or locked.'
                : 'WorkLedger does not present a partial amount as a complete estimate.'}
            </p>
          </div>
          {calculation.holidayName === null ? null : (
            <p className="m-0 min-w-0 [overflow-wrap:anywhere] border-t border-[var(--wl-border)] pt-4 text-sm font-semibold">
              Public holiday: {calculation.holidayName}
            </p>
          )}
        </section>
      </div>
    </Panel>
  );
}

function feedbackToneClass(kind: TodayAttendanceFeedback['kind']): string {
  switch (kind) {
    case 'ERROR':
      return 'wl-alert--danger';
    case 'INFO':
      return 'wl-alert--info';
    case 'SUCCESS':
      return 'wl-alert--success';
  }
}
