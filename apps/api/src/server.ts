import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { createWorkLedgerDatabase } from '@workledger/database';

import { registerAccountSelfServiceRoutes } from './account/routes.js';
import { registerAttendanceRoutes, type ApiClock } from './attendance/routes.js';
import { registerMyTimeRoutes } from './time/routes.js';
import { registerCorrectionRequestRoutes } from './corrections/routes.js';
import { registerCorrectionReviewRoutes } from './corrections/review-routes.js';
import { registerVacationRequestRoutes } from './absence/routes.js';
import type { RuntimeConfig } from './config.js';
import { createWorkLedgerAuthentication } from './auth/authentication.js';
import { registerAuthenticationRoutes } from './auth/fastify-auth.js';
import { createRequestId, registerHttpFoundation } from './http/foundation.js';
import { registerOpenApiRoute } from './http/openapi.js';
import { registerApprovalInboxRoutes } from './approvals/routes.js';
import { registerTeamStatusRoutes } from './team/routes.js';
import { registerNotificationRoutes } from './notifications/routes.js';
import { registerMonthlyPeriodRoutes } from './monthly/routes.js';
import { registerReportRoutes } from './reports/routes.js';
import { registerAdministrationRoutes } from './administration/routes.js';
import type { AccountInvitationSender } from './administration/service.js';
import {
  disabledNotificationDeliveryAdapter,
  type NotificationDeliveryAdapter,
} from './notifications/delivery.js';

const HEALTH_RESPONSE_SCHEMA = z.strictObject({ status: z.literal('ok') });

export function createApiServer(
  config: RuntimeConfig,
  dependencies: Readonly<{
    invitationSender?: AccountInvitationSender;
    notificationDelivery?: NotificationDeliveryAdapter;
    now?: ApiClock;
  }> = {},
): FastifyInstance {
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
      const database = createWorkLedgerDatabase({
        applicationName: 'workledger-api',
        connectionString: config.databaseUrl,
      });
      registerAuthenticationRoutes(app, config, authentication);
      registerAccountSelfServiceRoutes(app, config, authentication, database);
      registerAttendanceRoutes(app, config, authentication, database, dependencies.now);
      registerMyTimeRoutes(app, authentication, database, dependencies.now);
      registerCorrectionRequestRoutes(app, config, authentication, database, dependencies.now);
      registerCorrectionReviewRoutes(app, config, authentication, database, dependencies.now);
      registerApprovalInboxRoutes(
        app,
        config,
        authentication,
        database,
        dependencies.now,
        dependencies.notificationDelivery ?? disabledNotificationDeliveryAdapter,
      );
      registerNotificationRoutes(app, config, authentication, database, dependencies.now);
      registerMonthlyPeriodRoutes(
        app,
        config,
        authentication,
        database,
        dependencies.now,
        dependencies.notificationDelivery ?? disabledNotificationDeliveryAdapter,
      );
      registerReportRoutes(app, config, authentication, database, dependencies.now);
      registerTeamStatusRoutes(app, authentication, database, dependencies.now);
      registerVacationRequestRoutes(app, config, authentication, database, dependencies.now);
      registerAdministrationRoutes(
        app,
        config,
        authentication,
        database,
        dependencies.now,
        dependencies.invitationSender,
      );
      app.addHook('onClose', async () => {
        await Promise.all([authentication.close(), database.close()]);
      });
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
