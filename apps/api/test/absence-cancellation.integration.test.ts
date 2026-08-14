import { hashPassword } from 'better-auth/crypto';
import { fileURLToPath } from 'node:url';

import type pg from 'pg';

import { createDatabaseHarnessState, createPostgresSchemaFixture } from '@workledger/test-utils';

import { createRuntimeConfig } from '../src/config.js';
import { createApiServer } from '../src/server.js';

const databaseHarness = createDatabaseHarnessState(process.env);
const integrationTest = databaseHarness.enabled ? test : test.skip;
const ORIGIN = 'https://ledger.example.test';
const AUTH_SECRET = 'absence-cancellation-secret-with-more-than-thirty-two-bytes';
const EMAIL = 'cancellation@example.test';
const PASSWORD = 'safe cancellation passphrase 2026';
const MANAGER_EMAIL = 'cancellation-manager@example.test';
const MANAGER_PASSWORD = 'safe cancellation manager passphrase 2026';
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
  '0009_married_justin_hammer.sql',
  '0010_broad_sunfire.sql',
  '0011_nasty_red_hulk.sql',
  '0012_silly_magik.sql',
  '0013_brave_bulldozer.sql',
  '0014_adorable_piledriver.sql',
  '0015_rainy_nightshade.sql',
  '0016_flimsy_oracle.sql',
  '0017_boring_aaron_stack.sql',
].map((file) => `${repositoryDirectory}/packages/database/migrations/${file}`);

integrationTest(
  `preserves absence history while approving a partial cancellation and exact reversal (${databaseHarness.safeLabel})`,
  async () => {
    const fixture = await createPostgresSchemaFixture({
      connectionString: databaseHarness.url,
      label: 'absence_cancellation',
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
      const source = await createEffectiveVacation(fixture.client, employee);
      const employeeCookie = await signIn(app);
      const employeeCsrf = await csrf(app, employeeCookie);
      const submitted = await app.inject({
        method: 'POST',
        url: `/v1/me/absence-requests/${source.requestId}/cancellations`,
        headers: requestHeaders(employeeCookie, employeeCsrf),
        payload: { coverageSegmentIds: [source.firstSegmentId], expectedRequestVersion: 1 },
      });
      expect(submitted.statusCode).toBe(201);
      expect(submitted.json()).toMatchObject({ data: { status: 'PENDING_DECISION', version: 1 } });
      expect(
        await scalar(fixture.client, 'select count(*) from absence_cancellation_decisions'),
      ).toBe('0');
      expect(await scalar(fixture.client, 'select count(*) from leave_entitlement_entries')).toBe(
        '1',
      );

      await createManager(fixture.client, employee);
      const managerCookie = await signIn(app, MANAGER_EMAIL, MANAGER_PASSWORD);
      const managerCsrf = await csrf(app, managerCookie);
      const cancellationId = submitted.json<{ data: { id: string } }>().data.id;
      const approval = await app.inject({
        method: 'POST',
        url: `/v1/approvals/${cancellationId}/decision`,
        headers: requestHeaders(managerCookie, managerCsrf),
        payload: {
          action: 'APPROVE',
          expectedVersion: 1,
          reason: 'The requested coverage can be cancelled and restored.',
        },
      });
      expect(approval.statusCode).toBe(200);
      expect(approval.json()).toMatchObject({ data: { status: 'APPROVED', version: 2 } });
      expect(
        await scalar(fixture.client, 'select status from absence_requests where id = $1', [
          source.requestId,
        ]),
      ).toBe('PARTIALLY_CANCELLED');
      const ledger = await fixture.client.query<{ entry_type: string; minutes: number }>(
        `select entry_type, minutes from leave_entitlement_entries order by created_at`,
      );
      expect(ledger.rows).toEqual([
        { entry_type: 'APPROVED_DEDUCTION', minutes: -960 },
        { entry_type: 'CANCELLATION_RESTORATION', minutes: 480 },
      ]);
      const effects = await fixture.client.query<{
        effect_version: number;
        credit_minutes: number;
      }>(
        `select effect_version, credit_minutes from absence_effects
         where absence_coverage_segment_id = $1 order by effect_version`,
        [source.firstSegmentId],
      );
      expect(effects.rows).toEqual([
        { effect_version: 1, credit_minutes: 480 },
        { effect_version: 2, credit_minutes: 0 },
      ]);
      const staleRetry = await app.inject({
        method: 'POST',
        url: `/v1/approvals/${cancellationId}/decision`,
        headers: requestHeaders(managerCookie, managerCsrf),
        payload: {
          action: 'APPROVE',
          expectedVersion: 1,
          reason: 'A stale retry must not restore the entitlement twice.',
        },
      });
      expect(staleRetry.statusCode).toBe(409);
      expect(staleRetry.json()).toMatchObject({ error: { code: 'APPROVAL_STATE_CONFLICT' } });
      expect(
        await scalar(fixture.client, 'select count(*) from absence_cancellation_decisions'),
      ).toBe('1');
      expect(
        await scalar(
          fixture.client,
          "select count(*) from leave_entitlement_entries where entry_type = 'CANCELLATION_RESTORATION'",
        ),
      ).toBe('1');
    } finally {
      await app.close();
      await fixture.cleanup();
    }
  },
);

integrationTest(
  `routes submitted and locked cancellation targets to the required recovery flow (${databaseHarness.safeLabel})`,
  async () => {
    const fixture = await createPostgresSchemaFixture({
      connectionString: databaseHarness.url,
      label: 'absence_cancellation_locked',
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
      const source = await createEffectiveVacation(fixture.client, employee);
      await fixture.client.query(
        `insert into monthly_periods (organization_id, employee_id, month_start, status, submitted_at)
         values ($1, $2, '2026-02-01', 'SUBMITTED', $3)`,
        [employee.organizationId, employee.employeeId, NOW],
      );
      const cookie = await signIn(app);
      const token = await csrf(app, cookie);
      const submittedResponse = await app.inject({
        method: 'POST',
        url: `/v1/me/absence-requests/${source.requestId}/cancellations`,
        headers: requestHeaders(cookie, token),
        payload: { expectedRequestVersion: 1 },
      });
      expect(submittedResponse.statusCode).toBe(409);
      expect(submittedResponse.json()).toMatchObject({ error: { code: 'PERIOD_REOPEN_REQUIRED' } });
      await fixture.client.query(
        `update monthly_periods set status = 'LOCKED', locked_at = $2 where employee_id = $1`,
        [employee.employeeId, NOW],
      );
      const lockedResponse = await app.inject({
        method: 'POST',
        url: `/v1/me/absence-requests/${source.requestId}/cancellations`,
        headers: requestHeaders(cookie, token),
        payload: { expectedRequestVersion: 1 },
      });
      expect(lockedResponse.statusCode).toBe(409);
      expect(lockedResponse.json()).toMatchObject({
        error: { code: 'PERIOD_ADJUSTMENT_REQUIRED' },
      });
      expect(await scalar(fixture.client, 'select count(*) from absence_cancellations')).toBe('0');
    } finally {
      await app.close();
      await fixture.cleanup();
    }
  },
);

async function createEmployee(client: pg.PoolClient) {
  const organizationId = requiredId(
    (
      await client.query<{ id: string }>(
        `insert into organizations (name, time_zone) values ('Cancellation organization', 'Europe/Berlin') returning id`,
      )
    ).rows[0]?.id,
  );
  const accountId = requiredId(
    (
      await client.query<{ id: string }>(
        `insert into auth_users (name, email, email_verified, active)
         values ('Cancellation Employee', $1, true, true) returning id`,
        [EMAIL],
      )
    ).rows[0]?.id,
  );
  await client.query(
    `insert into auth_accounts (user_id, account_id, provider_id, password) values ($1, $2, 'credential', $3)`,
    [accountId, accountId, await hashPassword(PASSWORD)],
  );
  const employeeId = requiredId(
    (
      await client.query<{ id: string }>(
        `insert into employees (organization_id, employee_number, display_name, status)
         values ($1, 'CAN-001', 'Cancellation Employee', 'ACTIVE') returning id`,
        [organizationId],
      )
    ).rows[0]?.id,
  );
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
  return Object.freeze({ employeeId, organizationId });
}

async function createEffectiveVacation(
  client: pg.PoolClient,
  employee: Readonly<{ employeeId: string; organizationId: string }>,
) {
  const absenceTypeId = requiredId(
    (
      await client.query<{ id: string }>(
        `insert into absence_types (organization_id, code, name, version, active, valid_from, policy)
         values ($1, 'VACATION', 'Vacation', 1, true, '2025-01-01', $2::jsonb) returning id`,
        [
          employee.organizationId,
          JSON.stringify({
            allowedCoverageUnits: ['FULL_DAY', 'HALF_DAY', 'MINUTES'],
            availabilityState: 'UNAVAILABLE',
            entitlementAccountCategory: 'VACATION',
            maximumRetrospectiveCalendarDays: null,
            minimumLeadCalendarDays: 0,
            pendingReservationBehavior: 'RESERVE_PENDING',
            requestNoteMode: 'OPTIONAL',
            timeTreatment: 'CREDIT_COVERED_EXPECTATION',
            workflow: 'APPROVAL_REQUIRED',
          }),
        ],
      )
    ).rows[0]?.id,
  );
  const requestId = requiredId(
    (
      await client.query<{ id: string }>(
        `insert into absence_requests
          (organization_id, employee_id, absence_type_id, requested_by_employee_id, status, submitted_at)
         values ($1, $2, $3, $2, 'APPROVED', $4) returning id`,
        [employee.organizationId, employee.employeeId, absenceTypeId, NOW],
      )
    ).rows[0]?.id,
  );
  const segments = await client.query<{ id: string; local_date: string }>(
    `insert into absence_coverage_segments (organization_id, absence_request_id, local_date, kind)
     values ($1, $2, '2026-02-03', 'FULL_DAY'), ($1, $2, '2026-02-04', 'FULL_DAY')
     returning id, local_date`,
    [employee.organizationId, requestId],
  );
  await client.query(
    `insert into absence_effects
      (organization_id, absence_request_id, absence_coverage_segment_id, employee_id, local_date,
       expected_reduction_minutes, credit_minutes, entitlement_minutes, effect_version)
     values ($1, $2, $3, $4, '2026-02-03', 480, 480, 480, 1),
            ($1, $2, $5, $4, '2026-02-04', 480, 480, 480, 1)`,
    [
      employee.organizationId,
      requestId,
      requiredId(segments.rows[0]?.id),
      employee.employeeId,
      requiredId(segments.rows[1]?.id),
    ],
  );
  await client.query(
    `insert into leave_entitlement_entries
      (organization_id, employee_id, absence_type_id, entry_type, minutes, source_id, effective_on)
     values ($1, $2, $3, 'APPROVED_DEDUCTION', -960, $4, '2026-02-03')`,
    [employee.organizationId, employee.employeeId, absenceTypeId, requestId],
  );
  return Object.freeze({ firstSegmentId: requiredId(segments.rows[0]?.id), requestId });
}

async function createManager(
  client: pg.PoolClient,
  employee: Readonly<{ employeeId: string; organizationId: string }>,
) {
  const accountId = requiredId(
    (
      await client.query<{ id: string }>(
        `insert into auth_users (name, email, email_verified, active)
         values ('Cancellation Manager', $1, true, true) returning id`,
        [MANAGER_EMAIL],
      )
    ).rows[0]?.id,
  );
  await client.query(
    `insert into auth_accounts (user_id, account_id, provider_id, password) values ($1, $2, 'credential', $3)`,
    [accountId, accountId, await hashPassword(MANAGER_PASSWORD)],
  );
  const managerId = requiredId(
    (
      await client.query<{ id: string }>(
        `insert into employees (organization_id, employee_number, display_name, status)
         values ($1, 'CAN-MGR-001', 'Cancellation Manager', 'ACTIVE') returning id`,
        [employee.organizationId],
      )
    ).rows[0]?.id,
  );
  await client.query(
    `insert into employment_periods (organization_id, employee_id, starts_on) values ($1, $2, '2025-01-01')`,
    [employee.organizationId, managerId],
  );
  await client.query(
    `insert into account_employee_links (organization_id, user_id, employee_id) values ($1, $2, $3)`,
    [employee.organizationId, accountId, managerId],
  );
  await client.query(
    `insert into account_role_assignments (organization_id, user_id, role) values ($1, $2, 'MANAGER')`,
    [employee.organizationId, accountId],
  );
  await client.query(
    `insert into manager_assignments (organization_id, employee_id, manager_employee_id, starts_on)
       values ($1, $2, $3, '2025-01-01')`,
    [employee.organizationId, employee.employeeId, managerId],
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
  const value = Array.isArray(response.headers['set-cookie'])
    ? response.headers['set-cookie'][0]
    : response.headers['set-cookie'];
  const cookie = value?.split(';', 1)[0];
  if (cookie === undefined) throw new Error('Expected session cookie.');
  return cookie;
}
async function csrf(app: ReturnType<typeof createApiServer>, cookie: string): Promise<string> {
  const response = await app.inject({
    method: 'GET',
    url: '/v1/me/csrf',
    headers: { cookie, origin: ORIGIN },
  });
  expect(response.statusCode).toBe(200);
  return response.json<{ data: { token: string } }>().data.token;
}
function requestHeaders(cookie: string, token: string) {
  return { 'content-type': 'application/json', cookie, origin: ORIGIN, 'x-workledger-csrf': token };
}
async function scalar(client: pg.PoolClient, query: string, values?: readonly string[]) {
  const result = await client.query<{ count?: string; status?: string }>(query, values);
  return result.rows[0]?.count ?? result.rows[0]?.status;
}
function requiredId(value: string | undefined): string {
  if (value === undefined) throw new Error('Expected database identifier.');
  return value;
}
