import { vi } from 'vitest';
import { sanitizeInsightValidationDetail } from '../src/logging/insight-validation-detail.js';

const sink = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[] }));
vi.mock('pino', () => {
  const logger = (bindings: Record<string, unknown> = {}) => ({
    info: (data: Record<string, unknown>) => sink.rows.push({ ...bindings, ...data }),
    child: (data: Record<string, unknown>) => logger({ ...bindings, ...data }),
  });
  return { default: Object.assign(() => logger(), { stdTimeFunctions: { isoTime: () => '' } }) };
});
import { createWorkLedgerLogger } from '../src/logging/logger.js';

const detail = {
  kind: 'REFERENCE_DUPLICATE',
  field: 'factReferences',
  itemCount: 3,
  distinctCount: 1,
  duplicateCount: 2,
} as const;
const code = 'FINAL_SCHEMA_REFERENCES_DUPLICATE';

test('reconstructs exact diagnostic fields and rejects inconsistent or arbitrary nested data', () => {
  expect(sanitizeInsightValidationDetail(detail, code)).toEqual(detail);
  expect(sanitizeInsightValidationDetail(detail, code)).not.toBe(detail);
  for (const invalid of [
    { ...detail, private: 'private-canary' },
    { ...detail, field: 'private-canary' },
    { ...detail, itemCount: 21 },
    { ...detail, distinctCount: 0 },
    { ...detail, duplicateCount: 1 },
    { ...detail, itemCount: 2.5 },
    { kind: 'SELECTION_INVALID', field: 'sourceReferences', reason: 'private-canary' },
  ])
    expect(sanitizeInsightValidationDetail(invalid, code)).toBeNull();
  expect(sanitizeInsightValidationDetail(detail, 'FINAL_SOURCE_MISMATCH')).toBeNull();
});

test('the logger sink validates nested detail and prevents successful or child-bound stale detail', () => {
  sink.rows.length = 0;
  const logger = createWorkLedgerLogger({ environment: 'test', service: 'api', version: 'test' });
  const fields = {
    outcome: 'PROVIDER_INVALID_OUTPUT',
    validationFailureCode: code,
    validationDetail: detail,
  };
  logger.info('Synthetic failure', fields);
  logger.info('Synthetic invalid metadata', {
    ...fields,
    validationDetail: { ...detail, raw: 'private-canary' },
  });
  logger.info('Synthetic success', { ...fields, outcome: 'SUCCESS' });
  logger.child(fields).info('Later request', { outcome: 'SUCCESS', validationFailureCode: null });
  expect(sink.rows[0]?.['validationDetail']).toEqual(detail);
  expect(sink.rows[1]?.['validationDetail']).toBeNull();
  expect(sink.rows[2]?.['validationDetail']).toBeNull();
  expect(sink.rows[3]).not.toHaveProperty('validationDetail');
  expect(JSON.stringify(sink.rows)).not.toContain('private-canary');
});

test.each(['FINAL_MATERIAL_FACT_MISSING', 'FINAL_MATERIAL_ACTION_MISSING'])(
  'logger preserves %s with null detail and rejects unrelated detail',
  (failureCode) => {
    sink.rows.length = 0;
    const logger = createWorkLedgerLogger({ environment: 'test', service: 'api', version: 'test' });
    for (const validationDetail of [
      null,
      detail,
      { kind: 'SELECTION_INVALID', field: 'factReferences', reason: 'LENGTH' },
    ]) {
      logger.info('Synthetic material failure', {
        outcome: 'PROVIDER_INVALID_OUTPUT',
        providerFailureCode: 'INVALID_RESPONSE',
        validationFailureCode: failureCode,
        validationDetail,
      });
    }
    expect(sink.rows).toHaveLength(3);
    for (const row of sink.rows)
      expect(row).toMatchObject({
        providerFailureCode: 'INVALID_RESPONSE',
        validationFailureCode: failureCode,
        validationDetail: null,
      });
  },
);

test('logger accepts new provider codes and drops unknown code strings at every code boundary', () => {
  sink.rows.length = 0;
  const logger = createWorkLedgerLogger({ environment: 'test', service: 'api', version: 'test' });
  for (const providerCode of ['PROVIDER_PROFILE_MISMATCH', 'SCHEMA_PROBE_FAILED']) {
    logger.info('Synthetic provider failure', {
      providerReasonCode: providerCode,
      providerFailureCode: providerCode,
      validationFailureCode: null,
      validationDetail: null,
    });
  }
  expect(sink.rows.map((row) => row['providerFailureCode'])).toEqual([
    'PROVIDER_PROFILE_MISMATCH',
    'SCHEMA_PROBE_FAILED',
  ]);
  expect(sink.rows.map((row) => row['providerReasonCode'])).toEqual([
    'PROVIDER_PROFILE_MISMATCH',
    'SCHEMA_PROBE_FAILED',
  ]);
  logger.info('Synthetic unknown codes', {
    providerReasonCode: 'PRIVATE_CODE_CANARY',
    providerFailureCode: 'PRIVATE_CODE_CANARY',
    validationFailureCode: 'PRIVATE_CODE_CANARY',
  });
  expect(sink.rows[2]).toMatchObject({
    providerReasonCode: null,
    providerFailureCode: null,
    validationFailureCode: null,
  });
  expect(JSON.stringify(sink.rows)).not.toContain('PRIVATE_CODE_CANARY');
});
