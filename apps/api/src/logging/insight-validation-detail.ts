import { z } from 'zod';

const referenceFieldSchema = z.enum([
  'actionReferences',
  'factReferences',
  'limitationReferences',
  'sourceReferences',
]);

const detailSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('REFERENCE_DUPLICATE'),
    field: referenceFieldSchema,
    itemCount: z.number().int().min(2).max(20),
    distinctCount: z.number().int().min(1).max(19),
    duplicateCount: z.number().int().min(1).max(19),
  }),
  z.strictObject({
    kind: z.literal('SELECTION_INVALID'),
    field: referenceFieldSchema,
    reason: z.enum(['NOT_ARRAY', 'LENGTH', 'ITEM_TYPE']),
  }),
]);

export type InsightValidationDetail = z.infer<typeof detailSchema>;

/** Reconstruct only safe fields; never retain parser issues or the supplied object. */
export function sanitizeInsightValidationDetail(
  value: unknown,
  failureCode: unknown,
): InsightValidationDetail | null {
  const parsed = detailSchema.safeParse(value);
  if (!parsed.success) return null;
  const detail = parsed.data;
  if (detail.kind === 'REFERENCE_DUPLICATE') {
    if (
      failureCode !== 'FINAL_SCHEMA_REFERENCES_DUPLICATE' ||
      detail.itemCount - detail.distinctCount !== detail.duplicateCount
    )
      return null;
  } else if (failureCode !== 'FINAL_SELECTION_INVALID') return null;
  return Object.freeze(detail);
}
