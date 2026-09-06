import { parseEmployeeInsightEvaluationArtifact } from '../src/insights/employee-insight-evaluation-artifact.js';

const record = {
  disposition: 'FAILED',
  errors: ['WorkLedger error INTERNAL_ERROR with status 503.'],
  inputTokens: 1,
  latencyMs: 1,
  locale: 'es-ES',
  outcome: 'PROVIDER_INVALID_OUTPUT',
  outputTokens: 1,
  providerFailureCode: 'INVALID_RESPONSE',
  repetition: 1,
  semanticId: 'balance-summary',
  toolExecutions: 1,
  toolRounds: 0,
  validationFailureCode: 'FINAL_SCHEMA_REFERENCES_DUPLICATE',
};
const legacy = {
  evaluatedAt: '2026-09-06T07:37:41.877Z',
  inference: {
    concurrencyLimit: 1,
    maximumGeneratedTokens: 1024,
    temperature: 0,
    think: false,
    timeoutMs: 120000,
  },
  model: 'synthetic:latest',
  modelDigest: 'a'.repeat(64),
  repetitions: 3,
  runs: 1,
  complete: false,
  semanticQuestions: 24,
  supportedLocales: ['en-GB', 'de-DE', 'es-ES'],
  failures: 1,
  results: [record],
};
const detail = {
  kind: 'REFERENCE_DUPLICATE',
  field: 'sourceReferences',
  itemCount: 2,
  distinctCount: 1,
  duplicateCount: 1,
};
const current = {
  ...legacy,
  artifactVersion: 2,
  providerOutputFormat: 'selection-v1',
  results: [{ ...record, validationDetail: detail }],
};

test('accepts distinct legacy and v2 artifact shapes without upgrading historical evidence', () => {
  expect(parseEmployeeInsightEvaluationArtifact(legacy)).toEqual(legacy);
  expect(parseEmployeeInsightEvaluationArtifact(legacy)).not.toHaveProperty('artifactVersion');
  expect(parseEmployeeInsightEvaluationArtifact(current)).toEqual(current);
});

test.each([
  { ...current, prompt: 'private-canary' },
  { ...current, artifactVersion: 3 },
  { ...current, providerOutputFormat: 'legacy' },
  { ...legacy, providerOutputFormat: 'selection-v1' },
  { ...legacy, results: current.results },
  { ...current, results: [record] },
  {
    ...current,
    results: [{ ...record, validationDetail: { ...detail, content: 'private-canary' } }],
  },
  {
    ...current,
    results: [{ ...record, validationDetail: { ...detail, field: 'private-canary' } }],
  },
  { ...current, results: [{ ...record, outcome: 'SUCCESS', validationDetail: detail }] },
  {
    ...current,
    results: [
      { ...record, validationFailureCode: 'FINAL_SOURCE_MISMATCH', validationDetail: detail },
    ],
  },
  { ...current, complete: true },
  { ...current, runs: 2, failures: 2, results: [...current.results, ...current.results] },
  { ...current, failures: 0 },
])('rejects unsafe, mismatched or incomplete evidence using a content-free error', (input) => {
  expect(() => parseEmployeeInsightEvaluationArtifact(input)).toThrowError(
    'Invalid employee Insight evaluation artifact.',
  );
});
