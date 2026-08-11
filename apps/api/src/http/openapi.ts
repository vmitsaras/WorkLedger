import type { FastifyInstance } from 'fastify';

export const WORKLEDGER_OPENAPI_PATH = '/openapi.json' as const;

export function registerOpenApiRoute(app: FastifyInstance): void {
  app.get(
    WORKLEDGER_OPENAPI_PATH,
    {
      schema: { hide: true },
    },
    async (_request, reply) => {
      reply.header('cache-control', 'no-store');
      reply.header('x-content-type-options', 'nosniff');
      return app.swagger();
    },
  );
}
