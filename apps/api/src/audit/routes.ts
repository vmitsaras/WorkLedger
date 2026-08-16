import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import {
  apiErrorEnvelopeSchema,
  domainAuditPageEnvelopeSchema,
  domainAuditQuerySchema,
} from '@workledger/contracts';
import type { Instant } from '@workledger/domain';
import type { WorkLedgerDatabase } from '@workledger/database';

import {
  parseAdministrationIdentity,
  parseAdministrationInstant,
} from '../administration/service.js';
import type { WorkLedgerAuthentication } from '../auth/authentication.js';
import { requireRequestSession } from '../auth/request-session.js';
import { createAuditService } from './service.js';

export function registerDomainAuditRoutes(
  app: FastifyInstance,
  authentication: WorkLedgerAuthentication,
  database: WorkLedgerDatabase,
  now: () => string = () => new Date().toISOString(),
): void {
  const api = app.withTypeProvider<ZodTypeProvider>();
  const service = createAuditService(database);
  api.get(
    '/v1/hr/domain-audit',
    {
      schema: {
        operationId: 'listDomainAuditForAdministration',
        querystring: domainAuditQuerySchema,
        response: {
          200: domainAuditPageEnvelopeSchema,
          401: apiErrorEnvelopeSchema,
          403: apiErrorEnvelopeSchema,
          422: apiErrorEnvelopeSchema,
          503: apiErrorEnvelopeSchema,
        },
        summary: 'List redacted domain audit evidence',
        tags: ['Domain audit'],
      },
    },
    async (request, reply) => {
      const data = await service.listDomain(
        await identity(request, authentication),
        request.query,
        instant(now),
      );
      reply.header('cache-control', 'private, no-store');
      return { data, meta: { requestId: request.id } };
    },
  );
}

async function identity(request: FastifyRequest, authentication: WorkLedgerAuthentication) {
  const { session } = await requireRequestSession(request, authentication, 'ACTIVE');
  return parseAdministrationIdentity(session.userId, session.fresh);
}

function instant(now: () => string): Instant {
  return parseAdministrationInstant(now());
}
