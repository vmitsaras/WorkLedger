/**
 * Integration tests for system operations routes.
 */

import { fileURLToPath } from 'node:url';

import { parseDomainId, type DomainId } from '@workledger/domain';
import { createWorkLedgerDatabase } from '@workledger/database';
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
].map((file) => `${repositoryDirectory}/packages/database/migrations/${file}`);

integrationTest(
  `system operations diagnostics requires system administrator authorization (${databaseHarness.safeLabel})`,
  async () => {
    const fixture = await createPostgresSchemaFixture({
      connectionString: databaseHarness.url,
      label: 'system-operations',
      migrationFiles,
    });

    const database = createWorkLedgerDatabase({
      applicationName: 'workledger-system-operations-test',
      connectionString: fixture.databaseUrl,
    });

    const logger = createWorkLedgerLogger({
      environment: 'test',
      service: 'workledger-api-test',
      version: WORKLEDGER_VERSION,
      level: 'warn',
    });

    const config = createRuntimeConfig({
      WORKLEDGER_ENVIRONMENT: 'test',
      WORKLEDGER_ORIGIN: 'http://localhost:3000',
      WORKLEDGER_TRUSTED_PROXY_ADDRESSES: '',
      WORKLEDGER_DATABASE_URL: fixture.databaseUrl,
      WORKLEDGER_AUTH_SECRET: 'test-secret-for-integration-testing-only',
    });

    const app = createApiServer(config, { logger });

    try {
      const organizationId = await createOrganization(fixture.client);

      const systemAdmin = await createTechnicalAccount(
        fixture.client,
        organizationId,
        'system-admin',
        ['SYSTEM_ADMINISTRATOR'],
      );

      const hrAdmin = await createEmployeeAccount(fixture.client, organizationId, 'hr-admin', [
        'HR_ADMINISTRATOR',
      ]);

      const regularEmployee = await createEmployeeAccount(
        fixture.client,
        organizationId,
        'employee',
        ['EMPLOYEE'],
      );

      const systemSession = await createSession(
        fixture.client,
        systemAdmin,
        fixture.databaseUrl,
        config,
      );
      const hrSession = await createSession(
        fixture.client,
        hrAdmin.accountId,
        fixture.databaseUrl,
        config,
      );
      const employeeSession = await createSession(
        fixture.client,
        regularEmployee.accountId,
        fixture.databaseUrl,
        config,
      );

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
      await Promise.all([app.close(), database.close(), fixture.cleanup()]);
    }
  },
  30000,
);

integrationTest(
  `detailed readiness requires system administrator authorization (${databaseHarness.safeLabel})`,
  async () => {
    const fixture = await createPostgresSchemaFixture({
      connectionString: databaseHarness.url,
      label: 'system-readiness',
      migrationFiles,
    });

    const database = createWorkLedgerDatabase({
      applicationName: 'workledger-system-readiness-test',
      connectionString: fixture.databaseUrl,
    });

    const logger = createWorkLedgerLogger({
      environment: 'test',
      service: 'workledger-api-test',
      version: WORKLEDGER_VERSION,
      level: 'warn',
    });

    const config = createRuntimeConfig({
      WORKLEDGER_ENVIRONMENT: 'test',
      WORKLEDGER_ORIGIN: 'http://localhost:3000',
      WORKLEDGER_TRUSTED_PROXY_ADDRESSES: '',
      WORKLEDGER_DATABASE_URL: fixture.databaseUrl,
      WORKLEDGER_AUTH_SECRET: 'test-secret-for-integration-testing-only',
    });

    const app = createApiServer(config, { logger });

    try {
      const organizationId = await createOrganization(fixture.client);

      const systemAdmin = await createTechnicalAccount(
        fixture.client,
        organizationId,
        'system-admin',
        ['SYSTEM_ADMINISTRATOR'],
      );

      const systemSession = await createSession(
        fixture.client,
        systemAdmin,
        fixture.databaseUrl,
        config,
      );

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
    } finally {
      await Promise.all([app.close(), database.close(), fixture.cleanup()]);
    }
  },
  30000,
);

async function createOrganization(client: {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
}): Promise<DomainId> {
  const result = await client.query(`
    insert into organizations (display_name, timezone)
    values ('System Operations Test Organization', 'Europe/Berlin')
    returning id
  `);
  return parseDomainId((result.rows[0] as { id: string }).id);
}

async function createTechnicalAccount(
  client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> },
  organizationId: DomainId,
  email: string,
  roles: string[],
  active: boolean = true,
): Promise<DomainId> {
  const accountResult = await client.query(
    `insert into accounts (organization_id, email, active) values ($1, $2, $3) returning id`,
    [organizationId, `${email}@example.com`, active],
  );
  const accountId = parseDomainId((accountResult.rows[0] as { id: string }).id);

  for (const role of roles) {
    await client.query(
      `insert into account_roles (organization_id, account_id, role) values ($1, $2, $3)`,
      [organizationId, accountId, role],
    );
  }

  return accountId;
}

async function createEmployeeAccount(
  client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> },
  organizationId: DomainId,
  identifier: string,
  roles: string[],
): Promise<{ accountId: DomainId; employeeId: DomainId }> {
  const accountResult = await client.query(
    `insert into accounts (organization_id, email, active) values ($1, $2, true) returning id`,
    [organizationId, `${identifier}@example.com`],
  );
  const accountId = parseDomainId((accountResult.rows[0] as { id: string }).id);

  const employeeResult = await client.query(
    `insert into employees (organization_id, family_name, given_name, status)
     values ($1, $2, $3, 'ACTIVE') returning id`,
    [organizationId, identifier, identifier],
  );
  const employeeId = parseDomainId((employeeResult.rows[0] as { id: string }).id);

  await client.query(
    `insert into account_employee_links (organization_id, account_id, employee_id, starts_on)
     values ($1, $2, $3, '2026-01-01')`,
    [organizationId, accountId, employeeId],
  );

  for (const role of roles) {
    await client.query(
      `insert into account_roles (organization_id, account_id, role) values ($1, $2, $3)`,
      [organizationId, accountId, role],
    );
  }

  return { accountId, employeeId };
}

async function createSession(
  client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> },
  accountId: DomainId,
  databaseUrl: string,
  config: ReturnType<typeof createRuntimeConfig>,
): Promise<{ cookieName: string; cookieValue: string }> {
  const { BetterAuthClient } = await import('better-auth/client');
  const authClient = new BetterAuthClient({
    baseURL: 'http://localhost:3000',
  });

  // For testing, we'll use a simpler approach - just create a session directly
  const sessionToken = `test-session-${accountId}-${Date.now()}`;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await client.query(
    `insert into sessions (id, account_id, user_agent, expires_at)
     values ($1, $2, 'test-agent', $3)`,
    [sessionToken, accountId, expiresAt],
  );

  return {
    cookieName: 'better-auth.session_token',
    cookieValue: sessionToken,
  };
}
