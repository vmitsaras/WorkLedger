import { hashPassword } from 'better-auth/crypto';
import { fileURLToPath } from 'node:url';

import type pg from 'pg';

import {
  teamCalendarEnvelopeSchema,
  teamStatusEnvelopeSchema,
  type TeamCalendar,
  type TeamStatus,
} from '@workledger/contracts';
import { createDatabaseHarnessState, createPostgresSchemaFixture } from '@workledger/test-utils';

import { createRuntimeConfig } from '../src/config.js';
import { createApiServer } from '../src/server.js';

const databaseHarness = createDatabaseHarnessState(process.env);
const integrationTest = databaseHarness.enabled ? test : test.skip;
const ORIGIN = 'https://ledger.example.test';
const AUTH_SECRET = 'team-status-secret-with-more-than-thirty-two-bytes';
const NOW = '2026-08-14T10:30:45Z';
const repositoryDirectory = fileURLToPath(new URL('../../..', import.meta.url));
const migrationFiles = [
  '0000_initial_schema.sql',
  '0001_integrity_constraints.sql',
  '0002_auth_foundation.sql',
  '0003_authorization_foundation.sql',
  '0004_audit_foundation.sql',
  '0005_idempotency_foundation.sql',
  '0006_zero_daily_delta.sql',
  '0007_correction_request_snapshots.sql',
  '0008_nappy_bromley.sql',
  '0009_married_justin_hammer.sql',
  '0010_broad_sunfire.sql',
  '0011_nasty_red_hulk.sql',
  '0012_silly_magik.sql',
  '0013_brave_bulldozer.sql',
  '0014_adorable_piledriver.sql',
].map((file) => `${repositoryDirectory}/packages/database/migrations/${file}`);

integrationTest(
  `returns current direct-report status without protected absence context (${databaseHarness.safeLabel})`,
  async () => {
    const fixture = await createPostgresSchemaFixture({
      connectionString: databaseHarness.url,
      label: 'team_status',
      migrationFiles,
    });
    const app = createApiServer(
      createRuntimeConfig({
        WORKLEDGER_AUTH_SECRET: AUTH_SECRET,
        WORKLEDGER_DATABASE_URL: fixture.databaseUrl,
        WORKLEDGER_ENVIRONMENT: 'test',
        WORKLEDGER_ORIGIN: ORIGIN,
      }),
      { now: () => NOW },
    );

    try {
      const scenario = await createScenario(fixture.client);
      const managerCookie = await signIn(app, scenario.manager);
      const response = await getTeamStatus(app, managerCookie);
      expect(response.statusCode).toBe(200);
      expect(response.headers['cache-control']).toBe('private, no-store');
      const status = teamStatusEnvelopeSchema.parse(response.json()).data;

      expect(status).toMatchObject({
        asOf: NOW,
        localDate: '2026-08-14',
        summary: {
          offWork: 1,
          onBreak: 1,
          total: 4,
          unavailable: 1,
          unresolved: 2,
          working: 1,
        },
        timeZone: 'Europe/Berlin',
      });
      expect(status.members).toEqual([
        {
          availability: 'WORKING',
          displayName: 'Ari Working',
          hasUnresolvedRecords: true,
          teamName: 'Delivery',
        },
        {
          availability: 'ON_BREAK',
          displayName: 'Bea Break',
          hasUnresolvedRecords: false,
          teamName: 'Delivery',
        },
        {
          availability: 'UNAVAILABLE',
          displayName: 'Cleo Away',
          hasUnresolvedRecords: true,
          teamName: 'Delivery',
        },
        {
          availability: 'OFF_WORK',
          displayName: 'Dara Cancelled',
          hasUnresolvedRecords: false,
          teamName: 'Delivery',
        },
      ]);
      expect(status.members.map(({ displayName }) => displayName)).not.toEqual(
        expect.arrayContaining(['Former Report', 'Unrelated Employee', 'Team Manager']),
      );
      assertPrivacyMinimized(status);

      const calendarResponse = await getTeamCalendar(app, managerCookie, '2026-08');
      expect(calendarResponse.statusCode).toBe(200);
      expect(calendarResponse.headers['cache-control']).toBe('private, no-store');
      const calendar = teamCalendarEnvelopeSchema.parse(calendarResponse.json()).data;
      expect(calendar).toMatchObject({
        leadingEmptyDays: 5,
        month: '2026-08',
        scopeAsOfLocalDate: '2026-08-14',
        timeZone: 'Europe/Berlin',
      });
      expect(calendar.days).toHaveLength(31);
      expect(calendar.entries).toEqual([
        {
          availability: 'UNAVAILABLE',
          coverageKind: 'FULL_DAY',
          employeeDisplayName: 'Ari Working',
          endsAtMinute: null,
          localDate: '2026-08-14',
          startsAtMinute: null,
          teamName: 'Delivery',
        },
        {
          availability: 'UNAVAILABLE',
          coverageKind: 'FULL_DAY',
          employeeDisplayName: 'Cleo Away',
          endsAtMinute: null,
          localDate: '2026-08-14',
          startsAtMinute: null,
          teamName: 'Delivery',
        },
      ]);
      expect(calendar.entries.map(({ employeeDisplayName }) => employeeDisplayName)).not.toEqual(
        expect.arrayContaining(['Dara Cancelled', 'Former Report', 'Unrelated Employee']),
      );
      assertCalendarPrivacyMinimized(calendar);

      const hrCookie = await signIn(app, scenario.hrOnly);
      const hrStatus = teamStatusEnvelopeSchema.parse(
        (await getTeamStatus(app, hrCookie)).json(),
      ).data;
      expect(hrStatus.summary.total).toBe(7);
      expect(hrStatus.members.map(({ displayName }) => displayName)).toEqual(
        expect.arrayContaining(['Former Report', 'Unrelated Employee', 'Team Manager']),
      );
      assertPrivacyMinimized(hrStatus);
      const hrCalendar = teamCalendarEnvelopeSchema.parse(
        (await getTeamCalendar(app, hrCookie, '2026-08')).json(),
      ).data;
      expect(hrCalendar.entries).toHaveLength(2);
      assertCalendarPrivacyMinimized(hrCalendar);

      const systemCookie = await signIn(app, scenario.system);
      const denied = await getTeamStatus(app, systemCookie);
      expect(denied.statusCode).toBe(403);
      expect(JSON.stringify(denied.json())).not.toContain('Ari Working');
      const deniedCalendar = await getTeamCalendar(app, systemCookie, '2026-08');
      expect(deniedCalendar.statusCode).toBe(403);
      expect(JSON.stringify(deniedCalendar.json())).not.toContain('Ari Working');

      const invalidMonth = await getTeamCalendar(app, managerCookie, '2026-13');
      expect(invalidMonth.statusCode).toBe(422);
      expect(JSON.stringify(invalidMonth.json())).not.toContain('Ari Working');
    } finally {
      await app.close();
      await fixture.cleanup();
    }
  },
);

type Credentials = Readonly<{ email: string; password: string }>;

async function createScenario(client: pg.PoolClient) {
  const organizationId = requiredId(
    (
      await client.query<{ id: string }>(
        `insert into organizations (name, time_zone)
         values ('Team status organization', 'Europe/Berlin') returning id`,
      )
    ).rows[0]?.id,
  );
  const teamId = requiredId(
    (
      await client.query<{ id: string }>(
        `insert into teams (organization_id, name) values ($1, 'Delivery') returning id`,
        [organizationId],
      )
    ).rows[0]?.id,
  );
  const managerEmployeeId = await createEmployee(
    client,
    organizationId,
    'TEAM-MGR',
    'Team Manager',
  );
  const workingId = await createEmployee(client, organizationId, 'TEAM-001', 'Ari Working');
  const breakId = await createEmployee(client, organizationId, 'TEAM-002', 'Bea Break');
  const awayId = await createEmployee(client, organizationId, 'TEAM-003', 'Cleo Away');
  const cancelledId = await createEmployee(client, organizationId, 'TEAM-004', 'Dara Cancelled');
  const formerId = await createEmployee(client, organizationId, 'TEAM-005', 'Former Report');
  await createEmployee(client, organizationId, 'TEAM-006', 'Unrelated Employee');

  await client.query(
    `insert into manager_assignments
      (organization_id, employee_id, manager_employee_id, starts_on, ends_on)
     values ($1, $2, $6, '2025-01-01', null),
            ($1, $3, $6, '2025-01-01', null),
            ($1, $4, $6, '2025-01-01', null),
            ($1, $5, $6, '2025-01-01', null),
            ($1, $7, $6, '2025-01-01', '2026-08-01')`,
    [organizationId, workingId, breakId, awayId, cancelledId, managerEmployeeId, formerId],
  );
  for (const employeeId of [workingId, breakId, awayId, cancelledId]) {
    await client.query(
      `insert into team_assignments (organization_id, employee_id, team_id, starts_on)
       values ($1, $2, $3, '2025-01-01')`,
      [organizationId, employeeId, teamId],
    );
  }
  await client.query(
    `insert into attendance_heads
      (organization_id, employee_id, state, attendance_revision, next_event_sequence, updated_at)
     values ($1, $2, 'WORKING', 1, 2, $4), ($1, $3, 'ON_BREAK', 2, 3, $4)`,
    [organizationId, workingId, breakId, NOW],
  );

  const sicknessTypeId = await createSicknessType(client, organizationId);
  await createAbsence(client, organizationId, workingId, sicknessTypeId, 'ACKNOWLEDGED');
  await createAbsence(client, organizationId, awayId, sicknessTypeId, 'CHANGES_REQUESTED');
  const cancelled = await createAbsence(
    client,
    organizationId,
    cancelledId,
    sicknessTypeId,
    'PARTIALLY_CANCELLED',
  );
  await client
    .query(
      `insert into absence_cancellations
      (organization_id, absence_request_id, employee_id, requested_by_employee_id, status,
       version, submitted_at)
     values ($1, $2, $3, $3, 'APPROVED', 2, $4) returning id`,
      [organizationId, cancelled.requestId, cancelledId, NOW],
    )
    .then(async (result: pg.QueryResult<{ id: string }>) => {
      await client.query(
        `insert into absence_cancellation_segments
        (organization_id, absence_cancellation_id, absence_coverage_segment_id)
       values ($1, $2, $3)`,
        [organizationId, requiredId(result.rows[0]?.id), cancelled.segmentId],
      );
    });
  await client.query(
    `insert into correction_requests
      (organization_id, employee_id, requested_by_employee_id, local_date, status, reason,
       original_interpretation, proposed_interpretation, version, created_at)
     values ($1, $2, $2, '2026-08-14', 'SUBMITTED',
             'Private correction reason must not leave the API', '{}'::jsonb, '{}'::jsonb, 1, $3)`,
    [organizationId, workingId, NOW],
  );

  const manager = await createAccount(client, organizationId, {
    email: 'team-manager@example.test',
    employeeId: managerEmployeeId,
    name: 'Team Manager',
    password: 'safe team manager passphrase 2026',
    role: 'MANAGER',
  });
  const hrOnly = await createAccount(client, organizationId, {
    email: 'team-hr@example.test',
    name: 'HR administrator',
    password: 'safe team hr passphrase 2026',
    role: 'HR_ADMINISTRATOR',
  });
  const system = await createAccount(client, organizationId, {
    email: 'team-system@example.test',
    name: 'System administrator',
    password: 'safe team system passphrase 2026',
    role: 'SYSTEM_ADMINISTRATOR',
  });
  return Object.freeze({ hrOnly, manager, system });
}

async function createEmployee(
  client: pg.PoolClient,
  organizationId: string,
  employeeNumber: string,
  displayName: string,
) {
  const employeeId = requiredId(
    (
      await client.query<{ id: string }>(
        `insert into employees (organization_id, employee_number, display_name, status)
         values ($1, $2, $3, 'ACTIVE') returning id`,
        [organizationId, employeeNumber, displayName],
      )
    ).rows[0]?.id,
  );
  await client.query(
    `insert into employment_periods (organization_id, employee_id, starts_on)
     values ($1, $2, '2025-01-01')`,
    [organizationId, employeeId],
  );
  return employeeId;
}

async function createSicknessType(client: pg.PoolClient, organizationId: string) {
  return requiredId(
    (
      await client.query<{ id: string }>(
        `insert into absence_types
          (organization_id, code, name, version, active, valid_from, policy)
         values ($1, 'SICKNESS', 'Private sickness type', 1, true, '2025-01-01', $2::jsonb)
         returning id`,
        [
          organizationId,
          JSON.stringify({
            allowedCoverageUnits: ['FULL_DAY'],
            availabilityState: 'UNAVAILABLE',
            entitlementAccountCategory: null,
            maximumRetrospectiveCalendarDays: 7,
            minimumLeadCalendarDays: 0,
            pendingReservationBehavior: 'NONE',
            requestNoteMode: 'DISABLED',
            timeTreatment: 'CREDIT_COVERED_EXPECTATION',
            workflow: 'REPORT_AND_ACKNOWLEDGE',
          }),
        ],
      )
    ).rows[0]?.id,
  );
}

async function createAbsence(
  client: pg.PoolClient,
  organizationId: string,
  employeeId: string,
  absenceTypeId: string,
  status: 'ACKNOWLEDGED' | 'CHANGES_REQUESTED' | 'PARTIALLY_CANCELLED',
) {
  const requestId = requiredId(
    (
      await client.query<{ id: string }>(
        `insert into absence_requests
          (organization_id, employee_id, absence_type_id, requested_by_employee_id, status,
           version, submitted_at)
         values ($1, $2, $3, $2, $4, 1, $5) returning id`,
        [organizationId, employeeId, absenceTypeId, status, NOW],
      )
    ).rows[0]?.id,
  );
  const segmentId = requiredId(
    (
      await client.query<{ id: string }>(
        `insert into absence_coverage_segments
          (organization_id, absence_request_id, local_date, kind)
         values ($1, $2, '2026-08-14', 'FULL_DAY') returning id`,
        [organizationId, requestId],
      )
    ).rows[0]?.id,
  );
  await client.query(
    `insert into absence_effects
      (organization_id, absence_request_id, absence_coverage_segment_id, employee_id, local_date,
       expected_reduction_minutes, credit_minutes, entitlement_minutes, effect_version)
     values ($1, $2, $3, $4, '2026-08-14', 0, 480, 0, 1)`,
    [organizationId, requestId, segmentId, employeeId],
  );
  return Object.freeze({ requestId, segmentId });
}

async function createAccount(
  client: pg.PoolClient,
  organizationId: string,
  input: Readonly<{
    email: string;
    employeeId?: string;
    name: string;
    password: string;
    role: 'HR_ADMINISTRATOR' | 'MANAGER' | 'SYSTEM_ADMINISTRATOR';
  }>,
): Promise<Credentials> {
  const accountId = requiredId(
    (
      await client.query<{ id: string }>(
        `insert into auth_users (name, email, email_verified, active)
         values ($1, $2, true, true) returning id`,
        [input.name, input.email],
      )
    ).rows[0]?.id,
  );
  await client.query(
    `insert into auth_accounts (user_id, account_id, provider_id, password)
     values ($1, $2, 'credential', $3)`,
    [accountId, accountId, await hashPassword(input.password)],
  );
  if (input.employeeId !== undefined) {
    await client.query(
      `insert into account_employee_links (organization_id, user_id, employee_id)
       values ($1, $2, $3)`,
      [organizationId, accountId, input.employeeId],
    );
  }
  await client.query(
    `insert into account_role_assignments (organization_id, user_id, role)
     values ($1, $2, $3)`,
    [organizationId, accountId, input.role],
  );
  return Object.freeze({ email: input.email, password: input.password });
}

async function signIn(app: ReturnType<typeof createApiServer>, credentials: Credentials) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/sign-in/email',
    headers: { 'content-type': 'application/json', origin: ORIGIN },
    payload: credentials,
  });
  expect(response.statusCode).toBe(200);
  const setCookie = Array.isArray(response.headers['set-cookie'])
    ? response.headers['set-cookie'][0]
    : response.headers['set-cookie'];
  const cookie = setCookie?.split(';', 1)[0];
  if (cookie === undefined) throw new Error('Expected session cookie.');
  return cookie;
}

function getTeamStatus(app: ReturnType<typeof createApiServer>, cookie: string) {
  return app.inject({ method: 'GET', url: '/v1/team/status', headers: { cookie, origin: ORIGIN } });
}

function getTeamCalendar(app: ReturnType<typeof createApiServer>, cookie: string, month: string) {
  return app.inject({
    method: 'GET',
    url: `/v1/team/calendar?month=${encodeURIComponent(month)}`,
    headers: { cookie, origin: ORIGIN },
  });
}

function assertPrivacyMinimized(status: TeamStatus) {
  const serialized = JSON.stringify(status);
  for (const forbidden of [
    'SICKNESS',
    'sickness',
    'Private correction',
    'requestId',
    'employeeId',
    'absenceType',
    'reason',
    'entitlement',
  ]) {
    expect(serialized).not.toContain(forbidden);
  }
}

function assertCalendarPrivacyMinimized(calendar: TeamCalendar) {
  const serialized = JSON.stringify(calendar);
  for (const forbidden of [
    'SICKNESS',
    'sickness',
    'requestId',
    'employeeId',
    'absenceType',
    'reason',
    'entitlement',
    'reviewer',
  ]) {
    expect(serialized).not.toContain(forbidden);
  }
}

function requiredId(value: string | undefined): string {
  if (value === undefined) throw new Error('Expected database identifier.');
  return value;
}
