import { z } from 'zod';
import { sanitizeInsightValidationDetail } from '../logging/insight-validation-detail.js';
import { EMPLOYEE_INSIGHT_PROVIDER_OUTPUT_FORMAT } from './employee-insight-selection.js';

const count = z.number().int().nonnegative();
const locale = z.enum(['en-GB', 'de-DE', 'es-ES']);
const safeCode = z
  .string()
  .regex(/^[A-Z][A-Z_]{0,79}$/u)
  .nullable();
const recordShape = {
  disposition: z.enum(['GROUNDED', 'SAFE_REJECTION', 'FAILED']),
  errors: z.array(z.string().max(256)).max(100),
  inputTokens: count,
  latencyMs: count,
  locale,
  outcome: z.enum([
    'NATIVE_FAILURE',
    'PERMISSION_DENIED',
    'PROVIDER_CANCELLED',
    'PROVIDER_FAILURE',
    'PROVIDER_INVALID_OUTPUT',
    'PROVIDER_UNAVAILABLE',
    'RATE_LIMITED',
    'SUCCESS',
    'VALIDATION_FAILED',
    'TRACE_MISSING',
  ]),
  outputTokens: count,
  providerFailureCode: safeCode,
  repetition: z.number().int().min(1).max(3),
  semanticId: z
    .string()
    .regex(/^[a-z]+(?:-[a-z]+)*$/u)
    .max(80),
  toolExecutions: count,
  toolRounds: count,
  validationFailureCode: safeCode,
};
const legacyRecord = z.strictObject(recordShape);
const currentRecord = z
  .strictObject({ ...recordShape, validationDetail: z.unknown() })
  .superRefine((record, context) => {
    if (record.validationDetail === null) return;
    const sanitized = sanitizeInsightValidationDetail(
      record.validationDetail,
      record.validationFailureCode,
    );
    if (record.outcome !== 'PROVIDER_INVALID_OUTPUT' || sanitized === null) {
      context.addIssue({ code: 'custom', message: 'Invalid diagnostic detail.' });
    }
  })
  .transform((record) => ({
    ...record,
    validationDetail: sanitizeInsightValidationDetail(
      record.validationDetail,
      record.validationFailureCode,
    ),
  }));
const commonShape = {
  evaluatedAt: z.iso.datetime(),
  inference: z.strictObject({
    concurrencyLimit: z.literal(1),
    maximumGeneratedTokens: z.literal(1024),
    temperature: z.literal(0),
    think: z.literal(false),
    timeoutMs: z.literal(120000),
  }),
  model: z.string().min(1).max(200),
  modelDigest: z.string().regex(/^[a-f0-9]{64}$/u),
  repetitions: z.literal(3),
  runs: count.max(216),
  complete: z.boolean(),
  semanticQuestions: z.literal(24),
  supportedLocales: z.array(locale).length(3),
  failures: count.max(216),
};
const artifactSchema = z
  .union([
    z.strictObject({ ...commonShape, results: z.array(legacyRecord).max(216) }),
    z.strictObject({
      ...commonShape,
      artifactVersion: z.literal(2),
      providerOutputFormat: z.literal(EMPLOYEE_INSIGHT_PROVIDER_OUTPUT_FORMAT),
      results: z.array(currentRecord).max(216),
    }),
  ])
  .superRefine((artifact, context) => {
    const tuples = new Set(
      artifact.results.map(
        (record) => `${record.semanticId}:${record.locale}:${record.repetition}`,
      ),
    );
    const semanticIds = new Set(artifact.results.map((record) => record.semanticId));
    if (
      artifact.results.some(
        (record) =>
          (record.disposition === 'FAILED' && record.errors.length === 0) ||
          (record.disposition === 'GROUNDED' && record.outcome !== 'SUCCESS'),
      ) ||
      artifact.runs !== artifact.results.length ||
      tuples.size !== artifact.runs ||
      new Set(artifact.supportedLocales).size !== 3 ||
      artifact.failures !== artifact.results.filter((record) => record.errors.length > 0).length ||
      (artifact.complete && (artifact.runs !== 216 || semanticIds.size !== 24))
    )
      context.addIssue({ code: 'custom', message: 'Inconsistent evaluation coverage.' });
  });

/** Artifact validation only. Never starts a provider or repairs historical evidence. */
export function parseEmployeeInsightEvaluationArtifact(value: unknown) {
  const parsed = artifactSchema.safeParse(value);
  // Zod errors include input paths; do not propagate them to operational output.
  if (!parsed.success) throw new Error('Invalid employee Insight evaluation artifact.');
  return parsed.data;
}
