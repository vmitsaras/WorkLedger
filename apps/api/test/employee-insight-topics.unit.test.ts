import { vi } from 'vitest';
import {
  EMPLOYEE_INSIGHT_TOPICS,
  employeeInsightTopicRequestSchema,
  employeeInsightTopicResultSchema,
} from '@workledger/contracts/insights';
import { parseDomainId, parseInstant } from '@workledger/domain';
import { AiProviderError, type AiProvider } from '../src/ai/contracts.js';
import { WorkLedgerApiError } from '../src/http/errors.js';
import { createEmployeeInsightTopicService } from '../src/insights/employee-insight-topics.js';

const parsedId = parseDomainId<'Account'>('0198ed4e-12dc-7000-8000-000000000001');
const parsedTime = parseInstant('2026-09-06T12:00:00Z');
if (!parsedId.ok || !parsedTime.ok) throw new Error('Invalid test identity.');
const identity = { accountId: parsedId.value, sessionFresh: true };
const capturedAt = parsedTime.value;
const request = { language: 'en', question: 'What prevents my monthly submission?' } as const;

function setup() {
  const provider: AiProvider = {
    mode: 'ollama',
    checkHealth: vi.fn(),
    getHealth: vi.fn(() => ({
      mode: 'ollama',
      status: 'ready',
      checkedAt: capturedAt,
      reasonCode: null,
      capabilities: ['CHAT', 'STRUCTURED_OUTPUT', 'TOOLS'],
    })),
    generate: vi.fn(async () => ({ content: '{"topic":"submission-blockers"}', toolCalls: [] })),
  };
  const authorize = vi.fn(async () => undefined);
  const rate = vi.fn(async () => ({ allowed: true, retryAfter: null as number | null }));
  return {
    provider,
    authorize,
    rate,
    service: createEmployeeInsightTopicService(authorize, provider, rate),
  };
}

test('strict English interaction contracts reject extra scope, prose and unsupported topics', () => {
  for (const bad of [
    { ...request, language: 'de' },
    { ...request, employeeId: identity.accountId },
    { ...request, priorTurns: [] },
    { ...request, question: ' ' },
    { ...request, question: '😀'.repeat(501) },
  ])
    expect(employeeInsightTopicRequestSchema.safeParse(bad).success).toBe(false);
  expect(
    employeeInsightTopicRequestSchema.parse({ ...request, question: '😀'.repeat(500) }).question,
  ).toHaveLength(1000);
  for (const topic of [...EMPLOYEE_INSIGHT_TOPICS, 'UNKNOWN']) {
    expect(employeeInsightTopicResultSchema.parse({ topic })).toEqual({ topic });
  }
  expect(employeeInsightTopicResultSchema.safeParse({ topic: 'team-coverage' }).success).toBe(
    false,
  );
  expect(
    employeeInsightTopicResultSchema.safeParse({ topic: 'today-explanation', answer: 'invented' })
      .success,
  ).toBe(false);
});

test('sends only the question and static topics, with no tools, and reauthorizes before returning', async () => {
  const { service, provider, authorize } = setup();
  expect(await service.suggest(identity, request, capturedAt)).toEqual({
    topic: 'submission-blockers',
  });
  expect(authorize).toHaveBeenCalledTimes(2);
  expect(provider.generate).toHaveBeenCalledOnce();
  const input = vi.mocked(provider.generate).mock.calls[0]?.[0];
  expect(input?.tools).toEqual([]);
  expect(input?.messages.filter(({ role }) => role === 'user')).toEqual([
    { role: 'user', content: JSON.stringify({ question: request.question }) },
  ]);
  expect(JSON.stringify(input)).not.toContain(identity.accountId);
  expect(JSON.stringify(input)).not.toContain(capturedAt);
  expect(input?.outputSchema?.['additionalProperties']).toBe(false);
});

test.each([
  'not json',
  '{"topic":"approve-month"}',
  '{"topic":"balance-change","answer":"private"}',
  '{"topic":null}',
])('rejects invalid provider output: %s', async (content) => {
  const { service, provider } = setup();
  vi.mocked(provider.generate).mockResolvedValue({ content, toolCalls: [] });
  await expect(service.suggest(identity, request, capturedAt)).rejects.toMatchObject({
    statusCode: 503,
  });
});

test('rejects tool requests and preserves provider failure boundaries', async () => {
  const { service, provider } = setup();
  vi.mocked(provider.generate).mockResolvedValueOnce({
    content: '{"topic":"UNKNOWN"}',
    toolCalls: [{ name: 'readDatabase', arguments: {} }],
  });
  await expect(service.suggest(identity, request, capturedAt)).rejects.toMatchObject({
    statusCode: 503,
  });
  vi.mocked(provider.generate).mockRejectedValueOnce(new AiProviderError('TIMEOUT'));
  await expect(service.suggest(identity, request, capturedAt)).rejects.toMatchObject({
    statusCode: 503,
  });
  expect(await service.suggest(identity, request, capturedAt)).toEqual({
    topic: 'submission-blockers',
  });
});

test('denies unauthorized employees before generation and rejects permission loss during generation', async () => {
  const { service, provider, authorize } = setup();
  const denied = new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 });
  authorize.mockRejectedValueOnce(denied);
  await expect(service.suggest(identity, request, capturedAt)).rejects.toBe(denied);
  expect(provider.generate).not.toHaveBeenCalled();
  authorize.mockResolvedValueOnce(undefined).mockRejectedValueOnce(denied);
  await expect(service.suggest(identity, request, capturedAt)).rejects.toBe(denied);
});

test('rate limits across requests and rejects concurrent work without losing the first request lock', async () => {
  const { service, provider, rate } = setup();
  rate.mockResolvedValueOnce({ allowed: false, retryAfter: 30 });
  await expect(service.suggest(identity, request, capturedAt)).rejects.toMatchObject({
    statusCode: 429,
    context: { retryAfterSeconds: 30 },
  });
  let finish: (() => void) | undefined;
  vi.mocked(provider.generate).mockImplementationOnce(async () => {
    await new Promise<void>((resolve) => {
      finish = resolve;
    });
    return { content: '{"topic":"UNKNOWN"}', toolCalls: [] };
  });
  const first = service.suggest(identity, request, capturedAt);
  await vi.waitFor(() => expect(finish).toBeDefined());
  await expect(service.suggest(identity, request, capturedAt)).rejects.toMatchObject({
    statusCode: 429,
  });
  await expect(service.suggest(identity, request, capturedAt)).rejects.toMatchObject({
    statusCode: 429,
  });
  finish?.();
  expect(await first).toEqual({ topic: 'UNKNOWN' });
});

test('handles disabled provider and cancellation without returning a late suggestion', async () => {
  const { service, provider } = setup();
  vi.mocked(provider.getHealth).mockReturnValueOnce({
    mode: 'disabled',
    status: 'disabled',
    checkedAt: capturedAt,
    reasonCode: null,
    capabilities: [],
  });
  await expect(service.suggest(identity, request, capturedAt)).rejects.toMatchObject({
    statusCode: 503,
  });
  expect(provider.generate).not.toHaveBeenCalled();
  const controller = new AbortController();
  vi.mocked(provider.generate).mockImplementationOnce(async (_request, options) => {
    expect(options?.signal).toBe(controller.signal);
    controller.abort();
    return { content: '{"topic":"today-explanation"}', toolCalls: [] };
  });
  await expect(
    service.suggest(identity, request, capturedAt, controller.signal),
  ).rejects.toMatchObject({ statusCode: 503 });
});
