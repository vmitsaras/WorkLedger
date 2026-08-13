import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';

import { ApiClientError, submitSicknessReport } from '../app/api-client.js';
import { formatDuration, formatLocalDate } from '../app/date-time-format.js';
import { FormErrorSummary } from '../components/form-error-summary.js';
import { PageHeader } from '../components/page-header.js';

type FormValues = Readonly<{ endDate: string; startDate: string }>;
const EMPTY_VALUES: FormValues = Object.freeze({ endDate: '', startDate: '' });

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
    setFieldErrors((current) => {
      if (current[key] === undefined) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
    setFormError(undefined);
  }
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validate(values);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError('Correct the highlighted dates and report sickness again.');
      return;
    }
    setSubmitting(true);
    try {
      setSuccess(await submitSicknessReport(values));
    } catch (error) {
      if (error instanceof ApiClientError && error.code === 'ABSENCE_RETROACTIVE_LIMIT')
        setFormError('These dates are outside your organization’s sickness reporting window.');
      else if (error instanceof ApiClientError && error.code === 'ABSENCE_OVERLAP')
        setFormError('This range overlaps another absence request. Choose different dates.');
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
        description="Choose the first and last local dates. Do not include a diagnosis, symptoms, treatment, or other medical detail."
      />
      {success === null ? (
        <form noValidate className="grid gap-6" onSubmit={(event) => void onSubmit(event)}>
          <FormErrorSummary
            fieldErrors={fieldErrors}
            formError={formError}
            summaryRef={summaryRef}
          />
          <fieldset className="grid gap-4 rounded-xl border border-[var(--wl-border)] p-4 sm:grid-cols-2">
            <legend className="px-1 text-lg font-bold">Sickness dates</legend>
            <DateField
              id="startDate"
              label="First day"
              value={values.startDate}
              error={fieldErrors['startDate']}
              onChange={(value) => update('startDate', value)}
            />
            <DateField
              id="endDate"
              label="Last day"
              value={values.endDate}
              error={fieldErrors['endDate']}
              onChange={(value) => update('endDate', value)}
            />
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
              <li key={coverage.localDate}>
                {formatLocalDate(coverage.localDate)} — {formatDuration(coverage.creditMinutes)}{' '}
                credited{coverage.holiday ? ' (public holiday; no credit needed)' : ''}
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
    id: keyof FormValues;
    label: string;
    onChange: (value: string) => void;
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
        type="date"
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
function validate(values: FormValues) {
  const errors: Record<string, string> = {};
  if (values.startDate === '') errors['startDate'] = 'Choose the first sickness day.';
  if (values.endDate === '') errors['endDate'] = 'Choose the last sickness day.';
  if (values.startDate !== '' && values.endDate !== '' && values.endDate < values.startDate)
    errors['endDate'] = 'The last day must be on or after the first day.';
  return errors;
}
