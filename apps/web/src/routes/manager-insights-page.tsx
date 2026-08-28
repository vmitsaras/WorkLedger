import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';

import {
  managerActionSummaryInsightRequestSchema,
  teamCoverageInsightRequestSchema,
  type ManagerInsightRequest,
} from '@workledger/contracts/insights';
import { useWorkLedgerMessage } from '@workledger/i18n/react';
import { Button, FilterBar } from '@workledger/ui';

import { ApiClientError, clearSessionMemory, runManagerInsight } from '../app/api-client.js';
import { setPendingSignInNotice } from '../app/session-notice.js';
import { FormErrorSummary } from '../components/form-error-summary.js';
import { InsightNativeResult } from '../components/insight-native-result.js';
import { PageHeader } from '../components/page-header.js';

type ManagerInsightKind = ManagerInsightRequest['kind'];

export function ManagerInsightsPage() {
  const t = useWorkLedgerMessage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const summaryRef = useRef<HTMLElement>(null);
  const [kind, setKind] = useState<ManagerInsightKind>('manager-action-summary');
  const [date, setDate] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Readonly<Record<string, string>>>({});
  const [formError, setFormError] = useState<string>();
  const mutation = useMutation({ mutationFn: runManagerInsight });

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (date === '') errors['manager-insight-date'] = t('employee.insights.validation.date');
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      queueMicrotask(() => summaryRef.current?.focus());
      return;
    }
    const candidate = {
      kind,
      period: { date, kind: 'DATE' as const },
      workspace: 'MANAGER' as const,
    };
    const parsed =
      kind === 'manager-action-summary'
        ? managerActionSummaryInsightRequestSchema.safeParse(candidate)
        : teamCoverageInsightRequestSchema.safeParse(candidate);
    if (!parsed.success) {
      setFormError(t('employee.insights.validation.correct'));
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

  const requestError = mutation.error;
  return (
    <section className="grid max-w-5xl gap-8">
      <PageHeader
        description={t('manager.insights.page.description')}
        eyebrow={t('manager.insights.page.eyebrow')}
        title={t('shared.route.title.insights')}
      />
      <FormErrorSummary fieldErrors={fieldErrors} formError={formError} summaryRef={summaryRef} />
      <FilterBar
        description={t('manager.insights.form.description')}
        noValidate
        onSubmit={(event) => void submit(event)}
        title={t('manager.insights.form.heading')}
      >
        <div className="grid w-full gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <label className="font-semibold" htmlFor="manager-insight-kind">
              {t('employee.insights.form.kind')}
            </label>
            <select
              className="wl-text-field"
              id="manager-insight-kind"
              onChange={(event) => {
                setKind(event.target.value as ManagerInsightKind);
                mutation.reset();
              }}
              value={kind}
            >
              <option value="manager-action-summary">
                {t('manager.insights.kind.actionSummary.title')}
              </option>
              <option value="team-coverage">{t('manager.insights.kind.teamCoverage.title')}</option>
            </select>
          </div>
          <div className="grid gap-2">
            <label className="font-semibold" htmlFor="manager-insight-date">
              {t('employee.insights.form.date')}
            </label>
            <input
              aria-describedby={
                fieldErrors['manager-insight-date'] === undefined
                  ? undefined
                  : 'manager-insight-date-error'
              }
              aria-invalid={fieldErrors['manager-insight-date'] === undefined ? undefined : true}
              className="wl-text-field"
              id="manager-insight-date"
              onChange={(event) => {
                setDate(event.target.value);
                setFieldErrors({});
                mutation.reset();
              }}
              type="date"
              value={date}
            />
            {fieldErrors['manager-insight-date'] === undefined ? null : (
              <p className="wl-text-danger m-0 text-sm" id="manager-insight-date-error">
                {fieldErrors['manager-insight-date']}
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
          : mutation.data === undefined
            ? ''
            : t('employee.insights.status.ready')}
      </p>
      {requestError === null ? null : (
        <div role="alert" className="wl-alert wl-alert--danger">
          {requestError instanceof ApiClientError && requestError.status === 403
            ? t('manager.insights.error.denied')
            : t('employee.insights.error.unavailable')}
        </div>
      )}
      {mutation.data === undefined ? null : (
        <InsightNativeResult result={mutation.data.nativeResult} />
      )}
    </section>
  );
}
