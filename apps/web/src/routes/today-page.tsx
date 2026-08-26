import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from 'react';
import { onlineManager, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router';

import type {
  AttendanceCommand,
  AttendanceCommandResult,
  AttendanceState,
  SupportedLocale,
  TodayAttendance,
} from '@workledger/contracts';
import {
  formatDateOnly,
  formatInstant,
  type I18nRuntime,
  type MessageArguments,
  type MessageKey,
} from '@workledger/i18n';
import { useWorkLedgerI18n, useWorkLedgerMessage } from '@workledger/i18n/react';
import { Alert, Button, RouteState, buttonVariants } from '@workledger/ui';

import {
  ApiClientError,
  clearSessionMemory,
  createAttendanceIntentKey,
  executeAttendanceCommand,
  type AttendanceCommandIntent,
} from '../app/api-client.js';
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

type MessageTranslator = <Key extends MessageKey>(
  key: Key,
  ...args: MessageArguments<Key>
) => string;

const STATE_LABEL_KEYS = {
  OFF_WORK: 'employee.today.attendance.state.offWork',
  ON_BREAK: 'employee.today.attendance.state.onBreak',
  WORKING: 'employee.today.attendance.state.working',
} as const satisfies Readonly<Record<AttendanceState, MessageKey>>;

const ATTENDANCE_AUTOMATIC_RETRY_LIMIT = 2;
const ATTENDANCE_RETRY_BASE_DELAY_MS = 250;
const ATTENDANCE_RETRY_MAX_DELAY_MS = 1_000;

export function TodayPage() {
  const runtime = useWorkLedgerI18n();
  const t = useWorkLedgerMessage();
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
      setAttendanceFeedback(attendanceErrorFeedback(error, variables, runtime.locale, t));
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
            formatClockTime(runtime, result.occurredAt, query.data?.timeZone ?? 'UTC'),
            t,
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
        message: t('employee.today.attendance.remoteChanged', {
          state: t(STATE_LABEL_KEYS[nextAttendance.state]).toLocaleLowerCase(runtime.locale),
        }),
        resultingRevision: nextAttendance.attendanceRevision,
        shouldFocusStatus,
      }),
    );
    if (shouldFocusStatus) focusedActionRef.current = null;
  }, [
    attendanceFeedback?.resultingRevision,
    attendanceMutation.isPending,
    query.data?.attendance,
    runtime.locale,
    t,
  ]);

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
  if ((query.isPending && isOnline) || authenticationError) return renderTodayLoading(t);
  if (query.isPending) return renderTodayOffline(t);
  if (query.isError && query.data === undefined) {
    return renderTodayLoadError({ error: query.error, retry: () => void query.refetch(), t });
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
    runtime,
    setCalculationDetailsOpen,
    setClockOutConfirmationOpen,
    statusHeadingRef,
    today: query.data,
    t,
    updating: query.isFetching,
  });
}

function renderTodayOffline(t: MessageTranslator) {
  return (
    <section className="grid max-w-3xl gap-6">
      <PageHeader
        eyebrow={t('employee.today.page.eyebrow')}
        title={t('employee.today.page.title')}
        description={t('employee.today.page.offline.description')}
      />
      <Alert title={t('employee.today.attendance.recovery.offline.title')} tone="danger">
        <p className="m-0 text-sm leading-6">{t('employee.today.page.offline.message')}</p>
      </Alert>
    </section>
  );
}

function TodayPermissionDenied() {
  const t = useWorkLedgerMessage();
  const title = t('shared.route.boundary.permissionDenied.title');
  useBoundaryPresentation(title);
  return (
    <section className="grid max-w-2xl gap-6">
      <PageHeader
        eyebrow={t('employee.today.page.eyebrow')}
        title={title}
        description={t('employee.today.page.permission.description')}
      />
      <Link className={buttonVariants({ variant: 'secondary' })} to="/">
        {t('shared.action.goHome')}
      </Link>
    </section>
  );
}

function renderTodayLoading(t: MessageTranslator) {
  return (
    <section className="grid max-w-3xl gap-6">
      <PageHeader
        eyebrow={t('employee.today.page.eyebrow')}
        title={t('employee.today.page.title')}
        description={t('employee.today.page.loading.description')}
      />
      <RouteState kind="loading" title={t('employee.today.page.loading.title')}>
        <p>{t('employee.today.page.loading.message')}</p>
      </RouteState>
    </section>
  );
}

function renderTodayLoadError({
  error,
  retry,
  t,
}: Readonly<{ error: unknown; retry: () => void; t: MessageTranslator }>) {
  const requestId = error instanceof ApiClientError ? error.requestId : undefined;
  return (
    <section className="grid max-w-3xl gap-6">
      <PageHeader
        eyebrow={t('employee.today.page.eyebrow')}
        title={t('employee.today.page.title')}
        description={t('employee.today.page.loadError.description')}
      />
      <Alert title={t('employee.today.page.loadError.title')} tone="danger">
        <div className="grid gap-1">
          <p className="m-0 text-sm leading-6">{t('employee.today.page.loadError.message')}</p>
          {requestId === undefined ? null : (
            <p className="m-0 break-all text-xs">
              {t('employee.today.page.requestReference', { requestId })}
            </p>
          )}
        </div>
        <div>
          <Button variant="secondary" onPress={retry}>
            {t('shared.action.tryAgain')}
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
  runtime,
  setCalculationDetailsOpen,
  setClockOutConfirmationOpen,
  statusHeadingRef,
  today,
  t,
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
  runtime: I18nRuntime;
  setCalculationDetailsOpen: (isOpen: boolean) => void;
  setClockOutConfirmationOpen: (isOpen: boolean) => void;
  statusHeadingRef: RefObject<HTMLHeadingElement | null>;
  today: TodayAttendance;
  t: MessageTranslator;
  updating: boolean;
}>) {
  const calculation = today.calculation;

  return (
    <section className="wl-today-layout grid max-w-6xl gap-8">
      <PageHeader
        eyebrow={formatDateOnly(runtime.locale, today.localDate)}
        title={t('employee.today.page.title')}
        description={t('employee.today.page.description')}
      >
        {updating ? (
          <p className="m-0 text-sm font-semibold text-[var(--wl-text-muted)]">
            {t('employee.today.page.updating')}
          </p>
        ) : (
          <p className="m-0 text-sm text-[var(--wl-text-muted)]">
            {t('employee.today.page.estimateUpdated', {
              time: formatClockTime(runtime, today.asOf, today.timeZone),
            })}
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
              <span className="font-bold">{t('employee.today.calculation.detailsTitle')}</span>
              <span className="mt-1 block text-sm text-[var(--wl-text-muted)]">
                {t('employee.today.calculation.detailsDescription')}
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

function attendanceSuccessMessage(
  result: AttendanceCommandResult,
  formattedTime: string,
  t: MessageTranslator,
): string {
  switch (result.command) {
    case 'CLOCK_IN':
      return t('employee.today.attendance.success.clockIn', { time: formattedTime });
    case 'START_BREAK':
      return t('employee.today.attendance.success.startBreak', { time: formattedTime });
    case 'RESUME':
      return t('employee.today.attendance.success.resume', { time: formattedTime });
    case 'CLOCK_OUT':
      return t('employee.today.attendance.success.clockOut', { time: formattedTime });
  }
}

function attendanceErrorFeedback(
  error: unknown,
  intent: AttendanceCommandIntent,
  locale: SupportedLocale,
  t: MessageTranslator,
): TodayAttendanceFeedback {
  const base = {
    command: intent.command,
    intentKey: intent.idempotencyKey,
    kind: 'ERROR',
    shouldFocusStatus: true,
  } as const;
  const outcome = attendanceOutcomeNoun(intent.command, t);
  if (error instanceof ApiClientError) {
    if (error.code === 'ATTENDANCE_STATE_CHANGED') {
      const currentState = error.context?.['currentState'];
      const stateLabel =
        typeof currentState === 'string' && currentState in STATE_LABEL_KEYS
          ? t(STATE_LABEL_KEYS[currentState as AttendanceState]).toLocaleLowerCase(locale)
          : t('employee.today.attendance.feedback.infoTitle').toLocaleLowerCase(locale);
      return Object.freeze({
        ...base,
        message: t('employee.today.attendance.error.stateChanged', { outcome, state: stateLabel }),
        ...(error.requestId === undefined ? {} : { requestId: error.requestId }),
      });
    }
    if (error.code === 'ATTENDANCE_BREAK_CONFIRMATION_REQUIRED') {
      return Object.freeze({
        ...base,
        message: t('employee.today.attendance.error.breakConfirmation'),
        ...(error.requestId === undefined ? {} : { requestId: error.requestId }),
      });
    }
    if (error.code.startsWith('ATTENDANCE_')) {
      return Object.freeze({
        ...base,
        message: t('employee.today.attendance.error.invalidState', { outcome }),
        ...(error.requestId === undefined ? {} : { requestId: error.requestId }),
      });
    }
    if (error.code === 'IDEMPOTENCY_KEY_CONFLICT') {
      return Object.freeze({
        ...base,
        message: t('employee.today.attendance.error.conflict', { outcome }),
        ...(error.requestId === undefined ? {} : { requestId: error.requestId }),
      });
    }
    if (error.code === 'RATE_LIMITED') {
      return Object.freeze({
        ...base,
        message: t('employee.today.attendance.error.rateLimited', { outcome }),
        ...(error.requestId === undefined ? {} : { requestId: error.requestId }),
      });
    }
    return Object.freeze({
      ...base,
      message: t('employee.today.attendance.error.uncertain', { outcome }),
      ...(error.requestId === undefined ? {} : { requestId: error.requestId }),
    });
  }
  return Object.freeze({
    ...base,
    message: t('employee.today.attendance.error.uncertain', { outcome }),
  });
}

function attendanceOutcomeNoun(command: AttendanceCommand, t: MessageTranslator): string {
  switch (command) {
    case 'CLOCK_IN':
      return t('employee.today.attendance.outcome.clockIn');
    case 'START_BREAK':
      return t('employee.today.attendance.outcome.startBreak');
    case 'RESUME':
      return t('employee.today.attendance.outcome.resume');
    case 'CLOCK_OUT':
      return t('employee.today.attendance.outcome.clockOut');
  }
}

function formatClockTime(runtime: I18nRuntime, value: string, timeZone: string): string {
  return formatInstant(runtime.locale, value, timeZone, {
    hour: 'numeric',
    minute: '2-digit',
  });
}
