import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { hashPassword } from 'better-auth/crypto';
import type pg from 'pg';

import { createDatabaseHarnessState, createPostgresSchemaFixture } from '@workledger/test-utils';

import { createRuntimeConfig } from '../src/config.js';
import { createApiServer } from '../src/server.js';

const databaseHarness = createDatabaseHarnessState(process.env);
const integrationTest = databaseHarness.enabled ? test : test.skip;
const ORIGIN = 'https://ledger.example.test';
const AUTH_SECRET = 'clock-in-secret-with-more-than-thirty-two-safe-bytes';
const EMAIL = 'clock-in@example.test';
const PASSWORD = 'safe clock in passphrase 2026';
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
  `clocks in once across concurrent retries and preserves authorization, conflict, audit, and clock-regression boundaries (${databaseHarness.safeLabel})`,
  async () => {
    const fixture = await createPostgresSchemaFixture({
      connectionString: databaseHarness.url,
      label: 'clock_in',
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
      const employee = await createClockInEmployee(fixture.client);
      const cookie = await signIn(app);
      const csrf = await getCsrf(app, cookie);

      const unauthenticated = await app.inject({
        method: 'POST',
        url: '/v1/me/attendance/clock-in',
        headers: { origin: ORIGIN },
        payload: { expectedAttendanceRevision: 0 },
      });
      expect(unauthenticated.statusCode).toBe(401);
      expect(unauthenticated.json()).toMatchObject({ error: { code: 'AUTH_REQUIRED' } });

      const invalidCsrf = await app.inject({
        method: 'POST',
        url: '/v1/me/attendance/clock-in',
        headers: { cookie, origin: ORIGIN, 'x-workledger-csrf': 'invalid' },
        payload: { expectedAttendanceRevision: 0 },
      });
      expect(invalidCsrf.statusCode).toBe(403);
      expect(invalidCsrf.json()).toMatchObject({ error: { code: 'AUTH_CSRF_INVALID' } });

      const missingKey = await clockInRequest(app, cookie, csrf, undefined, 0);
      expect(missingKey.statusCode).toBe(422);
      expect(missingKey.json()).toMatchObject({ error: { code: 'IDEMPOTENCY_KEY_REQUIRED' } });

      const malformedKey = await clockInRequest(app, cookie, csrf, 'too-short', 0);
      expect(malformedKey.statusCode).toBe(422);
      expect(malformedKey.json()).toMatchObject({ error: { code: 'IDEMPOTENCY_KEY_INVALID' } });

      const duplicatedKey = await app.inject({
        method: 'POST',
        url: '/v1/me/attendance/clock-in',
        headers: {
          cookie,
          'idempotency-key': ['clock-in-duplicated-key-0001', 'clock-in-duplicated-key-0001'],
          origin: ORIGIN,
          'x-workledger-csrf': csrf,
        },
        payload: { expectedAttendanceRevision: 0 },
      });
      expect(duplicatedKey.statusCode).toBe(422);
      expect(duplicatedKey.json()).toMatchObject({
        error: { code: 'IDEMPOTENCY_KEY_INVALID' },
      });

      const unknownField = await app.inject({
        method: 'POST',
        url: '/v1/me/attendance/clock-in',
        headers: mutationHeaders(cookie, csrf, 'clock-in-unknown-field-0001'),
        payload: { clientOccurredAt: '2026-02-03T08:00:00Z', expectedAttendanceRevision: 0 },
      });
      expect(unknownField.statusCode).toBe(422);
      expect(unknownField.json()).toMatchObject({ error: { code: 'VALIDATION_FAILED' } });
      expect(unknownField.payload).not.toContain('clientOccurredAt');

      const idempotencyKey = 'clock-in-concurrent-intent-0001';
      const [first, second] = await Promise.all([
        clockInRequest(app, cookie, csrf, idempotencyKey, 0),
        clockInRequest(app, cookie, csrf, idempotencyKey, 0),
      ]);
      for (const response of [first, second]) {
        expect(response.statusCode, response.payload).toBe(200);
        expect(response.headers['cache-control']).toBe('private, no-store');
        expect(response.json()).toMatchObject({
          data: {
            attendanceRevision: 1,
            command: 'CLOCK_IN',
            createdEvents: [{ type: 'CLOCK_IN' }],
            occurredAt: '2026-02-03T10:30:00Z',
            resultingState: 'WORKING',
            validActions: ['START_BREAK', 'CLOCK_OUT'],
          },
        });
        expect(response.payload).not.toContain(employee.employeeId);
        expect(response.payload).not.toContain(employee.organizationId);
        expect(response.payload).not.toContain(idempotencyKey);
      }
      expect(
        [first, second].filter((response) => response.json().meta.idempotentReplay === true),
      ).toHaveLength(1);
      expect(first.json().meta.requestId).not.toBe(second.json().meta.requestId);

      const replay = await clockInRequest(app, cookie, csrf, idempotencyKey, 0);
      expect(replay.statusCode).toBe(200);
      expect(replay.json()).toMatchObject({
        data: { attendanceRevision: 1, resultingState: 'WORKING' },
        meta: { idempotentReplay: true },
      });

      const fingerprintConflict = await clockInRequest(app, cookie, csrf, idempotencyKey, 1);
      expect(fingerprintConflict.statusCode).toBe(409);
      expect(fingerprintConflict.json()).toMatchObject({
        error: { code: 'IDEMPOTENCY_KEY_CONFLICT' },
      });
      expect(fingerprintConflict.payload).not.toContain(idempotencyKey);

      const staleKey = 'clock-in-stale-revision-000001';
      const stale = await clockInRequest(app, cookie, csrf, staleKey, 0);
      expect(stale.statusCode).toBe(409);
      expect(stale.json()).toMatchObject({
        error: {
          code: 'ATTENDANCE_STATE_CHANGED',
          context: {
            attendanceRevision: 1,
            currentState: 'WORKING',
            validActions: ['START_BREAK', 'CLOCK_OUT'],
          },
        },
      });
      const staleReplay = await clockInRequest(app, cookie, csrf, staleKey, 0);
      expect(staleReplay.statusCode).toBe(409);
      expect(staleReplay.json()).toMatchObject({
        error: { code: 'ATTENDANCE_STATE_CHANGED' },
        meta: { idempotentReplay: true },
      });

      const invalidAction = await clockInRequest(
        app,
        cookie,
        csrf,
        'clock-in-already-working-0001',
        1,
      );
      expect(invalidAction.statusCode).toBe(409);
      expect(invalidAction.json()).toMatchObject({
        error: {
          code: 'ATTENDANCE_ALREADY_WORKING',
          context: { attendanceRevision: 1, currentState: 'WORKING' },
        },
      });

      const stored = await fixture.client.query<{
        audit_count: string;
        event_count: string;
        idempotency_count: string;
        revision: number;
        state: string;
      }>(
        `select
           (select count(*) from domain_audit_events where action_code = 'ATTENDANCE_CLOCK_IN') as audit_count,
           (select count(*) from punch_events where employee_id = $1) as event_count,
           (select count(*) from idempotency_records where employee_id = $1) as idempotency_count,
           attendance_revision as revision,
           state
         from attendance_heads
         where employee_id = $1`,
        [employee.employeeId],
      );
      expect(stored.rows[0]).toMatchObject({
        audit_count: '1',
        event_count: '1',
        idempotency_count: '3',
        revision: 1,
        state: 'WORKING',
      });
      const audit = await fixture.client.query<{
        facts: Record<string, unknown>;
        outcome: string;
        subject_employee_id: string;
      }>(
        `select facts, outcome, subject_employee_id
         from domain_audit_events
         where action_code = 'ATTENDANCE_CLOCK_IN'`,
      );
      expect(audit.rows[0]).toMatchObject({
        facts: {
          attendanceRevision: 1,
          eventCount: 1,
          nextStatus: 'WORKING',
          previousStatus: 'OFF_WORK',
        },
        outcome: 'SUCCESS',
        subject_employee_id: employee.employeeId,
      });

      const today = await app.inject({
        method: 'GET',
        url: '/v1/me/attendance/today',
        headers: { cookie, origin: ORIGIN },
      });
      expect(today.statusCode).toBe(200);
      expect(today.json()).toMatchObject({
        data: {
          attendance: { attendanceRevision: 1, state: 'WORKING' },
          timeline: [{ occurredAt: '2026-02-03T10:30:00Z', type: 'CLOCK_IN' }],
        },
      });

      await fixture.client.query(
        `insert into punch_events (
           organization_id, employee_id, event_sequence, event_type, occurred_at,
           actor_employee_id, command_id
         ) values ($1, $2, 2, 'CLOCK_OUT', '2026-02-03T10:40:00Z', $2, $3)`,
        [employee.organizationId, employee.employeeId, randomUUID()],
      );
      await fixture.client.query(
        `update attendance_heads
         set state = 'OFF_WORK', attendance_revision = 2, next_event_sequence = 3
         where employee_id = $1`,
        [employee.employeeId],
      );
      const clockRegression = await clockInRequest(
        app,
        cookie,
        csrf,
        'clock-in-clock-regression-0001',
        2,
      );
      expect(clockRegression.statusCode).toBe(503);
      expect(clockRegression.json()).toMatchObject({ error: { code: 'INTERNAL_ERROR' } });
      const afterClockRegression = await fixture.client.query<{
        event_count: string;
        idempotency_count: string;
      }>(
        `select
           (select count(*) from punch_events where employee_id = $1) as event_count,
           (select count(*) from idempotency_records where employee_id = $1) as idempotency_count`,
        [employee.employeeId],
      );
      expect(afterClockRegression.rows[0]).toEqual({
        event_count: '2',
        idempotency_count: '3',
      });

      await fixture.client.query(`update employees set status = 'INACTIVE' where id = $1`, [
        employee.employeeId,
      ]);
      const denied = await clockInRequest(app, cookie, csrf, 'clock-in-inactive-employee-0001', 2);
      expect(denied.statusCode).toBe(403);
      expect(denied.json()).toMatchObject({ error: { code: 'ACCESS_DENIED' } });
      expect(denied.payload).not.toContain(employee.employeeId);
    } finally {
      await app.close();
      await fixture.cleanup();
    }
  },
);

async function createClockInEmployee(
  client: pg.PoolClient,
): Promise<Readonly<{ employeeId: string; organizationId: string }>> {
  const passwordHash = await hashPassword(PASSWORD);
  const organization = await client.query<{ id: string }>(
    `insert into organizations (name, time_zone)
     values ('Clock-in Organization', 'Europe/Berlin')
     returning id`,
  );
  const organizationId = organization.rows[0]?.id;
  if (organizationId === undefined) throw new Error('Expected organization ID.');
  const account = await client.query<{ id: string }>(
    `insert into auth_users (name, email, email_verified, active)
     values ('Clock-in Employee', $1, true, true)
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
     values ($1, 'CLOCK-001', 'Clock-in Employee', 'ACTIVE')
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

async function getCsrf(app: ReturnType<typeof createApiServer>, cookie: string): Promise<string> {
  const response = await app.inject({
    method: 'GET',
    url: '/v1/me/csrf',
    headers: { cookie, origin: ORIGIN },
  });
  expect(response.statusCode).toBe(200);
  const token = response.json().data.token as unknown;
  if (typeof token !== 'string') throw new Error('Expected CSRF token.');
  return token;
}

function clockInRequest(
  app: ReturnType<typeof createApiServer>,
  cookie: string,
  csrf: string,
  idempotencyKey: string | undefined,
  expectedAttendanceRevision: number,
) {
  return app.inject({
    method: 'POST',
    url: '/v1/me/attendance/clock-in',
    headers: mutationHeaders(cookie, csrf, idempotencyKey),
    payload: { expectedAttendanceRevision },
  });
}

function mutationHeaders(cookie: string, csrf: string, idempotencyKey: string | undefined) {
  return {
    cookie,
    ...(idempotencyKey === undefined ? {} : { 'idempotency-key': idempotencyKey }),
    origin: ORIGIN,
    'x-workledger-csrf': csrf,
  };
}
