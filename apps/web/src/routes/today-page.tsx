import { useEffect, useRef, useState, type RefObject } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';

import type {
  AttendanceCommand,
  AttendanceCommandResult,
  AttendanceState,
  CalculationBlockerCode,
  CalculationWarningCode,
  TodayAttendance,
} from '@workledger/contracts';
import { Button, Dialog } from '@workledger/ui';

import {
  ApiClientError,
  clearSessionMemory,
  createAttendanceIntentKey,
  executeAttendanceCommand,
  type AttendanceCommandIntent,
} from '../app/api-client.js';
import { formatDuration, formatLocalDate, formatTime } from '../app/date-time-format.js';
import { todayAttendanceQuery } from '../app/query.js';
import { setPendingSignInNotice } from '../app/session-notice.js';
import { DailyTimeBreakdown } from '../components/daily-time-breakdown.js';
import { PageHeader } from '../components/page-header.js';
import { TodayAttendanceTimeline } from '../components/today-attendance-timeline.js';

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

type AttendanceFeedback = Readonly<{
  command: AttendanceCommand;
  intentKey: string;
  kind: 'ERROR' | 'SUCCESS';
  message: string;
  requestId?: string;
  resultingRevision?: number;
}>;

export function TodayPage() {
  const query = useQuery(todayAttendanceQuery());
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const statusHeadingRef = useRef<HTMLHeadingElement>(null);
  const focusedIntentRef = useRef<string | null>(null);
  const [attendanceFeedback, setAttendanceFeedback] = useState<AttendanceFeedback | null>(null);
  const [clockOutConfirmationOpen, setClockOutConfirmationOpen] = useState(false);
  const attendanceMutation = useMutation({
    mutationFn: executeAttendanceCommand,
    onError: async (error, variables) => {
      setClockOutConfirmationOpen(false);
      if (isAuthenticationError(error)) return;
      setAttendanceFeedback(attendanceErrorFeedback(error, variables));
      await queryClient.invalidateQueries({ queryKey: todayAttendanceQuery().queryKey });
    },
    onSuccess: async (result, variables) => {
      setClockOutConfirmationOpen(false);
      setAttendanceFeedback(
        Object.freeze({
          command: variables.command,
          intentKey: variables.idempotencyKey,
          kind: 'SUCCESS',
          message: attendanceSuccessMessage(
            result,
            formatTime(result.occurredAt, query.data?.timeZone ?? 'UTC'),
          ),
          resultingRevision: result.attendanceRevision,
        }),
      );
      await queryClient.invalidateQueries({ queryKey: todayAttendanceQuery().queryKey });
    },
  });
  const authenticationError =
    isAuthenticationError(query.error) || isAuthenticationError(attendanceMutation.error);

  useEffect(() => {
    if (!authenticationError) return;
    clearSessionMemory();
    queryClient.clear();
    if (
      [query.error, attendanceMutation.error].some(
        (error) => error instanceof ApiClientError && error.code === 'AUTH_SESSION_EXPIRED',
      )
    ) {
      setPendingSignInNotice('SESSION_EXPIRED');
    }
    void navigate('/sign-in', { replace: true });
  }, [attendanceMutation.error, authenticationError, navigate, query.error, queryClient]);

  useEffect(() => {
    if (query.data?.attendance.state !== 'ON_BREAK') setClockOutConfirmationOpen(false);
  }, [query.data?.attendance.state]);

  useEffect(() => {
    if (
      attendanceFeedback === null ||
      focusedIntentRef.current === attendanceFeedback.intentKey ||
      query.data === undefined ||
      query.data.attendance.validActions.includes(attendanceFeedback.command)
    ) {
      return;
    }
    if (
      attendanceFeedback.resultingRevision !== undefined &&
      query.data.attendance.attendanceRevision < attendanceFeedback.resultingRevision
    ) {
      return;
    }
    statusHeadingRef.current?.focus();
    focusedIntentRef.current = attendanceFeedback.intentKey;
  }, [attendanceFeedback, query.data]);

  if (query.isPending || authenticationError) return renderTodayLoading();
  if (query.isError) {
    return renderTodayLoadError({ error: query.error, retry: () => void query.refetch() });
  }

  return renderTodayReady({
    attendanceFeedback,
    clockOutConfirmationOpen,
    onAttendanceCommand: (command, expectedAttendanceRevision, confirmActiveBreak) => {
      const intentKey = createAttendanceIntentKey();
      focusedIntentRef.current = null;
      setAttendanceFeedback(null);
      if (command === 'CLOCK_OUT') {
        attendanceMutation.mutate({
          command,
          ...(confirmActiveBreak === undefined ? {} : { confirmActiveBreak }),
          expectedAttendanceRevision,
          idempotencyKey: intentKey,
        });
        return;
      }
      attendanceMutation.mutate({
        command,
        expectedAttendanceRevision,
        idempotencyKey: intentKey,
      });
    },
    pendingIntent: attendanceMutation.isPending ? attendanceMutation.variables : null,
    setClockOutConfirmationOpen,
    statusHeadingRef,
    today: query.data,
    updating: query.isFetching,
  });
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
  attendanceFeedback,
  clockOutConfirmationOpen,
  onAttendanceCommand,
  pendingIntent,
  setClockOutConfirmationOpen,
  statusHeadingRef,
  today,
  updating,
}: Readonly<{
  attendanceFeedback: AttendanceFeedback | null;
  clockOutConfirmationOpen: boolean;
  onAttendanceCommand: (
    command: AttendanceCommand,
    expectedAttendanceRevision: number,
    confirmActiveBreak?: boolean,
  ) => void;
  pendingIntent: AttendanceCommandIntent | null;
  setClockOutConfirmationOpen: (isOpen: boolean) => void;
  statusHeadingRef: RefObject<HTMLHeadingElement | null>;
  today: TodayAttendance;
  updating: boolean;
}>) {
  const attendance = today.attendance;
  const calculation = today.calculation;
  const activeDescription =
    attendance.activeSince === null
      ? 'No active attendance interval.'
      : `${STATE_LABELS[attendance.state]} since ${formatTime(attendance.activeSince, today.timeZone)}.`;

  return (
    <section className="grid max-w-6xl gap-8">
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
          className="wl-panel grid min-w-0 content-start gap-5"
          aria-labelledby="current-status-title"
        >
          <div className="grid gap-1">
            <p className="m-0 text-sm font-bold uppercase tracking-[0.1em] text-[var(--wl-text-muted)]">
              Current status
            </p>
            <h2
              ref={statusHeadingRef}
              id="current-status-title"
              className="m-0 text-3xl font-bold outline-none focus-visible:rounded-sm focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[var(--wl-focus-ring)]"
              tabIndex={-1}
            >
              {STATE_LABELS[attendance.state]}
            </h2>
            <p className="m-0 text-sm leading-6 text-[var(--wl-text-muted)]">{activeDescription}</p>
          </div>
          <div className="grid gap-1 border-t border-[var(--wl-border)] pt-4">
            <h3 className="m-0 text-sm font-bold">Available next</h3>
            <p className="m-0 text-sm leading-6 text-[var(--wl-text-muted)]">
              {attendance.validActions.map((action) => ACTION_LABELS[action]).join(' or ')}.
            </p>
            <AttendanceControls
              attendance={attendance}
              clockOutConfirmationOpen={clockOutConfirmationOpen}
              onAttendanceCommand={onAttendanceCommand}
              pendingIntent={pendingIntent}
              setClockOutConfirmationOpen={setClockOutConfirmationOpen}
            />
            {attendanceFeedback === null ? null : (
              <div
                className={
                  attendanceFeedback.kind === 'ERROR'
                    ? 'wl-alert wl-alert-error mt-3 grid gap-1 rounded-xl border p-3'
                    : 'wl-alert mt-3 grid gap-1 rounded-xl border p-3'
                }
                role={attendanceFeedback.kind === 'ERROR' ? 'alert' : 'status'}
              >
                <p className="m-0 text-sm font-semibold">{attendanceFeedback.message}</p>
                {attendanceFeedback.requestId === undefined ? null : (
                  <p className="m-0 break-all text-xs">
                    Request reference: {attendanceFeedback.requestId}
                  </p>
                )}
              </div>
            )}
          </div>
        </section>

        <section
          className="wl-panel grid min-w-0 content-start gap-5"
          aria-labelledby="calculation-title"
        >
          <div className="grid gap-1">
            <p className="m-0 text-sm font-bold uppercase tracking-[0.1em] text-[var(--wl-text-muted)]">
              {calculation.status === 'PROVISIONAL'
                ? 'Provisional estimate'
                : 'Calculation incomplete'}
            </p>
            <h2 id="calculation-title" className="m-0 text-3xl font-bold">
              {calculation.estimate === null
                ? 'Not available'
                : formatDuration(calculation.estimate.balanceMinutes, true)}
            </h2>
            <p className="m-0 text-sm leading-6 text-[var(--wl-text-muted)]">
              {calculation.estimate === null
                ? 'WorkLedger cannot produce a reliable estimate until the items below are resolved.'
                : 'Estimated flexible-time balance for today. It is not a locked or final record.'}
            </p>
          </div>
          {calculation.holidayName === null ? null : (
            <p className="m-0 min-w-0 [overflow-wrap:anywhere] rounded-lg bg-[var(--wl-surface-subtle)] p-3 text-sm font-semibold">
              Public holiday: {calculation.holidayName}
            </p>
          )}
        </section>
      </div>

      <CalculationMessages blockers={calculation.blockers} warnings={calculation.warnings} />

      {calculation.estimate === null ? null : (
        <DailyTimeBreakdown
          estimate={calculation.estimate}
          holidayName={calculation.holidayName}
          status={calculation.status}
        />
      )}

      <TodayAttendanceTimeline
        events={today.timeline}
        localDate={today.localDate}
        timeZone={today.timeZone}
        truncated={today.timelineTruncated}
      />
    </section>
  );
}

function AttendanceControls({
  attendance,
  clockOutConfirmationOpen,
  onAttendanceCommand,
  pendingIntent,
  setClockOutConfirmationOpen,
}: Readonly<{
  attendance: TodayAttendance['attendance'];
  clockOutConfirmationOpen: boolean;
  onAttendanceCommand: (
    command: AttendanceCommand,
    expectedAttendanceRevision: number,
    confirmActiveBreak?: boolean,
  ) => void;
  pendingIntent: AttendanceCommandIntent | null;
  setClockOutConfirmationOpen: (isOpen: boolean) => void;
}>) {
  return (
    <div className="mt-3 flex flex-wrap gap-3">
      {attendance.validActions.map((action, index) => {
        const isPendingAction = pendingIntent?.command === action;
        const label = isPendingAction ? pendingActionLabel(action) : ACTION_LABELS[action];
        const variant = index === 0 ? 'primary' : 'secondary';

        if (action === 'CLOCK_OUT' && attendance.state === 'ON_BREAK') {
          return (
            <Dialog
              key={action}
              actions={({ close }) => (
                <>
                  <Button variant="secondary" isDisabled={pendingIntent !== null} onPress={close}>
                    Cancel
                  </Button>
                  <Button
                    isDisabled={pendingIntent !== null}
                    onPress={() =>
                      onAttendanceCommand('CLOCK_OUT', attendance.attendanceRevision, true)
                    }
                  >
                    {isPendingAction ? 'Clocking out…' : 'Close break and clock out'}
                  </Button>
                </>
              )}
              isDismissable={pendingIntent === null}
              isOpen={clockOutConfirmationOpen}
              onOpenChange={(isOpen) => {
                if (pendingIntent === null || isOpen) setClockOutConfirmationOpen(isOpen);
              }}
              title="Clock out while on break?"
              triggerIsDisabled={pendingIntent !== null}
              triggerLabel={label}
              triggerVariant={variant}
            >
              <p className="m-0">
                WorkLedger will close your active break and clock you out at the same recorded
                instant. Cancel to leave your attendance unchanged.
              </p>
            </Dialog>
          );
        }

        return (
          <form
            key={action}
            aria-busy={isPendingAction}
            onSubmit={(event) => {
              event.preventDefault();
              if (pendingIntent === null) {
                onAttendanceCommand(action, attendance.attendanceRevision);
              }
            }}
          >
            <Button type="submit" variant={variant} isDisabled={pendingIntent !== null}>
              {label}
            </Button>
          </form>
        );
      })}
    </div>
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

function isAuthenticationError(error: unknown): boolean {
  return (
    error instanceof ApiClientError &&
    ['AUTH_REQUIRED', 'AUTH_SESSION_EXPIRED'].includes(error.code)
  );
}

function attendanceSuccessMessage(result: AttendanceCommandResult, formattedTime: string): string {
  switch (result.command) {
    case 'CLOCK_IN':
      return `Clocked in at ${formattedTime}.`;
    case 'START_BREAK':
      return `Break started at ${formattedTime}.`;
    case 'RESUME':
      return `Resumed work at ${formattedTime}.`;
    case 'CLOCK_OUT':
      return `Clocked out at ${formattedTime}.`;
  }
}

function attendanceErrorFeedback(
  error: unknown,
  intent: AttendanceCommandIntent,
): AttendanceFeedback {
  const base = {
    command: intent.command,
    intentKey: intent.idempotencyKey,
    kind: 'ERROR',
  } as const;
  const outcome = attendanceOutcomeNoun(intent.command);
  if (error instanceof ApiClientError) {
    if (error.code === 'ATTENDANCE_STATE_CHANGED') {
      const currentState = error.context?.['currentState'];
      const stateLabel =
        typeof currentState === 'string' && currentState in STATE_LABELS
          ? STATE_LABELS[currentState as AttendanceState].toLowerCase()
          : 'updated';
      return Object.freeze({
        ...base,
        message: `No ${outcome} was recorded. Attendance changed in another tab or device. Current status: ${stateLabel}.`,
        ...(error.requestId === undefined ? {} : { requestId: error.requestId }),
      });
    }
    if (error.code === 'ATTENDANCE_BREAK_CONFIRMATION_REQUIRED') {
      return Object.freeze({
        ...base,
        message:
          'No clock-out was recorded. Confirm that the active break should close before clocking out.',
        ...(error.requestId === undefined ? {} : { requestId: error.requestId }),
      });
    }
    if (error.code.startsWith('ATTENDANCE_')) {
      return Object.freeze({
        ...base,
        message: `No ${outcome} was recorded because that action is not valid for the current attendance state.`,
        ...(error.requestId === undefined ? {} : { requestId: error.requestId }),
      });
    }
    if (error.code === 'IDEMPOTENCY_KEY_CONFLICT') {
      return Object.freeze({
        ...base,
        message: `No ${outcome} was recorded because this request could not be matched safely. Review the current status before trying again.`,
        ...(error.requestId === undefined ? {} : { requestId: error.requestId }),
      });
    }
    return Object.freeze({
      ...base,
      message: `WorkLedger could not confirm whether ${outcome} was recorded. Review the refreshed current status before trying again.`,
      ...(error.requestId === undefined ? {} : { requestId: error.requestId }),
    });
  }
  return Object.freeze({
    ...base,
    message: `WorkLedger could not confirm whether ${outcome} was recorded. Review the refreshed current status before trying again.`,
  });
}

function attendanceOutcomeNoun(command: AttendanceCommand): string {
  switch (command) {
    case 'CLOCK_IN':
      return 'clock-in';
    case 'START_BREAK':
      return 'break start';
    case 'RESUME':
      return 'resume';
    case 'CLOCK_OUT':
      return 'clock-out';
  }
}

function pendingActionLabel(command: AttendanceCommand): string {
  switch (command) {
    case 'CLOCK_IN':
      return 'Clocking in…';
    case 'START_BREAK':
      return 'Starting break…';
    case 'RESUME':
      return 'Resuming work…';
    case 'CLOCK_OUT':
      return 'Clocking out…';
  }
}
