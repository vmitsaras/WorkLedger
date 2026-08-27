import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router';

import {
  INSIGHT_KINDS,
  insightRequestSchema,
  type InsightKind,
  type InsightRequest,
} from '@workledger/contracts/insights';
import { useWorkLedgerMessage } from '@workledger/i18n/react';
import { Button, FilterBar, Panel, RouteState } from '@workledger/ui';

import { ApiClientError, clearSessionMemory, runEmployeeInsight } from '../app/api-client.js';
import { insightKindPresentation } from '../app/insight-presentation.js';
import { setPendingSignInNotice } from '../app/session-notice.js';
import { FormErrorSummary } from '../components/form-error-summary.js';
import { InsightNativeResult } from '../components/insight-native-result.js';
import { PageHeader } from '../components/page-header.js';

type FormValues = Readonly<{
  date: string;
  endDate: string;
  kind: InsightKind | '';
  month: string;
  startDate: string;
}>;

const EMPTY_VALUES: FormValues = Object.freeze({
  date: '',
  endDate: '',
  kind: '',
  month: '',
  startDate: '',
});

const SAFE_SEARCH_KEYS = new Set(['date', 'from', 'kind', 'month', 'to']);

export function InsightsPage() {
  const t = useWorkLedgerMessage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useSearchParams();
  const initial = parseInsightSearch(search);
  const [values, setValues] = useState<FormValues>(initial.values);
  const [fieldErrors, setFieldErrors] = useState<Readonly<Record<string, string>>>({});
  const [formError, setFormError] = useState<string>();
  const summaryRef = useRef<HTMLElement>(null);
  const mutation = useMutation({ mutationFn: runEmployeeInsight });

  useEffect(() => {
    if (!initial.valid) setSearch({}, { replace: true });
  }, [initial.valid, setSearch]);

  useEffect(() => {
    if (Object.keys(fieldErrors).length > 0 || formError !== undefined) {
      summaryRef.current?.focus();
    }
  }, [fieldErrors, formError]);

  function updateValue<Key extends keyof FormValues>(key: Key, value: FormValues[Key]) {
    setValues((current) => ({ ...current, [key]: value }));
    setFieldErrors({});
    setFormError(undefined);
    mutation.reset();
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const request = toInsightRequest(values);
    const parsed = insightRequestSchema.safeParse(request);
    if (!parsed.success) {
      setFieldErrors(validateForm(values, t));
      setFormError(t('employee.insights.validation.correct'));
      return;
    }

    setFieldErrors({});
    setFormError(undefined);
    setSearch(toInsightSearch(values), { replace: true });
    try {
      await mutation.mutateAsync(parsed.data);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        clearSessionMemory();
        queryClient.clear();
        setPendingSignInNotice('SESSION_EXPIRED');
        await navigate('/sign-in', { replace: true });
      }
    }
  }

  const selected = values.kind === '' ? null : insightKindPresentation(values.kind, t);

  return (
    <section className="grid max-w-5xl gap-8">
      <PageHeader
        description={t('employee.insights.page.description')}
        eyebrow={t('employee.insights.page.eyebrow')}
        title={t('shared.route.title.insights')}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(16rem,0.65fr)]">
        <div className="grid gap-4">
          <FormErrorSummary
            fieldErrors={fieldErrors}
            formError={formError}
            summaryRef={summaryRef}
          />
          <FilterBar
            description={t('employee.insights.form.description')}
            noValidate
            onSubmit={(event) => void submit(event)}
            title={t('employee.insights.form.heading')}
          >
            <div className="grid w-full min-w-0 gap-4 sm:grid-cols-2">
              <div className="grid min-w-0 gap-2">
                <label className="font-semibold" htmlFor="insight-kind">
                  {t('employee.insights.form.kind')}
                </label>
                <select
                  aria-describedby={selected === null ? undefined : 'insight-kind-description'}
                  aria-invalid={fieldErrors['insight-kind'] === undefined ? undefined : true}
                  className="wl-text-field"
                  id="insight-kind"
                  onChange={(event) => updateValue('kind', toInsightKind(event.target.value))}
                  value={values.kind}
                >
                  <option value="">{t('employee.insights.form.kindPlaceholder')}</option>
                  {INSIGHT_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {insightKindPresentation(kind, t).title}
                    </option>
                  ))}
                </select>
                {selected === null ? null : (
                  <p
                    className="m-0 max-w-xl text-sm leading-6 text-[var(--wl-text-muted)]"
                    id="insight-kind-description"
                  >
                    {selected.description}
                  </p>
                )}
              </div>

              {values.kind === 'balance-change' ? (
                <div className="grid min-w-0 gap-4 sm:col-span-2 sm:grid-cols-2">
                  <DateField
                    error={fieldErrors['insight-from']}
                    id="insight-from"
                    label={t('employee.insights.form.from')}
                    onChange={(value) => updateValue('startDate', value)}
                    value={values.startDate}
                  />
                  <DateField
                    error={fieldErrors['insight-to']}
                    id="insight-to"
                    label={t('employee.insights.form.to')}
                    onChange={(value) => updateValue('endDate', value)}
                    value={values.endDate}
                  />
                </div>
              ) : null}

              {values.kind === 'submission-blockers' ? (
                <DateField
                  error={fieldErrors['insight-month']}
                  id="insight-month"
                  label={t('employee.insights.form.month')}
                  onChange={(value) => updateValue('month', value)}
                  type="month"
                  value={values.month}
                />
              ) : null}

              {values.kind === 'leave-projection' || values.kind === 'today-explanation' ? (
                <DateField
                  error={fieldErrors['insight-date']}
                  id="insight-date"
                  label={t('employee.insights.form.date')}
                  onChange={(value) => updateValue('date', value)}
                  value={values.date}
                />
              ) : null}

              <div className="self-end">
                <Button isDisabled={mutation.isPending} type="submit">
                  {mutation.isPending
                    ? t('employee.insights.form.running')
                    : t('employee.insights.form.run')}
                </Button>
              </div>
            </div>
          </FilterBar>
        </div>

        <aside aria-labelledby="insight-trust-heading">
          <Panel className="grid gap-3" density="balanced">
            <h2 className="m-0 text-lg font-bold" id="insight-trust-heading">
              {t('employee.insights.trust.heading')}
            </h2>
            <p className="m-0 text-sm leading-6 text-[var(--wl-text-muted)]">
              {t('employee.insights.trust.description')}
            </p>
            <p className="m-0 text-sm leading-6 text-[var(--wl-text-muted)]">
              {t('employee.insights.trust.privacy')}
            </p>
          </Panel>
        </aside>
      </div>

      <div aria-atomic="true" aria-live="polite" className="min-h-6" role="status">
        {mutation.isPending ? t('employee.insights.status.running') : null}
        {mutation.isSuccess ? (
          <p className="m-0">
            {t('employee.insights.status.ready')}{' '}
            <a href="#insight-result-heading">{t('employee.insights.status.viewResult')}</a>
          </p>
        ) : null}
      </div>

      {mutation.isError ? (
        <InsightError
          error={mutation.error}
          retry={() => {
            const request = insightRequestSchema.safeParse(toInsightRequest(values));
            if (request.success) mutation.mutate(request.data);
          }}
        />
      ) : null}
      {mutation.data === undefined ? null : <InsightNativeResult result={mutation.data} />}

      <Panel className="grid gap-2" density="compact">
        <h2 className="m-0 text-lg font-bold">{t('employee.insights.provider.heading')}</h2>
        <p className="m-0 text-sm leading-6 text-[var(--wl-text-muted)]">
          {t('employee.insights.provider.disabled')}
        </p>
      </Panel>
    </section>
  );
}

function InsightError({ error, retry }: Readonly<{ error: Error; retry: () => void }>) {
  const t = useWorkLedgerMessage();
  const denied = error instanceof ApiClientError && error.status === 403;
  const offline = error instanceof ApiClientError && error.status === 0;
  return (
    <RouteState
      actions={
        denied ? (
          <Link to="/today">{t('employee.insights.error.returnToday')}</Link>
        ) : (
          <Button onPress={retry} variant="secondary">
            {t('shared.action.tryAgain')}
          </Button>
        )
      }
      kind={denied ? 'permission-denied' : 'error'}
      title={
        denied
          ? t('employee.insights.error.denied')
          : offline
            ? t('employee.insights.error.offline')
            : t('employee.insights.error.unavailable')
      }
    />
  );
}

function DateField({
  error,
  id,
  label,
  onChange,
  type = 'date',
  value,
}: Readonly<{
  error: string | undefined;
  id: string;
  label: string;
  onChange: (value: string) => void;
  type?: 'date' | 'month';
  value: string;
}>) {
  const errorId = `${id}-error`;
  return (
    <div className="grid min-w-0 gap-2">
      <label className="font-semibold" htmlFor={id}>
        {label}
      </label>
      <input
        aria-describedby={error === undefined ? undefined : errorId}
        aria-invalid={error === undefined ? undefined : true}
        className="wl-text-field"
        id={id}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value}
      />
      {error === undefined ? null : (
        <p className="m-0 text-sm font-semibold text-[var(--wl-danger)]" id={errorId}>
          {error}
        </p>
      )}
    </div>
  );
}

function toInsightRequest(values: FormValues): InsightRequest | Readonly<Record<string, never>> {
  if (values.kind === 'balance-change') {
    return {
      kind: values.kind,
      period: { endDate: values.endDate, kind: 'DATE_RANGE', startDate: values.startDate },
      workspace: 'EMPLOYEE',
    };
  }
  if (values.kind === 'submission-blockers') {
    return {
      kind: values.kind,
      period: { kind: 'MONTH', monthStart: `${values.month}-01` },
      workspace: 'EMPLOYEE',
    };
  }
  if (values.kind === 'leave-projection' || values.kind === 'today-explanation') {
    return {
      kind: values.kind,
      period: { date: values.date, kind: 'DATE' },
      workspace: 'EMPLOYEE',
    };
  }
  return {};
}

function validateForm(
  values: FormValues,
  t: ReturnType<typeof useWorkLedgerMessage>,
): Readonly<Record<string, string>> {
  const errors: Record<string, string> = {};
  if (values.kind === '') errors['insight-kind'] = t('employee.insights.validation.kind');
  if (values.kind === 'balance-change') {
    if (values.startDate === '') errors['insight-from'] = t('employee.insights.validation.from');
    if (values.endDate === '') errors['insight-to'] = t('employee.insights.validation.to');
    if (values.startDate !== '' && values.endDate !== '' && values.startDate > values.endDate) {
      errors['insight-to'] = t('employee.insights.validation.range');
    }
  }
  if (values.kind === 'submission-blockers' && values.month === '') {
    errors['insight-month'] = t('employee.insights.validation.month');
  }
  if (
    (values.kind === 'leave-projection' || values.kind === 'today-explanation') &&
    values.date === ''
  ) {
    errors['insight-date'] = t('employee.insights.validation.date');
  }
  return errors;
}

function toInsightKind(value: string): InsightKind | '' {
  return INSIGHT_KINDS.find((kind) => kind === value) ?? '';
}

function parseInsightSearch(
  search: URLSearchParams,
): Readonly<{ valid: boolean; values: FormValues }> {
  const keys = [...search.keys()];
  const uniqueKeys = new Set(keys);
  const kind = toInsightKind(search.get('kind') ?? '');
  const values: FormValues = {
    date: search.get('date') ?? '',
    endDate: search.get('to') ?? '',
    kind,
    month: search.get('month') ?? '',
    startDate: search.get('from') ?? '',
  };
  if (keys.length === 0) return { valid: true, values };
  const valid =
    keys.length === uniqueKeys.size &&
    keys.every((key) => SAFE_SEARCH_KEYS.has(key)) &&
    kind !== '' &&
    insightRequestSchema.safeParse(toInsightRequest(values)).success;
  return { valid, values: valid ? values : EMPTY_VALUES };
}

function toInsightSearch(values: FormValues): URLSearchParams {
  const search = new URLSearchParams({ kind: values.kind });
  if (values.kind === 'balance-change') {
    search.set('from', values.startDate);
    search.set('to', values.endDate);
  } else if (values.kind === 'submission-blockers') {
    search.set('month', values.month);
  } else {
    search.set('date', values.date);
  }
  return search;
}
