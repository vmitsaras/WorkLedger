import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';

import {
  hrMonthlyClosureReadinessInsightRequestSchema,
  hrNeutralAbsenceCoverageInsightRequestSchema,
  type HrInsightRequest,
} from '@workledger/contracts/insights';
import { useWorkLedgerMessage } from '@workledger/i18n/react';
import { Alert, Button, FilterBar, Panel } from '@workledger/ui';

import { ApiClientError, clearSessionMemory, runHrInsight } from '../app/api-client.js';
import { setPendingSignInNotice } from '../app/session-notice.js';
import { FormErrorSummary } from '../components/form-error-summary.js';
import { InsightNativeResult } from '../components/insight-native-result.js';
import { PageHeader } from '../components/page-header.js';

type HrInsightKind = HrInsightRequest['kind'];

export function HrInsightsPage() {
  const t = useWorkLedgerMessage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const summaryRef = useRef<HTMLElement>(null);
  const [kind, setKind] = useState<HrInsightKind>('HR_MONTHLY_CLOSURE_READINESS');
  const [month, setMonth] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Readonly<Record<string, string>>>({});
  const [formError, setFormError] = useState<string>();
  const mutation = useMutation({ mutationFn: runHrInsight });

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (month === '') {
      setFieldErrors({ 'hr-insight-month': t('admin.insights.validation.month') });
      queueMicrotask(() => summaryRef.current?.focus());
      return;
    }
    const candidate = { kind, month, workspace: 'HR' as const };
    const parsed =
      kind === 'HR_MONTHLY_CLOSURE_READINESS'
        ? hrMonthlyClosureReadinessInsightRequestSchema.safeParse(candidate)
        : hrNeutralAbsenceCoverageInsightRequestSchema.safeParse(candidate);
    if (!parsed.success) {
      setFormError(t('admin.insights.validation.correct'));
      queueMicrotask(() => summaryRef.current?.focus());
      return;
    }
    setFieldErrors({});
    setFormError(undefined);
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

  const result = mutation.data;
  return (
    <section className="grid max-w-5xl gap-8">
      <PageHeader
        description={t('admin.insights.page.description')}
        eyebrow={t('admin.insights.page.eyebrow')}
        title={t('shared.route.title.insights')}
      />
      <Panel className="grid gap-2" density="balanced">
        <h2 className="m-0 text-lg font-bold">{t('admin.insights.privacy.heading')}</h2>
        <p className="m-0 max-w-3xl text-sm leading-6 text-[var(--wl-text-muted)]">
          {t('admin.insights.privacy.description')}
        </p>
      </Panel>
      <FormErrorSummary fieldErrors={fieldErrors} formError={formError} summaryRef={summaryRef} />
      <FilterBar
        description={t('admin.insights.form.description')}
        noValidate
        onSubmit={(event) => void submit(event)}
        title={t('admin.insights.form.heading')}
      >
        <div className="grid w-full gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <label className="font-semibold" htmlFor="hr-insight-kind">
              {t('employee.insights.form.kind')}
            </label>
            <select
              className="wl-text-field"
              id="hr-insight-kind"
              onChange={(event) => {
                const nextKind = event.target.value;
                if (
                  nextKind === 'HR_MONTHLY_CLOSURE_READINESS' ||
                  nextKind === 'HR_NEUTRAL_ABSENCE_COVERAGE'
                ) {
                  setKind(nextKind);
                }
                mutation.reset();
              }}
              value={kind}
            >
              <option value="HR_MONTHLY_CLOSURE_READINESS">
                {t('admin.insights.kind.closureReadiness.title')}
              </option>
              <option value="HR_NEUTRAL_ABSENCE_COVERAGE">
                {t('admin.insights.kind.absenceCoverage.title')}
              </option>
            </select>
          </div>
          <div className="grid gap-2">
            <label className="font-semibold" htmlFor="hr-insight-month">
              {t('employee.insights.form.month')}
            </label>
            <input
              aria-describedby={
                fieldErrors['hr-insight-month'] === undefined ? undefined : 'hr-insight-month-error'
              }
              aria-invalid={fieldErrors['hr-insight-month'] === undefined ? undefined : true}
              className="wl-text-field"
              id="hr-insight-month"
              min="2000-01"
              onChange={(event) => {
                setMonth(event.target.value);
                setFieldErrors({});
                mutation.reset();
              }}
              type="month"
              value={month}
            />
            {fieldErrors['hr-insight-month'] === undefined ? null : (
              <p className="wl-text-danger m-0 text-sm" id="hr-insight-month-error">
                {fieldErrors['hr-insight-month']}
              </p>
            )}
          </div>
          <Button isDisabled={mutation.isPending} type="submit" variant="primary">
            {mutation.isPending
              ? t('employee.insights.form.running')
              : t('employee.insights.form.run')}
          </Button>
        </div>
      </FilterBar>
      <p aria-live="polite" className="sr-only" role="status">
        {mutation.isPending
          ? t('employee.insights.status.running')
          : result === undefined
            ? ''
            : 'reason' in result
              ? t('admin.insights.status.suppressed')
              : t('employee.insights.status.ready')}
      </p>
      {mutation.error === null ? null : (
        <div className="wl-alert wl-alert--danger" role="alert">
          {mutation.error instanceof ApiClientError && mutation.error.status === 403
            ? t('admin.insights.error.denied')
            : mutation.error instanceof ApiClientError && mutation.error.status === 422
              ? t('admin.insights.error.invalidMonth')
              : t('employee.insights.error.unavailable')}
        </div>
      )}
      {result === undefined ? null : 'reason' in result ? (
        <Alert announce={false} title={t('admin.insights.suppressed.heading')} tone="warning">
          <p className="m-0">{t('admin.insights.suppressed.description')}</p>
        </Alert>
      ) : (
        <InsightNativeResult result={result.nativeResult} />
      )}
    </section>
  );
}
