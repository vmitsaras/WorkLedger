import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { RuntimeConfig } from './config.js';
import { createWorkLedgerAuthentication } from './auth/authentication.js';
import { registerAuthenticationRoutes } from './auth/fastify-auth.js';
import { createRequestId, registerHttpFoundation } from './http/foundation.js';
import { registerOpenApiRoute } from './http/openapi.js';

const HEALTH_RESPONSE_SCHEMA = z.strictObject({ status: z.literal('ok') });

export function createApiServer(config: RuntimeConfig): FastifyInstance {
  const app = Fastify({
    genReqId: createRequestId,
    logger: false,
    requestIdHeader: false,
    trustProxy: config.trustedProxyAddresses.length > 0 ? [...config.trustedProxyAddresses] : false,
  });

  registerHttpFoundation(app);

  app.after(() => {
    if (config.databaseUrl !== undefined && config.authSecret !== undefined) {
      const authentication = createWorkLedgerAuthentication({
        ...config,
        authSecret: config.authSecret,
        databaseUrl: config.databaseUrl,
      });
      registerAuthenticationRoutes(app, config, authentication);
      app.addHook('onClose', async () => authentication.close());
    }

    registerOpenApiRoute(app);

    app.withTypeProvider<ZodTypeProvider>().get(
      '/health',
      {
        schema: {
          description: 'Returns generic process health without dependency or deployment details.',
          operationId: 'getHealth',
          response: {
            200: HEALTH_RESPONSE_SCHEMA,
          },
          summary: 'Check API process health',
          tags: ['Operations'],
        },
      },
      async (_request, reply) => {
        reply.header('cache-control', 'no-store');
        return { status: 'ok' } as const;
      },
    );
  });

  return app;
}
