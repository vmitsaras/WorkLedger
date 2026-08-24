import { useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  AbsenceTypePolicyAdmin,
  CreateAbsenceTypeVersionAdminRequest,
} from '@workledger/contracts';
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
      setMessage({ kind: 'error', text: 'Enter a display name and effective date.' });
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
        text: 'The absence type version was created. Existing requests keep the version they already use.',
      });
    } catch (error) {
      setMessage({ kind: 'error', text: mutationError(error) });
      requestAnimationFrame(() => messageRef.current?.focus());
    }
  }

  return (
    <section className="grid gap-8">
      <PageHeader
        eyebrow="HR administration"
        title="Absence settings"
        description="Create bounded, effective-dated absence-type versions without reinterpreting existing requests or exposing sickness records."
      />
      {message === undefined ? null : (
        <Alert
          {...(message.kind === 'error' ? { className: 'outline-none', tabIndex: -1 } : {})}
          ref={messageRef}
          title={
            message.kind === 'error' ? 'Absence type update failed' : 'Absence type version created'
          }
          tone={message.kind === 'error' ? 'danger' : 'success'}
        >
          <p>{message.text}</p>
        </Alert>
      )}
      <form className="wl-panel grid gap-5" onSubmit={submit} noValidate>
        <div>
          <h2 className="m-0 text-2xl font-bold">Create absence-type version</h2>
          <p className="mb-0 text-sm text-[var(--wl-text-muted)]">
            A future boundary closes only the version effective there. The configuration is
            constrained to the accepted MVP workflow.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold" htmlFor="absence-code">
            Type code
            <select
              id="absence-code"
              className="min-h-11 rounded-lg border px-3"
              value={code}
              onChange={(event) => chooseCode(event.target.value as typeof code)}
            >
              <option value="VACATION">Vacation</option>
              <option value="SICKNESS">Sickness</option>
              <option value="UNPAID">Unpaid leave</option>
              <option value="OTHER">Other</option>
            </select>
          </label>
          <TextField id="absence-name" label="Display name" value={name} onChange={setName} />
          <label className="grid gap-2 text-sm font-semibold" htmlFor="absence-effective">
            Effective from
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
            Available for new requests
          </label>
        </div>
        <fieldset className="grid gap-4 rounded-xl border p-4">
          <legend className="px-2 font-bold">Coverage units</legend>
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
                ? 'Full day'
                : unit === 'HALF_DAY'
                  ? 'Schedule-relative half day'
                  : 'Minute interval'}
            </label>
          ))}
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            id="absence-workflow"
            label="Workflow"
            value={policy.workflow}
            disabled={code === 'SICKNESS'}
            disabledReason="Sickness uses the fixed report and acknowledge workflow to avoid approval decisions about medical absence."
            options={[
              ['APPROVAL_REQUIRED', 'Approval required'],
              ['REPORT_AND_ACKNOWLEDGE', 'Report and acknowledge'],
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
            label="Time treatment"
            value={policy.timeTreatment}
            options={[
              ['CREDIT_COVERED_EXPECTATION', 'Credit covered expectation'],
              ['REDUCE_COVERED_EXPECTATION', 'Reduce covered expectation'],
              ['NO_TIME_EFFECT', 'No time effect'],
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
            label="Request note"
            value={policy.requestNoteMode}
            disabled={code === 'SICKNESS'}
            disabledReason="Sickness notes are disabled to minimize medical information."
            options={[
              ['DISABLED', 'Disabled'],
              ['OPTIONAL', 'Optional'],
              ['REQUIRED', 'Required'],
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
            label="Entitlement account category"
            description={
              code === 'SICKNESS'
                ? 'Sickness cannot use an entitlement account because medical absence is not a leave balance.'
                : 'Leave blank when this type has no entitlement balance.'
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
            label="Minimum lead days"
            value={String(policy.minimumLeadCalendarDays)}
            onChange={(value) =>
              setPolicy((current) => ({ ...current, minimumLeadCalendarDays: Number(value) }))
            }
          />
          <TextField
            id="absence-retrospective"
            type="number"
            label="Maximum retrospective days"
            description="Leave blank when retrospective reporting is not bounded."
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
            Reserve entitlement while approval is pending
          </label>
          {code === 'SICKNESS' ? (
            <p id="absence-reservation-reason" className="m-0 text-sm text-[var(--wl-text-muted)]">
              Sickness has no entitlement reservation and does not enter an approval queue.
            </p>
          ) : null}
        </div>
        <Button type="submit" isDisabled={mutation.isPending}>
          {mutation.isPending ? 'Creating version…' : 'Create absence-type version'}
        </Button>
      </form>
      <section className="grid gap-4" aria-labelledby="absence-version-history">
        <h2 id="absence-version-history" className="m-0 text-2xl font-bold">
          Version history
        </h2>
        {query.isPending ? (
          <RouteState kind="loading">Absence type versions are being retrieved.</RouteState>
        ) : query.data.versions.length === 0 ? (
          <RouteState kind="empty" title="No absence type versions">
            Create the first effective dated absence type above.
          </RouteState>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {query.data.versions.map((version) => (
              <Panel key={version.id} as="article">
                <h3 className="m-0 text-xl font-bold">
                  {version.name} · version {version.version}
                </h3>
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  <StatusBadge tone={version.latestVersion ? 'info' : 'neutral'}>
                    {version.latestVersion ? 'Latest version' : 'Historical version'}
                  </StatusBadge>
                  <StatusBadge tone={version.active ? 'success' : 'neutral'}>
                    {version.active ? 'Available' : 'Inactive'}
                  </StatusBadge>
                </p>
                <p>
                  {formatLocalDate(version.validFrom)} to{' '}
                  {version.validTo === null ? 'ongoing' : formatLocalDate(version.validTo)}
                </p>
                <p className="mb-0 text-sm">
                  {version.policy.workflow === 'APPROVAL_REQUIRED'
                    ? 'Approval required'
                    : 'Report and acknowledge'}{' '}
                  · {version.policy.allowedCoverageUnits.length} coverage options ·{' '}
                  {version.policy.entitlementAccountCategory === null
                    ? 'No entitlement account'
                    : `Entitlement: ${version.policy.entitlementAccountCategory}`}
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
function mutationError(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'POLICY_CONFIGURATION_INVALID')
      return 'Review the workflow, entitlement, coverage, timing, and sickness-specific constraints.';
    if (error.code === 'ABSENCE_TYPE_VERSION_CONFLICT')
      return 'That effective boundary already exists, has no configuration change, or the version history changed.';
    if (error.code === 'ASSIGNMENT_EFFECTIVE_DATE_INVALID')
      return 'Choose today or a future effective date.';
  }
  return 'The absence-type version could not be created. Try again.';
}
