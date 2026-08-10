import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

import {
  parseDomainId,
  parseInstant,
  parseLocalDate,
  type DomainId,
  type Instant,
  type LocalDate,
} from '@workledger/domain';
import {
  AuditValueError,
  createWorkLedgerDatabase,
  type ApplicationRole,
} from '@workledger/database';
import { createDatabaseHarnessState, createPostgresSchemaFixture } from '@workledger/test-utils';

import { createAuditService } from '../src/audit/service.js';

const databaseHarness = createDatabaseHarnessState(process.env);
const integrationTest = databaseHarness.enabled ? test : test.skip;
const repositoryDirectory = fileURLToPath(new URL('../../..', import.meta.url));
const migrationFiles = [
  '0000_initial_schema.sql',
  '0001_integrity_constraints.sql',
  '0002_auth_foundation.sql',
  '0003_authorization_foundation.sql',
  '0004_audit_foundation.sql',
].map((file) => `${repositoryDirectory}/packages/database/migrations/${file}`);
const CURRENT_DATE = localDate('2026-08-10');
const OCCURRED_AT = instant('2026-08-10T12:00:00Z');

integrationTest(
  `keeps audit writes atomic, minimized, immutable, and audience-separated (${databaseHarness.safeLabel})`,
  async () => {
    const fixture = await createPostgresSchemaFixture({
      connectionString: databaseHarness.url,
      label: 'audit',
      migrationFiles,
    });
    const database = createWorkLedgerDatabase({
      applicationName: 'workledger-audit-test',
      connectionString: fixture.databaseUrl,
    });
    const audit = createAuditService(database);

    try {
      const organizationId = await createOrganization(fixture.client, 'Audit organization');
      const otherOrganizationId = await createOrganization(
        fixture.client,
        'Other audit organization',
      );
      const target = await createEmployeeAccount(fixture.client, organizationId, 'target', [
        'EMPLOYEE',
      ]);
      const otherTarget = await createEmployeeAccount(
        fixture.client,
        organizationId,
        'other-target',
        ['EMPLOYEE'],
      );
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
        'HR_ADMINISTRATOR',
      ]);
      const systemAccountId = await createTechnicalAccount(
        fixture.client,
        organizationId,
        'system',
        ['SYSTEM_ADMINISTRATOR'],
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

      const domainEvent = await database.transaction((transaction) =>
        transaction.audit.appendDomain({
          actionCode: 'EMPLOYEE_STATUS_CHANGED',
          actor: { accountId: hr.accountId, kind: 'ACCOUNT', role: 'HR_ADMINISTRATOR' },
          facts: { nextStatus: 'ACTIVE', previousStatus: 'INACTIVE', version: 2 },
          occurredAt: OCCURRED_AT,
          organizationId,
          outcome: 'SUCCESS',
          privileged: true,
          reasonCode: 'EMPLOYMENT_REACTIVATED',
          requestId: domainId<'Request'>(randomUUID()),
          restrictedReasonId: null,
          subjectEmployeeId: target.employeeId,
          targetId: target.employeeId,
          targetKind: 'EMPLOYEE',
        }),
      );
      const securityEvent = await database.transaction((transaction) =>
        transaction.audit.appendSecurity({
          actionCode: 'SESSION_REVOKED',
          actor: {
            accountId: systemAccountId,
            kind: 'ACCOUNT',
            role: 'SYSTEM_ADMINISTRATOR',
          },
          facts: {
            httpStatus: 204,
            scope: 'TECHNICAL',
            sessionId: domainId<'Session'>(randomUUID()),
          },
          occurredAt: instant('2026-08-10T12:01:00Z'),
          organizationId,
          outcome: 'SUCCESS',
          privileged: true,
          reasonCode: 'ADMINISTRATIVE_REVOCATION',
          requestId: domainId<'Request'>(randomUUID()),
          targetAccountId: target.accountId,
          targetId: target.accountId,
          targetKind: 'SESSION',
        }),
      );
      await database.transaction((transaction) =>
        transaction.audit.appendDomain({
          actionCode: 'EMPLOYEE_STATUS_CHANGED',
          actor: { accountId: hr.accountId, kind: 'ACCOUNT', role: 'HR_ADMINISTRATOR' },
          facts: { nextStatus: 'ACTIVE' },
          occurredAt: instant('2026-08-10T12:02:00Z'),
          organizationId,
          outcome: 'SUCCESS',
          privileged: true,
          reasonCode: null,
          requestId: null,
          restrictedReasonId: null,
          subjectEmployeeId: otherTarget.employeeId,
          targetId: otherTarget.employeeId,
          targetKind: 'EMPLOYEE',
        }),
      );
      await database.transaction((transaction) =>
        transaction.audit.appendSecurity({
          actionCode: 'UPGRADE_COMPLETED',
          actor: { kind: 'SYSTEM', systemProcess: domainId<'SystemProcess'>('upgrade-runner') },
          facts: { scope: 'OPERATIONS' },
          occurredAt: instant('2026-08-10T12:03:00Z'),
          organizationId: otherOrganizationId,
          outcome: 'SUCCESS',
          privileged: true,
          reasonCode: null,
          requestId: null,
          targetAccountId: null,
          targetId: 'deployment',
          targetKind: 'OPERATIONS',
        }),
      );

      expect(domainEvent.facts).toEqual({
        nextStatus: 'ACTIVE',
        previousStatus: 'INACTIVE',
        version: 2,
      });
      expect(securityEvent.facts).toMatchObject({ httpStatus: 204, scope: 'TECHNICAL' });

      await expect(
        database.transaction((transaction) =>
          transaction.audit.appendDomain({
            actionCode: 'EMPLOYEE_STATUS_CHANGED',
            actor: { accountId: hr.accountId, kind: 'ACCOUNT', role: 'HR_ADMINISTRATOR' },
            facts: { nextStatus: '</script>\nforged-audit-line' },
            occurredAt: OCCURRED_AT,
            organizationId,
            outcome: 'SUCCESS',
            privileged: true,
            reasonCode: null,
            requestId: null,
            restrictedReasonId: null,
            subjectEmployeeId: target.employeeId,
            targetId: target.employeeId,
            targetKind: 'EMPLOYEE',
          }),
        ),
      ).rejects.toBeInstanceOf(AuditValueError);

      const rollbackMarker = new Error('ROLLBACK_AUDIT_TEST');
      const rolledBackCommandId = domainId<'AttendanceCommand'>(randomUUID());
      await expect(
        database.transaction(async (transaction) => {
          await transaction.attendance.appendPunchEvents(organizationId, target.employeeId, [
            {
              actorEmployeeId: target.employeeId,
              commandId: rolledBackCommandId,
              event: {
                eventSequence: 1,
                occurredAt: instant('2026-08-10T12:04:00Z'),
                type: 'CLOCK_IN',
              },
            },
          ]);
          await transaction.audit.appendDomain({
            actionCode: 'ATTENDANCE_CLOCKED_IN',
            actor: { accountId: target.accountId, kind: 'ACCOUNT', role: 'EMPLOYEE' },
            facts: { attendanceRevision: 1, eventCount: 1, nextStatus: 'WORKING' },
            occurredAt: instant('2026-08-10T12:04:00Z'),
            organizationId,
            outcome: 'SUCCESS',
            privileged: false,
            reasonCode: null,
            requestId: null,
            restrictedReasonId: null,
            subjectEmployeeId: target.employeeId,
            targetId: 'rolled-back-command',
            targetKind: 'ATTENDANCE',
          });
          throw rollbackMarker;
        }),
      ).rejects.toBe(rollbackMarker);

      const ownerDomain = await audit.listDomainForEmployee({
        accountId: target.accountId,
        limit: 1,
        localDate: CURRENT_DATE,
        offset: 0,
        organizationId,
        sessionFresh: false,
        subjectEmployeeId: target.employeeId,
      });
      expect(ownerDomain).toMatchObject({
        allowed: true,
        events: [{ id: domainEvent.id }],
        scope: 'SELF',
      });
      expect(
        await audit.listDomainForEmployee({
          accountId: manager.accountId,
          limit: 10,
          localDate: CURRENT_DATE,
          offset: 0,
          organizationId,
          sessionFresh: false,
          subjectEmployeeId: target.employeeId,
        }),
      ).toMatchObject({ allowed: true, scope: 'REPORTS_LIMITED' });
      expect(
        await audit.listDomainForEmployee({
          accountId: formerManager.accountId,
          limit: 10,
          localDate: CURRENT_DATE,
          offset: 0,
          organizationId,
          sessionFresh: false,
          subjectEmployeeId: target.employeeId,
        }),
      ).toEqual({ allowed: false, code: 'ACCESS_DENIED' });
      expect(
        await audit.listDomainForEmployee({
          accountId: hr.accountId,
          limit: 10,
          localDate: CURRENT_DATE,
          offset: 0,
          organizationId,
          sessionFresh: false,
          subjectEmployeeId: target.employeeId,
        }),
      ).toMatchObject({ allowed: true, scope: 'ORGANIZATION_HR' });
      expect(
        await audit.listDomainForEmployee({
          accountId: systemAccountId,
          limit: 10,
          localDate: CURRENT_DATE,
          offset: 0,
          organizationId,
          sessionFresh: false,
          subjectEmployeeId: target.employeeId,
        }),
      ).toEqual({ allowed: false, code: 'ACCESS_DENIED' });
      expect(
        await audit.listSecurity({
          accountId: hr.accountId,
          limit: 10,
          localDate: CURRENT_DATE,
          offset: 0,
          organizationId,
        }),
      ).toEqual({ allowed: false, code: 'ACCESS_DENIED' });
      expect(
        await audit.listSecurity({
          accountId: systemAccountId,
          limit: 10,
          localDate: CURRENT_DATE,
          offset: 0,
          organizationId,
        }),
      ).toMatchObject({
        allowed: true,
        events: [{ id: securityEvent.id }],
        scope: 'TECHNICAL',
      });

      const persistedCounts = await fixture.client.query<{
        domain_count: string;
        punch_count: string;
        security_count: string;
      }>(
        `select
           (select count(*) from domain_audit_events where organization_id = $1) as domain_count,
           (select count(*) from punch_events where command_id = $2) as punch_count,
           (select count(*) from security_audit_events where organization_id = $1) as security_count`,
        [organizationId, rolledBackCommandId],
      );
      expect(persistedCounts.rows[0]).toEqual({
        domain_count: '2',
        punch_count: '0',
        security_count: '1',
      });
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
  const employeeResult = await client.query<{ id: string }>(
    `insert into employees (organization_id, employee_number, display_name)
     values ($1, $2, $3) returning id`,
    [organizationId, `WL-${label.toUpperCase()}`, `${label} employee`],
  );
  const employeeId = domainId<'Employee'>(employeeResult.rows[0]?.id);
  await client.query(
    `insert into employment_periods (organization_id, employee_id, starts_on)
     values ($1, $2, '2026-01-01')`,
    [organizationId, employeeId],
  );
  await client.query(
    `insert into account_employee_links (organization_id, user_id, employee_id)
     values ($1, $2, $3)`,
    [organizationId, accountId, employeeId],
  );
  return { accountId, employeeId };
}

async function createTechnicalAccount(
  client: import('pg').Client,
  organizationId: DomainId<'Organization'>,
  label: string,
  roles: readonly ApplicationRole[],
) {
  const result = await client.query<{ id: string }>(
    `insert into auth_users (name, email) values ($1, $2) returning id`,
    [`${label} account`, `${label}@audit.example.test`],
  );
  const accountId = domainId<'Account'>(result.rows[0]?.id);
  for (const role of roles) {
    await client.query(
      `insert into account_role_assignments (organization_id, user_id, role)
       values ($1, $2, $3)`,
      [organizationId, accountId, role],
    );
  }
  return accountId;
}

function domainId<Entity extends string>(value: unknown): DomainId<Entity> {
  const result = parseDomainId<Entity>(value);
  if (!result.ok) throw new Error('Invalid test domain identifier.');
  return result.value;
}

function instant(value: string): Instant {
  const result = parseInstant(value);
  if (!result.ok) throw new Error('Invalid test instant.');
  return result.value;
}

function localDate(value: string): LocalDate {
  const result = parseLocalDate(value);
  if (!result.ok) throw new Error('Invalid test local date.');
  return result.value;
}
