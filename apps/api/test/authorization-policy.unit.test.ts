import { parseDomainId, type DomainId } from '@workledger/domain';
import type { AuthorizationActorRecord } from '@workledger/database';

import {
  ACCOUNT_TARGET_ACTIONS,
  EMPLOYEE_TARGET_ACTIONS,
  INSTALLATION_ACTIONS,
  authorizeAccountTarget,
  authorizeEmployeeTarget,
  authorizeInstallationAction,
  employeeCollectionScope,
  type EmployeeTargetAction,
} from '../src/authorization/policy.js';

const ORGANIZATION_ID = domainId<'Organization'>('00000000-0000-7000-8000-000000000001');
const OTHER_ORGANIZATION_ID = domainId<'Organization'>('00000000-0000-7000-8000-000000000002');
const ACCOUNT_ID = domainId<'Account'>('00000000-0000-7000-8000-000000000003');
const OTHER_ACCOUNT_ID = domainId<'Account'>('00000000-0000-7000-8000-000000000004');
const EMPLOYEE_ID = domainId<'Employee'>('00000000-0000-7000-8000-000000000005');
const REPORT_ID = domainId<'Employee'>('00000000-0000-7000-8000-000000000006');

describe('central WorkLedger authorization policy', () => {
  it('grants employee self actions but denies unrelated and cross-organization targets', () => {
    const actor = createActor({ roles: ['EMPLOYEE'] });

    expect(employeeDecision(actor, 'ATTENDANCE_CLOCK', EMPLOYEE_ID, false)).toEqual({
      allowed: true,
      scope: 'SELF',
    });
    expect(employeeDecision(actor, 'CORRECTION_SUBMIT', EMPLOYEE_ID, false)).toEqual({
      allowed: true,
      scope: 'SELF',
    });
    expect(employeeDecision(actor, 'ATTENDANCE_READ', REPORT_ID, false)).toEqual({
      allowed: false,
      code: 'ACCESS_DENIED',
    });
    expect(
      authorizeEmployeeTarget({
        action: 'ATTENDANCE_READ',
        actor,
        isCurrentManager: false,
        sessionFresh: true,
        targetEmployeeId: EMPLOYEE_ID,
        targetOrganizationId: OTHER_ORGANIZATION_ID,
      }),
    ).toEqual({ allowed: false, code: 'ACCESS_DENIED' });
  });

  it('requires active employee capability and a current relationship for manager scope', () => {
    const manager = createActor({ roles: ['MANAGER'] });

    expect(employeeDecision(manager, 'CORRECTION_DECIDE', REPORT_ID, true)).toEqual({
      allowed: true,
      scope: 'REPORTS_LIMITED',
    });
    expect(employeeDecision(manager, 'CORRECTION_DECIDE', REPORT_ID, false)).toEqual({
      allowed: false,
      code: 'ACCESS_DENIED',
    });
    expect(
      employeeDecision(
        createActor({ employeeCapabilityActive: false, roles: ['MANAGER'] }),
        'CORRECTION_DECIDE',
        REPORT_ID,
        true,
      ),
    ).toEqual({ allowed: false, code: 'ACCESS_DENIED' });
  });

  it('keeps combined-role self prohibitions stronger than additive grants', () => {
    const combined = createActor({ roles: ['EMPLOYEE', 'MANAGER', 'HR_ADMINISTRATOR'] });

    expect(employeeDecision(combined, 'MONTHLY_PERIOD_LOCK', EMPLOYEE_ID, false)).toEqual({
      allowed: false,
      code: 'ACCESS_DENIED',
    });
    expect(employeeDecision(combined, 'TIME_LEDGER_ADJUST', EMPLOYEE_ID, false)).toEqual({
      allowed: false,
      code: 'ACCESS_DENIED',
    });
    expect(employeeDecision(combined, 'TIME_LEDGER_ADJUST', REPORT_ID, false)).toEqual({
      allowed: true,
      scope: 'ORGANIZATION_HR',
    });
    expect(employeeDecision(combined, 'EMPLOYEE_ROLE_MANAGE', REPORT_ID, false, false)).toEqual({
      allowed: false,
      code: 'ACCESS_DENIED',
    });
  });

  it('applies the resolved monthly reviewer authority and deterministic precedence', () => {
    const manager = createActor({ roles: ['MANAGER'] });
    const hrOnly = createActor({ employeeId: null, roles: ['HR_ADMINISTRATOR'] });
    const combined = createActor({ roles: ['MANAGER', 'HR_ADMINISTRATOR'] });
    const systemAdministrator = createActor({ employeeId: null, roles: ['SYSTEM_ADMINISTRATOR'] });

    expect(employeeDecision(manager, 'MONTHLY_PERIOD_DECIDE', REPORT_ID, true)).toEqual({
      allowed: true,
      scope: 'REPORTS_LIMITED',
    });
    expect(employeeDecision(manager, 'MONTHLY_PERIOD_LOCK', REPORT_ID, false)).toEqual({
      allowed: false,
      code: 'ACCESS_DENIED',
    });
    expect(employeeDecision(hrOnly, 'MONTHLY_PERIOD_DECIDE', REPORT_ID, false)).toEqual({
      allowed: true,
      scope: 'ORGANIZATION_HR',
    });
    expect(employeeDecision(hrOnly, 'MONTHLY_PERIOD_LOCK', REPORT_ID, false)).toEqual({
      allowed: true,
      scope: 'ORGANIZATION_HR',
    });
    expect(employeeDecision(combined, 'MONTHLY_PERIOD_LOCK', REPORT_ID, true)).toEqual({
      allowed: true,
      scope: 'REPORTS_LIMITED',
    });
    expect(employeeDecision(systemAdministrator, 'MONTHLY_PERIOD_LOCK', REPORT_ID, false)).toEqual({
      allowed: false,
      code: 'ACCESS_DENIED',
    });
  });

  it('separates HR configuration from technical account and operations access', () => {
    const hr = createActor({ employeeId: null, roles: ['HR_ADMINISTRATOR'] });
    const systemAdministrator = createActor({ employeeId: null, roles: ['SYSTEM_ADMINISTRATOR'] });

    expect(authorizeInstallationAction('ORGANIZATION_CONFIGURATION_MANAGE', hr)).toEqual({
      allowed: true,
      scope: 'ORGANIZATION_HR',
    });
    expect(authorizeInstallationAction('TECHNICAL_OPERATIONS_MANAGE', hr)).toEqual({
      allowed: false,
      code: 'ACCESS_DENIED',
    });
    expect(authorizeInstallationAction('TECHNICAL_OPERATIONS_MANAGE', systemAdministrator)).toEqual(
      { allowed: true, scope: 'TECHNICAL' },
    );
    expect(employeeDecision(systemAdministrator, 'ATTENDANCE_READ', REPORT_ID, false)).toEqual({
      allowed: false,
      code: 'ACCESS_DENIED',
    });
    expect(
      authorizeAccountTarget({
        action: 'SYSTEM_ROLE_MANAGE',
        actor: systemAdministrator,
        sessionFresh: true,
        targetAccountId: ACCOUNT_ID,
      }),
    ).toEqual({ allowed: false, code: 'ACCESS_DENIED' });
    expect(
      authorizeAccountTarget({
        action: 'SYSTEM_ROLE_MANAGE',
        actor: systemAdministrator,
        sessionFresh: true,
        targetAccountId: OTHER_ACCOUNT_ID,
      }),
    ).toEqual({ allowed: true, scope: 'TECHNICAL' });
  });

  it('derives collection scope before query pagination and denies inactive accounts', () => {
    expect(employeeCollectionScope('ATTENDANCE_READ', createActor({ roles: ['MANAGER'] }))).toBe(
      'SELF_AND_REPORTS',
    );
    expect(
      employeeCollectionScope('ATTENDANCE_READ', createActor({ roles: ['HR_ADMINISTRATOR'] })),
    ).toBe('ORGANIZATION');
    expect(
      employeeCollectionScope(
        'ATTENDANCE_READ',
        createActor({ accountActive: false, roles: ['HR_ADMINISTRATOR'] }),
      ),
    ).toBeNull();
  });

  it('enforces the complete employee-target permission matrix for every registered action', () => {
    const rules = employeeRules();
    const inactive = createActor({ accountActive: false, roles: ['HR_ADMINISTRATOR'] });
    const employee = createActor({ roles: ['EMPLOYEE'] });
    const manager = createActor({ roles: ['MANAGER'] });
    const hrOnly = createActor({ employeeId: null, roles: ['HR_ADMINISTRATOR'] });
    const systemAdministrator = createActor({
      employeeId: null,
      roles: ['SYSTEM_ADMINISTRATOR'],
    });

    expect(Object.keys(rules).sort()).toEqual([...EMPLOYEE_TARGET_ACTIONS].sort());
    for (const action of EMPLOYEE_TARGET_ACTIONS) {
      const rule = rules[action];
      expect(employeeDecision(inactive, action, REPORT_ID, true)).toEqual(denial());
      expect(employeeDecision(systemAdministrator, action, REPORT_ID, true)).toEqual(denial());
      expect(
        authorizeEmployeeTarget({
          action,
          actor: employee,
          isCurrentManager: false,
          sessionFresh: true,
          targetEmployeeId: EMPLOYEE_ID,
          targetOrganizationId: OTHER_ORGANIZATION_ID,
        }),
      ).toEqual(denial());
      expect(employeeDecision(employee, action, EMPLOYEE_ID, false)).toEqual(
        rule.self ? { allowed: true, scope: 'SELF' } : denial(),
      );
      expect(employeeDecision(employee, action, REPORT_ID, false)).toEqual(denial());
      expect(employeeDecision(manager, action, REPORT_ID, true)).toEqual(
        rule.reports ? { allowed: true, scope: 'REPORTS_LIMITED' } : denial(),
      );
      expect(employeeDecision(manager, action, REPORT_ID, false)).toEqual(denial());
      expect(employeeDecision(hrOnly, action, REPORT_ID, false)).toEqual(
        rule.hr ? { allowed: true, scope: 'ORGANIZATION_HR' } : denial(),
      );
      if (rule.fresh) {
        expect(employeeDecision(hrOnly, action, REPORT_ID, false, false)).toEqual(denial());
      }
    }
  });

  it('enforces the complete account-target and installation permission matrices', () => {
    const employee = createActor({ roles: ['EMPLOYEE'] });
    const inactiveSystem = createActor({
      accountActive: false,
      employeeId: null,
      roles: ['SYSTEM_ADMINISTRATOR'],
    });
    const systemAdministrator = createActor({
      employeeId: null,
      roles: ['SYSTEM_ADMINISTRATOR'],
    });

    for (const action of ACCOUNT_TARGET_ACTIONS) {
      expect(
        authorizeAccountTarget({
          action,
          actor: inactiveSystem,
          sessionFresh: true,
          targetAccountId: OTHER_ACCOUNT_ID,
        }),
      ).toEqual(denial());
      expect(
        authorizeAccountTarget({
          action,
          actor: employee,
          sessionFresh: true,
          targetAccountId: OTHER_ACCOUNT_ID,
        }),
      ).toEqual(denial());
    }

    expect(
      ACCOUNT_TARGET_ACTIONS.map((action) =>
        authorizeAccountTarget({
          action,
          actor: systemAdministrator,
          sessionFresh: true,
          targetAccountId: OTHER_ACCOUNT_ID,
        }),
      ),
    ).toEqual([
      { allowed: true, scope: 'TECHNICAL' },
      { allowed: true, scope: 'TECHNICAL' },
      { allowed: false, code: 'ACCESS_DENIED' },
      { allowed: true, scope: 'TECHNICAL' },
      { allowed: true, scope: 'TECHNICAL' },
    ]);
    expect(
      authorizeAccountTarget({
        action: 'SYSTEM_ROLE_MANAGE',
        actor: systemAdministrator,
        sessionFresh: true,
        targetAccountId: ACCOUNT_ID,
      }),
    ).toEqual(denial());
    expect(
      authorizeAccountTarget({
        action: 'SESSION_REVOKE_OTHER',
        actor: systemAdministrator,
        sessionFresh: false,
        targetAccountId: OTHER_ACCOUNT_ID,
      }),
    ).toEqual(denial());

    const installationExpectations = {
      DOMAIN_AUDIT_READ: 'HR',
      NOTIFICATION_DELIVERY_READ: 'TECHNICAL',
      NOTIFICATION_SELF_READ: 'SELF',
      ORGANIZATION_CONFIGURATION_MANAGE: 'HR',
      ORGANIZATION_TIMEZONE_CORRECT: 'HR',
      SECURITY_AUDIT_READ: 'TECHNICAL',
      TECHNICAL_OPERATIONS_MANAGE: 'TECHNICAL',
    } as const satisfies Record<(typeof INSTALLATION_ACTIONS)[number], 'HR' | 'SELF' | 'TECHNICAL'>;
    const hrOnly = createActor({ employeeId: null, roles: ['HR_ADMINISTRATOR'] });
    for (const action of INSTALLATION_ACTIONS) {
      const expectation = installationExpectations[action];
      expect(authorizeInstallationAction(action, inactiveSystem)).toEqual(denial());
      expect(authorizeInstallationAction(action, employee)).toEqual(
        expectation === 'SELF' ? { allowed: true, scope: 'SELF' } : denial(),
      );
      expect(authorizeInstallationAction(action, hrOnly)).toEqual(
        expectation === 'HR'
          ? { allowed: true, scope: 'ORGANIZATION_HR' }
          : expectation === 'SELF'
            ? { allowed: true, scope: 'SELF' }
            : denial(),
      );
      expect(authorizeInstallationAction(action, systemAdministrator)).toEqual(
        expectation === 'TECHNICAL'
          ? { allowed: true, scope: 'TECHNICAL' }
          : expectation === 'SELF'
            ? { allowed: true, scope: 'SELF' }
            : denial(),
      );
    }
  });
});

function employeeRules(): Readonly<
  Record<EmployeeTargetAction, Readonly<{ fresh?: true; hr?: true; reports?: true; self?: true }>>
> {
  return {
    ABSENCE_CANCEL_DECIDE: { hr: true, reports: true },
    ABSENCE_CANCEL_REQUEST: { self: true },
    ABSENCE_DECIDE: { hr: true, reports: true },
    ABSENCE_REQUEST: { self: true },
    ABSENCE_READ: { hr: true, reports: true, self: true },
    APPROVAL_INBOX_READ: { hr: true, reports: true },
    ASSIGNED_CONFIGURATION_READ: { hr: true, reports: true, self: true },
    ATTENDANCE_ADJUST: { hr: true },
    ATTENDANCE_CLOCK: { self: true },
    ATTENDANCE_READ: { hr: true, reports: true, self: true },
    CORRECTION_DECIDE: { hr: true, reports: true },
    CORRECTION_READ: { hr: true, reports: true, self: true },
    CORRECTION_SUBMIT: { self: true },
    DOMAIN_HISTORY_READ: { hr: true, reports: true, self: true },
    EMPLOYEE_ACCOUNT_MANAGE: { fresh: true, hr: true },
    EMPLOYEE_CONFIGURATION_ASSIGN: { hr: true },
    EMPLOYEE_MANAGE: { hr: true },
    EMPLOYEE_PROFILE_READ: { hr: true, reports: true, self: true },
    EMPLOYEE_ROLE_MANAGE: { fresh: true, hr: true },
    ENTITLEMENT_ADJUST: { hr: true },
    LEAVE_BALANCE_READ: { hr: true, reports: true, self: true },
    MONTHLY_PERIOD_DECIDE: { hr: true, reports: true },
    MONTHLY_PERIOD_LOCK: { hr: true, reports: true },
    MONTHLY_PERIOD_READ: { hr: true, reports: true, self: true },
    MONTHLY_PERIOD_SUBMIT: { self: true },
    PERSONAL_CALENDAR_READ: { self: true },
    POST_LOCK_ADJUST: { hr: true },
    POST_LOCK_REQUEST: { self: true },
    RECORD_EXPORT: { hr: true, reports: true, self: true },
    REPORT_PENDING_RUN: { hr: true, reports: true },
    REPORT_TIME_RUN: { hr: true, reports: true, self: true },
    SICKNESS_READ: { hr: true, reports: true, self: true },
    TEAM_AVAILABILITY_READ: { hr: true, reports: true },
    TEAM_MANAGER_ASSIGN: { hr: true },
    TIME_BALANCE_READ: { hr: true, reports: true, self: true },
    TIME_LEDGER_ADJUST: { hr: true },
  };
}

function denial() {
  return { allowed: false, code: 'ACCESS_DENIED' } as const;
}

function employeeDecision(
  actor: AuthorizationActorRecord,
  action: Parameters<typeof authorizeEmployeeTarget>[0]['action'],
  targetEmployeeId: DomainId<'Employee'>,
  isCurrentManager: boolean,
  sessionFresh = true,
) {
  return authorizeEmployeeTarget({
    action,
    actor,
    isCurrentManager,
    sessionFresh,
    targetEmployeeId,
    targetOrganizationId: ORGANIZATION_ID,
  });
}

function createActor(
  overrides: Partial<AuthorizationActorRecord> & Pick<AuthorizationActorRecord, 'roles'>,
): AuthorizationActorRecord {
  return Object.freeze({
    accountActive: overrides.accountActive ?? true,
    accountId: overrides.accountId ?? ACCOUNT_ID,
    employeeCapabilityActive: overrides.employeeCapabilityActive ?? overrides.employeeId !== null,
    employeeId: overrides.employeeId === undefined ? EMPLOYEE_ID : overrides.employeeId,
    organizationId: overrides.organizationId ?? ORGANIZATION_ID,
    roles: Object.freeze([...overrides.roles]),
  });
}

function domainId<Entity extends string>(value: string): DomainId<Entity> {
  const result = parseDomainId<Entity>(value);
  if (!result.ok) throw new Error(`Invalid test ${result.error.code}.`);
  return result.value;
}
