import type { DomainId } from '@workledger/domain';
import type {
  ApplicationRole,
  AuthorizationActorRecord,
  EmployeeAuthorizationScope,
} from '@workledger/database';

export type EmployeeTargetAction =
  | 'ABSENCE_CANCEL_DECIDE'
  | 'ABSENCE_CANCEL_REQUEST'
  | 'ABSENCE_DECIDE'
  | 'ABSENCE_REQUEST'
  | 'ABSENCE_READ'
  | 'APPROVAL_INBOX_READ'
  | 'ASSIGNED_CONFIGURATION_READ'
  | 'ATTENDANCE_ADJUST'
  | 'ATTENDANCE_CLOCK'
  | 'ATTENDANCE_READ'
  | 'CORRECTION_DECIDE'
  | 'CORRECTION_READ'
  | 'CORRECTION_SUBMIT'
  | 'DOMAIN_HISTORY_READ'
  | 'EMPLOYEE_ACCOUNT_MANAGE'
  | 'EMPLOYEE_CONFIGURATION_ASSIGN'
  | 'EMPLOYEE_MANAGE'
  | 'EMPLOYEE_PROFILE_READ'
  | 'EMPLOYEE_ROLE_MANAGE'
  | 'ENTITLEMENT_ADJUST'
  | 'LEAVE_BALANCE_READ'
  | 'MONTHLY_PERIOD_DECIDE'
  | 'MONTHLY_PERIOD_LOCK'
  | 'MONTHLY_PERIOD_READ'
  | 'MONTHLY_PERIOD_SUBMIT'
  | 'PERSONAL_CALENDAR_READ'
  | 'POST_LOCK_ADJUST'
  | 'POST_LOCK_REQUEST'
  | 'RECORD_EXPORT'
  | 'REPORT_PENDING_RUN'
  | 'REPORT_TIME_RUN'
  | 'SICKNESS_READ'
  | 'TEAM_AVAILABILITY_READ'
  | 'TEAM_MANAGER_ASSIGN'
  | 'TIME_BALANCE_READ'
  | 'TIME_LEDGER_ADJUST';

export type AccountTargetAction =
  | 'ACCOUNT_TECHNICAL_MANAGE'
  | 'SESSION_READ'
  | 'SESSION_REVOKE_CURRENT'
  | 'SESSION_REVOKE_OTHER'
  | 'SYSTEM_ROLE_MANAGE';

export type InstallationAction =
  | 'NOTIFICATION_DELIVERY_READ'
  | 'NOTIFICATION_SELF_READ'
  | 'ORGANIZATION_CONFIGURATION_MANAGE'
  | 'ORGANIZATION_TIMEZONE_CORRECT'
  | 'SECURITY_AUDIT_READ'
  | 'TECHNICAL_OPERATIONS_MANAGE';

export type AuthorizationGrantScope = 'ORGANIZATION_HR' | 'REPORTS_LIMITED' | 'SELF' | 'TECHNICAL';

export type AuthorizationDecision =
  | Readonly<{ allowed: false; code: 'ACCESS_DENIED' }>
  | Readonly<{ allowed: true; scope: AuthorizationGrantScope }>;

type EmployeeRule = Readonly<{
  fresh?: true;
  hr?: true;
  reports?: true;
  self?: true;
  selfProhibitedForPrivileged?: true;
}>;

const EMPLOYEE_RULES: Readonly<Record<EmployeeTargetAction, EmployeeRule>> = Object.freeze({
  ABSENCE_CANCEL_DECIDE: { hr: true, reports: true, selfProhibitedForPrivileged: true },
  ABSENCE_CANCEL_REQUEST: { self: true },
  ABSENCE_DECIDE: { hr: true, reports: true, selfProhibitedForPrivileged: true },
  ABSENCE_REQUEST: { self: true },
  ABSENCE_READ: { hr: true, reports: true, self: true },
  APPROVAL_INBOX_READ: { hr: true, reports: true },
  ASSIGNED_CONFIGURATION_READ: { hr: true, reports: true, self: true },
  ATTENDANCE_ADJUST: { hr: true, selfProhibitedForPrivileged: true },
  ATTENDANCE_CLOCK: { self: true },
  ATTENDANCE_READ: { hr: true, reports: true, self: true },
  CORRECTION_DECIDE: { hr: true, reports: true, selfProhibitedForPrivileged: true },
  CORRECTION_READ: { hr: true, reports: true, self: true },
  CORRECTION_SUBMIT: { self: true },
  DOMAIN_HISTORY_READ: { hr: true, reports: true, self: true },
  EMPLOYEE_ACCOUNT_MANAGE: { fresh: true, hr: true, selfProhibitedForPrivileged: true },
  EMPLOYEE_CONFIGURATION_ASSIGN: { hr: true, selfProhibitedForPrivileged: true },
  EMPLOYEE_MANAGE: { hr: true, selfProhibitedForPrivileged: true },
  EMPLOYEE_PROFILE_READ: { hr: true, reports: true, self: true },
  EMPLOYEE_ROLE_MANAGE: { fresh: true, hr: true, selfProhibitedForPrivileged: true },
  ENTITLEMENT_ADJUST: { hr: true, selfProhibitedForPrivileged: true },
  LEAVE_BALANCE_READ: { hr: true, reports: true, self: true },
  MONTHLY_PERIOD_DECIDE: { hr: true, reports: true, selfProhibitedForPrivileged: true },
  MONTHLY_PERIOD_LOCK: { hr: true, reports: true, selfProhibitedForPrivileged: true },
  MONTHLY_PERIOD_READ: { hr: true, reports: true, self: true },
  MONTHLY_PERIOD_SUBMIT: { self: true },
  PERSONAL_CALENDAR_READ: { self: true },
  POST_LOCK_ADJUST: { hr: true, selfProhibitedForPrivileged: true },
  POST_LOCK_REQUEST: { self: true },
  RECORD_EXPORT: { hr: true, reports: true, self: true },
  REPORT_PENDING_RUN: { hr: true, reports: true },
  REPORT_TIME_RUN: { hr: true, reports: true, self: true },
  SICKNESS_READ: { hr: true, reports: true, self: true },
  TEAM_AVAILABILITY_READ: { hr: true, reports: true },
  TEAM_MANAGER_ASSIGN: { hr: true, selfProhibitedForPrivileged: true },
  TIME_BALANCE_READ: { hr: true, reports: true, self: true },
  TIME_LEDGER_ADJUST: { hr: true, selfProhibitedForPrivileged: true },
});

const denied = Object.freeze({ allowed: false, code: 'ACCESS_DENIED' } as const);

export function authorizeEmployeeTarget(
  input: Readonly<{
    action: EmployeeTargetAction;
    actor: AuthorizationActorRecord;
    isCurrentManager: boolean;
    sessionFresh: boolean;
    targetEmployeeId: DomainId<'Employee'>;
    targetOrganizationId: DomainId<'Organization'>;
  }>,
): AuthorizationDecision {
  const { actor, targetEmployeeId, targetOrganizationId } = input;
  if (!actor.accountActive || actor.organizationId !== targetOrganizationId) return denied;

  const rule = EMPLOYEE_RULES[input.action];
  if (rule.fresh && !input.sessionFresh) return denied;
  const isSelf = actor.employeeId === targetEmployeeId;
  if (rule.self && isSelf && actor.employeeCapabilityActive && hasEmployeeSelfRole(actor.roles)) {
    return Object.freeze({ allowed: true, scope: 'SELF' });
  }
  if (
    rule.reports &&
    !isSelf &&
    input.isCurrentManager &&
    actor.employeeCapabilityActive &&
    actor.roles.includes('MANAGER')
  ) {
    return Object.freeze({ allowed: true, scope: 'REPORTS_LIMITED' });
  }
  if (
    rule.hr &&
    actor.roles.includes('HR_ADMINISTRATOR') &&
    !(rule.selfProhibitedForPrivileged && isSelf)
  ) {
    return Object.freeze({ allowed: true, scope: 'ORGANIZATION_HR' });
  }
  return denied;
}

export function employeeCollectionScope(
  action: EmployeeTargetAction,
  actor: AuthorizationActorRecord,
): EmployeeAuthorizationScope | null {
  if (!actor.accountActive) return null;
  const rule = EMPLOYEE_RULES[action];
  if (rule.hr && actor.roles.includes('HR_ADMINISTRATOR')) return 'ORGANIZATION';
  const self = rule.self && actor.employeeCapabilityActive && hasEmployeeSelfRole(actor.roles);
  const reports = rule.reports && actor.employeeCapabilityActive && actor.roles.includes('MANAGER');
  if (self && reports) return 'SELF_AND_REPORTS';
  if (reports) return 'REPORTS';
  if (self) return 'SELF';
  return null;
}

export function authorizeAccountTarget(
  input: Readonly<{
    action: AccountTargetAction;
    actor: AuthorizationActorRecord;
    sessionFresh: boolean;
    targetAccountId: DomainId<'Account'>;
  }>,
): AuthorizationDecision {
  if (!input.actor.accountActive) return denied;
  const isSelf = input.actor.accountId === input.targetAccountId;
  if ((input.action === 'SESSION_READ' || input.action === 'SESSION_REVOKE_CURRENT') && isSelf) {
    return Object.freeze({ allowed: true, scope: 'SELF' });
  }
  if (input.action === 'SESSION_REVOKE_OTHER' && isSelf && input.sessionFresh) {
    return Object.freeze({ allowed: true, scope: 'SELF' });
  }
  if (!input.actor.roles.includes('SYSTEM_ADMINISTRATOR')) return denied;
  if (input.action === 'SESSION_REVOKE_CURRENT') return denied;
  if (
    ['ACCOUNT_TECHNICAL_MANAGE', 'SESSION_REVOKE_OTHER', 'SYSTEM_ROLE_MANAGE'].includes(
      input.action,
    ) &&
    !input.sessionFresh
  ) {
    return denied;
  }
  if (input.action === 'SYSTEM_ROLE_MANAGE' && isSelf) return denied;
  return Object.freeze({ allowed: true, scope: 'TECHNICAL' });
}

export function authorizeInstallationAction(
  action: InstallationAction,
  actor: AuthorizationActorRecord,
): AuthorizationDecision {
  if (!actor.accountActive) return denied;
  if (action === 'NOTIFICATION_SELF_READ') {
    return Object.freeze({ allowed: true, scope: 'SELF' });
  }
  if (
    action === 'ORGANIZATION_CONFIGURATION_MANAGE' ||
    action === 'ORGANIZATION_TIMEZONE_CORRECT'
  ) {
    return actor.roles.includes('HR_ADMINISTRATOR')
      ? Object.freeze({ allowed: true, scope: 'ORGANIZATION_HR' })
      : denied;
  }
  return actor.roles.includes('SYSTEM_ADMINISTRATOR')
    ? Object.freeze({ allowed: true, scope: 'TECHNICAL' })
    : denied;
}

function hasEmployeeSelfRole(roles: readonly ApplicationRole[]): boolean {
  return roles.some((role) => ['EMPLOYEE', 'HR_ADMINISTRATOR', 'MANAGER'].includes(role));
}
