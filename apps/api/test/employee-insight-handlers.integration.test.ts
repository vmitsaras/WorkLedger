import { hashPassword } from 'better-auth/crypto';
import { fileURLToPath } from 'node:url';

import type pg from 'pg';

import { insightNativeResultSchema, type InsightRequest } from '@workledger/contracts/insights';
import { parseDomainId, parseInstant, type DomainId } from '@workledger/domain';
import { createWorkLedgerDatabase } from '@workledger/database';
import { createDatabaseHarnessState, createPostgresSchemaFixture } from '@workledger/test-utils';

import { createEmployeeInsightHandlers } from '../src/insights/employee-insight-handlers.js';
import { createInsightService } from '../src/insights/insight-service.js';

const databaseHarness = createDatabaseHarnessState(process.env);
const integrationTest = databaseHarness.enabled ? test : test.skip;
const CAPTURED_AT = instant('2026-02-03T10:30:45Z');
const AUTH_SECRET = 'employee-insight-route-secret-with-thirty-two-bytes';
const EMAIL = 'insight-employee@example.test';
const ORIGIN = 'https://ledger.example.test';
const PASSWORD = 'safe employee insight passphrase 2026';
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
  '0015_rainy_nightshade.sql',
  '0016_flimsy_oracle.sql',
  '0022_account_locale.sql',
].map((file) => `${repositoryDirectory}/packages/database/migrations/${file}`);

integrationTest(
  `computes all four employee Insights from current PostgreSQL authority (${databaseHarness.safeLabel})`,
  async () => {
    const fixture = await createPostgresSchemaFixture({
      connectionString: databaseHarness.url,
      label: 'employee_insight_handlers',
      migrationFiles,
    });
    const database = createWorkLedgerDatabase({
      applicationName: 'workledger-employee-insight-handler-test',
      connectionString: fixture.databaseUrl,
    });

    try {
      const employee = await createEmployeeFixture(fixture.client);
      await createInsightFacts(fixture.client, employee);
      const service = createInsightService(database, createEmployeeInsightHandlers());
      const identity = Object.freeze({ accountId: employee.accountId, sessionFresh: true });

      const balance = insightNativeResultSchema.parse(
        await service.run(
          identity,
          request({
            kind: 'balance-change',
            period: { endDate: '2026-02-03', kind: 'DATE_RANGE', startDate: '2026-02-01' },
            workspace: 'EMPLOYEE',
          }),
          CAPTURED_AT,
        ),
      );
      expect(factValue(balance, 'BALANCE_OPENING_MINUTES', 'POSTED')).toBe(600);
      expect(factValue(balance, 'BALANCE_CHANGE_MINUTES', 'POSTED')).toBe(30);
      expect(factValue(balance, 'BALANCE_CHANGE_MINUTES', 'PROJECTED')).toBe(45);

      const leave = insightNativeResultSchema.parse(
        await service.run(
          identity,
          request({
            kind: 'leave-projection',
            period: { date: '2026-02-05', kind: 'DATE' },
            workspace: 'EMPLOYEE',
          }),
          CAPTURED_AT,
        ),
      );
      expect(leave.sources).toContainEqual(
        expect.objectContaining({ kind: 'LEAVE_ENTITLEMENT_LEDGER', label: 'Vacation' }),
      );
      expect(factValue(leave, 'LEAVE_AVAILABLE_MINUTES', 'PROJECTED')).toBe(4_800);
      expect(factValue(leave, 'LEAVE_RESERVED_MINUTES', 'RESERVED')).toBe(720);
      expect(factValue(leave, 'LEAVE_PROJECTED_REMAINING_MINUTES', 'PROJECTED')).toBe(4_080);

      const submission = insightNativeResultSchema.parse(
        await service.run(
          identity,
          request({
            kind: 'submission-blockers',
            period: { kind: 'MONTH', monthStart: '2026-02-01' },
            workspace: 'EMPLOYEE',
          }),
          CAPTURED_AT,
        ),
      );
      expect(submission.facts).toMatchObject([
        {
          code: 'SUBMISSION_BLOCKERS_AVAILABLE',
          qualifiers: ['UNAVAILABLE'],
          value: null,
        },
      ]);
      expect(submission.limitations.map(({ code }) => code)).toEqual([
        'MONTHLY_PERIOD_NOT_AVAILABLE',
      ]);

      const today = insightNativeResultSchema.parse(
        await service.run(
          identity,
          request({
            kind: 'today-explanation',
            period: { date: '2026-02-03', kind: 'DATE' },
            workspace: 'EMPLOYEE',
          }),
          CAPTURED_AT,
        ),
      );
      expect(factValue(today, 'TODAY_ATTENDANCE_STATE', 'CURRENT')).toBe('WORKING');
      expect(factValue(today, 'TODAY_WORKED_MINUTES', 'PROVISIONAL')).toBe(195);
      expect(factValue(today, 'TODAY_DIFFERENCE_MINUTES', 'PROVISIONAL')).toBe(-285);
      expect(today.freshness.boundaries).toEqual([
        {
          kind: 'CALCULATED_THROUGH',
          localDate: '2026-02-03',
          sourceReferences: ['source_today_attendance'],
        },
        {
          kind: 'POSTED_THROUGH',
          localDate: '2026-02-02',
          sourceReferences: ['source_today_balance'],
        },
      ]);

      for (const result of [balance, leave, submission, today]) {
        const serialized = JSON.stringify(result);
        expect(serialized).not.toContain(employee.accountId);
        expect(serialized).not.toContain(employee.employeeId);
        expect(serialized).not.toContain(employee.organizationId);
      }

      const app = createApiServer(
        createRuntimeConfig({
          WORKLEDGER_AUTH_SECRET: AUTH_SECRET,
          WORKLEDGER_DATABASE_URL: fixture.databaseUrl,
          WORKLEDGER_ENVIRONMENT: 'test',
          WORKLEDGER_ORIGIN: ORIGIN,
        }),
        { now: () => '2026-02-03T10:30:45Z' },
      );
      try {
        const unauthenticated = await app.inject({
          method: 'POST',
          url: '/v1/insights/run',
          headers: { origin: ORIGIN },
          payload: balanceRequest(),
        });
        expect(unauthenticated.statusCode).toBe(401);

        const cookie = await signIn(app);
        const csrfResponse = await app.inject({
          method: 'GET',
          url: '/v1/me/csrf',
          headers: { cookie, origin: ORIGIN },
        });
        const csrf = csrfResponse.json<{ data: { token: string } }>().data.token;
        const wrongOrigin = await app.inject({
          method: 'POST',
          url: '/v1/insights/run',
          headers: { cookie, origin: 'https://untrusted.example.test', 'x-workledger-csrf': csrf },
          payload: balanceRequest(),
        });
        expect(wrongOrigin.statusCode).toBe(403);

        const missingCsrf = await app.inject({
          method: 'POST',
          url: '/v1/insights/run',
          headers: { cookie, origin: ORIGIN },
          payload: balanceRequest(),
        });
        expect(missingCsrf.statusCode).toBe(403);

        const invalid = await app.inject({
          method: 'POST',
          url: '/v1/insights/run',
          headers: { cookie, origin: ORIGIN, 'x-workledger-csrf': csrf },
          payload: { ...balanceRequest(), privateQuestion: 'do not echo this' },
        });
        expect(invalid.statusCode).toBe(422);
        expect(invalid.payload).not.toContain('privateQuestion');
        expect(invalid.payload).not.toContain('do not echo this');

        const response = await app.inject({
          method: 'POST',
          url: '/v1/insights/run',
          headers: { cookie, origin: ORIGIN, 'x-workledger-csrf': csrf },
          payload: balanceRequest(),
        });
        expect(response.statusCode).toBe(200);
        expect(response.headers['cache-control']).toBe('private, no-store');
        expect(response.json()).toMatchObject({
          data: {
            kind: 'balance-change',
            scope: { kind: 'SELF' },
            workspace: 'EMPLOYEE',
          },
        });
        expect(response.payload).not.toContain(employee.accountId);
        expect(response.payload).not.toContain(employee.employeeId);
        expect(response.payload).not.toContain(employee.organizationId);

        await fixture.client.query(`update employees set status = 'INACTIVE' where id = $1`, [
          employee.employeeId,
        ]);
        const denied = await app.inject({
          method: 'POST',
          url: '/v1/insights/run',
          headers: { cookie, origin: ORIGIN, 'x-workledger-csrf': csrf },
          payload: balanceRequest(),
        });
        expect(denied.statusCode).toBe(403);
        expect(denied.json()).toMatchObject({ error: { code: 'ACCESS_DENIED' } });
        expect(denied.payload).not.toContain(employee.employeeId);
      } finally {
        await app.close();
      }

      await expect(
        service.run(
          identity,
          request({
            kind: 'balance-change',
            period: { endDate: '2026-02-03', kind: 'DATE_RANGE', startDate: '2026-02-01' },
            workspace: 'EMPLOYEE',
          }),
          CAPTURED_AT,
        ),
      ).rejects.toMatchObject({ code: 'ACCESS_DENIED', statusCode: 403 });
    } finally {
      await database.close();
      await fixture.cleanup();
    }
  },
);

async function createEmployeeFixture(client: pg.ClientBase) {
  const organization = await client.query<{ id: string }>(
    `insert into organizations (name, time_zone)
     values ('Employee Insight organization', 'Europe/Berlin') returning id`,
  );
  const organizationId = domainId<'Organization'>(organization.rows[0]?.id);
  const account = await client.query<{ id: string }>(
    `insert into auth_users (name, email, email_verified, active)
     values ('Insight employee', $1, true, true) returning id`,
    [EMAIL],
  );
  const accountId = domainId<'Account'>(account.rows[0]?.id);
  await client.query(
    `insert into auth_accounts (user_id, account_id, provider_id, password)
     values ($1, $2, 'credential', $3)`,
    [accountId, accountId, await hashPassword(PASSWORD)],
  );
  const employee = await client.query<{ id: string }>(
    `insert into employees (organization_id, employee_number, display_name, status)
     values ($1, 'INSIGHT-001', 'Insight employee', 'ACTIVE') returning id`,
    [organizationId],
  );
  const employeeId = domainId<'Employee'>(employee.rows[0]?.id);
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
     ) values ($1, 'Standard', 1, 480, 480, 480, 480, 480, 0, 0) returning id`,
    [organizationId],
  );
  await client.query(
    `insert into schedule_assignments (organization_id, employee_id, schedule_id, starts_on)
     values ($1, $2, $3, '2025-01-01')`,
    [organizationId, employeeId, schedule.rows[0]?.id],
  );
  const policy = await client.query<{ id: string }>(
    `insert into time_policies (organization_id, name, version, rules)
     values ($1, 'Standard', 1, '{"flexibleTimeWarningMinutes":30}'::jsonb) returning id`,
    [organizationId],
  );
  await client.query(
    `insert into policy_assignments (organization_id, employee_id, policy_id, starts_on)
     values ($1, $2, $3, '2025-01-01')`,
    [organizationId, employeeId, policy.rows[0]?.id],
  );

  await client.query(
    `insert into attendance_heads (
       employee_id, organization_id, state, attendance_revision, next_event_sequence, updated_at
     ) values ($1, $2, 'WORKING', 3, 4, '2026-02-03T10:15:00Z')`,
    [employeeId, organizationId],
  );
  for (const [sequence, type, occurredAt] of [
    [1, 'CLOCK_IN', '2026-02-03T07:00:00Z'],
    [2, 'BREAK_START', '2026-02-03T10:00:00Z'],
    [3, 'BREAK_END', '2026-02-03T10:15:00Z'],
  ] as const) {
    await client.query(
      `insert into punch_events (
         organization_id, employee_id, event_sequence, event_type, occurred_at,
         actor_employee_id, command_id
       ) values ($1, $2, $3, $4, $5, $2, uuidv7())`,
      [organizationId, employeeId, sequence, type, occurredAt],
    );
  }
  return Object.freeze({ accountId, employeeId, organizationId });
}

async function createInsightFacts(
  client: pg.ClientBase,
  employee: Readonly<{
    employeeId: DomainId<'Employee'>;
    organizationId: DomainId<'Organization'>;
  }>,
) {
  const projection = await client.query<{ id: string }>(
    `insert into daily_projections (
       organization_id, employee_id, local_date, calculation_status, projection_version,
       engine_version, source_fingerprint, expected_minutes, worked_minutes, break_minutes,
       absence_credit_minutes, adjustment_minutes, credited_minutes, balance_minutes,
       warning_codes, source_references, calculated_at
     ) values ($1, $2, '2026-02-03', 'COMPLETE', 1, 'test', $3, 480, 495, 0, 0, 0, 495, 15,
       '[]'::jsonb, '{}'::jsonb, '2026-02-03T10:30:00Z') returning id`,
    [employee.organizationId, employee.employeeId, 'b'.repeat(64)],
  );
  const unpostedProjectionId = projection.rows[0]?.id;
  if (unpostedProjectionId === undefined) throw new Error('Expected daily projection ID.');
  await client.query(
    `insert into time_account_entries (
       organization_id, employee_id, local_date, entry_type, minutes, source_id,
       source_fingerprint, actor_kind, actor_id, explanation_code, posted_at
     ) values
       ($1, $2, '2026-01-01', 'OPENING_BALANCE', 600, uuidv7(), $3, 'SYSTEM', 'test',
        'OPENING_BALANCE', '2026-01-01T08:00:00Z'),
       ($1, $2, '2026-02-02', 'DAILY_DELTA', 30, uuidv7(), $3, 'SYSTEM', 'test',
        'DAILY_CALCULATION', '2026-02-02T18:00:00Z')`,
    [employee.organizationId, employee.employeeId, 'a'.repeat(64)],
  );
  const absenceType = await client.query<{ id: string }>(
    `insert into absence_types
      (organization_id, code, name, version, active, valid_from, valid_to, policy)
     values ($1, 'VACATION', 'Vacation', 1, true, '2026-01-01', null, '{}'::jsonb)
     returning id`,
    [employee.organizationId],
  );
  await client.query(
    `insert into leave_entitlement_entries
      (organization_id, employee_id, absence_type_id, entry_type, minutes, source_id, effective_on,
       created_at)
     values
      ($1, $2, $3, 'ALLOCATION', 4800, uuidv7(), '2026-01-01', '2026-02-01T08:00:00Z'),
      ($1, $2, $3, 'PENDING_RESERVATION', -720, uuidv7(), '2026-02-05',
       '2026-02-02T08:00:00Z')`,
    [employee.organizationId, employee.employeeId, absenceType.rows[0]?.id],
  );
}

function factValue(
  result: ReturnType<typeof insightNativeResultSchema.parse>,
  code: string,
  qualifier: (typeof result.facts)[number]['qualifiers'][number],
) {
  const fact = result.facts.find(
    (candidate) => candidate.code === code && candidate.qualifiers.includes(qualifier),
  );
  if (fact?.value === null || fact?.value === undefined) {
    throw new Error(`Expected ${code} value.`);
  }
  return fact.value.value;
}

function request(input: InsightRequest): InsightRequest {
  return input;
}

function balanceRequest(): InsightRequest {
  return {
    kind: 'balance-change',
    period: { endDate: '2026-02-03', kind: 'DATE_RANGE', startDate: '2026-02-01' },
    workspace: 'EMPLOYEE',
  };
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

function domainId<Entity extends string>(value: unknown): DomainId<Entity> {
  const parsed = parseDomainId<Entity>(value);
  if (!parsed.ok) throw new Error('Expected valid fixture domain identifier.');
  return parsed.value;
}

function instant(value: string) {
  const parsed = parseInstant(value);
  if (!parsed.ok) throw new Error('Expected valid fixture instant.');
  return parsed.value;
}
import { createRuntimeConfig } from '../src/config.js';
import { createApiServer } from '../src/server.js';
