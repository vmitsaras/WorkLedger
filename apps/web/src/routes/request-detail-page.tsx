import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import type { PersonalRequestDetail, PersonalRequestHistory } from '@workledger/contracts';
import { Alert, Button, Panel, RouteState, buttonVariants } from '@workledger/ui';

import {
  ApiClientError,
  clearSessionMemory,
  submitAbsenceCancellation,
  withdrawAbsenceCancellation,
} from '../app/api-client.js';
import { formatDuration, formatLocalDate, formatTimeWithOffset } from '../app/date-time-format.js';
import { personalRequestDetailQuery } from '../app/query.js';
import { setPendingSignInNotice } from '../app/session-notice.js';
import { workflowStatusLabel } from '../app/workflow-status-presentation.js';
import { PageHeader } from '../components/page-header.js';
import { WorkflowStatusBadge } from '../components/workflow-status-badge.js';

type RequestCoverage = Extract<PersonalRequestDetail, { kind: 'ABSENCE' }>['coverage'];

export function RequestDetailPage() {
  const requestId = useParams()['requestId'];
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const query = useQuery({
    ...personalRequestDetailQuery(requestId ?? ''),
    enabled: requestId !== undefined,
  });
  const action = useMutation({
    mutationFn: async (detail: PersonalRequestDetail) => {
      if (detail.kind === 'ABSENCE') {
        await submitAbsenceCancellation(detail.id, { expectedRequestVersion: detail.version });
        return 'Cancellation requested. The absence remains effective until the request is approved.';
      }
      if (detail.kind === 'CANCELLATION') {
        await withdrawAbsenceCancellation(detail.id, detail.version);
        return 'Cancellation request withdrawn. The original absence remains unchanged.';
      }
      throw new Error('Unsupported personal request action');
    },
    onSuccess: async () => {
      if (requestId === undefined) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['self', 'request', requestId] }),
        queryClient.invalidateQueries({ queryKey: ['self', 'requests'] }),
      ]);
    },
  });

  useEffect(() => {
    if (!isAuthenticationError(query.error)) return;
    clearSessionMemory();
    queryClient.clear();
    if (query.error.code === 'AUTH_SESSION_EXPIRED') setPendingSignInNotice('SESSION_EXPIRED');
    void navigate('/sign-in', { replace: true });
  }, [navigate, query.error, queryClient]);

  if (requestId === undefined) return <RequestNotFound />;
  if (query.isPending) {
    return (
      <section className="grid max-w-4xl gap-6">
        <PageHeader
          eyebrow="Requests"
          title="Request details"
          description="Loading the current status, request details, and decision history."
        />
        <RouteState kind="loading" title="Loading request record">
          <p>WorkLedger is loading the current state and evidence.</p>
        </RouteState>
      </section>
    );
  }
  if (query.isError || query.data === undefined) {
    const denied = query.error instanceof ApiClientError && query.error.code === 'ACCESS_DENIED';
    const missing = query.error instanceof ApiClientError && query.error.code === 'ROUTE_NOT_FOUND';
    return (
      <section className="grid max-w-4xl gap-6">
        <PageHeader
          eyebrow="Requests"
          title={
            denied ? 'Permission denied' : missing ? 'Request not found' : 'Request unavailable'
          }
          description={
            denied
              ? 'You cannot view this request.'
              : missing
                ? 'This request does not exist or is no longer available.'
                : 'WorkLedger could not load this request. Your record was not changed.'
          }
        />
        {denied || missing ? (
          <Link className={`${buttonVariants({ variant: 'secondary' })} w-fit`} to="/requests">
            Back to My requests
          </Link>
        ) : (
          <Button className="w-fit" onPress={() => void query.refetch()}>
            Try again
          </Button>
        )}
      </section>
    );
  }

  const detail = query.data;
  return (
    <section className="grid max-w-5xl gap-8">
      <PageHeader
        eyebrow="Requests"
        title={detailTitle(detail)}
        description={dateRange(detail.affectedStartDate, detail.affectedEndDate)}
      >
        <Link className="w-fit font-semibold" to="/requests">
          Back to My requests
        </Link>
      </PageHeader>

      <section aria-labelledby="request-state-heading" className="grid gap-3">
        <h2 id="request-state-heading" className="m-0 text-xl font-bold">
          Current state
        </h2>
        <Panel className="grid gap-4" density="balanced">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <WorkflowStatusBadge status={detail.status} />
            <p className="m-0 text-sm text-[var(--wl-text-muted)]">
              Submitted {formatInstant(detail.submittedAt)}
            </p>
          </div>
          <p className="m-0">{stateExplanation(detail)}</p>
        </Panel>
      </section>

      {action.isSuccess ? (
        <Alert title="Request updated" tone="success">
          <p className="m-0">{action.data}</p>
        </Alert>
      ) : null}
      {action.isError ? (
        <Alert title="The request could not be updated" tone="danger">
          <p className="m-0">{actionError(action.error)}</p>
        </Alert>
      ) : null}

      {detail.availableActions.length === 0 ? null : (
        <section aria-labelledby="request-actions-heading" className="grid gap-3">
          <h2 id="request-actions-heading" className="m-0 text-xl font-bold">
            Available action
          </h2>
          <Panel className="grid gap-3" density="balanced">
            <p className="m-0">{actionEffect(detail)}</p>
            <Button
              className="w-fit"
              isDisabled={action.isPending}
              onPress={() => action.mutate(detail)}
              variant="secondary"
            >
              {action.isPending ? 'Updating request…' : actionLabel(detail)}
            </Button>
          </Panel>
        </section>
      )}

      {detail.kind === 'CORRECTION' ? <CorrectionEvidence detail={detail} /> : null}
      {detail.kind === 'ABSENCE' ? <AbsenceEvidence detail={detail} /> : null}
      {detail.kind === 'CANCELLATION' ? <CancellationEvidence detail={detail} /> : null}
      <DecisionHistory history={detail.history} />
    </section>
  );
}

function CorrectionEvidence({
  detail,
}: Readonly<{ detail: Extract<PersonalRequestDetail, { kind: 'CORRECTION' }> }>) {
  return (
    <section aria-labelledby="correction-evidence-heading" className="grid gap-4">
      <div className="grid gap-1">
        <h2 id="correction-evidence-heading" className="m-0 text-xl font-bold">
          Recorded facts and proposal
        </h2>
        <p className="m-0 text-sm text-[var(--wl-text-muted)]">
          Original punch events remain preserved. The proposal is a reviewed version, not a rewrite.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Panel as="article" className="grid gap-3" density="balanced">
          <h3 className="m-0 text-lg font-bold">Original calculation</h3>
          <dl className="grid grid-cols-2 gap-2">
            <Metric label="Expected" value={detail.originalCalculation.expectedMinutes} />
            <Metric label="Worked" value={detail.originalCalculation.workedMinutes} />
            <Metric label="Break" value={detail.originalCalculation.breakMinutes} />
            <Metric label="Credited" value={detail.originalCalculation.creditedMinutes} />
            <Metric label="Balance" signed value={detail.originalCalculation.balanceMinutes} />
          </dl>
        </Panel>
        <Panel as="article" className="grid gap-3" density="balanced">
          <h3 className="m-0 text-lg font-bold">Proposed interval</h3>
          <dl className="grid grid-cols-2 gap-2">
            <dt className="font-semibold">Starts</dt>
            <dd className="m-0">
              {formatTimeWithOffset(detail.proposedStartsAt, detail.timeZone)}
            </dd>
            <dt className="font-semibold">Ends</dt>
            <dd className="m-0">{formatTimeWithOffset(detail.proposedEndsAt, detail.timeZone)}</dd>
            <dt className="font-semibold">Application</dt>
            <dd className="m-0">
              {detail.applicationMode === 'POST_LOCK_ADJUSTMENT'
                ? 'Post lock adjustment'
                : 'Ordinary correction'}
            </dd>
          </dl>
        </Panel>
      </div>
      <Panel className="grid gap-3" density="balanced">
        <h3 className="m-0 text-lg font-bold">Reason provided</h3>
        <p className="m-0">{detail.requestReason}</p>
      </Panel>
      <Panel className="grid gap-3" density="balanced">
        <h3 className="m-0 text-lg font-bold">Preserved attendance events</h3>
        {detail.events.length === 0 ? (
          <p className="m-0">No punch event was recorded for this daily record.</p>
        ) : (
          <ol className="m-0 grid gap-2 pl-5">
            {detail.events.map((event) => (
              <li key={event.sequence}>
                {eventLabel(event.type)} at{' '}
                {formatTimeWithOffset(event.occurredAt, detail.timeZone)}
              </li>
            ))}
          </ol>
        )}
      </Panel>
    </section>
  );
}

function AbsenceEvidence({
  detail,
}: Readonly<{ detail: Extract<PersonalRequestDetail, { kind: 'ABSENCE' }> }>) {
  return (
    <section aria-labelledby="absence-evidence-heading" className="grid gap-4">
      <div className="grid gap-1">
        <h2 id="absence-evidence-heading" className="m-0 text-xl font-bold">
          Coverage and effect
        </h2>
        <p className="m-0 text-sm text-[var(--wl-text-muted)]">
          These absence details are available here so you can review your own request and its
          current effect.
        </p>
      </div>
      <Panel className="grid gap-3" density="balanced">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-semibold text-[var(--wl-text-muted)]">Absence type</dt>
            <dd className="m-0 mt-1 font-bold">{detail.absenceTypeName}</dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-[var(--wl-text-muted)]">Workflow</dt>
            <dd className="m-0 mt-1 font-bold">
              {detail.workflow === 'REPORT_AND_ACKNOWLEDGE'
                ? 'Effective when reported'
                : 'Effective after approval'}
            </dd>
          </div>
        </dl>
        <CoverageList coverage={detail.coverage} />
      </Panel>
      {detail.relatedCancellations.length === 0 ? null : (
        <Panel className="grid gap-3" density="balanced">
          <h3 className="m-0 text-lg font-bold">Cancellation requests</h3>
          <ul className="m-0 grid gap-2 pl-5">
            {detail.relatedCancellations.map((cancellation) => (
              <li key={cancellation.id}>
                <Link to={`/requests/${cancellation.id}`}>
                  {workflowStatusLabel(cancellation.status).toLocaleLowerCase('en-US')} cancellation
                  request
                </Link>{' '}
                submitted {formatInstant(cancellation.submittedAt)}
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </section>
  );
}

function CancellationEvidence({
  detail,
}: Readonly<{ detail: Extract<PersonalRequestDetail, { kind: 'CANCELLATION' }> }>) {
  return (
    <section aria-labelledby="cancellation-evidence-heading" className="grid gap-4">
      <div className="grid gap-1">
        <h2 id="cancellation-evidence-heading" className="m-0 text-xl font-bold">
          Requested cancellation
        </h2>
        <p className="m-0 text-sm text-[var(--wl-text-muted)]">
          Approval changes only the covered absence segments. The original absence history remains.
        </p>
      </div>
      <Panel className="grid gap-3" density="balanced">
        <p className="m-0">
          Absence type: <strong>{detail.absenceTypeName}</strong>
        </p>
        <CoverageList coverage={detail.coverage} />
        <Link className="w-fit font-semibold" to={`/requests/${detail.absenceRequestId}`}>
          View original absence request
        </Link>
      </Panel>
    </section>
  );
}

function CoverageList({ coverage }: Readonly<{ coverage: RequestCoverage }>) {
  return (
    <ul className="m-0 grid gap-2 pl-5" aria-label="Request coverage">
      {coverage.map((segment) => (
        <li key={`${segment.localDate}-${segment.kind}-${segment.startsAtMinute ?? ''}`}>
          {formatLocalDate(segment.localDate)}:{' '}
          {coverageLabel(segment.kind, segment.startsAtMinute, segment.endsAtMinute)},{' '}
          {formatDuration(segment.minutes)}
        </li>
      ))}
    </ul>
  );
}

function DecisionHistory({ history }: Readonly<{ history: readonly PersonalRequestHistory[] }>) {
  return (
    <section aria-labelledby="decision-history-heading" className="grid gap-4">
      <div className="grid gap-1">
        <h2 id="decision-history-heading" className="m-0 text-xl font-bold">
          Decision history
        </h2>
        <p className="m-0 text-sm text-[var(--wl-text-muted)]">
          Actions are shown in recorded order with their actor and reason when one was required.
        </p>
      </div>
      <ol className="m-0 grid list-none gap-3 p-0">
        {history.map((item, index) => (
          <li key={`${item.action}-${item.occurredAt}-${index}`}>
            <Panel as="article" className="grid gap-2" density="compact">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="m-0 text-base font-bold">{historyActionLabel(item.action)}</h3>
                <time className="text-sm text-[var(--wl-text-muted)]" dateTime={item.occurredAt}>
                  {formatInstant(item.occurredAt)}
                </time>
              </div>
              <p className="m-0 text-sm">By {actorLabel(item.actor)}</p>
              {item.reason === null ? null : <p className="m-0 text-sm">Reason: {item.reason}</p>}
            </Panel>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Metric({
  label,
  signed = false,
  value,
}: Readonly<{ label: string; signed?: boolean; value: number }>) {
  return (
    <>
      <dt className="font-semibold">{label}</dt>
      <dd className="m-0 text-right">{formatDuration(value, signed)}</dd>
    </>
  );
}

function RequestNotFound() {
  return (
    <section className="grid max-w-3xl gap-6">
      <PageHeader
        eyebrow="Requests"
        title="Request not found"
        description="The request identifier is missing. No record details were loaded."
      />
      <Link className={`${buttonVariants({ variant: 'secondary' })} w-fit`} to="/requests">
        Back to My requests
      </Link>
    </section>
  );
}

function detailTitle(detail: PersonalRequestDetail): string {
  if (detail.kind === 'CORRECTION') return 'Time correction';
  if (detail.kind === 'CANCELLATION') return 'Cancellation request';
  return detail.absenceTypeName;
}

function stateExplanation(detail: PersonalRequestDetail): string {
  if (detail.kind === 'CORRECTION') {
    if (detail.status === 'APPLIED')
      return 'The approved version has been applied while the original facts remain preserved.';
    if (detail.status === 'APPROVED')
      return 'The correction is approved and awaits its recorded application step.';
    if (detail.status === 'CHANGES_REQUESTED')
      return 'A reviewer requested changes. The current daily record remains unchanged.';
    if (detail.status === 'REJECTED' || detail.status === 'WITHDRAWN')
      return 'This workflow is complete. The current daily record remains unchanged.';
    return 'The proposal awaits review. The current daily record remains unchanged.';
  }
  if (detail.kind === 'CANCELLATION') {
    if (detail.status === 'APPROVED')
      return 'The covered absence segments were cancelled and the original request remains in history.';
    if (detail.status === 'WITHDRAWN')
      return 'The cancellation workflow ended without changing the original absence.';
    if (detail.status === 'REJECTED')
      return 'The cancellation was rejected. The original absence remains effective.';
    if (detail.status === 'CHANGES_REQUESTED')
      return 'A reviewer requested changes. The original absence remains effective.';
    return 'The cancellation awaits a decision. The original absence remains effective.';
  }
  if (detail.status === 'REPORTED' || detail.status === 'ACKNOWLEDGED')
    return 'This report is effective. Acknowledgement records review but does not change its effect.';
  if (detail.status === 'APPROVED' || detail.status === 'PARTIALLY_CANCELLED')
    return 'Approved coverage contributes according to the preserved schedule and policy versions.';
  if (detail.status === 'CANCELLED')
    return 'All covered segments were cancelled. The original request remains in history.';
  if (detail.status === 'REJECTED' || detail.status === 'WITHDRAWN')
    return 'This workflow is complete and does not add absence credit.';
  if (detail.status === 'CHANGES_REQUESTED')
    return 'A reviewer requested changes. The requested coverage is not yet approved.';
  return 'The request awaits a decision. Its calculated coverage is shown below.';
}

function actionLabel(detail: PersonalRequestDetail): string {
  return detail.kind === 'CANCELLATION' ? 'Withdraw cancellation request' : 'Request cancellation';
}

function actionEffect(detail: PersonalRequestDetail): string {
  return detail.kind === 'CANCELLATION'
    ? 'Withdrawing ends this cancellation workflow. It does not remove or change the original absence.'
    : 'Requesting cancellation starts a separate review. This absence remains effective until that request is approved.';
}

function actionError(error: unknown): string {
  if (error instanceof ApiClientError && error.code === 'PERIOD_ADJUSTMENT_REQUIRED')
    return 'This record is in a locked period. A post lock adjustment is required.';
  if (
    error instanceof ApiClientError &&
    (error.code === 'ABSENCE_CANNOT_CANCEL' || error.code === 'ABSENCE_STATE_CHANGED')
  )
    return 'The request changed before this action completed. Refresh the record and review its current state.';
  return 'Your record was not changed. Try again.';
}

function dateRange(start: string, end: string): string {
  return start === end
    ? formatLocalDate(start)
    : `${formatLocalDate(start)} through ${formatLocalDate(end)}`;
}

function formatInstant(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );
}

function coverageLabel(
  kind: 'FIRST_HALF' | 'FULL_DAY' | 'MINUTE_INTERVAL' | 'SECOND_HALF',
  startsAt: number | null,
  endsAt: number | null,
): string {
  if (kind === 'FULL_DAY') return 'full day';
  if (kind === 'FIRST_HALF') return 'first half of expected work';
  if (kind === 'SECOND_HALF') return 'second half of expected work';
  return `${formatMinute(startsAt)} to ${formatMinute(endsAt)}`;
}

function formatMinute(value: number | null): string {
  if (value === null) return 'unknown time';
  if (value === 1_440) return '24:00';
  const hours = Math.floor(value / 60) % 24;
  const minutes = value % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function isAuthenticationError(error: unknown): error is ApiClientError {
  return (
    error instanceof ApiClientError &&
    (error.code === 'AUTH_REQUIRED' || error.code === 'AUTH_SESSION_EXPIRED')
  );
}

function historyActionLabel(action: PersonalRequestHistory['action']): string {
  const labels: Record<PersonalRequestHistory['action'], string> = {
    ACKNOWLEDGE: 'Acknowledged',
    APPLY: 'Applied',
    APPROVE: 'Approved',
    CANCEL: 'Cancelled',
    REJECT: 'Rejected',
    REPORTED: 'Reported',
    REQUEST_CHANGES: 'Changes requested',
    SUBMITTED: 'Submitted',
    WITHDRAW: 'Withdrawn',
  };
  return labels[action];
}

function actorLabel(actor: PersonalRequestHistory['actor']): string {
  if (actor === 'SELF') return 'you';
  if (actor === 'REVIEWER') return 'a reviewer';
  return 'WorkLedger';
}

function eventLabel(value: string): string {
  return value
    .replaceAll('_', ' ')
    .toLocaleLowerCase()
    .replace(/^./u, (letter) => letter.toUpperCase());
}
