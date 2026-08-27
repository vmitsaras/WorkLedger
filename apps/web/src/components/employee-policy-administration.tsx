import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { EmployeePolicyAdminDetail } from '@workledger/contracts';
import { useWorkLedgerMessage } from '@workledger/i18n/react';
import { Alert, Button, Panel } from '@workledger/ui';

import { ApiClientError, replacePolicyAssignmentForAdministration } from '../app/api-client.js';
import { formatDuration, formatLocalDate } from '../app/date-time-format.js';

export function EmployeePolicyAdministration({
  employeeId,
  policy,
}: Readonly<{ employeeId: string; policy: EmployeePolicyAdminDetail }>) {
  const t = useWorkLedgerMessage();
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
      setMessage({ kind: 'error', text: t('admin.employee.policy.validation.version') });
      document.querySelector<HTMLElement>('#employee-policy-choice')?.focus();
      return;
    }
    if (effectiveFrom === '') {
      setMessage({ kind: 'error', text: t('admin.employee.policy.validation.effectiveFrom') });
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
        text: t('admin.employee.policy.feedback.updated'),
      });
    } catch (error) {
      setMessage({ kind: 'error', text: assignmentError(error, t) });
    }
  }

  return (
    <section className="grid gap-6" aria-labelledby="employee-policy-heading">
      <div>
        <h2 id="employee-policy-heading" className="m-0 text-2xl font-bold">
          {t('admin.employee.policy.heading')}
        </h2>
        <p className="m-0 mt-2 text-sm leading-6 text-[var(--wl-text-muted)]">
          {t('admin.employee.policy.description', {
            date: formatLocalDate(policy.asOfLocalDate),
          })}
        </p>
      </div>
      {message === undefined ? null : (
        <Alert
          title={
            message.kind === 'error'
              ? t('admin.employee.policy.feedback.errorTitle')
              : t('admin.employee.policy.feedback.successTitle')
          }
          tone={message.kind === 'error' ? 'danger' : 'success'}
        >
          <p>{message.text}</p>
        </Alert>
      )}
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel className="grid content-start gap-3" aria-labelledby="policy-current-heading">
          <h3 id="policy-current-heading" className="m-0 text-xl font-bold">
            {t('admin.employee.policy.current.heading')}
          </h3>
          {policy.currentAssignment === null ? (
            <p>{t('admin.employee.policy.current.none')}</p>
          ) : (
            <PolicySummary assignment={policy.currentAssignment} />
          )}
          {policy.coverageGaps.length === 0 ? (
            <p className="m-0 text-sm font-semibold">
              {t('admin.employee.policy.current.covered')}
            </p>
          ) : (
            <Alert
              announce={false}
              headingLevel="h3"
              title={t('admin.employee.policy.current.gapsTitle')}
              tone="danger"
            >
              <ul>
                {policy.coverageGaps.map((gap) => (
                  <li key={`${gap.startsOn}:${gap.endsOn ?? 'ongoing'}`}>
                    {t('admin.employee.policy.range', {
                      from: formatLocalDate(gap.startsOn),
                      to:
                        gap.endsOn === null
                          ? t('admin.employee.common.ongoing')
                          : formatLocalDate(gap.endsOn),
                    })}
                  </li>
                ))}
              </ul>
            </Alert>
          )}
        </Panel>
        <Panel className="grid content-start gap-3" aria-labelledby="policy-history-heading">
          <h3 id="policy-history-heading" className="m-0 text-xl font-bold">
            {t('admin.employee.policy.history.heading')}
          </h3>
          {policy.history.length === 0 ? (
            <p>{t('admin.employee.policy.history.none')}</p>
          ) : (
            <ol className="m-0 grid gap-3 pl-5">
              {policy.history.map((assignment) => (
                <li key={assignment.id}>
                  <PolicySummary assignment={assignment} />
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>
      {!policy.privilegedActionsAllowed ? null : (
        <form className="wl-panel grid max-w-3xl gap-4" onSubmit={submit}>
          <div>
            <h3 className="m-0 text-xl font-bold">{t('admin.employee.policy.form.heading')}</h3>
            <p className="m-0 mt-2 text-sm text-[var(--wl-text-muted)]">
              {t('admin.employee.policy.form.description')}
            </p>
          </div>
          <label className="grid gap-2 text-sm font-semibold" htmlFor="employee-policy-choice">
            {t('admin.employee.policy.form.version')}
            <select
              id="employee-policy-choice"
              className="min-h-11 rounded-lg border border-[var(--wl-border-strong)] bg-[var(--wl-surface-raised)] px-3"
              value={policyId}
              onChange={(event) => setPolicyId(event.target.value)}
            >
              <option value="">{t('admin.employee.policy.form.chooseVersion')}</option>
              {policy.assignablePolicies.map((option) => (
                <option key={option.id} value={option.id}>
                  {t('admin.employee.policy.option', {
                    name: option.name,
                    status: option.latestVersion
                      ? t('admin.employee.common.latest')
                      : t('admin.employee.common.historical'),
                    version: option.version,
                  })}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold" htmlFor="employee-policy-date">
            {t('admin.employee.common.effectiveFrom')}
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
              {t('admin.employee.policy.preview.heading')}
            </h4>
            {selected === undefined || effectiveFrom === '' ? (
              <p className="mb-0">{t('admin.employee.policy.preview.empty')}</p>
            ) : (
              <p className="mb-0">
                {t('admin.employee.policy.preview.description', {
                  date: formatLocalDate(effectiveFrom),
                  threshold: formatDuration(selected.rules.flexibleTimeWarningMinutes),
                })}
              </p>
            )}
          </section>
          <Button
            type="submit"
            {...(policy.assignablePolicies.length === 0
              ? { 'aria-describedby': 'employee-policy-unavailable-reason' }
              : {})}
            isDisabled={mutation.isPending || policy.assignablePolicies.length === 0}
          >
            {mutation.isPending
              ? t('admin.employee.policy.form.pending')
              : t('admin.employee.policy.form.submit')}
          </Button>
          {policy.assignablePolicies.length === 0 ? (
            <p
              id="employee-policy-unavailable-reason"
              className="m-0 text-sm text-[var(--wl-text-muted)]"
            >
              {t('admin.employee.policy.form.unavailable')}
            </p>
          ) : null}
        </form>
      )}
    </section>
  );
}

function PolicySummary({
  assignment,
}: Readonly<{ assignment: EmployeePolicyAdminDetail['history'][number] }>) {
  const t = useWorkLedgerMessage();
  return (
    <p className="m-0">
      <strong>
        {t('admin.employee.policy.versionLabel', {
          name: assignment.policy.name,
          version: assignment.policy.version,
        })}
      </strong>
      <br />
      {t('admin.employee.policy.summary', {
        from: formatLocalDate(assignment.startsOn),
        threshold: formatDuration(assignment.policy.rules.flexibleTimeWarningMinutes),
        to:
          assignment.endsOn === null
            ? t('admin.employee.common.ongoing')
            : formatLocalDate(assignment.endsOn),
      })}
    </p>
  );
}

function assignmentError(error: unknown, t: ReturnType<typeof useWorkLedgerMessage>): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'POLICY_NOT_ASSIGNED') return t('admin.employee.policy.error.notAssigned');
    if (error.code === 'ASSIGNMENT_EFFECTIVE_DATE_INVALID')
      return t('admin.employee.policy.error.effectiveDate');
    if (error.code === 'ASSIGNMENT_STATE_CONFLICT')
      return t('admin.employee.policy.error.stateConflict');
    if (error.code === 'POLICY_VERSION_CONFLICT')
      return t('admin.employee.policy.error.versionConflict');
    if (error.code === 'EMPLOYEE_STATE_CONFLICT')
      return t('admin.employee.policy.error.employeeState');
  }
  return t('admin.employee.policy.error.generic');
}
