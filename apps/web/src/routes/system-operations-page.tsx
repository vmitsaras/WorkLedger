import { useQuery } from '@tanstack/react-query';

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
          <p className="text-secondary">Loading system diagnostics...</p>
        </div>
      ) : (
        <div className="grid gap-6">
          <section className="wl-card rounded-xl border p-6">
            <h2 className="mb-4 text-lg font-semibold">Service status</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-secondary text-sm">Service</dt>
                <dd className="font-medium">{diagnostics.service}</dd>
              </div>
              <div>
                <dt className="text-secondary text-sm">Version</dt>
                <dd className="font-medium">{diagnostics.version}</dd>
              </div>
              <div>
                <dt className="text-secondary text-sm">Environment</dt>
                <dd className="font-medium">{diagnostics.environment}</dd>
              </div>
              <div>
                <dt className="text-secondary text-sm">Timestamp</dt>
                <dd className="font-medium">
                  {DATE_TIME_FORMATTER.format(new Date(diagnostics.timestamp))}
                </dd>
              </div>
              <div>
                <dt className="text-secondary text-sm">Overall health</dt>
                <dd>
                  <HealthBadge status={diagnostics.health} />
                </dd>
              </div>
            </div>
          </section>

          <section className="wl-card rounded-xl border p-6">
            <h2 className="mb-4 text-lg font-semibold">Dependencies</h2>
            <div className="grid gap-6">
              <div>
                <h3 className="mb-3 font-medium">Database</h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <dt className="text-secondary text-sm">Status</dt>
                    <dd>
                      <DependencyBadge status={diagnostics.dependencies.database.status} />
                    </dd>
                  </div>
                  {diagnostics.dependencies.database.latencyMs !== undefined && (
                    <div>
                      <dt className="text-secondary text-sm">Latency</dt>
                      <dd className="font-medium">{diagnostics.dependencies.database.latencyMs} ms</dd>
                    </div>
                  )}
                  {diagnostics.dependencies.database.error !== undefined && (
                    <div className="sm:col-span-3">
                      <dt className="text-secondary text-sm">Error</dt>
                      <dd className="font-mono text-sm text-red-700 dark:text-red-400">
                        {diagnostics.dependencies.database.error}
                      </dd>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="mb-3 font-medium">Authentication</h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <dt className="text-secondary text-sm">Status</dt>
                    <dd>
                      <DependencyBadge status={diagnostics.dependencies.authentication.status} />
                    </dd>
                  </div>
                  {diagnostics.dependencies.authentication.error !== undefined && (
                    <div className="sm:col-span-3">
                      <dt className="text-secondary text-sm">Error</dt>
                      <dd className="font-mono text-sm text-red-700 dark:text-red-400">
                        {diagnostics.dependencies.authentication.error}
                      </dd>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="wl-card rounded-xl border p-6">
            <h2 className="mb-4 text-lg font-semibold">Deployment procedures</h2>
            <p className="text-secondary mb-4">
              Backup, restore, migration, and upgrade workflows are host-operator procedures and are
              not exposed in this interface.
            </p>
            <p className="text-secondary text-sm">
              See the deployment and operations documentation for validated procedures.
            </p>
          </section>
        </div>
      )}
    </section>
  );
}

function HealthBadge({ status }: Readonly<{ status: 'healthy' | 'degraded' | 'critical' }>) {
  if (status === 'healthy') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-950 dark:text-green-200">
        <span className="h-1.5 w-1.5 rounded-full bg-green-600 dark:bg-green-400" aria-hidden="true" />
        Healthy
      </span>
    );
  }
  if (status === 'degraded') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
        <span className="h-1.5 w-1.5 rounded-full bg-yellow-600 dark:bg-yellow-400" aria-hidden="true" />
        Degraded
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-800 dark:bg-red-950 dark:text-red-200">
      <span className="h-1.5 w-1.5 rounded-full bg-red-600 dark:bg-red-400" aria-hidden="true" />
      Critical
    </span>
  );
}

function DependencyBadge({
  status,
}: Readonly<{ status: 'healthy' | 'degraded' | 'unavailable' }>) {
  if (status === 'healthy') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-950 dark:text-green-200">
        <span className="h-1.5 w-1.5 rounded-full bg-green-600 dark:bg-green-400" aria-hidden="true" />
        Healthy
      </span>
    );
  }
  if (status === 'degraded') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
        <span className="h-1.5 w-1.5 rounded-full bg-yellow-600 dark:bg-yellow-400" aria-hidden="true" />
        Degraded
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-800 dark:bg-red-950 dark:text-red-200">
      <span className="h-1.5 w-1.5 rounded-full bg-red-600 dark:bg-red-400" aria-hidden="true" />
      Unavailable
    </span>
  );
}
