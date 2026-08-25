import type { RefObject } from 'react';

import type { AttendanceCommand, AttendanceState, TodayAttendance } from '@workledger/contracts';
import { Alert, Panel, StatusBadge, type AlertProps } from '@workledger/ui';

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
      : `Since ${formatTime(attendance.activeSince, today.timeZone)}.${
          attendance.activeElapsedMinutes === null
            ? ''
            : ` Current interval: ${formatDuration(attendance.activeElapsedMinutes)}.`
        }`;
  const provisional = calculation.provisional;

  return (
    <Panel
      aria-labelledby="current-status-title"
      className="wl-today-overview"
      density="comfortable"
    >
      <div className="wl-today-summary-grid grid">
        <div className="wl-today-status grid min-w-0 content-start gap-1">
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

        <section
          className="wl-today-estimate grid min-w-0 content-start gap-4"
          aria-labelledby="calculation-title"
        >
          <StatusBadge tone={calculation.status === 'PROVISIONAL' ? 'info' : 'danger'}>
            {calculation.status === 'PROVISIONAL'
              ? 'Provisional estimate'
              : 'Calculation incomplete'}
          </StatusBadge>
          <div className="grid gap-2">
            <h2 id="calculation-title" className="m-0 text-lg font-bold">
              Today’s balance estimate
            </h2>
            <p className="m-0 text-2xl font-bold tabular-nums">
              {provisional === null
                ? 'Not available'
                : formatDuration(provisional.provisionalDifferenceMinutes, true)}
            </p>
            <p className="m-0 text-sm font-semibold leading-6">
              {provisional !== null
                ? `${formatDuration(provisional.creditedMinutesToday)} credited − ${formatDuration(provisional.expectedMinutesToday)} expected`
                : 'Resolve the blockers below before relying on today’s calculation.'}
            </p>
            <p className="m-0 text-sm leading-6 text-[var(--wl-text-muted)]">
              {provisional !== null
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

      <div className="wl-today-action-footer grid gap-4">
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
          <Alert
            announce={feedback.kind !== 'ERROR' || recoveryMode === null}
            headingLevel="h3"
            title={feedbackTitle(feedback.kind)}
            tone={feedbackTone(feedback.kind)}
          >
            <p className="m-0 text-sm font-semibold">{feedback.message}</p>
            {feedback.requestId === undefined ? null : (
              <p className="m-0 break-all text-xs">Request reference: {feedback.requestId}</p>
            )}
          </Alert>
        )}
      </div>
    </Panel>
  );
}

function feedbackTone(kind: TodayAttendanceFeedback['kind']): NonNullable<AlertProps['tone']> {
  switch (kind) {
    case 'ERROR':
      return 'danger';
    case 'INFO':
      return 'info';
    case 'SUCCESS':
      return 'success';
  }
}

function feedbackTitle(kind: TodayAttendanceFeedback['kind']): string {
  if (kind === 'ERROR') return 'Attendance not changed';
  if (kind === 'INFO') return 'Attendance refreshed';
  return 'Attendance updated';
}
