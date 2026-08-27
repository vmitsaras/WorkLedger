import type { MouseEvent } from 'react';
import { Link } from 'react-router';

import type { InsightRequest, InsightVisibleContext } from '@workledger/contracts/insights';
import { useWorkLedgerMessage } from '@workledger/i18n/react';
import { buttonVariants, Panel } from '@workledger/ui';

import { insightEntryPath, setPendingInsightContext } from '../app/insight-context.js';

type InsightContextKind = InsightVisibleContext['kind'];

export function InsightEntryPoint({
  contextKind,
  request,
}: Readonly<{
  contextKind: InsightContextKind;
  request?: InsightRequest;
}>) {
  const t = useWorkLedgerMessage();

  function preserveContext(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    setPendingInsightContext({
      kind: contextKind,
      ...(request === undefined ? {} : { period: request.period }),
      sourceReferences: [],
    });
  }

  return (
    <Panel
      aria-labelledby={`insight-entry-${contextKind.toLocaleLowerCase()}`}
      className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
      density="compact"
    >
      <div>
        <h2
          className="m-0 text-lg font-bold"
          id={`insight-entry-${contextKind.toLocaleLowerCase()}`}
        >
          {t('employee.insights.entry.heading')}
        </h2>
        <p className="m-0 mt-1 max-w-2xl text-sm leading-6 text-[var(--wl-text-muted)]">
          {t('employee.insights.entry.description')}
        </p>
      </div>
      <Link
        className={`${buttonVariants({ variant: 'secondary' })} w-fit`}
        onClick={preserveContext}
        to={insightEntryPath(request)}
      >
        {t('employee.insights.entry.action')}
      </Link>
    </Panel>
  );
}
