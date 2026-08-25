import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from 'react';
import { onlineManager, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router';

import type {
  AttendanceCommand,
  AttendanceCommandResult,
  AttendanceState,
  TodayAttendance,
} from '@workledger/contracts';
import { Alert, Button, RouteState, buttonVariants } from '@workledger/ui';

import {
  ApiClientError,
  clearSessionMemory,
  createAttendanceIntentKey,
  executeAttendanceCommand,
  type AttendanceCommandIntent,
} from '../app/api-client.js';
import { formatLocalDate, formatTime } from '../app/date-time-format.js';
import { todayAttendanceQuery } from '../app/query.js';
import { useBoundaryPresentation } from '../app/route-presentation.js';
import { setPendingSignInNotice } from '../app/session-notice.js';
import { DailyTimeBreakdown } from '../components/daily-time-breakdown.js';
import { PageHeader } from '../components/page-header.js';
import { TodayAttention } from '../components/today-attention.js';
import type { AttendanceRecoveryMode } from '../components/today-attendance-controls.js';
import {
  TodayAttendanceOverview,
  type TodayAttendanceFeedback,
} from '../components/today-attendance-overview.js';
import { TodayAttendanceTimeline } from '../components/today-attendance-timeline.js';

const STATE_LABELS: Readonly<Record<AttendanceState, string>> = {
  OFF_WORK: 'Off work',
  ON_BREAK: 'On break',
  WORKING: 'Working',
};

const ATTENDANCE_AUTOMATIC_RETRY_LIMIT = 2;
const ATTENDANCE_RETRY_BASE_DELAY_MS = 250;
const ATTENDANCE_RETRY_MAX_DELAY_MS = 1_000;

export function TodayPage() {
  const [permissionDenied, setPermissionDenied] = useState(false);
  const query = useQuery({ ...todayAttendanceQuery(), enabled: !permissionDenied });
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const statusHeadingRef = useRef<HTMLHeadingElement>(null);
  const attendanceControlsRef = useRef<HTMLDivElement>(null);
  const focusedActionRef = useRef<AttendanceCommand | null>(null);
  const focusedIntentRef = useRef<string | null>(null);
  const previousAttendanceRef = useRef<TodayAttendance['attendance'] | null>(null);
  const [attendanceFeedback, setAttendanceFeedback] = useState<TodayAttendanceFeedback | null>(
    null,
  );
  const [clockOutConfirmationOpen, setClockOutConfirmationOpen] = useState(false);
  const [calculationDetailsOpen, setCalculationDetailsOpen] = useState(false);
  const [requiresReconnectRefresh, setRequiresReconnectRefresh] = useState(false);
  const attendanceMutation = useMutation({
    mutationFn: executeAttendanceCommand,
    networkMode: 'always',
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
          shouldFocusStatus: true,
        }),
      );
      await queryClient.invalidateQueries({ queryKey: todayAttendanceQuery().queryKey });
    },
    retry: (failureCount, error) => shouldRetryAttendanceCommand(failureCount, error),
    retryDelay: (failureCount) =>
      Math.min(ATTENDANCE_RETRY_BASE_DELAY_MS * 2 ** failureCount, ATTENDANCE_RETRY_MAX_DELAY_MS),
  });
  const authenticationError =
    isAuthenticationError(query.error) || isAuthenticationError(attendanceMutation.error);
  const accessDenied =
    permissionDenied || isAccessDenied(query.error) || isAccessDenied(attendanceMutation.error);

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
    if (!isAccessDenied(query.error) && !isAccessDenied(attendanceMutation.error)) return;
    setPermissionDenied(true);
    setClockOutConfirmationOpen(false);
    setAttendanceFeedback(null);
    queryClient.removeQueries({ exact: true, queryKey: todayAttendanceQuery().queryKey });
  }, [attendanceMutation.error, query.error, queryClient]);

  useEffect(() => {
    if (query.data?.attendance.state !== 'ON_BREAK') setClockOutConfirmationOpen(false);
  }, [query.data?.attendance.state]);

  useEffect(() => {
    const handleFocus = (event: FocusEvent) => {
      if (
        event.target instanceof Node &&
        (attendanceControlsRef.current?.contains(event.target) ||
          (event.target instanceof Element && event.target.closest('.wl-dialog-modal') !== null))
      ) {
        return;
      }
      focusedActionRef.current = null;
    };
    document.addEventListener('focusin', handleFocus);
    return () => document.removeEventListener('focusin', handleFocus);
  }, []);

  useEffect(() => {
    if (!isOnline) {
      setRequiresReconnectRefresh(true);
      setClockOutConfirmationOpen(false);
      setAttendanceFeedback(null);
      return;
    }
    if (!requiresReconnectRefresh) return;
    let active = true;
    void query.refetch().then((result) => {
      if (active && result.isSuccess) setRequiresReconnectRefresh(false);
    });
    return () => {
      active = false;
    };
  }, [isOnline, query.refetch, requiresReconnectRefresh]);

  useEffect(() => {
    const nextAttendance = query.data?.attendance;
    if (nextAttendance === undefined) return;
    const previousAttendance = previousAttendanceRef.current;
    previousAttendanceRef.current = nextAttendance;
    if (
      previousAttendance === null ||
      nextAttendance.attendanceRevision <= previousAttendance.attendanceRevision ||
      attendanceMutation.isPending ||
      (attendanceFeedback !== null &&
        (attendanceFeedback.resultingRevision === undefined ||
          nextAttendance.attendanceRevision <= attendanceFeedback.resultingRevision))
    ) {
      return;
    }

    const focusedAction = focusedActionRef.current;
    const focusedActionPresentationChanged =
      focusedAction === 'CLOCK_OUT' &&
      (previousAttendance.state === 'ON_BREAK') !== (nextAttendance.state === 'ON_BREAK');
    const shouldFocusStatus =
      focusedAction !== null &&
      (!nextAttendance.validActions.includes(focusedAction) || focusedActionPresentationChanged);
    setAttendanceFeedback(
      Object.freeze({
        command: focusedAction ?? previousAttendance.validActions[0] ?? 'CLOCK_IN',
        intentKey: `attendance-refresh-${nextAttendance.attendanceRevision.toString()}`,
        kind: 'INFO',
        message: `Attendance changed in another tab or device. Current status: ${STATE_LABELS[nextAttendance.state].toLowerCase()}.`,
        resultingRevision: nextAttendance.attendanceRevision,
        shouldFocusStatus,
      }),
    );
    if (shouldFocusStatus) focusedActionRef.current = null;
  }, [attendanceFeedback?.resultingRevision, attendanceMutation.isPending, query.data?.attendance]);

  useEffect(() => {
    if (
      attendanceFeedback === null ||
      !attendanceFeedback.shouldFocusStatus ||
      focusedIntentRef.current === attendanceFeedback.intentKey ||
      query.data === undefined
    ) {
      return;
    }
    if (
      attendanceFeedback.resultingRevision !== undefined &&
      query.data.attendance.attendanceRevision < attendanceFeedback.resultingRevision
    ) {
      return;
    }
    const activeElement = document.activeElement;
    const focusRemainsOnAttendanceAction =
      activeElement instanceof Node && attendanceControlsRef.current?.contains(activeElement);
    if (
      query.data.attendance.validActions.includes(attendanceFeedback.command) &&
      focusRemainsOnAttendanceAction
    ) {
      return;
    }
    statusHeadingRef.current?.focus();
    focusedIntentRef.current = attendanceFeedback.intentKey;
  }, [attendanceFeedback, query.data]);

  if (accessDenied) return <TodayPermissionDenied />;
  if ((query.isPending && isOnline) || authenticationError) return renderTodayLoading();
  if (query.isPending) return renderTodayOffline();
  if (query.isError && query.data === undefined) {
    return renderTodayLoadError({ error: query.error, retry: () => void query.refetch() });
  }

  const retryToday = () => {
    void query.refetch().then((result) => {
      if (isOnline && result.isSuccess) setRequiresReconnectRefresh(false);
    });
  };
  const recoveryMode = !isOnline
    ? 'OFFLINE'
    : requiresReconnectRefresh
      ? query.isError
        ? 'DEPENDENCY'
        : 'RECONNECTING'
      : query.isError
        ? 'DEPENDENCY'
        : null;
  const attendanceControlsDisabled = recoveryMode !== null;

  return renderTodayReady({
    attendanceFeedback,
    attendanceControlsDisabled,
    attendanceControlsRef,
    calculationDetailsOpen,
    clockOutConfirmationOpen,
    dependencyError: query.isError ? query.error : null,
    onActionFocus: (command) => {
      focusedActionRef.current = command;
    },
    onAttendanceCommand: (command, expectedAttendanceRevision, confirmActiveBreak) => {
      if (attendanceControlsDisabled || !onlineManager.isOnline()) return;
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
    recoveryMode,
    retryToday,
    setCalculationDetailsOpen,
    setClockOutConfirmationOpen,
    statusHeadingRef,
    today: query.data,
    updating: query.isFetching,
  });
}

function renderTodayOffline() {
  return (
    <section className="grid max-w-3xl gap-6">
      <PageHeader
        eyebrow="Attendance"
        title="Today"
        description="Reconnect to load your current attendance state. No clock action can be sent or queued while you are offline."
      />
      <Alert title="You’re offline" tone="danger">
        <p className="m-0 text-sm leading-6">
          WorkLedger will refresh your status after the connection returns before enabling any
          attendance action.
        </p>
      </Alert>
    </section>
  );
}

function TodayPermissionDenied() {
  useBoundaryPresentation('Permission denied');
  return (
    <section className="grid max-w-2xl gap-6">
      <PageHeader
        eyebrow="Route status"
        title="Permission denied"
        description="Your current account cannot use employee attendance. No attendance details or actions are available."
      />
      <Link className={buttonVariants({ variant: 'secondary' })} to="/">
        Go to my home
      </Link>
    </section>
  );
}

function renderTodayLoading() {
  return (
    <section className="grid max-w-3xl gap-6">
      <PageHeader
        eyebrow="Attendance"
        title="Today"
        description="Loading your current attendance state and calculation…"
      />
      <RouteState kind="loading" title="Loading today’s attendance">
        <p>Preparing your current status, valid actions, and calculation.</p>
      </RouteState>
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
      <Alert title="Today is temporarily unavailable" tone="danger">
        <div className="grid gap-1">
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
      </Alert>
    </section>
  );
}

function renderTodayReady({
  attendanceFeedback,
  attendanceControlsDisabled,
  attendanceControlsRef,
  calculationDetailsOpen,
  clockOutConfirmationOpen,
  dependencyError,
  onActionFocus,
  onAttendanceCommand,
  pendingIntent,
  recoveryMode,
  retryToday,
  setCalculationDetailsOpen,
  setClockOutConfirmationOpen,
  statusHeadingRef,
  today,
  updating,
}: Readonly<{
  attendanceFeedback: TodayAttendanceFeedback | null;
  attendanceControlsDisabled: boolean;
  attendanceControlsRef: RefObject<HTMLDivElement | null>;
  calculationDetailsOpen: boolean;
  clockOutConfirmationOpen: boolean;
  dependencyError: unknown;
  onActionFocus: (command: AttendanceCommand) => void;
  onAttendanceCommand: (
    command: AttendanceCommand,
    expectedAttendanceRevision: number,
    confirmActiveBreak?: boolean,
  ) => void;
  pendingIntent: AttendanceCommandIntent | null;
  recoveryMode: AttendanceRecoveryMode;
  retryToday: () => void;
  setCalculationDetailsOpen: (isOpen: boolean) => void;
  setClockOutConfirmationOpen: (isOpen: boolean) => void;
  statusHeadingRef: RefObject<HTMLHeadingElement | null>;
  today: TodayAttendance;
  updating: boolean;
}>) {
  const calculation = today.calculation;

  return (
    <section className="wl-today-layout grid max-w-6xl gap-8">
      <PageHeader
        eyebrow={formatLocalDate(today.localDate)}
        title="Today"
        description="Record your workday and review today’s time."
      >
        {updating ? (
          <p className="m-0 text-sm font-semibold text-[var(--wl-text-muted)]">Updating…</p>
        ) : (
          <p className="m-0 text-sm text-[var(--wl-text-muted)]">
            Estimate updated {formatTime(today.asOf, today.timeZone)}
          </p>
        )}
      </PageHeader>

      <TodayAttendanceOverview
        controlsDisabled={attendanceControlsDisabled}
        controlsRef={attendanceControlsRef}
        clockOutConfirmationOpen={clockOutConfirmationOpen}
        dependencyError={dependencyError}
        feedback={attendanceFeedback}
        onActionFocus={onActionFocus}
        onAttendanceCommand={onAttendanceCommand}
        pendingIntent={pendingIntent}
        recoveryMode={recoveryMode}
        retryToday={retryToday}
        setClockOutConfirmationOpen={setClockOutConfirmationOpen}
        statusHeadingRef={statusHeadingRef}
        today={today}
      />

      <div className="wl-today-support-grid grid gap-8">
        <TodayAttention items={calculation.attentionItems} />

        <TodayAttendanceTimeline
          appliedCorrections={today.appliedCorrections}
          events={today.timeline}
          localDate={today.localDate}
          timeZone={today.timeZone}
          truncated={today.timelineTruncated}
        />

        {calculation.provisional === null ? null : (
          <details
            id="calculation-details"
            className="wl-panel"
            open={calculationDetailsOpen}
            onToggle={(event) => setCalculationDetailsOpen(event.currentTarget.open)}
          >
            <summary className="min-h-[var(--wl-control-min-block-size)] cursor-pointer rounded-[var(--wl-radius-control)] outline-none focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-offset-3 focus-visible:outline-[var(--wl-focus-ring)]">
              <span className="font-bold">Calculation details</span>
              <span className="mt-1 block text-sm text-[var(--wl-text-muted)]">
                See evidence behind today’s estimate.
              </span>
            </summary>
            <div className="border-t border-[var(--wl-border)] pt-5">
              <DailyTimeBreakdown
                holidayName={calculation.holidayName}
                provisional={calculation.provisional}
                status={calculation.status}
              />
            </div>
          </details>
        )}
      </div>
    </section>
  );
}

function isAuthenticationError(error: unknown): boolean {
  return (
    error instanceof ApiClientError &&
    ['AUTH_REQUIRED', 'AUTH_SESSION_EXPIRED'].includes(error.code)
  );
}

function isAccessDenied(error: unknown): boolean {
  return error instanceof ApiClientError && error.code === 'ACCESS_DENIED';
}

function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    (notify) => onlineManager.subscribe(notify),
    () => onlineManager.isOnline(),
    () => true,
  );
}

function shouldRetryAttendanceCommand(failureCount: number, error: unknown): boolean {
  return (
    failureCount < ATTENDANCE_AUTOMATIC_RETRY_LIMIT &&
    onlineManager.isOnline() &&
    error instanceof ApiClientError &&
    (error.status === 0 || error.status >= 500)
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
): TodayAttendanceFeedback {
  const base = {
    command: intent.command,
    intentKey: intent.idempotencyKey,
    kind: 'ERROR',
    shouldFocusStatus: true,
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
    if (error.code === 'RATE_LIMITED') {
      return Object.freeze({
        ...base,
        message: `No ${outcome} was recorded because attendance actions are temporarily limited. Review the current status and try again later.`,
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
