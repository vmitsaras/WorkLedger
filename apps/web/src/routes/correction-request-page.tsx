import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';

import type { DailyTimeRecord } from '@workledger/contracts';
import {
  formatCompactDuration,
  formatDateOnly,
  formatInstant,
  translate,
  type I18nRuntime,
  type MessageKey,
} from '@workledger/i18n';
import { useWorkLedgerI18n, useWorkLedgerMessage } from '@workledger/i18n/react';
import { Alert, Button, RouteState, buttonVariants } from '@workledger/ui';

import { ApiClientError, submitCorrectionRequest } from '../app/api-client.js';
import { fieldErrorPresentation } from '../app/presentation-codes.js';
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

const EVENT_LABEL_KEYS = {
  BREAK_END: 'employee.records.event.breakEnd',
  BREAK_START: 'employee.records.event.breakStart',
  CLOCK_IN: 'employee.records.event.clockIn',
  CLOCK_OUT: 'employee.records.event.clockOut',
} as const satisfies Readonly<Record<DailyTimeRecord['events'][number]['type'], MessageKey>>;

export function CorrectionRequestPage({ embedded = false }: Readonly<{ embedded?: boolean }>) {
  const runtime = useWorkLedgerI18n();
  const t = useWorkLedgerMessage();
  const [search] = useSearchParams();
  const recordId = search.get('recordId');
  const summaryRef = useRef<HTMLElement>(null);
  const successRef = useRef<HTMLElement>(null);
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [fieldErrors, setFieldErrors] = useState<Readonly<Record<string, string>>>({});
  const [formError, setFormError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<Readonly<{
    applicationMode: 'ORDINARY_CORRECTION' | 'POST_LOCK_ADJUSTMENT';
    id: string;
    localDate: string;
    minutes: number;
  }> | null>(null);
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

  if (recordId === null) return <MissingRecordTarget embedded={embedded} />;
  if (recordQuery.isPending) return <LoadingCorrectionRequest embedded={embedded} />;
  if (recordQuery.isError || recordQuery.data === undefined)
    return <UnavailableRecord embedded={embedded} error={recordQuery.error} />;
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
    const errors = validate(values, t);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError(t('employee.correction.error.correct'));
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
      setSuccess({
        applicationMode: submitted.applicationMode,
        id: submitted.id,
        localDate: submitted.localDate,
        minutes: submitted.proposedDurationMinutes,
      });
    } catch (error) {
      if (error instanceof ApiClientError && error.code === 'VALIDATION_FAILED') {
        setFieldErrors(mapServerFieldErrors(error.fields, runtime, t));
        setFormError(t('employee.correction.error.correct'));
      } else if (error instanceof ApiClientError && error.code === 'ROUTE_NOT_FOUND') {
        setFormError(t('employee.correction.error.notFound'));
      } else {
        setFormError(t('employee.correction.error.unavailable'));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="grid max-w-4xl gap-8">
      {embedded ? null : (
        <PageHeader
          eyebrow={t('employee.correction.eyebrow')}
          title={t('employee.correction.title')}
          description={t('employee.correction.description', {
            date: formatDateOnly(runtime.locale, record.localDate),
          })}
        />
      )}
      {embedded ? (
        <p className="m-0 text-[var(--wl-text-muted)]">
          {t('employee.correction.description', {
            date: formatDateOnly(runtime.locale, record.localDate),
          })}
        </p>
      ) : null}
      <section
        aria-labelledby="original-record-heading"
        className="grid gap-3 rounded-xl border border-[var(--wl-border)] p-4"
      >
        <h2 id="original-record-heading" className="m-0 text-lg font-bold">
          {t('employee.correction.original.heading')}
        </h2>
        <p className="m-0 text-sm text-[var(--wl-text-muted)]">
          {t('employee.correction.original.description')}
        </p>
        {record.events.length === 0 ? (
          <p className="m-0">{t('employee.correction.original.empty')}</p>
        ) : (
          <ul className="m-0 grid gap-1 pl-5">
            {record.events.map((event) => (
              <li key={event.sequence}>
                {t('employee.correction.original.event', {
                  event: t(EVENT_LABEL_KEYS[event.type]),
                  time: formatClockTimeWithOffset(runtime, event.occurredAt, record.timeZone),
                })}
              </li>
            ))}
          </ul>
        )}
        {record.calculation === null ? null : (
          <p className="m-0 text-sm">
            {t('employee.correction.original.currentWorked', {
              duration: formatCompactDuration(runtime, record.calculation.workedMinutes),
            })}
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
            <legend className="px-1 text-lg font-bold">
              {t('employee.correction.form.legend')}
            </legend>
            <p className="m-0 text-sm text-[var(--wl-text-muted)]">
              {t('employee.correction.form.help')}
            </p>
            <TimeField
              id="startsAtLocalTime"
              label={t('employee.correction.form.field.startTime')}
              value={values.startsAtLocalTime}
              error={fieldErrors['startsAtLocalTime']}
              onChange={(value) => updateValue('startsAtLocalTime', value)}
            />
            <OffsetField
              id="startsAtUtcOffset"
              label={t('employee.correction.form.field.startOffset')}
              value={values.startsAtUtcOffset}
              error={fieldErrors['startsAtUtcOffset']}
              onChange={(value) => updateValue('startsAtUtcOffset', value)}
            />
            <TimeField
              id="endsAtLocalTime"
              label={t('employee.correction.form.field.endTime')}
              value={values.endsAtLocalTime}
              error={fieldErrors['endsAtLocalTime']}
              onChange={(value) => updateValue('endsAtLocalTime', value)}
            />
            <OffsetField
              id="endsAtUtcOffset"
              label={t('employee.correction.form.field.endOffset')}
              value={values.endsAtUtcOffset}
              error={fieldErrors['endsAtUtcOffset']}
              onChange={(value) => updateValue('endsAtUtcOffset', value)}
            />
            {fieldErrors['interval'] === undefined ? null : (
              <p className="m-0 text-sm text-[var(--wl-danger)]">{fieldErrors['interval']}</p>
            )}
          </fieldset>
          <div className="grid gap-2">
            <label htmlFor="reason" className="font-semibold">
              {t('employee.correction.form.field.reason')}
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
              {t('employee.correction.form.reasonHelp')}
            </p>
            {fieldErrors['reason'] === undefined ? null : (
              <p id="reason-error" className="m-0 text-sm text-[var(--wl-danger)]">
                {fieldErrors['reason']}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" isDisabled={isSubmitting}>
              {isSubmitting
                ? t('employee.correction.form.submitting')
                : t('employee.correction.form.submit')}
            </Button>
            <Link
              className={buttonVariants({ variant: 'secondary' })}
              to={`/time-records/${encodeURIComponent(recordId)}`}
            >
              {t('employee.correction.action.cancel')}
            </Link>
          </div>
        </form>
      ) : (
        <Alert
          className="outline-none"
          ref={successRef}
          tabIndex={-1}
          title={t('employee.correction.success.title')}
          tone="success"
        >
          <p className="m-0">
            {t('employee.correction.success.description', {
              date: formatDateOnly(runtime.locale, success.localDate),
              duration: formatCompactDuration(runtime, success.minutes),
            })}{' '}
            {success.applicationMode === 'POST_LOCK_ADJUSTMENT'
              ? t('employee.correction.success.locked')
              : t('employee.correction.success.ordinary')}
          </p>
          <Link
            className={buttonVariants({ variant: 'secondary', className: 'w-fit' })}
            to={`/requests/${success.id}`}
          >
            {t('employee.absence.action.viewDetails')}
          </Link>
        </Alert>
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
        placeholder={'09:00'}
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
        placeholder={'+01:00'}
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
function validate(values: FormValues, t: ReturnType<typeof useWorkLedgerMessage>) {
  const errors: Record<string, string> = {};
  if (!LOCAL_TIME_PATTERN.test(values.startsAtLocalTime))
    errors['startsAtLocalTime'] = t('employee.correction.validation.startTime');
  if (!LOCAL_TIME_PATTERN.test(values.endsAtLocalTime))
    errors['endsAtLocalTime'] = t('employee.correction.validation.endTime');
  if (values.startsAtUtcOffset !== '' && !UTC_OFFSET_PATTERN.test(values.startsAtUtcOffset))
    errors['startsAtUtcOffset'] = t('employee.correction.validation.startOffset');
  if (values.endsAtUtcOffset !== '' && !UTC_OFFSET_PATTERN.test(values.endsAtUtcOffset))
    errors['endsAtUtcOffset'] = t('employee.correction.validation.endOffset');
  if (values.reason.trim().length < 10)
    errors['reason'] = t('employee.correction.validation.reason');
  return errors;
}
function emptyToNull(value: string) {
  return value === '' ? null : value;
}
function mapServerFieldErrors(
  fields: ApiClientError['fields'],
  runtime: I18nRuntime,
  t: ReturnType<typeof useWorkLedgerMessage>,
): Readonly<Record<string, string>> {
  if (fields === undefined) return { interval: t('employee.correction.error.interval') };
  const entries = Object.entries(fields).map(([field, errors]) => [
    field === 'interval' ? 'interval' : field.replace('interval.', ''),
    errors[0] === undefined
      ? translate(runtime, 'shared.validation.correctValue')
      : fieldErrorPresentation(errors[0].code, runtime),
  ]);
  return Object.fromEntries(entries);
}
function LoadingCorrectionRequest({ embedded }: Readonly<{ embedded: boolean }>) {
  const t = useWorkLedgerMessage();
  return (
    <section className="grid max-w-4xl gap-6">
      {embedded ? (
        <h2 className="m-0 text-xl font-bold">{t('employee.correction.loading.heading')}</h2>
      ) : (
        <PageHeader
          eyebrow={t('employee.correction.eyebrow')}
          title={t('employee.correction.title')}
          description={t('employee.correction.loading.heading')}
        />
      )}
      <RouteState kind="loading" title={t('employee.correction.loading.title')}>
        <p>{t('employee.correction.loading.description')}</p>
      </RouteState>
    </section>
  );
}
function MissingRecordTarget({ embedded }: Readonly<{ embedded: boolean }>) {
  const t = useWorkLedgerMessage();
  return (
    <section className="grid max-w-4xl gap-6">
      {embedded ? null : (
        <PageHeader
          eyebrow={t('employee.correction.eyebrow')}
          title={t('employee.correction.missing.title')}
          description={t('employee.correction.missing.description')}
        />
      )}
      <RouteState
        actionHref="/my-time"
        actionLabel={t('employee.correction.action.backToTime')}
        kind="empty"
        title={t('employee.correction.missing.title')}
      >
        <p>{t('employee.correction.missing.description')}</p>
      </RouteState>
    </section>
  );
}
function UnavailableRecord({ embedded, error }: Readonly<{ embedded: boolean; error: unknown }>) {
  const t = useWorkLedgerMessage();
  const denied = error instanceof ApiClientError && error.code === 'ACCESS_DENIED';
  const title = denied
    ? t('employee.correction.unavailable.denied.title')
    : t('employee.correction.unavailable.record.title');
  const description = denied
    ? t('employee.correction.unavailable.denied.description')
    : t('employee.correction.unavailable.record.description');
  return (
    <section className="grid max-w-4xl gap-6">
      {embedded ? null : (
        <PageHeader
          eyebrow={t('employee.correction.eyebrow')}
          title={title}
          description={description}
        />
      )}
      <RouteState
        actionHref="/my-time"
        actionLabel={t('employee.correction.action.backToTime')}
        kind={denied ? 'permission-denied' : 'error'}
        title={title}
      >
        <p>{description}</p>
      </RouteState>
    </section>
  );
}

function formatClockTimeWithOffset(
  runtime: I18nRuntime,
  instant: string,
  timeZone: string,
): string {
  return formatInstant(runtime.locale, instant, timeZone, {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'shortOffset',
  });
}
