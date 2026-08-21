import { createJsonResponse } from '@workledger/test-utils';

import { createRuntimeConfig } from '../src/config.js';
import { createApiServer } from '../src/server.js';

test('returns only generic health data without enabling CORS', async () => {
  const app = createApiServer(createRuntimeConfig({ WORKLEDGER_ENVIRONMENT: 'test' }));

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'https://untrusted.example.test' },
    });
    const json = createJsonResponse<{ status: 'ok' }>(response.statusCode, response.payload);

    expect(json).toEqual({ statusCode: 200, body: { status: 'ok' } });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  } finally {
    await app.close();
  }
});

test('serves only validated non-sensitive company identity without authentication', async () => {
  const secret = 'identity-route-secret-that-must-never-be-returned';
  const app = createApiServer(
    createRuntimeConfig({
      WORKLEDGER_AUTH_SECRET: secret,
      WORKLEDGER_ENVIRONMENT: 'test',
      WORKLEDGER_ORGANIZATION_ACCENT_COLOR: '#14532d',
      WORKLEDGER_ORGANIZATION_FAVICON_PATH: '/identity/northstar.svg',
      WORKLEDGER_ORGANIZATION_LOGO_PATH: '/identity/northstar.webp',
      WORKLEDGER_ORGANIZATION_NAME: 'Northstar Studio',
    }),
  );

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/identity',
      headers: { origin: 'https://untrusted.example.test' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('public, max-age=300');
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
    expect(response.json()).toMatchObject({
      data: {
        accentColor: '#14532d',
        faviconPath: '/identity/northstar.svg',
        logoPath: '/identity/northstar.webp',
        organizationName: 'Northstar Studio',
      },
      meta: { requestId: expect.any(String) },
    });
    expect(response.payload).not.toContain(secret);
  } finally {
    await app.close();
  }
});

test('reports not ready without a configured database and exposes no dependency detail', async () => {
  const app = createApiServer(createRuntimeConfig({ WORKLEDGER_ENVIRONMENT: 'test' }));

  try {
    const response = await app.inject({ method: 'GET', url: '/ready' });
    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ status: 'not_ready' });
    expect(response.headers['cache-control']).toBe('no-store');
  } finally {
    await app.close();
  }
});

test('uses forwarded protocol only when the immediate proxy address is configured', async () => {
  const app = createApiServer(
    createRuntimeConfig({
      WORKLEDGER_ENVIRONMENT: 'test',
      WORKLEDGER_TRUSTED_PROXY_ADDRESSES: '192.0.2.10',
    }),
  );
  app.get('/test/request-protocol', async (request) => ({ protocol: request.protocol }));

  try {
    const trustedResponse = await app.inject({
      method: 'GET',
      url: '/test/request-protocol',
      remoteAddress: '192.0.2.10',
      headers: { 'x-forwarded-proto': 'https' },
    });
    const untrustedResponse = await app.inject({
      method: 'GET',
      url: '/test/request-protocol',
      remoteAddress: '203.0.113.11',
      headers: { 'x-forwarded-proto': 'https' },
    });

    expect(trustedResponse.json()).toEqual({ protocol: 'https' });
    expect(untrustedResponse.json()).toEqual({ protocol: 'http' });
  } finally {
    await app.close();
  }
});
