import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';

import type { RuntimeConfig } from './config.js';
import { createWorkLedgerAuthentication } from './auth/authentication.js';
import { registerAuthenticationRoutes } from './auth/fastify-auth.js';

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

  if (config.databaseUrl !== undefined && config.authSecret !== undefined) {
    const authentication = createWorkLedgerAuthentication({
      ...config,
      authSecret: config.authSecret,
      databaseUrl: config.databaseUrl,
    });
    registerAuthenticationRoutes(app, config, authentication);
    app.addHook('onClose', async () => authentication.close());
  }

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
