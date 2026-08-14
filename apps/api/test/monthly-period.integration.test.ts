import { hashPassword } from 'better-auth/crypto';
import { fileURLToPath } from 'node:url';

import type pg from 'pg';

import {
  monthlyPeriodEnvelopeSchema,
  myTimeEnvelopeSchema,
  type MonthlyPeriod,
} from '@workledger/contracts';
import { createDatabaseHarnessState, createPostgresSchemaFixture } from '@workledger/test-utils';

import { createRuntimeConfig } from '../src/config.js';
import { createApiServer } from '../src/server.js';

const databaseHarness = createDatabaseHarnessState(process.env);
const integrationTest = databaseHarness.enabled ? test : test.skip;
const ORIGIN = 'https://ledger.example.test';
const AUTH_SECRET = 'monthly-period-secret-with-more-than-thirty-two-bytes';
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
  '0015_rainy_nightshade.sql',
].map((file) => `${repositoryDirectory}/packages/database/migrations/${file}`);

integrationTest(
  `derives complete and incomplete monthly review projections with scoped access (${databaseHarness.safeLabel})`,
  async () => {
    const fixture = await createPostgresSchemaFixture({
      connectionString: databaseHarness.url,
      label: 'monthly_period',
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
      const employeeCookie = await signIn(app, scenario.employee);
      const completeResponse = await getPeriod(app, employeeCookie, scenario.completePeriodId);
      expect(completeResponse.statusCode).toBe(200);
      expect(completeResponse.headers['cache-control']).toBe('private, no-store');
      const complete = monthlyPeriodEnvelopeSchema.parse(completeResponse.json()).data;
      expect(complete).toMatchObject({
        attention: { blockers: [], warnings: [] },
        employeeDisplayName: 'Monthly Employee',
        monthEnd: '2026-06-30',
        monthStart: '2026-06-01',
        readiness: {
          completeDateCount: 1,
          coveredDateCount: 1,
          monthEnded: true,
          status: 'READY_FOR_SUBMISSION',
        },
        snapshotVersion: { schemaVersion: 1 },
        timeZone: 'Europe/Berlin',
        totals: {
          balanceMinutes: 15,
          creditedMinutes: 495,
          expectedMinutes: 480,
          ledgerClosingBalanceMinutes: 615,
          ledgerOpeningBalanceMinutes: 600,
          ledgerPeriodDeltaMinutes: 15,
          workedMinutes: 495,
        },
        workflow: { periodVersion: 1, status: 'OPEN' },
      });
      expect(complete.snapshotVersion.sourceFingerprint).toMatch(/^[0-9a-f]{64}$/u);
      expect(complete.rows).toEqual([
        {
          absenceCreditMinutes: 0,
          adjustmentMinutes: 0,
          balanceMinutes: 15,
          breakMinutes: 0,
          creditedMinutes: 495,
          expectedMinutes: 480,
          localDate: '2026-06-30',
          recordId: scenario.completeProjectionId,
          status: 'COMPLETE',
          workedMinutes: 495,
        },
      ]);
      assertPrivacyMinimized(complete);

      const myTimeResponse = await app.inject({
        method: 'GET',
        url: '/v1/me/time?date=2026-06-30&view=MONTH&page=1&limit=10',
        headers: { cookie: employeeCookie, origin: ORIGIN },
      });
      expect(myTimeResponse.statusCode).toBe(200);
      expect(myTimeEnvelopeSchema.parse(myTimeResponse.json()).data.period).toMatchObject({
        monthlyPeriodId: scenario.completePeriodId,
        view: 'MONTH',
      });

      const incomplete = monthlyPeriodEnvelopeSchema.parse(
        (await getPeriod(app, employeeCookie, scenario.incompletePeriodId)).json(),
      ).data;
      expect(incomplete.readiness).toEqual({
        completeDateCount: 1,
        coveredDateCount: 3,
        monthEnded: true,
        status: 'INCOMPLETE',
      });
      expect(incomplete.rows.map(({ status }) => status)).toEqual([
        'MISSING',
        'INCOMPLETE',
        'COMPLETE',
      ]);
      expect(incomplete.rows[0]).toMatchObject({
        balanceMinutes: null,
        localDate: '2026-07-29',
        recordId: null,
      });
      expect(incomplete.rows[1]).toMatchObject({
        balanceMinutes: null,
        expectedMinutes: null,
        localDate: '2026-07-30',
      });
      expect(incomplete.attention.blockers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'ABSENCE_APPROVAL_PENDING', localDate: '2026-07-29' }),
          expect.objectContaining({ code: 'ATTENDANCE_INCOMPLETE', localDate: '2026-07-29' }),
          expect.objectContaining({ code: 'ATTENDANCE_INCOMPLETE', localDate: '2026-07-30' }),
          expect.objectContaining({ code: 'CORRECTION_UNRESOLVED', localDate: '2026-07-31' }),
        ]),
      );
      expect(incomplete.attention.blockers).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ code: 'LEDGER_SOURCE_MISMATCH' })]),
      );
      assertPrivacyMinimized(incomplete);

      for (const credentials of [scenario.manager, scenario.hr]) {
        const cookie = await signIn(app, credentials);
        expect((await getPeriod(app, cookie, scenario.completePeriodId)).statusCode).toBe(200);
      }
      for (const credentials of [scenario.unrelatedManager, scenario.system]) {
        const cookie = await signIn(app, credentials);
        const denied = await getPeriod(app, cookie, scenario.completePeriodId);
        expect(denied.statusCode).toBe(403);
        expect(JSON.stringify(denied.json())).not.toContain('Monthly Employee');
      }
      expect((await getPeriod(app, employeeCookie, 'not-a-period-id')).statusCode).toBe(404);
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
         values ('Monthly organization', 'Europe/Berlin') returning id`,
      )
    ).rows[0]?.id,
  );
  const employeeId = await createEmployee(client, organizationId, 'MONTH-001', 'Monthly Employee', [
    ['2026-06-30', '2026-07-01'],
    ['2026-07-29', null],
  ]);
  const managerEmployeeId = await createEmployee(
    client,
    organizationId,
    'MONTH-MGR',
    'Monthly Manager',
    [['2025-01-01', null]],
  );
  const unrelatedManagerEmployeeId = await createEmployee(
    client,
    organizationId,
    'MONTH-OTHER',
    'Unrelated Manager',
    [['2025-01-01', null]],
  );
  await client.query(
    `insert into manager_assignments
      (organization_id, employee_id, manager_employee_id, starts_on)
     values ($1, $2, $3, '2026-01-01')`,
    [organizationId, employeeId, managerEmployeeId],
  );

  const scheduleId = requiredId(
    (
      await client.query<{ id: string }>(
        `insert into weekly_schedules
          (organization_id, name, version, monday_minutes, tuesday_minutes, wednesday_minutes,
           thursday_minutes, friday_minutes, saturday_minutes, sunday_minutes)
         values ($1, 'Monthly schedule', 1, 480, 480, 480, 480, 480, 0, 0) returning id`,
        [organizationId],
      )
    ).rows[0]?.id,
  );
  const policyId = requiredId(
    (
      await client.query<{ id: string }>(
        `insert into time_policies (organization_id, name, version, rules)
         values ($1, 'Monthly policy', 1, '{}'::jsonb) returning id`,
        [organizationId],
      )
    ).rows[0]?.id,
  );
  await client.query(
    `insert into schedule_assignments (organization_id, employee_id, schedule_id, starts_on)
     values ($1, $2, $3, '2026-01-01')`,
    [organizationId, employeeId, scheduleId],
  );
  await client.query(
    `insert into policy_assignments (organization_id, employee_id, policy_id, starts_on)
     values ($1, $2, $3, '2026-01-01')`,
    [organizationId, employeeId, policyId],
  );

  const completePeriodId = await createPeriod(client, organizationId, employeeId, '2026-06-01');
  const incompletePeriodId = await createPeriod(client, organizationId, employeeId, '2026-07-01');
  const completeProjectionId = await createProjection(
    client,
    organizationId,
    employeeId,
    '2026-06-30',
    'COMPLETE',
    480,
    495,
    15,
  );
  const incompleteProjectionId = await createProjection(
    client,
    organizationId,
    employeeId,
    '2026-07-30',
    'INCOMPLETE',
    480,
    0,
    -480,
    ['ATTENDANCE_INCOMPLETE'],
  );
  const julyCompleteProjectionId = await createProjection(
    client,
    organizationId,
    employeeId,
    '2026-07-31',
    'COMPLETE',
    480,
    510,
    30,
  );
  await createLedgerEntry(client, organizationId, employeeId, {
    date: '2026-01-01',
    entryType: 'OPENING_BALANCE',
    minutes: 600,
    sourceId: '49000000-0000-7000-8000-000000000001',
  });
  await createLedgerEntry(client, organizationId, employeeId, {
    date: '2026-06-30',
    entryType: 'DAILY_DELTA',
    minutes: 15,
    sourceId: completeProjectionId,
  });
  await createLedgerEntry(client, organizationId, employeeId, {
    date: '2026-07-31',
    entryType: 'DAILY_DELTA',
    minutes: 30,
    sourceId: julyCompleteProjectionId,
  });

  await client.query(
    `insert into correction_requests
      (organization_id, employee_id, requested_by_employee_id, local_date, status, reason,
       original_interpretation, proposed_interpretation, version)
     values ($1, $2, $2, '2026-07-31', 'SUBMITTED', 'Private correction reason', '{}', '{}', 1)`,
    [organizationId, employeeId],
  );
  const absenceTypeId = requiredId(
    (
      await client.query<{ id: string }>(
        `insert into absence_types
          (organization_id, code, name, version, active, valid_from, policy)
         values ($1, 'VACATION', 'Private vacation type', 1, true, '2026-01-01', $2::jsonb)
         returning id`,
        [organizationId, JSON.stringify({ workflow: 'APPROVAL_REQUIRED' })],
      )
    ).rows[0]?.id,
  );
  const absenceRequestId = requiredId(
    (
      await client.query<{ id: string }>(
        `insert into absence_requests
          (organization_id, employee_id, absence_type_id, requested_by_employee_id, status,
           version, submitted_at)
         values ($1, $2, $3, $2, 'SUBMITTED', 1, $4) returning id`,
        [organizationId, employeeId, absenceTypeId, NOW],
      )
    ).rows[0]?.id,
  );
  await client.query(
    `insert into absence_coverage_segments
      (organization_id, absence_request_id, local_date, kind)
     values ($1, $2, '2026-07-29', 'FULL_DAY')`,
    [organizationId, absenceRequestId],
  );

  const employee = await createAccount(client, organizationId, {
    email: 'monthly-employee@example.test',
    employeeId,
    name: 'Monthly Employee',
    password: 'safe monthly employee passphrase 2026',
    role: 'EMPLOYEE',
  });
  const manager = await createAccount(client, organizationId, {
    email: 'monthly-manager@example.test',
    employeeId: managerEmployeeId,
    name: 'Monthly Manager',
    password: 'safe monthly manager passphrase 2026',
    role: 'MANAGER',
  });
  const unrelatedManager = await createAccount(client, organizationId, {
    email: 'monthly-unrelated@example.test',
    employeeId: unrelatedManagerEmployeeId,
    name: 'Unrelated Manager',
    password: 'safe unrelated manager passphrase 2026',
    role: 'MANAGER',
  });
  const hr = await createAccount(client, organizationId, {
    email: 'monthly-hr@example.test',
    name: 'Monthly HR',
    password: 'safe monthly hr passphrase 2026',
    role: 'HR_ADMINISTRATOR',
  });
  const system = await createAccount(client, organizationId, {
    email: 'monthly-system@example.test',
    name: 'Monthly System',
    password: 'safe monthly system passphrase 2026',
    role: 'SYSTEM_ADMINISTRATOR',
  });
  return Object.freeze({
    completePeriodId,
    completeProjectionId,
    employee,
    hr,
    incompletePeriodId,
    incompleteProjectionId,
    manager,
    system,
    unrelatedManager,
  });
}

async function createEmployee(
  client: pg.PoolClient,
  organizationId: string,
  employeeNumber: string,
  displayName: string,
  periods: readonly (readonly [string, string | null])[],
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
  for (const [startsOn, endsOn] of periods) {
    await client.query(
      `insert into employment_periods (organization_id, employee_id, starts_on, ends_on)
       values ($1, $2, $3, $4)`,
      [organizationId, employeeId, startsOn, endsOn],
    );
  }
  return employeeId;
}

async function createPeriod(
  client: pg.PoolClient,
  organizationId: string,
  employeeId: string,
  monthStart: string,
) {
  return requiredId(
    (
      await client.query<{ id: string }>(
        `insert into monthly_periods (organization_id, employee_id, month_start, status, version)
         values ($1, $2, $3, 'OPEN', 1) returning id`,
        [organizationId, employeeId, monthStart],
      )
    ).rows[0]?.id,
  );
}

async function createProjection(
  client: pg.PoolClient,
  organizationId: string,
  employeeId: string,
  localDate: string,
  status: 'COMPLETE' | 'INCOMPLETE',
  expectedMinutes: number,
  workedMinutes: number,
  balanceMinutes: number,
  warningCodes: readonly string[] = [],
) {
  return requiredId(
    (
      await client.query<{ id: string }>(
        `insert into daily_projections
          (organization_id, employee_id, local_date, calculation_status, projection_version,
           engine_version, source_fingerprint, expected_minutes, worked_minutes, break_minutes,
           absence_credit_minutes, adjustment_minutes, credited_minutes, balance_minutes,
           warning_codes, source_references, calculated_at)
         values ($1, $2, $3, $4, 1, 'monthly-test-v1', $5, $6, $7, 0, 0, 0, $7, $8,
                 $9::jsonb, '{}'::jsonb, $10) returning id`,
        [
          organizationId,
          employeeId,
          localDate,
          status,
          status === 'COMPLETE' ? 'a'.repeat(64) : 'b'.repeat(64),
          expectedMinutes,
          workedMinutes,
          balanceMinutes,
          JSON.stringify(warningCodes),
          NOW,
        ],
      )
    ).rows[0]?.id,
  );
}

async function createLedgerEntry(
  client: pg.PoolClient,
  organizationId: string,
  employeeId: string,
  input: Readonly<{
    date: string;
    entryType: 'DAILY_DELTA' | 'OPENING_BALANCE';
    minutes: number;
    sourceId: string;
  }>,
) {
  await client.query(
    `insert into time_account_entries
      (organization_id, employee_id, local_date, entry_type, minutes, source_id,
       source_fingerprint, actor_kind, actor_id, explanation_code, posted_at)
     values ($1, $2, $3, $4, $5, $6, $7, 'SYSTEM', 'monthly-test', $8, $9)`,
    [
      organizationId,
      employeeId,
      input.date,
      input.entryType,
      input.minutes,
      input.sourceId,
      input.sourceId.replaceAll('-', '').padEnd(64, '0').slice(0, 64),
      input.entryType,
      NOW,
    ],
  );
}

async function createAccount(
  client: pg.PoolClient,
  organizationId: string,
  input: Readonly<{
    email: string;
    employeeId?: string;
    name: string;
    password: string;
    role: 'EMPLOYEE' | 'HR_ADMINISTRATOR' | 'MANAGER' | 'SYSTEM_ADMINISTRATOR';
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

function getPeriod(app: ReturnType<typeof createApiServer>, cookie: string, periodId: string) {
  return app.inject({
    method: 'GET',
    url: `/v1/monthly-periods/${encodeURIComponent(periodId)}`,
    headers: { cookie, origin: ORIGIN },
  });
}

function assertPrivacyMinimized(period: MonthlyPeriod) {
  const serialized = JSON.stringify(period);
  for (const forbidden of [
    'SICKNESS',
    'Private correction',
    'Private vacation',
    'absenceType',
    'entitlement',
    'requestReason',
    'reviewerReason',
    'sourceReferences',
  ]) {
    expect(serialized).not.toContain(forbidden);
  }
}

function requiredId(value: string | undefined): string {
  if (value === undefined) throw new Error('Expected database identifier.');
  return value;
}
