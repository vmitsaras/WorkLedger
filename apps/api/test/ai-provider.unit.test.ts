import { once } from 'node:events';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

import { describe, expect, test, vi } from 'vitest';

import {
  AiProviderError,
  type AiProviderRequest,
  type OllamaAiProviderConfig,
} from '../src/ai/contracts.js';
import { createOllamaAiProvider } from '../src/ai/ollama-adapter.js';
import { createAiProvider } from '../src/ai/provider.js';
import { checkAiProviderAtStartup } from '../src/ai/startup.js';
import type { WorkLedgerLogger } from '../src/logging/logger.js';

const MODEL = 'workledger-insights:local';
const MODEL_DIGEST = 'a'.repeat(64);
const CHECKED_AT = '2026-08-27T12:00:00.000Z';
const GENERATE_REQUEST: AiProviderRequest = {
  messages: [{ role: 'user', content: 'Explain the supplied native facts.' }],
  tools: [],
  outputSchema: {
    type: 'object',
    properties: { answer: { type: 'string' } },
    required: ['answer'],
    additionalProperties: false,
  },
};

describe('AI provider abstraction', () => {
  test('is disabled without any network work and fails generation closed', async () => {
    const resolveHost = vi.fn(async () => [{ address: '127.0.0.1', family: 4 as const }]);
    const provider = createAiProvider({ mode: 'disabled' }, { resolveHost, now: () => CHECKED_AT });

    await expect(provider.checkHealth()).resolves.toEqual({
      mode: 'disabled',
      status: 'disabled',
      capabilities: [],
      checkedAt: CHECKED_AT,
      reasonCode: null,
    });
    await expect(provider.generate(GENERATE_REQUEST)).rejects.toMatchObject({
      code: 'PROVIDER_DISABLED',
    });
    expect(resolveHost).not.toHaveBeenCalled();
  });

  test('logs only safe startup health fields', async () => {
    const provider = createAiProvider({ mode: 'disabled' }, { now: () => CHECKED_AT });
    const logger = createMockLogger();

    await expect(checkAiProviderAtStartup(provider, logger)).resolves.toMatchObject({
      status: 'disabled',
    });

    expect(logger.info).toHaveBeenCalledOnce();
    const serialized = JSON.stringify(vi.mocked(logger.info).mock.calls);
    expect(serialized).toContain('providerStatus');
    expect(serialized).not.toContain('origin');
    expect(serialized).not.toContain('modelDigest');
    expect(serialized).not.toContain(MODEL);
  });
});

describe('private Ollama adapter', () => {
  test('denies generation until the pinned model health check passes', async () => {
    const resolveHost = vi.fn(async () => [{ address: '127.0.0.1', family: 4 as const }]);
    const provider = createOllamaAiProvider(createConfig('http://127.0.0.1:11434'), {
      resolveHost,
    });

    await expect(provider.generate(GENERATE_REQUEST)).rejects.toMatchObject({
      code: 'PROVIDER_NOT_READY',
    });
    expect(resolveHost).not.toHaveBeenCalled();
  });

  test('verifies the pinned local model, capability metadata, and structured output probe', async () => {
    const received: ReceivedRequest[] = [];
    const fake = await startFakeOllama(async (request, response, body) => {
      received.push({
        method: request.method ?? '',
        path: request.url ?? '',
        headers: request.headers,
        body,
      });
      respondWithHealthyOllama(request, response, body);
    });
    vi.stubEnv('HTTP_PROXY', 'http://ollama.com:8080');
    vi.stubEnv('HTTPS_PROXY', 'http://ollama.com:8080');
    const provider = createOllamaAiProvider(createConfig(fake.origin), {
      now: () => CHECKED_AT,
    });

    try {
      await expect(provider.checkHealth()).resolves.toEqual({
        mode: 'ollama',
        status: 'ready',
        capabilities: ['CHAT', 'STRUCTURED_OUTPUT', 'TOOLS'],
        checkedAt: CHECKED_AT,
        reasonCode: null,
      });
      expect(received.map(({ method, path }) => `${method} ${path}`)).toEqual([
        'GET /api/tags',
        'POST /api/show',
        'POST /api/chat',
      ]);
      expect(received[1]?.body).toEqual({ model: MODEL, verbose: false });
      expect(received[2]?.body).toMatchObject({
        model: MODEL,
        stream: false,
        think: false,
        keep_alive: 0,
        format: { type: 'object', required: ['ready'], additionalProperties: false },
      });
      for (const request of received) {
        expect(request.headers['authorization']).toBeUndefined();
        expect(request.headers['proxy-authorization']).toBeUndefined();
      }
    } finally {
      vi.unstubAllEnvs();
      await fake.close();
    }
  });

  test('rechecks DNS before connecting and rejects a public rebinding without a request', async () => {
    const fake = await startFakeOllama((_request, response) => {
      writeJson(response, 500, { error: 'must not be reached' });
    });
    let resolution = 0;
    const provider = createOllamaAiProvider(
      createConfig(fake.origin.replace('127.0.0.1', 'ollama.internal')),
      {
        now: () => CHECKED_AT,
        resolveHost: async () => {
          resolution += 1;
          return resolution === 1
            ? [{ address: '127.0.0.1', family: 4 }]
            : [{ address: '203.0.113.40', family: 4 }];
        },
      },
    );

    try {
      await expect(provider.checkHealth()).resolves.toMatchObject({
        status: 'misconfigured',
        reasonCode: 'NON_PRIVATE_ADDRESS',
      });
      expect(fake.requestCount()).toBe(0);
    } finally {
      await fake.close();
    }
  });

  test('pins the startup private address set and rejects a different private destination', async () => {
    const fake = await startFakeOllama((_request, response) => {
      writeJson(response, 500, { error: 'must not be reached' });
    });
    let resolution = 0;
    const provider = createOllamaAiProvider(
      createConfig(fake.origin.replace('127.0.0.1', 'ollama.internal')),
      {
        now: () => CHECKED_AT,
        resolveHost: async () => {
          resolution += 1;
          return resolution === 1
            ? [{ address: '127.0.0.1', family: 4 }]
            : [{ address: '10.20.30.40', family: 4 }];
        },
      },
    );

    try {
      await expect(provider.checkHealth()).resolves.toMatchObject({
        status: 'misconfigured',
        reasonCode: 'ADDRESS_MISMATCH',
      });
      expect(fake.requestCount()).toBe(0);
    } finally {
      await fake.close();
    }
  });

  test('rejects redirects without following their public location', async () => {
    const fake = await startFakeOllama((_request, response) => {
      response.writeHead(302, { location: 'https://ollama.com/api/tags' });
      response.end();
    });
    const provider = createOllamaAiProvider(createConfig(fake.origin), {
      now: () => CHECKED_AT,
    });

    try {
      await expect(provider.checkHealth()).resolves.toMatchObject({
        status: 'misconfigured',
        reasonCode: 'REDIRECT_DENIED',
      });
      expect(fake.requestCount()).toBe(1);
    } finally {
      await fake.close();
    }
  });

  test.each([
    {
      name: 'digest drift',
      expectedReason: 'MODEL_DIGEST_MISMATCH',
      handler: (_request: IncomingMessage, response: ServerResponse) =>
        writeJson(response, 200, {
          models: [{ name: MODEL, model: MODEL, digest: 'b'.repeat(64) }],
        }),
    },
    {
      name: 'cloud model metadata',
      expectedReason: 'CLOUD_MODEL_DENIED',
      handler: (_request: IncomingMessage, response: ServerResponse) =>
        writeJson(response, 200, {
          models: [
            {
              name: MODEL,
              model: MODEL,
              digest: MODEL_DIGEST,
              remote_host: 'https://ollama.com',
            },
          ],
        }),
    },
    {
      name: 'missing tool capability',
      expectedReason: 'CAPABILITY_MISSING',
      handler: (request: IncomingMessage, response: ServerResponse) => {
        if (request.url === '/api/tags') {
          writeJson(response, 200, {
            models: [{ name: MODEL, model: MODEL, digest: MODEL_DIGEST }],
          });
          return;
        }
        writeJson(response, 200, { capabilities: ['completion'] });
      },
    },
  ])('reports $name through a safe misconfiguration code', async ({ expectedReason, handler }) => {
    const fake = await startFakeOllama((request, response) => handler(request, response));
    const provider = createOllamaAiProvider(createConfig(fake.origin), {
      now: () => CHECKED_AT,
    });
    try {
      await expect(provider.checkHealth()).resolves.toMatchObject({
        status: 'misconfigured',
        reasonCode: expectedReason,
        capabilities: [],
      });
    } finally {
      await fake.close();
    }
  });

  test('sends a bounded nonstreaming request and returns only content and tool calls', async () => {
    let receivedBody: unknown;
    const fake = await startFakeOllama(async (incoming, response, body) => {
      if (incoming.url !== '/api/chat' || readProperty(body, 'keep_alive') === 0) {
        respondWithHealthyOllama(incoming, response, body);
        return;
      }
      receivedBody = body;
      writeJson(response, 200, {
        model: MODEL,
        done: true,
        total_duration: 1234,
        message: {
          role: 'assistant',
          content: '',
          tool_calls: [
            {
              id: 'call-1',
              function: { name: 'employee_today_explanation', arguments: { date: '2026-08-27' } },
            },
          ],
        },
      });
    });
    const provider = createOllamaAiProvider(createConfig(fake.origin));
    const request: AiProviderRequest = {
      ...GENERATE_REQUEST,
      tools: [
        {
          name: 'employee_today_explanation',
          description: 'Return the authorized native Today explanation.',
          parameters: {
            type: 'object',
            properties: { date: { type: 'string' } },
            required: ['date'],
          },
        },
      ],
    };

    try {
      await expect(provider.checkHealth()).resolves.toMatchObject({ status: 'ready' });
      await expect(provider.generate(request)).resolves.toEqual({
        content: '',
        toolCalls: [
          {
            id: 'call-1',
            name: 'employee_today_explanation',
            arguments: { date: '2026-08-27' },
          },
        ],
      });
      expect(receivedBody).toMatchObject({
        model: MODEL,
        stream: false,
        think: false,
        options: { temperature: 0 },
        tools: [{ type: 'function' }],
      });
      expect(JSON.stringify(receivedBody)).not.toContain('digest');
    } finally {
      await fake.close();
    }
  });

  test('rejects returned reasoning content even when the response otherwise looks valid', async () => {
    const fake = await startFakeOllama((request, response, body) => {
      if (request.url !== '/api/chat' || readProperty(body, 'keep_alive') === 0) {
        respondWithHealthyOllama(request, response, body);
        return;
      }
      writeJson(response, 200, {
        model: MODEL,
        done: true,
        message: {
          role: 'assistant',
          content: '{"answer":"unsupported"}',
          thinking: 'private reasoning trace',
        },
      });
    });
    const provider = createOllamaAiProvider(createConfig(fake.origin));

    try {
      await expect(provider.checkHealth()).resolves.toMatchObject({ status: 'ready' });
      await expect(provider.generate(GENERATE_REQUEST)).rejects.toMatchObject({
        code: 'INVALID_RESPONSE',
      });
    } finally {
      await fake.close();
    }
  });

  test('enforces installation concurrency and caller cancellation without retrying', async () => {
    let receivedChat: (() => void) | undefined;
    const chatStarted = new Promise<void>((resolve) => {
      receivedChat = resolve;
    });
    const fake = await startFakeOllama((request, response, body) => {
      if (request.url === '/api/chat' && readProperty(body, 'keep_alive') !== 0) {
        receivedChat?.();
        return;
      }
      respondWithHealthyOllama(request, response, body);
    });
    const provider = createOllamaAiProvider({
      ...createConfig(fake.origin),
      concurrencyLimit: 1,
      timeoutMs: 5_000,
    });
    const controller = new AbortController();

    try {
      await expect(provider.checkHealth()).resolves.toMatchObject({ status: 'ready' });
      const firstRequest = provider.generate(GENERATE_REQUEST, { signal: controller.signal });
      await chatStarted;
      await expect(provider.generate(GENERATE_REQUEST)).rejects.toMatchObject({
        code: 'PROVIDER_BUSY',
      });
      controller.abort();
      await expect(firstRequest).rejects.toMatchObject({ code: 'CANCELLED' });
      expect(fake.requestCount()).toBe(5);
    } finally {
      controller.abort();
      await fake.close();
    }
  });

  test('rechecks the exact model digest before every generation call', async () => {
    let tagRequests = 0;
    const fake = await startFakeOllama((request, response, body) => {
      if (request.url === '/api/tags') {
        tagRequests += 1;
        writeJson(response, 200, {
          models: [
            {
              name: MODEL,
              model: MODEL,
              digest: tagRequests === 1 ? MODEL_DIGEST : 'b'.repeat(64),
            },
          ],
        });
        return;
      }
      respondWithHealthyOllama(request, response, body);
    });
    const provider = createOllamaAiProvider(createConfig(fake.origin));

    try {
      await expect(provider.checkHealth()).resolves.toMatchObject({ status: 'ready' });
      await expect(provider.generate(GENERATE_REQUEST)).rejects.toMatchObject({
        code: 'MODEL_DIGEST_MISMATCH',
      });
      expect(tagRequests).toBe(2);
    } finally {
      await fake.close();
    }
  });

  test('bounds provider health latency and reports timeout without throwing', async () => {
    const fake = await startFakeOllama(() => undefined);
    const provider = createOllamaAiProvider({
      ...createConfig(fake.origin),
      timeoutMs: 25,
    });

    try {
      await expect(provider.checkHealth()).resolves.toMatchObject({
        status: 'unavailable',
        reasonCode: 'TIMEOUT',
      });
      expect(fake.requestCount()).toBe(1);
    } finally {
      await fake.close();
    }
  });
});

function createConfig(origin: string): OllamaAiProviderConfig {
  return {
    mode: 'ollama',
    origin,
    model: MODEL,
    modelDigest: MODEL_DIGEST,
    timeoutMs: 1_000,
    concurrencyLimit: 2,
    requiredCapabilities: ['CHAT', 'STRUCTURED_OUTPUT', 'TOOLS'],
  };
}

interface ReceivedRequest {
  readonly method: string;
  readonly path: string;
  readonly headers: IncomingMessage['headers'];
  readonly body: unknown;
}

async function startFakeOllama(
  handler: (
    request: IncomingMessage,
    response: ServerResponse,
    body: unknown,
  ) => void | Promise<void>,
): Promise<{
  readonly origin: string;
  readonly requestCount: () => number;
  readonly close: () => Promise<void>;
}> {
  let requests = 0;
  const server = createServer(async (request, response) => {
    requests += 1;
    const body = await readRequestBody(request);
    await handler(request, response, body);
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (address === null || typeof address === 'string') {
    server.close();
    throw new Error('Fake Ollama server did not bind to an IP socket.');
  }

  return {
    origin: `http://127.0.0.1:${address.port}`,
    requestCount: () => requests,
    close: async () => {
      server.closeAllConnections();
      server.close();
      await once(server, 'close');
    },
  };
}

async function readRequestBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request)
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  if (chunks.length === 0) return undefined;
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
}

function respondWithHealthyOllama(
  request: IncomingMessage,
  response: ServerResponse,
  body: unknown,
): void {
  if (request.url === '/api/tags') {
    writeJson(response, 200, {
      models: [{ name: MODEL, model: MODEL, digest: MODEL_DIGEST }],
    });
    return;
  }
  if (request.url === '/api/show') {
    writeJson(response, 200, { capabilities: ['completion', 'tools'] });
    return;
  }
  writeJson(response, 200, {
    model: MODEL,
    done: true,
    message: {
      role: 'assistant',
      content: readProperty(body, 'keep_alive') === 0 ? '{"ready":true}' : '{"answer":"ok"}',
    },
  });
}

function readProperty(value: unknown, key: string): unknown {
  if (typeof value !== 'object' || value === null) return undefined;
  return Object.getOwnPropertyDescriptor(value, key)?.value;
}

function writeJson(response: ServerResponse, statusCode: number, body: unknown): void {
  response.writeHead(statusCode, { 'content-type': 'application/json' });
  response.end(JSON.stringify(body));
}

function createMockLogger(): WorkLedgerLogger {
  return {
    child: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    debug: vi.fn(),
    logRequest: vi.fn(),
    logDependencyCall: vi.fn(),
  };
}

test('provider errors never retain raw dependency text', () => {
  const error = new AiProviderError('CONNECTION_FAILED');
  expect(error.message).toBe('The AI provider request could not be completed.');
  expect(JSON.stringify(error)).not.toContain('ollama');
});
