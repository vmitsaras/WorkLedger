import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';

import type { SubmitVacationRequest } from '@workledger/contracts';
import {
  formatCompactDuration,
  formatDateOnly,
  translate,
  type I18nRuntime,
} from '@workledger/i18n';
import { useWorkLedgerI18n, useWorkLedgerMessage } from '@workledger/i18n/react';
import { Alert, Button, buttonVariants } from '@workledger/ui';

import { ApiClientError, submitVacationRequest } from '../app/api-client.js';
import { fieldErrorPresentation } from '../app/presentation-codes.js';
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

export function VacationRequestPage({ embedded = false }: Readonly<{ embedded?: boolean }>) {
  const runtime = useWorkLedgerI18n();
  const t = useWorkLedgerMessage();
  const summaryRef = useRef<HTMLElement>(null);
  const successRef = useRef<HTMLElement>(null);
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
    const errors = validate(values, t);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError(t('employee.absence.vacation.error.correct'));
      return;
    }
    setIsSubmitting(true);
    setFormError(undefined);
    try {
      setSuccess(await submitVacationRequest(toRequest(values)));
    } catch (error) {
      if (error instanceof ApiClientError && error.fields !== undefined) {
        setFieldErrors(mapServerFieldErrors(error.fields, runtime));
        setFormError(t('employee.absence.vacation.error.correct'));
      } else if (error instanceof ApiClientError && error.code === 'ABSENCE_OVERLAP') {
        setFormError(t('employee.absence.vacation.error.overlap'));
      } else if (error instanceof ApiClientError && error.code === 'SCHEDULE_NOT_ASSIGNED') {
        setFormError(t('employee.absence.vacation.error.scheduleMissing'));
      } else {
        setFormError(t('employee.absence.vacation.error.unavailable'));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="grid max-w-3xl gap-6">
      {embedded ? null : (
        <PageHeader
          eyebrow={t('employee.absence.vacation.eyebrow')}
          title={t('employee.absence.vacation.title')}
          description={t('employee.absence.vacation.description')}
        />
      )}
      {embedded ? (
        <p className="m-0 text-[var(--wl-text-muted)]">
          {t('employee.absence.vacation.description')}
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
              {t('employee.absence.vacation.form.legend')}
            </legend>
            <div className="grid gap-2">
              <label htmlFor="coverage-kind" className="font-semibold">
                {t('employee.absence.coverage.label')}
              </label>
              <select
                id="coverage-kind"
                className="wl-text-field"
                value={values.kind}
                onChange={(event) => updateValue('kind', event.target.value)}
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
                  onChange={(value) => updateValue('startDate', value)}
                  value={values.startDate}
                />
                <DateField
                  error={fieldErrors['endDate']}
                  id="endDate"
                  label={t('employee.absence.coverage.field.lastDay')}
                  onChange={(value) => updateValue('endDate', value)}
                  value={values.endDate}
                />
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-3">
                <DateField
                  error={fieldErrors['localDate']}
                  id="localDate"
                  label={t('employee.absence.coverage.field.localDate')}
                  onChange={(value) => updateValue('localDate', value)}
                  value={values.localDate}
                />
                {values.kind === 'MINUTE_INTERVAL' ? (
                  <TimeField
                    error={fieldErrors['startsAt']}
                    id="startsAt"
                    label={t('employee.absence.coverage.field.startTime')}
                    onChange={(value) => updateValue('startsAt', value)}
                    value={values.startsAt}
                  />
                ) : null}
                {values.kind === 'MINUTE_INTERVAL' ? (
                  <TimeField
                    error={fieldErrors['endsAt']}
                    id="endsAt"
                    label={t('employee.absence.coverage.field.endTime')}
                    onChange={(value) => updateValue('endsAt', value)}
                    value={values.endsAt}
                  />
                ) : null}
              </div>
            )}
          </fieldset>
          <p className="m-0 text-sm text-[var(--wl-text-muted)]">
            {t('employee.absence.vacation.form.notice')}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" isDisabled={isSubmitting}>
              {isSubmitting
                ? t('employee.absence.vacation.form.submitting')
                : t('employee.absence.vacation.form.submit')}
            </Button>
            <Link className={buttonVariants({ variant: 'secondary' })} to="/requests">
              {t('employee.absence.action.cancel')}
            </Link>
          </div>
        </form>
      ) : (
        <Alert
          className="outline-none"
          ref={successRef}
          tabIndex={-1}
          title={t('employee.absence.vacation.success.title')}
          tone="success"
        >
          <p className="m-0">
            {t('employee.absence.vacation.success.summary', {
              count: success.coverage.length,
              projected: formatCompactDuration(runtime, success.projectedRemainingMinutes, true),
              reserved: formatCompactDuration(runtime, success.entitlementMinutes),
            })}
          </p>
          <ul
            className="m-0 grid gap-1 pl-5 text-sm"
            aria-label={t('employee.absence.vacation.success.coverageLabel')}
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
                  duration: formatCompactDuration(runtime, coverage.entitlementMinutes),
                  note: coverage.holiday
                    ? t('employee.absence.vacation.success.holidayNote')
                    : coverage.scheduledMinutes === 0
                      ? t('employee.absence.vacation.success.zeroHourNote')
                      : '',
                })}
              </li>
            ))}
          </ul>
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
