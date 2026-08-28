import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { hashPassword } from 'better-auth/crypto';
import type pg from 'pg';
import { vi } from 'vitest';

import { systemInsightNativeResultSchema } from '@workledger/contracts/insights';
import { createDatabaseHarnessState, createPostgresSchemaFixture } from '@workledger/test-utils';

import type { AiProvider } from '../src/ai/contracts.js';
import { createRuntimeConfig } from '../src/config.js';
import type { NotificationDeliveryAdapter } from '../src/notifications/delivery.js';
import { createApiServer } from '../src/server.js';
import { WORKLEDGER_VERSION } from '../src/version.js';

const databaseHarness = createDatabaseHarnessState(process.env);
const integrationTest = databaseHarness.enabled ? test : test.skip;
const ORIGIN = 'https://ledger.example.test';
const AUTH_SECRET = 'system-insight-integration-secret-with-more-than-thirty-two-bytes';
const PASSWORD = 'safe system insight passphrase 2026';
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
  `isolates the allowlisted System Insight behind current technical authority (${databaseHarness.safeLabel})`,
  async () => {
    const fixture = await createPostgresSchemaFixture({
      connectionString: databaseHarness.url,
      label: 'system_insight',
      migrationFiles,
    });
    const providerGenerate = vi.fn();
    const provider: AiProvider = Object.freeze({
      mode: 'disabled',
      checkHealth: async () => providerHealth,
      generate: providerGenerate,
      getHealth: () => providerHealth,
    });
    const notificationDelivery: NotificationDeliveryAdapter = Object.freeze({
      configured: true,
      async deliver() {
        return { outcome: 'DELIVERED' };
      },
    });
    const app = createApiServer(
      createRuntimeConfig({
        WORKLEDGER_AUTH_SECRET: AUTH_SECRET,
        WORKLEDGER_DATABASE_URL: fixture.databaseUrl,
        WORKLEDGER_ENVIRONMENT: 'test',
        WORKLEDGER_ORIGIN: ORIGIN,
      }),
      { aiProvider: provider, notificationDelivery, now: () => AT },
    );

    try {
      const actors = await createActors(fixture.client);
      const systemCookie = await signIn(app, 'system@example.test');
      const hrCookie = await signIn(app, 'hr@example.test');
      const systemCsrf = await getCsrf(app, systemCookie);
      const hrCsrf = await getCsrf(app, hrCookie);

      const unauthenticated = await app.inject({
        method: 'POST',
        url: '/v1/insights/system/run',
        headers: { origin: ORIGIN },
        payload: request(),
      });
      expect(unauthenticated.statusCode).toBe(401);

      const wrongOrigin = await app.inject({
        method: 'POST',
        url: '/v1/insights/system/run',
        headers: mutationHeaders(systemCookie, systemCsrf, 'https://attacker.example.test'),
        payload: request(),
      });
      expect(wrongOrigin.statusCode).toBe(403);

      const invalid = await app.inject({
        method: 'POST',
        url: '/v1/insights/system/run',
        headers: mutationHeaders(systemCookie, systemCsrf),
        payload: { ...request(), employeeId: actors.hrEmployeeId },
      });
      expect(invalid.statusCode).toBe(422);
      expect(invalid.payload).not.toContain(actors.hrEmployeeId);

      const hrDenied = await app.inject({
        method: 'POST',
        url: '/v1/insights/system/run',
        headers: mutationHeaders(hrCookie, hrCsrf),
        payload: request(),
      });
      expect(hrDenied.statusCode).toBe(403);

      const response = await app.inject({
        method: 'POST',
        url: '/v1/insights/system/run',
        headers: mutationHeaders(systemCookie, systemCsrf),
        payload: request(),
      });
      expect(response.statusCode, response.payload).toBe(200);
      expect(response.headers['cache-control']).toBe('private, no-store');
      const result = systemInsightNativeResultSchema.parse(response.json().data);
      expect([
        [
          { code: 'SERVICE_HEALTH', source: 'DATABASE_READINESS', value: 'HEALTHY' },
          { code: 'DATABASE_HEALTH', source: 'DATABASE_READINESS', value: 'HEALTHY' },
          { code: 'EXPECTED_SCHEMA_STATUS', source: 'DATABASE_READINESS', value: 'READY' },
        ],
        [
          { code: 'SERVICE_HEALTH', source: 'DATABASE_READINESS', value: 'CRITICAL' },
          {
            code: 'DATABASE_HEALTH',
            source: 'DATABASE_READINESS',
            value: 'UNAVAILABLE',
          },
          {
            code: 'EXPECTED_SCHEMA_STATUS',
            source: 'DATABASE_READINESS',
            value: 'NOT_READY',
          },
        ],
      ]).toContainEqual(result.facts.slice(1, 4));
      expect([result.facts[0], ...result.facts.slice(4)]).toEqual([
        { code: 'APPLICATION_VERSION', source: 'APPLICATION_MANIFEST', value: WORKLEDGER_VERSION },
        {
          code: 'BACKUP_MANAGEMENT',
          source: 'HOST_OPERATOR_PROCEDURES',
          value: 'HOST_OPERATOR_MANAGED',
        },
        {
          code: 'MAIL_DELIVERY_CONFIGURATION',
          source: 'MAIL_ADAPTER_CONFIGURATION',
          value: 'CONFIGURED',
        },
        {
          code: 'SESSION_IDLE_TIMEOUT_MINUTES',
          source: 'AUTHENTICATION_SECURITY_PROFILE',
          value: 30,
        },
        {
          code: 'SESSION_ABSOLUTE_TIMEOUT_MINUTES',
          source: 'AUTHENTICATION_SECURITY_PROFILE',
          value: 720,
        },
        {
          code: 'SESSION_FRESH_WINDOW_MINUTES',
          source: 'AUTHENTICATION_SECURITY_PROFILE',
          value: 15,
        },
        {
          code: 'PERSISTENT_REMEMBER_ME',
          source: 'AUTHENTICATION_SECURITY_PROFILE',
          value: false,
        },
      ]);
      expect(result.limitations).toEqual([
        {
          code: 'BACKUP_RUNTIME_STATUS_HOST_OWNED',
          material: true,
          source: 'HOST_OPERATOR_PROCEDURES',
        },
      ]);
      const serialized = JSON.stringify(result).toLocaleLowerCase('en-US');
      for (const forbidden of [
        actors.organizationId,
        actors.systemAccountId,
        actors.hrAccountId,
        actors.hrEmployeeId,
        'employee',
        'attendance',
        'absence',
        'balance',
        'sickness',
        'request',
        'report',
        'email',
      ]) {
        expect(serialized).not.toContain(forbidden.toLocaleLowerCase('en-US'));
      }
      expect(providerGenerate).not.toHaveBeenCalled();

      await fixture.client.query(
        `insert into account_role_assignments
           (organization_id, user_id, role, assigned_at)
         values ($1, $2, 'HR_ADMINISTRATOR', '2025-01-01T00:00:00Z')`,
        [actors.organizationId, actors.systemAccountId],
      );
      await fixture.client.query(
        `update account_role_assignments set revoked_at = $1
         where organization_id = $2 and user_id = $3 and role = 'SYSTEM_ADMINISTRATOR'`,
        [AT, actors.organizationId, actors.systemAccountId],
      );
      const authorityLost = await app.inject({
        method: 'POST',
        url: '/v1/insights/system/run',
        headers: mutationHeaders(systemCookie, systemCsrf),
        payload: request(),
      });
      expect(authorityLost.statusCode).toBe(403);
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

function request() {
  return { kind: 'SYSTEM_TECHNICAL_OVERVIEW' as const, workspace: 'SYSTEM' as const };
}

async function createActors(client: pg.PoolClient) {
  const passwordHash = await hashPassword(PASSWORD);
  const organization = await client.query<{ id: string }>(
    `insert into organizations (name, time_zone)
     values ('System Insight Organization', 'Europe/Berlin') returning id`,
  );
  const organizationId = organization.rows[0]?.id;
  if (organizationId === undefined) throw new Error('Expected organization ID.');
  const systemAccountId = await insertCredentialAccount(
    client,
    'System Administrator',
    'system@example.test',
    passwordHash,
  );
  const hrAccountId = await insertCredentialAccount(
    client,
    'HR Administrator',
    'hr@example.test',
    passwordHash,
  );
  const employee = await client.query<{ id: string }>(
    `insert into employees (organization_id, employee_number, display_name, status)
     values ($1, 'HR-001', 'HR Administrator', 'ACTIVE') returning id`,
    [organizationId],
  );
  const hrEmployeeId = employee.rows[0]?.id;
  if (hrEmployeeId === undefined) throw new Error('Expected HR employee ID.');
  await client.query(
    `insert into employment_periods (organization_id, employee_id, starts_on)
     values ($1, $2, '2025-01-01')`,
    [organizationId, hrEmployeeId],
  );
  await client.query(
    `insert into account_employee_links (organization_id, user_id, employee_id)
     values ($1, $2, $3)`,
    [organizationId, hrAccountId, hrEmployeeId],
  );
  await client.query(
    `insert into account_role_assignments (organization_id, user_id, role, assigned_at) values
       ($1, $2, 'SYSTEM_ADMINISTRATOR', '2025-01-01T00:00:00Z'),
       ($1, $3, 'EMPLOYEE', '2025-01-01T00:00:00Z'),
       ($1, $3, 'HR_ADMINISTRATOR', '2025-01-01T00:00:00Z')`,
    [organizationId, systemAccountId, hrAccountId],
  );
  return { hrAccountId, hrEmployeeId, organizationId, systemAccountId };
}

async function insertCredentialAccount(
  client: pg.PoolClient,
  name: string,
  email: string,
  passwordHash: string,
) {
  const account = await client.query<{ id: string }>(
    `insert into auth_users (id, name, email, email_verified, active)
     values ($1, $2, $3, true, true) returning id`,
    [randomUUID(), name, email],
  );
  const accountId = account.rows[0]?.id;
  if (accountId === undefined) throw new Error('Expected account ID.');
  await client.query(
    `insert into auth_accounts (user_id, account_id, provider_id, password)
     values ($1::uuid, $1::text, 'credential', $2)`,
    [accountId, passwordHash],
  );
  return accountId;
}

async function signIn(app: ReturnType<typeof createApiServer>, email: string) {
  const response = await app.inject({
    headers: { 'content-type': 'application/json', origin: ORIGIN },
    method: 'POST',
    payload: { email, password: PASSWORD, rememberMe: false },
    url: '/api/auth/sign-in/email',
  });
  expect(response.statusCode).toBe(200);
  const cookie = response.cookies.find(({ name }) => name === '__Host-workledger.session');
  if (cookie === undefined) throw new Error('Expected session cookie.');
  return `${cookie.name}=${cookie.value}`;
}

async function getCsrf(app: ReturnType<typeof createApiServer>, cookie: string) {
  const response = await app.inject({
    headers: { cookie, origin: ORIGIN },
    method: 'GET',
    url: '/v1/me/csrf',
  });
  expect(response.statusCode).toBe(200);
  return String(response.json().data.token);
}

function mutationHeaders(cookie: string, csrf: string, origin: string = ORIGIN) {
  return {
    'content-type': 'application/json',
    cookie,
    origin,
    'x-workledger-csrf': csrf,
  };
}
