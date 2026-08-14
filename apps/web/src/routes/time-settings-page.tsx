import { useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { TimePolicyRules, WeeklyScheduleMinutes } from '@workledger/contracts';
import { Button, TextField } from '@workledger/ui';

import {
  ApiClientError,
  createScheduleVersionForAdministration,
  createTimePolicyVersionForAdministration,
} from '../app/api-client.js';
import { formatDuration } from '../app/date-time-format.js';
import { timeSettingsAdminDetailQuery } from '../app/query.js';
import { FormErrorSummary } from '../components/form-error-summary.js';
import { PageHeader } from '../components/page-header.js';

const WEEKDAYS = [
  ['MONDAY', 'Monday'],
  ['TUESDAY', 'Tuesday'],
  ['WEDNESDAY', 'Wednesday'],
  ['THURSDAY', 'Thursday'],
  ['FRIDAY', 'Friday'],
  ['SATURDAY', 'Saturday'],
  ['SUNDAY', 'Sunday'],
] as const;

const INITIAL_MINUTES: Record<keyof WeeklyScheduleMinutes, string> = {
  FRIDAY: '480',
  MONDAY: '480',
  SATURDAY: '0',
  SUNDAY: '0',
  THURSDAY: '480',
  TUESDAY: '480',
  WEDNESDAY: '480',
};

export function TimeSettingsPage() {
  const queryClient = useQueryClient();
  const query = useQuery(timeSettingsAdminDetailQuery());
  const [name, setName] = useState('');
  const [minutes, setMinutes] = useState({ ...INITIAL_MINUTES });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const [status, setStatus] = useState<string>();
  const summaryRef = useRef<HTMLDivElement>(null);
  const mutation = useMutation({ mutationFn: createScheduleVersionForAdministration });

  if (query.isError) throw query.error;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (name.trim() === '') errors['schedule-name'] = 'Enter a schedule name.';
    const parsed = {} as WeeklyScheduleMinutes;
    for (const [weekday, label] of WEEKDAYS) {
      const value = Number(minutes[weekday]);
      if (!Number.isInteger(value) || value < 0 || value > 1_440) {
        errors[`schedule-${weekday.toLowerCase()}`] =
          `Enter ${label.toLowerCase()} minutes from 0 to 1,440.`;
      } else {
        parsed[weekday] = value;
      }
    }
    setFieldErrors(errors);
    setFormError(undefined);
    setStatus(undefined);
    if (Object.keys(errors).length > 0) {
      window.requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    try {
      await mutation.mutateAsync({ name: name.trim(), scheduledMinutes: parsed });
      await queryClient.invalidateQueries({ queryKey: ['administration', 'time-settings'] });
      setName('');
      setStatus(
        'The immutable schedule version was created. Employee assignments are unchanged until you assign it.',
      );
    } catch (error) {
      setFormError(scheduleMutationError(error));
      window.requestAnimationFrame(() => summaryRef.current?.focus());
    }
  }

  const weeklyPreview = Object.values(minutes).reduce((total, value) => {
    const parsed = Number(value);
    return total + (Number.isInteger(parsed) && parsed >= 0 ? parsed : 0);
  }, 0);

  return (
    <section className="grid gap-8">
      <PageHeader
        eyebrow="HR administration"
        title="Time settings"
        description="Create immutable weekly schedule and bounded time-policy versions. Assignments change only from an employee record."
      />

      <FormErrorSummary fieldErrors={fieldErrors} formError={formError} summaryRef={summaryRef} />
      {status === undefined ? null : (
        <div role="status" className="wl-alert wl-alert-success rounded-xl border p-4">
          {status}
        </div>
      )}

      <section className="wl-panel grid gap-5" aria-labelledby="create-schedule-heading">
        <div className="grid gap-2">
          <h2 id="create-schedule-heading" className="m-0 text-2xl font-bold">
            Create schedule version
          </h2>
          <p className="m-0 max-w-3xl text-sm leading-6 text-[var(--wl-text-muted)]">
            Reusing a schedule name creates its next version. Versions are immutable and do not
            affect anyone until assigned from an employee record. Enter integer minutes; zero is a
            deliberate non-working day.
          </p>
        </div>
        <form className="grid gap-5" noValidate onSubmit={submit}>
          <TextField
            id="schedule-name"
            label="Schedule name"
            description="For example, Standard 40 hours or Reduced Friday."
            value={name}
            onChange={setName}
            isInvalid={fieldErrors['schedule-name'] !== undefined}
            errorMessage={fieldErrors['schedule-name']}
          />
          <fieldset className="grid gap-4 rounded-xl border border-[var(--wl-border)] p-4">
            <legend className="px-2 text-base font-bold">Scheduled minutes by weekday</legend>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {WEEKDAYS.map(([weekday, label]) => {
                const id = `schedule-${weekday.toLowerCase()}`;
                return (
                  <TextField
                    key={weekday}
                    id={id}
                    type="number"
                    label={`${label} minutes`}
                    value={minutes[weekday]}
                    onChange={(value) =>
                      setMinutes((current) => ({ ...current, [weekday]: value }))
                    }
                    isInvalid={fieldErrors[id] !== undefined}
                    errorMessage={fieldErrors[id]}
                  />
                );
              })}
            </div>
          </fieldset>
          <p className="m-0 font-semibold">Entered weekly total: {formatDuration(weeklyPreview)}</p>
          <Button type="submit" isDisabled={mutation.isPending}>
            {mutation.isPending ? 'Creating version…' : 'Create schedule version'}
          </Button>
        </form>
      </section>

      <TimePolicyVersionAdministration policyVersions={query.data?.policyVersions ?? []} />

      <section className="grid gap-4" aria-labelledby="schedule-versions-heading">
        <div>
          <h2 id="schedule-versions-heading" className="m-0 text-2xl font-bold">
            Schedule versions
          </h2>
          <p className="m-0 mt-2 text-sm text-[var(--wl-text-muted)]">
            Earlier versions remain visible so historical assignments stay explainable.
          </p>
        </div>
        {query.isPending ? (
          <p role="status">Loading schedule versions…</p>
        ) : query.data.scheduleVersions.length === 0 ? (
          <div className="wl-panel">No schedule versions have been created.</div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {query.data.scheduleVersions.map((schedule) => (
              <article key={schedule.id} className="wl-panel grid gap-4">
                <div>
                  <h3 className="m-0 text-xl font-bold">
                    {schedule.name} · version {schedule.version}
                  </h3>
                  <p className="m-0 mt-1 text-sm font-semibold">
                    {schedule.latestVersion ? 'Latest version' : 'Historical version'} ·{' '}
                    {formatDuration(schedule.weeklyTotalMinutes)} per week
                  </p>
                </div>
                <dl className="m-0 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {WEEKDAYS.map(([weekday, label]) => (
                    <div key={weekday}>
                      <dt className="text-sm text-[var(--wl-text-muted)]">{label}</dt>
                      <dd className="m-0 font-semibold">
                        {formatDuration(schedule.scheduledMinutes[weekday])}
                      </dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

function TimePolicyVersionAdministration({
  policyVersions,
}: Readonly<{ policyVersions: import('@workledger/contracts').PolicyVersionAdminSummary[] }>) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [threshold, setThreshold] = useState('30');
  const [message, setMessage] = useState<Readonly<{ kind: 'error' | 'success'; text: string }>>();
  const mutation = useMutation({ mutationFn: createTimePolicyVersionForAdministration });
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(undefined);
    const minutes = Number(threshold);
    if (name.trim() === '') {
      setMessage({ kind: 'error', text: 'Enter a time-policy name.' });
      document.querySelector<HTMLElement>('#policy-name')?.focus();
      return;
    }
    if (!Number.isInteger(minutes) || minutes < 0 || minutes > 1_440) {
      setMessage({ kind: 'error', text: 'Enter a warning threshold from 0 to 1,440 minutes.' });
      document.querySelector<HTMLElement>('#policy-threshold')?.focus();
      return;
    }
    const rules: TimePolicyRules = {
      breakHandling: 'MANUAL_WITH_WARNINGS',
      flexibleTimeWarningMinutes: minutes,
      rounding: 'NONE',
    };
    try {
      await mutation.mutateAsync({ name: name.trim(), rules });
      await queryClient.invalidateQueries({ queryKey: ['administration', 'time-settings'] });
      setName('');
      setMessage({
        kind: 'success',
        text: 'The immutable time-policy version was created. Employee assignments are unchanged.',
      });
    } catch (error) {
      setMessage({ kind: 'error', text: policyMutationError(error) });
    }
  }
  return (
    <section className="grid gap-4" aria-labelledby="time-policy-versions-heading">
      <div>
        <h2 id="time-policy-versions-heading" className="m-0 text-2xl font-bold">
          Time-policy versions
        </h2>
        <p className="m-0 mt-2 text-sm text-[var(--wl-text-muted)]">
          The MVP policy is deliberately bounded: exact minutes, manual breaks with warnings, and no
          hidden rounding.
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
      <form className="wl-panel grid max-w-3xl gap-4" onSubmit={submit} noValidate>
        <TextField id="policy-name" label="Time-policy name" value={name} onChange={setName} />
        <TextField
          id="policy-threshold"
          type="number"
          label="Flexible-time warning threshold in minutes"
          description="A warning signal only. It never caps, rounds, or discards worked time."
          value={threshold}
          onChange={setThreshold}
        />
        <p className="m-0 text-sm">
          Preview: warn when the absolute flexible-time difference reaches{' '}
          {formatDuration(Number(threshold) || 0)}; keep manual breaks and exact minute arithmetic.
        </p>
        <Button type="submit" isDisabled={mutation.isPending}>
          {mutation.isPending ? 'Creating policy…' : 'Create time-policy version'}
        </Button>
      </form>
      {policyVersions.length === 0 ? (
        <div className="wl-panel">No time-policy versions have been created.</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {policyVersions.map((policy) => (
            <article key={policy.id} className="wl-panel">
              <h3 className="m-0 text-xl font-bold">
                {policy.name} · version {policy.version}
              </h3>
              <p className="mb-0 font-semibold">
                {policy.latestVersion ? 'Latest version' : 'Historical version'} ·{' '}
                {formatDuration(policy.rules.flexibleTimeWarningMinutes)} warning threshold
              </p>
              <p className="mb-0 text-sm">Manual breaks with warnings · no rounding</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function scheduleMutationError(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'SCHEDULE_VERSION_NO_CHANGE') {
      return 'The latest version with this name already has those weekday minutes.';
    }
    if (error.code === 'SCHEDULE_VERSION_CONFLICT') {
      return 'Schedule versions changed. Refresh and review them before trying again.';
    }
  }
  return 'The schedule version could not be created. Try again.';
}

function policyMutationError(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'POLICY_VERSION_NO_CHANGE')
      return 'The latest version with this name already has those rules.';
    if (error.code === 'POLICY_VERSION_CONFLICT')
      return 'Time-policy versions changed. Refresh and review them before trying again.';
  }
  return 'The time-policy version could not be created. Try again.';
}
