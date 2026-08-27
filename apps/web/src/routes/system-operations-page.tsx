import { useQuery } from '@tanstack/react-query';
import { type MessageKey } from '@workledger/i18n';
import { useWorkLedgerI18n, useWorkLedgerMessage } from '@workledger/i18n/react';
import { Alert, Panel, RouteState, StatusBadge } from '@workledger/ui';

import { systemDiagnosticsQuery } from '../app/query.js';
import { PageHeader } from '../components/page-header.js';

export function SystemOperationsPage() {
  const runtime = useWorkLedgerI18n();
  const t = useWorkLedgerMessage();
  const diagnosticsQuery = useQuery(systemDiagnosticsQuery());

  if (diagnosticsQuery.isError) throw diagnosticsQuery.error;

  const diagnostics = diagnosticsQuery.data;

  return (
    <section className="grid gap-8">
      <PageHeader
        eyebrow={t('system.operations.page.eyebrow')}
        title={t('shared.route.title.systemOperations')}
        description={t('system.operations.page.description')}
      />

      {diagnostics === undefined ? (
        <RouteState kind="loading" title={t('system.operations.loading.title')}>
          {t('system.operations.loading.description')}
        </RouteState>
      ) : (
        <div className="grid gap-6">
          {diagnostics.health === 'healthy' ? null : (
            <Alert
              announce={false}
              title={
                diagnostics.health === 'degraded'
                  ? t('system.operations.alert.degradedTitle')
                  : t('system.operations.alert.criticalTitle')
              }
              tone={diagnostics.health === 'degraded' ? 'warning' : 'danger'}
            >
              <p>{t('system.operations.alert.description')}</p>
            </Alert>
          )}
          <Panel>
            <h2 className="mb-4 text-lg font-semibold">{t('system.operations.status.heading')}</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-[var(--wl-text-muted)]">
                  {t('system.operations.status.service')}
                </dt>
                <dd className="m-0 font-medium">{diagnostics.service}</dd>
              </div>
              <div>
                <dt className="text-sm text-[var(--wl-text-muted)]">
                  {t('system.operations.status.version')}
                </dt>
                <dd className="m-0 font-medium">{diagnostics.version}</dd>
              </div>
              <div>
                <dt className="text-sm text-[var(--wl-text-muted)]">
                  {t('system.operations.status.environment')}
                </dt>
                <dd className="m-0 font-medium">{diagnostics.environment}</dd>
              </div>
              <div>
                <dt className="text-sm text-[var(--wl-text-muted)]">
                  {t('system.operations.status.timestamp')}
                </dt>
                <dd className="m-0 font-medium">
                  {new Intl.DateTimeFormat(runtime.locale, {
                    dateStyle: 'medium',
                    timeStyle: 'medium',
                  }).format(new Date(diagnostics.timestamp))}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-[var(--wl-text-muted)]">
                  {t('system.operations.status.overallHealth')}
                </dt>
                <dd className="m-0">
                  <OperationsStatusBadge status={diagnostics.health} />
                </dd>
              </div>
            </dl>
          </Panel>

          <Panel>
            <h2 className="mb-4 text-lg font-semibold">
              {t('system.operations.dependencies.heading')}
            </h2>
            <div className="grid gap-6">
              <section aria-labelledby="database-diagnostics-heading">
                <h3 id="database-diagnostics-heading" className="mb-3 font-medium">
                  {t('system.operations.dependencies.database.heading')}
                </h3>
                <dl className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <dt className="text-sm text-[var(--wl-text-muted)]">
                      {t('system.operations.dependencies.status')}
                    </dt>
                    <dd className="m-0">
                      <OperationsStatusBadge status={diagnostics.dependencies.database.status} />
                    </dd>
                  </div>
                  {diagnostics.dependencies.database.latencyMs !== undefined && (
                    <div>
                      <dt className="text-sm text-[var(--wl-text-muted)]">
                        {t('system.operations.dependencies.latency')}
                      </dt>
                      <dd className="m-0 font-medium">
                        {t('system.operations.dependencies.latencyValue', {
                          milliseconds: diagnostics.dependencies.database.latencyMs,
                        })}
                      </dd>
                    </div>
                  )}
                  {diagnostics.dependencies.database.error !== undefined && (
                    <div className="sm:col-span-3">
                      <dt className="text-sm text-[var(--wl-text-muted)]">
                        {t('system.operations.dependencies.error')}
                      </dt>
                      <dd className="wl-technical-error m-0 mt-1">
                        {diagnostics.dependencies.database.error}
                      </dd>
                    </div>
                  )}
                </dl>
              </section>

              <section aria-labelledby="authentication-diagnostics-heading">
                <h3 id="authentication-diagnostics-heading" className="mb-3 font-medium">
                  {t('system.operations.dependencies.authentication.heading')}
                </h3>
                <dl className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <dt className="text-sm text-[var(--wl-text-muted)]">
                      {t('system.operations.dependencies.status')}
                    </dt>
                    <dd className="m-0">
                      <OperationsStatusBadge
                        status={diagnostics.dependencies.authentication.status}
                      />
                    </dd>
                  </div>
                  {diagnostics.dependencies.authentication.error !== undefined && (
                    <div className="sm:col-span-3">
                      <dt className="text-sm text-[var(--wl-text-muted)]">
                        {t('system.operations.dependencies.error')}
                      </dt>
                      <dd className="wl-technical-error m-0 mt-1">
                        {diagnostics.dependencies.authentication.error}
                      </dd>
                    </div>
                  )}
                </dl>
              </section>
            </div>
          </Panel>

          <Panel>
            <h2 className="mb-4 text-lg font-semibold">
              {t('system.operations.deployment.heading')}
            </h2>
            <p className="mb-4 text-[var(--wl-text-muted)]">
              {t('system.operations.deployment.description')}
            </p>
            <p className="text-sm text-[var(--wl-text-muted)]">
              {t('system.operations.deployment.documentation')}
            </p>
          </Panel>
        </div>
      )}
    </section>
  );
}

type OperationsStatus = 'healthy' | 'degraded' | 'critical' | 'unavailable';

const STATUS_PRESENTATION: Readonly<
  Record<OperationsStatus, Readonly<{ label: MessageKey; tone: 'danger' | 'success' | 'warning' }>>
> = {
  healthy: { label: 'system.operations.health.healthy', tone: 'success' },
  degraded: { label: 'system.operations.health.degraded', tone: 'warning' },
  critical: { label: 'system.operations.health.critical', tone: 'danger' },
  unavailable: { label: 'system.operations.health.unavailable', tone: 'danger' },
};

function OperationsStatusBadge({ status }: Readonly<{ status: OperationsStatus }>) {
  const t = useWorkLedgerMessage();
  const presentation = STATUS_PRESENTATION[status];
  return <StatusBadge tone={presentation.tone}>{t(presentation.label)}</StatusBadge>;
}
