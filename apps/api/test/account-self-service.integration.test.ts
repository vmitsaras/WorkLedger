import { hashPassword } from 'better-auth/crypto';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

import type pg from 'pg';

import { createDatabaseHarnessState, createPostgresSchemaFixture } from '@workledger/test-utils';

import { createRuntimeConfig } from '../src/config.js';
import { createApiServer } from '../src/server.js';

const databaseHarness = createDatabaseHarnessState(process.env);
const integrationTest = databaseHarness.enabled ? test : test.skip;
const ORIGIN = 'https://ledger.example.test';
const AUTH_SECRET = 'account-self-service-secret-with-more-than-thirty-two-bytes';
const EMAIL = 'profile@example.test';
const PASSWORD = 'safe profile passphrase 2026';
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
  `serves minimized self context and atomically revokes owned sessions (${databaseHarness.safeLabel})`,
  async () => {
    const fixture = await createPostgresSchemaFixture({
      connectionString: databaseHarness.url,
      label: 'account_self_service',
      migrationFiles,
    });
    const app = createApiServer(
      createRuntimeConfig({
        WORKLEDGER_AUTH_SECRET: AUTH_SECRET,
        WORKLEDGER_DATABASE_URL: fixture.databaseUrl,
        WORKLEDGER_ENVIRONMENT: 'test',
        WORKLEDGER_ORIGIN: ORIGIN,
        WORKLEDGER_ORGANIZATION_NAME: 'Profile Organization',
        WORKLEDGER_ORGANIZATION_LOGO_PATH: '/identity/profile.svg',
        WORKLEDGER_ORGANIZATION_FAVICON_PATH: '/identity/profile-icon.png',
        WORKLEDGER_ORGANIZATION_ACCENT_COLOR: '#14532d',
      }),
    );

    try {
      const accountId = await createEmployeeAccount(fixture.client);
      const firstCookie = await signIn(app, 'Mozilla/5.0 (Macintosh) Chrome/140.0');
      const secondCookie = await signIn(app, 'Mozilla/5.0 (Windows NT 10.0) Firefox/141.0');

      const contextResponse = await app.inject({
        method: 'GET',
        url: '/v1/me/context',
        headers: { cookie: firstCookie, origin: ORIGIN },
      });
      expect(contextResponse.statusCode).toBe(200);
      expect(contextResponse.headers['cache-control']).toBe('private, no-store');
      expect(contextResponse.json()).toMatchObject({
        data: {
          account: { email: EMAIL, name: 'Profile Employee' },
          defaultPath: '/today',
          employee: {
            displayName: 'Profile Employee',
            employeeNumber: 'PROFILE-001',
            status: 'ACTIVE',
          },
          navigationAreas: ['EMPLOYEE'],
          organization: {
            accentColor: '#14532d',
            faviconPath: '/identity/profile-icon.png',
            logoPath: '/identity/profile.svg',
            name: 'Profile Organization',
          },
          roles: ['EMPLOYEE'],
        },
      });
      expect(contextResponse.payload).not.toContain('employeeId');
      expect(contextResponse.payload).not.toContain('organizationId');

      const profileResponse = await app.inject({
        method: 'GET',
        url: '/v1/me/profile',
        headers: { cookie: firstCookie, origin: ORIGIN },
      });
      expect(profileResponse.statusCode).toBe(200);
      const profile = profileResponse.json().data as {
        sessions: Array<{
          current: boolean;
          deviceSummary: string;
          id: string;
        }>;
      };
      expect(profile.sessions).toHaveLength(2);
      expect(profile.sessions.map(({ deviceSummary }) => deviceSummary).sort()).toEqual([
        'Chrome on macOS',
        'Firefox on Windows',
      ]);
      expect(profileResponse.payload).not.toContain('ipAddress');
      expect(profileResponse.payload).not.toContain('userAgent');
      expect(profileResponse.payload).not.toContain('Mozilla');

      const firstSession = profile.sessions.find(({ current }) => current);
      const secondSession = profile.sessions.find(({ current }) => !current);
      if (firstSession === undefined || secondSession === undefined) {
        throw new Error('Expected current and other session summaries.');
      }

      await fixture.client.query(
        `update auth_sessions set created_at = now() - interval '20 minutes' where id = $1`,
        [firstSession.id],
      );
      const firstCsrf = await getCsrf(app, firstCookie);
      const staleRevoke = await app.inject({
        method: 'POST',
        url: `/v1/me/sessions/${secondSession.id}/revoke`,
        headers: {
          cookie: firstCookie,
          origin: ORIGIN,
          'x-workledger-csrf': firstCsrf,
        },
      });
      expect(staleRevoke.statusCode).toBe(401);
      expect(staleRevoke.json()).toMatchObject({ error: { code: 'AUTH_SESSION_NOT_FRESH' } });

      const freshCookie = await signIn(app, 'Mozilla/5.0 (X11; Linux x86_64) Edg/142.0');
      const freshProfileResponse = await app.inject({
        method: 'GET',
        url: '/v1/me/profile',
        headers: { cookie: freshCookie, origin: ORIGIN },
      });
      const freshSessions = freshProfileResponse.json().data.sessions as Array<{
        current: boolean;
        id: string;
      }>;
      const freshCurrent = freshSessions.find(({ current }) => current);
      if (freshCurrent === undefined) throw new Error('Expected a fresh current session.');

      const freshCsrf = await getCsrf(app, freshCookie);
      const revokeOther = await app.inject({
        method: 'POST',
        url: `/v1/me/sessions/${secondSession.id}/revoke`,
        headers: {
          cookie: freshCookie,
          origin: ORIGIN,
          'x-workledger-csrf': freshCsrf,
        },
      });
      expect(revokeOther.statusCode).toBe(200);
      expect(revokeOther.json()).toMatchObject({
        data: { revokedCurrentSession: false, revokedSessionId: secondSession.id },
      });

      const crossAccountOrMissing = await app.inject({
        method: 'POST',
        url: `/v1/me/sessions/${randomUUID()}/revoke`,
        headers: {
          cookie: freshCookie,
          origin: ORIGIN,
          'x-workledger-csrf': freshCsrf,
        },
      });
      expect(crossAccountOrMissing.statusCode).toBe(403);
      expect(crossAccountOrMissing.json()).toMatchObject({ error: { code: 'ACCESS_DENIED' } });

      const revokeCurrent = await app.inject({
        method: 'POST',
        url: `/v1/me/sessions/${freshCurrent.id}/revoke`,
        headers: {
          cookie: freshCookie,
          origin: ORIGIN,
          'x-workledger-csrf': freshCsrf,
        },
      });
      expect(revokeCurrent.statusCode).toBe(200);
      expect(revokeCurrent.json()).toMatchObject({
        data: { revokedCurrentSession: true, revokedSessionId: freshCurrent.id },
      });
      expect(revokeCurrent.headers['set-cookie']).toContain('Max-Age=0');

      const revokedContext = await app.inject({
        method: 'GET',
        url: '/v1/me/context',
        headers: { cookie: freshCookie, origin: ORIGIN },
      });
      expect(revokedContext.statusCode).toBe(401);
      expect(revokedContext.json()).toMatchObject({ error: { code: 'AUTH_SESSION_EXPIRED' } });

      const auditRows = await fixture.client.query<{
        action_code: string;
        target_account_id: string;
        target_id: string;
      }>(
        `select action_code, target_account_id, target_id
         from security_audit_events
         where action_code = 'SESSION_SELF_REVOKED'
         order by occurred_at`,
      );
      expect(auditRows.rows).toHaveLength(2);
      expect(auditRows.rows.every(({ target_account_id }) => target_account_id === accountId)).toBe(
        true,
      );
      expect(auditRows.rows.map(({ target_id }) => target_id).sort()).toEqual(
        [secondSession.id, freshCurrent.id].sort(),
      );
    } finally {
      await app.close();
      await fixture.cleanup();
    }
  },
);

async function createEmployeeAccount(client: pg.PoolClient): Promise<string> {
  const passwordHash = await hashPassword(PASSWORD);
  const organization = await client.query<{ id: string }>(
    `insert into organizations (name, time_zone)
     values ('Profile Organization', 'Europe/Berlin')
     returning id`,
  );
  const organizationId = organization.rows[0]?.id;
  if (organizationId === undefined) throw new Error('Expected organization ID.');
  const account = await client.query<{ id: string }>(
    `insert into auth_users (name, email, email_verified, active)
     values ('Profile Employee', $1, true, true)
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
     values ($1, 'PROFILE-001', 'Profile Employee', 'ACTIVE')
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
  return accountId;
}

async function signIn(app: ReturnType<typeof createApiServer>, userAgent: string): Promise<string> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/sign-in/email',
    headers: {
      'content-type': 'application/json',
      origin: ORIGIN,
      'user-agent': userAgent,
    },
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
