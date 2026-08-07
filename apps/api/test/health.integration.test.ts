import Fastify from 'fastify';

import { createJsonResponse } from '@workledger/test-utils';

test('exercises the Fastify integration harness with serialized JSON', async () => {
  const app = Fastify({ logger: false });

  app.get(
    '/health',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            required: ['status'],
            additionalProperties: false,
            properties: {
              status: { type: 'string', enum: ['ok'] },
            },
          },
        },
      },
    },
    async () => ({ status: 'ok' }),
  );

  const response = await app.inject({ method: 'GET', url: '/health' });
  const json = createJsonResponse<{ status: 'ok' }>(response.statusCode, response.payload);

  expect(json).toEqual({ statusCode: 200, body: { status: 'ok' } });
});
