import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';

import { ApiClientError, submitCorrectionRequest } from '../app/api-client.js';
import { formatDuration, formatLocalDate, formatTimeWithOffset } from '../app/date-time-format.js';
import { dailyTimeRecordQuery } from '../app/query.js';
import { FormErrorSummary } from '../components/form-error-summary.js';
import { PageHeader } from '../components/page-header.js';

type FormValues = Readonly<{
  endsAtLocalTime: string;
  endsAtUtcOffset: string;
  reason: string;
  startsAtLocalTime: string;
  startsAtUtcOffset: string;
}>;

const EMPTY_VALUES: FormValues = Object.freeze({
  endsAtLocalTime: '',
  endsAtUtcOffset: '',
  reason: '',
  startsAtLocalTime: '',
  startsAtUtcOffset: '',
});
const LOCAL_TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const UTC_OFFSET_PATTERN = /^[+-](?:0\d|1\d|2[0-3]):[0-5]\d$/;

export function CorrectionRequestPage() {
  const [search] = useSearchParams();
  const recordId = search.get('recordId');
  const summaryRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [fieldErrors, setFieldErrors] = useState<Readonly<Record<string, string>>>({});
  const [formError, setFormError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<Readonly<{ localDate: string; minutes: number }> | null>(
    null,
  );
  const recordQuery = useQuery({
    ...dailyTimeRecordQuery(recordId ?? ''),
    enabled: recordId !== null,
  });

  useEffect(() => {
    if (Object.keys(fieldErrors).length > 0 || formError !== undefined) summaryRef.current?.focus();
  }, [fieldErrors, formError]);
  useEffect(() => {
    if (success !== null) successRef.current?.focus();
  }, [success]);

  if (recordId === null) return <MissingRecordTarget />;
  if (recordQuery.isPending) return <LoadingCorrectionRequest />;
  if (recordQuery.isError || recordQuery.data === undefined)
    return <UnavailableRecord error={recordQuery.error} />;
  const record = recordQuery.data;
  const correctionRecordId = recordId;

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
      setFormError('Correct the highlighted fields and submit the request again.');
      return;
    }
    setIsSubmitting(true);
    setFieldErrors({});
    setFormError(undefined);
    try {
      const submitted = await submitCorrectionRequest({
        interval: {
          endsAtLocalTime: values.endsAtLocalTime,
          endsAtUtcOffset: emptyToNull(values.endsAtUtcOffset),
          startsAtLocalTime: values.startsAtLocalTime,
          startsAtUtcOffset: emptyToNull(values.startsAtUtcOffset),
        },
        reason: values.reason.trim(),
        recordId: correctionRecordId,
      });
      setSuccess({ localDate: submitted.localDate, minutes: submitted.proposedDurationMinutes });
    } catch (error) {
      if (error instanceof ApiClientError && error.code === 'VALIDATION_FAILED') {
        setFieldErrors(mapServerFieldErrors(error.fields));
        setFormError('Correct the highlighted fields and submit the request again.');
      } else if (error instanceof ApiClientError && error.code === 'ROUTE_NOT_FOUND') {
        setFormError('This daily record is no longer available for a correction request.');
      } else {
        setFormError(
          'WorkLedger could not submit the correction request. Your recorded events were not changed. Try again.',
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="grid max-w-4xl gap-8">
      <PageHeader
        eyebrow="Requests"
        title="Request a time correction"
        description={`Propose one replacement work interval for ${formatLocalDate(record.localDate)}. It will be reviewed before it can affect your record.`}
      />
      <section
        aria-labelledby="original-record-heading"
        className="grid gap-3 rounded-xl border border-[var(--wl-border)] p-4"
      >
        <h2 id="original-record-heading" className="m-0 text-lg font-bold">
          Current recorded facts
        </h2>
        <p className="m-0 text-sm text-[var(--wl-text-muted)]">
          Recorded events are immutable. This request preserves them alongside your proposal.
        </p>
        {record.events.length === 0 ? (
          <p className="m-0">No event was recorded on this date.</p>
        ) : (
          <ul className="m-0 grid gap-1 pl-5">
            {record.events.map((event) => (
              <li key={event.sequence}>
                {event.type.replace('_', ' ').toLowerCase()} at{' '}
                {formatTimeWithOffset(event.occurredAt, record.timeZone)}
              </li>
            ))}
          </ul>
        )}
        {record.calculation === null ? null : (
          <p className="m-0 text-sm">
            Current worked time: <strong>{formatDuration(record.calculation.workedMinutes)}</strong>
            .
          </p>
        )}
      </section>
      {success === null ? (
        <form noValidate className="grid gap-6" onSubmit={(event) => void onSubmit(event)}>
          <FormErrorSummary
            fieldErrors={fieldErrors}
            formError={formError}
            summaryRef={summaryRef}
          />
          <fieldset
            id="interval"
            className="grid gap-4 rounded-xl border border-[var(--wl-border)] p-4"
          >
            <legend className="px-1 text-lg font-bold">Proposed work interval</legend>
            <p className="m-0 text-sm text-[var(--wl-text-muted)]">
              Enter local time in 24-hour format. If this date contains a repeated daylight-saving
              time, provide the displayed UTC offset.
            </p>
            <TimeField
              id="startsAtLocalTime"
              label="Start time"
              value={values.startsAtLocalTime}
              error={fieldErrors['startsAtLocalTime']}
              onChange={(value) => updateValue('startsAtLocalTime', value)}
            />
            <OffsetField
              id="startsAtUtcOffset"
              label="Start UTC offset (only for repeated local times)"
              value={values.startsAtUtcOffset}
              error={fieldErrors['startsAtUtcOffset']}
              onChange={(value) => updateValue('startsAtUtcOffset', value)}
            />
            <TimeField
              id="endsAtLocalTime"
              label="End time"
              value={values.endsAtLocalTime}
              error={fieldErrors['endsAtLocalTime']}
              onChange={(value) => updateValue('endsAtLocalTime', value)}
            />
            <OffsetField
              id="endsAtUtcOffset"
              label="End UTC offset (only for repeated local times)"
              value={values.endsAtUtcOffset}
              error={fieldErrors['endsAtUtcOffset']}
              onChange={(value) => updateValue('endsAtUtcOffset', value)}
            />
            {fieldErrors['interval'] === undefined ? null : (
              <p className="m-0 text-sm text-[var(--wl-danger)]" role="alert">
                {fieldErrors['interval']}
              </p>
            )}
          </fieldset>
          <div className="grid gap-2">
            <label htmlFor="reason" className="font-semibold">
              Why does this need correcting?
            </label>
            <textarea
              id="reason"
              value={values.reason}
              onChange={(event) => updateValue('reason', event.target.value)}
              aria-describedby={
                fieldErrors['reason'] === undefined ? 'reason-hint' : 'reason-error'
              }
              aria-invalid={fieldErrors['reason'] === undefined ? undefined : true}
              className="min-h-28 rounded-lg border border-[var(--wl-border)] bg-[var(--wl-surface)] p-3"
              maxLength={1000}
            />
            <p id="reason-hint" className="m-0 text-sm text-[var(--wl-text-muted)]">
              Give a short, factual reason (10–1,000 characters). Do not include sensitive health
              information.
            </p>
            {fieldErrors['reason'] === undefined ? null : (
              <p id="reason-error" className="m-0 text-sm text-[var(--wl-danger)]">
                {fieldErrors['reason']}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="wl-button-primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting request…' : 'Submit correction request'}
            </button>
            <Link
              className="wl-button-secondary"
              to={`/time-records/${encodeURIComponent(recordId)}`}
            >
              Cancel
            </Link>
          </div>
        </form>
      ) : (
        <div
          ref={successRef}
          tabIndex={-1}
          role="status"
          className="wl-alert m-0 grid gap-3 rounded-xl border p-4 outline-none"
        >
          <h2 className="m-0 text-lg font-bold">Correction request submitted</h2>
          <p className="m-0">
            Your proposed {formatDuration(success.minutes)} interval for{' '}
            {formatLocalDate(success.localDate)} is awaiting review. Your recorded events and
            calculation have not changed.
          </p>
          <Link
            className="wl-button-secondary w-fit"
            to={`/time-records/${encodeURIComponent(recordId)}`}
          >
            Return to daily record
          </Link>
        </div>
      )}
    </section>
  );
}

function TimeField(
  props: Readonly<{
    error?: string | undefined;
    id: string;
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
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        inputMode="numeric"
        placeholder="09:00"
        aria-describedby={props.error === undefined ? undefined : `${props.id}-error`}
        aria-invalid={props.error === undefined ? undefined : true}
        className="max-w-48 rounded-lg border border-[var(--wl-border)] bg-[var(--wl-surface)] p-3"
      />
      {props.error === undefined ? null : (
        <p id={`${props.id}-error`} className="m-0 text-sm text-[var(--wl-danger)]">
          {props.error}
        </p>
      )}
    </div>
  );
}
function OffsetField(
  props: Readonly<{
    error?: string | undefined;
    id: string;
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
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        placeholder="+01:00"
        aria-describedby={props.error === undefined ? undefined : `${props.id}-error`}
        aria-invalid={props.error === undefined ? undefined : true}
        className="max-w-48 rounded-lg border border-[var(--wl-border)] bg-[var(--wl-surface)] p-3"
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
  if (!LOCAL_TIME_PATTERN.test(values.startsAtLocalTime))
    errors['startsAtLocalTime'] = 'Enter a start time in HH:MM format.';
  if (!LOCAL_TIME_PATTERN.test(values.endsAtLocalTime))
    errors['endsAtLocalTime'] = 'Enter an end time in HH:MM format.';
  if (values.startsAtUtcOffset !== '' && !UTC_OFFSET_PATTERN.test(values.startsAtUtcOffset))
    errors['startsAtUtcOffset'] = 'Enter a UTC offset such as +01:00.';
  if (values.endsAtUtcOffset !== '' && !UTC_OFFSET_PATTERN.test(values.endsAtUtcOffset))
    errors['endsAtUtcOffset'] = 'Enter a UTC offset such as +01:00.';
  if (values.reason.trim().length < 10)
    errors['reason'] = 'Enter at least 10 characters explaining the correction.';
  return errors;
}
function emptyToNull(value: string) {
  return value === '' ? null : value;
}
function mapServerFieldErrors(fields: ApiClientError['fields']): Readonly<Record<string, string>> {
  if (fields === undefined) return { interval: 'The proposed interval could not be accepted.' };
  const entries = Object.entries(fields).map(([field, errors]) => [
    field === 'interval' ? 'interval' : field.replace('interval.', ''),
    errors[0]?.message ?? 'Correct this value.',
  ]);
  return Object.fromEntries(entries);
}
function LoadingCorrectionRequest() {
  return (
    <section className="grid max-w-4xl gap-6" aria-busy="true">
      <PageHeader
        eyebrow="Requests"
        title="Request a time correction"
        description="Loading the daily record…"
      />
      <div
        aria-label="Loading daily record"
        role="progressbar"
        className="h-2 rounded-full bg-[var(--wl-surface-subtle)]"
      />
    </section>
  );
}
function MissingRecordTarget() {
  return (
    <section className="grid max-w-4xl gap-6">
      <PageHeader
        eyebrow="Requests"
        title="Choose a daily record"
        description="Open the daily record you want to correct, then choose Request a correction."
      />
      <Link className="wl-button-secondary w-fit" to="/my-time">
        Go to My time
      </Link>
    </section>
  );
}
function UnavailableRecord({ error }: Readonly<{ error: unknown }>) {
  const denied = error instanceof ApiClientError && error.code === 'ACCESS_DENIED';
  return (
    <section className="grid max-w-4xl gap-6">
      <PageHeader
        eyebrow="Requests"
        title={denied ? 'Permission denied' : 'Daily record unavailable'}
        description={
          denied
            ? 'You do not have access to this daily record.'
            : 'WorkLedger could not load the daily record for this correction request.'
        }
      />
      <Link className="wl-button-secondary w-fit" to="/my-time">
        Back to My time
      </Link>
    </section>
  );
}
