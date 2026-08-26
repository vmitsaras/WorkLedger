import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';

import type { SubmitSicknessReport } from '@workledger/contracts';
import {
  formatCompactDuration,
  formatDateOnly,
  translate,
  type I18nRuntime,
} from '@workledger/i18n';
import { useWorkLedgerI18n, useWorkLedgerMessage } from '@workledger/i18n/react';
import { Alert, Button, buttonVariants } from '@workledger/ui';

import {
  ApiClientError,
  submitAbsenceCancellation,
  submitSicknessReport,
} from '../app/api-client.js';
import { fieldErrorPresentation } from '../app/presentation-codes.js';
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

export function SicknessReportPage({ embedded = false }: Readonly<{ embedded?: boolean }>) {
  const runtime = useWorkLedgerI18n();
  const t = useWorkLedgerMessage();
  const summaryRef = useRef<HTMLElement>(null);
  const successRef = useRef<HTMLElement>(null);
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [fieldErrors, setFieldErrors] = useState<Readonly<Record<string, string>>>({});
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [cancellationError, setCancellationError] = useState<string>();
  const [cancellationPending, setCancellationPending] = useState(false);
  const [cancellationRequested, setCancellationRequested] = useState(false);
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
    setCancellationError(undefined);
    setCancellationRequested(false);
  }
  async function requestCancellation() {
    if (success === null) return;
    setCancellationPending(true);
    setCancellationError(undefined);
    try {
      await submitAbsenceCancellation(success.id, { expectedRequestVersion: success.version });
      setCancellationRequested(true);
    } catch (error) {
      if (error instanceof ApiClientError && error.code === 'PERIOD_ADJUSTMENT_REQUIRED') {
        setCancellationError(t('employee.absence.sickness.cancellation.locked'));
      } else if (error instanceof ApiClientError && error.code === 'ABSENCE_CANNOT_CANCEL') {
        setCancellationError(t('employee.absence.sickness.cancellation.cannotCancel'));
      } else setCancellationError(t('employee.absence.sickness.cancellation.error'));
    } finally {
      setCancellationPending(false);
    }
  }
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validate(values, t);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError(t('employee.absence.sickness.error.correct'));
      return;
    }
    setSubmitting(true);
    setFormError(undefined);
    try {
      setSuccess(await submitSicknessReport(toRequest(values)));
    } catch (error) {
      if (error instanceof ApiClientError && error.fields !== undefined) {
        setFieldErrors(mapServerFieldErrors(error.fields, runtime));
        setFormError(t('employee.absence.sickness.error.correct'));
      } else if (error instanceof ApiClientError && error.code === 'ABSENCE_RETROACTIVE_LIMIT')
        setFormError(t('employee.absence.sickness.error.retroactive'));
      else if (error instanceof ApiClientError && error.code === 'ABSENCE_OVERLAP')
        setFormError(t('employee.absence.sickness.error.overlap'));
      else setFormError(t('employee.absence.sickness.error.unavailable'));
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <section className="grid max-w-3xl gap-6">
      {embedded ? null : (
        <PageHeader
          eyebrow={t('employee.absence.sickness.eyebrow')}
          title={t('employee.absence.sickness.title')}
          description={t('employee.absence.sickness.description')}
        />
      )}
      {embedded ? (
        <p className="m-0 text-[var(--wl-text-muted)]">
          {t('employee.absence.sickness.description')}
        </p>
      ) : null}
      {success === null ? (
        <form noValidate className="grid gap-6" onSubmit={(event) => void onSubmit(event)}>
          <FormErrorSummary
            fieldErrors={fieldErrors}
            formError={formError}
            summaryRef={summaryRef}
          />
          <fieldset className="grid gap-4 rounded-xl border border-[var(--wl-border)] p-4">
            <legend className="px-1 text-lg font-bold">
              {t('employee.absence.sickness.form.legend')}
            </legend>
            <div className="grid gap-2">
              <label htmlFor="coverage-kind" className="font-semibold">
                {t('employee.absence.coverage.label')}
              </label>
              <select
                id="coverage-kind"
                className="wl-text-field"
                value={values.kind}
                onChange={(event) => update('kind', event.target.value)}
              >
                <option value="FULL_DAY">
                  {t('employee.absence.coverage.option.fullDayRange')}
                </option>
                <option value="FIRST_HALF">
                  {t('employee.absence.coverage.option.firstHalf')}
                </option>
                <option value="SECOND_HALF">
                  {t('employee.absence.coverage.option.secondHalf')}
                </option>
                <option value="MINUTE_INTERVAL">
                  {t('employee.absence.coverage.option.exact')}
                </option>
              </select>
              <p className="m-0 text-sm text-[var(--wl-text-muted)]">
                {t('employee.absence.coverage.help')}
              </p>
            </div>
            {values.kind === 'FULL_DAY' ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <DateField
                  error={fieldErrors['startDate']}
                  id="startDate"
                  label={t('employee.absence.coverage.field.firstDay')}
                  onChange={(value) => update('startDate', value)}
                  value={values.startDate}
                />
                <DateField
                  error={fieldErrors['endDate']}
                  id="endDate"
                  label={t('employee.absence.coverage.field.lastDay')}
                  onChange={(value) => update('endDate', value)}
                  value={values.endDate}
                />
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-3">
                <DateField
                  error={fieldErrors['localDate']}
                  id="localDate"
                  label={t('employee.absence.coverage.field.localDate')}
                  onChange={(value) => update('localDate', value)}
                  value={values.localDate}
                />
                {values.kind === 'MINUTE_INTERVAL' ? (
                  <TimeField
                    error={fieldErrors['startsAt']}
                    id="startsAt"
                    label={t('employee.absence.coverage.field.startTime')}
                    onChange={(value) => update('startsAt', value)}
                    value={values.startsAt}
                  />
                ) : null}
                {values.kind === 'MINUTE_INTERVAL' ? (
                  <TimeField
                    error={fieldErrors['endsAt']}
                    id="endsAt"
                    label={t('employee.absence.coverage.field.endTime')}
                    onChange={(value) => update('endsAt', value)}
                    value={values.endsAt}
                  />
                ) : null}
              </div>
            )}
          </fieldset>
          <p className="m-0 text-sm text-[var(--wl-text-muted)]">
            {t('employee.absence.sickness.form.notice')}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" isDisabled={submitting}>
              {submitting
                ? t('employee.absence.sickness.form.submitting')
                : t('employee.absence.sickness.form.submit')}
            </Button>
            <Link className={buttonVariants({ variant: 'secondary' })} to="/requests/new">
              {t('employee.absence.action.cancel')}
            </Link>
          </div>
        </form>
      ) : (
        <Alert
          className="outline-none"
          ref={successRef}
          tabIndex={-1}
          title={t('employee.absence.sickness.success.title')}
          tone="success"
        >
          <p className="m-0">{t('employee.absence.sickness.success.description')}</p>
          <ul
            className="m-0 grid gap-1 pl-5 text-sm"
            aria-label={t('employee.absence.sickness.success.coverageLabel')}
          >
            {success.coverage.map((coverage) => (
              <li key={`${coverage.localDate}-${coverage.kind}-${coverage.startsAtMinute ?? ''}`}>
                {t('employee.absence.coverage.line', {
                  coverage: coverageLabel(
                    coverage.kind,
                    coverage.startsAtMinute,
                    coverage.endsAtMinute,
                    t,
                  ),
                  date: formatDateOnly(runtime.locale, coverage.localDate),
                  duration: t('employee.absence.sickness.success.credited', {
                    duration: formatCompactDuration(runtime, coverage.creditMinutes),
                  }),
                  note: coverage.holiday ? t('employee.absence.sickness.success.holidayNote') : '',
                })}
              </li>
            ))}
          </ul>
          {cancellationRequested ? (
            <p className="m-0" role="status">
              {t('employee.absence.sickness.cancellation.requested')}
            </p>
          ) : (
            <div className="grid gap-2">
              <Button
                className="w-fit"
                type="button"
                isDisabled={cancellationPending}
                onPress={() => void requestCancellation()}
                variant="secondary"
              >
                {cancellationPending
                  ? t('employee.absence.sickness.cancellation.pending')
                  : t('employee.absence.sickness.cancellation.request')}
              </Button>
              <p className="m-0 text-sm text-[var(--wl-text-muted)]">
                {t('employee.absence.sickness.cancellation.description')}
              </p>
              {cancellationError === undefined ? null : (
                <p className="m-0 text-sm text-[var(--wl-danger)]" role="alert">
                  {cancellationError}
                </p>
              )}
            </div>
          )}
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
function validate(
  values: FormValues,
  t: ReturnType<typeof useWorkLedgerMessage>,
): Readonly<Record<string, string>> {
  const errors: Record<string, string> = {};
  if (values.kind === 'FULL_DAY') {
    if (values.startDate === '')
      errors['startDate'] = t('employee.absence.coverage.validation.firstDay');
    if (values.endDate === '')
      errors['endDate'] = t('employee.absence.coverage.validation.lastDay');
    if (values.startDate !== '' && values.endDate !== '' && values.endDate < values.startDate)
      errors['endDate'] = t('employee.absence.coverage.validation.lastDayAfterFirst');
  } else {
    if (values.localDate === '')
      errors['localDate'] = t('employee.absence.coverage.validation.localDate');
    if (values.kind === 'MINUTE_INTERVAL') {
      if (values.startsAt === '')
        errors['startsAt'] = t('employee.absence.coverage.validation.startTime');
      if (values.endsAt === '')
        errors['endsAt'] = t('employee.absence.coverage.validation.endTime');
      if (values.startsAt !== '' && values.endsAt !== '' && values.startsAt >= values.endsAt)
        errors['endsAt'] = t('employee.absence.coverage.validation.endAfterStart');
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
  t: ReturnType<typeof useWorkLedgerMessage>,
): string {
  if (kind === 'FULL_DAY') return t('employee.absence.coverage.name.fullDay');
  if (kind === 'FIRST_HALF') return t('employee.absence.coverage.name.firstHalf');
  if (kind === 'SECOND_HALF') return t('employee.absence.coverage.name.secondHalf');
  return `${formatClock(startsAtMinute)}–${formatClock(endsAtMinute)}`;
}
function formatClock(value: number | null): string {
  if (value === null) return '';
  return `${Math.floor(value / 60)
    .toString()
    .padStart(2, '0')}:${(value % 60).toString().padStart(2, '0')}`;
}
function mapServerFieldErrors(
  fields: ApiClientError['fields'],
  runtime: I18nRuntime,
): Readonly<Record<string, string>> {
  return Object.fromEntries(
    Object.entries(fields ?? {}).map(([field, errors]) => [
      field,
      errors[0] === undefined
        ? translate(runtime, 'shared.validation.correctValue')
        : fieldErrorPresentation(errors[0].code, runtime),
    ]),
  );
}
