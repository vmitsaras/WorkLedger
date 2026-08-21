import { useQuery } from '@tanstack/react-query';
import { StatusBadge } from '@workledger/ui';

import { systemDiagnosticsQuery } from '../app/query.js';
import { PageHeader } from '../components/page-header.js';

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'medium',
});

export function SystemOperationsPage() {
  const diagnosticsQuery = useQuery(systemDiagnosticsQuery());

  if (diagnosticsQuery.isError) throw diagnosticsQuery.error;

  const diagnostics = diagnosticsQuery.data;

  return (
    <section className="grid gap-8">
      <PageHeader
        eyebrow="System administration"
        title="Operations"
        description="Service health and technical diagnostics. Contains no HR or domain data."
      />

      {diagnostics === undefined ? (
        <div role="status" aria-label="Loading diagnostics">
          <p className="text-[var(--wl-text-muted)]">Loading system diagnostics...</p>
        </div>
      ) : (
        <div className="grid gap-6">
          <section className="wl-panel">
            <h2 className="mb-4 text-lg font-semibold">Service status</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-[var(--wl-text-muted)]">Service</dt>
                <dd className="m-0 font-medium">{diagnostics.service}</dd>
              </div>
              <div>
                <dt className="text-sm text-[var(--wl-text-muted)]">Version</dt>
                <dd className="m-0 font-medium">{diagnostics.version}</dd>
              </div>
              <div>
                <dt className="text-sm text-[var(--wl-text-muted)]">Environment</dt>
                <dd className="m-0 font-medium">{diagnostics.environment}</dd>
              </div>
              <div>
                <dt className="text-sm text-[var(--wl-text-muted)]">Timestamp</dt>
                <dd className="m-0 font-medium">
                  {DATE_TIME_FORMATTER.format(new Date(diagnostics.timestamp))}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-[var(--wl-text-muted)]">Overall health</dt>
                <dd className="m-0">
                  <OperationsStatusBadge status={diagnostics.health} />
                </dd>
              </div>
            </dl>
          </section>

          <section className="wl-panel">
            <h2 className="mb-4 text-lg font-semibold">Dependencies</h2>
            <div className="grid gap-6">
              <section aria-labelledby="database-diagnostics-heading">
                <h3 id="database-diagnostics-heading" className="mb-3 font-medium">
                  Database
                </h3>
                <dl className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <dt className="text-sm text-[var(--wl-text-muted)]">Status</dt>
                    <dd className="m-0">
                      <OperationsStatusBadge status={diagnostics.dependencies.database.status} />
                    </dd>
                  </div>
                  {diagnostics.dependencies.database.latencyMs !== undefined && (
                    <div>
                      <dt className="text-sm text-[var(--wl-text-muted)]">Latency</dt>
                      <dd className="m-0 font-medium">
                        {diagnostics.dependencies.database.latencyMs} ms
                      </dd>
                    </div>
                  )}
                  {diagnostics.dependencies.database.error !== undefined && (
                    <div className="sm:col-span-3">
                      <dt className="text-sm text-[var(--wl-text-muted)]">Error</dt>
                      <dd className="wl-technical-error m-0 mt-1">
                        {diagnostics.dependencies.database.error}
                      </dd>
                    </div>
                  )}
                </dl>
              </section>

              <section aria-labelledby="authentication-diagnostics-heading">
                <h3 id="authentication-diagnostics-heading" className="mb-3 font-medium">
                  Authentication
                </h3>
                <dl className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <dt className="text-sm text-[var(--wl-text-muted)]">Status</dt>
                    <dd className="m-0">
                      <OperationsStatusBadge
                        status={diagnostics.dependencies.authentication.status}
                      />
                    </dd>
                  </div>
                  {diagnostics.dependencies.authentication.error !== undefined && (
                    <div className="sm:col-span-3">
                      <dt className="text-sm text-[var(--wl-text-muted)]">Error</dt>
                      <dd className="wl-technical-error m-0 mt-1">
                        {diagnostics.dependencies.authentication.error}
                      </dd>
                    </div>
                  )}
                </dl>
              </section>
            </div>
          </section>

          <section className="wl-panel">
            <h2 className="mb-4 text-lg font-semibold">Deployment procedures</h2>
            <p className="mb-4 text-[var(--wl-text-muted)]">
              Backup, restore, migration, and upgrade workflows are host-operator procedures and are
              not exposed in this interface.
            </p>
            <p className="text-sm text-[var(--wl-text-muted)]">
              See the deployment and operations documentation for validated procedures.
            </p>
          </section>
        </div>
      )}
    </section>
  );
}

type OperationsStatus = 'healthy' | 'degraded' | 'critical' | 'unavailable';

const STATUS_PRESENTATION: Readonly<
  Record<OperationsStatus, Readonly<{ label: string; tone: 'danger' | 'success' | 'warning' }>>
> = {
  healthy: { label: 'Healthy', tone: 'success' },
  degraded: { label: 'Degraded', tone: 'warning' },
  critical: { label: 'Critical', tone: 'danger' },
  unavailable: { label: 'Unavailable', tone: 'danger' },
};

function OperationsStatusBadge({ status }: Readonly<{ status: OperationsStatus }>) {
  const presentation = STATUS_PRESENTATION[status];
  return <StatusBadge tone={presentation.tone}>{presentation.label}</StatusBadge>;
}
