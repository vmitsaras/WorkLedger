import type {
  DomainAuditPage,
  DomainAuditQuery as DomainAuditPageQuery,
} from '@workledger/contracts';
import {
  localDateAtInstant,
  parseTimeZoneId,
  type DomainId,
  type Instant,
  type LocalDate,
} from '@workledger/domain';
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
import { WorkLedgerApiError } from '../http/errors.js';

type DeniedAuditQuery = Readonly<{ allowed: false; code: 'ACCESS_DENIED' }>;
type AllowedAuditQuery<Event> = Readonly<{
  allowed: true;
  events: readonly Event[];
  scope: AuthorizationGrantScope;
}>;

export type DomainAuditQueryResult = DeniedAuditQuery | AllowedAuditQuery<DomainAuditEventRecord>;
export type SecurityAuditQueryResult =
  DeniedAuditQuery | AllowedAuditQuery<SecurityAuditEventRecord>;

export type EmployeeDomainAuditQuery = Readonly<{
  accountId: DomainId<'Account'>;
  limit: number;
  localDate: LocalDate;
  offset: number;
  organizationId: DomainId<'Organization'>;
  sessionFresh: boolean;
  subjectEmployeeId: DomainId<'Employee'>;
}>;
export type DomainAuditQuery = EmployeeDomainAuditQuery;

export type SecurityAuditQuery = Readonly<{
  accountId: DomainId<'Account'>;
  limit: number;
  localDate: LocalDate;
  offset: number;
  organizationId: DomainId<'Organization'>;
}>;

export type DomainAuditIdentity = Readonly<{
  accountId: DomainId<'Account'>;
}>;

export function createAuditService(database: WorkLedgerDatabase) {
  return Object.freeze({
    async listDomain(
      identity: DomainAuditIdentity,
      query: DomainAuditPageQuery,
      at: Instant,
    ): Promise<DomainAuditPage> {
      return database.transaction(async (transaction) => {
        const context = await transaction.accountSelfService.findContext(identity.accountId, at);
        if (context === null || !context.accountActive)
          throw auditError('AUTH_SESSION_EXPIRED', 401);
        const zone = parseTimeZoneId(context.organization.timeZone);
        if (!zone.ok) throw auditError('INTERNAL_ERROR', 503);
        const localDate = localDateAtInstant(at, zone.value);
        const actor = await transaction.authorization.findActor(
          context.organization.id,
          identity.accountId,
          localDate,
        );
        if (actor === null || !authorizeInstallationAction('DOMAIN_AUDIT_READ', actor).allowed)
          throw auditError('ACCESS_DENIED', 403);
        const page = await transaction.audit.listDomain({
          action: query.action ?? null,
          from: (query.from as LocalDate | undefined) ?? null,
          limit: query.limit,
          offset: (query.page - 1) * query.limit,
          organizationId: context.organization.id,
          outcome: query.outcome ?? null,
          targetKind: query.targetKind ?? null,
          timeZone: context.organization.timeZone,
          to: (query.to as LocalDate | undefined) ?? null,
        });
        return Object.freeze({
          items: page.items.map((event) => ({
            action: event.actionCode,
            actor:
              event.actor.kind === 'ACCOUNT'
                ? { kind: 'ACCOUNT' as const, role: event.actor.role }
                : { kind: 'SYSTEM' as const, process: event.actor.systemProcess },
            facts: { ...event.facts },
            id: event.id,
            occurredAt: event.occurredAt,
            outcome: event.outcome,
            privileged: event.privileged,
            reasonCode: event.reasonCode,
            targetKind: event.targetKind,
            targetReference: event.targetId,
          })),
          pagination: {
            limit: query.limit,
            page: query.page,
            total: page.total,
            totalPages: page.total === 0 ? 0 : Math.ceil(page.total / query.limit),
          },
        });
      });
    },
    async listDomainForEmployee(input: EmployeeDomainAuditQuery): Promise<DomainAuditQueryResult> {
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

function auditError(
  code: 'ACCESS_DENIED' | 'AUTH_SESSION_EXPIRED' | 'INTERNAL_ERROR',
  statusCode: 401 | 403 | 503,
) {
  return new WorkLedgerApiError({ code, statusCode });
}
