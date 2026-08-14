import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import {
  apiErrorEnvelopeSchema,
  approvalDecisionEnvelopeSchema,
  approvalDecisionRequestSchema,
  approvalDetailEnvelopeSchema,
  approvalInboxEnvelopeSchema,
  approvalInboxQuerySchema,
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
import { createApprovalDetailService, parseApprovalDetailIdentity } from './detail-service.js';
import { createApprovalInboxService, parseApprovalInboxIdentity } from './inbox-service.js';
import {
  disabledNotificationDeliveryAdapter,
  type NotificationDeliveryAdapter,
} from '../notifications/delivery.js';

export function registerApprovalInboxRoutes(
  app: FastifyInstance,
  config: RuntimeConfig,
  authentication: WorkLedgerAuthentication,
  database: WorkLedgerDatabase,
  now: () => string = () => new Date().toISOString(),
  notificationDelivery: NotificationDeliveryAdapter = disabledNotificationDeliveryAdapter,
): void {
  const api = app.withTypeProvider<ZodTypeProvider>();
  const service = createApprovalInboxService(database);
  const detailService = createApprovalDetailService(database, notificationDelivery);

  api.get(
    '/v1/approvals',
    {
      schema: {
        description:
          'Returns one purpose-minimized, current-scope approval inbox. Authorization and self-exclusion are applied before broad workflow-category, generic status, current-team, affected-date, sort, count, and pagination operations. Absence subtype, sickness classification, reasons, entitlement values, and source records are excluded.',
        operationId: 'getApprovalInbox',
        querystring: approvalInboxQuerySchema,
        response: {
          200: approvalInboxEnvelopeSchema,
          401: apiErrorEnvelopeSchema,
          403: apiErrorEnvelopeSchema,
          422: apiErrorEnvelopeSchema,
          503: apiErrorEnvelopeSchema,
        },
        summary: 'Get the scoped approval inbox',
        tags: ['Approvals'],
      },
    },
    async (request, reply) => {
      const { session } = await requireRequestSession(request, authentication, 'ACTIVE');
      const at = parseInstant(now());
      if (!at.ok) {
        throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
      }
      const data = await service.list(
        parseApprovalInboxIdentity(session.userId),
        request.query,
        at.value,
      );
      reply.header('cache-control', 'private, no-store');
      return { data, meta: { requestId: request.id } };
    },
  );

  api.get(
    '/v1/approvals/:approvalId',
    {
      schema: {
        operationId: 'getApprovalDetail',
        params: z.strictObject({ approvalId: z.string().uuid() }),
        response: {
          200: approvalDetailEnvelopeSchema,
          401: apiErrorEnvelopeSchema,
          403: apiErrorEnvelopeSchema,
          404: apiErrorEnvelopeSchema,
          503: apiErrorEnvelopeSchema,
        },
        summary: 'Get one authorized approval detail',
        tags: ['Approvals'],
      },
    },
    async (request, reply) => {
      const { session } = await requireRequestSession(request, authentication, 'ACTIVE');
      const data = await detailService.get(
        parseApprovalDetailIdentity(session.userId, session.fresh),
        request.params.approvalId,
        requireInstant(now()),
      );
      reply.header('cache-control', 'private, no-store');
      return { data, meta: { requestId: request.id } };
    },
  );

  api.post(
    '/v1/approvals/:approvalId/decision',
    {
      schema: {
        body: approvalDecisionRequestSchema,
        operationId: 'decideApproval',
        params: z.strictObject({ approvalId: z.string().uuid() }),
        response: {
          200: approvalDecisionEnvelopeSchema,
          401: apiErrorEnvelopeSchema,
          403: apiErrorEnvelopeSchema,
          404: apiErrorEnvelopeSchema,
          409: apiErrorEnvelopeSchema,
          422: apiErrorEnvelopeSchema,
          503: apiErrorEnvelopeSchema,
        },
        summary: 'Record one authorized approval decision',
        tags: ['Approvals'],
      },
    },
    async (request, reply) => {
      requireSameOrigin(request, config.canonicalOrigin);
      const { headers, session } = await requireRequestSession(request, authentication, 'ACTIVE');
      await requireRequestCsrf(request, authentication, headers);
      const data = await detailService.decide(
        parseApprovalDetailIdentity(session.userId, session.fresh),
        request.params.approvalId,
        request.body,
        requireInstant(now()),
      );
      reply.header('cache-control', 'private, no-store');
      return { data, meta: { requestId: request.id } };
    },
  );
}

function requireInstant(value: string) {
  const parsed = parseInstant(value);
  if (!parsed.ok) throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
  return parsed.value;
}
