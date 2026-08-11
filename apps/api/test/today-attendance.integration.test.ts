import { hashPassword } from 'better-auth/crypto';
import { fileURLToPath } from 'node:url';

import type pg from 'pg';

import { createDatabaseHarnessState, createPostgresSchemaFixture } from '@workledger/test-utils';

import { createRuntimeConfig } from '../src/config.js';
import { createApiServer } from '../src/server.js';

const databaseHarness = createDatabaseHarnessState(process.env);
const integrationTest = databaseHarness.enabled ? test : test.skip;
const ORIGIN = 'https://ledger.example.test';
const AUTH_SECRET = 'today-attendance-secret-with-more-than-thirty-two-bytes';
const EMAIL = 'today@example.test';
const PASSWORD = 'safe today attendance passphrase 2026';
const NOW = '2026-02-03T10:30:45Z';
const repositoryDirectory = fileURLToPath(new URL('../../..', import.meta.url));
const migrationFiles = [
  '0000_initial_schema.sql',
  '0001_integrity_constraints.sql',
  '0002_auth_foundation.sql',
  '0003_authorization_foundation.sql',
  '0004_audit_foundation.sql',
  '0005_idempotency_foundation.sql',
  '0006_zero_daily_delta.sql',
].map((file) => `${repositoryDirectory}/packages/database/migrations/${file}`);

integrationTest(
  `serves a permission-scoped, provisional Today read model (${databaseHarness.safeLabel})`,
  async () => {
    const fixture = await createPostgresSchemaFixture({
      connectionString: databaseHarness.url,
      label: 'today_attendance',
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
      const employee = await createTodayEmployee(fixture.client);
      const cookie = await signIn(app);
      const response = await app.inject({
        method: 'GET',
        url: '/v1/me/attendance/today',
        headers: { cookie, origin: ORIGIN },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['cache-control']).toBe('private, no-store');
      expect(response.json()).toMatchObject({
        data: {
          asOf: '2026-02-03T10:30:00Z',
          attendance: {
            activeSince: '2026-02-03T10:15:00Z',
            attendanceRevision: 3,
            state: 'WORKING',
            validActions: ['START_BREAK', 'CLOCK_OUT'],
          },
          calculation: {
            blockers: [],
            estimate: {
              balanceMinutes: -285,
              breakMinutes: 15,
              creditedMinutes: 195,
              expectedMinutes: 480,
              workedMinutes: 195,
            },
            holidayName: null,
            status: 'PROVISIONAL',
            warnings: ['FLEX_NEGATIVE_THRESHOLD_EXCEEDED'],
          },
          localDate: '2026-02-03',
          timeZone: 'Europe/Berlin',
          timeline: [
            { occurredAt: '2026-02-03T07:00:00Z', type: 'CLOCK_IN' },
            { occurredAt: '2026-02-03T10:00:00Z', type: 'BREAK_START' },
            { occurredAt: '2026-02-03T10:15:00Z', type: 'BREAK_END' },
          ],
          timelineTruncated: false,
        },
      });
      expect(response.payload).not.toContain('employeeId');
      expect(response.payload).not.toContain('organizationId');

      await fixture.client.query(`delete from schedule_assignments where employee_id = $1`, [
        employee.employeeId,
      ]);
      const missingScheduleResponse = await app.inject({
        method: 'GET',
        url: '/v1/me/attendance/today',
        headers: { cookie, origin: ORIGIN },
      });
      expect(missingScheduleResponse.statusCode).toBe(200);
      expect(missingScheduleResponse.json()).toMatchObject({
        data: {
          calculation: {
            blockers: ['SCHEDULE_NOT_ASSIGNED'],
            estimate: null,
            status: 'INCOMPLETE',
          },
        },
      });

      await fixture.client.query(`update employees set status = 'INACTIVE' where id = $1`, [
        employee.employeeId,
      ]);
      const deniedResponse = await app.inject({
        method: 'GET',
        url: '/v1/me/attendance/today',
        headers: { cookie, origin: ORIGIN },
      });
      expect(deniedResponse.statusCode).toBe(403);
      expect(deniedResponse.json()).toMatchObject({ error: { code: 'ACCESS_DENIED' } });
      expect(deniedResponse.payload).not.toContain('attendanceRevision');
      expect(deniedResponse.payload).not.toContain(employee.employeeId);
    } finally {
      await app.close();
      await fixture.cleanup();
    }
  },
);

async function createTodayEmployee(
  client: pg.PoolClient,
): Promise<Readonly<{ employeeId: string; organizationId: string }>> {
  const passwordHash = await hashPassword(PASSWORD);
  const organization = await client.query<{ id: string }>(
    `insert into organizations (name, time_zone)
     values ('Today Organization', 'Europe/Berlin')
     returning id`,
  );
  const organizationId = organization.rows[0]?.id;
  if (organizationId === undefined) throw new Error('Expected organization ID.');
  const account = await client.query<{ id: string }>(
    `insert into auth_users (name, email, email_verified, active)
     values ('Today Employee', $1, true, true)
     returning id`,
    [EMAIL],
  );
  const accountId = account.rows[0]?.id;
  if (accountId === undefined) throw new Error('Expected account ID.');
  await client.query(
    `insert into auth_accounts (user_id, account_id, provider_id, password)
     values ($1, $2, 'credential', $3)`,
    [accountId, accountId, passwordHash],
  );
  const employee = await client.query<{ id: string }>(
    `insert into employees (organization_id, employee_number, display_name, status)
     values ($1, 'TODAY-001', 'Today Employee', 'ACTIVE')
     returning id`,
    [organizationId],
  );
  const employeeId = employee.rows[0]?.id;
  if (employeeId === undefined) throw new Error('Expected employee ID.');
  await client.query(
    `insert into employment_periods (organization_id, employee_id, starts_on)
     values ($1, $2, '2025-01-01')`,
    [organizationId, employeeId],
  );
  await client.query(
    `insert into account_employee_links (organization_id, user_id, employee_id)
     values ($1, $2, $3)`,
    [organizationId, accountId, employeeId],
  );
  await client.query(
    `insert into account_role_assignments (organization_id, user_id, role)
     values ($1, $2, 'EMPLOYEE')`,
    [organizationId, accountId],
  );

  const schedule = await client.query<{ id: string }>(
    `insert into weekly_schedules (
       organization_id, name, version, monday_minutes, tuesday_minutes, wednesday_minutes,
       thursday_minutes, friday_minutes, saturday_minutes, sunday_minutes
     ) values ($1, 'Standard', 1, 480, 480, 480, 480, 480, 0, 0)
     returning id`,
    [organizationId],
  );
  const scheduleId = schedule.rows[0]?.id;
  if (scheduleId === undefined) throw new Error('Expected schedule ID.');
  await client.query(
    `insert into schedule_assignments (organization_id, employee_id, schedule_id, starts_on)
     values ($1, $2, $3, '2025-01-01')`,
    [organizationId, employeeId, scheduleId],
  );

  const policy = await client.query<{ id: string }>(
    `insert into time_policies (organization_id, name, version, rules)
     values ($1, 'Standard', 1, '{"flexibleTimeWarningMinutes":30}'::jsonb)
     returning id`,
    [organizationId],
  );
  const policyId = policy.rows[0]?.id;
  if (policyId === undefined) throw new Error('Expected policy ID.');
  await client.query(
    `insert into policy_assignments (organization_id, employee_id, policy_id, starts_on)
     values ($1, $2, $3, '2025-01-01')`,
    [organizationId, employeeId, policyId],
  );

  await client.query(
    `insert into attendance_heads (
       employee_id, organization_id, state, attendance_revision, next_event_sequence, updated_at
     ) values ($1, $2, 'WORKING', 3, 4, $3)`,
    [employeeId, organizationId, '2026-02-03T10:15:00Z'],
  );
  const eventValues = [
    [1, 'CLOCK_IN', '2026-02-03T07:00:00Z'],
    [2, 'BREAK_START', '2026-02-03T10:00:00Z'],
    [3, 'BREAK_END', '2026-02-03T10:15:00Z'],
  ] as const;
  for (const [sequence, type, occurredAt] of eventValues) {
    await client.query(
      `insert into punch_events (
         organization_id, employee_id, event_sequence, event_type, occurred_at,
         actor_employee_id, command_id
       ) values ($1, $2, $3, $4, $5, $2, uuidv7())`,
      [organizationId, employeeId, sequence, type, occurredAt],
    );
  }

  return Object.freeze({ employeeId, organizationId });
}

async function signIn(app: ReturnType<typeof createApiServer>): Promise<string> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/sign-in/email',
    headers: { 'content-type': 'application/json', origin: ORIGIN },
    payload: { email: EMAIL, password: PASSWORD },
  });
  expect(response.statusCode).toBe(200);
  const setCookie = Array.isArray(response.headers['set-cookie'])
    ? response.headers['set-cookie'][0]
    : response.headers['set-cookie'];
  const cookie = setCookie?.split(';', 1)[0];
  if (cookie === undefined) throw new Error('Expected session cookie.');
  return cookie;
}
