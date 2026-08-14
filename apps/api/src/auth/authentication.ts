import { betterAuth } from 'better-auth';
import type { BetterAuthOptions } from 'better-auth';
import { createHash } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';

import { createWorkLedgerAuthDatabase, type WorkLedgerAuthDatabase } from '@workledger/database';

import type { RuntimeConfig } from '../config.js';
import {
  PASSWORD_MAXIMUM_LENGTH,
  PASSWORD_MINIMUM_LENGTH,
  PasswordPolicyError,
  validateCredentialPassword,
} from './password-policy.js';
import { createSessionCsrfToken, verifySessionCsrfToken } from './session-csrf.js';

const MINUTE_SECONDS = 60;
const HOUR_SECONDS = 60 * MINUTE_SECONDS;
const IDLE_SECONDS = 30 * MINUTE_SECONDS;
const ABSOLUTE_SECONDS = 12 * HOUR_SECONDS;
const FRESH_SECONDS = 15 * MINUTE_SECONDS;
const RESET_SECONDS = 30 * MINUTE_SECONDS;
const AUTH_BASE_PATH = '/api/auth';
const SESSION_COOKIE_NAME = '__Host-workledger.session';

export const AUTH_SECURITY_PROFILE = Object.freeze({
  absoluteSessionSeconds: ABSOLUTE_SECONDS,
  authBasePath: AUTH_BASE_PATH,
  cookieCacheEnabled: false,
  freshSessionSeconds: FRESH_SECONDS,
  idleSessionSeconds: IDLE_SECONDS,
  passwordMaximumLength: PASSWORD_MAXIMUM_LENGTH,
  passwordMinimumLength: PASSWORD_MINIMUM_LENGTH,
  persistentRememberMe: false,
  resetGrantSeconds: RESET_SECONDS,
  sessionCookieName: SESSION_COOKIE_NAME,
});

export type PasswordResetMessage = Readonly<{
  email: string;
  resetUrl: URL;
}>;

export type PasswordResetSender = (message: PasswordResetMessage) => Promise<void>;

export type SafeAuthSession = Readonly<{
  createdAt: Date;
  expiresAt: Date;
  fresh: boolean;
  id: string;
  userId: string;
}>;

export interface WorkLedgerAuthentication {
  close(): Promise<void>;
  getSession(headers: Headers, activity: 'ACTIVE' | 'PASSIVE'): Promise<SafeAuthSession | null>;
  handler(request: Request): Promise<Response>;
  issueCsrfToken(headers: Headers): Promise<string | null>;
  consumeInvitationRateLimit(
    token: string,
    clientAddress: string,
  ): Promise<Readonly<{ allowed: boolean; retryAfter: number | null }>>;
  hashCredentialPassword(password: string): Promise<string>;
  revokeUserSessions(userId: string): Promise<void>;
  verifyCsrfToken(headers: Headers, candidate: string): Promise<boolean>;
}

export function createWorkLedgerAuthentication(
  config: RuntimeConfig & Readonly<{ authSecret: string; databaseUrl: string }>,
  sendPasswordReset: PasswordResetSender = async () => undefined,
): WorkLedgerAuthentication {
  const authDatabase = createWorkLedgerAuthDatabase({ connectionString: config.databaseUrl });
  const options = createAuthOptions(config, authDatabase, sendPasswordReset);
  const auth = betterAuth(options);

  async function readSession(headers: Headers): Promise<{
    safe: SafeAuthSession;
    token: string;
  } | null> {
    const result = await auth.api.getSession({ headers });
    if (result === null || !(await authDatabase.isUserActive(result.user.id))) return null;
    const now = new Date();
    const createdAt = new Date(result.session.createdAt);
    const expiresAt = new Date(result.session.expiresAt);
    if (
      expiresAt.getTime() <= now.getTime() ||
      createdAt.getTime() + ABSOLUTE_SECONDS * 1_000 <= now.getTime()
    ) {
      return null;
    }

    return {
      safe: Object.freeze({
        createdAt,
        expiresAt,
        fresh: createdAt.getTime() + FRESH_SECONDS * 1_000 > now.getTime(),
        id: result.session.id,
        userId: result.user.id,
      }),
      token: result.session.token,
    };
  }

  return Object.freeze({
    close: () => authDatabase.close(),
    async getSession(headers: Headers, activity: 'ACTIVE' | 'PASSIVE') {
      const session = await readSession(headers);
      if (session === null) return null;
      if (activity === 'ACTIVE' && !(await authDatabase.touchSession(session.token))) return null;
      return session.safe;
    },
    async handler(request: Request) {
      try {
        const response = await auth.handler(
          await prepareAuthRequest(request, config.canonicalOrigin),
        );
        return sanitizeAuthResponse(response);
      } catch (error) {
        if (error instanceof PasswordPolicyError) {
          return Response.json(
            { code: error.code, message: 'The password does not meet the credential policy.' },
            { status: 400 },
          );
        }
        throw error;
      }
    },
    async issueCsrfToken(headers: Headers) {
      const session = await readSession(headers);
      return session === null ? null : createSessionCsrfToken(session.token, config.authSecret);
    },
    async consumeInvitationRateLimit(token: string, clientAddress: string) {
      const tokenHash = createHash('sha256').update(token, 'utf8').digest('hex');
      const clientHash = createHash('sha256').update(clientAddress, 'utf8').digest('hex');
      const client = await authDatabase.consumeRateLimit(`invitation-client:${clientHash}`, {
        max: 10,
        window: 60,
      });
      if (!client.allowed) return client;
      return authDatabase.consumeRateLimit(`invitation-token:${tokenHash}`, { max: 5, window: 60 });
    },
    hashCredentialPassword(password: string) {
      return hashPassword(validateCredentialPassword(password));
    },
    revokeUserSessions: (userId: string) => authDatabase.revokeUserSessions(userId),
    async verifyCsrfToken(headers: Headers, candidate: string) {
      const session = await readSession(headers);
      return (
        session !== null && verifySessionCsrfToken(candidate, session.token, config.authSecret)
      );
    },
  });
}

export function createAuthOptions(
  config: RuntimeConfig & Readonly<{ authSecret: string; databaseUrl: string }>,
  authDatabase: WorkLedgerAuthDatabase,
  sendPasswordReset: PasswordResetSender,
): BetterAuthOptions {
  return {
    advanced: {
      cookiePrefix: 'workledger',
      cookies: {
        session_token: {
          name: SESSION_COOKIE_NAME,
          attributes: { httpOnly: true, path: '/', sameSite: 'lax', secure: true },
        },
      },
      database: { generateId: false },
      defaultCookieAttributes: { httpOnly: true, path: '/', sameSite: 'lax', secure: true },
      disableCSRFCheck: false,
      disableOriginCheck: false,
      useSecureCookies: false,
    },
    appName: 'WorkLedger',
    basePath: AUTH_BASE_PATH,
    baseURL: config.canonicalOrigin,
    database: authDatabase.adapter,
    databaseHooks: {
      session: {
        create: {
          async before(session) {
            if (!(await authDatabase.isUserActive(session.userId))) return false;
            return {
              data: {
                ...session,
                expiresAt: new Date(session.createdAt.getTime() + IDLE_SECONDS * 1_000),
              },
            };
          },
        },
      },
    },
    emailAndPassword: {
      autoSignIn: false,
      disableSignUp: true,
      enabled: true,
      maxPasswordLength: PASSWORD_MAXIMUM_LENGTH,
      minPasswordLength: PASSWORD_MINIMUM_LENGTH,
      resetPasswordTokenExpiresIn: RESET_SECONDS,
      revokeSessionsOnPasswordReset: true,
      async sendResetPassword({ token, user }) {
        const resetUrl = new URL('/reset-password', config.canonicalOrigin);
        resetUrl.searchParams.set('token', token);
        await sendPasswordReset(Object.freeze({ email: user.email, resetUrl }));
      },
    },
    logger: { disabled: true },
    rateLimit: {
      customStorage: {
        consume: (key, rule) => authDatabase.consumeRateLimit(key, rule),
        get: (key) => authDatabase.getRateLimit(key),
        set: (key, value) => authDatabase.setRateLimit(key, value),
      },
      customRules: {
        '/request-password-reset': { max: 3, window: 60 },
        '/reset-password': { max: 5, window: 60 },
        '/sign-in/email': { max: 5, window: 60 },
        '/sign-up/email': { max: 3, window: 60 },
      },
      enabled: config.environment === 'production' || config.environment === 'test',
      max: 100,
      window: 60,
    },
    secret: config.authSecret,
    session: {
      cookieCache: { enabled: false },
      disableSessionRefresh: true,
      expiresIn: ABSOLUTE_SECONDS,
      freshAge: FRESH_SECONDS,
      updateAge: IDLE_SECONDS,
    },
    telemetry: { enabled: false },
    trustedOrigins: [config.canonicalOrigin],
    user: {
      additionalFields: {
        active: {
          defaultValue: true,
          input: false,
          required: true,
          returned: false,
          type: 'boolean',
        },
      },
    },
  };
}

async function prepareAuthRequest(request: Request, canonicalOrigin: string): Promise<Request> {
  const url = new URL(request.url);
  if (request.method !== 'POST') return request;

  const contentType = request.headers.get('content-type');
  if (!contentType?.startsWith('application/json')) return request;

  const body = (await request.json()) as unknown;
  const record = isPlainRecord(body) ? { ...body } : {};

  if (url.pathname.endsWith('/sign-in/email')) record['rememberMe'] = false;
  if (url.pathname.endsWith('/request-password-reset')) {
    record['redirectTo'] = new URL('/reset-password', canonicalOrigin).toString();
  }
  if (
    url.pathname.endsWith('/reset-password') ||
    url.pathname.endsWith('/change-password') ||
    url.pathname.endsWith('/set-password')
  ) {
    validateCredentialPassword(record['newPassword']);
  }

  return new Request(url, {
    body: JSON.stringify(record),
    headers: request.headers,
    method: request.method,
  });
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function sanitizeAuthResponse(response: Response): Promise<Response> {
  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('application/json') || response.body === null) return response;

  const body = sanitizeAuthValue((await response.json()) as unknown);
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return new Response(JSON.stringify(body), {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}

function sanitizeAuthValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeAuthValue);
  if (!isPlainRecord(value)) return value;

  const sanitized: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (['accessToken', 'idToken', 'password', 'refreshToken', 'token'].includes(key)) continue;
    sanitized[key] = sanitizeAuthValue(child);
  }
  return sanitized;
}
