import type { DomainId, LocalDate } from '@workledger/domain';
import type { EmployeeAuthorizationScope, WorkLedgerDatabase } from '@workledger/database';

import {
  authorizeAccountTarget,
  authorizeEmployeeTarget,
  authorizeInstallationAction,
  employeeCollectionScope,
  type AccountTargetAction,
  type AuthorizationDecision,
  type EmployeeTargetAction,
  type InstallationAction,
} from './policy.js';

export type EmployeeAuthorizationRequest = Readonly<{
  accountId: DomainId<'Account'>;
  action: EmployeeTargetAction;
  localDate: LocalDate;
  organizationId: DomainId<'Organization'>;
  sessionFresh: boolean;
  targetEmployeeId: DomainId<'Employee'>;
  targetOrganizationId: DomainId<'Organization'>;
}>;

export type AuthorizedEmployeeCollection =
  | Readonly<{ allowed: false; code: 'ACCESS_DENIED' }>
  | Readonly<{
      allowed: true;
      employeeIds: readonly DomainId<'Employee'>[];
      scope: EmployeeAuthorizationScope;
    }>;

export interface AuthorizationService {
  authorizeAccount(
    input: Readonly<{
      accountId: DomainId<'Account'>;
      action: AccountTargetAction;
      localDate: LocalDate;
      organizationId: DomainId<'Organization'>;
      sessionFresh: boolean;
      targetAccountId: DomainId<'Account'>;
    }>,
  ): Promise<AuthorizationDecision>;
  authorizeEmployee(input: EmployeeAuthorizationRequest): Promise<AuthorizationDecision>;
  authorizeInstallation(
    input: Readonly<{
      accountId: DomainId<'Account'>;
      action: InstallationAction;
      localDate: LocalDate;
      organizationId: DomainId<'Organization'>;
    }>,
  ): Promise<AuthorizationDecision>;
  listAuthorizedEmployeeIds(
    input: Readonly<{
      accountId: DomainId<'Account'>;
      action: EmployeeTargetAction;
      limit: number;
      localDate: LocalDate;
      offset: number;
      organizationId: DomainId<'Organization'>;
    }>,
  ): Promise<AuthorizedEmployeeCollection>;
}

const denied = Object.freeze({ allowed: false, code: 'ACCESS_DENIED' } as const);

export function createAuthorizationService(database: WorkLedgerDatabase): AuthorizationService {
  return Object.freeze({
    authorizeAccount: (input: Parameters<AuthorizationService['authorizeAccount']>[0]) =>
      database.transaction(async (transaction) => {
        const actor = await transaction.authorization.findActor(
          input.organizationId,
          input.accountId,
          input.localDate,
        );
        return actor === null
          ? denied
          : authorizeAccountTarget({
              action: input.action,
              actor,
              sessionFresh: input.sessionFresh,
              targetAccountId: input.targetAccountId,
            });
      }),
    authorizeEmployee: (input: EmployeeAuthorizationRequest) =>
      database.transaction(async (transaction) => {
        const actor = await transaction.authorization.findActor(
          input.organizationId,
          input.accountId,
          input.localDate,
        );
        if (actor === null) return denied;
        const isCurrentManager =
          actor.employeeId !== null &&
          actor.employeeId !== input.targetEmployeeId &&
          (await transaction.authorization.isCurrentManager(
            input.organizationId,
            actor.employeeId,
            input.targetEmployeeId,
            input.localDate,
          ));
        return authorizeEmployeeTarget({
          action: input.action,
          actor,
          isCurrentManager,
          sessionFresh: input.sessionFresh,
          targetEmployeeId: input.targetEmployeeId,
          targetOrganizationId: input.targetOrganizationId,
        });
      }),
    authorizeInstallation: (input: Parameters<AuthorizationService['authorizeInstallation']>[0]) =>
      database.transaction(async (transaction) => {
        const actor = await transaction.authorization.findActor(
          input.organizationId,
          input.accountId,
          input.localDate,
        );
        return actor === null ? denied : authorizeInstallationAction(input.action, actor);
      }),
    listAuthorizedEmployeeIds: (
      input: Parameters<AuthorizationService['listAuthorizedEmployeeIds']>[0],
    ) =>
      database.transaction(async (transaction) => {
        const actor = await transaction.authorization.findActor(
          input.organizationId,
          input.accountId,
          input.localDate,
        );
        if (actor === null) return denied;
        const scope = employeeCollectionScope(input.action, actor);
        if (scope === null) return denied;
        const employeeIds = await transaction.authorization.listAuthorizedEmployeeIds({
          actorEmployeeId: actor.employeeId,
          limit: input.limit,
          localDate: input.localDate,
          offset: input.offset,
          organizationId: input.organizationId,
          scope,
        });
        return Object.freeze({ allowed: true, employeeIds, scope });
      }),
  });
}
