import { fileURLToPath } from 'node:url';

import { hashPassword } from 'better-auth/crypto';
import type pg from 'pg';
import { vi } from 'vitest';

import { insightRunResponseEnvelopeSchema } from '@workledger/contracts/insights';
import { createDatabaseHarnessState, createPostgresSchemaFixture } from '@workledger/test-utils';

import type { AiProvider } from '../src/ai/contracts.js';
import { createRuntimeConfig } from '../src/config.js';
import { createApiServer } from '../src/server.js';

const databaseHarness = createDatabaseHarnessState(process.env);
const integrationTest = databaseHarness.enabled ? test : test.skip;
const ORIGIN = 'https://ledger.example.test';
const AUTH_SECRET = 'manager-insight-integration-secret-with-more-than-thirty-two-bytes';
const PASSWORD = 'safe manager insight passphrase 2026';
const AT = '2026-08-28T12:00:00Z';
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
  '0018_bored_medusa.sql',
  '0019_stale_loners.sql',
  '0020_chemical_micromacro.sql',
  '0021_retention_tracking.sql',
  '0022_account_locale.sql',
].map((file) => `${repositoryDirectory}/packages/database/migrations/${file}`);

integrationTest(
  `keeps Manager Insights inside current direct-report scope with no provider call (${databaseHarness.safeLabel})`,
  async () => {
    const fixture = await createPostgresSchemaFixture({
      connectionString: databaseHarness.url,
      label: 'manager_insight_service',
      migrationFiles,
    });
    const providerGenerate = vi.fn();
    const provider: AiProvider = Object.freeze({
      mode: 'disabled',
      checkHealth: async () => providerHealth,
      generate: providerGenerate,
      getHealth: () => providerHealth,
    });
    const app = createApiServer(
      createRuntimeConfig({
        WORKLEDGER_AUTH_SECRET: AUTH_SECRET,
        WORKLEDGER_DATABASE_URL: fixture.databaseUrl,
        WORKLEDGER_ENVIRONMENT: 'test',
        WORKLEDGER_ORIGIN: ORIGIN,
      }),
      { aiProvider: provider, now: () => AT },
    );

    try {
      const actors = await createScenario(fixture.client);
      const managerCookie = await signIn(app, 'manager-insight@example.test');
      const hrCookie = await signIn(app, 'manager-insight-hr@example.test');
      const managerCsrf = await getCsrf(app, managerCookie);
      const hrCsrf = await getCsrf(app, hrCookie);

      const unauthenticated = await app.inject({
        method: 'POST',
        url: '/v1/insights/manager/run',
        headers: { origin: ORIGIN },
        payload: actionRequest(),
      });
      expect(unauthenticated.statusCode).toBe(401);

      const invalid = await app.inject({
        method: 'POST',
        url: '/v1/insights/manager/run',
        headers: mutationHeaders(managerCookie, managerCsrf),
        payload: { ...actionRequest(), employeeId: actors.currentReportId },
      });
      expect(invalid.statusCode).toBe(422);
      expect(invalid.payload).not.toContain(actors.currentReportId);

      const hrDenied = await app.inject({
        method: 'POST',
        url: '/v1/insights/manager/run',
        headers: mutationHeaders(hrCookie, hrCsrf),
        payload: actionRequest(),
      });
      expect(hrDenied.statusCode).toBe(403);

      const actionResponse = await app.inject({
        method: 'POST',
        url: '/v1/insights/manager/run',
        headers: mutationHeaders(managerCookie, managerCsrf),
        payload: actionRequest(),
      });
      expect(actionResponse.statusCode, actionResponse.payload).toBe(200);
      expect(actionResponse.headers['cache-control']).toBe('private, no-store');
      const actionEnvelope = insightRunResponseEnvelopeSchema.parse(actionResponse.json());
      expect(actionEnvelope.meta.interpretationAvailability).toBe('DISABLED');
      expect(actionEnvelope.data.facts).toEqual([
        {
          code: 'MANAGER_ACTION_REQUIRED_COUNT',
          qualifiers: ['CURRENT'],
          reference: 'fact_manager_action_required',
          sourceReferences: ['source_approval_inbox'],
          value: { kind: 'COUNT', value: 1 },
        },
      ]);

      const coverageResponse = await app.inject({
        method: 'POST',
        url: '/v1/insights/manager/run',
        headers: mutationHeaders(managerCookie, managerCsrf),
        payload: coverageRequest(),
      });
      expect(coverageResponse.statusCode, coverageResponse.payload).toBe(200);
      const coverageEnvelope = insightRunResponseEnvelopeSchema.parse(coverageResponse.json());
      expect(coverageEnvelope.data.facts.map(({ code, value }) => [code, value])).toEqual([
        ['TEAM_MEMBER_COUNT', { kind: 'COUNT', value: 2 }],
        ['TEAM_WORKING_COUNT', { kind: 'COUNT', value: 1 }],
        ['TEAM_ON_BREAK_COUNT', { kind: 'COUNT', value: 0 }],
        ['TEAM_UNAVAILABLE_COUNT', { kind: 'COUNT', value: 0 }],
        ['TEAM_OFF_WORK_COUNT', { kind: 'COUNT', value: 1 }],
        ['TEAM_UNRESOLVED_RECORD_COUNT', { kind: 'COUNT', value: 1 }],
      ]);
      const serialized = JSON.stringify([actionEnvelope.data, coverageEnvelope.data]);
      for (const forbidden of [
        actors.organizationId,
        actors.managerAccountId,
        actors.managerEmployeeId,
        actors.currentReportId,
        actors.otherCurrentReportId,
        actors.formerReportId,
        actors.unrelatedEmployeeId,
        'Current private report',
        'Former private report',
        'Private correction reason',
      ]) {
        expect(serialized).not.toContain(forbidden);
      }
      expect(providerGenerate).not.toHaveBeenCalled();

      await fixture.client.query(
        `update manager_assignments set ends_on = '2026-08-28'
         where manager_employee_id = $1 and employee_id = $2`,
        [actors.managerEmployeeId, actors.currentReportId],
      );
      const rescopedAction = insightRunResponseEnvelopeSchema.parse(
        (
          await app.inject({
            method: 'POST',
            url: '/v1/insights/manager/run',
            headers: mutationHeaders(managerCookie, managerCsrf),
            payload: actionRequest(),
          })
        ).json(),
      );
      expect(rescopedAction.data.facts[0]?.value).toEqual({ kind: 'COUNT', value: 0 });
      const rescopedCoverage = insightRunResponseEnvelopeSchema.parse(
        (
          await app.inject({
            method: 'POST',
            url: '/v1/insights/manager/run',
            headers: mutationHeaders(managerCookie, managerCsrf),
            payload: coverageRequest(),
          })
        ).json(),
      );
      expect(rescopedCoverage.data.facts[0]?.value).toEqual({ kind: 'COUNT', value: 1 });

      await fixture.client.query(
        `update account_role_assignments set revoked_at = $1
         where organization_id = $2 and user_id = $3 and role = 'MANAGER'`,
        [AT, actors.organizationId, actors.managerAccountId],
      );
      const authorityLost = await app.inject({
        method: 'POST',
        url: '/v1/insights/manager/run',
        headers: mutationHeaders(managerCookie, managerCsrf),
        payload: coverageRequest(),
      });
      expect(authorityLost.statusCode).toBe(403);
      expect(providerGenerate).not.toHaveBeenCalled();
    } finally {
      await app.close();
      await fixture.cleanup();
    }
  },
  30_000,
);

const providerHealth = Object.freeze({
  capabilities: Object.freeze([]),
  checkedAt: null,
  mode: 'disabled' as const,
  reasonCode: 'PROVIDER_DISABLED' as const,
  status: 'disabled' as const,
});

function actionRequest() {
  return {
    kind: 'manager-action-summary' as const,
    period: { date: '2026-08-28' as const, kind: 'DATE' as const },
    workspace: 'MANAGER' as const,
  };
}

function coverageRequest() {
  return {
    kind: 'team-coverage' as const,
    period: { date: '2026-08-28' as const, kind: 'DATE' as const },
    workspace: 'MANAGER' as const,
  };
}

async function createScenario(client: pg.PoolClient) {
  const organizationId = requiredId(
    (
      await client.query<{ id: string }>(
        `insert into organizations (name, time_zone)
         values ('Manager Insight organization', 'Europe/Berlin') returning id`,
      )
    ).rows[0]?.id,
  );
  const managerEmployeeId = await createEmployee(client, organizationId, 'MGR-001', 'Manager');
  const currentReportId = await createEmployee(
    client,
    organizationId,
    'MGR-002',
    'Current private report',
  );
  const otherCurrentReportId = await createEmployee(
    client,
    organizationId,
    'MGR-003',
    'Other current private report',
  );
  const formerReportId = await createEmployee(
    client,
    organizationId,
    'MGR-004',
    'Former private report',
  );
  const unrelatedEmployeeId = await createEmployee(
    client,
    organizationId,
    'MGR-005',
    'Unrelated private employee',
  );
  await client.query(
    `insert into manager_assignments
      (organization_id, employee_id, manager_employee_id, starts_on, ends_on)
     values ($1, $2, $4, '2025-01-01', null),
            ($1, $3, $4, '2025-01-01', null),
            ($1, $5, $4, '2025-01-01', '2026-08-01')`,
    [organizationId, currentReportId, otherCurrentReportId, managerEmployeeId, formerReportId],
  );
  await client.query(
    `insert into attendance_heads
      (organization_id, employee_id, state, attendance_revision, next_event_sequence, updated_at)
     values ($1, $2, 'WORKING', 1, 2, $3)`,
    [organizationId, currentReportId, AT],
  );
  for (const employeeId of [currentReportId, formerReportId, unrelatedEmployeeId]) {
    await client.query(
      `insert into correction_requests
        (organization_id, employee_id, requested_by_employee_id, local_date, status, reason,
         original_interpretation, proposed_interpretation, version, created_at)
       values ($1, $2, $2, '2026-08-28', 'SUBMITTED',
               'Private correction reason', '{}'::jsonb, '{}'::jsonb, 1, $3)`,
      [organizationId, employeeId, AT],
    );
  }
  const managerAccountId = await createAccount(client, organizationId, {
    email: 'manager-insight@example.test',
    employeeId: managerEmployeeId,
    name: 'Manager Insight actor',
    role: 'MANAGER',
  });
  await createAccount(client, organizationId, {
    email: 'manager-insight-hr@example.test',
    name: 'Manager Insight HR actor',
    role: 'HR_ADMINISTRATOR',
  });
  return Object.freeze({
    currentReportId,
    formerReportId,
    managerAccountId,
    managerEmployeeId,
    organizationId,
    otherCurrentReportId,
    unrelatedEmployeeId,
  });
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

async function createAccount(
  client: pg.PoolClient,
  organizationId: string,
  input: Readonly<{
    email: string;
    employeeId?: string;
    name: string;
    role: 'HR_ADMINISTRATOR' | 'MANAGER';
  }>,
) {
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
    [accountId, accountId, await hashPassword(PASSWORD)],
  );
  if (input.employeeId !== undefined) {
    await client.query(
      `insert into account_employee_links (organization_id, user_id, employee_id)
       values ($1, $2, $3)`,
      [organizationId, accountId, input.employeeId],
    );
  }
  await client.query(
    `insert into account_role_assignments (organization_id, user_id, role, assigned_at)
     values ($1, $2, $3, '2025-01-01T00:00:00Z')`,
    [organizationId, accountId, input.role],
  );
  return accountId;
}

async function signIn(app: ReturnType<typeof createApiServer>, email: string) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/sign-in/email',
    headers: { 'content-type': 'application/json', origin: ORIGIN },
    payload: { email, password: PASSWORD },
  });
  expect(response.statusCode).toBe(200);
  const setCookie = Array.isArray(response.headers['set-cookie'])
    ? response.headers['set-cookie'][0]
    : response.headers['set-cookie'];
  const cookie = setCookie?.split(';', 1)[0];
  if (cookie === undefined) throw new Error('Expected session cookie.');
  return cookie;
}

async function getCsrf(app: ReturnType<typeof createApiServer>, cookie: string) {
  const response = await app.inject({
    method: 'GET',
    url: '/v1/me/csrf',
    headers: { cookie, origin: ORIGIN },
  });
  expect(response.statusCode).toBe(200);
  return response.json().data.token as string;
}

function mutationHeaders(cookie: string, csrfToken: string) {
  return {
    'content-type': 'application/json',
    cookie,
    origin: ORIGIN,
    'x-workledger-csrf': csrfToken,
  };
}

function requiredId(value: string | undefined): string {
  if (value === undefined) throw new Error('Expected generated identifier.');
  return value;
}
