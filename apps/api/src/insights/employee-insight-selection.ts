import type { SupportedLocale } from '@workledger/contracts';
import type { InsightNativeResult } from '@workledger/contracts/insights';
import type { InsightValidationDetail } from '../logging/insight-validation-detail.js';
import type { EmployeeInsightValidationFailureCode } from './employee-insight-interpretation.js';

export const EMPLOYEE_INSIGHT_PROVIDER_OUTPUT_FORMAT = 'selection-v1';

const selectionFields = [
  ['actionSelections', 'actionReferences', 'actions'],
  ['factSelections', 'factReferences', 'facts'],
  ['limitationSelections', 'limitationReferences', 'limitations'],
  ['sourceSelections', 'sourceReferences', 'sources'],
] as const;

type DecodeResult =
  | Readonly<{ ok: true; candidate: unknown }>
  | Readonly<{
      ok: false;
      code: Exclude<EmployeeInsightValidationFailureCode, null>;
      detail: InsightValidationDetail | null;
    }>;

/** The caller supplies the already validated, request-owned registry snapshot. */
export function createEmployeeInsightSelectionCodec(
  result: InsightNativeResult,
  locale: SupportedLocale,
  safeText: string,
) {
  const tables = {
    actions: Object.freeze(result.actions.map(({ reference }) => reference)),
    facts: Object.freeze(result.facts.map(({ reference }) => reference)),
    limitations: Object.freeze(result.limitations.map(({ reference }) => reference)),
    sources: Object.freeze(result.sources.map(({ reference }) => reference)),
  };
  const properties = Object.fromEntries(
    selectionFields.map(([selection, , collection]) => [
      selection,
      {
        type: 'array',
        items: { type: 'boolean' },
        minItems: tables[collection].length,
        maxItems: tables[collection].length,
      },
    ]),
  );
  const statementKeys = [...selectionFields.map(([selection]) => selection), 'text'];
  const outputSchema = Object.freeze({
    type: 'object',
    additionalProperties: false,
    required: ['locale', 'statements'],
    properties: {
      locale: { type: 'string', enum: [locale] },
      statements: {
        type: 'array',
        minItems: 1,
        maxItems: 1,
        items: {
          type: 'object',
          additionalProperties: false,
          required: statementKeys,
          properties: { ...properties, text: { type: 'string', const: safeText } },
        },
      },
    },
  });

  function decode(value: unknown): DecodeResult {
    if (!isRecord(value)) return failure('FINAL_SCHEMA_ROOT_TYPE_INVALID');
    if (!hasExactKeys(value, ['locale', 'statements']))
      return failure('FINAL_SCHEMA_ROOT_KEYS_INVALID');
    if (value['locale'] !== locale) return failure('FINAL_SCHEMA_LOCALE_INVALID');
    const statements = value['statements'];
    if (!Array.isArray(statements) || statements.length !== 1)
      return failure('FINAL_SCHEMA_STATEMENT_COUNT_INVALID');
    const statement = statements[0];
    if (!isRecord(statement) || !hasExactKeys(statement, statementKeys))
      return failure('FINAL_SCHEMA_STATEMENT_INVALID');
    const text = statement['text'];
    if (typeof text !== 'string' || text.trim() === '') return failure('FINAL_SCHEMA_TEXT_INVALID');
    const references: Record<string, readonly string[]> = {};
    for (const [selection, field, collection] of selectionFields) {
      const values = statement[selection];
      const reason = !Array.isArray(values)
        ? 'NOT_ARRAY'
        : values.length !== tables[collection].length
          ? 'LENGTH'
          : values.some((item) => typeof item !== 'boolean')
            ? 'ITEM_TYPE'
            : null;
      if (reason !== null)
        return failure('FINAL_SELECTION_INVALID', {
          kind: 'SELECTION_INVALID',
          field,
          reason,
        });
      if (!Array.isArray(values)) return failure('FINAL_SELECTION_INVALID');
      references[field] = tables[collection].filter((_reference, index) => values[index] === true);
    }
    // Final public validation still owns cardinality, prose and all grounding requirements.
    return { ok: true, candidate: { locale, statements: [{ ...references, text }] } };
  }
  return Object.freeze({ outputSchema, decode });
}

function failure(
  code: Exclude<EmployeeInsightValidationFailureCode, null>,
  detail: InsightValidationDetail | null = null,
): DecodeResult {
  return { ok: false, code, detail };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return (
    Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key))
  );
}
