import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import {
  apiErrorEnvelopeSchema,
  teamCalendarEnvelopeSchema,
  teamCalendarQuerySchema,
  teamStatusEnvelopeSchema,
} from '@workledger/contracts';
import { parseInstant } from '@workledger/domain';
import type { WorkLedgerDatabase } from '@workledger/database';

import type { WorkLedgerAuthentication } from '../auth/authentication.js';
import { requireRequestSession } from '../auth/request-session.js';
import { WorkLedgerApiError } from '../http/errors.js';
import { createTeamCalendarService, parseTeamCalendarIdentity } from './calendar-service.js';
import { createTeamStatusService, parseTeamStatusIdentity } from './status-service.js';

export function registerTeamStatusRoutes(
  app: FastifyInstance,
  authentication: WorkLedgerAuthentication,
  database: WorkLedgerDatabase,
  now: () => string = () => new Date().toISOString(),
): void {
  const api = app.withTypeProvider<ZodTypeProvider>();
  const calendarService = createTeamCalendarService(database);
  const service = createTeamStatusService(database);

  api.get(
    '/v1/team/calendar',
    {
      schema: {
        description:
          'Returns effective absence coverage for currently authorized employees in a requested month. Every entry uses the neutral UNAVAILABLE state. The response excludes employee and request identifiers, absence subtype, sickness classification, notes, reasons, entitlement, and reviewer history.',
        operationId: 'getTeamCalendar',
        querystring: teamCalendarQuerySchema,
        response: {
          200: teamCalendarEnvelopeSchema,
          401: apiErrorEnvelopeSchema,
          403: apiErrorEnvelopeSchema,
          422: apiErrorEnvelopeSchema,
          503: apiErrorEnvelopeSchema,
        },
        summary: 'Get privacy-safe team availability calendar',
        tags: ['Team'],
      },
    },
    async (request, reply) => {
      const { session } = await requireRequestSession(request, authentication, 'ACTIVE');
      const at = parseInstant(now());
      if (!at.ok) throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
      const data = await calendarService.list(
        parseTeamCalendarIdentity(session.userId),
        request.query,
        at.value,
      );
      reply.header('cache-control', 'private, no-store');
      return { data, meta: { requestId: request.id } };
    },
  );

  api.get(
    '/v1/team/status',
    {
      schema: {
        description:
          'Returns current authorized employee availability using neutral status labels. Current manager or HR scope is applied before results and summaries. The response excludes employee and request identifiers, absence subtype, sickness classification, notes, reasons, entitlement, and reviewer history.',
        operationId: 'getTeamStatus',
        response: {
          200: teamStatusEnvelopeSchema,
          401: apiErrorEnvelopeSchema,
          403: apiErrorEnvelopeSchema,
          503: apiErrorEnvelopeSchema,
        },
        summary: 'Get privacy-safe current team status',
        tags: ['Team'],
      },
    },
    async (request, reply) => {
      const { session } = await requireRequestSession(request, authentication, 'ACTIVE');
      const at = parseInstant(now());
      if (!at.ok) throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
      const data = await service.list(parseTeamStatusIdentity(session.userId), at.value);
      reply.header('cache-control', 'private, no-store');
      return { data, meta: { requestId: request.id } };
    },
  );
}
