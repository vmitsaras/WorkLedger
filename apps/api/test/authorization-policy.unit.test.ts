import { parseDomainId, type DomainId } from '@workledger/domain';
import type { AuthorizationActorRecord } from '@workledger/database';

import {
  authorizeAccountTarget,
  authorizeEmployeeTarget,
  authorizeInstallationAction,
  employeeCollectionScope,
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
});

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
