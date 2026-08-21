import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import { companyIdentityEnvelopeSchema } from '@workledger/contracts';

import type { RuntimeConfig } from '../config.js';

export function registerCompanyIdentityRoutes(app: FastifyInstance, config: RuntimeConfig): void {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/v1/identity',
    {
      schema: {
        description:
          'Returns the bounded, non-sensitive company identity used on public and authenticated WorkLedger surfaces.',
        operationId: 'getCompanyIdentity',
        response: { 200: companyIdentityEnvelopeSchema },
        summary: 'Get company identity',
        tags: ['Identity'],
      },
    },
    async (request, reply) => {
      reply.header('cache-control', 'public, max-age=300');
      return { data: config.companyIdentity, meta: { requestId: request.id } };
    },
  );
}
