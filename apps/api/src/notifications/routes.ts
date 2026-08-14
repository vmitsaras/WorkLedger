import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import {
  apiErrorEnvelopeSchema,
  dismissedNotificationEnvelopeSchema,
  notificationHistoryEnvelopeSchema,
  notificationQuerySchema,
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
import { createNotificationService, parseNotificationIdentity } from './service.js';

export function registerNotificationRoutes(
  app: FastifyInstance,
  config: RuntimeConfig,
  authentication: WorkLedgerAuthentication,
  database: WorkLedgerDatabase,
  now: () => string = () => new Date().toISOString(),
): void {
  const api = app.withTypeProvider<ZodTypeProvider>();
  const service = createNotificationService(database);

  api.get(
    '/v1/me/notifications',
    {
      schema: {
        description:
          'Returns the authenticated actor’s generic in-app notification history. Copy and links omit absence subtype, sickness classification, reasons, notes, entitlement, reviewer context, and source identifiers.',
        operationId: 'getNotificationHistory',
        querystring: notificationQuerySchema,
        response: {
          200: notificationHistoryEnvelopeSchema,
          401: apiErrorEnvelopeSchema,
          422: apiErrorEnvelopeSchema,
          503: apiErrorEnvelopeSchema,
        },
        summary: 'Get own generic notification history',
        tags: ['Notifications'],
      },
    },
    async (request, reply) => {
      const { session } = await requireRequestSession(request, authentication, 'ACTIVE');
      const data = await service.list(
        parseNotificationIdentity(session.userId),
        request.query,
        requireInstant(now()),
      );
      reply.header('cache-control', 'private, no-store');
      return { data, meta: { requestId: request.id } };
    },
  );

  api.post(
    '/v1/me/notifications/:notificationId/dismiss',
    {
      schema: {
        operationId: 'dismissNotification',
        params: z.strictObject({ notificationId: z.uuid() }),
        response: {
          200: dismissedNotificationEnvelopeSchema,
          401: apiErrorEnvelopeSchema,
          403: apiErrorEnvelopeSchema,
          404: apiErrorEnvelopeSchema,
          503: apiErrorEnvelopeSchema,
        },
        summary: 'Dismiss one own notification without deleting history',
        tags: ['Notifications'],
      },
    },
    async (request, reply) => {
      requireSameOrigin(request, config.canonicalOrigin);
      const { headers, session } = await requireRequestSession(request, authentication, 'ACTIVE');
      await requireRequestCsrf(request, authentication, headers);
      const data = await service.dismiss(
        parseNotificationIdentity(session.userId),
        request.params.notificationId,
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
