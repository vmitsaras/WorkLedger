import type { DomainId, LocalDate } from '@workledger/domain';
import type {
  DomainAuditEventRecord,
  SecurityAuditEventRecord,
  WorkLedgerDatabase,
} from '@workledger/database';

import {
  authorizeEmployeeTarget,
  authorizeInstallationAction,
  type AuthorizationGrantScope,
} from '../authorization/policy.js';

type DeniedAuditQuery = Readonly<{ allowed: false; code: 'ACCESS_DENIED' }>;
type AllowedAuditQuery<Event> = Readonly<{
  allowed: true;
  events: readonly Event[];
  scope: AuthorizationGrantScope;
}>;

export type DomainAuditQueryResult = DeniedAuditQuery | AllowedAuditQuery<DomainAuditEventRecord>;
export type SecurityAuditQueryResult =
  DeniedAuditQuery | AllowedAuditQuery<SecurityAuditEventRecord>;

export type DomainAuditQuery = Readonly<{
  accountId: DomainId<'Account'>;
  limit: number;
  localDate: LocalDate;
  offset: number;
  organizationId: DomainId<'Organization'>;
  sessionFresh: boolean;
  subjectEmployeeId: DomainId<'Employee'>;
}>;

export type SecurityAuditQuery = Readonly<{
  accountId: DomainId<'Account'>;
  limit: number;
  localDate: LocalDate;
  offset: number;
  organizationId: DomainId<'Organization'>;
}>;

export function createAuditService(database: WorkLedgerDatabase) {
  return Object.freeze({
    async listDomainForEmployee(input: DomainAuditQuery): Promise<DomainAuditQueryResult> {
      return database.transaction(async (transaction) => {
        const actor = await transaction.authorization.findActor(
          input.organizationId,
          input.accountId,
          input.localDate,
        );
        if (actor === null) return denied;
        const isCurrentManager =
          actor.employeeId === null
            ? false
            : await transaction.authorization.isCurrentManager(
                input.organizationId,
                actor.employeeId,
                input.subjectEmployeeId,
                input.localDate,
              );
        const decision = authorizeEmployeeTarget({
          action: 'DOMAIN_HISTORY_READ',
          actor,
          isCurrentManager,
          sessionFresh: input.sessionFresh,
          targetEmployeeId: input.subjectEmployeeId,
          targetOrganizationId: input.organizationId,
        });
        if (!decision.allowed) return denied;
        const events = await transaction.audit.listDomainForEmployee({
          limit: input.limit,
          offset: input.offset,
          organizationId: input.organizationId,
          subjectEmployeeId: input.subjectEmployeeId,
        });
        return Object.freeze({ allowed: true, events, scope: decision.scope });
      });
    },

    async listSecurity(input: SecurityAuditQuery): Promise<SecurityAuditQueryResult> {
      return database.transaction(async (transaction) => {
        const actor = await transaction.authorization.findActor(
          input.organizationId,
          input.accountId,
          input.localDate,
        );
        if (actor === null) return denied;
        const decision = authorizeInstallationAction('SECURITY_AUDIT_READ', actor);
        if (!decision.allowed) return denied;
        const events = await transaction.audit.listSecurity({
          limit: input.limit,
          offset: input.offset,
          organizationId: input.organizationId,
        });
        return Object.freeze({ allowed: true, events, scope: decision.scope });
      });
    },
  });
}

const denied = Object.freeze({ allowed: false, code: 'ACCESS_DENIED' } as const);
