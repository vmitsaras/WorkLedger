import { useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  AbsenceTypePolicyAdmin,
  CreateAbsenceTypeVersionAdminRequest,
} from '@workledger/contracts';
import { useWorkLedgerMessage } from '@workledger/i18n/react';
import { Alert, Button, Panel, RouteState, StatusBadge, TextField } from '@workledger/ui';

import { ApiClientError, createAbsenceTypeVersionForAdministration } from '../app/api-client.js';
import { formatLocalDate } from '../app/date-time-format.js';
import { absenceSettingsAdminDetailQuery } from '../app/query.js';
import { PageHeader } from '../components/page-header.js';

const DEFAULT_POLICY: AbsenceTypePolicyAdmin = {
  allowedCoverageUnits: ['FULL_DAY', 'HALF_DAY', 'MINUTES'],
  availabilityState: 'UNAVAILABLE',
  entitlementAccountCategory: null,
  maximumRetrospectiveCalendarDays: null,
  minimumLeadCalendarDays: 0,
  pendingReservationBehavior: 'NONE',
  requestNoteMode: 'OPTIONAL',
  timeTreatment: 'NO_TIME_EFFECT',
  workflow: 'APPROVAL_REQUIRED',
};

export function AbsenceSettingsPage() {
  const t = useWorkLedgerMessage();
  const query = useQuery(absenceSettingsAdminDetailQuery());
  const queryClient = useQueryClient();
  const [code, setCode] = useState<CreateAbsenceTypeVersionAdminRequest['code']>('OTHER');
  const [name, setName] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [active, setActive] = useState(true);
  const [policy, setPolicy] = useState<AbsenceTypePolicyAdmin>(DEFAULT_POLICY);
  const [message, setMessage] = useState<Readonly<{ kind: 'error' | 'success'; text: string }>>();
  const messageRef = useRef<HTMLElement>(null);
  const mutation = useMutation({ mutationFn: createAbsenceTypeVersionForAdministration });
  if (query.isError) throw query.error;

  function chooseCode(next: CreateAbsenceTypeVersionAdminRequest['code']) {
    setCode(next);
    if (next === 'SICKNESS')
      setPolicy({
        ...DEFAULT_POLICY,
        maximumRetrospectiveCalendarDays: 7,
        requestNoteMode: 'DISABLED',
        timeTreatment: 'CREDIT_COVERED_EXPECTATION',
        workflow: 'REPORT_AND_ACKNOWLEDGE',
      });
    else if (next === 'VACATION')
      setPolicy({
        ...DEFAULT_POLICY,
        entitlementAccountCategory: 'VACATION',
        pendingReservationBehavior: 'RESERVE_PENDING',
        timeTreatment: 'CREDIT_COVERED_EXPECTATION',
      });
    else if (next === 'UNPAID')
      setPolicy({ ...DEFAULT_POLICY, timeTreatment: 'REDUCE_COVERED_EXPECTATION' });
    else setPolicy(DEFAULT_POLICY);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(undefined);
    if (name.trim() === '' || effectiveFrom === '') {
      setMessage({ kind: 'error', text: t('admin.absenceSettings.validation.required') });
      requestAnimationFrame(() => messageRef.current?.focus());
      return;
    }
    try {
      await mutation.mutateAsync({ active, code, effectiveFrom, name: name.trim(), policy });
      await queryClient.invalidateQueries({ queryKey: ['administration', 'absence-settings'] });
      setName('');
      setEffectiveFrom('');
      setMessage({
        kind: 'success',
        text: t('admin.absenceSettings.feedback.created'),
      });
    } catch (error) {
      setMessage({ kind: 'error', text: mutationError(error, t) });
      requestAnimationFrame(() => messageRef.current?.focus());
    }
  }

  return (
    <section className="grid gap-8">
      <PageHeader
        eyebrow={t('admin.absenceSettings.page.eyebrow')}
        title={t('shared.route.title.settingsAbsence')}
        description={t('admin.absenceSettings.page.description')}
      />
      {message === undefined ? null : (
        <Alert
          {...(message.kind === 'error' ? { className: 'outline-none', tabIndex: -1 } : {})}
          ref={messageRef}
          title={
            message.kind === 'error'
              ? t('admin.absenceSettings.feedback.errorTitle')
              : t('admin.absenceSettings.feedback.successTitle')
          }
          tone={message.kind === 'error' ? 'danger' : 'success'}
        >
          <p>{message.text}</p>
        </Alert>
      )}
      <form className="wl-panel grid gap-5" onSubmit={submit} noValidate>
        <div>
          <h2 className="m-0 text-2xl font-bold">{t('admin.absenceSettings.form.heading')}</h2>
          <p className="mb-0 text-sm text-[var(--wl-text-muted)]">
            {t('admin.absenceSettings.form.description')}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold" htmlFor="absence-code">
            {t('admin.absenceSettings.form.typeCode')}
            <select
              id="absence-code"
              className="min-h-11 rounded-lg border px-3"
              value={code}
              onChange={(event) => chooseCode(event.target.value as typeof code)}
            >
              <option value="VACATION">{t('admin.absenceSettings.type.vacation')}</option>
              <option value="SICKNESS">{t('admin.absenceSettings.type.sickness')}</option>
              <option value="UNPAID">{t('admin.absenceSettings.type.unpaid')}</option>
              <option value="OTHER">{t('admin.absenceSettings.type.other')}</option>
            </select>
          </label>
          <TextField
            id="absence-name"
            label={t('admin.absenceSettings.form.displayName')}
            value={name}
            onChange={setName}
          />
          <label className="grid gap-2 text-sm font-semibold" htmlFor="absence-effective">
            {t('admin.absenceSettings.form.effectiveFrom')}
            <input
              id="absence-effective"
              type="date"
              min={query.data?.asOfLocalDate}
              className="min-h-11 rounded-lg border px-3"
              value={effectiveFrom}
              onChange={(event) => setEffectiveFrom(event.target.value)}
            />
          </label>
          <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
            <input
              type="checkbox"
              checked={active}
              onChange={(event) => setActive(event.target.checked)}
            />
            {t('admin.absenceSettings.form.active')}
          </label>
        </div>
        <fieldset className="grid gap-4 rounded-xl border p-4">
          <legend className="px-2 font-bold">{t('admin.absenceSettings.coverage.heading')}</legend>
          {(['FULL_DAY', 'HALF_DAY', 'MINUTES'] as const).map((unit) => (
            <label key={unit} className="flex gap-3">
              <input
                type="checkbox"
                checked={policy.allowedCoverageUnits.includes(unit)}
                onChange={(event) =>
                  setPolicy((current) => ({
                    ...current,
                    allowedCoverageUnits: event.target.checked
                      ? [...current.allowedCoverageUnits, unit]
                      : current.allowedCoverageUnits.filter((value) => value !== unit),
                  }))
                }
              />
              {unit === 'FULL_DAY'
                ? t('admin.absenceSettings.coverage.fullDay')
                : unit === 'HALF_DAY'
                  ? t('admin.absenceSettings.coverage.halfDay')
                  : t('admin.absenceSettings.coverage.minutes')}
            </label>
          ))}
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            id="absence-workflow"
            label={t('admin.absenceSettings.workflow.label')}
            value={policy.workflow}
            disabled={code === 'SICKNESS'}
            disabledReason={t('admin.absenceSettings.workflow.sicknessReason')}
            options={[
              ['APPROVAL_REQUIRED', t('admin.absenceSettings.workflow.approvalRequired')],
              ['REPORT_AND_ACKNOWLEDGE', t('admin.absenceSettings.workflow.reportAndAcknowledge')],
            ]}
            onChange={(workflow) =>
              setPolicy((current) => ({
                ...current,
                workflow: workflow as AbsenceTypePolicyAdmin['workflow'],
              }))
            }
          />
          <SelectField
            id="absence-treatment"
            label={t('admin.absenceSettings.timeTreatment.label')}
            value={policy.timeTreatment}
            options={[
              [
                'CREDIT_COVERED_EXPECTATION',
                t('admin.absenceSettings.timeTreatment.creditCovered'),
              ],
              [
                'REDUCE_COVERED_EXPECTATION',
                t('admin.absenceSettings.timeTreatment.reduceCovered'),
              ],
              ['NO_TIME_EFFECT', t('admin.absenceSettings.timeTreatment.none')],
            ]}
            onChange={(timeTreatment) =>
              setPolicy((current) => ({
                ...current,
                timeTreatment: timeTreatment as AbsenceTypePolicyAdmin['timeTreatment'],
              }))
            }
          />
          <SelectField
            id="absence-note-mode"
            label={t('admin.absenceSettings.requestNote.label')}
            value={policy.requestNoteMode}
            disabled={code === 'SICKNESS'}
            disabledReason={t('admin.absenceSettings.requestNote.sicknessReason')}
            options={[
              ['DISABLED', t('admin.absenceSettings.requestNote.disabled')],
              ['OPTIONAL', t('admin.absenceSettings.requestNote.optional')],
              ['REQUIRED', t('admin.absenceSettings.requestNote.required')],
            ]}
            onChange={(requestNoteMode) =>
              setPolicy((current) => ({
                ...current,
                requestNoteMode: requestNoteMode as AbsenceTypePolicyAdmin['requestNoteMode'],
              }))
            }
          />
          <TextField
            id="absence-account"
            label={t('admin.absenceSettings.entitlement.label')}
            description={
              code === 'SICKNESS'
                ? t('admin.absenceSettings.entitlement.sicknessReason')
                : t('admin.absenceSettings.entitlement.description')
            }
            value={policy.entitlementAccountCategory ?? ''}
            onChange={(value) =>
              setPolicy((current) => ({
                ...current,
                entitlementAccountCategory: value.trim() === '' ? null : value,
              }))
            }
            isDisabled={code === 'SICKNESS'}
          />
          <TextField
            id="absence-lead"
            type="number"
            label={t('admin.absenceSettings.timing.minimumLeadDays')}
            value={String(policy.minimumLeadCalendarDays)}
            onChange={(value) =>
              setPolicy((current) => ({ ...current, minimumLeadCalendarDays: Number(value) }))
            }
          />
          <TextField
            id="absence-retrospective"
            type="number"
            label={t('admin.absenceSettings.timing.maximumRetrospectiveDays')}
            description={t('admin.absenceSettings.timing.maximumRetrospectiveDescription')}
            value={
              policy.maximumRetrospectiveCalendarDays === null
                ? ''
                : String(policy.maximumRetrospectiveCalendarDays)
            }
            onChange={(value) =>
              setPolicy((current) => ({
                ...current,
                maximumRetrospectiveCalendarDays: value === '' ? null : Number(value),
              }))
            }
          />
        </div>
        <div className="grid gap-1">
          <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
            <input
              type="checkbox"
              checked={policy.pendingReservationBehavior === 'RESERVE_PENDING'}
              disabled={code === 'SICKNESS'}
              aria-describedby={code === 'SICKNESS' ? 'absence-reservation-reason' : undefined}
              onChange={(event) =>
                setPolicy((current) => ({
                  ...current,
                  pendingReservationBehavior: event.target.checked ? 'RESERVE_PENDING' : 'NONE',
                }))
              }
            />
            {t('admin.absenceSettings.entitlement.reservePending')}
          </label>
          {code === 'SICKNESS' ? (
            <p id="absence-reservation-reason" className="m-0 text-sm text-[var(--wl-text-muted)]">
              {t('admin.absenceSettings.entitlement.reservePendingSickness')}
            </p>
          ) : null}
        </div>
        <Button type="submit" isDisabled={mutation.isPending}>
          {mutation.isPending
            ? t('admin.absenceSettings.form.pending')
            : t('admin.absenceSettings.form.submit')}
        </Button>
      </form>
      <section className="grid gap-4" aria-labelledby="absence-version-history">
        <h2 id="absence-version-history" className="m-0 text-2xl font-bold">
          {t('admin.absenceSettings.history.heading')}
        </h2>
        {query.isPending ? (
          <RouteState kind="loading" title={t('admin.absenceSettings.loading.title')}>
            {t('admin.absenceSettings.loading.description')}
          </RouteState>
        ) : query.data.versions.length === 0 ? (
          <RouteState kind="empty" title={t('admin.absenceSettings.empty.title')}>
            {t('admin.absenceSettings.empty.description')}
          </RouteState>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {query.data.versions.map((version) => (
              <Panel key={version.id} as="article">
                <h3 className="m-0 text-xl font-bold">
                  {t('admin.absenceSettings.history.versionLabel', {
                    name: version.name,
                    version: version.version,
                  })}
                </h3>
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  <StatusBadge tone={version.latestVersion ? 'info' : 'neutral'}>
                    {version.latestVersion
                      ? t('admin.absenceSettings.history.latest')
                      : t('admin.absenceSettings.history.historical')}
                  </StatusBadge>
                  <StatusBadge tone={version.active ? 'success' : 'neutral'}>
                    {version.active
                      ? t('admin.absenceSettings.history.available')
                      : t('admin.absenceSettings.history.inactive')}
                  </StatusBadge>
                </p>
                <p>
                  {t('admin.absenceSettings.history.range', {
                    from: formatLocalDate(version.validFrom),
                    to:
                      version.validTo === null
                        ? t('admin.absenceSettings.history.ongoing')
                        : formatLocalDate(version.validTo),
                  })}
                </p>
                <p className="mb-0 text-sm">
                  {version.policy.workflow === 'APPROVAL_REQUIRED'
                    ? t('admin.absenceSettings.workflow.approvalRequired')
                    : t('admin.absenceSettings.workflow.reportAndAcknowledge')}
                  {' · '}
                  {t('admin.absenceSettings.history.coverageOptions', {
                    count: version.policy.allowedCoverageUnits.length,
                  })}
                  {' · '}
                  {version.policy.entitlementAccountCategory === null
                    ? t('admin.absenceSettings.history.noEntitlement')
                    : t('admin.absenceSettings.history.entitlement', {
                        account: version.policy.entitlementAccountCategory,
                      })}
                </p>
              </Panel>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

function SelectField({
  disabled = false,
  disabledReason,
  id,
  label,
  onChange,
  options,
  value,
}: Readonly<{
  disabled?: boolean;
  disabledReason?: string;
  id: string;
  label: string;
  onChange: (value: string) => void;
  options: readonly (readonly [string, string])[];
  value: string;
}>) {
  return (
    <div className="grid gap-2 text-sm font-semibold">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        disabled={disabled}
        aria-describedby={disabled && disabledReason !== undefined ? `${id}-reason` : undefined}
        className="min-h-11 rounded-lg border px-3"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map(([option, text]) => (
          <option key={option} value={option}>
            {text}
          </option>
        ))}
      </select>
      {disabled && disabledReason !== undefined ? (
        <p id={`${id}-reason`} className="m-0 font-normal text-[var(--wl-text-muted)]">
          {disabledReason}
        </p>
      ) : null}
    </div>
  );
}
function mutationError(error: unknown, t: ReturnType<typeof useWorkLedgerMessage>): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'POLICY_CONFIGURATION_INVALID')
      return t('admin.absenceSettings.error.configuration');
    if (error.code === 'ABSENCE_TYPE_VERSION_CONFLICT')
      return t('admin.absenceSettings.error.conflict');
    if (error.code === 'ASSIGNMENT_EFFECTIVE_DATE_INVALID')
      return t('admin.absenceSettings.error.effectiveDate');
  }
  return t('admin.absenceSettings.error.generic');
}
