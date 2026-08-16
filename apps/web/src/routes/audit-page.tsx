import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';

import {
  DOMAIN_AUDIT_TARGET_KINDS,
  domainAuditQuerySchema,
  type DomainAuditQuery,
} from '@workledger/contracts';
import { Button } from '@workledger/ui';

import { domainAuditPageQuery } from '../app/query.js';
import { PageHeader } from '../components/page-header.js';

export function AuditPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = parseQuery(searchParams);
  const result = useQuery(domainAuditPageQuery(query));
  if (result.isError) throw result.error;

  function update(values: Partial<Record<keyof DomainAuditQuery, string | undefined>>) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined || value === '') next.delete(key);
      else next.set(key, value);
    }
    if (!('page' in values)) next.set('page', '1');
    setSearchParams(next);
  }

  return (
    <section className="grid gap-8">
      <PageHeader
        eyebrow="HR administration"
        title="Domain audit"
        description="Review organization domain events through redacted, purpose-specific evidence. Technical authentication and session audit data is kept separate."
      />
      <form className="wl-panel grid gap-4" onSubmit={(event) => event.preventDefault()}>
        <h2 className="m-0 text-xl font-bold">Filter audit events</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="grid gap-2 text-sm font-semibold" htmlFor="audit-from">
            From date
            <input
              id="audit-from"
              type="date"
              className="min-h-11 rounded-lg border px-3"
              value={query.from ?? ''}
              onChange={(event) => update({ from: event.target.value || undefined })}
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold" htmlFor="audit-to">
            To date
            <input
              id="audit-to"
              type="date"
              className="min-h-11 rounded-lg border px-3"
              value={query.to ?? ''}
              onChange={(event) => update({ to: event.target.value || undefined })}
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold" htmlFor="audit-outcome">
            Outcome
            <select
              id="audit-outcome"
              className="min-h-11 rounded-lg border px-3"
              value={query.outcome ?? ''}
              onChange={(event) => update({ outcome: event.target.value || undefined })}
            >
              <option value="">All outcomes</option>
              <option value="SUCCESS">Success</option>
              <option value="DENIED">Denied</option>
              <option value="FAILURE">Failure</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold" htmlFor="audit-target">
            Target type
            <select
              id="audit-target"
              className="min-h-11 rounded-lg border px-3"
              value={query.targetKind ?? ''}
              onChange={(event) => update({ targetKind: event.target.value || undefined })}
            >
              <option value="">All target types</option>
              {DOMAIN_AUDIT_TARGET_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {label(kind)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold sm:col-span-2" htmlFor="audit-action">
            Exact action code
            <input
              id="audit-action"
              className="min-h-11 rounded-lg border px-3"
              pattern="[A-Z][A-Z0-9_]*"
              value={query.action ?? ''}
              onChange={(event) =>
                update({ action: event.target.value.toUpperCase() || undefined })
              }
            />
          </label>
        </div>
      </form>
      <section className="wl-panel grid gap-4" aria-labelledby="audit-results">
        <div>
          <h2 id="audit-results" className="m-0 text-2xl font-bold">
            Audit events
          </h2>
          <p className="mb-0 text-sm text-[var(--wl-text-muted)]" role="status">
            {result.data === undefined
              ? 'Loading audit events…'
              : `${result.data.pagination.total} events found.`}
          </p>
        </div>
        {result.data?.items.length === 0 ? (
          <p>No audit events match these filters.</p>
        ) : (
          <div
            className="overflow-x-auto"
            tabIndex={0}
            aria-label="Domain audit results, horizontally scrollable"
          >
            <table className="w-full min-w-[48rem] border-collapse text-left">
              <caption className="sr-only">
                Redacted organization domain audit events, newest first
              </caption>
              <thead>
                <tr>
                  <th scope="col">Occurred</th>
                  <th scope="col">Action</th>
                  <th scope="col">Outcome</th>
                  <th scope="col">Target</th>
                  <th scope="col">Detail</th>
                </tr>
              </thead>
              <tbody>
                {result.data?.items.map((event) => (
                  <tr key={event.id}>
                    <td>{formatInstant(event.occurredAt)}</td>
                    <td>
                      <code>{event.action}</code>
                    </td>
                    <td>{label(event.outcome)}</td>
                    <td>{label(event.targetKind)}</td>
                    <td>
                      <details>
                        <summary>View redacted detail</summary>
                        <dl className="grid gap-2 py-3 text-sm">
                          <div>
                            <dt className="font-semibold">Actor</dt>
                            <dd>
                              {event.actor.kind === 'ACCOUNT'
                                ? label(event.actor.role ?? 'ACCOUNT')
                                : `System process ${event.actor.process}`}
                            </dd>
                          </div>
                          <div>
                            <dt className="font-semibold">Target reference</dt>
                            <dd>
                              <code>{event.targetReference}</code>
                            </dd>
                          </div>
                          <div>
                            <dt className="font-semibold">Privileged action</dt>
                            <dd>{event.privileged ? 'Yes' : 'No'}</dd>
                          </div>
                          {event.reasonCode === null ? null : (
                            <div>
                              <dt className="font-semibold">Reason code</dt>
                              <dd>
                                <code>{event.reasonCode}</code>
                              </dd>
                            </div>
                          )}
                          {Object.keys(event.facts).length === 0 ? null : (
                            <div>
                              <dt className="font-semibold">Safe facts</dt>
                              <dd>{factText(event.facts)}</dd>
                            </div>
                          )}
                        </dl>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {result.data === undefined ? null : (
          <nav aria-label="Audit pagination" className="flex items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              isDisabled={query.page <= 1}
              onPress={() => update({ page: String(query.page - 1) })}
            >
              Previous
            </Button>
            <span>
              Page {query.page} of {Math.max(1, result.data.pagination.totalPages)}
            </span>
            <Button
              type="button"
              variant="secondary"
              isDisabled={query.page >= result.data.pagination.totalPages}
              onPress={() => update({ page: String(query.page + 1) })}
            >
              Next
            </Button>
          </nav>
        )}
      </section>
    </section>
  );
}

function parseQuery(params: URLSearchParams): DomainAuditQuery {
  const parsed = domainAuditQuerySchema.safeParse(Object.fromEntries(params));
  return parsed.success ? parsed.data : domainAuditQuerySchema.parse({});
}

function label(value: string) {
  return value
    .toLocaleLowerCase('en-US')
    .replaceAll('_', ' ')
    .replace(/^./u, (character) => character.toUpperCase());
}

function formatInstant(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );
}

function factText(facts: Readonly<Record<string, unknown>>) {
  return Object.entries(facts)
    .map(([key, value]) => `${label(key)}: ${String(value)}`)
    .join('; ');
}
