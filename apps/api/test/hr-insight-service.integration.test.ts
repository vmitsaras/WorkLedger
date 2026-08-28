import { fileURLToPath } from 'node:url';

import { parseDomainId, parseInstant, type DomainId, type Instant } from '@workledger/domain';
import { createWorkLedgerDatabase, type ApplicationRole } from '@workledger/database';
import { createDatabaseHarnessState, createPostgresSchemaFixture } from '@workledger/test-utils';

import { createHrInsightService } from '../src/insights/hr-insight-service.js';

const databaseHarness = createDatabaseHarnessState(process.env);
const integrationTest = databaseHarness.enabled ? test : test.skip;
const repositoryDirectory = fileURLToPath(new URL('../../..', import.meta.url));
const migrationFiles = [
  '0000_initial_schema.sql',
  '0001_integrity_constraints.sql',
  '0002_auth_foundation.sql',
  '0003_authorization_foundation.sql',
  '0022_account_locale.sql',
].map((file) => `${repositoryDirectory}/packages/database/migrations/${file}`);
const CAPTURED_AT = instant('2026-08-28T09:30:45Z');

integrationTest(
  `suppresses HR aggregates before result construction and reauthorizes every request (${databaseHarness.safeLabel})`,
  async () => {
    const fixture = await createPostgresSchemaFixture({
      connectionString: databaseHarness.url,
      label: 'hr_insight_service',
      migrationFiles,
    });
    const database = createWorkLedgerDatabase({
      applicationName: 'workledger-hr-insight-service-test',
      connectionString: fixture.databaseUrl,
    });

    try {
      const organizationId = await createOrganization(fixture.client);
      const hrAccountId = await createAccount(fixture.client, organizationId, 'hr', [
        'HR_ADMINISTRATOR',
        'MANAGER',
      ]);
      const managerAccountId = await createAccount(fixture.client, organizationId, 'manager', [
        'MANAGER',
      ]);
      const employees = await createEligibleEmployees(fixture.client, organizationId, 13);
      await createClosureSources(fixture.client, organizationId, employees);
      await createAbsenceSources(fixture.client, organizationId, employees);
      const service = createHrInsightService(database);
      const identity = Object.freeze({ accountId: hrAccountId, sessionFresh: true });

      const closureRequest = Object.freeze({
        kind: 'HR_MONTHLY_CLOSURE_READINESS' as const,
        month: '2026-08',
        workspace: 'HR' as const,
      });
      const closure = await service.run(identity, closureRequest, CAPTURED_AT);
      expect(closure).toHaveProperty('nativeResult');
      if (!('nativeResult' in closure)) throw new Error('Expected available closure aggregate.');
      expect(closure.nativeResult.facts.map((fact) => [fact.code, fact.value])).toEqual([
        ['HR_ELIGIBLE_EMPLOYEE_COUNT', { kind: 'COUNT', value: 13 }],
        ['HR_LOCKED_EMPLOYEE_COUNT', { kind: 'COUNT', value: 10 }],
        ['HR_OPEN_EMPLOYEE_COUNT', { kind: 'COUNT', value: 3 }],
        ['HR_SUBMITTED_EMPLOYEE_COUNT', { kind: 'COUNT', value: 0 }],
        ['HR_CHANGES_REQUESTED_EMPLOYEE_COUNT', { kind: 'COUNT', value: 0 }],
        ['HR_APPROVED_EMPLOYEE_COUNT', { kind: 'COUNT', value: 0 }],
        ['HR_INCOMPLETE_EMPLOYEE_DAY_COUNT', { kind: 'COUNT', value: 390 }],
      ]);
      expect(closure.nativeResult.actions).toEqual([
        {
          code: 'OPEN_MONTHLY_TIME_REPORT',
          destination: 'MONTHLY_TIME_REPORT',
          period: { kind: 'MONTH', monthStart: '2026-08-01' },
          reference: 'action_source_monthly_time_report',
          sourceReferences: ['source_monthly_time_report'],
        },
      ]);

      const absenceRequest = Object.freeze({
        kind: 'HR_NEUTRAL_ABSENCE_COVERAGE' as const,
        month: '2026-08',
        workspace: 'HR' as const,
      });
      const absence = await service.run(identity, absenceRequest, CAPTURED_AT);
      expect(absence).toHaveProperty('nativeResult');
      if (!('nativeResult' in absence)) throw new Error('Expected available absence aggregate.');
      expect(absence.nativeResult.facts.map((fact) => [fact.code, fact.value])).toEqual([
        ['HR_ELIGIBLE_EMPLOYEE_COUNT', { kind: 'COUNT', value: 13 }],
        ['HR_COVERED_EMPLOYEE_COUNT', { kind: 'COUNT', value: 3 }],
        ['HR_COVERAGE_CASE_COUNT', { kind: 'COUNT', value: 5 }],
        ['HR_COVERED_EMPLOYEE_DAY_COUNT', { kind: 'COUNT', value: 3 }],
        ['HR_COVERED_SCHEDULED_MINUTES', { kind: 'MINUTES', value: 1_440 }],
      ]);
      const serialized = JSON.stringify(absence);
      for (const forbidden of [
        'SICKNESS',
        'Hostile private note',
        ...employees.map(({ id }) => id),
      ]) {
        expect(serialized).not.toContain(forbidden);
      }

      const repeated = await service.run(identity, absenceRequest, CAPTURED_AT);
      expect(repeated).toEqual(absence);

      await fixture.client.query(
        `update employees set status = 'INACTIVE' where id = any($1::uuid[])`,
        [employees.slice(9).map(({ id }) => id)],
      );
      const cohortNine = await service.run(identity, absenceRequest, CAPTURED_AT);
      await fixture.client.query(`update employees set status = 'ACTIVE' where id = $1`, [
        employees[9]?.id,
      ]);
      const cohortTen = await service.run(identity, absenceRequest, CAPTURED_AT);
      expect(cohortNine).toEqual(cohortTen);
      expect(cohortTen).toMatchObject({ reason: 'PRIVACY_THRESHOLD_NOT_MET' });
      await fixture.client.query(
        `update employees set status = 'ACTIVE' where id = any($1::uuid[])`,
        [employees.slice(10).map(({ id }) => id)],
      );

      await fixture.client.query(
        `insert into absence_effects
          (organization_id, absence_request_id, absence_coverage_segment_id, employee_id,
           local_date, expected_reduction_minutes, credit_minutes, entitlement_minutes, effect_version)
         select organization_id, absence_request_id, absence_coverage_segment_id, employee_id,
           local_date, 0, 0, 0, 2
         from absence_effects
         where employee_id = $1 and effect_version = 1`,
        [employees[0]?.id],
      );
      const caseSuppressed = await service.run(identity, absenceRequest, CAPTURED_AT);
      expect(caseSuppressed).toEqual({
        capturedAt: CAPTURED_AT,
        kind: absenceRequest.kind,
        month: absenceRequest.month,
        reason: 'PRIVACY_THRESHOLD_NOT_MET',
      });
      expect(JSON.stringify(caseSuppressed)).not.toContain('coverageCaseCount');
      expect(JSON.stringify(caseSuppressed)).not.toContain('actions');

      await fixture.client.query(
        `update monthly_periods set status = 'OPEN', locked_at = null
         where employee_id = $1 and month_start = '2026-08-01'`,
        [employees[0]?.id],
      );
      const complementSuppressed = await service.run(identity, closureRequest, CAPTURED_AT);
      expect(Object.keys(complementSuppressed).sort()).toEqual([
        'capturedAt',
        'kind',
        'month',
        'reason',
      ]);
      expect(complementSuppressed).toMatchObject({ reason: 'PRIVACY_THRESHOLD_NOT_MET' });

      await expect(
        service.run(
          Object.freeze({ accountId: managerAccountId, sessionFresh: true }),
          closureRequest,
          CAPTURED_AT,
        ),
      ).rejects.toMatchObject({ code: 'ACCESS_DENIED', statusCode: 403 });
      const otherOrganizationId = await createOrganization(fixture.client, 'Other organization');
      const otherHrAccountId = await createAccount(
        fixture.client,
        otherOrganizationId,
        'other-hr',
        ['HR_ADMINISTRATOR'],
      );
      await expect(
        service.run(
          Object.freeze({ accountId: otherHrAccountId, sessionFresh: true }),
          closureRequest,
          CAPTURED_AT,
        ),
      ).resolves.toEqual({
        capturedAt: CAPTURED_AT,
        kind: closureRequest.kind,
        month: closureRequest.month,
        reason: 'PRIVACY_THRESHOLD_NOT_MET',
      });
      await fixture.client.query(
        `update account_role_assignments set revoked_at = '2026-08-28T09:31:00Z'
         where user_id = $1 and role = 'HR_ADMINISTRATOR'`,
        [hrAccountId],
      );
      await expect(service.run(identity, closureRequest, CAPTURED_AT)).rejects.toMatchObject({
        code: 'ACCESS_DENIED',
        statusCode: 403,
      });
      await expect(
        service.run(identity, { ...closureRequest, month: '2026-09' }, CAPTURED_AT),
      ).rejects.toMatchObject({ code: 'VALIDATION_FAILED', statusCode: 422 });
      await fixture.client.query(`update auth_users set active = false where id = $1`, [
        hrAccountId,
      ]);
      await expect(service.run(identity, closureRequest, CAPTURED_AT)).rejects.toMatchObject({
        code: 'AUTH_SESSION_EXPIRED',
        statusCode: 401,
      });
    } finally {
      await database.close();
      await fixture.cleanup();
    }
  },
);

async function createOrganization(client: import('pg').Client, name = 'HR Insight organization') {
  const result = await client.query<{ id: string }>(
    `insert into organizations (name, time_zone)
     values ($1, 'Europe/Berlin') returning id`,
    [name],
  );
  return domainId<'Organization'>(result.rows[0]?.id);
}

async function createAccount(
  client: import('pg').Client,
  organizationId: DomainId<'Organization'>,
  label: string,
  roles: readonly ApplicationRole[],
) {
  const result = await client.query<{ id: string }>(
    `insert into auth_users (name, email, email_verified, active)
     values ($1, $2, true, true) returning id`,
    [`${label} account`, `${label}@example.test`],
  );
  const accountId = domainId<'Account'>(result.rows[0]?.id);
  await client.query(
    `insert into account_role_assignments (organization_id, user_id, role, assigned_at)
     select $1, $2, role, '2026-01-01T00:00:00Z'
     from unnest($3::application_role[]) as role`,
    [organizationId, accountId, roles],
  );
  return accountId;
}

async function createEligibleEmployees(
  client: import('pg').Client,
  organizationId: DomainId<'Organization'>,
  count: number,
) {
  const employees: Array<Readonly<{ id: DomainId<'Employee'> }>> = [];
  for (let index = 0; index < count; index += 1) {
    const result = await client.query<{ id: string }>(
      `insert into employees (organization_id, employee_number, display_name)
       values ($1, $2, $3) returning id`,
      [organizationId, `HR-${index + 1}`, `Private employee ${index + 1}`],
    );
    const id = domainId<'Employee'>(result.rows[0]?.id);
    await client.query(
      `insert into employment_periods (organization_id, employee_id, starts_on)
       values ($1, $2, '2026-01-01')`,
      [organizationId, id],
    );
    employees.push(Object.freeze({ id }));
  }
  return Object.freeze(employees);
}

async function createClosureSources(
  client: import('pg').Client,
  organizationId: DomainId<'Organization'>,
  employees: readonly Readonly<{ id: DomainId<'Employee'> }>[],
) {
  for (const [index, employee] of employees.entries()) {
    await client.query(
      `insert into daily_projections
        (organization_id, employee_id, local_date, calculation_status, projection_version,
         engine_version, source_fingerprint, expected_minutes, worked_minutes, break_minutes,
         absence_credit_minutes, adjustment_minutes, credited_minutes, balance_minutes,
         warning_codes, source_references, calculated_at)
       values ($1, $2, '2026-08-03', 'COMPLETE', 1, 'test-engine', $3, 480, 0, 0,
         0, 0, 0, -480, '[]', '{}', '2026-08-03T18:00:00Z')`,
      [organizationId, employee.id, '0'.repeat(64)],
    );
    await client.query(
      `insert into monthly_periods
        (organization_id, employee_id, month_start, status, locked_at)
       values ($1, $2, '2026-08-01', $3, $4)`,
      [
        organizationId,
        employee.id,
        index < 10 ? 'LOCKED' : 'OPEN',
        index < 10 ? '2026-09-01T10:00:00Z' : null,
      ],
    );
  }
}

async function createAbsenceSources(
  client: import('pg').Client,
  organizationId: DomainId<'Organization'>,
  employees: readonly Readonly<{ id: DomainId<'Employee'> }>[],
) {
  const schedule = await client.query<{ id: string }>(
    `insert into weekly_schedules
      (organization_id, name, version, monday_minutes, tuesday_minutes, wednesday_minutes,
       thursday_minutes, friday_minutes, saturday_minutes, sunday_minutes)
     values ($1, 'Standard', 1, 480, 480, 480, 480, 480, 0, 0) returning id`,
    [organizationId],
  );
  const scheduleId = schedule.rows[0]?.id;
  for (const employee of employees) {
    await client.query(
      `insert into schedule_assignments (organization_id, employee_id, schedule_id, starts_on)
       values ($1, $2, $3, '2026-01-01')`,
      [organizationId, employee.id, scheduleId],
    );
  }
  const absenceType = await client.query<{ id: string }>(
    `insert into absence_types
      (organization_id, code, name, version, valid_from, policy)
     values ($1, 'SICKNESS', 'Hostile private note', 1, '2026-01-01', '{}') returning id`,
    [organizationId],
  );
  for (let index = 0; index < 3; index += 1) {
    const employee = employees[index];
    if (employee === undefined) throw new Error('Expected absence fixture employee.');
    await createAbsenceCase(
      client,
      organizationId,
      employee.id,
      absenceType.rows[0]?.id,
      `2026-08-0${index + 3}`,
      480,
    );
  }
  const firstEmployee = employees[0];
  if (firstEmployee === undefined) throw new Error('Expected absence fixture employee.');
  await client.query(
    `insert into holidays (organization_id, holiday_date, name)
     values ($1, '2026-08-10', 'Private holiday')`,
    [organizationId],
  );
  await createAbsenceCase(
    client,
    organizationId,
    firstEmployee.id,
    absenceType.rows[0]?.id,
    '2026-08-10',
    0,
  );
  await createAbsenceCase(
    client,
    organizationId,
    firstEmployee.id,
    absenceType.rows[0]?.id,
    '2026-08-09',
    0,
  );
  const fourthEmployee = employees[3];
  if (fourthEmployee === undefined) throw new Error('Expected pending absence fixture employee.');
  await createAbsenceCase(
    client,
    organizationId,
    fourthEmployee.id,
    absenceType.rows[0]?.id,
    '2026-08-06',
    480,
    'SUBMITTED',
  );
}

async function createAbsenceCase(
  client: import('pg').Client,
  organizationId: DomainId<'Organization'>,
  employeeId: DomainId<'Employee'>,
  absenceTypeId: string | undefined,
  localDate: string,
  scheduledMinutes: number,
  status: 'APPROVED' | 'SUBMITTED' = 'APPROVED',
) {
  const request = await client.query<{ id: string }>(
    `insert into absence_requests
      (organization_id, employee_id, absence_type_id, requested_by_employee_id, status, submitted_at)
     values ($1, $2, $3, $2, $4, '2026-08-01T08:00:00Z') returning id`,
    [organizationId, employeeId, absenceTypeId, status],
  );
  const segment = await client.query<{ id: string }>(
    `insert into absence_coverage_segments
      (organization_id, absence_request_id, local_date, kind)
     values ($1, $2, $3, 'FULL_DAY') returning id`,
    [organizationId, request.rows[0]?.id, localDate],
  );
  await client.query(
    `insert into absence_effects
      (organization_id, absence_request_id, absence_coverage_segment_id, employee_id,
       local_date, expected_reduction_minutes, credit_minutes, entitlement_minutes, effect_version)
     values ($1, $2, $3, $4, $5, $6, $6, $6, 1)`,
    [
      organizationId,
      request.rows[0]?.id,
      segment.rows[0]?.id,
      employeeId,
      localDate,
      scheduledMinutes,
    ],
  );
}

function domainId<Entity extends string>(value: unknown): DomainId<Entity> {
  const parsed = parseDomainId<Entity>(value);
  if (!parsed.ok) throw new Error(`Invalid test ${parsed.error.code}.`);
  return parsed.value;
}

function instant(value: string): Instant {
  const parsed = parseInstant(value);
  if (!parsed.ok) throw new Error(`Invalid test ${parsed.error.code}.`);
  return parsed.value;
}
