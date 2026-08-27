import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';

import {
  DOMAIN_AUDIT_TARGET_KINDS,
  domainAuditQuerySchema,
  type DomainAuditQuery,
} from '@workledger/contracts';
import { useWorkLedgerMessage } from '@workledger/i18n/react';

import { domainAuditPageQuery } from '../app/query.js';
import { AuditEventExplorer, type AuditExplorerQuery } from '../components/audit-event-explorer.js';
import { PageHeader } from '../components/page-header.js';

export function AuditPage() {
  const t = useWorkLedgerMessage();
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
        eyebrow={t('system.audit.domain.page.eyebrow')}
        title={t('shared.route.title.audit')}
        description={t('system.audit.domain.page.description')}
      />
      <AuditEventExplorer
        caption={t('system.audit.domain.page.caption')}
        filterDescription={t('system.audit.domain.page.filterDescription')}
        filterTitle={t('system.audit.domain.page.filterTitle')}
        page={result.data}
        query={query}
        resultsTitle={t('system.audit.domain.page.resultsTitle')}
        scrollLabel={t('system.audit.domain.page.scrollLabel')}
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
