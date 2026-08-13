import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiClientError, decideManagerCorrectionRequest } from '../app/api-client.js';
import { formatDuration, formatLocalDate } from '../app/date-time-format.js';
import { managerCorrectionQueueQuery } from '../app/query.js';
import { PageHeader } from '../components/page-header.js';

export function ManagerCorrectionQueuePage() {
  const queryClient = useQueryClient();
  const query = useQuery(managerCorrectionQueueQuery());
  const [selected, setSelected] = useState<string | null>(null);
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
        `Decision recorded: ${action.replace('_', ' ').toLowerCase()}. This has not applied a correction.`,
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
  return (
    <section className="grid max-w-5xl gap-6">
      <PageHeader
        eyebrow="Approvals"
        title="Correction requests"
        description="Review only current direct reports. A decision does not change attendance, calculation, or balance yet."
      />
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
              </p>
              <button
                type="button"
                className="wl-button-secondary w-fit"
                onClick={() => {
                  setSelected(request.id);
                  setReason('');
                  setMessage(undefined);
                }}
              >
                Review request
              </button>
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
                No calculation impact is shown or applied until the later application step.
              </p>
            </section>
          </div>
          <p>
            <strong>Employee reason:</strong> {item.reason}
          </p>
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
            <button
              disabled={pending}
              className="wl-button-primary"
              onClick={() => void decide('APPROVE')}
            >
              {pending ? 'Recording…' : 'Approve for later application'}
            </button>
            <button
              disabled={pending}
              className="wl-button-secondary"
              onClick={() => void decide('REQUEST_CHANGES')}
            >
              Request changes
            </button>
            <button
              disabled={pending}
              className="wl-button-secondary"
              onClick={() => void decide('REJECT')}
            >
              Reject
            </button>
          </div>
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
