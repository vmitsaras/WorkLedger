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

export function requireSameOrigin(request: FastifyRequest, canonicalOrigin: string): void {
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

export async function requireRequestCsrf(
  request: FastifyRequest,
  authentication: WorkLedgerAuthentication,
  authenticationHeaders: Headers,
): Promise<void> {
  const csrf = request.headers['x-workledger-csrf'];
  if (
    typeof csrf !== 'string' ||
    !(await authentication.verifyCsrfToken(authenticationHeaders, csrf))
  ) {
    throw new WorkLedgerApiError({ code: 'AUTH_CSRF_INVALID', statusCode: 403 });
  }
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
