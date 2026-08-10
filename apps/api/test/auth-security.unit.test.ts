import { hashPassword, verifyPassword } from 'better-auth/crypto';

import { createWorkLedgerAuthDatabase } from '@workledger/database';

import { AUTH_SECURITY_PROFILE, createAuthOptions } from '../src/auth/authentication.js';
import { PasswordPolicyError, validateCredentialPassword } from '../src/auth/password-policy.js';
import { createSessionCsrfToken, verifySessionCsrfToken } from '../src/auth/session-csrf.js';
import { createRuntimeConfig } from '../src/config.js';

const TEST_SECRET = 'auth-security-test-secret-value-with-at-least-thirty-two-bytes';
const TEST_DATABASE_URL = 'postgres://workledger_test:test-password@127.0.0.1/workledger_test';

describe('WorkLedger authentication security profile', () => {
  it('pins every Better Auth option that is stricter than the library default', async () => {
    const config = createRuntimeConfig({
      WORKLEDGER_AUTH_SECRET: TEST_SECRET,
      WORKLEDGER_DATABASE_URL: TEST_DATABASE_URL,
      WORKLEDGER_ENVIRONMENT: 'test',
      WORKLEDGER_ORIGIN: 'https://ledger.example.test',
    });
    if (config.authSecret === undefined || config.databaseUrl === undefined) {
      throw new Error('Expected complete test authentication configuration.');
    }
    const database = createWorkLedgerAuthDatabase({ connectionString: config.databaseUrl });

    try {
      const options = createAuthOptions(
        { ...config, authSecret: config.authSecret, databaseUrl: config.databaseUrl },
        database,
        async () => undefined,
      );

      expect(AUTH_SECURITY_PROFILE).toEqual({
        absoluteSessionSeconds: 43_200,
        authBasePath: '/api/auth',
        cookieCacheEnabled: false,
        freshSessionSeconds: 900,
        idleSessionSeconds: 1_800,
        passwordMaximumLength: 128,
        passwordMinimumLength: 15,
        persistentRememberMe: false,
        resetGrantSeconds: 1_800,
        sessionCookieName: '__Host-workledger.session',
      });
      expect(options.emailAndPassword).toMatchObject({
        autoSignIn: false,
        disableSignUp: true,
        enabled: true,
        maxPasswordLength: 128,
        minPasswordLength: 15,
        resetPasswordTokenExpiresIn: 1_800,
        revokeSessionsOnPasswordReset: true,
      });
      expect(options.session).toMatchObject({
        cookieCache: { enabled: false },
        disableSessionRefresh: true,
        expiresIn: 43_200,
        freshAge: 900,
        updateAge: 1_800,
      });
      expect(options.rateLimit).toMatchObject({ enabled: true });
      expect(options.rateLimit?.customStorage).toMatchObject({
        consume: expect.any(Function),
        get: expect.any(Function),
        set: expect.any(Function),
      });
      expect(options.trustedOrigins).toEqual(['https://ledger.example.test']);
      expect(options.advanced).toMatchObject({
        cookiePrefix: 'workledger',
        disableCSRFCheck: false,
        disableOriginCheck: false,
        useSecureCookies: false,
      });
      expect(options.advanced?.cookies?.['session_token']).toEqual({
        name: '__Host-workledger.session',
        attributes: { httpOnly: true, path: '/', sameSite: 'lax', secure: true },
      });
      expect(options.secondaryStorage).toBeUndefined();
      expect(options.telemetry).toEqual({ enabled: false });
    } finally {
      await database.close();
    }
  });

  it('accepts spaces and Unicode without composition rules and rejects length/common values', () => {
    expect(validateCredentialPassword('Καλημέρα safe passphrase 2026')).toBe(
      'Καλημέρα safe passphrase 2026',
    );
    expect(validateCredentialPassword('  deliberate spaces  ')).toBe('  deliberate spaces  ');
    expect(() => validateCredentialPassword('short')).toThrow(PasswordPolicyError);
    expect(() => validateCredentialPassword('x'.repeat(129))).toThrow(PasswordPolicyError);
    expect(() => validateCredentialPassword('PasswordPassword')).toThrow(
      expect.objectContaining({ reason: 'PASSWORD_COMMON' }),
    );
  });

  it('uses Better Auth memory-hard password hashing and verifies without plaintext storage', async () => {
    const password = 'safe employee passphrase 2026';
    const hash = await hashPassword(password);

    expect(hash).toMatch(/^[a-f0-9]{32}:[a-f0-9]{128}$/);
    expect(hash).not.toContain(password);
    expect(await verifyPassword({ hash, password })).toBe(true);
    expect(await verifyPassword({ hash, password: 'incorrect employee passphrase 2026' })).toBe(
      false,
    );
  });

  it('derives a session-bound CSRF token and compares it without a value-dependent branch', () => {
    const token = createSessionCsrfToken('session-token-one', TEST_SECRET);

    expect(token).not.toContain('session-token-one');
    expect(verifySessionCsrfToken(token, 'session-token-one', TEST_SECRET)).toBe(true);
    expect(verifySessionCsrfToken(token, 'session-token-two', TEST_SECRET)).toBe(false);
    expect(verifySessionCsrfToken(`${token}x`, 'session-token-one', TEST_SECRET)).toBe(false);
  });
});
