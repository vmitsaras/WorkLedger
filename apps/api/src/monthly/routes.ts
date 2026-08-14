import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import {
  apiErrorEnvelopeSchema,
  monthlyPeriodEnvelopeSchema,
  monthlyPeriodSubmissionRequestSchema,
} from '@workledger/contracts';
import { parseInstant } from '@workledger/domain';
import type { WorkLedgerDatabase } from '@workledger/database';

import type { WorkLedgerAuthentication } from '../auth/authentication.js';
import {
  requireRequestCsrf,
  requireRequestSession,
  requireSameOrigin,
} from '../auth/request-session.js';
import type { RuntimeConfig } from '../config.js';
import { WorkLedgerApiError } from '../http/errors.js';
import {
  createMonthlyPeriodService,
  parseMonthlyPeriodId,
  parseMonthlyPeriodIdentity,
} from './monthly-period-service.js';

export function registerMonthlyPeriodRoutes(
  app: FastifyInstance,
  config: RuntimeConfig,
  authentication: WorkLedgerAuthentication,
  database: WorkLedgerDatabase,
  now: () => string = () => new Date().toISOString(),
): void {
  const api = app.withTypeProvider<ZodTypeProvider>();
  const service = createMonthlyPeriodService(database);

  api.get(
    '/v1/monthly-periods/:periodId',
    {
      schema: {
        description:
          'Returns one currently authorized monthly period with purpose-minimized workflow state, derived readiness, per-date final amounts, warnings, blockers, reconciled ledger totals, and source-fingerprinted snapshot schema version. It excludes absence classification, reasons, entitlement, and protected source identifiers.',
        operationId: 'getMonthlyPeriod',
        params: z.strictObject({ periodId: z.string().min(1).max(128) }),
        response: {
          200: monthlyPeriodEnvelopeSchema,
          401: apiErrorEnvelopeSchema,
          403: apiErrorEnvelopeSchema,
          404: apiErrorEnvelopeSchema,
          503: apiErrorEnvelopeSchema,
        },
        summary: 'Get a monthly period review projection',
        tags: ['Monthly periods'],
      },
    },
    async (request, reply) => {
      const { session } = await requireRequestSession(request, authentication, 'ACTIVE');
      const instant = parseInstant(now());
      if (!instant.ok) throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
      const data = await service.get(
        parseMonthlyPeriodIdentity(session.userId, session.fresh),
        parseMonthlyPeriodId(request.params.periodId),
        instant.value,
      );
      reply.header('cache-control', 'private, no-store');
      return { data, meta: { requestId: request.id } };
    },
  );

  api.post(
    '/v1/monthly-periods/:periodId/submit',
    {
      schema: {
        body: monthlyPeriodSubmissionRequestSchema,
        description:
          'Submits one employee-owned ready monthly period from the exact reviewed source fingerprint and expected workflow version. The transition records submission evidence and creates no approval snapshot.',
        operationId: 'submitMonthlyPeriod',
        params: z.strictObject({ periodId: z.string().min(1).max(128) }),
        response: {
          200: monthlyPeriodEnvelopeSchema,
          401: apiErrorEnvelopeSchema,
          403: apiErrorEnvelopeSchema,
          404: apiErrorEnvelopeSchema,
          409: apiErrorEnvelopeSchema,
          422: apiErrorEnvelopeSchema,
          503: apiErrorEnvelopeSchema,
        },
        summary: 'Submit an employee monthly period',
        tags: ['Monthly periods'],
      },
    },
    async (request, reply) => {
      requireSameOrigin(request, config.canonicalOrigin);
      const { headers, session } = await requireRequestSession(request, authentication, 'ACTIVE');
      await requireRequestCsrf(request, authentication, headers);
      const instant = parseInstant(now());
      if (!instant.ok) throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
      const data = await service.submit(
        parseMonthlyPeriodIdentity(session.userId, session.fresh),
        parseMonthlyPeriodId(request.params.periodId),
        request.body,
        instant.value,
      );
      reply.header('cache-control', 'private, no-store');
      return { data, meta: { requestId: request.id } };
    },
  );
}
