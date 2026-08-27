import { useEffect, useRef, useState, type FormEvent, type RefObject } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router';

import type {
  ApprovalDecisionAction,
  ApprovalDecisionRequest,
  ApprovalDetail,
} from '@workledger/contracts';
import { formatDateOnly, type MessageKey } from '@workledger/i18n';
import { useWorkLedgerI18n, useWorkLedgerMessage } from '@workledger/i18n/react';
import { Alert, Button, DataTable, Panel, RouteState, buttonVariants } from '@workledger/ui';

import {
  ApiClientError,
  applyApprovedCorrectionRequest,
  clearSessionMemory,
  decideApproval,
} from '../app/api-client.js';
import { formatDuration } from '../app/date-time-format.js';
import { approvalDetailQuery } from '../app/query.js';
import { useBoundaryPresentation } from '../app/route-presentation.js';
import { setPendingSignInNotice } from '../app/session-notice.js';
import { workflowStatusMessageKey } from '../app/workflow-status-presentation.js';
import { PageHeader } from '../components/page-header.js';
import { WorkflowStatusBadge } from '../components/workflow-status-badge.js';

type DecisionIntent = Readonly<{
  action: ApprovalDecisionAction;
  input: ApprovalDecisionRequest;
}>;

const APPROVAL_DETAIL_WORKFLOW_KEYS = Object.freeze({
  ABSENCE: 'manager.approval.detail.workflow.absenceRequest',
  CANCELLATION: 'manager.approval.detail.workflow.absenceCancellation',
  CORRECTION: 'manager.approval.detail.workflow.correctionRequest',
} as const satisfies Readonly<Record<ApprovalDetail['kind'], MessageKey>>);

const APPROVAL_ACTION_KEYS = Object.freeze({
  ACKNOWLEDGE: 'manager.approval.detail.action.acknowledge',
  APPROVE: 'manager.approval.detail.action.approve',
  REJECT: 'manager.approval.detail.action.reject',
  REQUEST_CHANGES: 'manager.approval.detail.action.requestChanges',
} as const satisfies Readonly<Record<ApprovalDecisionAction, MessageKey>>);

const COVERAGE_KIND_KEYS = Object.freeze({
  FIRST_HALF: 'employee.absence.coverage.name.firstHalf',
  FULL_DAY: 'employee.absence.coverage.name.fullDay',
  SECOND_HALF: 'employee.absence.coverage.name.secondHalf',
} as const satisfies Readonly<Record<'FIRST_HALF' | 'FULL_DAY' | 'SECOND_HALF', MessageKey>>);

export function ApprovalDetailPage() {
  const t = useWorkLedgerMessage();
  const { approvalId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const query = useQuery(approvalDetailQuery(approvalId ?? ''));
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string>();
  const [negativeBalanceOverride, setNegativeBalanceOverride] = useState(false);
  const [feedback, setFeedback] = useState<string>();
  const [feedbackIsError, setFeedbackIsError] = useState(false);
  const feedbackRef = useRef<HTMLElement>(null);
  const presentedApprovalIdRef = useRef<string | undefined>(undefined);

  const decision = useMutation({
    mutationFn: ({ input }: DecisionIntent) => decideApproval(approvalId ?? '', input),
    onSuccess: async (result, intent) => {
      setReason('');
      setReasonError(undefined);
      setNegativeBalanceOverride(false);
      setFeedback(
        intent.action === 'APPROVE' &&
          query.data?.kind === 'CORRECTION' &&
          query.data.applicationMode === 'POST_LOCK_ADJUSTMENT'
          ? t('manager.approval.detail.feedback.postLockApproved')
          : decisionSuccessMessage(intent.action, result.status, t),
      );
      setFeedbackIsError(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['approvals', 'detail', approvalId] }),
        queryClient.invalidateQueries({ queryKey: ['approvals', 'inbox'] }),
      ]);
      focusFeedback(feedbackRef);
    },
  });
  const applyCorrection = useMutation({
    mutationFn: (detail: Extract<ApprovalDetail, { kind: 'CORRECTION' }>) =>
      applyApprovedCorrectionRequest(detail.id, detail.version),
    onSuccess: async (result) => {
      setFeedback(
        t('manager.approval.detail.feedback.correctionApplied', {
          balance: formatDuration(result.balanceDeltaMinutes, true),
          worked: formatDuration(result.workedMinutes),
        }),
      );
      setFeedbackIsError(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['approvals', 'detail', approvalId] }),
        queryClient.invalidateQueries({ queryKey: ['approvals', 'inbox'] }),
      ]);
      focusFeedback(feedbackRef);
    },
  });

  const mutationError = decision.error ?? applyCorrection.error;
  useEffect(() => {
    const error = query.error ?? mutationError;
    if (!isAuthenticationError(error)) return;
    clearSessionMemory();
    queryClient.clear();
    if (error.code === 'AUTH_SESSION_EXPIRED') setPendingSignInNotice('SESSION_EXPIRED');
    void navigate('/sign-in', { replace: true });
  }, [mutationError, navigate, query.error, queryClient]);

  useEffect(() => {
    if (mutationError === null) return;
    setReasonError(undefined);
    setFeedback(errorMessage(mutationError, t));
    setFeedbackIsError(true);
    if (
      mutationError instanceof ApiClientError &&
      mutationError.code === 'APPROVAL_STATE_CONFLICT'
    ) {
      void query.refetch();
    }
    focusFeedback(feedbackRef);
  }, [mutationError, t, query]);

  useEffect(() => {
    if (
      approvalId === undefined ||
      query.data === undefined ||
      presentedApprovalIdRef.current === approvalId
    ) {
      return;
    }
    presentedApprovalIdRef.current = approvalId;
    const animationFrame = globalThis.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>('[data-route-heading]')?.focus();
    });
    return () => globalThis.cancelAnimationFrame(animationFrame);
  }, [approvalId, query.data]);

  if (query.isPending) return <ApprovalDetailLoading />;
  if (query.isError || query.data === undefined) return <ApprovalDetailError error={query.error} />;

  const detail = query.data;
  const decisionActions = detail.availableActions.filter(
    (action): action is ApprovalDecisionAction => action !== 'APPLY_CORRECTION',
  );
  const pending = decision.isPending || applyCorrection.isPending;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!(event.nativeEvent instanceof SubmitEvent)) return;
    const submitter = event.nativeEvent.submitter;
    if (!(submitter instanceof HTMLButtonElement)) return;
    const action = parseDecisionAction(submitter.value);
    if (action === null) return;
    const trimmedReason = reason.trim();
    if (action !== 'ACKNOWLEDGE' && trimmedReason.length < 10) {
      const message = t('manager.approval.detail.validation.reason');
      setReasonError(message);
      setFeedback(message);
      setFeedbackIsError(true);
      focusFeedback(feedbackRef);
      return;
    }
    setReasonError(undefined);
    if (
      action === 'APPROVE' &&
      detail.kind === 'ABSENCE' &&
      detail.projectedRemainingMinutes !== null &&
      detail.projectedRemainingMinutes < 0
    ) {
      if (!detail.canOverrideNegativeBalance) {
        setFeedback(t('manager.approval.detail.validation.hrOverrideOnly'));
        setFeedbackIsError(true);
        focusFeedback(feedbackRef);
        return;
      }
      if (!negativeBalanceOverride) {
        setFeedback(t('manager.approval.detail.validation.confirmOverride'));
        setFeedbackIsError(true);
        focusFeedback(feedbackRef);
        return;
      }
    }
    setFeedback(undefined);
    setFeedbackIsError(false);
    decision.mutate({
      action,
      input: {
        action,
        expectedVersion: detail.version,
        negativeBalanceOverride: action === 'APPROVE' && negativeBalanceOverride,
        ...(action === 'ACKNOWLEDGE' ? {} : { reason: trimmedReason }),
      },
    });
  }

  return (
    <section className="grid max-w-5xl gap-6">
      <PageHeader
        eyebrow={t('manager.approval.detail.page.eyebrow')}
        title={t('manager.approval.detail.page.title', {
          workflow: t(APPROVAL_DETAIL_WORKFLOW_KEYS[detail.kind]),
        })}
        description={t('manager.approval.detail.page.description')}
      />
      <Link
        className={buttonVariants({ variant: 'secondary', className: 'w-fit' })}
        to="/approvals"
      >
        {t('manager.approval.detail.action.backToInbox')}
      </Link>
      {feedback === undefined ? null : (
        <Alert
          className="outline-none"
          ref={feedbackRef}
          tabIndex={-1}
          title={
            feedbackIsError
              ? t('manager.approval.detail.feedback.errorTitle')
              : t('manager.approval.detail.feedback.successTitle')
          }
          tone={feedbackIsError ? 'danger' : 'success'}
        >
          <p id={reasonError === undefined ? undefined : 'approval-decision-reason-error'}>
            {feedback}
          </p>
        </Alert>
      )}
      <ApprovalSummary detail={detail} />
      {detail.availableActions.includes('APPLY_CORRECTION') && detail.kind === 'CORRECTION' ? (
        <Panel aria-labelledby="apply-correction-heading" className="grid gap-3" density="balanced">
          <h2 id="apply-correction-heading" className="m-0 text-xl font-bold">
            {t('manager.approval.detail.apply.heading')}
          </h2>
          <p className="m-0">
            {detail.applicationMode === 'POST_LOCK_ADJUSTMENT'
              ? t('manager.approval.detail.apply.description.postLock')
              : t('manager.approval.detail.apply.description.unlocked')}
          </p>
          <Button
            className="w-fit"
            isDisabled={pending}
            type="button"
            onPress={() => applyCorrection.mutate(detail)}
          >
            {applyCorrection.isPending
              ? t('manager.approval.detail.apply.pending')
              : t('manager.approval.detail.apply.action')}
          </Button>
        </Panel>
      ) : decisionActions.length > 0 ? (
        <Panel
          aria-labelledby="approval-decision-heading"
          className="grid gap-5"
          density="balanced"
        >
          <form className="grid gap-5" onSubmit={submit} noValidate>
            <div>
              <h2 id="approval-decision-heading" className="m-0 text-xl font-bold">
                {t('manager.approval.detail.decision.heading')}
              </h2>
              <p className="m-0 mt-1 text-sm text-[var(--wl-text-muted)]">
                {t('manager.approval.detail.decision.description')}
              </p>
            </div>
            <label className="grid gap-2 font-semibold" htmlFor="approval-decision-reason">
              {t('manager.approval.detail.decision.reasonLabel')}
              <textarea
                id="approval-decision-reason"
                aria-describedby={
                  reasonError === undefined
                    ? 'approval-decision-reason-help'
                    : 'approval-decision-reason-help approval-decision-reason-error'
                }
                aria-invalid={reasonError === undefined ? undefined : true}
                className="min-h-28 rounded-lg border border-[var(--wl-border)] bg-[var(--wl-surface-raised)] p-3 font-normal"
                disabled={pending}
                maxLength={2_000}
                value={reason}
                onChange={(event) => {
                  setReason(event.target.value);
                  if (reasonError !== undefined) {
                    setReasonError(undefined);
                    setFeedback(undefined);
                    setFeedbackIsError(false);
                  }
                }}
              />
            </label>
            <p
              id="approval-decision-reason-help"
              className="m-0 text-sm text-[var(--wl-text-muted)]"
            >
              {t('manager.approval.detail.decision.reasonHelp')}
            </p>
            {detail.kind === 'ABSENCE' &&
            detail.projectedRemainingMinutes !== null &&
            detail.projectedRemainingMinutes < 0 &&
            detail.canOverrideNegativeBalance ? (
              <label className="flex items-start gap-3 rounded-lg border border-[var(--wl-border)] p-3">
                <input
                  checked={negativeBalanceOverride}
                  disabled={pending}
                  type="checkbox"
                  onChange={(event) => setNegativeBalanceOverride(event.target.checked)}
                />
                <span>
                  <strong>{t('manager.approval.detail.decision.overrideTitle')}</strong>
                  <br />
                  {t('manager.approval.detail.decision.overrideDescription')}
                </span>
              </label>
            ) : null}
            <div className="flex flex-wrap gap-3">
              {decisionActions.map((action) => (
                <Button
                  key={action}
                  isDisabled={pending}
                  name="decision-action"
                  type="submit"
                  value={action}
                  variant={
                    action === 'APPROVE' || action === 'ACKNOWLEDGE'
                      ? 'primary'
                      : action === 'REJECT'
                        ? 'danger'
                        : 'secondary'
                  }
                >
                  {decision.isPending && decision.variables?.action === action
                    ? t('manager.approval.detail.decision.pending')
                    : actionLabel(action, detail.kind, t)}
                </Button>
              ))}
            </div>
          </form>
        </Panel>
      ) : (
        <RouteState kind="empty" title={t('manager.approval.detail.empty.title')}>
          <p>{t('manager.approval.detail.empty.description')}</p>
        </RouteState>
      )}
      <ApprovalEvidence detail={detail} />
    </section>
  );
}

function ApprovalSummary({ detail }: Readonly<{ detail: ApprovalDetail }>) {
  const runtime = useWorkLedgerI18n();
  const t = useWorkLedgerMessage();
  return (
    <Panel as="article" className="grid gap-5" density="balanced">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="m-0 text-xl font-bold">{detail.employeeDisplayName}</h2>
          <p className="m-0 mt-1 text-sm text-[var(--wl-text-muted)]">
            {detail.affectedStartDate === detail.affectedEndDate
              ? formatDateOnly(runtime.locale, detail.affectedStartDate, { dateStyle: 'full' })
              : t('manager.approval.detail.summary.dateRange', {
                  from: formatDateOnly(runtime.locale, detail.affectedStartDate, {
                    dateStyle: 'full',
                  }),
                  to: formatDateOnly(runtime.locale, detail.affectedEndDate, {
                    dateStyle: 'full',
                  }),
                })}
          </p>
        </div>
        <WorkflowStatusBadge status={detail.status} />
      </div>
      <dl className="m-0 grid gap-3 sm:grid-cols-2">
        <DetailFact
          label={t('manager.approval.detail.summary.workflow')}
          value={t(APPROVAL_DETAIL_WORKFLOW_KEYS[detail.kind])}
        />
        <DetailFact
          label={t('manager.approval.detail.summary.submitted')}
          value={formatLocalInstant(runtime.locale, detail.submittedAt)}
        />
      </dl>
      {detail.kind === 'CORRECTION' ? (
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <section>
              <h3 className="m-0 text-base font-bold">
                {t('manager.approval.detail.summary.originalCalculation')}
              </h3>
              <p>
                {t('manager.approval.detail.summary.originalWorked', {
                  value: formatDuration(detail.originalCalculation.workedMinutes),
                })}
                {' · '}
                {t('manager.approval.detail.summary.originalCredited', {
                  value: formatDuration(detail.originalCalculation.creditedMinutes),
                })}
                {' · '}
                {t('manager.approval.detail.summary.originalBalance', {
                  value: formatDuration(detail.originalCalculation.balanceMinutes, true),
                })}
              </p>
            </section>
            <section>
              <h3 className="m-0 text-base font-bold">
                {t('manager.approval.detail.summary.proposedInterval')}
              </h3>
              <p>
                {t('manager.approval.detail.summary.dateRange', {
                  from: formatLocalInstant(runtime.locale, detail.proposedStartsAt),
                  to: formatLocalInstant(runtime.locale, detail.proposedEndsAt),
                })}
              </p>
            </section>
          </div>
          <p className="m-0">
            <strong>{t('manager.approval.detail.summary.employeeReason')}</strong>{' '}
            {detail.requestReason}
          </p>
          <p className="m-0 rounded-lg border border-[var(--wl-border)] p-3">
            <strong>{t('manager.approval.detail.summary.effect')}</strong>{' '}
            {detail.applicationMode === 'POST_LOCK_ADJUSTMENT'
              ? t('manager.approval.detail.summary.effectPostLock')
              : t('manager.approval.detail.summary.effectUnlocked')}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          <p className="m-0">
            <strong>{t('manager.approval.detail.summary.absenceType')}</strong>{' '}
            {detail.absenceTypeName}
          </p>
          {detail.kind === 'ABSENCE' && detail.requestedEntitlementMinutes !== null ? (
            <p className="m-0">
              <strong>{t('manager.approval.detail.summary.entitlement')}</strong>{' '}
              {t('manager.approval.detail.summary.entitlementValue', {
                projected: formatDuration(detail.projectedRemainingMinutes ?? 0, true),
                requested: formatDuration(detail.requestedEntitlementMinutes),
              })}
            </p>
          ) : null}
          <DataTable
            caption={t('manager.approval.detail.summary.coverage.caption')}
            className="min-w-[34rem]"
            scrollHint={t('manager.approval.detail.summary.coverage.scrollHint')}
            scrollLabel={t('manager.approval.detail.summary.coverage.scrollLabel')}
          >
            <thead>
              <tr>
                <th scope="col">{t('manager.approval.detail.summary.coverage.date')}</th>
                <th scope="col">{t('manager.approval.detail.summary.coverage.kind')}</th>
                <th scope="col">{t('manager.approval.detail.summary.coverage.minutes')}</th>
              </tr>
            </thead>
            <tbody>
              {detail.coverage.map((segment, index) => (
                <tr key={`${segment.localDate}-${index}`}>
                  <th scope="row">
                    {formatDateOnly(runtime.locale, segment.localDate, { dateStyle: 'full' })}
                  </th>
                  <td>{coverageLabel(segment.kind, t)}</td>
                  <td>{formatDuration(segment.minutes)}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </div>
      )}
    </Panel>
  );
}

function DetailFact({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="grid gap-1">
      <dt className="text-sm font-semibold text-[var(--wl-text-muted)]">{label}</dt>
      <dd className="m-0">{value}</dd>
    </div>
  );
}

function ApprovalEvidence({ detail }: Readonly<{ detail: ApprovalDetail }>) {
  if (detail.kind !== 'CORRECTION') return null;
  const runtime = useWorkLedgerI18n();
  const t = useWorkLedgerMessage();
  return (
    <Panel aria-labelledby="approval-evidence-heading" className="grid gap-3" density="balanced">
      <div>
        <p className="m-0 text-sm font-semibold text-[var(--wl-text-muted)]">
          {t('manager.approval.detail.evidence.eyebrow')}
        </p>
        <h2 id="approval-evidence-heading" className="m-0 mt-1 text-xl font-bold">
          {t('manager.approval.detail.evidence.heading')}
        </h2>
      </div>
      <p className="m-0 text-sm text-[var(--wl-text-muted)]">
        {t('manager.approval.detail.evidence.description')}
      </p>
      {detail.events.length === 0 ? (
        <p className="m-0">{t('manager.approval.detail.evidence.empty')}</p>
      ) : (
        <ol className="m-0 grid gap-2 pl-5">
          {detail.events.map((event) => (
            <li key={event.sequence}>
              {attendanceEventLabel(event.type, t)}
              {' · '}
              {formatLocalInstant(runtime.locale, event.occurredAt)}
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

function ApprovalDetailLoading() {
  const t = useWorkLedgerMessage();
  return (
    <section className="grid gap-6">
      <PageHeader
        eyebrow={t('manager.approval.detail.page.eyebrow')}
        title={t('manager.approval.detail.loading.pageTitle')}
        description={t('manager.approval.detail.loading.pageDescription')}
      />
      <RouteState kind="loading" title={t('manager.approval.detail.loading.title')}>
        <p>{t('manager.approval.detail.loading.description')}</p>
      </RouteState>
    </section>
  );
}

function ApprovalDetailError({ error }: Readonly<{ error: unknown }>) {
  const denied = error instanceof ApiClientError && error.code === 'ACCESS_DENIED';
  const t = useWorkLedgerMessage();
  useBoundaryPresentation(
    denied
      ? t('shared.route.boundary.permissionDenied.title')
      : t('manager.approval.detail.error.title'),
  );
  return (
    <section className="grid gap-5">
      <PageHeader
        eyebrow={t('manager.approval.detail.page.eyebrow')}
        title={
          denied
            ? t('shared.route.boundary.permissionDenied.title')
            : t('manager.approval.detail.error.title')
        }
        description={
          denied
            ? t('manager.approval.detail.error.deniedDescription')
            : t('manager.approval.detail.error.description')
        }
      />
      <RouteState
        actionHref="/approvals"
        actionLabel={t('manager.approval.detail.action.backToInbox')}
        kind={denied ? 'permission-denied' : 'error'}
        title={
          denied
            ? t('manager.approval.detail.error.deniedStateTitle')
            : t('manager.approval.detail.error.title')
        }
      >
        <p>
          {denied
            ? t('manager.approval.detail.error.deniedStateDescription')
            : t('manager.approval.detail.error.stateDescription')}
        </p>
      </RouteState>
    </section>
  );
}

function focusFeedback(ref: RefObject<HTMLElement | null>) {
  globalThis.setTimeout(() => ref.current?.focus(), 0);
}

function parseDecisionAction(value: string): ApprovalDecisionAction | null {
  switch (value) {
    case 'APPROVE':
    case 'REJECT':
    case 'REQUEST_CHANGES':
    case 'ACKNOWLEDGE':
      return value;
    default:
      return null;
  }
}

function isAuthenticationError(error: unknown): error is ApiClientError {
  return (
    error instanceof ApiClientError &&
    (error.status === 401 || error.code === 'AUTH_SESSION_EXPIRED')
  );
}

function errorMessage(error: unknown, t: ReturnType<typeof useWorkLedgerMessage>): string {
  if (!(error instanceof ApiClientError)) return t('manager.approval.detail.error.recording');
  if (error.code === 'APPROVAL_STATE_CONFLICT')
    return t('manager.approval.detail.error.stateConflict');
  if (error.code === 'ABSENCE_INSUFFICIENT_BALANCE')
    return t('manager.approval.detail.error.insufficientBalance');
  if (error.code === 'PERIOD_ADJUSTMENT_REQUIRED')
    return t('manager.approval.detail.error.adjustmentRequired');
  if (error.code === 'ACCESS_DENIED') return t('manager.approval.detail.error.accessDenied');
  return t('manager.approval.detail.error.recording');
}

function decisionSuccessMessage(
  action: ApprovalDecisionAction,
  status: string,
  t: ReturnType<typeof useWorkLedgerMessage>,
): string {
  return t('manager.approval.detail.feedback.decisionRecorded', {
    action: actionLabel(action, 'ABSENCE', t),
    status: decisionResultStatusLabel(status, t),
  });
}

function decisionResultStatusLabel(
  status: string,
  t: ReturnType<typeof useWorkLedgerMessage>,
): string {
  if (
    status === 'ACKNOWLEDGED' ||
    status === 'APPLIED' ||
    status === 'APPROVED' ||
    status === 'CANCELLED' ||
    status === 'CHANGES_REQUESTED' ||
    status === 'LOCKED' ||
    status === 'OPEN' ||
    status === 'PARTIALLY_CANCELLED' ||
    status === 'PENDING_DECISION' ||
    status === 'REJECTED' ||
    status === 'REPORTED' ||
    status === 'SUBMITTED' ||
    status === 'WITHDRAWN'
  ) {
    return t(workflowStatusMessageKey(status));
  }
  return humanize(status);
}

function actionLabel(
  action: ApprovalDecisionAction,
  kind: ApprovalDetail['kind'],
  t: ReturnType<typeof useWorkLedgerMessage>,
): string {
  if (action === 'APPROVE' && kind === 'CORRECTION') {
    return t('manager.approval.detail.action.approveCorrection');
  }
  return t(APPROVAL_ACTION_KEYS[action]);
}

function coverageLabel(
  kind: Extract<ApprovalDetail, { kind: 'ABSENCE' | 'CANCELLATION' }>['coverage'][number]['kind'],
  t: ReturnType<typeof useWorkLedgerMessage>,
): string {
  return kind in COVERAGE_KIND_KEYS
    ? t(COVERAGE_KIND_KEYS[kind as keyof typeof COVERAGE_KIND_KEYS])
    : humanize(kind);
}

const ATTENDANCE_EVENT_KEYS = Object.freeze({
  BREAK_END: 'employee.today.timeline.event.breakEnd.label',
  BREAK_START: 'employee.today.timeline.event.breakStart.label',
  CLOCK_IN: 'employee.today.timeline.event.clockIn.label',
  CLOCK_OUT: 'employee.today.timeline.event.clockOut.label',
} as const satisfies Readonly<Record<string, MessageKey>>);

function attendanceEventLabel(type: string, t: ReturnType<typeof useWorkLedgerMessage>): string {
  const key = ATTENDANCE_EVENT_KEYS[type as keyof typeof ATTENDANCE_EVENT_KEYS];
  return key === undefined ? humanize(type) : t(key);
}

function humanize(value: string): string {
  const normalized = value.toLocaleLowerCase().replaceAll('_', ' ');
  return normalized.charAt(0).toLocaleUpperCase() + normalized.slice(1);
}

function formatLocalInstant(locale: Parameters<typeof formatDateOnly>[0], value: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );
}
