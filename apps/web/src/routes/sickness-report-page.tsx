import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';

import type { SubmitSicknessReport } from '@workledger/contracts';

import { ApiClientError, submitSicknessReport } from '../app/api-client.js';
import { formatDuration, formatLocalDate } from '../app/date-time-format.js';
import { FormErrorSummary } from '../components/form-error-summary.js';
import { PageHeader } from '../components/page-header.js';

type CoverageKind = SubmitSicknessReport['kind'];
type FormValues = Readonly<{
  endDate: string;
  endsAt: string;
  kind: CoverageKind;
  localDate: string;
  startDate: string;
  startsAt: string;
}>;
const EMPTY_VALUES: FormValues = Object.freeze({
  endDate: '',
  endsAt: '',
  kind: 'FULL_DAY',
  localDate: '',
  startDate: '',
  startsAt: '',
});

export function SicknessReportPage() {
  const summaryRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [fieldErrors, setFieldErrors] = useState<Readonly<Record<string, string>>>({});
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<Awaited<ReturnType<typeof submitSicknessReport>> | null>(
    null,
  );
  useEffect(() => {
    if (Object.keys(fieldErrors).length > 0 || formError !== undefined) summaryRef.current?.focus();
  }, [fieldErrors, formError]);
  useEffect(() => {
    if (success !== null) successRef.current?.focus();
  }, [success]);
  function update(key: keyof FormValues, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setFieldErrors({});
    setFormError(undefined);
    setSuccess(null);
  }
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validate(values);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError('Correct the highlighted coverage details and report sickness again.');
      return;
    }
    setSubmitting(true);
    setFormError(undefined);
    try {
      setSuccess(await submitSicknessReport(toRequest(values)));
    } catch (error) {
      if (error instanceof ApiClientError && error.fields !== undefined) {
        setFieldErrors(mapServerFieldErrors(error.fields));
        setFormError('Correct the highlighted coverage details and report sickness again.');
      } else if (error instanceof ApiClientError && error.code === 'ABSENCE_RETROACTIVE_LIMIT')
        setFormError('This coverage is outside your organization’s sickness reporting window.');
      else if (error instanceof ApiClientError && error.code === 'ABSENCE_OVERLAP')
        setFormError('This coverage overlaps another absence request. Choose different coverage.');
      else setFormError('WorkLedger could not report sickness. Try again.');
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <section className="grid max-w-3xl gap-6">
      <PageHeader
        eyebrow="Requests"
        title="Report sickness"
        description="Choose full-day, obligation-half, or exact time coverage. Do not include a diagnosis, symptoms, treatment, or other medical detail."
      />
      {success === null ? (
        <form noValidate className="grid gap-6" onSubmit={(event) => void onSubmit(event)}>
          <FormErrorSummary
            fieldErrors={fieldErrors}
            formError={formError}
            summaryRef={summaryRef}
          />
          <fieldset className="grid gap-4 rounded-xl border border-[var(--wl-border)] p-4">
            <legend className="px-1 text-lg font-bold">Sickness coverage</legend>
            <div className="grid gap-2">
              <label htmlFor="coverage-kind" className="font-semibold">
                Coverage
              </label>
              <select
                id="coverage-kind"
                className="wl-text-field"
                value={values.kind}
                onChange={(event) => update('kind', event.target.value)}
              >
                <option value="FULL_DAY">Full day or date range</option>
                <option value="FIRST_HALF">First half of expected work</option>
                <option value="SECOND_HALF">Second half of expected work</option>
                <option value="MINUTE_INTERVAL">Exact local time interval</option>
              </select>
              <p className="m-0 text-sm text-[var(--wl-text-muted)]">
                First and second half describe equal portions of your scheduled obligation, not
                morning and afternoon. Choose exact time for a clock-specific absence.
              </p>
            </div>
            {values.kind === 'FULL_DAY' ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <DateField
                  error={fieldErrors['startDate']}
                  id="startDate"
                  label="First day"
                  onChange={(value) => update('startDate', value)}
                  value={values.startDate}
                />
                <DateField
                  error={fieldErrors['endDate']}
                  id="endDate"
                  label="Last day"
                  onChange={(value) => update('endDate', value)}
                  value={values.endDate}
                />
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-3">
                <DateField
                  error={fieldErrors['localDate']}
                  id="localDate"
                  label="Local date"
                  onChange={(value) => update('localDate', value)}
                  value={values.localDate}
                />
                {values.kind === 'MINUTE_INTERVAL' ? (
                  <TimeField
                    error={fieldErrors['startsAt']}
                    id="startsAt"
                    label="Start time"
                    onChange={(value) => update('startsAt', value)}
                    value={values.startsAt}
                  />
                ) : null}
                {values.kind === 'MINUTE_INTERVAL' ? (
                  <TimeField
                    error={fieldErrors['endsAt']}
                    id="endsAt"
                    label="End time"
                    onChange={(value) => update('endsAt', value)}
                    value={values.endsAt}
                  />
                ) : null}
              </div>
            )}
          </fieldset>
          <p className="m-0 text-sm text-[var(--wl-text-muted)]">
            Your report takes effect immediately. A manager or HR administrator may acknowledge it;
            acknowledgement does not change the report’s effect.
          </p>
          <div className="flex flex-wrap gap-3">
            <button className="wl-button-primary" type="submit" disabled={submitting}>
              {submitting ? 'Reporting sickness…' : 'Report sickness'}
            </button>
            <Link className="wl-button-secondary" to="/requests/new">
              Cancel
            </Link>
          </div>
        </form>
      ) : (
        <div
          ref={successRef}
          tabIndex={-1}
          role="status"
          className="wl-alert m-0 grid gap-4 rounded-xl border p-4 outline-none"
        >
          <h2 className="m-0 text-lg font-bold">Sickness reported</h2>
          <p className="m-0">Your sickness report is effective and awaiting acknowledgement.</p>
          <ul className="m-0 grid gap-1 pl-5 text-sm" aria-label="Reported sickness coverage">
            {success.coverage.map((coverage) => (
              <li key={`${coverage.localDate}-${coverage.kind}-${coverage.startsAtMinute ?? ''}`}>
                {formatLocalDate(coverage.localDate)} —{' '}
                {coverageLabel(coverage.kind, coverage.startsAtMinute, coverage.endsAtMinute)}:{' '}
                {formatDuration(coverage.creditMinutes)} credited
                {coverage.holiday ? ' (public holiday; no credit needed)' : ''}
              </li>
            ))}
          </ul>
          <Link className="wl-button-secondary w-fit" to="/today">
            Return to Today
          </Link>
        </div>
      )}
    </section>
  );
}

function DateField(
  props: Readonly<{
    error?: string | undefined;
    id: 'endDate' | 'localDate' | 'startDate';
    label: string;
    onChange: (value: string) => void;
    value: string;
  }>,
) {
  return <Field {...props} type="date" />;
}
function TimeField(
  props: Readonly<{
    error?: string | undefined;
    id: 'endsAt' | 'startsAt';
    label: string;
    onChange: (value: string) => void;
    value: string;
  }>,
) {
  return <Field {...props} type="time" />;
}
function Field(
  props: Readonly<{
    error?: string | undefined;
    id: string;
    label: string;
    onChange: (value: string) => void;
    type: 'date' | 'time';
    value: string;
  }>,
) {
  return (
    <div className="grid gap-2">
      <label htmlFor={props.id} className="font-semibold">
        {props.label}
      </label>
      <input
        id={props.id}
        type={props.type}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        aria-describedby={props.error === undefined ? undefined : `${props.id}-error`}
        aria-invalid={props.error === undefined ? undefined : true}
        className="wl-text-field"
      />
      {props.error === undefined ? null : (
        <p id={`${props.id}-error`} className="m-0 text-sm text-[var(--wl-danger)]">
          {props.error}
        </p>
      )}
    </div>
  );
}
function validate(values: FormValues): Readonly<Record<string, string>> {
  const errors: Record<string, string> = {};
  if (values.kind === 'FULL_DAY') {
    if (values.startDate === '') errors['startDate'] = 'Choose the first sickness day.';
    if (values.endDate === '') errors['endDate'] = 'Choose the last sickness day.';
    if (values.startDate !== '' && values.endDate !== '' && values.endDate < values.startDate)
      errors['endDate'] = 'The last day must be on or after the first day.';
  } else {
    if (values.localDate === '') errors['localDate'] = 'Choose the local date.';
    if (values.kind === 'MINUTE_INTERVAL') {
      if (values.startsAt === '') errors['startsAt'] = 'Choose a start time.';
      if (values.endsAt === '') errors['endsAt'] = 'Choose an end time.';
      if (values.startsAt !== '' && values.endsAt !== '' && values.startsAt >= values.endsAt)
        errors['endsAt'] = 'End time must be after start time.';
    }
  }
  return errors;
}
function toRequest(values: FormValues): SubmitSicknessReport {
  if (values.kind === 'FULL_DAY')
    return { endDate: values.endDate, kind: values.kind, startDate: values.startDate };
  if (values.kind === 'MINUTE_INTERVAL')
    return {
      endsAtMinute: minutesAt(values.endsAt),
      kind: values.kind,
      localDate: values.localDate,
      startsAtMinute: minutesAt(values.startsAt),
    };
  return { kind: values.kind, localDate: values.localDate };
}
function minutesAt(value: string): number {
  const [hours = 0, minutes = 0] = value.split(':').map(Number);
  return hours * 60 + minutes;
}
function coverageLabel(
  kind: CoverageKind,
  startsAtMinute: number | null,
  endsAtMinute: number | null,
): string {
  if (kind === 'FULL_DAY') return 'Full day';
  if (kind === 'FIRST_HALF') return 'First half of expected work';
  if (kind === 'SECOND_HALF') return 'Second half of expected work';
  return `${formatClock(startsAtMinute)}–${formatClock(endsAtMinute)}`;
}
function formatClock(value: number | null): string {
  if (value === null) return '';
  return `${Math.floor(value / 60)
    .toString()
    .padStart(2, '0')}:${(value % 60).toString().padStart(2, '0')}`;
}
function mapServerFieldErrors(fields: ApiClientError['fields']): Readonly<Record<string, string>> {
  return Object.fromEntries(
    Object.entries(fields ?? {}).map(([field, errors]) => [
      field,
      errors[0]?.message ?? 'Correct this value.',
    ]),
  );
}
