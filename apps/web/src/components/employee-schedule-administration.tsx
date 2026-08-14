import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { EmployeeScheduleAdminDetail } from '@workledger/contracts';
import { Button } from '@workledger/ui';

import { ApiClientError, replaceScheduleAssignmentForAdministration } from '../app/api-client.js';
import { formatDuration, formatLocalDate } from '../app/date-time-format.js';

export function EmployeeScheduleAdministration({
  employeeId,
  schedule,
}: Readonly<{ employeeId: string; schedule: EmployeeScheduleAdminDetail }>) {
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
      setMessage({ kind: 'error', text: 'Choose a weekly schedule version.' });
      document.querySelector<HTMLElement>('#employee-schedule-choice')?.focus();
      return;
    }
    if (effectiveFrom === '') {
      setMessage({ kind: 'error', text: 'Choose the date this schedule begins.' });
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
        text: 'The schedule assignment was updated. Earlier assignment and approved-period history is unchanged.',
      });
    } catch (error) {
      setMessage({ kind: 'error', text: scheduleAssignmentError(error) });
    }
  }

  return (
    <section className="grid gap-6" aria-labelledby="employee-schedule-heading">
      <div>
        <h2 id="employee-schedule-heading" className="m-0 text-2xl font-bold">
          Weekly schedule
        </h2>
        <p className="m-0 mt-2 text-sm leading-6 text-[var(--wl-text-muted)]">
          Current state is resolved for {formatLocalDate(schedule.asOfLocalDate)}. Changes may begin
          today or later, preserve earlier rows, and cannot leave current or future employed dates
          without a schedule.
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
          className="wl-panel grid content-start gap-4"
          aria-labelledby="schedule-current-heading"
        >
          <h3 id="schedule-current-heading" className="m-0 text-xl font-bold">
            Current schedule
          </h3>
          {schedule.currentAssignment === null ? (
            <p className="m-0 font-semibold">No weekly schedule is currently assigned.</p>
          ) : (
            <div className="grid gap-2">
              <p className="m-0 text-lg font-bold">
                {schedule.currentAssignment.schedule.name} · version{' '}
                {schedule.currentAssignment.schedule.version}
              </p>
              <p className="m-0">
                {formatDuration(schedule.currentAssignment.schedule.weeklyTotalMinutes)} per week,
                effective {formatLocalDate(schedule.currentAssignment.startsOn)}
              </p>
            </div>
          )}
          {schedule.coverageGaps.length === 0 ? (
            <p className="m-0 text-sm font-semibold">
              Current and scheduled employment is covered.
            </p>
          ) : (
            <div className="wl-alert wl-alert-error grid gap-2 rounded-xl border p-4">
              <h4 className="m-0 text-base font-bold">Schedule coverage needs attention</h4>
              <ul className="m-0 grid gap-1 pl-5 text-sm">
                {schedule.coverageGaps.map((gap) => (
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
          className="wl-panel grid content-start gap-4"
          aria-labelledby="schedule-history-heading"
        >
          <h3 id="schedule-history-heading" className="m-0 text-xl font-bold">
            Schedule history
          </h3>
          {schedule.history.length === 0 ? (
            <p className="m-0">No schedule assignment history.</p>
          ) : (
            <ol className="m-0 grid gap-3 pl-5">
              {schedule.history.map((assignment) => (
                <li key={assignment.id}>
                  <strong>
                    {assignment.schedule.name} · version {assignment.schedule.version}
                  </strong>
                  <br />
                  {formatLocalDate(assignment.startsOn)} to{' '}
                  {assignment.endsOn === null ? 'ongoing' : formatLocalDate(assignment.endsOn)} ·{' '}
                  {formatDuration(assignment.schedule.weeklyTotalMinutes)} per week
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {!schedule.privilegedActionsAllowed ? null : (
        <form className="wl-panel grid max-w-3xl gap-4" onSubmit={submit}>
          <div>
            <h3 className="m-0 text-xl font-bold">Change weekly schedule</h3>
            <p className="m-0 mt-2 text-sm leading-6 text-[var(--wl-text-muted)]">
              A future change closes only the schedule effective at that boundary. Any already
              scheduled later assignment remains in place.
            </p>
          </div>
          <label className="grid gap-2 text-sm font-semibold" htmlFor="employee-schedule-choice">
            Weekly schedule version
            <select
              id="employee-schedule-choice"
              className="min-h-11 rounded-lg border border-[var(--wl-border-strong)] bg-[var(--wl-surface-raised)] px-3"
              value={scheduleId}
              onChange={(event) => setScheduleId(event.target.value)}
            >
              <option value="">Choose a schedule version</option>
              {schedule.assignableSchedules.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name} · version {option.version}
                  {option.latestVersion ? ' (latest)' : ' (historical)'}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold" htmlFor="employee-schedule-date">
            Effective from
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
            isDisabled={mutation.isPending || schedule.assignableSchedules.length === 0}
          >
            {mutation.isPending ? 'Saving schedule…' : 'Save weekly schedule'}
          </Button>
        </form>
      )}
    </section>
  );
}

function scheduleAssignmentError(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'SCHEDULE_NOT_ASSIGNED') {
      return 'That change would leave current or future employed dates without a schedule.';
    }
    if (error.code === 'ASSIGNMENT_EFFECTIVE_DATE_INVALID') {
      return 'Choose today or a future date that is not already an assignment boundary.';
    }
    if (error.code === 'ASSIGNMENT_STATE_CONFLICT') {
      return 'That schedule is already effective, or the assignment history changed.';
    }
    if (error.code === 'SCHEDULE_VERSION_CONFLICT') {
      return 'The selected schedule or assignment changed. Refresh and review the current state.';
    }
    if (error.code === 'EMPLOYEE_STATE_CONFLICT') {
      return 'Choose a date inside the employee’s current or scheduled employment period.';
    }
  }
  return 'The schedule assignment could not be updated. Try again.';
}
