import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import {
  apiErrorEnvelopeSchema,
  csrfBootstrapEnvelopeSchema,
  revokeSelfSessionEnvelopeSchema,
  selfContextEnvelopeSchema,
  selfProfileEnvelopeSchema,
} from '@workledger/contracts';
import type { WorkLedgerDatabase } from '@workledger/database';

import { AUTH_SECURITY_PROFILE, type WorkLedgerAuthentication } from '../auth/authentication.js';
import type { RuntimeConfig } from '../config.js';
import { WorkLedgerApiError } from '../http/errors.js';
import {
  createAccountSelfService,
  parseRequestIdentifier,
  parseRequestInstant,
  parseSelfServiceIdentity,
} from './self-service.js';

const sessionParamsSchema = z.strictObject({ sessionId: z.string().min(1).max(128) });
const AUTH_ERROR_RESPONSES = {
  401: apiErrorEnvelopeSchema,
  403: apiErrorEnvelopeSchema,
} as const;

export function registerAccountSelfServiceRoutes(
  app: FastifyInstance,
  config: RuntimeConfig,
  authentication: WorkLedgerAuthentication,
  database: WorkLedgerDatabase,
): void {
  const api = app.withTypeProvider<ZodTypeProvider>();
  const selfService = createAccountSelfService(database);

  api.get(
    '/v1/me/context',
    {
      schema: {
        description:
          'Returns the minimum authenticated account and navigation context for the current actor.',
        operationId: 'getSelfContext',
        response: { 200: selfContextEnvelopeSchema, ...AUTH_ERROR_RESPONSES },
        summary: 'Get current account context',
        tags: ['Account'],
      },
    },
    async (request, reply) => {
      const identity = await requireIdentity(request, authentication, 'ACTIVE');
      const context = await selfService.getContext(identity, requestInstant());
      reply.header('cache-control', 'private, no-store');
      return { data: context, meta: { requestId: request.id } };
    },
  );

  api.get(
    '/v1/me/profile',
    {
      schema: {
        description:
          'Returns a read-only self profile and minimized active-session summaries for the current actor.',
        operationId: 'getSelfProfile',
        response: { 200: selfProfileEnvelopeSchema, ...AUTH_ERROR_RESPONSES },
        summary: 'Get current account profile',
        tags: ['Account'],
      },
    },
    async (request, reply) => {
      const identity = await requireIdentity(request, authentication, 'ACTIVE');
      const profile = await selfService.getProfile(identity, requestInstant());
      reply.header('cache-control', 'private, no-store');
      return { data: profile, meta: { requestId: request.id } };
    },
  );

  api.get(
    '/v1/me/csrf',
    {
      schema: {
        description:
          'Bootstraps the in-memory session-bound CSRF token used by WorkLedger unsafe requests.',
        operationId: 'getSelfCsrfToken',
        response: { 200: csrfBootstrapEnvelopeSchema, ...AUTH_ERROR_RESPONSES },
        summary: 'Get current session CSRF token',
        tags: ['Account'],
      },
    },
    async (request, reply) => {
      const headers = authenticationHeaders(request);
      await requireIdentityFromHeaders(request, headers, authentication, 'ACTIVE');
      const token = await authentication.issueCsrfToken(headers);
      if (token === null) throw sessionError(request);
      reply.header('cache-control', 'private, no-store');
      return { data: { token }, meta: { requestId: request.id } };
    },
  );

  api.post(
    '/v1/me/sessions/:sessionId/revoke',
    {
      schema: {
        description:
          'Revokes one active session owned by the current account after origin, CSRF, and freshness checks.',
        operationId: 'revokeSelfSession',
        params: sessionParamsSchema,
        response: {
          200: revokeSelfSessionEnvelopeSchema,
          ...AUTH_ERROR_RESPONSES,
          422: apiErrorEnvelopeSchema,
        },
        summary: 'Revoke one current-account session',
        tags: ['Account'],
      },
    },
    async (request, reply) => {
      requireSameOrigin(request, config.canonicalOrigin);
      const headers = authenticationHeaders(request);
      const identity = await requireIdentityFromHeaders(request, headers, authentication, 'ACTIVE');
      const csrf = request.headers['x-workledger-csrf'];
      if (typeof csrf !== 'string' || !(await authentication.verifyCsrfToken(headers, csrf))) {
        throw new WorkLedgerApiError({ code: 'AUTH_CSRF_INVALID', statusCode: 403 });
      }

      const result = await selfService.revokeSession(identity, {
        at: requestInstant(),
        requestId: parseRequestIdentifier<'Request'>(request.id),
        sessionId: parseRequestIdentifier<'Session'>(request.params.sessionId),
      });
      reply.header('cache-control', 'private, no-store');
      if (result.revokedCurrentSession) {
        reply.header(
          'set-cookie',
          `${AUTH_SECURITY_PROFILE.sessionCookieName}=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0`,
        );
      }
      return { data: result, meta: { requestId: request.id } };
    },
  );
}

async function requireIdentity(
  request: FastifyRequest,
  authentication: WorkLedgerAuthentication,
  activity: 'ACTIVE' | 'PASSIVE',
) {
  return requireIdentityFromHeaders(
    request,
    authenticationHeaders(request),
    authentication,
    activity,
  );
}

async function requireIdentityFromHeaders(
  request: FastifyRequest,
  headers: Headers,
  authentication: WorkLedgerAuthentication,
  activity: 'ACTIVE' | 'PASSIVE',
) {
  const session = await authentication.getSession(headers, activity);
  if (session === null) throw sessionError(request);
  return parseSelfServiceIdentity({
    accountId: session.userId,
    currentSessionId: session.id,
    fresh: session.fresh,
  });
}

function authenticationHeaders(request: FastifyRequest): Headers {
  return fromNodeHeaders(request.headers);
}

function requestInstant() {
  return parseRequestInstant(new Date().toISOString());
}

function sessionError(request: FastifyRequest): WorkLedgerApiError {
  const cookie = request.headers.cookie;
  const hadSessionCookie =
    typeof cookie === 'string' && cookie.includes(`${AUTH_SECURITY_PROFILE.sessionCookieName}=`);
  return new WorkLedgerApiError({
    code: hadSessionCookie ? 'AUTH_SESSION_EXPIRED' : 'AUTH_REQUIRED',
    statusCode: 401,
  });
}

function requireSameOrigin(request: FastifyRequest, canonicalOrigin: string): void {
  const origin = request.headers.origin;
  if (origin === canonicalOrigin) return;
  if (origin === undefined && typeof request.headers.referer === 'string') {
    try {
      if (new URL(request.headers.referer).origin === canonicalOrigin) return;
    } catch {
      // The safe error below intentionally does not echo the submitted header.
    }
  }
  throw new WorkLedgerApiError({ code: 'AUTH_ORIGIN_INVALID', statusCode: 403 });
}
