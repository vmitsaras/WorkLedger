import { hashPassword } from 'better-auth/crypto';
import { fileURLToPath } from 'node:url';
import type pg from 'pg';

import { createDatabaseHarnessState, createPostgresSchemaFixture } from '@workledger/test-utils';

import { createWorkLedgerAuthentication } from '../src/auth/authentication.js';
import { createRuntimeConfig } from '../src/config.js';
import { createApiServer } from '../src/server.js';

const databaseHarness = createDatabaseHarnessState(process.env);
const integrationTest = databaseHarness.enabled ? test : test.skip;
const ORIGIN = 'https://ledger.example.test';
const AUTH_SECRET = 'authentication-integration-secret-with-more-than-thirty-two-bytes';
const EMAIL = 'employee@example.test';
const PASSWORD = 'safe employee passphrase 2026';
const repositoryDirectory = fileURLToPath(new URL('../../..', import.meta.url));
const migrationFiles = [
  '0000_initial_schema.sql',
  '0001_integrity_constraints.sql',
  '0002_auth_foundation.sql',
].map((file) => `${repositoryDirectory}/packages/database/migrations/${file}`);

integrationTest(
  `enforces the accepted credential and session profile (${databaseHarness.safeLabel})`,
  async () => {
    const fixture = await createPostgresSchemaFixture({
      connectionString: databaseHarness.url,
      label: 'authentication',
      migrationFiles,
    });
    const config = createRuntimeConfig({
      WORKLEDGER_AUTH_SECRET: AUTH_SECRET,
      WORKLEDGER_DATABASE_URL: fixture.databaseUrl,
      WORKLEDGER_ENVIRONMENT: 'test',
      WORKLEDGER_ORIGIN: ORIGIN,
    });
    const app = createApiServer(config);

    try {
      const userId = await createCredentialUser(fixture.client);

      const crossOrigin = await authRequest(
        app,
        '/api/auth/sign-in/email',
        { email: EMAIL, password: PASSWORD },
        'https://attacker.example.test',
      );
      expect(crossOrigin.statusCode).toBe(403);

      const signIn = await authRequest(app, '/api/auth/sign-in/email', {
        email: EMAIL,
        password: PASSWORD,
        rememberMe: true,
      });
      expect(signIn.statusCode).toBe(200);
      expect(signIn.json()).not.toHaveProperty('token');

      const setCookie = readSetCookie(signIn.headers['set-cookie']);
      expect(setCookie).toContain('__Host-workledger.session=');
      expect(setCookie).toContain('HttpOnly');
      expect(setCookie).toContain('Secure');
      expect(setCookie).toContain('SameSite=Lax');
      expect(setCookie).toContain('Path=/');
      expect(setCookie).not.toContain('Domain=');
      expect(setCookie).not.toContain('Max-Age=');
      expect(setCookie).not.toContain('Expires=');
      const cookie = setCookie.split(';', 1)[0];
      if (cookie === undefined) throw new Error('Expected a session cookie.');

      const storedSession = await fixture.client.query<{
        created_at: Date;
        expires_at: Date;
        token: string;
      }>(`select created_at, expires_at, token from auth_sessions where user_id = $1`, [userId]);
      expect(storedSession.rows).toHaveLength(1);
      const sessionRow = storedSession.rows[0];
      if (sessionRow === undefined) throw new Error('Expected a stored session row.');
      expect(sessionRow.expires_at.getTime() - sessionRow.created_at.getTime()).toBe(
        30 * 60 * 1_000,
      );

      const sessionResponse = await app.inject({
        method: 'GET',
        url: '/api/auth/get-session',
        headers: { cookie, origin: ORIGIN },
      });
      expect(sessionResponse.statusCode).toBe(200);
      expect(JSON.stringify(sessionResponse.json())).not.toContain(sessionRow.token);
      expect(sessionResponse.headers['cache-control']).toBe('private, no-store');

      const authentication = createWorkLedgerAuthentication({
        ...config,
        authSecret: AUTH_SECRET,
        databaseUrl: fixture.databaseUrl,
      });
      try {
        const headers = new Headers({ cookie, origin: ORIGIN });
        await fixture.client.query(
          `update auth_sessions set expires_at = now() + interval '5 minutes' where user_id = $1`,
          [userId],
        );
        const passive = await authentication.getSession(headers, 'PASSIVE');
        const afterPassive = await sessionExpiry(fixture.client, userId);
        expect(passive?.userId).toBe(userId);
        expect(afterPassive.getTime()).toBeLessThan(Date.now() + 6 * 60 * 1_000);

        expect(await authentication.getSession(headers, 'ACTIVE')).not.toBeNull();
        const afterActive = await sessionExpiry(fixture.client, userId);
        expect(afterActive.getTime()).toBeGreaterThan(Date.now() + 29 * 60 * 1_000);

        await fixture.client.query(
          `update auth_sessions set created_at = now() - interval '11 hours 50 minutes', expires_at = now() + interval '5 minutes' where user_id = $1`,
          [userId],
        );
        const oldSession = await authentication.getSession(headers, 'ACTIVE');
        const cappedExpiry = await sessionExpiry(fixture.client, userId);
        expect(oldSession?.fresh).toBe(false);
        expect(cappedExpiry.getTime()).toBeLessThan(Date.now() + 11 * 60 * 1_000);

        const csrf = await authentication.issueCsrfToken(headers);
        if (csrf === null) throw new Error('Expected a session-bound CSRF token.');
        expect(await authentication.verifyCsrfToken(headers, csrf)).toBe(true);
        expect(await authentication.verifyCsrfToken(headers, `${csrf}x`)).toBe(false);
      } finally {
        await authentication.close();
      }

      const signUp = await authRequest(app, '/api/auth/sign-up/email', {
        email: 'new@example.test',
        name: 'New account',
        password: 'another safe passphrase 2026',
      });
      expect(signUp.statusCode).toBe(400);

      const knownFailure = await app.inject({
        method: 'POST',
        url: '/api/auth/sign-in/email',
        remoteAddress: '198.51.100.30',
        headers: { 'content-type': 'application/json', origin: ORIGIN },
        payload: { email: EMAIL, password: 'incorrect employee passphrase 2026' },
      });
      const unknownFailure = await app.inject({
        method: 'POST',
        url: '/api/auth/sign-in/email',
        remoteAddress: '198.51.100.31',
        headers: { 'content-type': 'application/json', origin: ORIGIN },
        payload: { email: 'unknown-credential@example.test', password: PASSWORD },
      });
      expect(knownFailure.statusCode).toBe(unknownFailure.statusCode);
      expect(knownFailure.payload).toBe(unknownFailure.payload);

      const resetMessages: URL[] = [];
      const resetAuthentication = createWorkLedgerAuthentication(
        { ...config, authSecret: AUTH_SECRET, databaseUrl: fixture.databaseUrl },
        async ({ resetUrl }) => {
          resetMessages.push(resetUrl);
        },
      );
      try {
        const knownReset = await resetAuthentication.handler(
          jsonRequest('/api/auth/request-password-reset', {
            email: EMAIL,
            redirectTo: 'https://attacker.example.test/steal',
          }),
        );
        const unknownReset = await resetAuthentication.handler(
          jsonRequest('/api/auth/request-password-reset', {
            email: 'unknown@example.test',
            redirectTo: 'https://attacker.example.test/steal',
          }),
        );
        expect(knownReset.status).toBe(200);
        expect(unknownReset.status).toBe(200);
        expect(await knownReset.text()).toBe(await unknownReset.text());
        expect(resetMessages).toHaveLength(1);
        expect(resetMessages[0]?.origin).toBe(ORIGIN);
        expect(resetMessages[0]?.pathname).toBe('/reset-password');

        const resetToken = resetMessages[0]?.searchParams.get('token');
        if (resetToken === null || resetToken === undefined) {
          throw new Error('Expected a reset grant from the test reset sender.');
        }
        const storedResetGrant = await fixture.client.query<{ identifier: string }>(
          `select identifier from auth_verifications where value = $1`,
          [userId],
        );
        expect(storedResetGrant.rows).toHaveLength(1);
        expect(storedResetGrant.rows[0]?.identifier).not.toContain(resetToken);
        const commonPassword = await resetAuthentication.handler(
          jsonRequest('/api/auth/reset-password', {
            newPassword: 'PasswordPassword',
            token: resetToken,
          }),
        );
        expect(commonPassword.status).toBe(400);
        expect(await commonPassword.json()).toEqual({
          code: 'PASSWORD_POLICY_REJECTED',
          message: 'The password does not meet the credential policy.',
        });

        const reset = await resetAuthentication.handler(
          jsonRequest('/api/auth/reset-password', {
            newPassword: 'replacement safe passphrase 2026',
            token: resetToken,
          }),
        );
        expect(reset.status).toBe(200);
        expect(
          await fixture.client.query(`select id from auth_sessions where user_id = $1`, [userId]),
        ).toHaveProperty('rowCount', 0);

        const replay = await resetAuthentication.handler(
          jsonRequest('/api/auth/reset-password', {
            newPassword: 'another replacement passphrase 2026',
            token: resetToken,
          }),
        );
        expect(replay.status).toBe(400);

        const expiringRequest = await resetAuthentication.handler(
          jsonRequest('/api/auth/request-password-reset', { email: EMAIL }),
        );
        expect(expiringRequest.status).toBe(200);
        const expiringToken = resetMessages[1]?.searchParams.get('token');
        if (expiringToken === null || expiringToken === undefined) {
          throw new Error('Expected a second reset grant from the test reset sender.');
        }
        await fixture.client.query(
          `update auth_verifications set expires_at = now() - interval '1 second' where value = $1`,
          [userId],
        );
        const expired = await resetAuthentication.handler(
          jsonRequest('/api/auth/reset-password', {
            newPassword: 'another replacement passphrase 2026',
            token: expiringToken,
          }),
        );
        expect(expired.status).toBe(400);
      } finally {
        await resetAuthentication.close();
      }

      const rateLimitedStatuses: number[] = [];
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const response = await app.inject({
          method: 'POST',
          url: '/api/auth/sign-in/email',
          remoteAddress: '198.51.100.20',
          headers: { 'content-type': 'application/json', origin: ORIGIN },
          payload: { email: 'rate-limit@example.test', password: PASSWORD },
        });
        rateLimitedStatuses.push(response.statusCode);
      }
      expect(rateLimitedStatuses).toEqual([401, 401, 401, 401, 401, 429]);
    } finally {
      await app.close();
      await fixture.cleanup();
    }
  },
);

async function createCredentialUser(client: pg.Client): Promise<string> {
  const passwordHash = await hashPassword(PASSWORD);
  const user = await client.query<{ id: string }>(
    `insert into auth_users (name, email, email_verified) values ($1, $2, true) returning id`,
    ['Employee Account', EMAIL],
  );
  const userId = user.rows[0]?.id;
  if (userId === undefined) throw new Error('Expected an authentication user.');
  await client.query(
    `insert into auth_accounts (user_id, account_id, provider_id, password) values ($1, $2, 'credential', $3)`,
    [userId, userId, passwordHash],
  );
  return userId;
}

async function sessionExpiry(client: pg.Client, userId: string): Promise<Date> {
  const result = await client.query<{ expires_at: Date }>(
    `select expires_at from auth_sessions where user_id = $1`,
    [userId],
  );
  const expiresAt = result.rows[0]?.expires_at;
  if (expiresAt === undefined) throw new Error('Expected a stored session.');
  return expiresAt;
}

function authRequest(
  app: ReturnType<typeof createApiServer>,
  url: string,
  payload: Record<string, unknown>,
  origin = ORIGIN,
) {
  return app.inject({
    method: 'POST',
    url,
    headers: { 'content-type': 'application/json', origin },
    payload,
  });
}

function jsonRequest(path: string, body: Record<string, unknown>): Request {
  return new Request(`${ORIGIN}${path}`, {
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', origin: ORIGIN },
    method: 'POST',
  });
}

function readSetCookie(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value.join('\n');
  if (value === undefined) throw new Error('Expected a Set-Cookie response header.');
  return value;
}
