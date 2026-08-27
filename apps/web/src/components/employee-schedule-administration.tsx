import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { EmployeeScheduleAdminDetail } from '@workledger/contracts';
import { useWorkLedgerMessage } from '@workledger/i18n/react';
import { Alert, Button, Panel } from '@workledger/ui';

import { ApiClientError, replaceScheduleAssignmentForAdministration } from '../app/api-client.js';
import { formatDuration, formatLocalDate } from '../app/date-time-format.js';

export function EmployeeScheduleAdministration({
  employeeId,
  schedule,
}: Readonly<{ employeeId: string; schedule: EmployeeScheduleAdminDetail }>) {
  const t = useWorkLedgerMessage();
  const queryClient = useQueryClient();
  const [scheduleId, setScheduleId] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [message, setMessage] = useState<Readonly<{ kind: 'error' | 'success'; text: string }>>();
  const mutation = useMutation({
    mutationFn: () =>
      replaceScheduleAssignmentForAdministration(employeeId, { effectiveFrom, scheduleId }),
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(undefined);
    if (scheduleId === '') {
      setMessage({ kind: 'error', text: t('admin.employee.schedule.validation.version') });
      document.querySelector<HTMLElement>('#employee-schedule-choice')?.focus();
      return;
    }
    if (effectiveFrom === '') {
      setMessage({ kind: 'error', text: t('admin.employee.schedule.validation.effectiveFrom') });
      document.querySelector<HTMLElement>('#employee-schedule-date')?.focus();
      return;
    }
    try {
      await mutation.mutateAsync();
      await queryClient.invalidateQueries({ queryKey: ['administration'] });
      setScheduleId('');
      setEffectiveFrom('');
      setMessage({
        kind: 'success',
        text: t('admin.employee.schedule.feedback.updated'),
      });
    } catch (error) {
      setMessage({ kind: 'error', text: scheduleAssignmentError(error, t) });
    }
  }

  return (
    <section className="grid gap-6" aria-labelledby="employee-schedule-heading">
      <div>
        <h2 id="employee-schedule-heading" className="m-0 text-2xl font-bold">
          {t('admin.employee.schedule.heading')}
        </h2>
        <p className="m-0 mt-2 text-sm leading-6 text-[var(--wl-text-muted)]">
          {t('admin.employee.schedule.description', {
            date: formatLocalDate(schedule.asOfLocalDate),
          })}
        </p>
      </div>

      {message === undefined ? null : (
        <Alert
          title={
            message.kind === 'error'
              ? t('admin.employee.schedule.feedback.errorTitle')
              : t('admin.employee.schedule.feedback.successTitle')
          }
          tone={message.kind === 'error' ? 'danger' : 'success'}
        >
          <p>{message.text}</p>
        </Alert>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel className="grid content-start gap-4" aria-labelledby="schedule-current-heading">
          <h3 id="schedule-current-heading" className="m-0 text-xl font-bold">
            {t('admin.employee.schedule.current.heading')}
          </h3>
          {schedule.currentAssignment === null ? (
            <p className="m-0 font-semibold">{t('admin.employee.schedule.current.none')}</p>
          ) : (
            <div className="grid gap-2">
              <p className="m-0 text-lg font-bold">
                {t('admin.employee.schedule.versionLabel', {
                  name: schedule.currentAssignment.schedule.name,
                  version: schedule.currentAssignment.schedule.version,
                })}
              </p>
              <p className="m-0">
                {t('admin.employee.schedule.current.detail', {
                  effectiveFrom: formatLocalDate(schedule.currentAssignment.startsOn),
                  weeklyTotal: formatDuration(
                    schedule.currentAssignment.schedule.weeklyTotalMinutes,
                  ),
                })}
              </p>
            </div>
          )}
          {schedule.coverageGaps.length === 0 ? (
            <p className="m-0 text-sm font-semibold">
              {t('admin.employee.schedule.current.covered')}
            </p>
          ) : (
            <Alert
              announce={false}
              headingLevel="h3"
              title={t('admin.employee.schedule.current.gapsTitle')}
              tone="danger"
            >
              <ul className="m-0 grid gap-1 pl-5 text-sm">
                {schedule.coverageGaps.map((gap) => (
                  <li key={`${gap.startsOn}:${gap.endsOn ?? 'ongoing'}`}>
                    {t('admin.employee.schedule.range', {
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

        <Panel className="grid content-start gap-4" aria-labelledby="schedule-history-heading">
          <h3 id="schedule-history-heading" className="m-0 text-xl font-bold">
            {t('admin.employee.schedule.history.heading')}
          </h3>
          {schedule.history.length === 0 ? (
            <p className="m-0">{t('admin.employee.schedule.history.none')}</p>
          ) : (
            <ol className="m-0 grid gap-3 pl-5">
              {schedule.history.map((assignment) => (
                <li key={assignment.id}>
                  <strong>
                    {t('admin.employee.schedule.versionLabel', {
                      name: assignment.schedule.name,
                      version: assignment.schedule.version,
                    })}
                  </strong>
                  <br />
                  {t('admin.employee.schedule.history.item', {
                    from: formatLocalDate(assignment.startsOn),
                    to:
                      assignment.endsOn === null
                        ? t('admin.employee.common.ongoing')
                        : formatLocalDate(assignment.endsOn),
                    weeklyTotal: formatDuration(assignment.schedule.weeklyTotalMinutes),
                  })}
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>

      {!schedule.privilegedActionsAllowed ? null : (
        <form className="wl-panel grid max-w-3xl gap-4" onSubmit={submit}>
          <div>
            <h3 className="m-0 text-xl font-bold">{t('admin.employee.schedule.form.heading')}</h3>
            <p className="m-0 mt-2 text-sm leading-6 text-[var(--wl-text-muted)]">
              {t('admin.employee.schedule.form.description')}
            </p>
          </div>
          <label className="grid gap-2 text-sm font-semibold" htmlFor="employee-schedule-choice">
            {t('admin.employee.schedule.form.version')}
            <select
              id="employee-schedule-choice"
              className="min-h-11 rounded-lg border border-[var(--wl-border-strong)] bg-[var(--wl-surface-raised)] px-3"
              value={scheduleId}
              onChange={(event) => setScheduleId(event.target.value)}
            >
              <option value="">{t('admin.employee.schedule.form.chooseVersion')}</option>
              {schedule.assignableSchedules.map((option) => (
                <option key={option.id} value={option.id}>
                  {t('admin.employee.schedule.option', {
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
          <label className="grid gap-2 text-sm font-semibold" htmlFor="employee-schedule-date">
            {t('admin.employee.common.effectiveFrom')}
            <input
              id="employee-schedule-date"
              type="date"
              min={schedule.asOfLocalDate}
              className="min-h-11 rounded-lg border border-[var(--wl-border-strong)] bg-[var(--wl-surface-raised)] px-3"
              value={effectiveFrom}
              onChange={(event) => setEffectiveFrom(event.target.value)}
            />
          </label>
          <Button
            type="submit"
            {...(schedule.assignableSchedules.length === 0
              ? { 'aria-describedby': 'employee-schedule-unavailable-reason' }
              : {})}
            isDisabled={mutation.isPending || schedule.assignableSchedules.length === 0}
          >
            {mutation.isPending
              ? t('admin.employee.schedule.form.pending')
              : t('admin.employee.schedule.form.submit')}
          </Button>
          {schedule.assignableSchedules.length === 0 ? (
            <p
              id="employee-schedule-unavailable-reason"
              className="m-0 text-sm text-[var(--wl-text-muted)]"
            >
              {t('admin.employee.schedule.form.unavailable')}
            </p>
          ) : null}
        </form>
      )}
    </section>
  );
}

function scheduleAssignmentError(
  error: unknown,
  t: ReturnType<typeof useWorkLedgerMessage>,
): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'SCHEDULE_NOT_ASSIGNED') {
      return t('admin.employee.schedule.error.notAssigned');
    }
    if (error.code === 'ASSIGNMENT_EFFECTIVE_DATE_INVALID') {
      return t('admin.employee.schedule.error.effectiveDate');
    }
    if (error.code === 'ASSIGNMENT_STATE_CONFLICT') {
      return t('admin.employee.schedule.error.stateConflict');
    }
    if (error.code === 'SCHEDULE_VERSION_CONFLICT') {
      return t('admin.employee.schedule.error.versionConflict');
    }
    if (error.code === 'EMPLOYEE_STATE_CONFLICT') {
      return t('admin.employee.schedule.error.employeeState');
    }
  }
  return t('admin.employee.schedule.error.generic');
}
