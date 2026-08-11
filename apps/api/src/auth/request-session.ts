import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyRequest } from 'fastify';

import { AUTH_SECURITY_PROFILE, type WorkLedgerAuthentication } from './authentication.js';
import { WorkLedgerApiError } from '../http/errors.js';

export function requestAuthenticationHeaders(request: FastifyRequest): Headers {
  return fromNodeHeaders(request.headers);
}

export async function requireRequestSession(
  request: FastifyRequest,
  authentication: WorkLedgerAuthentication,
  activity: 'ACTIVE' | 'PASSIVE',
) {
  const headers = requestAuthenticationHeaders(request);
  const session = await authentication.getSession(headers, activity);
  if (session === null) throw requestSessionError(request);
  return Object.freeze({ headers, session });
}

export function requestSessionError(request: FastifyRequest): WorkLedgerApiError {
  const cookie = request.headers.cookie;
  const hadSessionCookie =
    typeof cookie === 'string' &&
    cookie
      .split(';')
      .some((part) => part.trim().startsWith(`${AUTH_SECURITY_PROFILE.sessionCookieName}=`));
  return new WorkLedgerApiError({
    code: hadSessionCookie ? 'AUTH_SESSION_EXPIRED' : 'AUTH_REQUIRED',
    statusCode: 401,
  });
}
