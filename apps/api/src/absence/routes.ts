import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import {
  apiErrorEnvelopeSchema,
  acknowledgeSicknessReportSchema,
  acknowledgedSicknessReportEnvelopeSchema,
  submittedSicknessReportEnvelopeSchema,
  submittedVacationRequestEnvelopeSchema,
  personalCalendarEnvelopeSchema,
  personalCalendarQuerySchema,
  submitSicknessReportSchema,
  submitVacationRequestSchema,
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
  createVacationRequestService,
  parseVacationRequestIdentity,
} from './vacation-request-service.js';
import {
  createSicknessReportService,
  parseSicknessReportIdentity,
} from './sickness-report-service.js';
import {
  createPersonalCalendarService,
  parsePersonalCalendarIdentity,
} from './personal-calendar-service.js';

export function registerVacationRequestRoutes(
  app: FastifyInstance,
  config: RuntimeConfig,
  authentication: WorkLedgerAuthentication,
  database: WorkLedgerDatabase,
  now: () => string = () => new Date().toISOString(),
): void {
  const api = app.withTypeProvider<ZodTypeProvider>();
  const service = createVacationRequestService(database);
  const sicknessService = createSicknessReportService(database);
  const personalCalendarService = createPersonalCalendarService(database);
  api.get(
    '/v1/me/calendar',
    {
      schema: {
        description:
          'Returns the current employee’s personal public holidays and active absence coverage for one organization-local month. It never returns team availability or another employee’s data.',
        operationId: 'getPersonalCalendar',
        querystring: personalCalendarQuerySchema,
        response: {
          200: personalCalendarEnvelopeSchema,
          401: apiErrorEnvelopeSchema,
          403: apiErrorEnvelopeSchema,
          422: apiErrorEnvelopeSchema,
          503: apiErrorEnvelopeSchema,
        },
        summary: 'Get personal calendar',
        tags: ['Absence requests'],
      },
    },
    async (request, reply) => {
      const { session } = await requireRequestSession(request, authentication, 'ACTIVE');
      const at = parseInstant(now());
      if (!at.ok) throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
      const data = await personalCalendarService.get(
        parsePersonalCalendarIdentity(session.userId, session.fresh),
        request.query,
        at.value,
      );
      reply.header('cache-control', 'private, no-store');
      return { data, meta: { requestId: request.id } };
    },
  );
  api.post(
    '/v1/me/vacation-requests',
    {
      schema: {
        body: submitVacationRequestSchema,
        description:
          'Submits a full-day, schedule-half, or exact-minute employee vacation request. Every local date remains visible; public holidays and zero-hour dates consume zero entitlement. Pending approval reserves the calculated entitlement but does not change daily time calculations.',
        operationId: 'submitEmployeeVacationRequest',
        response: {
          201: submittedVacationRequestEnvelopeSchema,
          401: apiErrorEnvelopeSchema,
          403: apiErrorEnvelopeSchema,
          422: apiErrorEnvelopeSchema,
          503: apiErrorEnvelopeSchema,
        },
        summary: 'Submit a vacation request',
        tags: ['Absence requests'],
      },
    },
    async (request, reply) => {
      requireSameOrigin(request, config.canonicalOrigin);
      const { headers, session } = await requireRequestSession(request, authentication, 'ACTIVE');
      await requireRequestCsrf(request, authentication, headers);
      const at = parseInstant(now());
      if (!at.ok) throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
      const data = await service.submit(
        parseVacationRequestIdentity(session.userId, session.fresh),
        request.body,
        at.value,
      );
      reply.code(201).header('cache-control', 'private, no-store');
      return { data, meta: { requestId: request.id } };
    },
  );
  api.post(
    '/v1/me/sickness-reports',
    {
      schema: {
        body: submitSicknessReportSchema,
        description:
          'Reports full-day, schedule-half, or exact-minute sickness absence without accepting a note, diagnosis, attachment, or medical detail. Reporting creates the effective absence once; it awaits acknowledgement only.',
        operationId: 'reportEmployeeSickness',
        response: {
          201: submittedSicknessReportEnvelopeSchema,
          401: apiErrorEnvelopeSchema,
          403: apiErrorEnvelopeSchema,
          422: apiErrorEnvelopeSchema,
          503: apiErrorEnvelopeSchema,
        },
        summary: 'Report sickness absence',
        tags: ['Absence requests'],
      },
    },
    async (request, reply) => {
      requireSameOrigin(request, config.canonicalOrigin);
      const { headers, session } = await requireRequestSession(request, authentication, 'ACTIVE');
      await requireRequestCsrf(request, authentication, headers);
      const at = parseInstant(now());
      if (!at.ok) throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
      const data = await sicknessService.report(
        parseSicknessReportIdentity(session.userId, session.fresh),
        request.body,
        at.value,
      );
      reply.code(201).header('cache-control', 'private, no-store');
      return { data, meta: { requestId: request.id } };
    },
  );
  api.post(
    '/v1/manager/sickness-reports/:requestId/acknowledge',
    {
      schema: {
        body: acknowledgeSicknessReportSchema,
        description:
          'Records a current eligible manager or HR acknowledgement of a sickness report. The acknowledgement adds no second absence, calculation, or entitlement effect.',
        operationId: 'acknowledgeSicknessReport',
        params: z.strictObject({ requestId: z.uuid() }),
        response: {
          200: acknowledgedSicknessReportEnvelopeSchema,
          401: apiErrorEnvelopeSchema,
          403: apiErrorEnvelopeSchema,
          404: apiErrorEnvelopeSchema,
          409: apiErrorEnvelopeSchema,
          422: apiErrorEnvelopeSchema,
          503: apiErrorEnvelopeSchema,
        },
        summary: 'Acknowledge sickness report',
        tags: ['Absence requests'],
      },
    },
    async (request, reply) => {
      requireSameOrigin(request, config.canonicalOrigin);
      const { headers, session } = await requireRequestSession(request, authentication, 'ACTIVE');
      await requireRequestCsrf(request, authentication, headers);
      const at = parseInstant(now());
      if (!at.ok) throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
      const data = await sicknessService.acknowledge(
        parseSicknessReportIdentity(session.userId, session.fresh),
        request.params.requestId,
        request.body,
        at.value,
      );
      reply.header('cache-control', 'private, no-store');
      return { data, meta: { requestId: request.id } };
    },
  );
}
