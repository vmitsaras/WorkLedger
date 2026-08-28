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

test('orchestrates the exact employee tool and returns grounded current sources', async () => {
  const insightService = createInsightServiceStub();
  const provider = createProvider([
    {
      content: '',
      toolCalls: [
        {
          name: 'employee_today_explanation',
          arguments: { date: '2026-08-27' },
        },
      ],
    },
    { content: JSON.stringify(INTERPRETATION), toolCalls: [] },
  ]);
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
  expect(provider.generate).toHaveBeenCalledTimes(2);
  const firstRequest = vi.mocked(provider.generate).mock.calls[0]?.[0];
  expect(firstRequest?.outputSchema).toBeUndefined();
  expect(firstRequest?.tools).toEqual([
    expect.objectContaining({
      name: 'employee_today_explanation',
      parameters: expect.objectContaining({
        properties: { date: { const: '2026-08-27', type: 'string' } },
      }),
    }),
  ]);
  expect(JSON.stringify(firstRequest)).not.toContain('450');
  expect(JSON.stringify(firstRequest)).not.toContain('source_today');
  const secondRequest = vi.mocked(provider.generate).mock.calls[1]?.[0];
  expect(secondRequest?.tools).toEqual([]);
  expect(secondRequest?.outputSchema).toBeUndefined();
  expect(JSON.stringify(secondRequest)).toContain('source_today');
  const toolMessage = secondRequest?.messages.find((message) => message.role === 'tool');
  expect(toolMessage).toBeDefined();
  expect(JSON.parse(toolMessage?.content ?? '')).toMatchObject({
    limitations: [
      {
        relatedActionReferences: ['action_today'],
        relatedFactReferences: ['fact_worked'],
        relatedSourceReferences: ['source_today'],
      },
    ],
  });
  expect(JSON.stringify(secondRequest)).not.toContain('"qualifiers"');
  expect(JSON.stringify(secondRequest)).not.toContain('450');
  expect(JSON.stringify(secondRequest)).not.toContain('employeeId');
});

test('records one content free operational trace with bounded token and tool counts', async () => {
  const insightService = createInsightServiceStub();
  const provider = createProvider([
    {
      content: '',
      toolCalls: [
        {
          name: 'employee_today_explanation',
          arguments: { date: '2026-08-27' },
        },
      ],
      usage: { inputTokens: 30, outputTokens: 4 },
    },
    {
      content: JSON.stringify(INTERPRETATION),
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
      inputTokens: 80,
      latencyMs: expect.any(Number),
      outcome: 'SUCCESS',
      outputTokens: 16,
      providerFailureCode: null,
      validationFailureCode: null,
      toolExecutions: 1,
      toolRounds: 1,
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
    {
      content: '',
      toolCalls: [
        {
          name: 'employee_today_explanation',
          arguments: { date: '2026-08-27' },
        },
      ],
    },
    { content: `\`\`\`json\n${JSON.stringify(INTERPRETATION)}\n\`\`\``, toolCalls: [] },
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
      content: '',
      toolCalls: [
        {
          name: 'employee_today_explanation',
          arguments: { date: '2026-08-27' },
        },
      ],
    },
    {
      content: `Here is the result:\n\`\`\`json\n${JSON.stringify(INTERPRETATION)}\n\`\`\``,
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
      content: '',
      toolCalls: [
        {
          name: 'employee_today_explanation',
          arguments: { date: '2026-08-27' },
        },
      ],
    },
    {
      content: JSON.stringify({
        ...INTERPRETATION,
        statements: [
          {
            ...INTERPRETATION.statements[0],
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

test('rejects model selected scope changes and ungrounded final output', async () => {
  for (const responses of [
    [
      {
        content: '',
        toolCalls: [
          {
            name: 'employee_today_explanation',
            arguments: { date: '2026-08-26' },
          },
        ],
      },
    ],
    [
      {
        content: '',
        toolCalls: [
          {
            name: 'employee_today_explanation',
            arguments: { date: '2026-08-27' },
          },
        ],
      },
      {
        content: JSON.stringify({
          ...INTERPRETATION,
          statements: [{ ...INTERPRETATION.statements[0], text: 'The result is 450 minutes.' }],
        }),
        toolCalls: [],
      },
    ],
  ] satisfies readonly (readonly AiProviderResponse[])[]) {
    const insightService = createInsightServiceStub();
    const provider = createProvider(responses);
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
  }
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
        toolExecutions: 0,
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
    }),
  ]);
});

test('preserves permission loss and rejects missing material limitation citations', async () => {
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

function createInsightServiceStub(): EmployeeInsightInterpretationSource {
  return {
    run: vi.fn(async () => RESULT),
    runWithLocale: vi.fn(async () => ({ locale: 'en-GB', nativeResult: RESULT })),
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
  if (!parsed.ok) throw new Error(`Invalid ${Entity} fixture ID.`);
  return parsed.value;
}

function instant(value: string) {
  const parsed = parseInstant(value);
  if (!parsed.ok) throw new Error('Invalid instant fixture.');
  return parsed.value;
}
