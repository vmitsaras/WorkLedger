import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import {
  absenceAdministrationActionEnvelopeSchema,
  absenceSettingsAdminDetailEnvelopeSchema,
  apiErrorEnvelopeSchema,
  createAbsenceTypeVersionAdminRequestSchema,
  createEntitlementAdjustmentAdminRequestSchema,
  employeeEntitlementAdminDetailEnvelopeSchema,
} from '@workledger/contracts';
import type { DomainId, Instant } from '@workledger/domain';
import type { WorkLedgerDatabase } from '@workledger/database';

import {
  parseAdministrationId,
  parseAdministrationIdentity,
  parseAdministrationInstant,
} from '../administration/service.js';
import type { WorkLedgerAuthentication } from '../auth/authentication.js';
import {
  requireRequestCsrf,
  requireRequestSession,
  requireSameOrigin,
} from '../auth/request-session.js';
import type { RuntimeConfig } from '../config.js';
import {
  createAbsenceAdministrationService,
  type AbsenceAdministrationIdentity,
} from './service.js';

const employeeParamsSchema = z.strictObject({ employeeId: z.string().min(1).max(128) });
const READ_ERRORS = {
  401: apiErrorEnvelopeSchema,
  403: apiErrorEnvelopeSchema,
  404: apiErrorEnvelopeSchema,
  422: apiErrorEnvelopeSchema,
  503: apiErrorEnvelopeSchema,
} as const;
const MUTATION_ERRORS = { ...READ_ERRORS, 409: apiErrorEnvelopeSchema } as const;

export function registerAbsenceAdministrationRoutes(
  app: FastifyInstance,
  config: RuntimeConfig,
  authentication: WorkLedgerAuthentication,
  database: WorkLedgerDatabase,
  now: () => string = () => new Date().toISOString(),
): void {
  const api = app.withTypeProvider<ZodTypeProvider>();
  const service = createAbsenceAdministrationService(database);
  api.get(
    '/v1/hr/absence-settings',
    {
      schema: {
        operationId: 'getAbsenceSettingsForAdministration',
        response: { 200: absenceSettingsAdminDetailEnvelopeSchema, ...READ_ERRORS },
        summary: 'Get absence-type settings',
        tags: ['Absence administration'],
      },
    },
    async (request, reply) => {
      const data = await service.getSettings(
        await readIdentity(request, authentication),
        requestInstant(now),
      );
      reply.header('cache-control', 'private, no-store');
      return { data, meta: { requestId: request.id } };
    },
  );
  api.post(
    '/v1/hr/absence-settings/versions',
    {
      schema: {
        body: createAbsenceTypeVersionAdminRequestSchema,
        operationId: 'createAbsenceTypeVersionForAdministration',
        response: { 200: absenceAdministrationActionEnvelopeSchema, ...MUTATION_ERRORS },
        summary: 'Create an absence-type version',
        tags: ['Absence administration'],
      },
    },
    async (request, reply) => {
      const prepared = await mutationIdentity(request, config, authentication, now);
      const data = await service.createAbsenceTypeVersion(
        prepared.identity,
        request.body,
        prepared.at,
        requestId(request),
      );
      reply.header('cache-control', 'private, no-store');
      return { data, meta: { requestId: request.id } };
    },
  );
  api.get(
    '/v1/hr/employees/:employeeId/entitlements',
    {
      schema: {
        operationId: 'getEmployeeEntitlementsForAdministration',
        params: employeeParamsSchema,
        response: { 200: employeeEntitlementAdminDetailEnvelopeSchema, ...READ_ERRORS },
        summary: 'Get employee entitlement administration',
        tags: ['Absence administration'],
      },
    },
    async (request, reply) => {
      const data = await service.getEmployeeEntitlements(
        await readIdentity(request, authentication),
        parseAdministrationId<'Employee'>(request.params.employeeId),
        requestInstant(now),
      );
      reply.header('cache-control', 'private, no-store');
      return { data, meta: { requestId: request.id } };
    },
  );
  api.post(
    '/v1/hr/employees/:employeeId/entitlement-adjustments',
    {
      schema: {
        body: createEntitlementAdjustmentAdminRequestSchema,
        operationId: 'createEmployeeEntitlementAdjustment',
        params: employeeParamsSchema,
        response: { 200: absenceAdministrationActionEnvelopeSchema, ...MUTATION_ERRORS },
        summary: 'Create a reasoned entitlement adjustment',
        tags: ['Absence administration'],
      },
    },
    async (request, reply) => {
      const prepared = await mutationIdentity(request, config, authentication, now);
      const data = await service.createEntitlementAdjustment(
        prepared.identity,
        parseAdministrationId<'Employee'>(request.params.employeeId),
        request.body,
        prepared.at,
        requestId(request),
      );
      reply.header('cache-control', 'private, no-store');
      return { data, meta: { requestId: request.id } };
    },
  );
}

async function readIdentity(
  request: FastifyRequest,
  authentication: WorkLedgerAuthentication,
): Promise<AbsenceAdministrationIdentity> {
  const { session } = await requireRequestSession(request, authentication, 'ACTIVE');
  return parseAdministrationIdentity(session.userId, session.fresh);
}
async function mutationIdentity(
  request: FastifyRequest,
  config: RuntimeConfig,
  authentication: WorkLedgerAuthentication,
  now: () => string,
): Promise<Readonly<{ at: Instant; identity: AbsenceAdministrationIdentity }>> {
  requireSameOrigin(request, config.canonicalOrigin);
  const { headers, session } = await requireRequestSession(request, authentication, 'ACTIVE');
  await requireRequestCsrf(request, authentication, headers);
  return Object.freeze({
    at: requestInstant(now),
    identity: parseAdministrationIdentity(session.userId, session.fresh),
  });
}
function requestInstant(now: () => string): Instant {
  return parseAdministrationInstant(now());
}
function requestId(request: FastifyRequest): DomainId<'Request'> {
  return parseAdministrationId<'Request'>(request.id);
}
