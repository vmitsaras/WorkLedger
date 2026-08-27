import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';

import {
  SECURITY_AUDIT_TARGET_KINDS,
  securityAuditQuerySchema,
  type SecurityAuditQuery,
} from '@workledger/contracts';
import { useWorkLedgerMessage } from '@workledger/i18n/react';

import { securityAuditPageQuery } from '../app/query.js';
import { AuditEventExplorer, type AuditExplorerQuery } from '../components/audit-event-explorer.js';
import { PageHeader } from '../components/page-header.js';

export function SystemAuditPage() {
  const t = useWorkLedgerMessage();
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
        eyebrow={t('system.audit.technical.page.eyebrow')}
        title={t('shared.route.title.systemAudit')}
        description={t('system.audit.technical.page.description')}
      />
      <AuditEventExplorer
        caption={t('system.audit.technical.page.caption')}
        filterDescription={t('system.audit.technical.page.filterDescription')}
        filterTitle={t('system.audit.technical.page.filterTitle')}
        page={result.data}
        query={query}
        resultsTitle={t('system.audit.technical.page.resultsTitle')}
        scrollLabel={t('system.audit.technical.page.scrollLabel')}
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
