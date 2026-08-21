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
import {
  requestSessionError,
  requireRequestCsrf,
  requireRequestSession,
  requireSameOrigin,
} from '../auth/request-session.js';
import type { RuntimeConfig } from '../config.js';
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
  const selfService = createAccountSelfService(database, config.companyIdentity);

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
      const { headers } = await requireRequestSession(request, authentication, 'ACTIVE');
      const token = await authentication.issueCsrfToken(headers);
      if (token === null) throw requestSessionError(request);
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
      const { headers, session } = await requireRequestSession(request, authentication, 'ACTIVE');
      const identity = parseSelfServiceIdentity({
        accountId: session.userId,
        currentSessionId: session.id,
        fresh: session.fresh,
      });
      await requireRequestCsrf(request, authentication, headers);

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
  const { session } = await requireRequestSession(request, authentication, activity);
  return parseSelfServiceIdentity({
    accountId: session.userId,
    currentSessionId: session.id,
    fresh: session.fresh,
  });
}

function requestInstant() {
  return parseRequestInstant(new Date().toISOString());
}
