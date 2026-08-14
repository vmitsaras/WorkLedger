import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import {
  activateEmployeeAdminRequestSchema,
  administrationActionEnvelopeSchema,
  apiErrorEnvelopeSchema,
  createEmployeeAdminRequestSchema,
  createTechnicalAccountRequestSchema,
  deactivateEmployeeAdminRequestSchema,
  employeeAdminDetailEnvelopeSchema,
  employeeAdminPageEnvelopeSchema,
  employeeAdminQuerySchema,
  invitationActivationEnvelopeSchema,
  invitationActivationRequestSchema,
  replaceEmployeeRolesRequestSchema,
  systemAccountPageEnvelopeSchema,
  systemAccountQuerySchema,
  systemAccountStateRequestSchema,
  systemRoleStateRequestSchema,
} from '@workledger/contracts';
import type { LocalDate, DomainId, Instant } from '@workledger/domain';
import type { WorkLedgerDatabase } from '@workledger/database';

import type { WorkLedgerAuthentication } from '../auth/authentication.js';
import {
  requireRequestCsrf,
  requireRequestSession,
  requireSameOrigin,
} from '../auth/request-session.js';
import type { RuntimeConfig } from '../config.js';
import {
  createAdministrationService,
  parseAdministrationId,
  parseAdministrationIdentity,
  parseAdministrationInstant,
  type AccountInvitationSender,
  type AdministrationIdentity,
} from './service.js';

const employeeParamsSchema = z.strictObject({ employeeId: z.string().min(1).max(128) });
const accountParamsSchema = z.strictObject({ accountId: z.string().min(1).max(128) });
const accountSessionParamsSchema = accountParamsSchema.extend({
  sessionId: z.string().min(1).max(128),
});
const READ_ERRORS = {
  401: apiErrorEnvelopeSchema,
  403: apiErrorEnvelopeSchema,
  404: apiErrorEnvelopeSchema,
  422: apiErrorEnvelopeSchema,
  503: apiErrorEnvelopeSchema,
} as const;
const MUTATION_ERRORS = {
  ...READ_ERRORS,
  409: apiErrorEnvelopeSchema,
  429: apiErrorEnvelopeSchema,
} as const;

export function registerAdministrationRoutes(
  app: FastifyInstance,
  config: RuntimeConfig,
  authentication: WorkLedgerAuthentication,
  database: WorkLedgerDatabase,
  now: () => string = () => new Date().toISOString(),
  sendInvitation?: AccountInvitationSender,
): void {
  const api = app.withTypeProvider<ZodTypeProvider>();
  const service = createAdministrationService(
    database,
    authentication,
    config.canonicalOrigin,
    sendInvitation,
  );

  api.post(
    '/v1/account-invitations/activate',
    {
      schema: {
        body: invitationActivationRequestSchema,
        description:
          'Consumes one same-origin, single-use 24-hour invitation grant, establishes a policy-compliant credential, and activates the account without creating a session.',
        operationId: 'activateAccountInvitation',
        response: { 200: invitationActivationEnvelopeSchema, ...MUTATION_ERRORS },
        summary: 'Activate an invited account',
        tags: ['Account administration'],
      },
    },
    async (request, reply) => {
      requireSameOrigin(request, config.canonicalOrigin);
      const data = await service.activateInvitation(
        request.body.token,
        request.body.password,
        requestInstant(now),
        requestIdentifier(request),
        request.ip,
      );
      reply.header('cache-control', 'private, no-store');
      reply.header('referrer-policy', 'no-referrer');
      return { data, meta: { requestId: request.id } };
    },
  );

  api.get(
    '/v1/hr/employees',
    {
      schema: {
        description:
          'Lists organization employees for HR after scope is fixed, with bounded status-only filtering and no person-identifying URL search.',
        operationId: 'listEmployeesForAdministration',
        querystring: employeeAdminQuerySchema,
        response: { 200: employeeAdminPageEnvelopeSchema, ...READ_ERRORS },
        summary: 'List employees for administration',
        tags: ['Employee administration'],
      },
    },
    async (request, reply) => {
      const identity = await readIdentity(request, authentication);
      const data = await service.listEmployees(identity, request.query, requestInstant(now));
      reply.header('cache-control', 'private, no-store');
      return { data, meta: { requestId: request.id } };
    },
  );

  api.get(
    '/v1/hr/employees/:employeeId',
    {
      schema: {
        description:
          'Returns one authorized employee lifecycle record, current employee-linked account state, HR-managed roles, and preserved employment history.',
        operationId: 'getEmployeeForAdministration',
        params: employeeParamsSchema,
        response: { 200: employeeAdminDetailEnvelopeSchema, ...READ_ERRORS },
        summary: 'Get employee administration detail',
        tags: ['Employee administration'],
      },
    },
    async (request, reply) => {
      const identity = await readIdentity(request, authentication);
      const data = await service.getEmployee(
        identity,
        parseAdministrationId<'Employee'>(request.params.employeeId),
        requestInstant(now),
      );
      reply.header('cache-control', 'private, no-store');
      return { data, meta: { requestId: request.id } };
    },
  );

  api.post(
    '/v1/hr/employees',
    {
      schema: {
        body: createEmployeeAdminRequestSchema,
        description:
          'Creates one stable employee, initial half-open employment period, inactive invited account link, and HR-managed role history in one serializable transaction.',
        operationId: 'createEmployeeForAdministration',
        response: { 200: employeeAdminDetailEnvelopeSchema, ...MUTATION_ERRORS },
        summary: 'Create and invite an employee',
        tags: ['Employee administration'],
      },
    },
    async (request, reply) => {
      const prepared = await mutationIdentity(request, config, authentication, now);
      const data = await service.createEmployee(
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
    '/v1/hr/employees/:employeeId/activate',
    {
      schema: {
        body: activateEmployeeAdminRequestSchema,
        description:
          'Reactivates an inactive stable employee with a new non-overlapping employment period and revokes existing sessions.',
        operationId: 'activateEmployeeForAdministration',
        params: employeeParamsSchema,
        response: { 200: administrationActionEnvelopeSchema, ...MUTATION_ERRORS },
        summary: 'Activate an employee',
        tags: ['Employee administration'],
      },
    },
    async (request, reply) => {
      const prepared = await mutationIdentity(request, config, authentication, now);
      const data = await service.activateEmployee(
        prepared.identity,
        parseAdministrationId<'Employee'>(request.params.employeeId),
        request.body.employmentStartsOn as LocalDate,
        prepared.at,
        requestIdentifier(request),
      );
      reply.header('cache-control', 'private, no-store');
      return { data, meta: { requestId: request.id } };
    },
  );

  api.post(
    '/v1/hr/employees/:employeeId/deactivate',
    {
      schema: {
        body: deactivateEmployeeAdminRequestSchema,
        description:
          'Ends the open employment period, deactivates the employee-linked account, revokes all sessions, and preserves employee, account, role, and domain history.',
        operationId: 'deactivateEmployeeForAdministration',
        params: employeeParamsSchema,
        response: { 200: administrationActionEnvelopeSchema, ...MUTATION_ERRORS },
        summary: 'Deactivate an employee',
        tags: ['Employee administration'],
      },
    },
    async (request, reply) => {
      const prepared = await mutationIdentity(request, config, authentication, now);
      const data = await service.deactivateEmployee(
        prepared.identity,
        parseAdministrationId<'Employee'>(request.params.employeeId),
        request.body.employmentEndsOn as LocalDate,
        prepared.at,
        requestIdentifier(request),
      );
      reply.header('cache-control', 'private, no-store');
      return { data, meta: { requestId: request.id } };
    },
  );

  api.post(
    '/v1/hr/employees/:employeeId/roles',
    {
      schema: {
        body: replaceEmployeeRolesRequestSchema,
        description:
          'Replaces only HR-managed employee, manager, and HR roles for another employee-linked account; system-administrator role state is untouched.',
        operationId: 'replaceEmployeeRolesForAdministration',
        params: employeeParamsSchema,
        response: { 200: administrationActionEnvelopeSchema, ...MUTATION_ERRORS },
        summary: 'Replace HR-managed employee roles',
        tags: ['Employee administration'],
      },
    },
    async (request, reply) => {
      const prepared = await mutationIdentity(request, config, authentication, now);
      const data = await service.replaceEmployeeRoles(
        prepared.identity,
        parseAdministrationId<'Employee'>(request.params.employeeId),
        request.body.roles,
        prepared.at,
        requestIdentifier(request),
      );
      reply.header('cache-control', 'private, no-store');
      return { data, meta: { requestId: request.id } };
    },
  );

  api.post(
    '/v1/hr/employees/:employeeId/invitation',
    {
      schema: {
        description:
          'Invalidates any prior pending employee invitation and creates a new single-use 24-hour invitation without exposing its grant in the response.',
        operationId: 'reissueEmployeeInvitation',
        params: employeeParamsSchema,
        response: { 200: administrationActionEnvelopeSchema, ...MUTATION_ERRORS },
        summary: 'Reissue an employee invitation',
        tags: ['Employee administration'],
      },
    },
    async (request, reply) => {
      const prepared = await mutationIdentity(request, config, authentication, now);
      const data = await service.reissueEmployeeInvitation(
        prepared.identity,
        parseAdministrationId<'Employee'>(request.params.employeeId),
        prepared.at,
        requestIdentifier(request),
      );
      reply.header('cache-control', 'private, no-store');
      return { data, meta: { requestId: request.id } };
    },
  );

  api.get(
    '/v1/system/accounts',
    {
      schema: {
        description:
          'Lists purpose-minimized technical account, system-role, invitation, and active-session state without employee or HR domain fields.',
        operationId: 'listAccountsForSystemAdministration',
        querystring: systemAccountQuerySchema,
        response: { 200: systemAccountPageEnvelopeSchema, ...READ_ERRORS },
        summary: 'List accounts and sessions for system administration',
        tags: ['System administration'],
      },
    },
    async (request, reply) => {
      const identity = await readIdentity(request, authentication);
      const data = await service.listSystemAccounts(identity, request.query, requestInstant(now));
      reply.header('cache-control', 'private, no-store');
      return { data, meta: { requestId: request.id } };
    },
  );

  api.post(
    '/v1/system/accounts',
    {
      schema: {
        body: createTechnicalAccountRequestSchema,
        description:
          'Creates and invites a separate technical account with system-administrator authority and no fabricated employee identity.',
        operationId: 'createTechnicalAccount',
        response: { 200: administrationActionEnvelopeSchema, ...MUTATION_ERRORS },
        summary: 'Create and invite a technical account',
        tags: ['System administration'],
      },
    },
    async (request, reply) => {
      const prepared = await mutationIdentity(request, config, authentication, now);
      const data = await service.createTechnicalAccount(
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
    '/v1/system/accounts/:accountId/state',
    {
      schema: {
        body: systemAccountStateRequestSchema,
        description:
          'Activates or deactivates another account as a technical operation, revoking all target sessions without changing employee or employment data; an employee-linked account can be re-enabled only while its employee is active.',
        operationId: 'setSystemAccountState',
        params: accountParamsSchema,
        response: { 200: administrationActionEnvelopeSchema, ...MUTATION_ERRORS },
        summary: 'Set another account state',
        tags: ['System administration'],
      },
    },
    async (request, reply) => {
      const prepared = await mutationIdentity(request, config, authentication, now);
      const data = await service.setSystemAccountState(
        prepared.identity,
        parseAdministrationId<'Account'>(request.params.accountId),
        request.body.active,
        prepared.at,
        requestIdentifier(request),
      );
      reply.header('cache-control', 'private, no-store');
      return { data, meta: { requestId: request.id } };
    },
  );

  api.post(
    '/v1/system/accounts/:accountId/system-role',
    {
      schema: {
        body: systemRoleStateRequestSchema,
        description:
          'Assigns or revokes only another account’s system-administrator role; HR-managed roles and employee data remain untouched.',
        operationId: 'setSystemAdministratorRole',
        params: accountParamsSchema,
        response: { 200: administrationActionEnvelopeSchema, ...MUTATION_ERRORS },
        summary: 'Set another account system role',
        tags: ['System administration'],
      },
    },
    async (request, reply) => {
      const prepared = await mutationIdentity(request, config, authentication, now);
      const data = await service.setSystemRole(
        prepared.identity,
        parseAdministrationId<'Account'>(request.params.accountId),
        request.body.enabled,
        prepared.at,
        requestIdentifier(request),
      );
      reply.header('cache-control', 'private, no-store');
      return { data, meta: { requestId: request.id } };
    },
  );

  api.post(
    '/v1/system/accounts/:accountId/sessions/:sessionId/revoke',
    {
      schema: {
        description:
          'Revokes one opaque session belonging to another account after fresh technical authorization; session tokens, IP addresses, and raw user agents are never returned.',
        operationId: 'revokeSessionForSystemAdministration',
        params: accountSessionParamsSchema,
        response: { 200: administrationActionEnvelopeSchema, ...MUTATION_ERRORS },
        summary: 'Revoke another account session',
        tags: ['System administration'],
      },
    },
    async (request, reply) => {
      const prepared = await mutationIdentity(request, config, authentication, now);
      const data = await service.revokeSystemSession(
        prepared.identity,
        parseAdministrationId<'Account'>(request.params.accountId),
        parseAdministrationId<'Session'>(request.params.sessionId),
        prepared.at,
        requestIdentifier(request),
      );
      reply.header('cache-control', 'private, no-store');
      return { data, meta: { requestId: request.id } };
    },
  );
}

async function readIdentity(request: FastifyRequest, authentication: WorkLedgerAuthentication) {
  const { session } = await requireRequestSession(request, authentication, 'ACTIVE');
  return parseAdministrationIdentity(session.userId, session.fresh);
}

async function mutationIdentity(
  request: FastifyRequest,
  config: RuntimeConfig,
  authentication: WorkLedgerAuthentication,
  now: () => string,
): Promise<Readonly<{ at: Instant; identity: AdministrationIdentity }>> {
  requireSameOrigin(request, config.canonicalOrigin);
  const { headers, session } = await requireRequestSession(request, authentication, 'ACTIVE');
  await requireRequestCsrf(request, authentication, headers);
  return Object.freeze({
    at: requestInstant(now),
    identity: parseAdministrationIdentity(session.userId, session.fresh),
  });
}

function requestInstant(now: () => string) {
  return parseAdministrationInstant(now());
}

function requestIdentifier(request: FastifyRequest): DomainId<'Request'> {
  return parseAdministrationId<'Request'>(request.id);
}
