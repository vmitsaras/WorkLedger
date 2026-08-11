import type { NavigationArea, SelfContext, SelfProfile } from '@workledger/contracts';
import { parseDomainId, parseInstant, type DomainId, type Instant } from '@workledger/domain';
import type {
  AccountSelfContextRecord,
  AccountSessionRecord,
  WorkLedgerDatabase,
} from '@workledger/database';

import { authorizeAccountTarget } from '../authorization/policy.js';
import { WorkLedgerApiError } from '../http/errors.js';

export type SelfServiceIdentity = Readonly<{
  accountId: DomainId<'Account'>;
  currentSessionId: DomainId<'Session'>;
  fresh: boolean;
}>;

export interface AccountSelfService {
  getContext(identity: SelfServiceIdentity, at: Instant): Promise<SelfContext>;
  getProfile(identity: SelfServiceIdentity, at: Instant): Promise<SelfProfile>;
  revokeSession(
    identity: SelfServiceIdentity,
    input: Readonly<{
      at: Instant;
      requestId: DomainId<'Request'>;
      sessionId: DomainId<'Session'>;
    }>,
  ): Promise<Readonly<{ revokedCurrentSession: boolean; revokedSessionId: string }>>;
}

export function createAccountSelfService(database: WorkLedgerDatabase): AccountSelfService {
  const service: AccountSelfService = {
    async getContext(identity, at) {
      return database.transaction(async (transaction) => {
        const context = await transaction.accountSelfService.findContext(identity.accountId, at);
        return mapSelfContext(requireActiveContext(context));
      });
    },

    async getProfile(identity, at) {
      return database.transaction(async (transaction) => {
        const context = requireActiveContext(
          await transaction.accountSelfService.findContext(identity.accountId, at),
        );
        const sessions = await transaction.accountSelfService.listActiveSessions(
          identity.accountId,
          at,
        );
        return Object.freeze({
          ...mapSelfContext(context),
          sessions: sessions.map((session) => mapSession(session, identity.currentSessionId)),
        });
      });
    },

    async revokeSession(identity, input) {
      return database.transaction(async (transaction) => {
        const context = requireActiveContext(
          await transaction.accountSelfService.findContext(identity.accountId, input.at),
        );
        const targetSession = await transaction.accountSelfService.lockSession(
          identity.accountId,
          input.sessionId,
        );
        if (targetSession === null) {
          throw new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 });
        }

        const revokedCurrentSession = targetSession.id === identity.currentSessionId;
        const decision = authorizeAccountTarget({
          action: revokedCurrentSession ? 'SESSION_REVOKE_CURRENT' : 'SESSION_REVOKE_OTHER',
          actor: {
            accountActive: context.accountActive,
            accountId: context.accountId,
            employeeCapabilityActive: context.employeeCapabilityActive,
            employeeId: context.employee?.id ?? null,
            organizationId: context.organization.id,
            roles: context.roles,
          },
          sessionFresh: identity.fresh,
          targetAccountId: identity.accountId,
        });
        if (!decision.allowed) {
          throw new WorkLedgerApiError({
            code: revokedCurrentSession ? 'ACCESS_DENIED' : 'AUTH_SESSION_NOT_FRESH',
            statusCode: revokedCurrentSession ? 403 : 401,
          });
        }

        const deleted = await transaction.accountSelfService.deleteSession(
          identity.accountId,
          targetSession.id,
        );
        if (!deleted) {
          throw new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 });
        }
        await transaction.audit.appendSecurity({
          actionCode: 'SESSION_SELF_REVOKED',
          actor: { accountId: identity.accountId, kind: 'ACCOUNT', role: null },
          facts: { sessionId: targetSession.id, scope: 'SELF' },
          occurredAt: input.at,
          organizationId: context.organization.id,
          outcome: 'SUCCESS',
          privileged: false,
          reasonCode: null,
          requestId: input.requestId,
          targetAccountId: identity.accountId,
          targetId: targetSession.id,
          targetKind: 'SESSION',
        });

        return Object.freeze({
          revokedCurrentSession,
          revokedSessionId: targetSession.id,
        });
      });
    },
  };
  return Object.freeze(service);
}

function requireActiveContext(context: AccountSelfContextRecord | null): AccountSelfContextRecord {
  if (context === null || !context.accountActive) {
    throw new WorkLedgerApiError({ code: 'AUTH_SESSION_EXPIRED', statusCode: 401 });
  }
  return context;
}

function mapSelfContext(context: AccountSelfContextRecord): SelfContext {
  const navigationAreas = navigationAreasFor(context);
  return Object.freeze({
    account: Object.freeze({ email: context.email, name: context.name }),
    defaultPath: defaultPathFor(navigationAreas),
    employee:
      context.employee === null
        ? null
        : Object.freeze({
            displayName: context.employee.displayName,
            employeeNumber: context.employee.employeeNumber,
            status: context.employee.status,
          }),
    navigationAreas,
    organization: Object.freeze({ name: context.organization.name }),
    roles: [...context.roles],
  });
}

function navigationAreasFor(context: AccountSelfContextRecord): NavigationArea[] {
  const areas: NavigationArea[] = [];
  const hasEmployeeSelfRole = context.roles.some((role) =>
    ['EMPLOYEE', 'MANAGER', 'HR_ADMINISTRATOR'].includes(role),
  );
  if (context.employeeCapabilityActive && hasEmployeeSelfRole) areas.push('EMPLOYEE');
  if (context.employeeCapabilityActive && context.roles.includes('MANAGER')) areas.push('MANAGER');
  if (context.roles.includes('HR_ADMINISTRATOR')) areas.push('HR');
  if (context.roles.includes('SYSTEM_ADMINISTRATOR')) areas.push('SYSTEM');
  return areas;
}

function defaultPathFor(navigationAreas: readonly NavigationArea[]): SelfContext['defaultPath'] {
  if (navigationAreas.includes('EMPLOYEE')) return '/today';
  if (navigationAreas.includes('HR')) return '/employees';
  if (navigationAreas.includes('SYSTEM')) return '/system/operations';
  return '/profile';
}

function mapSession(
  session: AccountSessionRecord,
  currentSessionId: DomainId<'Session'>,
): SelfProfile['sessions'][number] {
  return Object.freeze({
    createdAt: session.createdAt,
    current: session.id === currentSessionId,
    deviceSummary: summarizeUserAgent(session.userAgent),
    expiresAt: session.expiresAt,
    id: session.id,
    lastActiveAt: session.lastActiveAt,
  });
}

export function summarizeUserAgent(userAgent: string | null): string {
  if (userAgent === null || userAgent.trim() === '') return 'Unrecognized device';

  const browser = /Edg\//u.test(userAgent)
    ? 'Edge'
    : /Firefox\//u.test(userAgent)
      ? 'Firefox'
      : /(?:Chrome|CriOS)\//u.test(userAgent)
        ? 'Chrome'
        : /Safari\//u.test(userAgent)
          ? 'Safari'
          : 'Browser';
  const platform = /(?:iPhone|iPad)/u.test(userAgent)
    ? 'iOS'
    : /Android/u.test(userAgent)
      ? 'Android'
      : /Macintosh|Mac OS X/u.test(userAgent)
        ? 'macOS'
        : /Windows/u.test(userAgent)
          ? 'Windows'
          : /Linux/u.test(userAgent)
            ? 'Linux'
            : null;

  return platform === null ? browser : `${browser} on ${platform}`;
}

export function parseSelfServiceIdentity(
  input: Readonly<{
    accountId: string;
    currentSessionId: string;
    fresh: boolean;
  }>,
): SelfServiceIdentity {
  const accountId = parseDomainId<'Account'>(input.accountId);
  const currentSessionId = parseDomainId<'Session'>(input.currentSessionId);
  if (!accountId.ok || !currentSessionId.ok) {
    throw new WorkLedgerApiError({ code: 'AUTH_SESSION_EXPIRED', statusCode: 401 });
  }
  return Object.freeze({
    accountId: accountId.value,
    currentSessionId: currentSessionId.value,
    fresh: input.fresh,
  });
}

export function parseRequestInstant(value: string): Instant {
  const parsed = parseInstant(value);
  if (!parsed.ok) throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
  return parsed.value;
}

export function parseRequestIdentifier<Entity extends string>(value: string): DomainId<Entity> {
  const parsed = parseDomainId<Entity>(value);
  if (!parsed.ok) throw new WorkLedgerApiError({ code: 'VALIDATION_FAILED', statusCode: 422 });
  return parsed.value;
}
