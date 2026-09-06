/**
 * Integration tests for system operations routes.
 */

import { fileURLToPath } from 'node:url';

import { hashPassword } from 'better-auth/crypto';
import type pg from 'pg';
import { createDatabaseHarnessState, createPostgresSchemaFixture } from '@workledger/test-utils';

import { createRuntimeConfig } from '../src/config.js';
import { createApiServer } from '../src/server.js';
import { createWorkLedgerLogger } from '../src/logging/logger.js';
import { WORKLEDGER_VERSION } from '../src/version.js';

const databaseHarness = createDatabaseHarnessState(process.env);
const integrationTest = databaseHarness.enabled ? test : test.skip;
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
  `system operations diagnostics requires system administrator authorization (${databaseHarness.safeLabel})`,
  async () => {
    if (databaseHarness.url === undefined) throw new Error('Test database is required.');
    const fixture = await createPostgresSchemaFixture({
      connectionString: databaseHarness.url,
      label: 'system_operations',
      migrationFiles,
    });

    const logger = createWorkLedgerLogger({
      environment: 'test',
      service: 'workledger-api-test',
      version: WORKLEDGER_VERSION,
      level: 'warn',
    });

    const config = createRuntimeConfig({
      WORKLEDGER_ENVIRONMENT: 'test',
      WORKLEDGER_ORIGIN: 'https://ledger.example.test',
      WORKLEDGER_TRUSTED_PROXY_ADDRESSES: '',
      WORKLEDGER_DATABASE_URL: fixture.databaseUrl,
      WORKLEDGER_AUTH_SECRET: 'test-secret-for-integration-testing-only',
    });

    const app = createApiServer(config, { logger });

    try {
      const organizationId = await createOrganization(fixture.client);

      await createTechnicalAccount(fixture.client, organizationId, 'system-admin', [
        'SYSTEM_ADMINISTRATOR',
      ]);

      await createEmployeeAccount(fixture.client, organizationId, 'hr-admin', ['HR_ADMINISTRATOR']);

      await createEmployeeAccount(fixture.client, organizationId, 'employee', ['EMPLOYEE']);

      const systemSession = await createSession(app, 'system-admin');
      const hrSession = await createSession(app, 'hr-admin');
      const employeeSession = await createSession(app, 'employee');

      // System administrator can access diagnostics
      const systemDiagnostics = await app.inject({
        method: 'GET',
        url: '/v1/system/operations',
        cookies: { [systemSession.cookieName]: systemSession.cookieValue },
      });

      expect(systemDiagnostics.statusCode).toBe(200);
      const diagnosticsData = systemDiagnostics.json();
      expect(diagnosticsData).toMatchObject({
        service: 'workledger-api',
        version: WORKLEDGER_VERSION,
        environment: 'test',
        dependencies: {
          database: {
            status: expect.stringMatching(/^(healthy|degraded|unavailable)$/u),
          },
          authentication: {
            status: 'healthy',
          },
        },
        health: expect.stringMatching(/^(healthy|degraded|critical)$/u),
      });
      expect(diagnosticsData.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/u);

      // Diagnostics must contain NO domain/HR data
      expect(JSON.stringify(diagnosticsData)).not.toMatch(/employee/i);
      expect(JSON.stringify(diagnosticsData)).not.toMatch(/attendance/i);
      expect(JSON.stringify(diagnosticsData)).not.toMatch(/balance/i);

      // HR administrator cannot access system diagnostics
      const hrDiagnostics = await app.inject({
        method: 'GET',
        url: '/v1/system/operations',
        cookies: { [hrSession.cookieName]: hrSession.cookieValue },
      });

      expect(hrDiagnostics.statusCode).toBe(403);
      expect(hrDiagnostics.json()).toMatchObject({
        error: {
          code: 'ACCESS_DENIED',
        },
      });

      // Regular employee cannot access system diagnostics
      const employeeDiagnostics = await app.inject({
        method: 'GET',
        url: '/v1/system/operations',
        cookies: { [employeeSession.cookieName]: employeeSession.cookieValue },
      });

      expect(employeeDiagnostics.statusCode).toBe(403);
      expect(employeeDiagnostics.json()).toMatchObject({
        error: {
          code: 'ACCESS_DENIED',
        },
      });

      // Unauthenticated access is denied
      const unauthenticated = await app.inject({
        method: 'GET',
        url: '/v1/system/operations',
      });

      expect(unauthenticated.statusCode).toBe(401);
    } finally {
      await app.close();
      await fixture.cleanup();
    }
  },
  30000,
);

integrationTest(
  `detailed readiness requires system administrator authorization (${databaseHarness.safeLabel})`,
  async () => {
    if (databaseHarness.url === undefined) throw new Error('Test database is required.');
    const fixture = await createPostgresSchemaFixture({
      connectionString: databaseHarness.url,
      label: 'system_readiness',
      migrationFiles,
    });

    const logger = createWorkLedgerLogger({
      environment: 'test',
      service: 'workledger-api-test',
      version: WORKLEDGER_VERSION,
      level: 'warn',
    });

    const config = createRuntimeConfig({
      WORKLEDGER_ENVIRONMENT: 'test',
      WORKLEDGER_ORIGIN: 'https://ledger.example.test',
      WORKLEDGER_TRUSTED_PROXY_ADDRESSES: '',
      WORKLEDGER_DATABASE_URL: fixture.databaseUrl,
      WORKLEDGER_AUTH_SECRET: 'test-secret-for-integration-testing-only',
    });

    const app = createApiServer(config, { logger });

    try {
      const organizationId = await createOrganization(fixture.client);

      await createTechnicalAccount(fixture.client, organizationId, 'system-admin', [
        'SYSTEM_ADMINISTRATOR',
      ]);

      const systemSession = await createSession(app, 'system-admin');

      // System administrator can access detailed readiness
      const readinessResponse = await app.inject({
        method: 'GET',
        url: '/v1/system/readiness',
        cookies: { [systemSession.cookieName]: systemSession.cookieValue },
      });

      expect(readinessResponse.statusCode).toBe(200);
      const readinessData = readinessResponse.json();
      expect(readinessData).toMatchObject({
        status: 'ready',
        details: {
          database: 'ready',
          migrations: 'ready',
        },
      });

      // Unauthenticated access returns 503
      const unauthenticated = await app.inject({
        method: 'GET',
        url: '/v1/system/readiness',
      });

      expect(unauthenticated.statusCode).toBe(503);
      expect(unauthenticated.json()).toMatchObject({
        status: 'not_ready',
      });
      await fixture.client.query(
        'ALTER TABLE retention_job_executions RENAME TO unavailable_retention_jobs',
      );
      const unmigrated = await app.inject({
        method: 'GET',
        url: '/v1/system/readiness',
        cookies: { [systemSession.cookieName]: systemSession.cookieValue },
      });
      expect(unmigrated.statusCode).toBe(503);
      expect(unmigrated.json()).toMatchObject({
        status: 'not_ready',
        details: { database: 'not_ready', migrations: 'not_ready' },
      });
    } finally {
      await app.close();
      await fixture.cleanup();
    }
  },
  30000,
);

const PASSWORD = 'safe system operations passphrase 2026';

async function createOrganization(client: pg.ClientBase) {
  const result = await client.query<{ id: string }>(
    "insert into organizations (name, time_zone) values ('System Operations Test Organization', 'Europe/Berlin') returning id",
  );
  const id = result.rows[0]?.id;
  if (id === undefined) throw new Error('Expected organization ID.');
  return id;
}

async function createTechnicalAccount(
  client: pg.ClientBase,
  organizationId: string,
  identifier: string,
  roles: string[],
) {
  const account = await client.query<{ id: string }>(
    'insert into auth_users (name, email, email_verified, active) values ($1, $2, true, true) returning id',
    [identifier, identifier + '@example.test'],
  );
  const id = account.rows[0]?.id;
  if (id === undefined) throw new Error('Expected account ID.');
  await client.query(
    "insert into auth_accounts (user_id, account_id, provider_id, password) values ($1::uuid, $1::text, 'credential', $2)",
    [id, await hashPassword(PASSWORD)],
  );
  for (const role of new Set(roles)) {
    await client.query(
      "insert into account_role_assignments (organization_id, user_id, role, assigned_at) values ($1, $2, $3, '2025-01-01T00:00:00Z')",
      [organizationId, id, role],
    );
  }
  return id;
}

async function createEmployeeAccount(
  client: pg.ClientBase,
  organizationId: string,
  identifier: string,
  roles: string[],
) {
  const accountId = await createTechnicalAccount(client, organizationId, identifier, [
    'EMPLOYEE',
    ...roles,
  ]);
  const employee = await client.query<{ id: string }>(
    "insert into employees (organization_id, employee_number, display_name, status) values ($1, $2, $2, 'ACTIVE') returning id",
    [organizationId, identifier],
  );
  const employeeId = employee.rows[0]?.id;
  if (employeeId === undefined) throw new Error('Expected employee ID.');
  await client.query(
    "insert into employment_periods (organization_id, employee_id, starts_on) values ($1, $2, '2025-01-01')",
    [organizationId, employeeId],
  );
  await client.query(
    'insert into account_employee_links (organization_id, user_id, employee_id) values ($1, $2, $3)',
    [organizationId, accountId, employeeId],
  );
}

async function createSession(app: ReturnType<typeof createApiServer>, identifier: string) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/sign-in/email',
    headers: { origin: 'https://ledger.example.test', 'content-type': 'application/json' },
    payload: { email: identifier + '@example.test', password: PASSWORD, rememberMe: false },
  });
  expect(response.statusCode).toBe(200);
  const cookie = response.cookies.find(({ name }) => name === '__Host-workledger.session');
  if (cookie === undefined) throw new Error('Expected authenticated session cookie.');
  return { cookieName: cookie.name, cookieValue: cookie.value };
}
