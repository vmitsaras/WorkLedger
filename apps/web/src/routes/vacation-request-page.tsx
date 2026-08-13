import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';

import type { SubmitVacationRequest } from '@workledger/contracts';

import { ApiClientError, submitVacationRequest } from '../app/api-client.js';
import { formatDuration, formatLocalDate } from '../app/date-time-format.js';
import { FormErrorSummary } from '../components/form-error-summary.js';
import { PageHeader } from '../components/page-header.js';

type CoverageKind = SubmitVacationRequest['kind'];
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
    setFieldErrors({});
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
      setSuccess(await submitVacationRequest(toRequest(values)));
    } catch (error) {
      if (error instanceof ApiClientError && error.fields !== undefined) {
        setFieldErrors(mapServerFieldErrors(error.fields));
        setFormError('Correct the highlighted fields and submit your vacation request again.');
      } else if (error instanceof ApiClientError && error.code === 'ABSENCE_OVERLAP') {
        setFormError('This coverage overlaps another absence request. Choose different coverage.');
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
        description="Choose full-day, obligation-half, or exact time coverage. Weekends, public holidays, and zero-hour days remain visible but use no vacation entitlement."
      />
      {success === null ? (
        <form noValidate className="grid gap-6" onSubmit={(event) => void onSubmit(event)}>
          <FormErrorSummary
            fieldErrors={fieldErrors}
            formError={formError}
            summaryRef={summaryRef}
          />
          <fieldset className="grid gap-4 rounded-xl border border-[var(--wl-border)] p-4">
            <legend className="px-1 text-lg font-bold">Vacation coverage</legend>
            <div className="grid gap-2">
              <label htmlFor="coverage-kind" className="font-semibold">
                Coverage
              </label>
              <select
                id="coverage-kind"
                className="wl-text-field"
                value={values.kind}
                onChange={(event) => updateValue('kind', event.target.value)}
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
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-3">
                <DateField
                  error={fieldErrors['localDate']}
                  id="localDate"
                  label="Local date"
                  onChange={(value) => updateValue('localDate', value)}
                  value={values.localDate}
                />
                {values.kind === 'MINUTE_INTERVAL' ? (
                  <TimeField
                    error={fieldErrors['startsAt']}
                    id="startsAt"
                    label="Start time"
                    onChange={(value) => updateValue('startsAt', value)}
                    value={values.startsAt}
                  />
                ) : null}
                {values.kind === 'MINUTE_INTERVAL' ? (
                  <TimeField
                    error={fieldErrors['endsAt']}
                    id="endsAt"
                    label="End time"
                    onChange={(value) => updateValue('endsAt', value)}
                    value={values.endsAt}
                  />
                ) : null}
              </div>
            )}
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
            <Link className="wl-button-secondary" to="/requests/sickness">
              Report sickness instead
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
            Your request covers {success.coverage.length.toString()} segment
            {success.coverage.length === 1 ? '' : 's'} and reserves{' '}
            {formatDuration(success.entitlementMinutes)}. Your projected remaining vacation balance
            is {formatDuration(success.projectedRemainingMinutes, true)}.
          </p>
          <ul className="m-0 grid gap-1 pl-5 text-sm" aria-label="Vacation coverage">
            {success.coverage.map((coverage) => (
              <li key={`${coverage.localDate}-${coverage.kind}-${coverage.startsAtMinute ?? ''}`}>
                {formatLocalDate(coverage.localDate)} —{' '}
                {coverageLabel(coverage.kind, coverage.startsAtMinute, coverage.endsAtMinute)}:{' '}
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
    if (values.startDate === '') errors['startDate'] = 'Choose the first vacation day.';
    if (values.endDate === '') errors['endDate'] = 'Choose the last vacation day.';
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
function toRequest(values: FormValues): SubmitVacationRequest {
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
