import { parseEmployeeInsightEvaluationArtifact } from '../src/insights/employee-insight-evaluation-artifact.js';
import { sanitizeInsightValidationDetail } from '../src/logging/insight-validation-detail.js';
import { EMPLOYEE_INSIGHT_PROVIDER_OUTPUT_FORMAT } from '../src/insights/employee-insight-selection.js';
import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

import { SUPPORTED_LOCALES, type SupportedLocale } from '@workledger/contracts';
import type { InsightInterpretationRequest } from '@workledger/contracts/insights';
import { parseDomainId, parseInstant } from '@workledger/domain';

import { OLLAMA_MAX_GENERATED_TOKENS, createOllamaAiProvider } from '../src/ai/ollama-adapter.js';
import { createRuntimeConfig } from '../src/config.js';
import { WorkLedgerApiError } from '../src/http/errors.js';
import {
  createEmployeeInsightInterpretationService,
  type EmployeeInsightOperationalTrace,
} from '../src/insights/employee-insight-interpretation.js';
import type { EmployeeInsightInterpretationSource } from '../src/insights/insight-service.js';
import { createInsightToolRegistry } from '../src/insights/insight-tool-registry.js';
import {
  EMPLOYEE_INSIGHT_GOLDEN_REPETITIONS,
  EMPLOYEE_INSIGHT_GOLDEN_SET,
  evaluateGoldenInterpretation,
  type EmployeeInsightGoldenQuestion,
} from './fixtures/employee-insight-golden-set.js';

const RUN_EVALUATION = process.env['WORKLEDGER_RUN_AI_EVALUATION'] === '1';
const CAPTURED_AT = instant('2026-08-27T12:00:00Z');
const ACCOUNT_ID = domainId<'Account'>('0198ed4e-12dc-7000-8000-000000000001');

test.skipIf(!RUN_EVALUATION)(
  'passes the employee local AI golden set against one exact pinned model',
  async () => {
    const runtime = createRuntimeConfig(process.env);
    if (runtime.aiProvider.mode !== 'ollama') {
      throw new Error('The employee AI evaluation requires WORKLEDGER_AI_PROVIDER_MODE=ollama.');
    }
    const providerConfig = runtime.aiProvider;
    const records: EvaluationRecord[] = [];
    const failures: string[] = [];
    const totalRuns =
      EMPLOYEE_INSIGHT_GOLDEN_SET.length *
      SUPPORTED_LOCALES.length *
      EMPLOYEE_INSIGHT_GOLDEN_REPETITIONS;
    const selectedQuestions = evaluationQuestions();
    const plannedRuns = selectedQuestions.flatMap((question) =>
      SUPPORTED_LOCALES.flatMap((locale) =>
        Array.from({ length: EMPLOYEE_INSIGHT_GOLDEN_REPETITIONS }, (_value, index) => ({
          locale,
          question,
          repetition: index + 1,
        })),
      ),
    );
    const runLimit = evaluationRunLimit(plannedRuns.length);
    const outputDirectory = path.resolve(
      process.env['WORKLEDGER_AI_EVALUATION_OUTPUT_DIRECTORY'] ??
        path.join('output/insights', `employee-${randomUUID()}`),
    );
    await mkdir(outputDirectory, { recursive: true });
    const persist = async (name: string, value: unknown) =>
      writeFile(path.join(outputDirectory, name), `${JSON.stringify(value, null, 2)}\n`, {
        flag: 'wx',
      });
    await persist('reservation.json', {
      plannedRuns: runLimit,
      fullMatrix: plannedRuns.length === totalRuns && runLimit === totalRuns,
    });
    const provider = createOllamaAiProvider(runtime.aiProvider);
    const health = await provider.checkHealth();
    await persist('health.json', {
      healthPassed: health.status === 'ready',
      reasonCode: health.reasonCode,
      identityPassed: false,
    });
    expect(health).toMatchObject({
      status: 'ready',
      capabilities: ['CHAT', 'STRUCTURED_OUTPUT', 'TOOLS'],
      reasonCode: null,
    });

    const snapshot = () =>
      parseEmployeeInsightEvaluationArtifact({
        artifactVersion: 2,
        providerOutputFormat: EMPLOYEE_INSIGHT_PROVIDER_OUTPUT_FORMAT,
        evaluatedAt: new Date().toISOString(),
        inference: {
          concurrencyLimit: providerConfig.concurrencyLimit,
          maximumGeneratedTokens: OLLAMA_MAX_GENERATED_TOKENS,
          temperature: 0,
          think: false,
          timeoutMs: providerConfig.timeoutMs,
        },
        model: providerConfig.model,
        modelDigest: providerConfig.modelDigest,
        repetitions: EMPLOYEE_INSIGHT_GOLDEN_REPETITIONS,
        runs: records.length,
        complete:
          records.length === totalRuns &&
          plannedRuns.length === totalRuns &&
          runLimit === totalRuns,
        semanticQuestions: EMPLOYEE_INSIGHT_GOLDEN_SET.length,
        supportedLocales: SUPPORTED_LOCALES,
        failures: failures.length,
        results: records,
      });
    for (const { locale, question, repetition } of plannedRuns.slice(0, runLimit)) {
      const record = await evaluateQuestion(question, locale, repetition, provider);
      records.push(record);
      if (record.errors.length > 0) {
        failures.push(`${record.semanticId}:${record.locale}:${record.repetition}`);
      }
      await persist(`checkpoint-${String(records.length).padStart(3, '0')}.json`, snapshot());
      if (records.length % EMPLOYEE_INSIGHT_GOLDEN_REPETITIONS === 0) {
        process.stdout.write(
          `Employee AI evaluation progress: ${records.length}/${runLimit} content free runs complete.\n`,
        );
      }
    }

    await persist('artifact.json', snapshot());
    let identityPassed = false;
    try {
      await provider.checkIdentity();
      identityPassed = true;
    } finally {
      await persist('identity.json', { identityPassed });
    }
    expect(failures, `Golden evaluation failures: ${failures.join(', ')}`).toEqual([]);
    expect(records).toHaveLength(runLimit);
  },
  3_600_000,
);

async function evaluateQuestion(
  question: EmployeeInsightGoldenQuestion,
  locale: SupportedLocale,
  repetition: number,
  provider: ReturnType<typeof createOllamaAiProvider>,
): Promise<EvaluationRecord> {
  const source = createSource(question, locale);
  const service = createEmployeeInsightInterpretationService(
    source,
    createInsightToolRegistry(source),
    provider,
    async () => ({ allowed: true, retryAfter: null }),
  );
  const request: InsightInterpretationRequest = {
    insight: question.request,
    priorTurns: [],
    question: question.questions[locale],
  };
  const traces: EmployeeInsightOperationalTrace[] = [];
  const errors: string[] = [];
  let disposition: EvaluationRecord['disposition'] = 'FAILED';

  try {
    const result = await service.interpret(identity(), request, CAPTURED_AT, {
      recordTrace: (trace) => traces.push(trace),
    });
    errors.push(...evaluateGoldenInterpretation(question, result.interpretation));
    disposition = errors.length === 0 ? 'GROUNDED' : 'FAILED';
  } catch (error) {
    if (
      question.acceptsSafeRejection &&
      error instanceof WorkLedgerApiError &&
      error.statusCode === 503
    ) {
      disposition = 'SAFE_REJECTION';
    } else {
      errors.push(safeEvaluationError(error));
    }
  }

  const trace = traces[0];
  if (trace === undefined || traces.length !== 1) {
    errors.push('Expected exactly one content free operational trace.');
  }
  return Object.freeze({
    disposition,
    errors: Object.freeze(errors),
    inputTokens: trace?.inputTokens ?? 0,
    latencyMs: trace?.latencyMs ?? 0,
    locale,
    outcome: trace?.outcome ?? 'TRACE_MISSING',
    outputTokens: trace?.outputTokens ?? 0,
    providerFailureCode: trace?.providerFailureCode ?? null,
    repetition,
    semanticId: question.id,
    toolExecutions: trace?.toolExecutions ?? 0,
    toolRounds: trace?.toolRounds ?? 0,
    validationFailureCode: trace?.validationFailureCode ?? null,
    validationDetail: sanitizeInsightValidationDetail(
      trace?.validationDetail,
      trace?.validationFailureCode,
    ),
  });
}

function createSource(
  question: EmployeeInsightGoldenQuestion,
  locale: SupportedLocale,
): EmployeeInsightInterpretationSource {
  const nativeResult = Object.freeze({
    ...question.nativeResult,
    freshness: Object.freeze({
      ...question.nativeResult.freshness,
      capturedAt: CAPTURED_AT,
    }),
  });
  return {
    run: async () => nativeResult,
    runWithLocale: async () => ({ locale, nativeResult }),
  };
}

function identity() {
  return Object.freeze({ accountId: ACCOUNT_ID, sessionFresh: true });
}

function safeEvaluationError(error: unknown): string {
  if (error instanceof WorkLedgerApiError) {
    return `WorkLedger error ${error.code} with status ${error.statusCode}.`;
  }
  return 'Unexpected evaluation failure.';
}

function evaluationRunLimit(totalRuns: number): number {
  const raw = process.env['WORKLEDGER_AI_EVALUATION_RUN_LIMIT'];
  if (raw === undefined) return totalRuns;
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > totalRuns) {
    throw new Error(`WORKLEDGER_AI_EVALUATION_RUN_LIMIT must be from 1 through ${totalRuns}.`);
  }
  return parsed;
}

function evaluationQuestions(): readonly EmployeeInsightGoldenQuestion[] {
  const semanticId = process.env['WORKLEDGER_AI_EVALUATION_SEMANTIC_ID'];
  if (semanticId === undefined) return EMPLOYEE_INSIGHT_GOLDEN_SET;
  const question = EMPLOYEE_INSIGHT_GOLDEN_SET.find(({ id }) => id === semanticId);
  if (question === undefined) {
    throw new Error('WORKLEDGER_AI_EVALUATION_SEMANTIC_ID must name one golden question.');
  }
  return Object.freeze([question]);
}

function domainId<Entity extends string>(value: string) {
  const parsed = parseDomainId<Entity>(value);
  if (!parsed.ok) throw new Error('Invalid fixture ID.');
  return parsed.value;
}

function instant(value: string) {
  const parsed = parseInstant(value);
  if (!parsed.ok) throw new Error('Invalid evaluation capture instant.');
  return parsed.value;
}

interface EvaluationRecord {
  readonly disposition: 'FAILED' | 'GROUNDED' | 'SAFE_REJECTION';
  readonly errors: readonly string[];
  readonly inputTokens: number;
  readonly latencyMs: number;
  readonly locale: SupportedLocale;
  readonly outcome: EmployeeInsightOperationalTrace['outcome'] | 'TRACE_MISSING';
  readonly outputTokens: number;
  readonly providerFailureCode: EmployeeInsightOperationalTrace['providerFailureCode'];
  readonly repetition: number;
  readonly semanticId: string;
  readonly toolExecutions: number;
  readonly toolRounds: number;
  readonly validationFailureCode: EmployeeInsightOperationalTrace['validationFailureCode'];
  readonly validationDetail: EmployeeInsightOperationalTrace['validationDetail'];
}
