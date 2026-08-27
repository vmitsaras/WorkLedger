import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { EmployeeEntitlementAdminDetail } from '@workledger/contracts';
import type { MessageKey } from '@workledger/i18n';
import { useWorkLedgerMessage } from '@workledger/i18n/react';
import { Alert, Button, Panel, RouteState, TextField } from '@workledger/ui';

import { ApiClientError, createEntitlementAdjustmentForAdministration } from '../app/api-client.js';
import { formatDuration, formatLocalDate } from '../app/date-time-format.js';

type EntitlementEntryType =
  EmployeeEntitlementAdminDetail['accounts'][number]['entries'][number]['entryType'];

const ENTITLEMENT_ENTRY_TYPE_KEYS = Object.freeze({
  ALLOCATION: 'admin.employee.entitlement.entryType.allocation',
  APPROVED_DEDUCTION: 'admin.employee.entitlement.entryType.approvedDeduction',
  CANCELLATION_RESTORATION: 'admin.employee.entitlement.entryType.cancellationRestoration',
  CARRYOVER: 'admin.employee.entitlement.entryType.carryover',
  EXPIRY: 'admin.employee.entitlement.entryType.expiry',
  MANUAL_ADJUSTMENT: 'admin.employee.entitlement.entryType.manualAdjustment',
  PENDING_RESERVATION: 'admin.employee.entitlement.entryType.pendingReservation',
  RESERVATION_RELEASE: 'admin.employee.entitlement.entryType.reservationRelease',
} as const satisfies Readonly<Record<EntitlementEntryType, MessageKey>>);

export function EmployeeEntitlementAdministration({
  employeeId,
  entitlement,
}: Readonly<{ employeeId: string; entitlement: EmployeeEntitlementAdminDetail }>) {
  const t = useWorkLedgerMessage();
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
        text: t('admin.employee.entitlement.validation.required'),
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
        text: t('admin.employee.entitlement.feedback.added'),
      });
    } catch (error) {
      setMessage({ kind: 'error', text: adjustmentError(error, t) });
    }
  }
  return (
    <section className="grid gap-6" aria-labelledby="employee-entitlement-heading">
      <div>
        <h2 id="employee-entitlement-heading" className="m-0 text-2xl font-bold">
          {t('admin.employee.entitlement.heading')}
        </h2>
        <p className="mb-0 text-sm text-[var(--wl-text-muted)]">
          {t('admin.employee.entitlement.description')}
        </p>
      </div>
      {message === undefined ? null : (
        <Alert
          title={
            message.kind === 'error'
              ? t('admin.employee.entitlement.feedback.errorTitle')
              : t('admin.employee.entitlement.feedback.successTitle')
          }
          tone={message.kind === 'error' ? 'danger' : 'success'}
        >
          <p>{message.text}</p>
        </Alert>
      )}
      {entitlement.accounts.length === 0 ? (
        <RouteState kind="empty" title={t('admin.employee.entitlement.empty.title')}>
          {t('admin.employee.entitlement.empty.description')}
        </RouteState>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {entitlement.accounts.map((account) => (
            <Panel key={account.absenceTypeId} as="article" className="grid gap-3">
              <h3 className="m-0 text-xl font-bold">{account.absenceTypeName}</h3>
              <dl className="m-0 grid grid-cols-3 gap-3">
                <Value
                  label={t('admin.employee.entitlement.value.available')}
                  minutes={account.availableMinutes}
                />
                <Value
                  label={t('admin.employee.entitlement.value.reserved')}
                  minutes={account.reservedMinutes}
                />
                <Value
                  label={t('admin.employee.entitlement.value.projected')}
                  minutes={account.projectedRemainingMinutes}
                />
              </dl>
              {account.entries.length === 0 ? (
                <p className="mb-0">{t('admin.employee.entitlement.empty.entries')}</p>
              ) : (
                <ol className="m-0 grid gap-2 pl-5">
                  {account.entries.map((entry) => (
                    <li key={entry.id}>
                      <strong>{t(ENTITLEMENT_ENTRY_TYPE_KEYS[entry.entryType])}</strong>
                      {' · '}
                      {formatSigned(entry.minutes)}
                      {' · '}
                      {t('admin.employee.entitlement.entry.effective', {
                        date: formatLocalDate(entry.effectiveOn),
                      })}
                      {entry.reason === null ? null : (
                        <>
                          <br />
                          <span className="text-sm">
                            {t('admin.employee.entitlement.entry.reason', { reason: entry.reason })}
                          </span>
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
            <h3 className="m-0 text-xl font-bold">
              {t('admin.employee.entitlement.form.heading')}
            </h3>
            <p className="mb-0 text-sm text-[var(--wl-text-muted)]">
              {t('admin.employee.entitlement.form.description')}
            </p>
          </div>
          <label className="grid gap-2 text-sm font-semibold" htmlFor="entitlement-account">
            {t('admin.employee.entitlement.form.account')}
            <select
              id="entitlement-account"
              className="min-h-11 rounded-lg border px-3"
              value={absenceTypeId}
              onChange={(event) => setAbsenceTypeId(event.target.value)}
            >
              <option value="">{t('admin.employee.entitlement.form.chooseAccount')}</option>
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
            label={t('admin.employee.entitlement.form.minutes')}
            description={t('admin.employee.entitlement.form.minutesDescription')}
            value={minutes}
            onChange={setMinutes}
          />
          <label className="grid gap-2 text-sm font-semibold" htmlFor="entitlement-effective">
            {t('admin.employee.entitlement.form.effectiveOn')}
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
            label={t('admin.employee.entitlement.form.reason')}
            description={t('admin.employee.entitlement.form.reasonDescription')}
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
            {mutation.isPending
              ? t('admin.employee.entitlement.form.pending')
              : t('admin.employee.entitlement.form.submit')}
          </Button>
          {entitlement.adjustableAbsenceTypes.length === 0 ? (
            <p
              id="entitlement-adjustment-unavailable-reason"
              className="m-0 text-sm text-[var(--wl-text-muted)]"
            >
              {t('admin.employee.entitlement.form.unavailable')}
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
function adjustmentError(error: unknown, t: ReturnType<typeof useWorkLedgerMessage>): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'ENTITLEMENT_ADJUSTMENT_CONFLICT')
      return t('admin.employee.entitlement.error.conflict');
    if (error.code === 'ASSIGNMENT_EFFECTIVE_DATE_INVALID')
      return t('admin.employee.entitlement.error.effectiveDate');
  }
  return t('admin.employee.entitlement.error.generic');
}
