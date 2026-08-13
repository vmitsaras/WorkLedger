import { hashPassword } from 'better-auth/crypto';
import { fileURLToPath } from 'node:url';

import type pg from 'pg';

import { createDatabaseHarnessState, createPostgresSchemaFixture } from '@workledger/test-utils';

import { createRuntimeConfig } from '../src/config.js';
import { createApiServer } from '../src/server.js';

const databaseHarness = createDatabaseHarnessState(process.env);
const integrationTest = databaseHarness.enabled ? test : test.skip;
const ORIGIN = 'https://ledger.example.test';
const AUTH_SECRET = 'correction-request-secret-with-more-than-thirty-two-bytes';
const EMAIL = 'correction@example.test';
const PASSWORD = 'safe correction request passphrase 2026';
const MANAGER_EMAIL = 'manager-correction@example.test';
const MANAGER_PASSWORD = 'safe manager correction passphrase 2026';
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
  '0007_correction_request_snapshots.sql',
  '0008_nappy_bromley.sql',
].map((file) => `${repositoryDirectory}/packages/database/migrations/${file}`);

integrationTest(
  `submits an employee correction request without changing raw attendance (${databaseHarness.safeLabel})`,
  async () => {
    const fixture = await createPostgresSchemaFixture({
      connectionString: databaseHarness.url,
      label: 'correction_request',
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
      const employee = await createEmployee(fixture.client);
      const projectionId = await insertProjection(fixture.client, employee);
      const cookie = await signIn(app);
      const csrf = await app.inject({
        method: 'GET',
        url: '/v1/me/csrf',
        headers: { cookie, origin: ORIGIN },
      });
      expect(csrf.statusCode).toBe(200);
      const token = csrf.json<{ data: { token: string } }>().data.token;
      const response = await app.inject({
        method: 'POST',
        url: '/v1/me/correction-requests',
        headers: {
          'content-type': 'application/json',
          cookie,
          origin: ORIGIN,
          'x-workledger-csrf': token,
        },
        payload: {
          interval: {
            endsAtLocalTime: '10:00',
            endsAtUtcOffset: null,
            startsAtLocalTime: '09:00',
            startsAtUtcOffset: null,
          },
          reason: 'I omitted the final part of my work session.',
          recordId: projectionId,
        },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json()).toMatchObject({
        data: { localDate: '2026-02-03', proposedDurationMinutes: 60, status: 'SUBMITTED' },
      });
      const stored = await fixture.client.query<{
        original_interpretation: { events: unknown[]; projectionId: string };
        proposed_interpretation: { endsAt: string; kind: string; startsAt: string };
        reason: string;
      }>(
        `select original_interpretation, proposed_interpretation, reason
         from correction_requests`,
      );
      expect(stored.rows).toHaveLength(1);
      expect(stored.rows[0]).toMatchObject({
        original_interpretation: { events: [{ type: 'CLOCK_IN' }], projectionId },
        proposed_interpretation: {
          endsAt: '2026-02-03T09:00:00Z',
          kind: 'REPLACE_DAILY_WORK_INTERVAL',
          startsAt: '2026-02-03T08:00:00Z',
        },
        reason: 'I omitted the final part of my work session.',
      });
      await expect(
        fixture.client.query(`update punch_events set event_type = 'CLOCK_OUT'`),
      ).rejects.toThrow();
      const audit = await fixture.client.query<{ action_code: string; reason_code: string }>(
        `select action_code, reason_code from domain_audit_events`,
      );
      expect(audit.rows).toContainEqual({
        action_code: 'CORRECTION_REQUEST_SUBMITTED',
        reason_code: 'EMPLOYEE_SUBMITTED',
      });
      const manager = await createManager(fixture.client, employee);
      const managerCookie = await signIn(app, MANAGER_EMAIL, MANAGER_PASSWORD);
      const queue = await app.inject({
        method: 'GET',
        url: '/v1/manager/correction-requests',
        headers: { cookie: managerCookie, origin: ORIGIN },
      });
      expect(queue.statusCode).toBe(200);
      expect(queue.json()).toMatchObject({
        data: {
          items: [
            {
              employeeDisplayName: 'Correction Employee',
              id: response.json<{ data: { id: string } }>().data.id,
              status: 'SUBMITTED',
              version: 1,
            },
          ],
        },
      });
      const managerCsrf = await app.inject({
        method: 'GET',
        url: '/v1/me/csrf',
        headers: { cookie: managerCookie, origin: ORIGIN },
      });
      const decision = await app.inject({
        method: 'POST',
        url: `/v1/manager/correction-requests/${response.json<{ data: { id: string } }>().data.id}/decision`,
        headers: {
          'content-type': 'application/json',
          cookie: managerCookie,
          origin: ORIGIN,
          'x-workledger-csrf': managerCsrf.json<{ data: { token: string } }>().data.token,
        },
        payload: {
          action: 'APPROVE',
          expectedVersion: 1,
          reason: 'The proposed interval matches the submitted evidence.',
        },
      });
      expect(decision.statusCode).toBe(200);
      expect(decision.json()).toMatchObject({ data: { status: 'APPROVED', version: 2 } });
      const applicationCount = await fixture.client.query<{ count: string }>(
        'select count(*) from applied_corrections',
      );
      expect(applicationCount.rows[0]?.count).toBe('0');
      await fixture.client.query(
        `insert into monthly_periods (organization_id, employee_id, month_start, status, locked_at)
         values ($1, $2, '2026-02-01', 'LOCKED', '2026-02-28T12:00:00Z')`,
        [employee.organizationId, employee.employeeId],
      );
      const locked = await app.inject({
        method: 'POST',
        url: `/v1/manager/correction-requests/${response.json<{ data: { id: string } }>().data.id}/apply`,
        headers: {
          'content-type': 'application/json',
          cookie: managerCookie,
          origin: ORIGIN,
          'x-workledger-csrf': managerCsrf.json<{ data: { token: string } }>().data.token,
        },
        payload: { expectedVersion: 2 },
      });
      expect(locked.statusCode).toBe(409);
      expect(locked.json()).toMatchObject({ error: { code: 'PERIOD_ADJUSTMENT_REQUIRED' } });
      expect(
        (await fixture.client.query<{ count: string }>('select count(*) from applied_corrections'))
          .rows[0]?.count,
      ).toBe('0');
      await fixture.client.query(`delete from monthly_periods where organization_id = $1`, [
        employee.organizationId,
      ]);
      const applied = await app.inject({
        method: 'POST',
        url: `/v1/manager/correction-requests/${response.json<{ data: { id: string } }>().data.id}/apply`,
        headers: {
          'content-type': 'application/json',
          cookie: managerCookie,
          origin: ORIGIN,
          'x-workledger-csrf': managerCsrf.json<{ data: { token: string } }>().data.token,
        },
        payload: { expectedVersion: 2 },
      });
      expect(applied.statusCode).toBe(200);
      expect(applied.json()).toMatchObject({
        data: { balanceDeltaMinutes: -60, status: 'APPLIED', workedMinutes: 60 },
      });
      const projected = await fixture.client.query<{
        balance_minutes: number;
        credited_minutes: number;
        projection_version: number;
        worked_minutes: number;
      }>(
        `select worked_minutes, credited_minutes, balance_minutes, projection_version
         from daily_projections where id = $1`,
        [projectionId],
      );
      expect(projected.rows[0]).toEqual({
        balance_minutes: -420,
        credited_minutes: 60,
        projection_version: 2,
        worked_minutes: 60,
      });
      const appliedCount = await fixture.client.query<{ count: string }>(
        'select count(*) from applied_corrections',
      );
      expect(appliedCount.rows[0]?.count).toBe('1');
      const ledger = await fixture.client.query<{ entry_type: string; minutes: number }>(
        'select entry_type, minutes from time_account_entries',
      );
      expect(ledger.rows).toContainEqual({ entry_type: 'DAILY_RECALCULATION_DELTA', minutes: -60 });
      const rejectedRequest = await app.inject({
        method: 'POST',
        url: '/v1/me/correction-requests',
        headers: {
          'content-type': 'application/json',
          cookie,
          origin: ORIGIN,
          'x-workledger-csrf': token,
        },
        payload: {
          interval: {
            endsAtLocalTime: '11:00',
            endsAtUtcOffset: null,
            startsAtLocalTime: '08:00',
            startsAtUtcOffset: null,
          },
          reason: 'This proposal should be rejected in the gate scenario.',
          recordId: projectionId,
        },
      });
      expect(rejectedRequest.statusCode).toBe(201);
      const rejection = await app.inject({
        method: 'POST',
        url: `/v1/manager/correction-requests/${rejectedRequest.json<{ data: { id: string } }>().data.id}/decision`,
        headers: {
          'content-type': 'application/json',
          cookie: managerCookie,
          origin: ORIGIN,
          'x-workledger-csrf': managerCsrf.json<{ data: { token: string } }>().data.token,
        },
        payload: {
          action: 'REJECT',
          expectedVersion: 1,
          reason: 'The proposed interval does not match the recorded evidence.',
        },
      });
      expect(rejection.statusCode).toBe(200);
      expect(rejection.json()).toMatchObject({ data: { status: 'REJECTED', version: 2 } });
      expect(
        (await fixture.client.query<{ count: string }>('select count(*) from applied_corrections'))
          .rows[0]?.count,
      ).toBe('1');
    } finally {
      await app.close();
      await fixture.cleanup();
    }
  },
);

async function createEmployee(
  client: pg.PoolClient,
): Promise<Readonly<{ employeeId: string; organizationId: string }>> {
  const organization = await client.query<{ id: string }>(
    `insert into organizations (name, time_zone) values ('Correction organization', 'Europe/Berlin') returning id`,
  );
  const organizationId = requiredId(organization.rows[0]?.id);
  const account = await client.query<{ id: string }>(
    `insert into auth_users (name, email, email_verified, active) values ('Correction Employee', $1, true, true) returning id`,
    [EMAIL],
  );
  const accountId = requiredId(account.rows[0]?.id);
  await client.query(
    `insert into auth_accounts (user_id, account_id, provider_id, password) values ($1, $2, 'credential', $3)`,
    [accountId, accountId, await hashPassword(PASSWORD)],
  );
  const employee = await client.query<{ id: string }>(
    `insert into employees (organization_id, employee_number, display_name, status) values ($1, 'COR-001', 'Correction Employee', 'ACTIVE') returning id`,
    [organizationId],
  );
  const employeeId = requiredId(employee.rows[0]?.id);
  await client.query(
    `insert into employment_periods (organization_id, employee_id, starts_on) values ($1, $2, '2025-01-01')`,
    [organizationId, employeeId],
  );
  await client.query(
    `insert into account_employee_links (organization_id, user_id, employee_id) values ($1, $2, $3)`,
    [organizationId, accountId, employeeId],
  );
  await client.query(
    `insert into account_role_assignments (organization_id, user_id, role) values ($1, $2, 'EMPLOYEE')`,
    [organizationId, accountId],
  );
  await client.query(
    `insert into punch_events (organization_id, employee_id, event_sequence, event_type, occurred_at, actor_employee_id, command_id) values ($1, $2, 1, 'CLOCK_IN', '2026-02-03T08:00:00Z', $2, uuidv7())`,
    [organizationId, employeeId],
  );
  return Object.freeze({ employeeId, organizationId });
}

async function insertProjection(
  client: pg.PoolClient,
  employee: Readonly<{ employeeId: string; organizationId: string }>,
): Promise<string> {
  const projection = await client.query<{ id: string }>(
    `insert into daily_projections (organization_id, employee_id, local_date, calculation_status, projection_version, engine_version, source_fingerprint, expected_minutes, worked_minutes, break_minutes, absence_credit_minutes, adjustment_minutes, credited_minutes, balance_minutes, warning_codes, source_references, calculated_at)
     values ($1, $2, '2026-02-03', 'INCOMPLETE', 1, 'test', $3, 480, 120, 0, 0, 0, 120, -360, '[]'::jsonb, '{}'::jsonb, '2026-02-03T10:30:00Z') returning id`,
    [employee.organizationId, employee.employeeId, 'b'.repeat(64)],
  );
  return requiredId(projection.rows[0]?.id);
}

async function createManager(
  client: pg.PoolClient,
  employee: Readonly<{ employeeId: string; organizationId: string }>,
) {
  const account = await client.query<{ id: string }>(
    `insert into auth_users (name, email, email_verified, active) values ('Correction Manager', $1, true, true) returning id`,
    [MANAGER_EMAIL],
  );
  const accountId = requiredId(account.rows[0]?.id);
  await client.query(
    `insert into auth_accounts (user_id, account_id, provider_id, password) values ($1, $2, 'credential', $3)`,
    [accountId, accountId, await hashPassword(MANAGER_PASSWORD)],
  );
  const manager = await client.query<{ id: string }>(
    `insert into employees (organization_id, employee_number, display_name, status) values ($1, 'COR-MGR-001', 'Correction Manager', 'ACTIVE') returning id`,
    [employee.organizationId],
  );
  const employeeId = requiredId(manager.rows[0]?.id);
  await client.query(
    `insert into employment_periods (organization_id, employee_id, starts_on) values ($1, $2, '2025-01-01')`,
    [employee.organizationId, employeeId],
  );
  await client.query(
    `insert into account_employee_links (organization_id, user_id, employee_id) values ($1, $2, $3)`,
    [employee.organizationId, accountId, employeeId],
  );
  await client.query(
    `insert into account_role_assignments (organization_id, user_id, role) values ($1, $2, 'MANAGER')`,
    [employee.organizationId, accountId],
  );
  await client.query(
    `insert into manager_assignments (organization_id, employee_id, manager_employee_id, starts_on) values ($1, $2, $3, '2025-01-01')`,
    [employee.organizationId, employee.employeeId, employeeId],
  );
}

async function signIn(
  app: ReturnType<typeof createApiServer>,
  email = EMAIL,
  password = PASSWORD,
): Promise<string> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/sign-in/email',
    headers: { 'content-type': 'application/json', origin: ORIGIN },
    payload: { email, password },
  });
  expect(response.statusCode).toBe(200);
  const setCookie = Array.isArray(response.headers['set-cookie'])
    ? response.headers['set-cookie'][0]
    : response.headers['set-cookie'];
  const cookie = setCookie?.split(';', 1)[0];
  if (cookie === undefined) throw new Error('Expected session cookie.');
  return cookie;
}

function requiredId(value: string | undefined): string {
  if (value === undefined) throw new Error('Expected database identifier.');
  return value;
}
