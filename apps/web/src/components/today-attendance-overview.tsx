import type { RefObject } from 'react';

import type { AttendanceCommand, AttendanceState, TodayAttendance } from '@workledger/contracts';
import { Alert, Panel, StatusBadge, type AlertProps } from '@workledger/ui';

import { formatDuration, formatLocalDate, formatTime } from '../app/date-time-format.js';
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

const FINISH_UNAVAILABLE_LABELS = {
  CALCULATION_INCOMPLETE: 'Calculation incomplete',
  CALCULATION_UNAVAILABLE: 'Calculation unavailable',
  NOT_WORKING: 'Start work to estimate',
  NO_REMAINING_EXPECTATION: 'Expectation met',
  ON_BREAK: 'Resume work to estimate',
} as const;

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
  const { attendance, calculation, postedFlexBalanceMinutes, postedThroughDate, timeZone } = today;
  const { activeElapsedMinutes, activeSince, state } = attendance;
  const {
    estimatedFinishAt,
    estimatedFinishUnavailableReason,
    provisional,
    remainingExpectedMinutes,
  } = calculation;
  const estimatedFinishLabel =
    estimatedFinishAt === null
      ? estimatedFinishUnavailableReason === null
        ? 'Not available'
        : FINISH_UNAVAILABLE_LABELS[estimatedFinishUnavailableReason]
      : formatTime(estimatedFinishAt, timeZone);
  const progressDescription =
    provisional === null
      ? 'Today’s credited progress is unavailable. Resolve the blockers below before relying on today’s calculation.'
      : provisional.expectedMinutesToday === 0
        ? `${formatDuration(provisional.creditedMinutesToday)} credited with no scheduled expectation today.`
        : `${formatDuration(provisional.creditedMinutesToday)} credited of ${formatDuration(provisional.expectedMinutesToday)} expected.`;

  return (
    <Panel
      aria-label="Today attendance summary"
      className="wl-today-overview"
      density="comfortable"
    >
      <div className="wl-today-summary-grid grid">
        <div className="wl-today-status-task grid content-start gap-3">
          <section className="wl-today-status" aria-labelledby="current-status-title">
            <p className="wl-today-eyebrow">Current status</p>
            <h2
              ref={statusHeadingRef}
              id="current-status-title"
              className="wl-today-status-heading outline-none"
              tabIndex={-1}
            >
              {STATE_LABELS[state]}
            </h2>
            {activeSince === null || activeElapsedMinutes === null ? (
              <p className="wl-today-copy-muted">No active work interval.</p>
            ) : (
              metricList('m-0 grid gap-3', [
                [
                  state === 'ON_BREAK' ? 'Current break' : 'Current work interval',
                  formatDuration(activeElapsedMinutes),
                ],
                ['Since', formatTime(activeSince, timeZone), activeSince],
              ])
            )}
          </section>

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
        </div>

        <section className="wl-today-progress-summary" aria-labelledby="today-progress-title">
          <div className="wl-today-heading-row">
            <h2 id="today-progress-title" className="wl-today-section-heading">
              Today’s progress
            </h2>
            <StatusBadge tone={calculation.status === 'PROVISIONAL' ? 'info' : 'danger'}>
              {calculation.status === 'PROVISIONAL'
                ? 'Provisional today'
                : 'Calculation incomplete'}
            </StatusBadge>
          </div>
          <div className="grid gap-2">
            <p className="wl-today-prominent-value">
              {provisional === null
                ? 'Progress unavailable'
                : `${formatDuration(provisional.creditedMinutesToday)} credited`}
            </p>
            {provisional !== null && provisional.expectedMinutesToday > 0 ? (
              <progress
                aria-label="Today’s credited progress"
                aria-valuetext={progressDescription}
                className="wl-today-progress"
                max={provisional.expectedMinutesToday}
                value={Math.min(provisional.creditedMinutesToday, provisional.expectedMinutesToday)}
              />
            ) : null}
            <p className="wl-today-copy-muted">{progressDescription}</p>
          </div>

          {provisional === null
            ? null
            : metricList('wl-today-metric-grid m-0 grid', [
                ['Worked today', formatDuration(provisional.calculationSources.workedMinutesToday)],
                ['Breaks', formatDuration(provisional.calculationSources.breakMinutesToday)],
                [
                  'Remaining today',
                  remainingExpectedMinutes === null
                    ? 'Not available'
                    : formatDuration(remainingExpectedMinutes),
                ],
                [
                  'Estimated finish',
                  estimatedFinishLabel,
                  estimatedFinishAt ?? undefined,
                  estimatedFinishAt === null ? undefined : 'Assumes no additional break.',
                ],
                [
                  'Provisional difference',
                  formatDuration(provisional.provisionalDifferenceMinutes, true),
                ],
              ])}
          {calculation.holidayName === null ? null : (
            <p className="m-0 min-w-0 [overflow-wrap:anywhere] border-t border-[var(--wl-border)] pt-4 text-sm font-semibold">
              Public holiday: {calculation.holidayName}
            </p>
          )}
        </section>

        <section className="wl-today-posted-balance" aria-labelledby="posted-balance-title">
          <div className="grid gap-2">
            <p className="wl-today-eyebrow">Flexible time</p>
            <h2 id="posted-balance-title" className="wl-today-section-heading">
              Posted balance
            </h2>
          </div>
          <p className="wl-today-prominent-value">
            {formatDuration(postedFlexBalanceMinutes, true)}
          </p>
          <p className="wl-today-helper-strong">
            {postedThroughDate === null ? (
              'No entries posted before today.'
            ) : (
              <>
                Posted through{' '}
                <time dateTime={postedThroughDate}>{formatLocalDate(postedThroughDate)}</time>.
              </>
            )}
          </p>
          <p className="wl-today-copy-muted">
            Today is still provisional and is not included in this balance.
          </p>
        </section>
      </div>
    </Panel>
  );
}

function metricList(
  className: string,
  metrics: readonly (readonly [string, string, (string | undefined)?, (string | undefined)?])[],
) {
  return (
    <dl className={className}>
      {metrics.map(([label, value, valueDateTime, description]) => (
        <div className="wl-today-metric min-w-0" key={label}>
          <dt>{label}</dt>
          <dd>
            {valueDateTime === undefined ? value : <time dateTime={valueDateTime}>{value}</time>}
          </dd>
          {description === undefined ? null : <dd>{description}</dd>}
        </div>
      ))}
    </dl>
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
