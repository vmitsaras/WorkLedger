import type { InsightNativeResult } from '@workledger/contracts';

/** Direct native relationships only; never expand transitively through other entries. */
export function insightLimitationDependencies(result: InsightNativeResult) {
  return result.limitations.map((limitation) => {
    const sources = new Set(limitation.sourceReferences);
    const facts = result.facts.filter((fact) => fact.sourceReferences.some((ref) => sources.has(ref)));
    const actions = result.actions.filter((action) =>
      action.sourceReferences.some((ref) => sources.has(ref)),
    );
    return {
      limitation,
      relatedFactReferences: facts.map((fact) => fact.reference),
      relatedActionReferences: actions.map((action) => action.reference),
      relatedSourceReferences: [...new Set([
        ...limitation.sourceReferences,
        ...facts.flatMap((fact) => fact.sourceReferences),
        ...actions.flatMap((action) => action.sourceReferences),
      ])],
    };
  });
}
