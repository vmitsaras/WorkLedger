import type { InsightRequest, InsightVisibleContext } from '@workledger/contracts/insights';

let pendingInsightContext: InsightVisibleContext | undefined;

export function setPendingInsightContext(context: InsightVisibleContext): void {
  pendingInsightContext = Object.freeze({
    ...context,
    sourceReferences: [...context.sourceReferences],
  });
}

export function takePendingInsightContext(): InsightVisibleContext | undefined {
  const context = pendingInsightContext;
  pendingInsightContext = undefined;
  return context;
}

export function clearPendingInsightContext(): void {
  pendingInsightContext = undefined;
}

export function insightEntryPath(request?: InsightRequest): string {
  if (request === undefined) return '/insights';

  const search = new URLSearchParams({ kind: request.kind });
  switch (request.period.kind) {
    case 'DATE':
      search.set('date', request.period.date);
      break;
    case 'DATE_RANGE':
      search.set('from', request.period.startDate);
      search.set('to', request.period.endDate);
      break;
    case 'MONTH':
      search.set('month', request.period.monthStart.slice(0, 7));
      break;
  }
  return `/insights?${search.toString()}`;
}
