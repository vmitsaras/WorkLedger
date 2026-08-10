import { fileURLToPath } from 'node:url';

import {
  parseDomainId,
  parseInstant,
  parseLocalDate,
  type DomainId,
  type Instant,
  type LocalDate,
} from '@workledger/domain';
import { createWorkLedgerDatabase, type ApplicationRole } from '@workledger/database';
import { createDatabaseHarnessState, createPostgresSchemaFixture } from '@workledger/test-utils';

import { createAuthorizationService } from '../src/authorization/service.js';

const databaseHarness = createDatabaseHarnessState(process.env);
const integrationTest = databaseHarness.enabled ? test : test.skip;
const repositoryDirectory = fileURLToPath(new URL('../../..', import.meta.url));
const migrationFiles = [
  '0000_initial_schema.sql',
  '0001_integrity_constraints.sql',
  '0002_auth_foundation.sql',
  '0003_authorization_foundation.sql',
].map((file) => `${repositoryDirectory}/packages/database/migrations/${file}`);
const CURRENT_DATE = localDate('2026-08-10');
const CHANGE_INSTANT = instant('2026-08-10T12:00:00Z');

integrationTest(
  `enforces the permission matrix from authoritative scope (${databaseHarness.safeLabel})`,
  async () => {
    const fixture = await createPostgresSchemaFixture({
      connectionString: databaseHarness.url,
      label: 'authorization',
      migrationFiles,
    });
    const database = createWorkLedgerDatabase({
      applicationName: 'workledger-authorization-test',
      connectionString: fixture.databaseUrl,
    });
    const authorization = createAuthorizationService(database);

    try {
      const organizationId = await createOrganization(fixture.client, 'Authorization organization');
      const otherOrganizationId = await createOrganization(
        fixture.client,
        'Other authorization organization',
      );
      const target = await createEmployeeAccount(fixture.client, organizationId, 'target', [
        'EMPLOYEE',
      ]);
      const manager = await createEmployeeAccount(fixture.client, organizationId, 'manager', [
        'MANAGER',
      ]);
      const formerManager = await createEmployeeAccount(
        fixture.client,
        organizationId,
        'former-manager',
        ['MANAGER'],
      );
      const hr = await createEmployeeAccount(fixture.client, organizationId, 'hr', [
        'EMPLOYEE',
        'HR_ADMINISTRATOR',
        'MANAGER',
      ]);
      const systemAccountId = await createTechnicalAccount(
        fixture.client,
        organizationId,
        'system',
        ['SYSTEM_ADMINISTRATOR'],
      );
      const inactiveAccountId = await createTechnicalAccount(
        fixture.client,
        organizationId,
        'inactive',
        ['SYSTEM_ADMINISTRATOR'],
        false,
      );
      const inactiveEmployee = await createEmployeeAccount(
        fixture.client,
        organizationId,
        'inactive-employee',
        ['EMPLOYEE'],
      );
      await fixture.client.query(`update employees set status = 'INACTIVE' where id = $1`, [
        inactiveEmployee.employeeId,
      ]);
      const unrelatedEmployeeId = await createEmployee(fixture.client, organizationId, 'unrelated');
      const otherEmployeeId = await createEmployee(
        fixture.client,
        otherOrganizationId,
        'other-organization',
      );

      await fixture.client.query(
        `insert into manager_assignments
          (organization_id, employee_id, manager_employee_id, starts_on)
         values ($1, $2, $3, '2026-01-01')`,
        [organizationId, target.employeeId, manager.employeeId],
      );
      await fixture.client.query(
        `insert into manager_assignments
          (organization_id, employee_id, manager_employee_id, starts_on, ends_on)
         values ($1, $2, $3, '2025-01-01', '2026-01-01')`,
        [organizationId, target.employeeId, formerManager.employeeId],
      );

      const actors = await database.transaction(async (transaction) => ({
        formerManager: await transaction.authorization.findActor(
          organizationId,
          formerManager.accountId,
          CURRENT_DATE,
        ),
        hr: await transaction.authorization.findActor(organizationId, hr.accountId, CURRENT_DATE),
        inactive: await transaction.authorization.findActor(
          organizationId,
          inactiveAccountId,
          CURRENT_DATE,
        ),
        manager: await transaction.authorization.findActor(
          organizationId,
          manager.accountId,
          CURRENT_DATE,
        ),
        system: await transaction.authorization.findActor(
          organizationId,
          systemAccountId,
          CURRENT_DATE,
        ),
        target: await transaction.authorization.findActor(
          organizationId,
          target.accountId,
          CURRENT_DATE,
        ),
      }));
      if (
        actors.formerManager === null ||
        actors.hr === null ||
        actors.inactive === null ||
        actors.manager === null ||
        actors.system === null ||
        actors.target === null
      ) {
        throw new Error('Expected every authorization actor fixture.');
      }

      expect(actors.target).toMatchObject({
        accountActive: true,
        employeeCapabilityActive: true,
        employeeId: target.employeeId,
        roles: ['EMPLOYEE'],
      });
      expect(actors.inactive.accountActive).toBe(false);
      expect(actors.system.employeeId).toBeNull();
      expect(
        await authorization.authorizeInstallation({
          accountId: inactiveAccountId,
          action: 'TECHNICAL_OPERATIONS_MANAGE',
          localDate: CURRENT_DATE,
          organizationId,
        }),
      ).toEqual({ allowed: false, code: 'ACCESS_DENIED' });
      expect(
        await authorization.authorizeEmployee({
          accountId: inactiveEmployee.accountId,
          action: 'ATTENDANCE_CLOCK',
          localDate: CURRENT_DATE,
          organizationId,
          sessionFresh: true,
          targetEmployeeId: inactiveEmployee.employeeId,
          targetOrganizationId: organizationId,
        }),
      ).toEqual({ allowed: false, code: 'ACCESS_DENIED' });

      const relationships = await database.transaction(async (transaction) => ({
        current: await transaction.authorization.isCurrentManager(
          organizationId,
          manager.employeeId,
          target.employeeId,
          CURRENT_DATE,
        ),
        former: await transaction.authorization.isCurrentManager(
          organizationId,
          formerManager.employeeId,
          target.employeeId,
          CURRENT_DATE,
        ),
      }));
      expect(relationships).toEqual({ current: true, former: false });

      expect(
        await authorization.authorizeEmployee({
          accountId: manager.accountId,
          action: 'ABSENCE_DECIDE',
          localDate: CURRENT_DATE,
          organizationId,
          sessionFresh: true,
          targetEmployeeId: target.employeeId,
          targetOrganizationId: organizationId,
        }),
      ).toEqual({ allowed: true, scope: 'REPORTS_LIMITED' });
      expect(
        await authorization.authorizeEmployee({
          accountId: formerManager.accountId,
          action: 'ABSENCE_DECIDE',
          localDate: CURRENT_DATE,
          organizationId,
          sessionFresh: true,
          targetEmployeeId: target.employeeId,
          targetOrganizationId: organizationId,
        }),
      ).toEqual({ allowed: false, code: 'ACCESS_DENIED' });
      expect(
        await authorization.authorizeEmployee({
          accountId: manager.accountId,
          action: 'ATTENDANCE_READ',
          localDate: CURRENT_DATE,
          organizationId,
          sessionFresh: true,
          targetEmployeeId: unrelatedEmployeeId,
          targetOrganizationId: organizationId,
        }),
      ).toEqual({ allowed: false, code: 'ACCESS_DENIED' });
      expect(
        await authorization.authorizeEmployee({
          accountId: manager.accountId,
          action: 'ATTENDANCE_READ',
          localDate: CURRENT_DATE,
          organizationId,
          sessionFresh: true,
          targetEmployeeId: otherEmployeeId,
          targetOrganizationId: otherOrganizationId,
        }),
      ).toEqual({ allowed: false, code: 'ACCESS_DENIED' });

      expect(
        await authorization.authorizeEmployee({
          accountId: hr.accountId,
          action: 'TIME_LEDGER_ADJUST',
          localDate: CURRENT_DATE,
          organizationId,
          sessionFresh: true,
          targetEmployeeId: hr.employeeId,
          targetOrganizationId: organizationId,
        }),
      ).toEqual({ allowed: false, code: 'ACCESS_DENIED' });
      expect(
        await authorization.authorizeEmployee({
          accountId: hr.accountId,
          action: 'TIME_LEDGER_ADJUST',
          localDate: CURRENT_DATE,
          organizationId,
          sessionFresh: true,
          targetEmployeeId: target.employeeId,
          targetOrganizationId: organizationId,
        }),
      ).toEqual({ allowed: true, scope: 'ORGANIZATION_HR' });
      expect(
        await authorization.authorizeInstallation({
          accountId: hr.accountId,
          action: 'TECHNICAL_OPERATIONS_MANAGE',
          localDate: CURRENT_DATE,
          organizationId,
        }),
      ).toEqual({
        allowed: false,
        code: 'ACCESS_DENIED',
      });
      expect(
        await authorization.authorizeInstallation({
          accountId: systemAccountId,
          action: 'TECHNICAL_OPERATIONS_MANAGE',
          localDate: CURRENT_DATE,
          organizationId,
        }),
      ).toEqual({
        allowed: true,
        scope: 'TECHNICAL',
      });
      expect(
        await authorization.authorizeAccount({
          accountId: systemAccountId,
          action: 'SYSTEM_ROLE_MANAGE',
          localDate: CURRENT_DATE,
          organizationId,
          sessionFresh: false,
          targetAccountId: target.accountId,
        }),
      ).toEqual({ allowed: false, code: 'ACCESS_DENIED' });
      expect(
        await authorization.authorizeAccount({
          accountId: systemAccountId,
          action: 'SYSTEM_ROLE_MANAGE',
          localDate: CURRENT_DATE,
          organizationId,
          sessionFresh: true,
          targetAccountId: target.accountId,
        }),
      ).toEqual({ allowed: true, scope: 'TECHNICAL' });
      expect(
        await authorization.authorizeEmployee({
          accountId: systemAccountId,
          action: 'ATTENDANCE_READ',
          localDate: CURRENT_DATE,
          organizationId,
          sessionFresh: true,
          targetEmployeeId: target.employeeId,
          targetOrganizationId: organizationId,
        }),
      ).toEqual({ allowed: false, code: 'ACCESS_DENIED' });

      const firstManagerPage = await authorization.listAuthorizedEmployeeIds({
        accountId: manager.accountId,
        action: 'REPORT_PENDING_RUN',
        limit: 1,
        localDate: CURRENT_DATE,
        offset: 0,
        organizationId,
      });
      expect(firstManagerPage).toEqual({
        allowed: true,
        employeeIds: [target.employeeId],
        scope: 'REPORTS',
      });

      await createSession(fixture.client, manager.accountId, 'manager-before-role-change');
      await database.transaction((transaction) =>
        transaction.authorization.replaceActiveRoles({
          accountId: manager.accountId,
          changedAt: CHANGE_INSTANT,
          organizationId,
          roles: ['EMPLOYEE'],
        }),
      );
      const changedManager = await database.transaction((transaction) =>
        transaction.authorization.findActor(organizationId, manager.accountId, CURRENT_DATE),
      );
      expect(changedManager?.roles).toEqual(['EMPLOYEE']);
      expect(
        await fixture.client.query(`select id from auth_sessions where user_id = $1`, [
          manager.accountId,
        ]),
      ).toHaveProperty('rowCount', 0);
      if (changedManager === null) throw new Error('Expected changed manager actor.');
      expect(
        await authorization.authorizeEmployee({
          accountId: manager.accountId,
          action: 'ABSENCE_DECIDE',
          localDate: CURRENT_DATE,
          organizationId,
          sessionFresh: true,
          targetEmployeeId: target.employeeId,
          targetOrganizationId: organizationId,
        }),
      ).toEqual({ allowed: false, code: 'ACCESS_DENIED' });

      await createSession(fixture.client, hr.accountId, 'hr-before-unlink');
      expect(
        await database.transaction((transaction) =>
          transaction.authorization.unlinkEmployee({
            accountId: hr.accountId,
            changedAt: CHANGE_INSTANT,
            organizationId,
          }),
        ),
      ).toBe(true);
      const unlinkedHr = await database.transaction((transaction) =>
        transaction.authorization.findActor(organizationId, hr.accountId, CURRENT_DATE),
      );
      expect(unlinkedHr).toMatchObject({ employeeCapabilityActive: false, employeeId: null });
      expect(
        await fixture.client.query(`select id from auth_sessions where user_id = $1`, [
          hr.accountId,
        ]),
      ).toHaveProperty('rowCount', 0);
      expect(
        await fixture.client.query(
          `select id from account_employee_links where user_id = $1 and unlinked_at is not null`,
          [hr.accountId],
        ),
      ).toHaveProperty('rowCount', 1);
    } finally {
      await database.close();
      await fixture.cleanup();
    }
  },
);

type TestIdentity = Readonly<{
  accountId: DomainId<'Account'>;
  employeeId: DomainId<'Employee'>;
}>;

async function createOrganization(client: import('pg').Client, name: string) {
  const result = await client.query<{ id: string }>(
    `insert into organizations (name, time_zone) values ($1, 'Europe/Berlin') returning id`,
    [name],
  );
  return domainId<'Organization'>(result.rows[0]?.id);
}

async function createEmployeeAccount(
  client: import('pg').Client,
  organizationId: DomainId<'Organization'>,
  label: string,
  roles: readonly ApplicationRole[],
): Promise<TestIdentity> {
  const accountId = await createTechnicalAccount(client, organizationId, label, roles);
  const employeeId = await createEmployee(client, organizationId, label);
  await client.query(
    `insert into account_employee_links
      (organization_id, user_id, employee_id, linked_at)
     values ($1, $2, $3, '2026-01-01T00:00:00Z')`,
    [organizationId, accountId, employeeId],
  );
  return Object.freeze({ accountId, employeeId });
}

async function createTechnicalAccount(
  client: import('pg').Client,
  organizationId: DomainId<'Organization'>,
  label: string,
  roles: readonly ApplicationRole[],
  active = true,
) {
  const account = await client.query<{ id: string }>(
    `insert into auth_users (name, email, email_verified, active)
     values ($1, $2, true, $3) returning id`,
    [`${label} account`, `${label}@example.test`, active],
  );
  const accountId = domainId<'Account'>(account.rows[0]?.id);
  if (roles.length > 0) {
    await client.query(
      `insert into account_role_assignments
        (organization_id, user_id, role, assigned_at)
       select $1, $2, role, '2026-01-01T00:00:00Z'
       from unnest($3::application_role[]) as role`,
      [organizationId, accountId, roles],
    );
  }
  return accountId;
}

async function createEmployee(
  client: import('pg').Client,
  organizationId: DomainId<'Organization'>,
  label: string,
) {
  const employee = await client.query<{ id: string }>(
    `insert into employees (organization_id, employee_number, display_name)
     values ($1, $2, $3) returning id`,
    [organizationId, `WL-${label}`, `${label} employee`],
  );
  const employeeId = domainId<'Employee'>(employee.rows[0]?.id);
  await client.query(
    `insert into employment_periods (organization_id, employee_id, starts_on)
     values ($1, $2, '2026-01-01')`,
    [organizationId, employeeId],
  );
  return employeeId;
}

async function createSession(
  client: import('pg').Client,
  accountId: DomainId<'Account'>,
  token: string,
) {
  await client.query(
    `insert into auth_sessions (user_id, token, expires_at)
     values ($1, $2, now() + interval '10 minutes')`,
    [accountId, token],
  );
}

function domainId<Entity extends string>(value: unknown): DomainId<Entity> {
  const result = parseDomainId<Entity>(value);
  if (!result.ok) throw new Error(`Invalid test ${result.error.code}.`);
  return result.value;
}

function instant(value: string): Instant {
  const result = parseInstant(value);
  if (!result.ok) throw new Error(`Invalid test ${result.error.code}.`);
  return result.value;
}

function localDate(value: string): LocalDate {
  const result = parseLocalDate(value);
  if (!result.ok) throw new Error(`Invalid test ${result.error.code}.`);
  return result.value;
}
