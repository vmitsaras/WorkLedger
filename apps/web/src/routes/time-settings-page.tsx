import { useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { TimePolicyRules, WeeklyScheduleMinutes } from '@workledger/contracts';
import { type MessageKey } from '@workledger/i18n';
import { useWorkLedgerMessage } from '@workledger/i18n/react';
import { Alert, Button, Panel, RouteState, TextField } from '@workledger/ui';

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
  ['MONDAY', 'admin.timeSettings.weekday.monday'],
  ['TUESDAY', 'admin.timeSettings.weekday.tuesday'],
  ['WEDNESDAY', 'admin.timeSettings.weekday.wednesday'],
  ['THURSDAY', 'admin.timeSettings.weekday.thursday'],
  ['FRIDAY', 'admin.timeSettings.weekday.friday'],
  ['SATURDAY', 'admin.timeSettings.weekday.saturday'],
  ['SUNDAY', 'admin.timeSettings.weekday.sunday'],
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
  const t = useWorkLedgerMessage();
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
    if (name.trim() === '')
      errors['schedule-name'] = t('admin.timeSettings.schedule.validation.name');
    const parsed = {} as WeeklyScheduleMinutes;
    for (const [weekday, labelKey] of WEEKDAYS) {
      const value = Number(minutes[weekday]);
      if (!Number.isInteger(value) || value < 0 || value > 1_440) {
        errors[`schedule-${weekday.toLowerCase()}`] = t(
          'admin.timeSettings.schedule.validation.weekdayMinutes',
          {
            day: t(labelKey as MessageKey).toLocaleLowerCase(),
          },
        );
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
      setStatus(t('admin.timeSettings.schedule.feedback.created'));
    } catch (error) {
      setFormError(scheduleMutationError(error, t));
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
        eyebrow={t('admin.timeSettings.page.eyebrow')}
        title={t('shared.route.title.settingsTime')}
        description={t('admin.timeSettings.page.description')}
      />

      <FormErrorSummary fieldErrors={fieldErrors} formError={formError} summaryRef={summaryRef} />
      {status === undefined ? null : (
        <Alert title={t('admin.timeSettings.schedule.feedback.successTitle')} tone="success">
          <p>{status}</p>
        </Alert>
      )}

      <Panel className="grid gap-5" aria-labelledby="create-schedule-heading">
        <div className="grid gap-2">
          <h2 id="create-schedule-heading" className="m-0 text-2xl font-bold">
            {t('admin.timeSettings.schedule.heading')}
          </h2>
          <p className="m-0 max-w-3xl text-sm leading-6 text-[var(--wl-text-muted)]">
            {t('admin.timeSettings.schedule.description')}
          </p>
        </div>
        <form className="grid gap-5" noValidate onSubmit={submit}>
          <TextField
            id="schedule-name"
            label={t('admin.timeSettings.schedule.name')}
            description={t('admin.timeSettings.schedule.nameDescription')}
            value={name}
            onChange={setName}
            isInvalid={fieldErrors['schedule-name'] !== undefined}
            errorMessage={fieldErrors['schedule-name']}
          />
          <fieldset className="grid gap-4 rounded-xl border border-[var(--wl-border)] p-4">
            <legend className="px-2 text-base font-bold">
              {t('admin.timeSettings.schedule.weekdayHeading')}
            </legend>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {WEEKDAYS.map(([weekday, labelKey]) => {
                const id = `schedule-${weekday.toLowerCase()}`;
                return (
                  <TextField
                    key={weekday}
                    id={id}
                    type="number"
                    label={t('admin.timeSettings.schedule.weekdayLabel', {
                      day: t(labelKey as MessageKey),
                    })}
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
          <p className="m-0 font-semibold">
            {t('admin.timeSettings.schedule.total', {
              duration: formatDuration(weeklyPreview),
            })}
          </p>
          <Button type="submit" isDisabled={mutation.isPending}>
            {mutation.isPending
              ? t('admin.timeSettings.schedule.pending')
              : t('admin.timeSettings.schedule.submit')}
          </Button>
        </form>
      </Panel>

      <TimePolicyVersionAdministration policyVersions={query.data?.policyVersions ?? []} />

      <section className="grid gap-4" aria-labelledby="schedule-versions-heading">
        <div>
          <h2 id="schedule-versions-heading" className="m-0 text-2xl font-bold">
            {t('admin.timeSettings.schedule.history.heading')}
          </h2>
          <p className="m-0 mt-2 text-sm text-[var(--wl-text-muted)]">
            {t('admin.timeSettings.schedule.history.description')}
          </p>
        </div>
        {query.isPending ? (
          <RouteState kind="loading" title={t('admin.timeSettings.loading.title')}>
            {t('admin.timeSettings.schedule.loadingDescription')}
          </RouteState>
        ) : query.data.scheduleVersions.length === 0 ? (
          <RouteState kind="empty" title={t('admin.timeSettings.schedule.empty.title')}>
            {t('admin.timeSettings.schedule.empty.description')}
          </RouteState>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {query.data.scheduleVersions.map((schedule) => (
              <Panel key={schedule.id} as="article" className="grid gap-4">
                <div>
                  <h3 className="m-0 text-xl font-bold">
                    {t('admin.timeSettings.schedule.versionLabel', {
                      name: schedule.name,
                      version: schedule.version,
                    })}
                  </h3>
                  <p className="m-0 mt-1 text-sm font-semibold">
                    {schedule.latestVersion
                      ? t('admin.timeSettings.common.latest')
                      : t('admin.timeSettings.common.historical')}
                    {' · '}
                    {t('admin.timeSettings.schedule.perWeek', {
                      duration: formatDuration(schedule.weeklyTotalMinutes),
                    })}
                  </p>
                </div>
                <dl className="m-0 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {WEEKDAYS.map(([weekday, labelKey]) => (
                    <div key={weekday}>
                      <dt className="text-sm text-[var(--wl-text-muted)]">
                        {t(labelKey as MessageKey)}
                      </dt>
                      <dd className="m-0 font-semibold">
                        {formatDuration(schedule.scheduledMinutes[weekday])}
                      </dd>
                    </div>
                  ))}
                </dl>
              </Panel>
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
  const t = useWorkLedgerMessage();
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
      setMessage({ kind: 'error', text: t('admin.timeSettings.policy.validation.name') });
      document.querySelector<HTMLElement>('#policy-name')?.focus();
      return;
    }
    if (!Number.isInteger(minutes) || minutes < 0 || minutes > 1_440) {
      setMessage({ kind: 'error', text: t('admin.timeSettings.policy.validation.threshold') });
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
        text: t('admin.timeSettings.policy.feedback.created'),
      });
    } catch (error) {
      setMessage({ kind: 'error', text: policyMutationError(error, t) });
    }
  }
  return (
    <section className="grid gap-4" aria-labelledby="time-policy-versions-heading">
      <div>
        <h2 id="time-policy-versions-heading" className="m-0 text-2xl font-bold">
          {t('admin.timeSettings.policy.heading')}
        </h2>
        <p className="m-0 mt-2 text-sm text-[var(--wl-text-muted)]">
          {t('admin.timeSettings.policy.description')}
        </p>
      </div>
      {message === undefined ? null : (
        <Alert
          title={
            message.kind === 'error'
              ? t('admin.timeSettings.policy.feedback.errorTitle')
              : t('admin.timeSettings.policy.feedback.successTitle')
          }
          tone={message.kind === 'error' ? 'danger' : 'success'}
        >
          <p>{message.text}</p>
        </Alert>
      )}
      <form className="wl-panel grid max-w-3xl gap-4" onSubmit={submit} noValidate>
        <TextField
          id="policy-name"
          label={t('admin.timeSettings.policy.name')}
          value={name}
          onChange={setName}
        />
        <TextField
          id="policy-threshold"
          type="number"
          label={t('admin.timeSettings.policy.threshold')}
          description={t('admin.timeSettings.policy.thresholdDescription')}
          value={threshold}
          onChange={setThreshold}
        />
        <p className="m-0 text-sm">
          {t('admin.timeSettings.policy.preview', {
            duration: formatDuration(Number(threshold) || 0),
          })}
        </p>
        <Button type="submit" isDisabled={mutation.isPending}>
          {mutation.isPending
            ? t('admin.timeSettings.policy.pending')
            : t('admin.timeSettings.policy.submit')}
        </Button>
      </form>
      {policyVersions.length === 0 ? (
        <RouteState kind="empty" title={t('admin.timeSettings.policy.empty.title')}>
          {t('admin.timeSettings.policy.empty.description')}
        </RouteState>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {policyVersions.map((policy) => (
            <Panel key={policy.id} as="article">
              <h3 className="m-0 text-xl font-bold">
                {t('admin.timeSettings.policy.versionLabel', {
                  name: policy.name,
                  version: policy.version,
                })}
              </h3>
              <p className="mb-0 font-semibold">
                {policy.latestVersion
                  ? t('admin.timeSettings.common.latest')
                  : t('admin.timeSettings.common.historical')}
                {' · '}
                {t('admin.timeSettings.policy.thresholdValue', {
                  duration: formatDuration(policy.rules.flexibleTimeWarningMinutes),
                })}
              </p>
              <p className="mb-0 text-sm">{t('admin.timeSettings.policy.summary')}</p>
            </Panel>
          ))}
        </div>
      )}
    </section>
  );
}

function scheduleMutationError(error: unknown, t: ReturnType<typeof useWorkLedgerMessage>): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'SCHEDULE_VERSION_NO_CHANGE') {
      return t('admin.timeSettings.schedule.error.noChange');
    }
    if (error.code === 'SCHEDULE_VERSION_CONFLICT') {
      return t('admin.timeSettings.schedule.error.conflict');
    }
  }
  return t('admin.timeSettings.schedule.error.generic');
}

function policyMutationError(error: unknown, t: ReturnType<typeof useWorkLedgerMessage>): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'POLICY_VERSION_NO_CHANGE')
      return t('admin.timeSettings.policy.error.noChange');
    if (error.code === 'POLICY_VERSION_CONFLICT')
      return t('admin.timeSettings.policy.error.conflict');
  }
  return t('admin.timeSettings.policy.error.generic');
}
