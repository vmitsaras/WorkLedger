import {
  apiErrorEnvelopeSchema,
  csrfBootstrapEnvelopeSchema,
  revokeSelfSessionEnvelopeSchema,
  selfContextEnvelopeSchema,
  selfProfileEnvelopeSchema,
  todayAttendanceEnvelopeSchema,
  type ApiErrorCode,
  type SelfContext,
  type SelfProfile,
  type TodayAttendance,
} from '@workledger/contracts';

export class ApiClientError extends Error {
  constructor(
    readonly code: ApiErrorCode | 'AUTH_PASSWORD_POLICY_REJECTED' | 'DEPENDENCY_FAILURE',
    readonly status: number,
    readonly requestId?: string,
  ) {
    super(code);
    this.name = 'ApiClientError';
  }
}

let csrfToken: string | null = null;

export async function loadSelfContext(): Promise<SelfContext> {
  const body = await requestJson('/v1/me/context');
  const parsed = selfContextEnvelopeSchema.safeParse(body);
  if (!parsed.success) throw new ApiClientError('DEPENDENCY_FAILURE', 502);
  return parsed.data.data;
}

export async function loadSelfProfile(): Promise<SelfProfile> {
  const body = await requestJson('/v1/me/profile');
  const parsed = selfProfileEnvelopeSchema.safeParse(body);
  if (!parsed.success) throw new ApiClientError('DEPENDENCY_FAILURE', 502);
  return parsed.data.data;
}

export async function loadTodayAttendance(signal?: AbortSignal): Promise<TodayAttendance> {
  const body = await requestJson('/v1/me/attendance/today', signal === undefined ? {} : { signal });
  const parsed = todayAttendanceEnvelopeSchema.safeParse(body);
  if (!parsed.success) throw new ApiClientError('DEPENDENCY_FAILURE', 502);
  return parsed.data.data;
}

export async function signIn(email: string, password: string): Promise<void> {
  const response = await fetch('/api/auth/sign-in/email', {
    body: JSON.stringify({ email, password, rememberMe: false }),
    credentials: 'same-origin',
    headers: jsonHeaders(),
    method: 'POST',
  });
  if (response.ok) return;
  throw new ApiClientError(
    response.status === 429 ? 'RATE_LIMITED' : 'AUTH_INVALID_CREDENTIALS',
    response.status,
  );
}

export async function requestPasswordReset(email: string): Promise<void> {
  const response = await fetch('/api/auth/request-password-reset', {
    body: JSON.stringify({ email }),
    credentials: 'same-origin',
    headers: jsonHeaders(),
    method: 'POST',
  });
  if (response.ok) return;
  throw new ApiClientError(
    response.status === 429 ? 'RATE_LIMITED' : 'DEPENDENCY_FAILURE',
    response.status,
  );
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const response = await fetch('/api/auth/reset-password', {
    body: JSON.stringify({ newPassword, token }),
    credentials: 'same-origin',
    headers: jsonHeaders(),
    method: 'POST',
  });
  if (response.ok) return;
  const body = await safeJson(response);
  if (isErrorCodeRecord(body) && body.code === 'PASSWORD_POLICY_REJECTED') {
    throw new ApiClientError('AUTH_PASSWORD_POLICY_REJECTED', response.status);
  }
  throw new ApiClientError(
    response.status === 429 ? 'RATE_LIMITED' : 'AUTH_RESET_INVALID_OR_EXPIRED',
    response.status,
  );
}

export async function signOut(): Promise<void> {
  const response = await fetch('/api/auth/sign-out', {
    body: '{}',
    credentials: 'same-origin',
    headers: jsonHeaders(),
    method: 'POST',
  });
  if (!response.ok) throw new ApiClientError('DEPENDENCY_FAILURE', response.status);
}

export async function revokeSelfSession(sessionId: string) {
  const token = await getCsrfToken();
  const body = await requestJson(`/v1/me/sessions/${encodeURIComponent(sessionId)}/revoke`, {
    headers: { 'x-workledger-csrf': token },
    method: 'POST',
  });
  const parsed = revokeSelfSessionEnvelopeSchema.safeParse(body);
  if (!parsed.success) throw new ApiClientError('DEPENDENCY_FAILURE', 502);
  return parsed.data.data;
}

export function clearSessionMemory(): void {
  csrfToken = null;
}

async function getCsrfToken(): Promise<string> {
  if (csrfToken !== null) return csrfToken;
  const body = await requestJson('/v1/me/csrf');
  const parsed = csrfBootstrapEnvelopeSchema.safeParse(body);
  if (!parsed.success) throw new ApiClientError('DEPENDENCY_FAILURE', 502);
  csrfToken = parsed.data.data.token;
  return csrfToken;
}

async function requestJson(path: string, init: RequestInit = {}): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      credentials: 'same-origin',
      headers: { accept: 'application/json', ...init.headers },
    });
  } catch {
    throw new ApiClientError('DEPENDENCY_FAILURE', 0);
  }
  const body = await safeJson(response);
  if (response.ok) return body;

  const parsedError = apiErrorEnvelopeSchema.safeParse(body);
  throw new ApiClientError(
    parsedError.success ? parsedError.data.error.code : 'DEPENDENCY_FAILURE',
    response.status,
    parsedError.success ? parsedError.data.error.requestId : undefined,
  );
}

function jsonHeaders(): HeadersInit {
  return { accept: 'application/json', 'content-type': 'application/json' };
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

function isErrorCodeRecord(value: unknown): value is Readonly<{ code: string }> {
  return (
    typeof value === 'object' && value !== null && 'code' in value && typeof value.code === 'string'
  );
}
