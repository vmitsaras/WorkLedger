import type { RefObject } from 'react';

import type { AttendanceCommand, AttendanceState, TodayAttendance } from '@workledger/contracts';
import {
  formatCompactDuration,
  formatDateOnly,
  formatInstant,
  type I18nRuntime,
  type MessageKey,
} from '@workledger/i18n';
import { useWorkLedgerI18n, useWorkLedgerMessage } from '@workledger/i18n/react';
import { Alert, Panel, StatusBadge, type AlertProps } from '@workledger/ui';

import type { AttendanceCommandIntent } from '../app/api-client.js';
import {
  AttendanceRecovery,
  TodayAttendanceControls,
  type AttendanceRecoveryMode,
} from './today-attendance-controls.js';

const STATE_LABEL_KEYS = {
  OFF_WORK: 'employee.today.attendance.state.offWork',
  ON_BREAK: 'employee.today.attendance.state.onBreak',
  WORKING: 'employee.today.attendance.state.working',
} as const satisfies Readonly<Record<AttendanceState, MessageKey>>;

const FINISH_UNAVAILABLE_KEYS = {
  CALCULATION_INCOMPLETE: 'employee.today.overview.finish.calculationIncomplete',
  CALCULATION_UNAVAILABLE: 'employee.today.overview.finish.calculationUnavailable',
  NOT_WORKING: 'employee.today.overview.finish.startToEstimate',
  NO_REMAINING_EXPECTATION: 'employee.today.overview.finish.expectationMet',
  ON_BREAK: 'employee.today.overview.finish.resumeToEstimate',
} as const satisfies Readonly<Record<string, MessageKey>>;

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
  const runtime = useWorkLedgerI18n();
  const t = useWorkLedgerMessage();
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
        ? t('employee.today.overview.finish.notAvailable')
        : t(FINISH_UNAVAILABLE_KEYS[estimatedFinishUnavailableReason])
      : formatClockTime(runtime, estimatedFinishAt, timeZone);
  const progressDescription =
    provisional === null
      ? t('employee.today.overview.progressUnavailableDescription')
      : provisional.expectedMinutesToday === 0
        ? t('employee.today.overview.progressWithoutExpectation', {
            credited: formatCompactDuration(runtime, provisional.creditedMinutesToday),
          })
        : t('employee.today.overview.progressDescription', {
            credited: formatCompactDuration(runtime, provisional.creditedMinutesToday),
            expected: formatCompactDuration(runtime, provisional.expectedMinutesToday),
          });

  return (
    <Panel
      aria-label={t('employee.today.overview.ariaLabel')}
      className="wl-today-overview"
      density="comfortable"
    >
      <div className="wl-today-summary-grid grid">
        <div className="wl-today-status-task grid content-start gap-3">
          <section className="wl-today-status" aria-labelledby="current-status-title">
            <p className="wl-today-eyebrow">{t('employee.today.attendance.currentStatus')}</p>
            <h2
              ref={statusHeadingRef}
              id="current-status-title"
              className="wl-today-status-heading outline-none"
              tabIndex={-1}
            >
              {t(STATE_LABEL_KEYS[state])}
            </h2>
            {activeSince === null || activeElapsedMinutes === null ? (
              <p className="wl-today-copy-muted">
                {t('employee.today.attendance.noActiveInterval')}
              </p>
            ) : (
              metricList('m-0 grid gap-3', [
                [
                  state === 'ON_BREAK'
                    ? t('employee.today.attendance.currentBreak')
                    : t('employee.today.attendance.currentWorkInterval'),
                  formatCompactDuration(runtime, activeElapsedMinutes),
                ],
                [
                  t('employee.today.attendance.since'),
                  formatClockTime(runtime, activeSince, timeZone),
                  activeSince,
                ],
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
                title={feedbackTitle(feedback.kind, t)}
                tone={feedbackTone(feedback.kind)}
              >
                <p className="m-0 text-sm font-semibold">{feedback.message}</p>
                {feedback.requestId === undefined ? null : (
                  <p className="m-0 break-all text-xs">
                    {t('employee.today.page.requestReference', {
                      requestId: feedback.requestId,
                    })}
                  </p>
                )}
              </Alert>
            )}
          </div>
        </div>

        <section className="wl-today-progress-summary" aria-labelledby="today-progress-title">
          <div className="wl-today-heading-row">
            <h2 id="today-progress-title" className="wl-today-section-heading">
              {t('employee.today.overview.title')}
            </h2>
            <StatusBadge tone={calculation.status === 'PROVISIONAL' ? 'info' : 'danger'}>
              {calculation.status === 'PROVISIONAL'
                ? t('employee.today.overview.statusProvisional')
                : t('employee.today.overview.statusIncomplete')}
            </StatusBadge>
          </div>
          <div className="grid gap-2">
            <p className="wl-today-prominent-value">
              {provisional === null
                ? t('employee.today.overview.progressUnavailable')
                : t('employee.today.overview.progressCredited', {
                    credited: formatCompactDuration(runtime, provisional.creditedMinutesToday),
                  })}
            </p>
            {provisional !== null && provisional.expectedMinutesToday > 0 ? (
              <progress
                aria-label={t('employee.today.overview.progressAriaLabel')}
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
                [
                  t('employee.today.overview.workedToday'),
                  formatCompactDuration(runtime, provisional.calculationSources.workedMinutesToday),
                ],
                [
                  t('employee.today.overview.breaks'),
                  formatCompactDuration(runtime, provisional.calculationSources.breakMinutesToday),
                ],
                [
                  t('employee.today.overview.remainingToday'),
                  remainingExpectedMinutes === null
                    ? t('employee.today.overview.finish.notAvailable')
                    : formatCompactDuration(runtime, remainingExpectedMinutes),
                ],
                [
                  t('employee.today.overview.estimatedFinish'),
                  estimatedFinishLabel,
                  estimatedFinishAt ?? undefined,
                  estimatedFinishAt === null
                    ? undefined
                    : t('employee.today.overview.estimatedFinishAssumption'),
                ],
                [
                  t('employee.today.overview.provisionalDifference'),
                  formatCompactDuration(runtime, provisional.provisionalDifferenceMinutes, true),
                ],
              ])}
          {calculation.holidayName === null ? null : (
            <p className="m-0 min-w-0 [overflow-wrap:anywhere] border-t border-[var(--wl-border)] pt-4 text-sm font-semibold">
              {t('employee.today.overview.holiday', {
                holidayName: calculation.holidayName,
              })}
            </p>
          )}
        </section>

        <section className="wl-today-posted-balance" aria-labelledby="posted-balance-title">
          <div className="grid gap-2">
            <p className="wl-today-eyebrow">{t('employee.today.overview.flexibleTime')}</p>
            <h2 id="posted-balance-title" className="wl-today-section-heading">
              {t('employee.today.overview.postedBalance')}
            </h2>
          </div>
          <p className="wl-today-prominent-value">
            {formatCompactDuration(runtime, postedFlexBalanceMinutes, true)}
          </p>
          <p className="wl-today-helper-strong">
            {postedThroughDate === null
              ? t('employee.today.overview.noPostedEntries')
              : t('employee.today.overview.postedThrough', {
                  date: formatDateOnly(runtime.locale, postedThroughDate),
                })}
          </p>
          <p className="wl-today-copy-muted">
            {t('employee.today.overview.todayExcludedFromPosted')}
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

function feedbackTitle(
  kind: TodayAttendanceFeedback['kind'],
  t: ReturnType<typeof useWorkLedgerMessage>,
): string {
  if (kind === 'ERROR') return t('employee.today.attendance.feedback.errorTitle');
  if (kind === 'INFO') return t('employee.today.attendance.feedback.infoTitle');
  return t('employee.today.attendance.feedback.successTitle');
}

function formatClockTime(runtime: I18nRuntime, value: string, timeZone: string): string {
  return formatInstant(runtime.locale, value, timeZone, {
    hour: 'numeric',
    minute: '2-digit',
  });
}
