import { vi } from 'vitest';

import type {
  InsightInterpretationRequest,
  InsightNativeResult,
} from '@workledger/contracts/insights';
import { parseDomainId, parseInstant } from '@workledger/domain';

import {
  AiProviderError,
  type AiProvider,
  type AiProviderRequest,
  type AiProviderResponse,
} from '../src/ai/contracts.js';
import {
  createEmployeeInsightInterpretationService,
  validateGroundedInterpretation,
} from '../src/insights/employee-insight-interpretation.js';
import { WorkLedgerApiError } from '../src/http/errors.js';
import type { EmployeeInsightInterpretationSource } from '../src/insights/insight-service.js';
import { createInsightToolRegistry } from '../src/insights/insight-tool-registry.js';

const CAPTURED_AT = instant('2026-08-27T12:00:00Z');
const ACCOUNT_ID = domainId<'Account'>('0198ed4e-12dc-7000-8000-000000000001');
const REQUEST: InsightInterpretationRequest = {
  insight: {
    kind: 'today-explanation',
    period: { date: '2026-08-27', kind: 'DATE' },
    workspace: 'EMPLOYEE',
  },
  priorTurns: [],
  question: 'Why does the current result look this way?',
};
const RESULT: InsightNativeResult = {
  actions: [
    {
      code: 'OPEN_TODAY',
      destination: 'TODAY',
      period: { date: '2026-08-27', kind: 'DATE' },
      reference: 'action_today',
      sourceReferences: ['source_today'],
    },
  ],
  facts: [
    {
      code: 'TODAY_WORKED_MINUTES',
      qualifiers: ['PROVISIONAL'],
      reference: 'fact_worked',
      sourceReferences: ['source_today'],
      value: { kind: 'MINUTES', value: 450 },
    },
  ],
  freshness: {
    boundaries: [
      {
        kind: 'CALCULATED_THROUGH',
        localDate: '2026-08-27',
        sourceReferences: ['source_today'],
      },
    ],
    capturedAt: CAPTURED_AT,
  },
  kind: 'today-explanation',
  limitations: [
    {
      code: 'TODAY_VALUES_PROVISIONAL',
      material: true,
      reference: 'limit_provisional',
      sourceReferences: ['source_today'],
    },
  ],
  period: { date: '2026-08-27', kind: 'DATE' },
  scope: { kind: 'SELF', workspace: 'EMPLOYEE' },
  sources: [
    {
      destination: 'TODAY',
      kind: 'TODAY_ATTENDANCE',
      period: { date: '2026-08-27', kind: 'DATE' },
      reference: 'source_today',
    },
  ],
  timeZone: 'Europe/Berlin',
  workspace: 'EMPLOYEE',
};
const INTERPRETATION = {
  locale: 'en-GB' as const,
  statements: [
    {
      actionReferences: ['action_today'],
      factReferences: ['fact_worked'],
      limitationReferences: ['limit_provisional'],
      sourceReferences: ['source_today'],
      text: 'The cited records explain how the components contribute to the result.',
    },
  ],
};

const WIRE = {
  locale: INTERPRETATION.locale,
  statements: [
    {
      actionSelections: [true],
      factSelections: [true],
      limitationSelections: [true],
      sourceSelections: [true],
      text: INTERPRETATION.statements[0].text,
    },
  ],
};

test('orchestrates the exact employee tool and returns grounded current sources', async () => {
  const insightService = createInsightServiceStub();
  const currentFact = RESULT.facts[0];
  if (currentFact === undefined) throw new Error('Expected a current Insight fact.');
  vi.mocked(insightService.runWithLocale).mockResolvedValueOnce({
    locale: 'en-GB',
    nativeResult: {
      ...RESULT,
      facts: [{ ...currentFact, reference: 'stale_initial_fact' }],
    },
  });
  const provider = createProvider([{ content: JSON.stringify(WIRE), toolCalls: [] }]);
  const consumeRateLimit = vi.fn(async () => ({ allowed: true, retryAfter: null }));
  const service = createEmployeeInsightInterpretationService(
    insightService,
    createInsightToolRegistry(insightService),
    provider,
    consumeRateLimit,
  );

  await expect(service.interpret(identity(), REQUEST, CAPTURED_AT)).resolves.toEqual({
    interpretation: INTERPRETATION,
    nativeResult: RESULT,
  });
  expect(insightService.runWithLocale).toHaveBeenCalledOnce();
  expect(insightService.run).toHaveBeenCalledOnce();
  expect(consumeRateLimit).toHaveBeenCalledWith(ACCOUNT_ID);
  expect(provider.generate).toHaveBeenCalledOnce();
  const providerRequest = vi.mocked(provider.generate).mock.calls[0]?.[0];
  expect(providerRequest?.tools).toEqual([]);
  expect(providerRequest?.outputSchema).toMatchObject({
    additionalProperties: false,
    properties: {
      locale: { enum: ['en-GB'] },
      statements: {
        items: {
          properties: {
            actionSelections: { items: { type: 'boolean' }, minItems: 1, maxItems: 1 },
            factSelections: { items: { type: 'boolean' }, minItems: 1, maxItems: 1 },
            limitationSelections: { items: { type: 'boolean' }, minItems: 1, maxItems: 1 },
            sourceSelections: { items: { type: 'boolean' }, minItems: 1, maxItems: 1 },
            text: { const: INTERPRETATION.statements[0].text },
          },
        },
      },
    },
  });
  const serializedRequest = JSON.stringify(providerRequest);
  expect(serializedRequest).toContain('source_today');
  expect(serializedRequest).toContain('relatedFactReferences');
  expect(serializedRequest).not.toContain('stale_initial_fact');
  expect(providerRequest.messages.map((message) => message.content).join()).toContain(
    '"qualifiers":["PROVISIONAL"]',
  );
  expect(serializedRequest).not.toContain('450');
  expect(serializedRequest).not.toContain('employeeId');
});

test('requires empty arrays when the current result has no optional references', async () => {
  const resultWithoutOptionalReferences: InsightNativeResult = {
    ...RESULT,
    actions: [],
    limitations: [],
  };
  const insightService = createInsightServiceStub();
  vi.mocked(insightService.run).mockResolvedValueOnce(resultWithoutOptionalReferences);
  const provider = createProvider([
    {
      content: JSON.stringify({
        ...WIRE,
        statements: [
          {
            ...WIRE.statements[0],
            actionSelections: [],
            limitationSelections: [],
          },
        ],
      }),
      toolCalls: [],
    },
  ]);
  const service = createEmployeeInsightInterpretationService(
    insightService,
    createInsightToolRegistry(insightService),
    provider,
    async () => ({ allowed: true, retryAfter: null }),
  );

  await expect(service.interpret(identity(), REQUEST, CAPTURED_AT)).resolves.toMatchObject({
    nativeResult: resultWithoutOptionalReferences,
  });
  expect(vi.mocked(provider.generate).mock.calls[0]?.[0].outputSchema).toMatchObject({
    properties: {
      statements: {
        items: {
          properties: {
            actionSelections: { maxItems: 0 },
            limitationSelections: { maxItems: 0 },
          },
        },
      },
    },
  });
  expect(
    JSON.stringify(vi.mocked(provider.generate).mock.calls[0]?.[0].outputSchema),
  ).not.toContain('"enum":[]');
});

test('records one content free operational trace with bounded token and tool counts', async () => {
  const insightService = createInsightServiceStub();
  const provider = createProvider([
    {
      content: JSON.stringify(WIRE),
      toolCalls: [],
      usage: { inputTokens: 50, outputTokens: 12 },
    },
  ]);
  const traces: unknown[] = [];
  const service = createEmployeeInsightInterpretationService(
    insightService,
    createInsightToolRegistry(insightService),
    provider,
    async () => ({ allowed: true, retryAfter: null }),
  );

  await service.interpret(identity(), REQUEST, CAPTURED_AT, {
    recordTrace: (trace) => traces.push(trace),
  });

  expect(traces).toEqual([
    {
      inputTokens: 50,
      latencyMs: expect.any(Number),
      outcome: 'SUCCESS',
      outputTokens: 12,
      providerFailureCode: null,
      validationFailureCode: null,
      validationDetail: null,
      toolExecutions: 1,
      toolRounds: 0,
    },
  ]);
  const serialized = JSON.stringify(traces);
  expect(serialized).not.toContain(REQUEST.question);
  expect(serialized).not.toContain(INTERPRETATION.statements[0].text);
  expect(serialized).not.toContain('source_today');
  expect(serialized).not.toContain(ACCOUNT_ID);
});

test('normalizes an exact JSON response fence before applying the full grounding validator', async () => {
  const insightService = createInsightServiceStub();
  const provider = createProvider([
    { content: `\`\`\`json\n${JSON.stringify(WIRE)}\n\`\`\``, toolCalls: [] },
  ]);
  const service = createEmployeeInsightInterpretationService(
    insightService,
    createInsightToolRegistry(insightService),
    provider,
    async () => ({ allowed: true, retryAfter: null }),
  );

  await expect(service.interpret(identity(), REQUEST, CAPTURED_AT)).resolves.toEqual({
    interpretation: INTERPRETATION,
    nativeResult: RESULT,
  });
});

test('rejects a fenced JSON response with any surrounding prose', async () => {
  const insightService = createInsightServiceStub();
  const provider = createProvider([
    {
      content: `Here is the result:\n\`\`\`json\n${JSON.stringify(WIRE)}\n\`\`\``,
      toolCalls: [],
    },
  ]);
  const service = createEmployeeInsightInterpretationService(
    insightService,
    createInsightToolRegistry(insightService),
    provider,
    async () => ({ allowed: true, retryAfter: null }),
  );

  await expect(service.interpret(identity(), REQUEST, CAPTURED_AT)).rejects.toMatchObject({
    code: 'INTERNAL_ERROR',
    statusCode: 503,
  });
});

test('rejects otherwise grounded prose outside the locale safe allowlist', async () => {
  const insightService = createInsightServiceStub();
  const provider = createProvider([
    {
      content: JSON.stringify({
        ...WIRE,
        statements: [
          {
            ...WIRE.statements[0],
            text: 'The evidence proves that a policy conclusion applies.',
          },
        ],
      }),
      toolCalls: [],
    },
  ]);
  const traces: unknown[] = [];
  const service = createEmployeeInsightInterpretationService(
    insightService,
    createInsightToolRegistry(insightService),
    provider,
    async () => ({ allowed: true, retryAfter: null }),
  );

  await expect(
    service.interpret(identity(), REQUEST, CAPTURED_AT, {
      recordTrace: (trace) => traces.push(trace),
    }),
  ).rejects.toMatchObject({ code: 'INTERNAL_ERROR', statusCode: 503 });
  expect(traces).toEqual([
    expect.objectContaining({
      outcome: 'PROVIDER_INVALID_OUTPUT',
      validationFailureCode: 'FINAL_PROSE_NOT_ALLOWLISTED',
    }),
  ]);
});

test.each([
  {
    name: 'an unexpected model tool call',
    response: {
      content: '',
      toolCalls: [
        {
          name: 'employee_today_explanation',
          arguments: { date: '2026-08-26' },
        },
      ],
    },
    validationFailureCode: 'FINAL_TOOL_CALL_UNEXPECTED',
  },
  {
    name: 'ungrounded final output',
    response: {
      content: JSON.stringify({
        ...WIRE,
        statements: [{ ...WIRE.statements[0], text: 'The result is 450 minutes.' }],
      }),
      toolCalls: [],
    },
    validationFailureCode: 'FINAL_PROSE_NUMBER',
  },
] satisfies readonly {
  name: string;
  response: AiProviderResponse;
  validationFailureCode: string;
}[])('rejects $name after one server selected registry execution', async (testCase) => {
  const insightService = createInsightServiceStub();
  const provider = createProvider([testCase.response]);
  const traces: unknown[] = [];
  const service = createEmployeeInsightInterpretationService(
    insightService,
    createInsightToolRegistry(insightService),
    provider,
    async () => ({ allowed: true, retryAfter: null }),
  );

  await expect(
    service.interpret(identity(), REQUEST, CAPTURED_AT, {
      recordTrace: (trace) => traces.push(trace),
    }),
  ).rejects.toMatchObject({ code: 'INTERNAL_ERROR', statusCode: 503 });
  expect(provider.generate).toHaveBeenCalledOnce();
  expect(vi.mocked(provider.generate).mock.calls[0]?.[0].tools).toEqual([]);
  expect(insightService.run).toHaveBeenCalledOnce();
  expect(traces).toEqual([
    expect.objectContaining({
      outcome: 'PROVIDER_INVALID_OUTPUT',
      toolExecutions: 1,
      toolRounds: 0,
      validationFailureCode: testCase.validationFailureCode,
    }),
  ]);
});

test.each([
  { code: 'TIMEOUT' as const, expectedOutcome: 'PROVIDER_FAILURE' },
  { code: 'PROVIDER_BUSY' as const, expectedOutcome: 'PROVIDER_FAILURE' },
  { code: 'INVALID_RESPONSE' as const, expectedOutcome: 'PROVIDER_INVALID_OUTPUT' },
])(
  'records safe degraded handling for provider failure $code',
  async ({ code, expectedOutcome }) => {
    const insightService = createInsightServiceStub();
    const provider = readyProvider(async () => {
      throw new AiProviderError(code);
    });
    const traces: unknown[] = [];
    const service = createEmployeeInsightInterpretationService(
      insightService,
      createInsightToolRegistry(insightService),
      provider,
      async () => ({ allowed: true, retryAfter: null }),
    );

    await expect(
      service.interpret(identity(), REQUEST, CAPTURED_AT, {
        recordTrace: (trace) => traces.push(trace),
      }),
    ).rejects.toMatchObject({ code: 'INTERNAL_ERROR', statusCode: 503 });
    expect(traces).toEqual([
      expect.objectContaining({
        outcome: expectedOutcome,
        providerFailureCode: code,
        toolExecutions: 1,
        toolRounds: 0,
      }),
    ]);
    expect(JSON.stringify(traces)).not.toContain(REQUEST.question);
    expect(insightService.runWithLocale).toHaveBeenCalledOnce();
  },
);

test('does not call an unavailable provider and records the native fallback path', async () => {
  const insightService = createInsightServiceStub();
  const unavailableHealth = Object.freeze({
    mode: 'ollama' as const,
    status: 'unavailable' as const,
    capabilities: Object.freeze([]),
    checkedAt: '2026-08-27T11:00:00Z',
    reasonCode: 'CONNECTION_FAILED' as const,
  });
  const provider: AiProvider = {
    mode: 'ollama',
    checkHealth: vi.fn(async () => unavailableHealth),
    generate: vi.fn(async () => {
      throw new Error('The unavailable provider must not be called.');
    }),
    getHealth: () => unavailableHealth,
  };
  const traces: unknown[] = [];
  const service = createEmployeeInsightInterpretationService(
    insightService,
    createInsightToolRegistry(insightService),
    provider,
    async () => ({ allowed: true, retryAfter: null }),
  );

  await expect(
    service.interpret(identity(), REQUEST, CAPTURED_AT, {
      recordTrace: (trace) => traces.push(trace),
    }),
  ).rejects.toMatchObject({ code: 'INTERNAL_ERROR', statusCode: 503 });
  expect(provider.generate).not.toHaveBeenCalled();
  expect(insightService.runWithLocale).toHaveBeenCalledOnce();
  expect(insightService.run).not.toHaveBeenCalled();
  expect(traces).toEqual([
    expect.objectContaining({ outcome: 'PROVIDER_UNAVAILABLE', providerFailureCode: null }),
  ]);
});

test('enforces one in flight interpretation and propagates caller cancellation', async () => {
  let providerStarted: (() => void) | undefined;
  const started = new Promise<void>((resolve) => {
    providerStarted = resolve;
  });
  const provider = readyProvider(async (_request, options) => {
    providerStarted?.();
    return new Promise<never>((_resolve, reject) => {
      options?.signal?.addEventListener('abort', () => reject(new AiProviderError('CANCELLED')), {
        once: true,
      });
    });
  });
  const insightService = createInsightServiceStub();
  const service = createEmployeeInsightInterpretationService(
    insightService,
    createInsightToolRegistry(insightService),
    provider,
    async () => ({ allowed: true, retryAfter: null }),
  );
  const controller = new AbortController();
  const traces: unknown[] = [];
  const first = service.interpret(identity(), REQUEST, CAPTURED_AT, {
    recordTrace: (trace) => traces.push(trace),
    signal: controller.signal,
  });
  await started;

  await expect(
    service.interpret(identity(), REQUEST, CAPTURED_AT, {
      recordTrace: (trace) => traces.push(trace),
    }),
  ).rejects.toMatchObject({
    code: 'RATE_LIMITED',
    statusCode: 429,
  });
  await expect(
    service.interpret(identity(), REQUEST, CAPTURED_AT, {
      recordTrace: (trace) => traces.push(trace),
    }),
  ).rejects.toMatchObject({
    code: 'RATE_LIMITED',
    statusCode: 429,
  });
  controller.abort();
  await expect(first).rejects.toMatchObject({ code: 'INTERNAL_ERROR', statusCode: 503 });
  expect(traces).toEqual([
    expect.objectContaining({
      outcome: 'RATE_LIMITED',
      providerFailureCode: null,
      toolExecutions: 0,
    }),
    expect.objectContaining({
      outcome: 'RATE_LIMITED',
      providerFailureCode: null,
      toolExecutions: 0,
    }),
    expect.objectContaining({
      outcome: 'PROVIDER_CANCELLED',
      providerFailureCode: 'CANCELLED',
      toolExecutions: 1,
      toolRounds: 0,
    }),
  ]);
});

test('stops before provider generation when current registry authorization is lost', async () => {
  const deniedService = createInsightServiceStub();
  vi.mocked(deniedService.run).mockRejectedValueOnce(
    new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 }),
  );
  const provider = createProvider([]);
  const traces: unknown[] = [];
  const service = createEmployeeInsightInterpretationService(
    deniedService,
    createInsightToolRegistry(deniedService),
    provider,
    async () => ({ allowed: true, retryAfter: null }),
  );

  await expect(
    service.interpret(identity(), REQUEST, CAPTURED_AT, {
      recordTrace: (trace) => traces.push(trace),
    }),
  ).rejects.toMatchObject({ code: 'ACCESS_DENIED', statusCode: 403 });
  expect(deniedService.runWithLocale).toHaveBeenCalledOnce();
  expect(deniedService.run).toHaveBeenCalledOnce();
  expect(provider.generate).not.toHaveBeenCalled();
  expect(traces).toEqual([
    expect.objectContaining({
      outcome: 'PERMISSION_DENIED',
      providerFailureCode: null,
      toolExecutions: 0,
      toolRounds: 0,
      validationFailureCode: null,
      validationDetail: null,
    }),
  ]);
});

test('stops before provider generation when the current registry result is invalid', async () => {
  const invalidService = createInsightServiceStub();
  vi.mocked(invalidService.run).mockResolvedValueOnce({ ...RESULT, workspace: 'MANAGER' });
  const provider = createProvider([]);
  const traces: unknown[] = [];
  const service = createEmployeeInsightInterpretationService(
    invalidService,
    createInsightToolRegistry(invalidService),
    provider,
    async () => ({ allowed: true, retryAfter: null }),
  );

  await expect(
    service.interpret(identity(), REQUEST, CAPTURED_AT, {
      recordTrace: (trace) => traces.push(trace),
    }),
  ).rejects.toMatchObject({ code: 'INTERNAL_ERROR', statusCode: 503 });
  expect(provider.generate).not.toHaveBeenCalled();
  expect(traces).toEqual([
    expect.objectContaining({
      outcome: 'NATIVE_FAILURE',
      providerFailureCode: null,
      toolExecutions: 0,
      toolRounds: 0,
      validationFailureCode: null,
      validationDetail: null,
    }),
  ]);
});

test('preserves initial permission loss and rejects missing material limitation citations', async () => {
  const deniedService = createInsightServiceStub();
  vi.mocked(deniedService.runWithLocale).mockRejectedValueOnce(
    new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 }),
  );
  const service = createEmployeeInsightInterpretationService(
    deniedService,
    createInsightToolRegistry(deniedService),
    createProvider([]),
    async () => ({ allowed: true, retryAfter: null }),
  );
  await expect(service.interpret(identity(), REQUEST, CAPTURED_AT)).rejects.toMatchObject({
    code: 'ACCESS_DENIED',
    statusCode: 403,
  });

  expect(() =>
    validateGroundedInterpretation(
      {
        ...INTERPRETATION,
        statements: [{ ...INTERPRETATION.statements[0], limitationReferences: [] }],
      },
      RESULT,
      'en-GB',
    ),
  ).toThrowError();
});

test('does not retry malformed selections or carry failure detail into a later success', async () => {
  const insightService = createInsightServiceStub();
  const provider = createProvider([
    {
      content: JSON.stringify({
        ...WIRE,
        statements: [{ ...WIRE.statements[0], sourceSelections: ['private-canary'] }],
      }),
      toolCalls: [],
    },
    { content: JSON.stringify(WIRE), toolCalls: [] },
  ]);
  const traces: unknown[] = [];
  const service = createEmployeeInsightInterpretationService(
    insightService,
    createInsightToolRegistry(insightService),
    provider,
    async () => ({ allowed: true, retryAfter: null }),
  );
  const options = { recordTrace: (trace: unknown) => traces.push(trace) };
  await expect(service.interpret(identity(), REQUEST, CAPTURED_AT, options)).rejects.toMatchObject({
    statusCode: 503,
  });
  expect(provider.generate).toHaveBeenCalledOnce();
  await service.interpret(identity(), REQUEST, CAPTURED_AT, options);
  expect(traces[0]).toMatchObject({
    validationDetail: { kind: 'SELECTION_INVALID', field: 'sourceReferences', reason: 'ITEM_TYPE' },
  });
  expect(traces[1]).toMatchObject({ outcome: 'SUCCESS', validationDetail: null });
  expect(JSON.stringify(traces)).not.toContain('private-canary');
});

test('concurrent employees decode against their own authorized collection order', async () => {
  const fact = RESULT.facts[0];
  if (!fact) throw new Error('Missing fact.');
  const first = { ...RESULT, facts: [fact, { ...fact, reference: 'fact_second' }] };
  const second = { ...first, facts: [...first.facts].reverse() };
  const insightService = createInsightServiceStub();
  vi.mocked(insightService.run).mockImplementation(async (actor) =>
    actor.accountId === ACCOUNT_ID ? first : second,
  );
  let release: (() => void) | undefined;
  const bothStarted = new Promise<void>((resolve) => {
    release = resolve;
  });
  let started = 0;
  const provider = readyProvider(async () => {
    started += 1;
    if (started === 2) release?.();
    await bothStarted;
    return {
      content: JSON.stringify({
        ...WIRE,
        statements: [{ ...WIRE.statements[0], factSelections: [true, false] }],
      }),
      toolCalls: [],
    };
  });
  const service = createEmployeeInsightInterpretationService(
    insightService,
    createInsightToolRegistry(insightService),
    provider,
    async () => ({ allowed: true, retryAfter: null }),
  );
  const [one, two] = await Promise.all([
    service.interpret(identity(), REQUEST, CAPTURED_AT),
    service.interpret(
      { ...identity(), accountId: domainId<'Account'>('0198ed4e-12dc-7000-8000-000000000002') },
      REQUEST,
      CAPTURED_AT,
    ),
  ]);
  expect(one.interpretation.statements[0]?.factReferences).toEqual(['fact_worked']);
  expect(two.interpretation.statements[0]?.factReferences).toEqual(['fact_second']);
  expect(provider.generate).toHaveBeenCalledTimes(2);
});

function createInsightServiceStub(): EmployeeInsightInterpretationSource {
  return {
    run: vi.fn(async () => RESULT),
    runWithLocale: vi.fn(async () => ({ locale: 'en-GB' as const, nativeResult: RESULT })),
  };
}

function createProvider(responses: readonly AiProviderResponse[]): AiProvider {
  let responseIndex = 0;
  return readyProvider(async () => {
    const response = responses[responseIndex];
    responseIndex += 1;
    if (response === undefined) throw new AiProviderError('INVALID_RESPONSE');
    return response;
  });
}

function readyProvider(generate: AiProvider['generate']): AiProvider {
  const health = Object.freeze({
    mode: 'ollama' as const,
    status: 'ready' as const,
    capabilities: Object.freeze(['CHAT', 'STRUCTURED_OUTPUT', 'TOOLS'] as const),
    checkedAt: '2026-08-27T11:00:00Z',
    reasonCode: null,
  });
  return {
    mode: 'ollama',
    checkHealth: vi.fn(async () => health),
    generate: vi.fn(generate),
    getHealth: () => health,
  };
}

function identity() {
  return Object.freeze({ accountId: ACCOUNT_ID, sessionFresh: true });
}

function domainId<Entity extends string>(value: string) {
  const parsed = parseDomainId<Entity>(value);
  if (!parsed.ok) throw new Error('Invalid fixture ID.');
  return parsed.value;
}

function instant(value: string) {
  const parsed = parseInstant(value);
  if (!parsed.ok) throw new Error('Invalid instant fixture.');
  return parsed.value;
}
