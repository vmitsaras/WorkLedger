import { randomBytes } from 'node:crypto';

import type {
  AdministrationActionResult,
  CreateTeamAdminRequest,
  CreateEmployeeAdminRequest,
  CreateTechnicalAccountRequest,
  EmployeeAdminDetail,
  EmployeeAdminPage,
  EmployeeAdminQuery,
  EmployeeAssignmentAdminDetail,
  ReplaceManagerAssignmentRequest,
  ReplaceTeamAssignmentRequest,
  SystemAccountPage,
  SystemAccountQuery,
  TeamAdminPage,
  TeamAdminQuery,
} from '@workledger/contracts';
import {
  localDateAtInstant,
  parseDomainId,
  parseInstant,
  parseTimeZoneId,
  planEffectiveAssignmentTransition,
  validateManagerAssignmentGraph,
  type DomainId,
  type EffectiveAssignmentRecord,
  type Instant,
  type LocalDate,
} from '@workledger/domain';
import type {
  AdministrationEmployeeRecord,
  AdministrationEmployeeAssignmentsRecord,
  AdministrationSystemAccountRecord,
  ApplicationRole,
  AuthorizationActorRecord,
  WorkLedgerDatabase,
  WorkLedgerTransaction,
} from '@workledger/database';

import type { WorkLedgerAuthentication } from '../auth/authentication.js';
import { PasswordPolicyError } from '../auth/password-policy.js';
import { summarizeUserAgent } from '../account/self-service.js';
import { WorkLedgerApiError } from '../http/errors.js';
import { authorizeAccountTarget, authorizeEmployeeTarget } from '../authorization/policy.js';

const INVITATION_LIFETIME_MILLISECONDS = 24 * 60 * 60 * 1_000;
const HR_ROLES = new Set<ApplicationRole>(['EMPLOYEE', 'MANAGER', 'HR_ADMINISTRATOR']);

export type AdministrationIdentity = Readonly<{
  accountId: DomainId<'Account'>;
  fresh: boolean;
}>;

export type AccountInvitationMessage = Readonly<{
  activationUrl: URL;
  email: string;
  name: string;
}>;

export type AccountInvitationSender = (message: AccountInvitationMessage) => Promise<void>;

export function createAdministrationService(
  database: WorkLedgerDatabase,
  authentication: WorkLedgerAuthentication,
  canonicalOrigin: string,
  sendInvitation: AccountInvitationSender = async () => undefined,
) {
  return Object.freeze({
    async activateEmployee(
      identity: AdministrationIdentity,
      employeeId: DomainId<'Employee'>,
      startsOn: LocalDate,
      at: Instant,
      requestId: DomainId<'Request'>,
    ): Promise<AdministrationActionResult> {
      try {
        return await database.transaction(async (transaction) => {
          const context = await requireContext(transaction, identity, at);
          const actor = await requireEmployeeAdministration(
            transaction,
            identity,
            context.organization.id,
            employeeId,
            at,
            'EMPLOYEE_MANAGE',
          );
          const employee = await transaction.administration.activateEmployee(
            context.organization.id,
            employeeId,
            startsOn,
            at,
          );
          if (employee === null) {
            throw new WorkLedgerApiError({ code: 'EMPLOYEE_STATE_CONFLICT', statusCode: 409 });
          }
          await transaction.audit.appendDomain({
            actionCode: 'EMPLOYEE_ACTIVATED',
            actor: auditActor(actor, 'HR_ADMINISTRATOR'),
            facts: { effectiveDate: startsOn, nextStatus: 'ACTIVE', previousStatus: 'INACTIVE' },
            occurredAt: at,
            organizationId: context.organization.id,
            outcome: 'SUCCESS',
            privileged: true,
            reasonCode: null,
            requestId,
            restrictedReasonId: null,
            subjectEmployeeId: employeeId,
            targetId: employeeId,
            targetKind: 'EMPLOYEE',
          });
          if (employee.account !== null) {
            await transaction.audit.appendSecurity({
              actionCode: 'ACCOUNT_ACTIVATED_WITH_EMPLOYEE',
              actor: auditActor(actor, 'HR_ADMINISTRATOR'),
              facts: { scope: 'ORGANIZATION_HR' },
              occurredAt: at,
              organizationId: context.organization.id,
              outcome: 'SUCCESS',
              privileged: true,
              reasonCode: null,
              requestId,
              targetAccountId: employee.account.id,
              targetId: employee.account.id,
              targetKind: 'ACCOUNT',
            });
          }
          return actionResult('EMPLOYEE_ACTIVATED', employeeId, at);
        }, serializableRetry);
      } catch (error) {
        throw mapAdministrationDatabaseError(error);
      }
    },

    async activateInvitation(
      token: string,
      password: string,
      at: Instant,
      requestId: DomainId<'Request'>,
      clientAddress: string,
    ) {
      const rateLimit = await authentication.consumeInvitationRateLimit(token, clientAddress);
      if (!rateLimit.allowed) {
        throw new WorkLedgerApiError({ code: 'RATE_LIMITED', statusCode: 429 });
      }
      let passwordHash: string;
      try {
        passwordHash = await authentication.hashCredentialPassword(password);
      } catch (error) {
        if (!(error instanceof PasswordPolicyError)) throw error;
        throw new WorkLedgerApiError({
          code: 'VALIDATION_FAILED',
          fields: {
            password: [
              {
                code: 'INVALID_VALUE',
                message: 'Use a passphrase of 15–128 characters that is not commonly used.',
              },
            ],
          },
          statusCode: 422,
        });
      }
      return database.transaction(async (transaction) => {
        const result = await transaction.administration.activateInvitation({
          activatedAt: at,
          invitationIdentifier: invitationIdentifier(token),
          passwordHash,
        });
        if (result === null) {
          throw new WorkLedgerApiError({
            code: 'AUTH_INVITATION_INVALID_OR_EXPIRED',
            statusCode: 401,
          });
        }
        await transaction.audit.appendSecurity({
          actionCode: 'INVITATION_ACTIVATED',
          actor: { accountId: result.accountId, kind: 'ACCOUNT', role: null },
          facts: { authenticationMethod: 'PASSWORD', scope: 'INVITATION' },
          occurredAt: at,
          organizationId: result.organizationId,
          outcome: 'SUCCESS',
          privileged: false,
          reasonCode: null,
          requestId,
          targetAccountId: result.accountId,
          targetId: result.accountId,
          targetKind: 'INVITATION',
        });
        return Object.freeze({ activated: true as const });
      }, serializableRetry);
    },

    async createEmployee(
      identity: AdministrationIdentity,
      input: CreateEmployeeAdminRequest,
      at: Instant,
      requestId: DomainId<'Request'>,
    ): Promise<EmployeeAdminDetail> {
      const token = invitationToken();
      let created: Readonly<{
        employee: AdministrationEmployeeRecord;
        localDate: LocalDate;
      }>;
      try {
        created = await database.transaction(async (transaction) => {
          const { actor, context } = await requireHrMutationContext(transaction, identity, at);
          const result = await transaction.administration.createEmployee({
            accountEmail: input.email,
            accountName: input.displayName,
            createdAt: at,
            employeeNumber: input.employeeNumber,
            employmentStartsOn: parseLocalDateInput(input.employmentStartsOn),
            invitationExpiresAt: invitationExpiry(at),
            invitationIdentifier: invitationIdentifier(token),
            organizationId: context.organization.id,
            roles: input.roles,
          });
          await transaction.audit.appendDomain({
            actionCode: 'EMPLOYEE_CREATED',
            actor: auditActor(actor, 'HR_ADMINISTRATOR'),
            facts: { effectiveDate: input.employmentStartsOn as LocalDate, nextStatus: 'ACTIVE' },
            occurredAt: at,
            organizationId: context.organization.id,
            outcome: 'SUCCESS',
            privileged: true,
            reasonCode: null,
            requestId,
            restrictedReasonId: null,
            subjectEmployeeId: result.id,
            targetId: result.id,
            targetKind: 'EMPLOYEE',
          });
          if (result.account === null)
            throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
          await transaction.audit.appendSecurity({
            actionCode: 'EMPLOYEE_ACCOUNT_INVITED',
            actor: auditActor(actor, 'HR_ADMINISTRATOR'),
            facts: { scope: 'ORGANIZATION_HR' },
            occurredAt: at,
            organizationId: context.organization.id,
            outcome: 'SUCCESS',
            privileged: true,
            reasonCode: null,
            requestId,
            targetAccountId: result.account.id,
            targetId: result.account.id,
            targetKind: 'INVITATION',
          });
          return Object.freeze({
            employee: result,
            localDate: organizationLocalDate(at, context.organization.timeZone),
          });
        }, serializableRetry);
      } catch (error) {
        throw mapAdministrationDatabaseError(error);
      }
      if (created.employee.account !== null) {
        await deliverInvitation(
          sendInvitation,
          { email: created.employee.account.email, name: created.employee.displayName },
          token,
          canonicalOrigin,
        );
      }
      return mapEmployee(created.employee, created.localDate, true);
    },

    async createTechnicalAccount(
      identity: AdministrationIdentity,
      input: CreateTechnicalAccountRequest,
      at: Instant,
      requestId: DomainId<'Request'>,
    ): Promise<AdministrationActionResult> {
      const token = invitationToken();
      let account: AdministrationSystemAccountRecord;
      try {
        account = await database.transaction(async (transaction) => {
          const { actor, context } = await requireSystemMutationContext(transaction, identity, at);
          const result = await transaction.administration.createTechnicalAccount({
            createdAt: at,
            email: input.email,
            invitationExpiresAt: invitationExpiry(at),
            invitationIdentifier: invitationIdentifier(token),
            name: input.name,
            organizationId: context.organization.id,
          });
          await transaction.audit.appendSecurity({
            actionCode: 'TECHNICAL_ACCOUNT_INVITED',
            actor: auditActor(actor, 'SYSTEM_ADMINISTRATOR'),
            facts: { changedRole: 'SYSTEM_ADMINISTRATOR', scope: 'TECHNICAL' },
            occurredAt: at,
            organizationId: context.organization.id,
            outcome: 'SUCCESS',
            privileged: true,
            reasonCode: null,
            requestId,
            targetAccountId: result.id,
            targetId: result.id,
            targetKind: 'INVITATION',
          });
          return result;
        }, serializableRetry);
      } catch (error) {
        throw mapAdministrationDatabaseError(error);
      }
      await deliverInvitation(
        sendInvitation,
        { email: account.email, name: account.name },
        token,
        canonicalOrigin,
      );
      return actionResult('TECHNICAL_ACCOUNT_CREATED', account.id, at);
    },

    async createTeam(
      identity: AdministrationIdentity,
      input: CreateTeamAdminRequest,
      at: Instant,
      requestId: DomainId<'Request'>,
    ): Promise<AdministrationActionResult> {
      try {
        return await database.transaction(async (transaction) => {
          const { actor, context } = await requireHrReadContext(transaction, identity, at);
          const team = await transaction.administration.createTeam(
            context.organization.id,
            input.name,
          );
          await transaction.audit.appendDomain({
            actionCode: 'TEAM_CREATED',
            actor: auditActor(actor, 'HR_ADMINISTRATOR'),
            facts: { nextStatus: 'ACTIVE' },
            occurredAt: at,
            organizationId: context.organization.id,
            outcome: 'SUCCESS',
            privileged: true,
            reasonCode: null,
            requestId,
            restrictedReasonId: null,
            subjectEmployeeId: null,
            targetId: team.id,
            targetKind: 'TEAM',
          });
          return actionResult('TEAM_CREATED', team.id, at);
        }, serializableRetry);
      } catch (error) {
        throw mapAdministrationDatabaseError(error);
      }
    },

    async deactivateEmployee(
      identity: AdministrationIdentity,
      employeeId: DomainId<'Employee'>,
      endsOn: LocalDate,
      at: Instant,
      requestId: DomainId<'Request'>,
    ): Promise<AdministrationActionResult> {
      return database.transaction(async (transaction) => {
        const context = await requireContext(transaction, identity, at);
        const actor = await requireEmployeeAdministration(
          transaction,
          identity,
          context.organization.id,
          employeeId,
          at,
          'EMPLOYEE_MANAGE',
        );
        const employee = await transaction.administration.deactivateEmployee(
          context.organization.id,
          employeeId,
          endsOn,
          at,
        );
        if (employee === null) {
          throw new WorkLedgerApiError({ code: 'EMPLOYEE_STATE_CONFLICT', statusCode: 409 });
        }
        await transaction.audit.appendDomain({
          actionCode: 'EMPLOYEE_DEACTIVATED',
          actor: auditActor(actor, 'HR_ADMINISTRATOR'),
          facts: { effectiveDate: endsOn, nextStatus: 'INACTIVE', previousStatus: 'ACTIVE' },
          occurredAt: at,
          organizationId: context.organization.id,
          outcome: 'SUCCESS',
          privileged: true,
          reasonCode: null,
          requestId,
          restrictedReasonId: null,
          subjectEmployeeId: employeeId,
          targetId: employeeId,
          targetKind: 'EMPLOYEE',
        });
        if (employee.account !== null) {
          await transaction.audit.appendSecurity({
            actionCode: 'ACCOUNT_DEACTIVATED_WITH_EMPLOYEE',
            actor: auditActor(actor, 'HR_ADMINISTRATOR'),
            facts: { scope: 'ORGANIZATION_HR' },
            occurredAt: at,
            organizationId: context.organization.id,
            outcome: 'SUCCESS',
            privileged: true,
            reasonCode: null,
            requestId,
            targetAccountId: employee.account.id,
            targetId: employee.account.id,
            targetKind: 'ACCOUNT',
          });
        }
        return actionResult('EMPLOYEE_DEACTIVATED', employeeId, at);
      }, serializableRetry);
    },

    async getEmployee(
      identity: AdministrationIdentity,
      employeeId: DomainId<'Employee'>,
      at: Instant,
    ): Promise<EmployeeAdminDetail> {
      return database.transaction(async (transaction) => {
        const context = await requireContext(transaction, identity, at);
        const actor = await requireEmployeeAdministration(
          transaction,
          identity,
          context.organization.id,
          employeeId,
          at,
          'EMPLOYEE_PROFILE_READ',
        );
        const employee = await transaction.administration.findEmployee(
          context.organization.id,
          employeeId,
          at,
        );
        if (employee === null) {
          throw new WorkLedgerApiError({ code: 'EMPLOYEE_NOT_FOUND', statusCode: 404 });
        }
        return mapEmployee(
          employee,
          organizationLocalDate(at, context.organization.timeZone),
          actor.employeeId !== employeeId,
        );
      });
    },

    async getEmployeeAssignments(
      identity: AdministrationIdentity,
      employeeId: DomainId<'Employee'>,
      at: Instant,
    ): Promise<EmployeeAssignmentAdminDetail> {
      return database.transaction(async (transaction) => {
        const context = await requireContext(transaction, identity, at);
        const actor = await requireEmployeeAdministration(
          transaction,
          identity,
          context.organization.id,
          employeeId,
          at,
          'EMPLOYEE_PROFILE_READ',
        );
        const localDate = organizationLocalDate(at, context.organization.timeZone);
        const assignments = await transaction.administration.findEmployeeAssignments(
          context.organization.id,
          employeeId,
          localDate,
        );
        if (assignments === null) {
          throw new WorkLedgerApiError({ code: 'EMPLOYEE_NOT_FOUND', statusCode: 404 });
        }
        return mapEmployeeAssignments(assignments, localDate, actor.employeeId !== employeeId);
      });
    },

    async listEmployees(
      identity: AdministrationIdentity,
      query: EmployeeAdminQuery,
      at: Instant,
    ): Promise<EmployeeAdminPage> {
      return database.transaction(async (transaction) => {
        const { context } = await requireHrReadContext(transaction, identity, at);
        const page = await transaction.administration.listEmployees({
          at,
          limit: query.limit,
          offset: (query.page - 1) * query.limit,
          organizationId: context.organization.id,
          status: query.status === 'ALL' ? null : query.status,
        });
        const localDate = organizationLocalDate(at, context.organization.timeZone);
        return Object.freeze({
          items: page.items.map((employee) => {
            const { privilegedActionsAllowed: _privilegedActionsAllowed, ...item } = mapEmployee(
              employee,
              localDate,
              false,
            );
            return item;
          }),
          pagination: pagination(query.page, query.limit, page.total),
        });
      });
    },

    async listTeams(
      identity: AdministrationIdentity,
      query: TeamAdminQuery,
      at: Instant,
    ): Promise<TeamAdminPage> {
      return database.transaction(async (transaction) => {
        const { context } = await requireHrReadContext(transaction, identity, at);
        const page = await transaction.administration.listTeams({
          active: query.status === 'ALL' ? null : query.status === 'ACTIVE',
          limit: query.limit,
          localDate: organizationLocalDate(at, context.organization.timeZone),
          offset: (query.page - 1) * query.limit,
          organizationId: context.organization.id,
        });
        return Object.freeze({
          items: [...page.items],
          pagination: pagination(query.page, query.limit, page.total),
        });
      });
    },

    async listSystemAccounts(
      identity: AdministrationIdentity,
      query: SystemAccountQuery,
      at: Instant,
    ): Promise<SystemAccountPage> {
      return database.transaction(async (transaction) => {
        const { context } = await requireSystemReadContext(transaction, identity, at);
        const page = await transaction.administration.listSystemAccounts({
          at,
          limit: query.limit,
          offset: (query.page - 1) * query.limit,
          organizationId: context.organization.id,
        });
        return Object.freeze({
          items: page.items.map((account) => mapSystemAccount(account, identity.accountId)),
          pagination: pagination(query.page, query.limit, page.total),
        });
      });
    },

    async reissueEmployeeInvitation(
      identity: AdministrationIdentity,
      employeeId: DomainId<'Employee'>,
      at: Instant,
      requestId: DomainId<'Request'>,
    ): Promise<AdministrationActionResult> {
      const token = invitationToken();
      const employee = await database.transaction(async (transaction) => {
        const context = await requireContext(transaction, identity, at);
        const actor = await requireEmployeeAdministration(
          transaction,
          identity,
          context.organization.id,
          employeeId,
          at,
          'EMPLOYEE_ACCOUNT_MANAGE',
        );
        const result = await transaction.administration.findEmployee(
          context.organization.id,
          employeeId,
          at,
        );
        if (result?.account === null || result === null) {
          throw new WorkLedgerApiError({ code: 'EMPLOYEE_NOT_FOUND', statusCode: 404 });
        }
        if (result.status !== 'ACTIVE' || result.account.active) {
          throw new WorkLedgerApiError({ code: 'ACCOUNT_STATE_CONFLICT', statusCode: 409 });
        }
        const reissued = await transaction.administration.reissueInvitation({
          accountId: result.account.id,
          expiresAt: invitationExpiry(at),
          invitationIdentifier: invitationIdentifier(token),
          organizationId: context.organization.id,
        });
        if (!reissued) throw new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 });
        await transaction.audit.appendSecurity({
          actionCode: 'EMPLOYEE_INVITATION_REISSUED',
          actor: auditActor(actor, 'HR_ADMINISTRATOR'),
          facts: { scope: 'ORGANIZATION_HR' },
          occurredAt: at,
          organizationId: context.organization.id,
          outcome: 'SUCCESS',
          privileged: true,
          reasonCode: null,
          requestId,
          targetAccountId: result.account.id,
          targetId: result.account.id,
          targetKind: 'INVITATION',
        });
        return result;
      }, serializableRetry);
      if (employee.account === null)
        throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
      await deliverInvitation(
        sendInvitation,
        { email: employee.account.email, name: employee.displayName },
        token,
        canonicalOrigin,
      );
      return actionResult('INVITATION_REISSUED', employeeId, at);
    },

    async replaceEmployeeRoles(
      identity: AdministrationIdentity,
      employeeId: DomainId<'Employee'>,
      roles: readonly ApplicationRole[],
      at: Instant,
      requestId: DomainId<'Request'>,
    ): Promise<AdministrationActionResult> {
      return database.transaction(async (transaction) => {
        const context = await requireContext(transaction, identity, at);
        const actor = await requireEmployeeAdministration(
          transaction,
          identity,
          context.organization.id,
          employeeId,
          at,
          'EMPLOYEE_ROLE_MANAGE',
        );
        const before = await transaction.administration.findEmployee(
          context.organization.id,
          employeeId,
          at,
        );
        if (before === null) {
          throw new WorkLedgerApiError({ code: 'EMPLOYEE_NOT_FOUND', statusCode: 404 });
        }
        const after = await transaction.administration.replaceEmployeeRoles(
          context.organization.id,
          employeeId,
          roles.filter((role) => HR_ROLES.has(role)),
          at,
        );
        if (after === null)
          throw new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 });
        await transaction.audit.appendDomain({
          actionCode: 'EMPLOYEE_ROLES_REPLACED',
          actor: auditActor(actor, 'HR_ADMINISTRATOR'),
          facts: { sourceCount: after.roles.length },
          occurredAt: at,
          organizationId: context.organization.id,
          outcome: 'SUCCESS',
          privileged: true,
          reasonCode: null,
          requestId,
          restrictedReasonId: null,
          subjectEmployeeId: employeeId,
          targetId: employeeId,
          targetKind: 'EMPLOYEE',
        });
        const changedRoles = new Set(
          [...before.roles, ...after.roles].filter(
            (role) => before.roles.includes(role) !== after.roles.includes(role),
          ),
        );
        for (const role of changedRoles) {
          await transaction.audit.appendSecurity({
            actionCode: after.roles.includes(role)
              ? 'APPLICATION_ROLE_ASSIGNED'
              : 'APPLICATION_ROLE_REVOKED',
            actor: auditActor(actor, 'HR_ADMINISTRATOR'),
            facts: { changedRole: role, scope: 'ORGANIZATION_HR' },
            occurredAt: at,
            organizationId: context.organization.id,
            outcome: 'SUCCESS',
            privileged: role === 'HR_ADMINISTRATOR',
            reasonCode: null,
            requestId,
            targetAccountId: after.account?.id ?? null,
            targetId: after.account?.id ?? employeeId,
            targetKind: 'AUTHORIZATION',
          });
        }
        return actionResult('EMPLOYEE_ROLES_REPLACED', employeeId, at);
      }, serializableRetry);
    },

    async replaceManagerAssignment(
      identity: AdministrationIdentity,
      employeeId: DomainId<'Employee'>,
      input: ReplaceManagerAssignmentRequest,
      at: Instant,
      requestId: DomainId<'Request'>,
    ): Promise<AdministrationActionResult> {
      try {
        return await database.transaction(async (transaction) => {
          const context = await requireContext(transaction, identity, at);
          const actor = await requireEmployeeAdministration(
            transaction,
            identity,
            context.organization.id,
            employeeId,
            at,
            'TEAM_MANAGER_ASSIGN',
          );
          const localDate = organizationLocalDate(at, context.organization.timeZone);
          const assignments = await transaction.administration.findEmployeeAssignments(
            context.organization.id,
            employeeId,
            localDate,
          );
          if (assignments === null) {
            throw new WorkLedgerApiError({ code: 'EMPLOYEE_NOT_FOUND', statusCode: 404 });
          }
          if (assignments.employeeStatus !== 'ACTIVE') {
            throw new WorkLedgerApiError({ code: 'EMPLOYEE_STATE_CONFLICT', statusCode: 409 });
          }
          const transition = planEffectiveAssignmentTransition(
            managerEffectiveHistory(employeeId, assignments),
            employeeId,
            localDate,
            input.effectiveFrom as LocalDate,
            input.managerEmployeeId,
          );
          if (!transition.ok) throw assignmentPlanningError(transition.error.code);
          const assignmentId = await transaction.administration.applyManagerAssignmentTransition({
            employeeId,
            organizationId: context.organization.id,
            transition: transition.value,
          });
          if (assignmentId === null) {
            throw new WorkLedgerApiError({ code: 'MANAGER_NOT_ELIGIBLE', statusCode: 409 });
          }
          const graph = validateManagerAssignmentGraph(
            await transaction.administration.listManagerAssignmentGraph(context.organization.id),
          );
          if (!graph.ok) {
            throw new WorkLedgerApiError({
              code:
                graph.error.code === 'MANAGER_ASSIGNMENT_CYCLE'
                  ? 'MANAGER_ASSIGNMENT_CYCLE'
                  : 'INTERNAL_ERROR',
              statusCode: graph.error.code === 'MANAGER_ASSIGNMENT_CYCLE' ? 409 : 503,
            });
          }
          await appendAssignmentAudit(
            transaction,
            actor,
            context.organization.id,
            employeeId,
            assignmentId,
            input.effectiveFrom as LocalDate,
            input.managerEmployeeId === null ? 'UNASSIGNED' : 'ASSIGNED',
            'MANAGER_ASSIGNMENT_CHANGED',
            at,
            requestId,
          );
          return actionResult('MANAGER_ASSIGNMENT_CHANGED', assignmentId, at);
        }, serializableRetry);
      } catch (error) {
        throw mapAdministrationDatabaseError(error);
      }
    },

    async replaceTeamAssignment(
      identity: AdministrationIdentity,
      employeeId: DomainId<'Employee'>,
      input: ReplaceTeamAssignmentRequest,
      at: Instant,
      requestId: DomainId<'Request'>,
    ): Promise<AdministrationActionResult> {
      try {
        return await database.transaction(async (transaction) => {
          const context = await requireContext(transaction, identity, at);
          const actor = await requireEmployeeAdministration(
            transaction,
            identity,
            context.organization.id,
            employeeId,
            at,
            'TEAM_MANAGER_ASSIGN',
          );
          const localDate = organizationLocalDate(at, context.organization.timeZone);
          const assignments = await transaction.administration.findEmployeeAssignments(
            context.organization.id,
            employeeId,
            localDate,
          );
          if (assignments === null) {
            throw new WorkLedgerApiError({ code: 'EMPLOYEE_NOT_FOUND', statusCode: 404 });
          }
          if (assignments.employeeStatus !== 'ACTIVE') {
            throw new WorkLedgerApiError({ code: 'EMPLOYEE_STATE_CONFLICT', statusCode: 409 });
          }
          const transition = planEffectiveAssignmentTransition(
            teamEffectiveHistory(employeeId, assignments),
            employeeId,
            localDate,
            input.effectiveFrom as LocalDate,
            input.teamId,
          );
          if (!transition.ok) throw assignmentPlanningError(transition.error.code);
          const assignmentId = await transaction.administration.applyTeamAssignmentTransition({
            employeeId,
            organizationId: context.organization.id,
            transition: transition.value,
          });
          if (assignmentId === null) {
            throw new WorkLedgerApiError({ code: 'TEAM_STATE_CONFLICT', statusCode: 409 });
          }
          await appendAssignmentAudit(
            transaction,
            actor,
            context.organization.id,
            employeeId,
            assignmentId,
            input.effectiveFrom as LocalDate,
            input.teamId === null ? 'UNASSIGNED' : 'ASSIGNED',
            'TEAM_ASSIGNMENT_CHANGED',
            at,
            requestId,
          );
          return actionResult('TEAM_ASSIGNMENT_CHANGED', assignmentId, at);
        }, serializableRetry);
      } catch (error) {
        throw mapAdministrationDatabaseError(error);
      }
    },

    async revokeSystemSession(
      identity: AdministrationIdentity,
      accountId: DomainId<'Account'>,
      sessionId: DomainId<'Session'>,
      at: Instant,
      requestId: DomainId<'Request'>,
    ): Promise<AdministrationActionResult> {
      return database.transaction(async (transaction) => {
        const { actor, context } = await requireSystemMutationContext(transaction, identity, at);
        requireAccountAuthorization(actor, identity, accountId, 'SESSION_REVOKE_OTHER');
        const revoked = await transaction.administration.revokeAccountSession(
          context.organization.id,
          accountId,
          sessionId,
        );
        if (!revoked) throw new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 });
        await transaction.audit.appendSecurity({
          actionCode: 'SESSION_ADMIN_REVOKED',
          actor: auditActor(actor, 'SYSTEM_ADMINISTRATOR'),
          facts: { scope: 'TECHNICAL', sessionId },
          occurredAt: at,
          organizationId: context.organization.id,
          outcome: 'SUCCESS',
          privileged: true,
          reasonCode: null,
          requestId,
          targetAccountId: accountId,
          targetId: sessionId,
          targetKind: 'SESSION',
        });
        return actionResult('SESSION_REVOKED', sessionId, at);
      }, serializableRetry);
    },

    async setSystemAccountState(
      identity: AdministrationIdentity,
      accountId: DomainId<'Account'>,
      active: boolean,
      at: Instant,
      requestId: DomainId<'Request'>,
    ): Promise<AdministrationActionResult> {
      return database.transaction(async (transaction) => {
        const { actor, context } = await requireSystemMutationContext(transaction, identity, at);
        requireAccountAuthorization(actor, identity, accountId, 'ACCOUNT_TECHNICAL_MANAGE');
        const changed = await transaction.administration.setAccountActive(
          context.organization.id,
          accountId,
          active,
          at,
        );
        if (!changed) {
          throw new WorkLedgerApiError({ code: 'ACCOUNT_STATE_CONFLICT', statusCode: 409 });
        }
        await transaction.audit.appendSecurity({
          actionCode: active ? 'ACCOUNT_ADMIN_ACTIVATED' : 'ACCOUNT_ADMIN_DEACTIVATED',
          actor: auditActor(actor, 'SYSTEM_ADMINISTRATOR'),
          facts: { scope: 'TECHNICAL' },
          occurredAt: at,
          organizationId: context.organization.id,
          outcome: 'SUCCESS',
          privileged: true,
          reasonCode: null,
          requestId,
          targetAccountId: accountId,
          targetId: accountId,
          targetKind: 'ACCOUNT',
        });
        return actionResult(active ? 'ACCOUNT_ACTIVATED' : 'ACCOUNT_DEACTIVATED', accountId, at);
      }, serializableRetry);
    },

    async setTeamState(
      identity: AdministrationIdentity,
      teamId: DomainId<'Team'>,
      active: boolean,
      at: Instant,
      requestId: DomainId<'Request'>,
    ): Promise<AdministrationActionResult> {
      return database.transaction(async (transaction) => {
        const { actor, context } = await requireHrReadContext(transaction, identity, at);
        const localDate = organizationLocalDate(at, context.organization.timeZone);
        const changed = await transaction.administration.setTeamActive(
          context.organization.id,
          teamId,
          active,
          localDate,
        );
        if (!changed) {
          throw new WorkLedgerApiError({ code: 'TEAM_STATE_CONFLICT', statusCode: 409 });
        }
        await transaction.audit.appendDomain({
          actionCode: active ? 'TEAM_ACTIVATED' : 'TEAM_DEACTIVATED',
          actor: auditActor(actor, 'HR_ADMINISTRATOR'),
          facts: {
            effectiveDate: localDate,
            nextStatus: active ? 'ACTIVE' : 'INACTIVE',
            previousStatus: active ? 'INACTIVE' : 'ACTIVE',
          },
          occurredAt: at,
          organizationId: context.organization.id,
          outcome: 'SUCCESS',
          privileged: true,
          reasonCode: null,
          requestId,
          restrictedReasonId: null,
          subjectEmployeeId: null,
          targetId: teamId,
          targetKind: 'TEAM',
        });
        return actionResult(active ? 'TEAM_ACTIVATED' : 'TEAM_DEACTIVATED', teamId, at);
      }, serializableRetry);
    },

    async setSystemRole(
      identity: AdministrationIdentity,
      accountId: DomainId<'Account'>,
      enabled: boolean,
      at: Instant,
      requestId: DomainId<'Request'>,
    ): Promise<AdministrationActionResult> {
      return database.transaction(async (transaction) => {
        const { actor, context } = await requireSystemMutationContext(transaction, identity, at);
        requireAccountAuthorization(actor, identity, accountId, 'SYSTEM_ROLE_MANAGE');
        const changed = await transaction.administration.setSystemRole(
          context.organization.id,
          accountId,
          enabled,
          at,
        );
        if (!changed) {
          throw new WorkLedgerApiError({ code: 'ACCOUNT_STATE_CONFLICT', statusCode: 409 });
        }
        await transaction.audit.appendSecurity({
          actionCode: enabled ? 'SYSTEM_ROLE_ASSIGNED' : 'SYSTEM_ROLE_REVOKED',
          actor: auditActor(actor, 'SYSTEM_ADMINISTRATOR'),
          facts: { changedRole: 'SYSTEM_ADMINISTRATOR', scope: 'TECHNICAL' },
          occurredAt: at,
          organizationId: context.organization.id,
          outcome: 'SUCCESS',
          privileged: true,
          reasonCode: null,
          requestId,
          targetAccountId: accountId,
          targetId: accountId,
          targetKind: 'AUTHORIZATION',
        });
        return actionResult(
          enabled ? 'SYSTEM_ROLE_ASSIGNED' : 'SYSTEM_ROLE_REVOKED',
          accountId,
          at,
        );
      }, serializableRetry);
    },
  });
}

async function requireContext(
  transaction: WorkLedgerTransaction,
  identity: AdministrationIdentity,
  at: Instant,
) {
  const context = await transaction.accountSelfService.findContext(identity.accountId, at);
  if (context === null || !context.accountActive) {
    throw new WorkLedgerApiError({ code: 'AUTH_SESSION_EXPIRED', statusCode: 401 });
  }
  return context;
}

async function requireHrReadContext(
  transaction: WorkLedgerTransaction,
  identity: AdministrationIdentity,
  at: Instant,
) {
  const context = await requireContext(transaction, identity, at);
  const localDate = organizationLocalDate(at, context.organization.timeZone);
  const actor = await transaction.authorization.findActor(
    context.organization.id,
    identity.accountId,
    localDate,
  );
  if (actor === null || !actor.roles.includes('HR_ADMINISTRATOR')) {
    throw new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 });
  }
  return { actor, context } as const;
}

async function requireHrMutationContext(
  transaction: WorkLedgerTransaction,
  identity: AdministrationIdentity,
  at: Instant,
) {
  if (!identity.fresh) {
    throw new WorkLedgerApiError({ code: 'AUTH_SESSION_NOT_FRESH', statusCode: 401 });
  }
  return requireHrReadContext(transaction, identity, at);
}

async function requireSystemReadContext(
  transaction: WorkLedgerTransaction,
  identity: AdministrationIdentity,
  at: Instant,
) {
  const context = await requireContext(transaction, identity, at);
  const localDate = organizationLocalDate(at, context.organization.timeZone);
  const actor = await transaction.authorization.findActor(
    context.organization.id,
    identity.accountId,
    localDate,
  );
  if (actor === null || !actor.roles.includes('SYSTEM_ADMINISTRATOR')) {
    throw new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 });
  }
  return { actor, context } as const;
}

async function requireSystemMutationContext(
  transaction: WorkLedgerTransaction,
  identity: AdministrationIdentity,
  at: Instant,
) {
  if (!identity.fresh) {
    throw new WorkLedgerApiError({ code: 'AUTH_SESSION_NOT_FRESH', statusCode: 401 });
  }
  return requireSystemReadContext(transaction, identity, at);
}

async function requireEmployeeAdministration(
  transaction: WorkLedgerTransaction,
  identity: AdministrationIdentity,
  organizationId: DomainId<'Organization'>,
  employeeId: DomainId<'Employee'>,
  at: Instant,
  action:
    | 'EMPLOYEE_ACCOUNT_MANAGE'
    | 'EMPLOYEE_MANAGE'
    | 'EMPLOYEE_PROFILE_READ'
    | 'EMPLOYEE_ROLE_MANAGE'
    | 'TEAM_MANAGER_ASSIGN',
) {
  const context = await transaction.accountSelfService.findContext(identity.accountId, at);
  if (context === null || !context.accountActive) {
    throw new WorkLedgerApiError({ code: 'AUTH_SESSION_EXPIRED', statusCode: 401 });
  }
  const actor = await transaction.authorization.findActor(
    organizationId,
    identity.accountId,
    organizationLocalDate(at, context.organization.timeZone),
  );
  if (actor === null) throw new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 });
  if (
    !identity.fresh &&
    ['EMPLOYEE_ACCOUNT_MANAGE', 'EMPLOYEE_MANAGE', 'EMPLOYEE_ROLE_MANAGE'].includes(action)
  ) {
    throw new WorkLedgerApiError({ code: 'AUTH_SESSION_NOT_FRESH', statusCode: 401 });
  }
  const decision = authorizeEmployeeTarget({
    action,
    actor,
    isCurrentManager: false,
    sessionFresh: identity.fresh,
    targetEmployeeId: employeeId,
    targetOrganizationId: organizationId,
  });
  if (!decision.allowed) throw new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 });
  return actor;
}

function requireAccountAuthorization(
  actor: AuthorizationActorRecord,
  identity: AdministrationIdentity,
  accountId: DomainId<'Account'>,
  action: 'ACCOUNT_TECHNICAL_MANAGE' | 'SESSION_REVOKE_OTHER' | 'SYSTEM_ROLE_MANAGE',
) {
  const decision = authorizeAccountTarget({
    action,
    actor,
    sessionFresh: identity.fresh,
    targetAccountId: accountId,
  });
  if (!decision.allowed || identity.accountId === accountId) {
    throw new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 });
  }
}

function mapEmployee(
  employee: AdministrationEmployeeRecord,
  localDate: LocalDate,
  privilegedActionsAllowed: boolean,
): EmployeeAdminDetail {
  const history = employee.employmentHistory.map((period) => ({
    endsOn: period.endsOn,
    id: period.id,
    startsOn: period.startsOn,
  }));
  const currentEmployment =
    history.find(
      (period) =>
        period.startsOn <= localDate && (period.endsOn === null || localDate < period.endsOn),
    ) ?? null;
  return Object.freeze({
    account:
      employee.account === null
        ? null
        : {
            active: employee.account.active,
            email: employee.account.email,
            invitationPending: employee.account.invitationPending,
          },
    currentEmployment,
    displayName: employee.displayName,
    employeeNumber: employee.employeeNumber,
    employmentHistory: history,
    id: employee.id,
    privilegedActionsAllowed,
    roles: employee.roles.filter((role): role is 'EMPLOYEE' | 'MANAGER' | 'HR_ADMINISTRATOR' =>
      HR_ROLES.has(role),
    ),
    status: employee.status,
  });
}

function mapEmployeeAssignments(
  assignments: AdministrationEmployeeAssignmentsRecord,
  localDate: LocalDate,
  privilegedActionsAllowed: boolean,
): EmployeeAssignmentAdminDetail {
  return Object.freeze({
    activeTeams: assignments.activeTeams.map(({ active, id, name }) => ({ active, id, name })),
    asOfLocalDate: localDate,
    currentManager: assignments.currentManager,
    currentTeam: assignments.currentTeam,
    eligibleManagers: [...assignments.eligibleManagers],
    managerHistory: [...assignments.managerHistory],
    privilegedActionsAllowed,
    teamHistory: [...assignments.teamHistory],
  });
}

function teamEffectiveHistory(
  employeeId: DomainId<'Employee'>,
  assignments: AdministrationEmployeeAssignmentsRecord,
): readonly EffectiveAssignmentRecord[] {
  return assignments.teamHistory.map((assignment) => ({
    endsOn: assignment.endsOn,
    id: assignment.id,
    startsOn: assignment.startsOn,
    subjectId: employeeId,
    targetId: assignment.team.id,
  }));
}

function managerEffectiveHistory(
  employeeId: DomainId<'Employee'>,
  assignments: AdministrationEmployeeAssignmentsRecord,
): readonly EffectiveAssignmentRecord[] {
  return assignments.managerHistory.map((assignment) => ({
    endsOn: assignment.endsOn,
    id: assignment.id,
    startsOn: assignment.startsOn,
    subjectId: employeeId,
    targetId: assignment.manager.id,
  }));
}

function assignmentPlanningError(
  code:
    | 'EFFECTIVE_ASSIGNMENT_DATE_IN_PAST'
    | 'EFFECTIVE_ASSIGNMENT_HISTORY_INVALID'
    | 'EFFECTIVE_ASSIGNMENT_NO_CHANGE'
    | 'EFFECTIVE_ASSIGNMENT_SAME_DATE_CONFLICT',
) {
  if (
    code === 'EFFECTIVE_ASSIGNMENT_DATE_IN_PAST' ||
    code === 'EFFECTIVE_ASSIGNMENT_SAME_DATE_CONFLICT'
  ) {
    return new WorkLedgerApiError({ code: 'ASSIGNMENT_EFFECTIVE_DATE_INVALID', statusCode: 409 });
  }
  return new WorkLedgerApiError({
    code:
      code === 'EFFECTIVE_ASSIGNMENT_NO_CHANGE' ? 'ASSIGNMENT_STATE_CONFLICT' : 'INTERNAL_ERROR',
    statusCode: code === 'EFFECTIVE_ASSIGNMENT_NO_CHANGE' ? 409 : 503,
  });
}

async function appendAssignmentAudit(
  transaction: WorkLedgerTransaction,
  actor: AuthorizationActorRecord,
  organizationId: DomainId<'Organization'>,
  employeeId: DomainId<'Employee'>,
  assignmentId: string,
  effectiveDate: LocalDate,
  nextStatus: 'ASSIGNED' | 'UNASSIGNED',
  actionCode: 'MANAGER_ASSIGNMENT_CHANGED' | 'TEAM_ASSIGNMENT_CHANGED',
  occurredAt: Instant,
  requestId: DomainId<'Request'>,
) {
  await transaction.audit.appendDomain({
    actionCode,
    actor: auditActor(actor, 'HR_ADMINISTRATOR'),
    facts: { effectiveDate, nextStatus },
    occurredAt,
    organizationId,
    outcome: 'SUCCESS',
    privileged: true,
    reasonCode: null,
    requestId,
    restrictedReasonId: null,
    subjectEmployeeId: employeeId,
    targetId: assignmentId,
    targetKind: 'ASSIGNMENT',
  });
}

function mapSystemAccount(
  account: AdministrationSystemAccountRecord,
  actorAccountId: DomainId<'Account'>,
) {
  return Object.freeze({
    active: account.active,
    employeeLinked: account.employeeLinked,
    email: account.email,
    id: account.id,
    invitationPending: account.invitationPending,
    name: account.name,
    privilegedActionsAllowed: account.id !== actorAccountId,
    sessions: account.sessions.map((session) => ({
      createdAt: session.createdAt,
      deviceSummary: summarizeUserAgent(session.userAgent),
      expiresAt: session.expiresAt,
      id: session.id,
      lastActiveAt: session.lastActiveAt,
    })),
    systemAdministrator: account.systemAdministrator,
  });
}

function parseLocalDateInput(value: string): LocalDate {
  return value as LocalDate;
}

function auditActor(actor: AuthorizationActorRecord, role: ApplicationRole) {
  return Object.freeze({ accountId: actor.accountId, kind: 'ACCOUNT' as const, role });
}

function actionResult(
  action: AdministrationActionResult['action'],
  targetId: string,
  occurredAt: Instant,
): AdministrationActionResult {
  return Object.freeze({ action, occurredAt, targetId });
}

function pagination(page: number, limit: number, total: number) {
  return Object.freeze({
    limit,
    page,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  });
}

function invitationToken(): string {
  return randomBytes(32).toString('base64url');
}

function invitationIdentifier(token: string): string {
  return `workledger-invitation:${token}`;
}

function invitationExpiry(at: Instant): Instant {
  const parsed = parseInstant(
    new Date(new Date(at).getTime() + INVITATION_LIFETIME_MILLISECONDS).toISOString(),
  );
  if (!parsed.ok) throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
  return parsed.value;
}

function organizationLocalDate(at: Instant, timeZoneValue: string): LocalDate {
  const timeZone = parseTimeZoneId(timeZoneValue);
  if (!timeZone.ok) throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
  return localDateAtInstant(at, timeZone.value);
}

async function deliverInvitation(
  sender: AccountInvitationSender,
  recipient: Readonly<{ email: string; name: string }>,
  token: string,
  canonicalOrigin: string,
): Promise<void> {
  const activationUrl = new URL('/activate-account', canonicalOrigin);
  activationUrl.searchParams.set('token', token);
  try {
    await sender({ activationUrl, email: recipient.email, name: recipient.name });
  } catch {
    process.stderr.write(
      '[workledger] Invitation delivery failed after the protected grant was persisted.\n',
    );
  }
}

function mapAdministrationDatabaseError(error: unknown): Error {
  const code = databaseErrorField(error, 'code');
  const constraint = databaseErrorField(error, 'constraint');
  if (code === '23505' && constraint === 'auth_users_email_uidx') {
    return new WorkLedgerApiError({ code: 'ACCOUNT_EMAIL_ALREADY_EXISTS', statusCode: 409 });
  }
  if (code === '23505' && constraint === 'employees_organization_employee_number_uidx') {
    return new WorkLedgerApiError({ code: 'EMPLOYEE_NUMBER_ALREADY_EXISTS', statusCode: 409 });
  }
  if (code === '23505' && constraint === 'teams_organization_name_uidx') {
    return new WorkLedgerApiError({ code: 'TEAM_NAME_ALREADY_EXISTS', statusCode: 409 });
  }
  if (code === '23P01' && constraint === 'employment_periods_no_overlap') {
    return new WorkLedgerApiError({ code: 'EMPLOYMENT_PERIOD_OVERLAP', statusCode: 409 });
  }
  if (
    code === '23P01' &&
    ['manager_assignments_no_overlap', 'team_assignments_no_overlap'].includes(constraint ?? '')
  ) {
    return new WorkLedgerApiError({ code: 'ASSIGNMENT_STATE_CONFLICT', statusCode: 409 });
  }
  return error instanceof Error
    ? error
    : new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
}

function databaseErrorField(error: unknown, field: 'code' | 'constraint'): string | undefined {
  let current = error;
  for (let depth = 0; depth < 5; depth += 1) {
    if (typeof current !== 'object' || current === null) return undefined;
    const record = current as Record<string, unknown>;
    if (typeof record[field] === 'string') return record[field];
    current = 'cause' in current ? current.cause : undefined;
  }
  return undefined;
}

const serializableRetry = Object.freeze({
  isolationLevel: 'serializable' as const,
  retry: { maxAttempts: 3, mode: 'DATABASE_ONLY' as const },
});

export function parseAdministrationIdentity(
  accountId: string,
  fresh: boolean,
): AdministrationIdentity {
  const parsed = parseDomainId<'Account'>(accountId);
  if (!parsed.ok) throw new WorkLedgerApiError({ code: 'AUTH_SESSION_EXPIRED', statusCode: 401 });
  return Object.freeze({ accountId: parsed.value, fresh });
}

export function parseAdministrationId<Entity extends string>(value: string): DomainId<Entity> {
  const parsed = parseDomainId<Entity>(value);
  if (!parsed.ok) throw new WorkLedgerApiError({ code: 'VALIDATION_FAILED', statusCode: 422 });
  return parsed.value;
}

export function parseAdministrationInstant(value: string): Instant {
  const parsed = parseInstant(value);
  if (!parsed.ok) throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
  return parsed.value;
}
