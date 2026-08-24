import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';

import {
  DOMAIN_AUDIT_TARGET_KINDS,
  domainAuditQuerySchema,
  type DomainAuditQuery,
} from '@workledger/contracts';

import { domainAuditPageQuery } from '../app/query.js';
import { AuditEventExplorer, type AuditExplorerQuery } from '../components/audit-event-explorer.js';
import { PageHeader } from '../components/page-header.js';

export function AuditPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = parseQuery(searchParams);
  const result = useQuery(domainAuditPageQuery(query));
  if (result.isError) throw result.error;

  function update(values: Partial<Record<keyof AuditExplorerQuery, string | undefined>>) {
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
      <AuditEventExplorer
        caption="Redacted organization domain audit events, newest first"
        filterDescription="Dates use the organization time zone. Exact action codes can narrow a known workflow."
        filterTitle="Filter domain audit events"
        page={result.data}
        query={query}
        resultsTitle="Domain audit events"
        scrollLabel="Domain audit results"
        targetKinds={DOMAIN_AUDIT_TARGET_KINDS}
        updateQuery={update}
      />
    </section>
  );
}

function parseQuery(params: URLSearchParams): DomainAuditQuery {
  const parsed = domainAuditQuerySchema.safeParse(Object.fromEntries(params));
  return parsed.success ? parsed.data : domainAuditQuerySchema.parse({});
}
