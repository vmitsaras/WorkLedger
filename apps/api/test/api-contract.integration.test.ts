import { z } from 'zod';

import { apiErrorEnvelopeSchema, createSuccessEnvelopeSchema } from '@workledger/contracts';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import { WorkLedgerApiError } from '../src/http/errors.js';
import { createRuntimeConfig } from '../src/config.js';
import { createApiServer } from '../src/server.js';

const exampleBodySchema = z.strictObject({
  displayName: z.string().min(3).max(80),
});
const exampleSuccessSchema = createSuccessEnvelopeSchema(
  z.strictObject({ displayName: z.string() }),
);

test('validates requests with 422 field errors and never echoes unknown input', async () => {
  const app = createContractTestServer();

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/contract-example',
      payload: {
        displayName: 42,
        passwordSuperSecret: 'do-not-return-this-secret',
      },
    });

    expect(response.statusCode).toBe(422);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
    );
    expect(response.json()).toEqual({
      error: {
        code: 'VALIDATION_FAILED',
        fields: {
          $: [
            {
              code: 'UNKNOWN_FIELD',
              message: 'Remove fields that are not supported.',
            },
          ],
          displayName: [{ code: 'INVALID_TYPE', message: 'Use the required value type.' }],
        },
        message: 'Correct the highlighted fields and try again.',
        requestId: response.headers['x-request-id'],
      },
    });
    expect(response.payload).not.toContain('passwordSuperSecret');
    expect(response.payload).not.toContain('do-not-return-this-secret');
  } finally {
    await app.close();
  }
});

test('separates malformed JSON, not-found, safe application, and internal errors', async () => {
  const app = createContractTestServer();

  try {
    const malformed = await app.inject({
      method: 'POST',
      url: '/v1/contract-example',
      headers: { 'content-type': 'application/json' },
      payload: '{"password":"do-not-return-this-secret"',
    });
    expect(malformed.statusCode).toBe(400);
    expect(malformed.json()).toMatchObject({
      error: { code: 'MALFORMED_REQUEST', message: 'The request body is not valid JSON.' },
    });
    expect(malformed.payload).not.toContain('do-not-return-this-secret');

    const notFound = await app.inject({ method: 'GET', url: '/v1/missing?token=secret' });
    expect(notFound.statusCode).toBe(404);
    expect(notFound.json()).toMatchObject({ error: { code: 'ROUTE_NOT_FOUND' } });
    expect(notFound.payload).not.toContain('token');
    expect(notFound.payload).not.toContain('secret');

    const conflict = await app.inject({ method: 'POST', url: '/v1/safe-conflict' });
    expect(conflict.statusCode).toBe(409);
    expect(conflict.json()).toMatchObject({
      error: {
        code: 'RECORD_VERSION_CONFLICT',
        context: { currentVersion: 3 },
      },
      meta: { idempotentReplay: false },
    });

    const internal = await app.inject({ method: 'GET', url: '/v1/internal-failure' });
    expect(internal.statusCode).toBe(500);
    expect(internal.json()).toMatchObject({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'The request could not be completed. Try again later.',
      },
    });
    expect(internal.payload).not.toContain('database-password');
    expect(internal.payload).not.toContain('response-secret');

    const serialization = await app.inject({
      method: 'GET',
      url: '/v1/response-serialization-failure',
    });
    expect(serialization.statusCode).toBe(500);
    expect(serialization.json()).toMatchObject({ error: { code: 'INTERNAL_ERROR' } });
    expect(serialization.payload).not.toContain('serialized-secret');

    const invalidSafeError = await app.inject({
      method: 'GET',
      url: '/v1/invalid-safe-error',
    });
    expect(invalidSafeError.statusCode).toBe(500);
    expect(invalidSafeError.json()).toMatchObject({ error: { code: 'INTERNAL_ERROR' } });
    expect(invalidSafeError.payload).not.toContain('context-secret');
  } finally {
    await app.close();
  }
});

test('generates fresh server-owned request IDs and stable OpenAPI 3.1', async () => {
  const app = createContractTestServer();

  try {
    await app.ready();
    const response = await app.inject({
      method: 'POST',
      url: '/v1/contract-example',
      headers: { 'x-request-id': 'attacker-controlled-request-id' },
      payload: { displayName: 'Ada Example' },
    });
    const body = exampleSuccessSchema.parse(response.json());

    expect(response.statusCode).toBe(200);
    expect(body.meta.requestId).toBe(response.headers['x-request-id']);
    expect(body.meta.requestId).not.toBe('attacker-controlled-request-id');

    const document = app.swagger();
    expect(document).toMatchObject({
      info: { title: 'WorkLedger API', version: '1.0.0' },
      openapi: '3.1.0',
    });
    expect(document.paths).toHaveProperty('/v1/contract-example');
    expect(document.paths).not.toHaveProperty('/openapi.json');

    const openApiResponse = await app.inject({
      method: 'GET',
      url: '/openapi.json',
      headers: { origin: 'https://untrusted.example.test' },
    });
    expect(openApiResponse.statusCode).toBe(200);
    expect(openApiResponse.headers['cache-control']).toBe('no-store');
    expect(openApiResponse.headers['content-type']).toMatch(/^application\/json/u);
    expect(openApiResponse.headers['x-content-type-options']).toBe('nosniff');
    expect(openApiResponse.headers['access-control-allow-origin']).toBeUndefined();
    expect(openApiResponse.json()).toEqual(document);
  } finally {
    await app.close();
  }
});

test('keeps authentication internals and runtime secrets out of OpenAPI', async () => {
  const databaseUrl =
    'postgres://openapi-user:openapi-password@127.0.0.1:54329/workledger-openapi-test';
  const authSecret = 'openapi-auth-secret-with-32-safe-bytes';
  const app = createApiServer(
    createRuntimeConfig({
      WORKLEDGER_AUTH_SECRET: authSecret,
      WORKLEDGER_DATABASE_URL: databaseUrl,
      WORKLEDGER_ENVIRONMENT: 'test',
    }),
  );

  try {
    await app.ready();
    const serializedDocument = JSON.stringify(app.swagger());

    expect(serializedDocument).not.toContain('/api/auth');
    expect(serializedDocument).not.toContain('openapi-password');
    expect(serializedDocument).not.toContain(authSecret);
  } finally {
    await app.close();
  }
});

function createContractTestServer() {
  const app = createApiServer(createRuntimeConfig({ WORKLEDGER_ENVIRONMENT: 'test' }));
  app.after(() => {
    const api = app.withTypeProvider<ZodTypeProvider>();

    api.post(
      '/v1/contract-example',
      {
        schema: {
          body: exampleBodySchema,
          response: {
            200: exampleSuccessSchema,
            422: apiErrorEnvelopeSchema,
          },
        },
      },
      async (request) => ({
        data: request.body,
        meta: { requestId: request.id },
      }),
    );

    api.post('/v1/safe-conflict', async () => {
      throw new WorkLedgerApiError({
        code: 'RECORD_VERSION_CONFLICT',
        context: { currentVersion: 3 },
        idempotentReplay: false,
        statusCode: 409,
      });
    });

    api.get(
      '/v1/internal-failure',
      {
        schema: {
          response: {
            500: apiErrorEnvelopeSchema,
          },
        },
      },
      async () => {
        throw new Error('response-secret database-password');
      },
    );

    api.get(
      '/v1/response-serialization-failure',
      {
        schema: {
          response: {
            200: z.strictObject({ visible: z.string() }),
            500: apiErrorEnvelopeSchema,
          },
        },
      },
      async () => ({ visible: 'safe', databasePassword: 'serialized-secret' }),
    );

    api.get('/v1/invalid-safe-error', async () => {
      throw new WorkLedgerApiError({
        code: 'RECORD_VERSION_CONFLICT',
        context: { invalidContext: `context-secret-${'x'.repeat(300)}` },
        statusCode: 409,
      });
    });
  });

  return app;
}
