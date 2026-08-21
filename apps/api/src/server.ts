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
import { registerTimeAdministrationRoutes } from './time-administration/routes.js';
import { registerAbsenceAdministrationRoutes } from './absence-administration/routes.js';
import { registerDomainAuditRoutes } from './audit/routes.js';
import { registerSystemOperationsRoutes } from './system/operations-routes.js';
import { registerRetentionRoutes } from './retention/routes.js';
import {
  disabledNotificationDeliveryAdapter,
  type NotificationDeliveryAdapter,
} from './notifications/delivery.js';
import { createWorkLedgerLogger, type WorkLedgerLogger } from './logging/logger.js';
import { registerCompanyIdentityRoutes } from './identity/routes.js';
import { WORKLEDGER_VERSION } from './version.js';

const HEALTH_RESPONSE_SCHEMA = z.strictObject({ status: z.literal('ok') });
const READY_RESPONSE_SCHEMA = z.strictObject({ status: z.enum(['ready', 'not_ready']) });

export function createApiServer(
  config: RuntimeConfig,
  dependencies: Readonly<{
    invitationSender?: AccountInvitationSender;
    notificationDelivery?: NotificationDeliveryAdapter;
    now?: ApiClock;
    logger?: WorkLedgerLogger;
  }> = {},
): FastifyInstance {
  const logger =
    dependencies.logger ??
    createWorkLedgerLogger({
      environment: config.environment,
      service: 'workledger-api',
      version: WORKLEDGER_VERSION,
    });

  const app = Fastify({
    genReqId: createRequestId,
    logger: false,
    requestIdHeader: false,
    trustProxy: config.trustedProxyAddresses.length > 0 ? [...config.trustedProxyAddresses] : false,
  });

  registerHttpFoundation(app);

  app.addHook('onResponse', async (request, reply) => {
    const latencyMs = reply.elapsedTime;
    logger.logRequest(request, reply, latencyMs);
  });

  app.after(() => {
    let readinessCheck: (() => Promise<boolean>) | undefined;
    registerCompanyIdentityRoutes(app, config);
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
      readinessCheck = () => database.isReady();
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
      registerTimeAdministrationRoutes(app, config, authentication, database, dependencies.now);
      registerAbsenceAdministrationRoutes(app, config, authentication, database, dependencies.now);
      registerDomainAuditRoutes(app, authentication, database, dependencies.now);
      registerRetentionRoutes(app, config, authentication, database, dependencies.now);
      registerSystemOperationsRoutes(
        app,
        config,
        authentication,
        database,
        logger,
        dependencies.now,
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

    app.withTypeProvider<ZodTypeProvider>().get(
      '/ready',
      {
        schema: {
          description: 'Checks that the database is reachable and the expected schema is present.',
          operationId: 'getReadiness',
          response: { 200: READY_RESPONSE_SCHEMA, 503: READY_RESPONSE_SCHEMA },
          summary: 'Check API readiness',
          tags: ['Operations'],
        },
      },
      async (_request, reply) => {
        reply.header('cache-control', 'no-store');
        try {
          if (readinessCheck && (await readinessCheck())) return { status: 'ready' } as const;
        } catch {
          // Keep dependency details out of the public readiness response.
        }
        return reply.code(503).send({ status: 'not_ready' } as const);
      },
    );
  });

  return app;
}
