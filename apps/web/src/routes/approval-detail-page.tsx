import { useEffect, useRef, useState, type FormEvent, type RefObject } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router';

import type {
  ApprovalDecisionAction,
  ApprovalDecisionRequest,
  ApprovalDetail,
} from '@workledger/contracts';
import { Alert, Button, DataTable, Panel, RouteState, buttonVariants } from '@workledger/ui';

import {
  ApiClientError,
  applyApprovedCorrectionRequest,
  clearSessionMemory,
  decideApproval,
} from '../app/api-client.js';
import { formatDuration, formatLocalDate } from '../app/date-time-format.js';
import { approvalDetailQuery } from '../app/query.js';
import { useBoundaryPresentation } from '../app/route-presentation.js';
import { setPendingSignInNotice } from '../app/session-notice.js';
import { PageHeader } from '../components/page-header.js';
import { WorkflowStatusBadge } from '../components/workflow-status-badge.js';

type DecisionIntent = Readonly<{
  action: ApprovalDecisionAction;
  input: ApprovalDecisionRequest;
}>;

export function ApprovalDetailPage() {
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
          ? 'Correction approved. The post-lock adjustment was appended and the approved monthly record remains unchanged.'
          : decisionSuccessMessage(intent.action, result.status),
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
        `Correction applied. Worked time is ${formatDuration(result.workedMinutes)} and the balance changed by ${formatDuration(result.balanceDeltaMinutes, true)}.`,
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
    setFeedback(errorMessage(mutationError));
    setFeedbackIsError(true);
    if (
      mutationError instanceof ApiClientError &&
      mutationError.code === 'APPROVAL_STATE_CONFLICT'
    ) {
      void query.refetch();
    }
    focusFeedback(feedbackRef);
  }, [mutationError]);

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
      const message = 'Enter at least 10 characters explaining the decision.';
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
        setFeedback(
          'This request exceeds the available entitlement. Only HR can approve it with an explicit override.',
        );
        setFeedbackIsError(true);
        focusFeedback(feedbackRef);
        return;
      }
      if (!negativeBalanceOverride) {
        setFeedback('Confirm the negative-balance override before approving this request.');
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
        eyebrow="Approvals"
        title={`Review ${workflowLabel(detail.kind)}`}
        description="Check the current record, its effect, and the available outcomes before recording one decision."
      />
      <Link
        className={buttonVariants({ variant: 'secondary', className: 'w-fit' })}
        to="/approvals"
      >
        Back to approval inbox
      </Link>
      {feedback === undefined ? null : (
        <Alert
          className="outline-none"
          ref={feedbackRef}
          tabIndex={-1}
          title={feedbackIsError ? 'Decision not recorded' : 'Decision recorded'}
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
            Apply approved correction
          </h2>
          <p className="m-0">
            {detail.applicationMode === 'POST_LOCK_ADJUSTMENT'
              ? 'Applying adds the approved change after the locked month. The approved monthly record remains unchanged.'
              : 'Applying updates the unlocked daily record and adds the resulting balance change.'}
          </p>
          <Button
            className="w-fit"
            isDisabled={pending}
            type="button"
            onPress={() => applyCorrection.mutate(detail)}
          >
            {applyCorrection.isPending ? 'Applying…' : 'Apply correction'}
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
                Record a decision
              </h2>
              <p className="m-0 mt-1 text-sm text-[var(--wl-text-muted)]">
                A reason of at least 10 characters is required for every outcome except
                acknowledgement.
              </p>
            </div>
            <label className="grid gap-2 font-semibold" htmlFor="approval-decision-reason">
              Decision reason
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
              The reason is stored with the decision and is not shown in the minimized inbox.
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
                  <strong>Approve with a negative-balance override.</strong>
                  <br />I have reviewed the projected entitlement balance and am making an explicit
                  HR exception.
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
                    ? 'Recording…'
                    : actionLabel(action, detail.kind)}
                </Button>
              ))}
            </div>
          </form>
        </Panel>
      ) : (
        <RouteState kind="empty" title="No decision is available">
          <p>This approval has no action available in its current state.</p>
        </RouteState>
      )}
      <ApprovalEvidence detail={detail} />
    </section>
  );
}

function ApprovalSummary({ detail }: Readonly<{ detail: ApprovalDetail }>) {
  return (
    <Panel as="article" className="grid gap-5" density="balanced">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="m-0 text-xl font-bold">{detail.employeeDisplayName}</h2>
          <p className="m-0 mt-1 text-sm text-[var(--wl-text-muted)]">
            {detail.affectedStartDate === detail.affectedEndDate
              ? formatLocalDate(detail.affectedStartDate)
              : `${formatLocalDate(detail.affectedStartDate)} to ${formatLocalDate(detail.affectedEndDate)}`}
          </p>
        </div>
        <WorkflowStatusBadge status={detail.status} />
      </div>
      <dl className="m-0 grid gap-3 sm:grid-cols-2">
        <DetailFact label="Workflow" value={workflowLabel(detail.kind)} />
        <DetailFact label="Submitted" value={formatInstant(detail.submittedAt)} />
      </dl>
      {detail.kind === 'CORRECTION' ? (
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <section>
              <h3 className="m-0 text-base font-bold">Original calculation</h3>
              <p>
                Worked {formatDuration(detail.originalCalculation.workedMinutes)} · credited{' '}
                {formatDuration(detail.originalCalculation.creditedMinutes)} · balance{' '}
                {formatDuration(detail.originalCalculation.balanceMinutes, true)}
              </p>
            </section>
            <section>
              <h3 className="m-0 text-base font-bold">Proposed interval</h3>
              <p>
                {formatInstant(detail.proposedStartsAt)} to {formatInstant(detail.proposedEndsAt)}
              </p>
            </section>
          </div>
          <p className="m-0">
            <strong>Employee reason:</strong> {detail.requestReason}
          </p>
          <p className="m-0 rounded-lg border border-[var(--wl-border)] p-3">
            <strong>How this change takes effect:</strong>{' '}
            {detail.applicationMode === 'POST_LOCK_ADJUSTMENT'
              ? 'Approval adds an adjustment to the locked month while the approved monthly record stays unchanged.'
              : 'After approval, the correction can be applied to the unlocked daily record.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          <p className="m-0">
            <strong>Absence type:</strong> {detail.absenceTypeName}
          </p>
          {detail.kind === 'ABSENCE' && detail.requestedEntitlementMinutes !== null ? (
            <p className="m-0">
              <strong>Entitlement:</strong> requests{' '}
              {formatDuration(detail.requestedEntitlementMinutes)}; projected remaining{' '}
              {formatDuration(detail.projectedRemainingMinutes ?? 0, true)}.
            </p>
          ) : null}
          <DataTable
            caption="Dates and minutes covered by this approval"
            className="min-w-[34rem]"
            scrollHint="Scroll horizontally to review each coverage value."
            scrollLabel="Absence coverage"
          >
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Coverage</th>
                <th scope="col">Minutes</th>
              </tr>
            </thead>
            <tbody>
              {detail.coverage.map((segment, index) => (
                <tr key={`${segment.localDate}-${index}`}>
                  <th scope="row">{formatLocalDate(segment.localDate)}</th>
                  <td>{segment.kind.replaceAll('_', ' ').toLowerCase()}</td>
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
  return (
    <Panel aria-labelledby="approval-evidence-heading" className="grid gap-3" density="balanced">
      <div>
        <p className="m-0 text-sm font-semibold text-[var(--wl-text-muted)]">Evidence</p>
        <h2 id="approval-evidence-heading" className="m-0 mt-1 text-xl font-bold">
          Recorded punch events
        </h2>
      </div>
      <p className="m-0 text-sm text-[var(--wl-text-muted)]">
        These original events remain unchanged when a correction is approved.
      </p>
      {detail.events.length === 0 ? (
        <p className="m-0">No source punch events are attached to this correction.</p>
      ) : (
        <ol className="m-0 grid gap-2 pl-5">
          {detail.events.map((event) => (
            <li key={event.sequence}>
              {event.type.replaceAll('_', ' ').toLowerCase()} · {formatInstant(event.occurredAt)}
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

function ApprovalDetailLoading() {
  return (
    <section className="grid gap-6">
      <PageHeader
        eyebrow="Approvals"
        title="Loading approval"
        description="Preparing the current record, its effect, and available decisions."
      />
      <RouteState kind="loading" title="Loading review details">
        <p>Checking the current record and available actions.</p>
      </RouteState>
    </section>
  );
}

function ApprovalDetailError({ error }: Readonly<{ error: unknown }>) {
  const denied = error instanceof ApiClientError && error.code === 'ACCESS_DENIED';
  useBoundaryPresentation(denied ? 'Permission denied' : 'Approval unavailable');
  return (
    <section className="grid gap-5">
      <PageHeader
        eyebrow="Approvals"
        title={denied ? 'Permission denied' : 'Approval unavailable'}
        description={
          denied
            ? 'Your account cannot access this approval.'
            : 'WorkLedger could not load this approval record. You can return to the inbox and try again.'
        }
      />
      <RouteState
        actionHref="/approvals"
        actionLabel="Back to approval inbox"
        kind={denied ? 'permission-denied' : 'error'}
        title={denied ? 'Approval access is limited' : 'Approval unavailable'}
      >
        <p>
          {denied
            ? 'Only an eligible reviewer in the current reporting scope can open this record.'
            : 'No decision was recorded.'}
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

function errorMessage(error: unknown): string {
  if (!(error instanceof ApiClientError))
    return 'WorkLedger could not record this action. No decision was saved.';
  if (error.code === 'APPROVAL_STATE_CONFLICT')
    return 'This approval changed before your action. The current record has been reloaded; review it before trying again.';
  if (error.code === 'ABSENCE_INSUFFICIENT_BALANCE')
    return 'This request exceeds the available entitlement. Approval requires an explicit HR override.';
  if (error.code === 'PERIOD_ADJUSTMENT_REQUIRED')
    return 'This correction affects a locked month and requires the post-lock adjustment workflow.';
  if (error.code === 'ACCESS_DENIED') return 'You do not have permission to perform this action.';
  return 'WorkLedger could not record this action. No decision was saved.';
}

function decisionSuccessMessage(action: ApprovalDecisionAction, status: string): string {
  return `${actionLabel(action, 'ABSENCE')} recorded. The approval is now ${decisionResultStatusLabel(status)}.`;
}

function decisionResultStatusLabel(status: string): string {
  return status.replaceAll('_', ' ').toLocaleLowerCase('en-US');
}

function workflowLabel(kind: ApprovalDetail['kind']): string {
  return kind === 'CORRECTION'
    ? 'correction request'
    : kind === 'CANCELLATION'
      ? 'absence cancellation'
      : 'absence request';
}

function actionLabel(action: ApprovalDecisionAction, kind: ApprovalDetail['kind']): string {
  if (action === 'ACKNOWLEDGE') return 'Acknowledge report';
  if (action === 'REQUEST_CHANGES') return 'Request changes';
  if (action === 'REJECT') return 'Reject';
  return kind === 'CORRECTION' ? 'Approve correction' : 'Approve';
}

function formatInstant(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );
}
