import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { EmployeePolicyAdminDetail } from '@workledger/contracts';
import { Button } from '@workledger/ui';

import { ApiClientError, replacePolicyAssignmentForAdministration } from '../app/api-client.js';
import { formatDuration, formatLocalDate } from '../app/date-time-format.js';

export function EmployeePolicyAdministration({
  employeeId,
  policy,
}: Readonly<{ employeeId: string; policy: EmployeePolicyAdminDetail }>) {
  const queryClient = useQueryClient();
  const [policyId, setPolicyId] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [message, setMessage] = useState<Readonly<{ kind: 'error' | 'success'; text: string }>>();
  const mutation = useMutation({
    mutationFn: () =>
      replacePolicyAssignmentForAdministration(employeeId, { effectiveFrom, policyId }),
  });
  const selected = policy.assignablePolicies.find((candidate) => candidate.id === policyId);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(undefined);
    if (policyId === '') {
      setMessage({ kind: 'error', text: 'Choose a time-policy version.' });
      document.querySelector<HTMLElement>('#employee-policy-choice')?.focus();
      return;
    }
    if (effectiveFrom === '') {
      setMessage({ kind: 'error', text: 'Choose the date this policy begins.' });
      document.querySelector<HTMLElement>('#employee-policy-date')?.focus();
      return;
    }
    try {
      await mutation.mutateAsync();
      await queryClient.invalidateQueries({ queryKey: ['administration'] });
      setPolicyId('');
      setEffectiveFrom('');
      setMessage({
        kind: 'success',
        text: 'The time-policy assignment was updated. Earlier assignments and approved records are unchanged.',
      });
    } catch (error) {
      setMessage({ kind: 'error', text: assignmentError(error) });
    }
  }

  return (
    <section className="grid gap-6" aria-labelledby="employee-policy-heading">
      <div>
        <h2 id="employee-policy-heading" className="m-0 text-2xl font-bold">
          Time policy
        </h2>
        <p className="m-0 mt-2 text-sm leading-6 text-[var(--wl-text-muted)]">
          Current state is resolved for {formatLocalDate(policy.asOfLocalDate)}. Policy versions are
          immutable and changes may begin today or later.
        </p>
      </div>
      {message === undefined ? null : (
        <div
          role={message.kind === 'error' ? 'alert' : 'status'}
          className={`wl-alert ${message.kind === 'success' ? 'wl-alert-success' : 'wl-alert-error'} rounded-xl border p-4`}
        >
          {message.text}
        </div>
      )}
      <div className="grid gap-5 lg:grid-cols-2">
        <section
          className="wl-panel grid content-start gap-3"
          aria-labelledby="policy-current-heading"
        >
          <h3 id="policy-current-heading" className="m-0 text-xl font-bold">
            Current policy
          </h3>
          {policy.currentAssignment === null ? (
            <p>No time policy is currently assigned.</p>
          ) : (
            <PolicySummary assignment={policy.currentAssignment} />
          )}
          {policy.coverageGaps.length === 0 ? (
            <p className="m-0 text-sm font-semibold">
              Current and scheduled employment is covered.
            </p>
          ) : (
            <div className="wl-alert wl-alert-error rounded-xl border p-4">
              <strong>Policy coverage needs attention</strong>
              <ul>
                {policy.coverageGaps.map((gap) => (
                  <li key={`${gap.startsOn}:${gap.endsOn ?? 'ongoing'}`}>
                    {formatLocalDate(gap.startsOn)} to{' '}
                    {gap.endsOn === null ? 'ongoing' : formatLocalDate(gap.endsOn)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
        <section
          className="wl-panel grid content-start gap-3"
          aria-labelledby="policy-history-heading"
        >
          <h3 id="policy-history-heading" className="m-0 text-xl font-bold">
            Policy history
          </h3>
          {policy.history.length === 0 ? (
            <p>No policy assignment history.</p>
          ) : (
            <ol className="m-0 grid gap-3 pl-5">
              {policy.history.map((assignment) => (
                <li key={assignment.id}>
                  <PolicySummary assignment={assignment} />
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
      {!policy.privilegedActionsAllowed ? null : (
        <form className="wl-panel grid max-w-3xl gap-4" onSubmit={submit}>
          <div>
            <h3 className="m-0 text-xl font-bold">Preview and change time policy</h3>
            <p className="m-0 mt-2 text-sm text-[var(--wl-text-muted)]">
              Review the selected warning threshold and effective boundary before saving. Recorded
              and locked dates before that boundary retain their original policy reference.
            </p>
          </div>
          <label className="grid gap-2 text-sm font-semibold" htmlFor="employee-policy-choice">
            Time-policy version
            <select
              id="employee-policy-choice"
              className="min-h-11 rounded-lg border border-[var(--wl-border-strong)] bg-[var(--wl-surface-raised)] px-3"
              value={policyId}
              onChange={(event) => setPolicyId(event.target.value)}
            >
              <option value="">Choose a policy version</option>
              {policy.assignablePolicies.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name} · version {option.version}
                  {option.latestVersion ? ' (latest)' : ' (historical)'}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold" htmlFor="employee-policy-date">
            Effective from
            <input
              id="employee-policy-date"
              type="date"
              min={policy.asOfLocalDate}
              className="min-h-11 rounded-lg border border-[var(--wl-border-strong)] bg-[var(--wl-surface-raised)] px-3"
              value={effectiveFrom}
              onChange={(event) => setEffectiveFrom(event.target.value)}
            />
          </label>
          <section
            className="rounded-xl border border-[var(--wl-border)] p-4"
            aria-live="polite"
            aria-labelledby="policy-impact-heading"
          >
            <h4 id="policy-impact-heading" className="m-0 font-bold">
              Impact preview
            </h4>
            {selected === undefined || effectiveFrom === '' ? (
              <p className="mb-0">Choose a version and effective date to preview the change.</p>
            ) : (
              <p className="mb-0">
                From {formatLocalDate(effectiveFrom)}, warnings use a{' '}
                {formatDuration(selected.rules.flexibleTimeWarningMinutes)} flexible-time threshold.
                Breaks remain manual with warnings and time is not rounded. Earlier dates remain
                unchanged.
              </p>
            )}
          </section>
          <Button
            type="submit"
            isDisabled={mutation.isPending || policy.assignablePolicies.length === 0}
          >
            {mutation.isPending ? 'Saving policy…' : 'Save time policy'}
          </Button>
        </form>
      )}
    </section>
  );
}

function PolicySummary({
  assignment,
}: Readonly<{ assignment: EmployeePolicyAdminDetail['history'][number] }>) {
  return (
    <p className="m-0">
      <strong>
        {assignment.policy.name} · version {assignment.policy.version}
      </strong>
      <br />
      {formatLocalDate(assignment.startsOn)} to{' '}
      {assignment.endsOn === null ? 'ongoing' : formatLocalDate(assignment.endsOn)} ·{' '}
      {formatDuration(assignment.policy.rules.flexibleTimeWarningMinutes)} warning threshold · no
      rounding
    </p>
  );
}

function assignmentError(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'POLICY_NOT_ASSIGNED')
      return 'That change would leave current or future employed dates without a time policy.';
    if (error.code === 'ASSIGNMENT_EFFECTIVE_DATE_INVALID')
      return 'Choose today or a future date that is not already an assignment boundary.';
    if (error.code === 'ASSIGNMENT_STATE_CONFLICT')
      return 'That policy is already effective, or the assignment history changed.';
    if (error.code === 'POLICY_VERSION_CONFLICT')
      return 'The selected policy or assignment changed. Refresh and review the current state.';
    if (error.code === 'EMPLOYEE_STATE_CONFLICT')
      return 'Choose a date inside the employee’s current or scheduled employment period.';
  }
  return 'The time-policy assignment could not be updated. Try again.';
}
