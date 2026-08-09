import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';

import type { RuntimeConfig } from './config.js';

const HEALTH_RESPONSE_SCHEMA = {
  type: 'object',
  required: ['status'],
  additionalProperties: false,
  properties: {
    status: { type: 'string', enum: ['ok'] },
  },
} as const;

export function createApiServer(config: RuntimeConfig): FastifyInstance {
  const app = Fastify({
    logger: false,
    trustProxy: config.trustedProxyAddresses.length > 0 ? [...config.trustedProxyAddresses] : false,
  });

  app.get(
    '/health',
    {
      schema: {
        response: {
          200: HEALTH_RESPONSE_SCHEMA,
        },
      },
    },
    async (_request, reply) => {
      reply.header('cache-control', 'no-store');
      return { status: 'ok' };
    },
  );

  return app;
}
