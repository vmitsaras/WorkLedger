import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { EmployeeEntitlementAdminDetail } from '@workledger/contracts';
import { Alert, Button, Panel, RouteState, TextField } from '@workledger/ui';

import { ApiClientError, createEntitlementAdjustmentForAdministration } from '../app/api-client.js';
import { formatDuration, formatLocalDate } from '../app/date-time-format.js';

export function EmployeeEntitlementAdministration({
  employeeId,
  entitlement,
}: Readonly<{ employeeId: string; entitlement: EmployeeEntitlementAdminDetail }>) {
  const queryClient = useQueryClient();
  const [absenceTypeId, setAbsenceTypeId] = useState('');
  const [minutes, setMinutes] = useState('');
  const [effectiveOn, setEffectiveOn] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<Readonly<{ kind: 'error' | 'success'; text: string }>>();
  const mutation = useMutation({
    mutationFn: () =>
      createEntitlementAdjustmentForAdministration(employeeId, {
        absenceTypeId,
        effectiveOn,
        minutes: Number(minutes),
        reason,
      }),
  });
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(undefined);
    if (
      absenceTypeId === '' ||
      effectiveOn === '' ||
      !Number.isInteger(Number(minutes)) ||
      Number(minutes) === 0 ||
      reason.trim() === ''
    ) {
      setMessage({
        kind: 'error',
        text: 'Choose an account and effective date, enter non-zero integer minutes, and provide a reason.',
      });
      document.querySelector<HTMLElement>('#entitlement-account')?.focus();
      return;
    }
    try {
      await mutation.mutateAsync();
      await queryClient.invalidateQueries({ queryKey: ['administration'] });
      setMinutes('');
      setReason('');
      setMessage({
        kind: 'success',
        text: 'The entitlement adjustment was added. Prior entries remain unchanged.',
      });
    } catch (error) {
      setMessage({ kind: 'error', text: adjustmentError(error) });
    }
  }
  return (
    <section className="grid gap-6" aria-labelledby="employee-entitlement-heading">
      <div>
        <h2 id="employee-entitlement-heading" className="m-0 text-2xl font-bold">
          Leave entitlement
        </h2>
        <p className="mb-0 text-sm text-[var(--wl-text-muted)]">
          Each adjustment records whole minutes. Positive minutes add entitlement, while negative
          minutes reduce it.
        </p>
      </div>
      {message === undefined ? null : (
        <Alert
          title={
            message.kind === 'error' ? 'Entitlement update failed' : 'Entitlement adjustment added'
          }
          tone={message.kind === 'error' ? 'danger' : 'success'}
        >
          <p>{message.text}</p>
        </Alert>
      )}
      {entitlement.accounts.length === 0 ? (
        <RouteState kind="empty" title="No entitlement backed absence type is available">
          Configure an entitlement backed absence type before managing employee leave balances.
        </RouteState>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {entitlement.accounts.map((account) => (
            <Panel key={account.absenceTypeId} as="article" className="grid gap-3">
              <h3 className="m-0 text-xl font-bold">{account.absenceTypeName}</h3>
              <dl className="m-0 grid grid-cols-3 gap-3">
                <Value label="Available" minutes={account.availableMinutes} />
                <Value label="Reserved" minutes={account.reservedMinutes} />
                <Value label="Projected" minutes={account.projectedRemainingMinutes} />
              </dl>
              {account.entries.length === 0 ? (
                <p className="mb-0">No entitlement ledger entries.</p>
              ) : (
                <ol className="m-0 grid gap-2 pl-5">
                  {account.entries.map((entry) => (
                    <li key={entry.id}>
                      <strong>{entry.entryType.replaceAll('_', ' ').toLowerCase()}</strong> ·{' '}
                      {formatSigned(entry.minutes)} · effective {formatLocalDate(entry.effectiveOn)}
                      {entry.reason === null ? null : (
                        <>
                          <br />
                          <span className="text-sm">Reason: {entry.reason}</span>
                        </>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </Panel>
          ))}
        </div>
      )}
      {!entitlement.privilegedActionsAllowed ? null : (
        <form className="wl-panel grid max-w-3xl gap-4" onSubmit={submit} noValidate>
          <div>
            <h3 className="m-0 text-xl font-bold">Append entitlement adjustment</h3>
            <p className="mb-0 text-sm text-[var(--wl-text-muted)]">
              Adjustments may take effect today or later. The employee can see the reason in their
              entitlement history, and it is included in the audit record.
            </p>
          </div>
          <label className="grid gap-2 text-sm font-semibold" htmlFor="entitlement-account">
            Entitlement account
            <select
              id="entitlement-account"
              className="min-h-11 rounded-lg border px-3"
              value={absenceTypeId}
              onChange={(event) => setAbsenceTypeId(event.target.value)}
            >
              <option value="">Choose an account</option>
              {entitlement.adjustableAbsenceTypes.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>
          <TextField
            id="entitlement-minutes"
            type="number"
            label="Adjustment minutes"
            description="Use a positive or negative whole-minute amount; zero is not an adjustment."
            value={minutes}
            onChange={setMinutes}
          />
          <label className="grid gap-2 text-sm font-semibold" htmlFor="entitlement-effective">
            Effective on
            <input
              id="entitlement-effective"
              type="date"
              min={entitlement.asOfLocalDate}
              className="min-h-11 rounded-lg border px-3"
              value={effectiveOn}
              onChange={(event) => setEffectiveOn(event.target.value)}
            />
          </label>
          <TextField
            id="entitlement-reason"
            label="Reason"
            description="Required. Do not enter sickness or medical details."
            value={reason}
            onChange={setReason}
          />
          <Button
            type="submit"
            {...(entitlement.adjustableAbsenceTypes.length === 0
              ? { 'aria-describedby': 'entitlement-adjustment-unavailable-reason' }
              : {})}
            isDisabled={mutation.isPending || entitlement.adjustableAbsenceTypes.length === 0}
          >
            {mutation.isPending ? 'Appending adjustment…' : 'Append entitlement adjustment'}
          </Button>
          {entitlement.adjustableAbsenceTypes.length === 0 ? (
            <p
              id="entitlement-adjustment-unavailable-reason"
              className="m-0 text-sm text-[var(--wl-text-muted)]"
            >
              Configure an active entitlement backed absence type before appending an adjustment.
            </p>
          ) : null}
        </form>
      )}
    </section>
  );
}
function Value({ label, minutes }: Readonly<{ label: string; minutes: number }>) {
  return (
    <div>
      <dt className="text-sm text-[var(--wl-text-muted)]">{label}</dt>
      <dd className="m-0 font-bold">{formatSigned(minutes)}</dd>
    </div>
  );
}
function formatSigned(minutes: number) {
  return `${minutes > 0 ? '+' : minutes < 0 ? '−' : ''}${formatDuration(Math.abs(minutes))}`;
}
function adjustmentError(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'ENTITLEMENT_ADJUSTMENT_CONFLICT')
      return 'The selected account is unavailable or the employee state changed.';
    if (error.code === 'ASSIGNMENT_EFFECTIVE_DATE_INVALID')
      return 'Choose today or a future effective date.';
  }
  return 'The entitlement adjustment could not be appended. Try again.';
}
