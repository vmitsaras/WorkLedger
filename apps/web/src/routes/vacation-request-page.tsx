import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';

import { ApiClientError, submitVacationRequest } from '../app/api-client.js';
import { formatDuration, formatLocalDate } from '../app/date-time-format.js';
import { FormErrorSummary } from '../components/form-error-summary.js';
import { PageHeader } from '../components/page-header.js';

type FormValues = Readonly<{ endDate: string; startDate: string }>;

const EMPTY_VALUES: FormValues = Object.freeze({ endDate: '', startDate: '' });

export function VacationRequestPage() {
  const summaryRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [fieldErrors, setFieldErrors] = useState<Readonly<Record<string, string>>>({});
  const [formError, setFormError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<Awaited<ReturnType<typeof submitVacationRequest>> | null>(
    null,
  );

  useEffect(() => {
    if (Object.keys(fieldErrors).length > 0 || formError !== undefined) summaryRef.current?.focus();
  }, [fieldErrors, formError]);
  useEffect(() => {
    if (success !== null) successRef.current?.focus();
  }, [success]);

  function updateValue(key: keyof FormValues, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (current[key] === undefined) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
    setFormError(undefined);
    setSuccess(null);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validate(values);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError('Correct the highlighted fields and submit your vacation request again.');
      return;
    }
    setIsSubmitting(true);
    setFormError(undefined);
    try {
      setSuccess(await submitVacationRequest(values));
    } catch (error) {
      if (error instanceof ApiClientError && error.fields !== undefined) {
        setFieldErrors(mapServerFieldErrors(error.fields));
        setFormError('Correct the highlighted fields and submit your vacation request again.');
      } else if (error instanceof ApiClientError && error.code === 'ABSENCE_OVERLAP') {
        setFormError('This range overlaps another absence request. Choose different dates.');
      } else if (error instanceof ApiClientError && error.code === 'SCHEDULE_NOT_ASSIGNED') {
        setFormError(
          'WorkLedger cannot calculate this request because a work schedule is missing.',
        );
      } else {
        setFormError('WorkLedger could not submit your vacation request. Try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="grid max-w-3xl gap-6">
      <PageHeader
        eyebrow="Requests"
        title="Request vacation"
        description="Choose the first and last local dates. Weekends, public holidays, and zero-hour days remain visible but use no vacation entitlement."
      />
      {success === null ? (
        <form noValidate className="grid gap-6" onSubmit={(event) => void onSubmit(event)}>
          <FormErrorSummary
            fieldErrors={fieldErrors}
            formError={formError}
            summaryRef={summaryRef}
          />
          <fieldset className="grid gap-4 rounded-xl border border-[var(--wl-border)] p-4 sm:grid-cols-2">
            <legend className="px-1 text-lg font-bold">Vacation dates</legend>
            <DateField
              error={fieldErrors['startDate']}
              id="startDate"
              label="First day"
              onChange={(value) => updateValue('startDate', value)}
              value={values.startDate}
            />
            <DateField
              error={fieldErrors['endDate']}
              id="endDate"
              label="Last day"
              onChange={(value) => updateValue('endDate', value)}
              value={values.endDate}
            />
          </fieldset>
          <p className="m-0 text-sm text-[var(--wl-text-muted)]">
            Submitting reserves the calculated entitlement while your request awaits approval. It
            does not change your daily time calculation yet.
          </p>
          <div className="flex flex-wrap gap-3">
            <button className="wl-button-primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting request…' : 'Submit vacation request'}
            </button>
            <Link className="wl-button-secondary" to="/my-balances">
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
          <h2 className="m-0 text-lg font-bold">Vacation request submitted</h2>
          <p className="m-0">
            Your request covers {success.coverage.length.toString()} local day
            {success.coverage.length === 1 ? '' : 's'} and reserves{' '}
            {formatDuration(success.entitlementMinutes)}. Your projected remaining vacation balance
            is {formatDuration(success.projectedRemainingMinutes, true)}.
          </p>
          <ul className="m-0 grid gap-1 pl-5 text-sm" aria-label="Vacation coverage">
            {success.coverage.map((coverage) => (
              <li key={coverage.localDate}>
                {formatLocalDate(coverage.localDate)} —{' '}
                {formatDuration(coverage.entitlementMinutes)}
                {coverage.holiday
                  ? ' (public holiday; no entitlement used)'
                  : coverage.scheduledMinutes === 0
                    ? ' (zero-hour day; no entitlement used)'
                    : ''}
              </li>
            ))}
          </ul>
          <Link className="wl-button-secondary w-fit" to="/my-balances">
            View My balances
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

function validate(values: FormValues): Readonly<Record<string, string>> {
  const errors: Record<string, string> = {};
  if (values.startDate === '') errors['startDate'] = 'Choose the first vacation day.';
  if (values.endDate === '') errors['endDate'] = 'Choose the last vacation day.';
  if (values.startDate !== '' && values.endDate !== '' && values.endDate < values.startDate) {
    errors['endDate'] = 'The last day must be on or after the first day.';
  }
  return errors;
}

function mapServerFieldErrors(fields: ApiClientError['fields']): Readonly<Record<string, string>> {
  return Object.fromEntries(
    Object.entries(fields ?? {}).map(([field, errors]) => [
      field,
      errors[0]?.message ?? 'Correct this value.',
    ]),
  );
}
