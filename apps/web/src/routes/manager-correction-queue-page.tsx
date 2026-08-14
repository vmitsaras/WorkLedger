import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';

import { Button, buttonVariants } from '@workledger/ui';

import {
  ApiClientError,
  applyApprovedCorrectionRequest,
  decideManagerCorrectionRequest,
} from '../app/api-client.js';
import { formatDuration, formatLocalDate } from '../app/date-time-format.js';
import { managerCorrectionQueueQuery } from '../app/query.js';
import { PageHeader } from '../components/page-header.js';

export function ManagerCorrectionQueuePage() {
  const { approvalId } = useParams();
  const queryClient = useQueryClient();
  const query = useQuery(managerCorrectionQueueQuery());
  const [selected, setSelected] = useState<string | null>(approvalId ?? null);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<string>();
  const [pending, setPending] = useState(false);
  if (query.isPending)
    return (
      <section aria-busy="true" className="grid gap-5">
        <PageHeader
          eyebrow="Approvals"
          title="Correction requests"
          description="Loading pending correction requests…"
        />
      </section>
    );
  if (query.isError || query.data === undefined) return <QueueUnavailable error={query.error} />;
  const item = query.data.find((value) => value.id === selected) ?? null;
  async function decide(action: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES') {
    if (item === null) return;
    if (reason.trim().length < 10) {
      setMessage('Enter at least 10 characters explaining the decision.');
      return;
    }
    setPending(true);
    setMessage(undefined);
    try {
      await decideManagerCorrectionRequest(item.id, {
        action,
        expectedVersion: item.version,
        reason: reason.trim(),
      });
      await queryClient.invalidateQueries({ queryKey: ['manager', 'correction-requests'] });
      setSelected(null);
      setReason('');
      setMessage(
        action === 'APPROVE' && item.applicationMode === 'POST_LOCK_ADJUSTMENT'
          ? 'Decision recorded: approved. The linked post-lock adjustment was appended without changing the approved monthly record.'
          : `Decision recorded: ${action.replace('_', ' ').toLowerCase()}. This has not applied a correction.`,
      );
    } catch (error) {
      setMessage(
        error instanceof ApiClientError && error.code === 'APPROVAL_STATE_CONFLICT'
          ? 'This request changed before your decision. Refresh and review the current request.'
          : 'WorkLedger could not record this decision. No correction was applied.',
      );
    } finally {
      setPending(false);
    }
  }
  async function apply() {
    if (item === null) return;
    setPending(true);
    setMessage(undefined);
    try {
      const result = await applyApprovedCorrectionRequest(item.id, item.version);
      await queryClient.invalidateQueries({ queryKey: ['manager', 'correction-requests'] });
      setSelected(null);
      setMessage(
        `Correction applied. Worked time is now ${formatDuration(result.workedMinutes)}; the flexible-time balance changed by ${formatDuration(result.balanceDeltaMinutes, true)}.`,
      );
    } catch (error) {
      setMessage(
        error instanceof ApiClientError && error.code === 'PERIOD_ADJUSTMENT_REQUIRED'
          ? 'This correction affects a locked month. It requires the later post-lock adjustment workflow.'
          : 'WorkLedger could not apply this correction. No change was recorded.',
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="grid max-w-5xl gap-6">
      <PageHeader
        eyebrow="Approvals"
        title="Correction requests"
        description="Review only current direct reports. A decision does not change attendance, calculation, or balance yet."
      />
      <Link
        className={buttonVariants({ variant: 'secondary', className: 'w-fit' })}
        to="/approvals"
      >
        Back to approval inbox
      </Link>
      {message === undefined ? null : (
        <p role="status" className="wl-alert m-0 rounded-xl border p-4">
          {message}
        </p>
      )}
      {query.data.length === 0 ? (
        <p className="m-0 rounded-xl border border-[var(--wl-border)] p-4">
          No correction requests are waiting for your decision.
        </p>
      ) : (
        <div className="grid gap-4">
          {query.data.map((request) => (
            <article
              key={request.id}
              className="grid gap-3 rounded-xl border border-[var(--wl-border)] p-4"
            >
              <h2 className="m-0 text-lg font-bold">
                {request.employeeDisplayName} · {formatLocalDate(request.localDate)}
              </h2>
              <p className="m-0 text-sm">
                Submitted correction request · {request.status.replace('_', ' ').toLowerCase()}
                {request.applicationMode === 'POST_LOCK_ADJUSTMENT'
                  ? ' · locked-period adjustment'
                  : ''}
              </p>
              <Button
                type="button"
                variant="secondary"
                className="w-fit"
                onPress={() => {
                  setSelected(request.id);
                  setReason('');
                  setMessage(undefined);
                }}
              >
                Review request
              </Button>
            </article>
          ))}
        </div>
      )}
      {item === null ? null : (
        <section
          aria-labelledby="correction-review-heading"
          className="grid gap-5 rounded-xl border border-[var(--wl-border)] p-5"
        >
          <h2 id="correction-review-heading" className="m-0 text-xl font-bold">
            Review {item.employeeDisplayName}’s proposal
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <section>
              <h3 className="m-0 text-base font-bold">Original facts</h3>
              <p>
                Worked: {formatDuration(item.originalCalculation.workedMinutes)} · Balance:{' '}
                {formatDuration(item.originalCalculation.balanceMinutes, true)}
              </p>
              <ul>
                {item.events.map((event) => (
                  <li key={event.sequence}>
                    {event.type.replace('_', ' ').toLowerCase()} at {event.occurredAt}
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h3 className="m-0 text-base font-bold">Proposed interpretation</h3>
              <p>
                {item.proposedStartsAt} to {item.proposedEndsAt}
              </p>
              <p className="text-sm text-[var(--wl-text-muted)]">
                {item.applicationMode === 'POST_LOCK_ADJUSTMENT'
                  ? 'Approval appends the locked-period adjustment immediately and preserves the approved monthly record.'
                  : 'Approval must still be applied before the daily calculation changes.'}
              </p>
            </section>
          </div>
          <p>
            <strong>Employee reason:</strong> {item.reason}
          </p>
          {item.status === 'APPROVED' ? (
            <div className="grid gap-3">
              <p className="m-0">
                This request is approved but has not been applied. Applying it updates the unlocked
                daily record and adds an explainable balance delta.
              </p>
              <Button isDisabled={pending} className="w-fit" onPress={() => void apply()}>
                {pending ? 'Applying…' : 'Apply approved correction'}
              </Button>
            </div>
          ) : (
            <>
              <label className="grid gap-2" htmlFor="decision-reason">
                Decision reason
                <textarea
                  id="decision-reason"
                  className="min-h-24 rounded-lg border border-[var(--wl-border)] p-3"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
              </label>
              <div className="flex flex-wrap gap-3">
                <Button isDisabled={pending} onPress={() => void decide('APPROVE')}>
                  {pending
                    ? 'Recording…'
                    : item.applicationMode === 'POST_LOCK_ADJUSTMENT'
                      ? 'Approve and record adjustment'
                      : 'Approve for later application'}
                </Button>
                <Button
                  isDisabled={pending}
                  variant="secondary"
                  onPress={() => void decide('REQUEST_CHANGES')}
                >
                  Request changes
                </Button>
                <Button
                  isDisabled={pending}
                  variant="secondary"
                  onPress={() => void decide('REJECT')}
                >
                  Reject
                </Button>
              </div>
            </>
          )}
        </section>
      )}
    </section>
  );
}
function QueueUnavailable({ error }: Readonly<{ error: unknown }>) {
  const denied = error instanceof ApiClientError && error.code === 'ACCESS_DENIED';
  return (
    <section className="grid gap-5">
      <PageHeader
        eyebrow="Approvals"
        title={denied ? 'Permission denied' : 'Correction requests unavailable'}
        description={
          denied
            ? 'You do not have access to correction decisions.'
            : 'WorkLedger could not load correction requests.'
        }
      />
    </section>
  );
}
