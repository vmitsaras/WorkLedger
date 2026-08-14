import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import {
  apiErrorEnvelopeSchema,
  createScheduleVersionAdminRequestSchema,
  createTimePolicyVersionAdminRequestSchema,
  employeePolicyAdminDetailEnvelopeSchema,
  employeeScheduleAdminDetailEnvelopeSchema,
  replaceScheduleAssignmentAdminRequestSchema,
  replacePolicyAssignmentAdminRequestSchema,
  scheduleAdministrationActionEnvelopeSchema,
  timeSettingsAdminDetailEnvelopeSchema,
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
import { createTimeAdministrationService, type TimeAdministrationIdentity } from './service.js';

const employeeParamsSchema = z.strictObject({ employeeId: z.string().min(1).max(128) });
const READ_ERRORS = {
  401: apiErrorEnvelopeSchema,
  403: apiErrorEnvelopeSchema,
  404: apiErrorEnvelopeSchema,
  422: apiErrorEnvelopeSchema,
  503: apiErrorEnvelopeSchema,
} as const;
const MUTATION_ERRORS = { ...READ_ERRORS, 409: apiErrorEnvelopeSchema } as const;

export function registerTimeAdministrationRoutes(
  app: FastifyInstance,
  config: RuntimeConfig,
  authentication: WorkLedgerAuthentication,
  database: WorkLedgerDatabase,
  now: () => string = () => new Date().toISOString(),
): void {
  const api = app.withTypeProvider<ZodTypeProvider>();
  const service = createTimeAdministrationService(database);

  api.get(
    '/v1/hr/time-settings',
    {
      schema: {
        description:
          'Lists immutable organization weekly-schedule versions and identifies the latest version for each schedule name.',
        operationId: 'getTimeSettingsForAdministration',
        response: { 200: timeSettingsAdminDetailEnvelopeSchema, ...READ_ERRORS },
        summary: 'Get weekly schedule settings',
        tags: ['Time administration'],
      },
    },
    async (request, reply) => {
      const identity = await readIdentity(request, authentication);
      const data = await service.getTimeSettings(identity, requestInstant(now));
      reply.header('cache-control', 'private, no-store');
      return { data, meta: { requestId: request.id } };
    },
  );

  api.post(
    '/v1/hr/time-settings/schedule-versions',
    {
      schema: {
        body: createScheduleVersionAdminRequestSchema,
        description:
          'Creates the next immutable version for one named weekly schedule; it changes no employee assignment by itself.',
        operationId: 'createWeeklyScheduleVersion',
        response: { 200: scheduleAdministrationActionEnvelopeSchema, ...MUTATION_ERRORS },
        summary: 'Create a weekly schedule version',
        tags: ['Time administration'],
      },
    },
    async (request, reply) => {
      const prepared = await mutationIdentity(request, config, authentication, now);
      const data = await service.createScheduleVersion(
        prepared.identity,
        request.body,
        prepared.at,
        requestIdentifier(request),
      );
      reply.header('cache-control', 'private, no-store');
      return { data, meta: { requestId: request.id } };
    },
  );

  api.post(
    '/v1/hr/time-settings/policy-versions',
    {
      schema: {
        body: createTimePolicyVersionAdminRequestSchema,
        description:
          'Creates the next immutable version for one bounded organization time policy; employee assignments remain unchanged.',
        operationId: 'createTimePolicyVersion',
        response: { 200: scheduleAdministrationActionEnvelopeSchema, ...MUTATION_ERRORS },
        summary: 'Create a time-policy version',
        tags: ['Time administration'],
      },
    },
    async (request, reply) => {
      const prepared = await mutationIdentity(request, config, authentication, now);
      const data = await service.createTimePolicyVersion(
        prepared.identity,
        request.body,
        prepared.at,
        requestIdentifier(request),
      );
      reply.header('cache-control', 'private, no-store');
      return { data, meta: { requestId: request.id } };
    },
  );

  api.get(
    '/v1/hr/employees/:employeeId/schedule',
    {
      schema: {
        description:
          'Returns current and preserved weekly-schedule assignment history plus current/future employment coverage gaps.',
        operationId: 'getEmployeeScheduleForAdministration',
        params: employeeParamsSchema,
        response: { 200: employeeScheduleAdminDetailEnvelopeSchema, ...READ_ERRORS },
        summary: 'Get employee schedule administration detail',
        tags: ['Time administration'],
      },
    },
    async (request, reply) => {
      const identity = await readIdentity(request, authentication);
      const data = await service.getEmployeeSchedule(
        identity,
        parseAdministrationId<'Employee'>(request.params.employeeId),
        requestInstant(now),
      );
      reply.header('cache-control', 'private, no-store');
      return { data, meta: { requestId: request.id } };
    },
  );

  api.post(
    '/v1/hr/employees/:employeeId/schedule-assignment',
    {
      schema: {
        body: replaceScheduleAssignmentAdminRequestSchema,
        description:
          'Creates an adjacent current-or-future schedule assignment without changing earlier rows and rejects any resulting employed-date gap.',
        operationId: 'replaceEmployeeScheduleAssignment',
        params: employeeParamsSchema,
        response: { 200: scheduleAdministrationActionEnvelopeSchema, ...MUTATION_ERRORS },
        summary: 'Change an employee weekly schedule',
        tags: ['Time administration'],
      },
    },
    async (request, reply) => {
      const prepared = await mutationIdentity(request, config, authentication, now);
      const data = await service.replaceScheduleAssignment(
        prepared.identity,
        parseAdministrationId<'Employee'>(request.params.employeeId),
        request.body,
        prepared.at,
        requestIdentifier(request),
      );
      reply.header('cache-control', 'private, no-store');
      return { data, meta: { requestId: request.id } };
    },
  );

  api.get(
    '/v1/hr/employees/:employeeId/policy',
    {
      schema: {
        description:
          'Returns current and preserved time-policy assignment history plus current/future employment coverage gaps.',
        operationId: 'getEmployeePolicyForAdministration',
        params: employeeParamsSchema,
        response: { 200: employeePolicyAdminDetailEnvelopeSchema, ...READ_ERRORS },
        summary: 'Get employee time-policy administration detail',
        tags: ['Time administration'],
      },
    },
    async (request, reply) => {
      const identity = await readIdentity(request, authentication);
      const data = await service.getEmployeePolicy(
        identity,
        parseAdministrationId<'Employee'>(request.params.employeeId),
        requestInstant(now),
      );
      reply.header('cache-control', 'private, no-store');
      return { data, meta: { requestId: request.id } };
    },
  );

  api.post(
    '/v1/hr/employees/:employeeId/policy-assignment',
    {
      schema: {
        body: replacePolicyAssignmentAdminRequestSchema,
        description:
          'Creates an adjacent current-or-future policy assignment without changing earlier rows and rejects any resulting employed-date gap.',
        operationId: 'replaceEmployeePolicyAssignment',
        params: employeeParamsSchema,
        response: { 200: scheduleAdministrationActionEnvelopeSchema, ...MUTATION_ERRORS },
        summary: 'Change an employee time policy',
        tags: ['Time administration'],
      },
    },
    async (request, reply) => {
      const prepared = await mutationIdentity(request, config, authentication, now);
      const data = await service.replacePolicyAssignment(
        prepared.identity,
        parseAdministrationId<'Employee'>(request.params.employeeId),
        request.body,
        prepared.at,
        requestIdentifier(request),
      );
      reply.header('cache-control', 'private, no-store');
      return { data, meta: { requestId: request.id } };
    },
  );
}

async function readIdentity(
  request: FastifyRequest,
  authentication: WorkLedgerAuthentication,
): Promise<TimeAdministrationIdentity> {
  const { session } = await requireRequestSession(request, authentication, 'ACTIVE');
  return parseAdministrationIdentity(session.userId, session.fresh);
}

async function mutationIdentity(
  request: FastifyRequest,
  config: RuntimeConfig,
  authentication: WorkLedgerAuthentication,
  now: () => string,
): Promise<Readonly<{ at: Instant; identity: TimeAdministrationIdentity }>> {
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

function requestIdentifier(request: FastifyRequest): DomainId<'Request'> {
  return parseAdministrationId<'Request'>(request.id);
}
