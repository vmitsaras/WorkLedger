import { useEffect, useRef, useState, type FormEvent, type RefObject } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router';

import type {
  ApprovalDecisionAction,
  ApprovalDecisionRequest,
  ApprovalDetail,
} from '@workledger/contracts';
import { buttonVariants } from '@workledger/ui';

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
  const feedbackRef = useRef<HTMLDivElement>(null);
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
        description="Review the current authorized record before choosing one explicit outcome. Changes are never applied optimistically."
      />
      <Link
        className={buttonVariants({ variant: 'secondary', className: 'w-fit' })}
        to="/approvals"
      >
        Back to approval inbox
      </Link>
      {feedback === undefined ? null : (
        <div
          ref={feedbackRef}
          role={feedbackIsError ? 'alert' : 'status'}
          tabIndex={-1}
          className="wl-alert rounded-xl border p-4 outline-none focus-visible:ring-2"
        >
          {feedback}
        </div>
      )}
      <ApprovalSummary detail={detail} />
      {detail.availableActions.includes('APPLY_CORRECTION') && detail.kind === 'CORRECTION' ? (
        <section
          aria-labelledby="apply-correction-heading"
          className="grid gap-3 rounded-xl border border-[var(--wl-border)] p-5"
        >
          <h2 id="apply-correction-heading" className="m-0 text-xl font-bold">
            Apply approved correction
          </h2>
          <p className="m-0">
            {detail.applicationMode === 'POST_LOCK_ADJUSTMENT'
              ? 'Applying appends a post-lock adjustment and preserves the immutable approved monthly record.'
              : 'Applying updates the unlocked daily record and records an explainable balance delta.'}
          </p>
          <button
            className={buttonVariants({ className: 'w-fit' })}
            disabled={pending}
            type="button"
            onClick={() => applyCorrection.mutate(detail)}
          >
            {applyCorrection.isPending ? 'Applying…' : 'Apply correction'}
          </button>
        </section>
      ) : decisionActions.length > 0 ? (
        <form
          className="grid gap-5 rounded-xl border border-[var(--wl-border)] p-5"
          onSubmit={submit}
          noValidate
        >
          <div>
            <h2 className="m-0 text-xl font-bold">Record a decision</h2>
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
          <p id="approval-decision-reason-help" className="m-0 text-sm text-[var(--wl-text-muted)]">
            The reason is stored with the decision and is not shown in the minimized inbox.
          </p>
          {reasonError === undefined ? null : (
            <p
              id="approval-decision-reason-error"
              className="wl-alert wl-alert-error m-0 rounded-xl border p-3"
            >
              {reasonError}
            </p>
          )}
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
                <br />I have reviewed the projected entitlement balance and am making an explicit HR
                exception.
              </span>
            </label>
          ) : null}
          <div className="flex flex-wrap gap-3">
            {decisionActions.map((action) => (
              <button
                key={action}
                className={buttonVariants({
                  variant:
                    action === 'APPROVE' || action === 'ACKNOWLEDGE' ? 'primary' : 'secondary',
                })}
                disabled={pending}
                name="decision-action"
                type="submit"
                value={action}
              >
                {decision.isPending && decision.variables?.action === action
                  ? 'Recording…'
                  : actionLabel(action, detail.kind)}
              </button>
            ))}
          </div>
        </form>
      ) : (
        <p className="m-0 rounded-xl border border-[var(--wl-border)] p-4">
          This approval has no action available in its current state.
        </p>
      )}
    </section>
  );
}

function ApprovalSummary({ detail }: Readonly<{ detail: ApprovalDetail }>) {
  return (
    <article className="grid gap-5 rounded-xl border border-[var(--wl-border)] p-5">
      <div>
        <h2 className="m-0 text-xl font-bold">{detail.employeeDisplayName}</h2>
        <p className="m-0 mt-1">
          {formatLocalDate(detail.affectedStartDate)}
          {detail.affectedStartDate === detail.affectedEndDate
            ? ''
            : ` to ${formatLocalDate(detail.affectedEndDate)}`}{' '}
          · {statusLabel(detail.status)}
        </p>
      </div>
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
            <strong>Application path:</strong>{' '}
            {detail.applicationMode === 'POST_LOCK_ADJUSTMENT'
              ? 'Locked-period adjustment. Approval appends an adjustment immediately; the approved monthly record is preserved.'
              : 'Ordinary correction. Approval is followed by a separate application step to the unlocked daily record.'}
          </p>
          <section>
            <h3 className="m-0 text-base font-bold">Immutable punch events</h3>
            <ul>
              {detail.events.map((event) => (
                <li key={event.sequence}>
                  {event.type.replaceAll('_', ' ').toLowerCase()} ·{' '}
                  {formatInstant(event.occurredAt)}
                </li>
              ))}
            </ul>
          </section>
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
          <div className="overflow-x-auto" role="region" aria-label="Absence coverage" tabIndex={0}>
            <table className="w-full min-w-[34rem] border-collapse text-left">
              <caption className="sr-only">Dates and minutes covered by this approval</caption>
              <thead>
                <tr>
                  <th className="p-3" scope="col">
                    Date
                  </th>
                  <th className="p-3" scope="col">
                    Coverage
                  </th>
                  <th className="p-3" scope="col">
                    Minutes
                  </th>
                </tr>
              </thead>
              <tbody>
                {detail.coverage.map((segment, index) => (
                  <tr
                    className="border-t border-[var(--wl-border)]"
                    key={`${segment.localDate}-${index}`}
                  >
                    <th className="p-3" scope="row">
                      {formatLocalDate(segment.localDate)}
                    </th>
                    <td className="p-3">{segment.kind.replaceAll('_', ' ').toLowerCase()}</td>
                    <td className="p-3">{formatDuration(segment.minutes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </article>
  );
}

function ApprovalDetailLoading() {
  return (
    <section aria-busy="true">
      <PageHeader
        eyebrow="Approvals"
        title="Loading approval"
        description="Loading the current authorized record…"
      />
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
            ? 'Your account cannot access this approval. No restricted details were disclosed.'
            : 'WorkLedger could not load this approval record.'
        }
      />
      <Link
        className={buttonVariants({ variant: 'secondary', className: 'w-fit' })}
        to="/approvals"
      >
        Back to approval inbox
      </Link>
    </section>
  );
}

function focusFeedback(ref: RefObject<HTMLDivElement | null>) {
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
  if (error.code === 'ACCESS_DENIED')
    return 'Your current account is not authorized to perform this action.';
  return 'WorkLedger could not record this action. No decision was saved.';
}

function decisionSuccessMessage(action: ApprovalDecisionAction, status: string): string {
  return `${actionLabel(action, 'ABSENCE')} recorded. The approval is now ${statusLabel(status)}.`;
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

function statusLabel(status: string): string {
  return status.replaceAll('_', ' ').toLowerCase();
}

function formatInstant(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );
}
