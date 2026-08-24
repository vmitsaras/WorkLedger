import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';

import {
  SECURITY_AUDIT_TARGET_KINDS,
  securityAuditQuerySchema,
  type SecurityAuditQuery,
} from '@workledger/contracts';

import { securityAuditPageQuery } from '../app/query.js';
import { AuditEventExplorer, type AuditExplorerQuery } from '../components/audit-event-explorer.js';
import { PageHeader } from '../components/page-header.js';

export function SystemAuditPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = parseQuery(searchParams);
  const result = useQuery(securityAuditPageQuery(query));
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
        eyebrow="System administration"
        title="Technical audit"
        description="Review redacted authentication, authorization, session, and operational evidence. Employee and HR domain history remains in the separate domain audit."
      />
      <AuditEventExplorer
        caption="Redacted security and technical audit events, newest first"
        filterDescription="This view contains allowlisted technical metadata only. It excludes domain payloads, notification content, and account identifiers."
        filterTitle="Filter technical audit events"
        page={result.data}
        query={query}
        resultsTitle="Technical audit events"
        scrollLabel="Technical audit results"
        targetKinds={SECURITY_AUDIT_TARGET_KINDS}
        updateQuery={update}
      />
    </section>
  );
}

function parseQuery(params: URLSearchParams): SecurityAuditQuery {
  const parsed = securityAuditQuerySchema.safeParse(Object.fromEntries(params));
  return parsed.success ? parsed.data : securityAuditQuerySchema.parse({});
}
