import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router';

import type { SystemInsightFact, SystemInsightNativeResult } from '@workledger/contracts/insights';
import type { MessageKey } from '@workledger/i18n';
import { useWorkLedgerI18n, useWorkLedgerMessage } from '@workledger/i18n/react';
import { Alert, Button, Panel, StatusBadge } from '@workledger/ui';

import { ApiClientError, clearSessionMemory, runSystemInsight } from '../app/api-client.js';
import { setPendingSignInNotice } from '../app/session-notice.js';
import { PageHeader } from '../components/page-header.js';

const FACT_LABELS = Object.freeze({
  APPLICATION_VERSION: 'system.insights.fact.applicationVersion',
  BACKUP_MANAGEMENT: 'system.insights.fact.backupManagement',
  DATABASE_HEALTH: 'system.insights.fact.databaseHealth',
  EXPECTED_SCHEMA_STATUS: 'system.insights.fact.expectedSchemaStatus',
  MAIL_DELIVERY_CONFIGURATION: 'system.insights.fact.mailDeliveryConfiguration',
  PERSISTENT_REMEMBER_ME: 'system.insights.fact.persistentRememberMe',
  SERVICE_HEALTH: 'system.insights.fact.serviceHealth',
  SESSION_ABSOLUTE_TIMEOUT_MINUTES: 'system.insights.fact.sessionAbsoluteTimeout',
  SESSION_FRESH_WINDOW_MINUTES: 'system.insights.fact.sessionFreshWindow',
  SESSION_IDLE_TIMEOUT_MINUTES: 'system.insights.fact.sessionIdleTimeout',
} as const satisfies Readonly<Record<SystemInsightFact['code'], MessageKey>>);

const SOURCE_LABELS = Object.freeze({
  APPLICATION_MANIFEST: 'system.insights.source.applicationManifest',
  AUTHENTICATION_SECURITY_PROFILE: 'system.insights.source.authenticationProfile',
  DATABASE_READINESS: 'system.insights.source.databaseReadiness',
  HOST_OPERATOR_PROCEDURES: 'system.insights.source.hostOperatorProcedures',
  MAIL_ADAPTER_CONFIGURATION: 'system.insights.source.mailAdapterConfiguration',
} as const satisfies Readonly<
  Record<SystemInsightNativeResult['sources'][number]['code'], MessageKey>
>);

const FACT_GROUPS = Object.freeze([
  Object.freeze({
    codes: ['APPLICATION_VERSION', 'SERVICE_HEALTH'] as const,
    heading: 'system.insights.group.service' as const,
  }),
  Object.freeze({
    codes: ['DATABASE_HEALTH', 'EXPECTED_SCHEMA_STATUS'] as const,
    heading: 'system.insights.group.readiness' as const,
  }),
  Object.freeze({
    codes: ['BACKUP_MANAGEMENT', 'MAIL_DELIVERY_CONFIGURATION'] as const,
    heading: 'system.insights.group.operations' as const,
  }),
  Object.freeze({
    codes: [
      'SESSION_IDLE_TIMEOUT_MINUTES',
      'SESSION_ABSOLUTE_TIMEOUT_MINUTES',
      'SESSION_FRESH_WINDOW_MINUTES',
      'PERSISTENT_REMEMBER_ME',
    ] as const,
    heading: 'system.insights.group.sessionPolicy' as const,
  }),
]);

export function SystemInsightsPage() {
  const runtime = useWorkLedgerI18n();
  const t = useWorkLedgerMessage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [announcedResult, setAnnouncedResult] = useState(false);
  const mutation = useMutation({ mutationFn: runSystemInsight });

  async function runInsight(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAnnouncedResult(false);
    try {
      await mutation.mutateAsync({ kind: 'SYSTEM_TECHNICAL_OVERVIEW', workspace: 'SYSTEM' });
      setAnnouncedResult(true);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        clearSessionMemory();
        queryClient.clear();
        setPendingSignInNotice('SESSION_EXPIRED');
        await navigate('/sign-in', { replace: true });
      }
    }
  }

  return (
    <section className="grid max-w-5xl gap-8">
      <PageHeader
        description={t('system.insights.page.description')}
        eyebrow={t('system.insights.page.eyebrow')}
        title={t('shared.route.title.insights')}
      />

      <Panel className="grid gap-4" density="balanced">
        <div className="grid gap-2">
          <h2 className="m-0 text-lg font-bold">{t('system.insights.form.heading')}</h2>
          <p className="m-0 max-w-3xl text-sm leading-6 text-[var(--wl-text-muted)]">
            {t('system.insights.form.description')}
          </p>
        </div>
        <form onSubmit={(event) => void runInsight(event)}>
          <Button isDisabled={mutation.isPending} type="submit" variant="primary">
            {mutation.isPending ? t('system.insights.form.running') : t('system.insights.form.run')}
          </Button>
        </form>
      </Panel>

      <p aria-live="polite" className="sr-only" role="status">
        {mutation.isPending
          ? t('system.insights.status.running')
          : announcedResult
            ? t('system.insights.status.ready')
            : ''}
      </p>

      {mutation.error === null ? null : (
        <Alert announce title={t('system.insights.error.heading')} tone="danger">
          <p className="m-0">
            {mutation.error instanceof ApiClientError && mutation.error.status === 403
              ? t('system.insights.error.denied')
              : t('system.insights.error.unavailable')}
          </p>
        </Alert>
      )}

      {mutation.data === undefined ? null : (
        <SystemInsightResult locale={runtime.locale} result={mutation.data} />
      )}
    </section>
  );
}

function SystemInsightResult({
  locale,
  result,
}: Readonly<{ locale: string; result: SystemInsightNativeResult }>) {
  const t = useWorkLedgerMessage();
  return (
    <section aria-labelledby="system-insight-result-heading" className="grid gap-6">
      <div className="grid gap-2">
        <h2 className="m-0 text-xl font-bold" id="system-insight-result-heading">
          {t('system.insights.result.heading')}
        </h2>
        <p className="m-0 text-sm text-[var(--wl-text-muted)]">
          {t('system.insights.result.capturedAt', {
            value: new Intl.DateTimeFormat(locale, {
              dateStyle: 'medium',
              timeStyle: 'medium',
            }).format(new Date(result.freshness.capturedAt)),
          })}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {FACT_GROUPS.map((group) => (
          <Panel className="grid content-start gap-4" key={group.heading}>
            <h3 className="m-0 text-lg font-semibold">{t(group.heading)}</h3>
            <dl className="grid gap-4">
              {group.codes.map((code) => {
                const fact = result.facts.find((candidate) => candidate.code === code);
                if (fact === undefined) return null;
                return (
                  <div key={fact.code}>
                    <dt className="text-sm text-[var(--wl-text-muted)]">
                      {t(FACT_LABELS[fact.code])}
                    </dt>
                    <dd className="m-0 font-medium">
                      <SystemFactValue fact={fact} />
                    </dd>
                  </div>
                );
              })}
            </dl>
          </Panel>
        ))}
      </div>

      <Alert announce={false} title={t('system.insights.limitation.backup.heading')} tone="warning">
        <p className="m-0">{t('system.insights.limitation.backup.description')}</p>
      </Alert>

      <Panel className="grid gap-4">
        <div className="grid gap-2">
          <h3 className="m-0 text-lg font-semibold">{t('system.insights.sources.heading')}</h3>
          <p className="m-0 text-sm text-[var(--wl-text-muted)]">
            {t('system.insights.sources.description')}
          </p>
        </div>
        <ul className="m-0 grid gap-2 pl-5">
          {result.sources.map((source) => (
            <li key={source.code}>{t(SOURCE_LABELS[source.code])}</li>
          ))}
        </ul>
        <p className="m-0">
          <Link to="/system/operations">{t('system.insights.action.openOperations')}</Link>
        </p>
      </Panel>
    </section>
  );
}

function SystemFactValue({ fact }: Readonly<{ fact: SystemInsightFact }>) {
  const t = useWorkLedgerMessage();
  switch (fact.code) {
    case 'APPLICATION_VERSION':
      return fact.value;
    case 'SESSION_IDLE_TIMEOUT_MINUTES':
    case 'SESSION_ABSOLUTE_TIMEOUT_MINUTES':
    case 'SESSION_FRESH_WINDOW_MINUTES':
      return t('system.insights.value.minutes', { count: fact.value });
    case 'PERSISTENT_REMEMBER_ME':
      return t('system.insights.value.disabled');
    case 'BACKUP_MANAGEMENT':
      return t('system.insights.value.hostOperatorManaged');
    case 'MAIL_DELIVERY_CONFIGURATION':
      return fact.value === 'CONFIGURED' ? (
        <StatusBadge tone="success">{t('system.insights.value.configured')}</StatusBadge>
      ) : (
        <StatusBadge tone="warning">{t('system.insights.value.notConfigured')}</StatusBadge>
      );
    case 'EXPECTED_SCHEMA_STATUS':
      return fact.value === 'READY' ? (
        <StatusBadge tone="success">{t('system.insights.value.ready')}</StatusBadge>
      ) : (
        <StatusBadge tone="danger">{t('system.insights.value.notReady')}</StatusBadge>
      );
    case 'SERVICE_HEALTH':
    case 'DATABASE_HEALTH':
      return fact.value === 'HEALTHY' ? (
        <StatusBadge tone="success">{t('system.operations.health.healthy')}</StatusBadge>
      ) : (
        <StatusBadge tone="danger">
          {fact.value === 'CRITICAL'
            ? t('system.operations.health.critical')
            : t('system.operations.health.unavailable')}
        </StatusBadge>
      );
  }
}
