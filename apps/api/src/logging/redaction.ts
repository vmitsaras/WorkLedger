/**
 * Redaction utilities for structured logging and diagnostics.
 *
 * All logs, error messages, and technical diagnostics must redact:
 * - Authentication secrets (passwords, tokens, session IDs, CSRF tokens, reset/invitation grants)
 * - Sensitive HR data (sickness, notes, reasons, entitlement values)
 * - Query parameters and request bodies
 * - Database statements with bound values
 * - Environment variables and configuration secrets
 * - Hostile text that could inject newlines or escape sequences
 *
 * See docs/06-security-operations.md section 12.
 */

const REDACTED_PLACEHOLDER = '[REDACTED]';

const SENSITIVE_HEADER_NAMES = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-csrf-token',
  'idempotency-key',
]);

const SENSITIVE_QUERY_PARAMS = new Set([
  'token',
  'grant',
  'reset',
  'invitation',
  'password',
  'secret',
]);

const SENSITIVE_FIELD_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /key/i,
  /grant/i,
  /csrf/i,
  /session/i,
  /auth/i,
  /credential/i,
];

/**
 * Redacts sensitive headers from an object of HTTP headers.
 */
export function redactHeaders(
  headers: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!headers) return {};

  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_HEADER_NAMES.has(lowerKey)) {
      safe[key] = REDACTED_PLACEHOLDER;
    } else {
      safe[key] = value;
    }
  }
  return safe;
}

/**
 * Redacts sensitive query parameters from a URL or query object.
 */
export function redactQueryParams(
  query: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!query) return {};

  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(query)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_QUERY_PARAMS.has(lowerKey)) {
      safe[key] = REDACTED_PLACEHOLDER;
    } else {
      safe[key] = value;
    }
  }
  return safe;
}

/**
 * Redacts fields from an object that match sensitive patterns.
 * Used for redacting request bodies, responses, and error contexts.
 */
export function redactSensitiveFields(
  obj: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!obj) return {};

  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Always recurse into objects to redact nested sensitive fields
      safe[key] = redactSensitiveFields(value as Record<string, unknown>);
    } else if (isSensitiveField(key)) {
      // Redact leaf values with sensitive field names
      safe[key] = REDACTED_PLACEHOLDER;
    } else {
      safe[key] = value;
    }
  }
  return safe;
}

function isSensitiveField(fieldName: string): boolean {
  return SENSITIVE_FIELD_PATTERNS.some((pattern) => pattern.test(fieldName));
}

/**
 * Sanitizes text to prevent log injection attacks.
 * Removes control characters and truncates excessive length.
 */
export function sanitizeLogText(text: string | undefined, maxLength: number = 1000): string {
  if (!text) return '';

  const cleaned = text
    .slice(0, maxLength)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/gu, '')
    .replace(/[\r\n]+/gu, ' ');

  if (text.length > maxLength) {
    return `${cleaned}... [truncated]`;
  }
  return cleaned;
}

/**
 * Creates a safe error object for logging.
 * Excludes stack traces, sensitive context, and raw SQL.
 */
export function redactError(error: unknown): {
  message: string;
  code?: string | undefined;
  type?: string | undefined;
} {
  if (error instanceof Error) {
    const code = 'code' in error && typeof error.code === 'string' ? error.code : undefined;
    return {
      message: sanitizeLogText(error.message, 500),
      code,
      type: error.constructor.name,
    };
  }

  if (typeof error === 'string') {
    return {
      message: sanitizeLogText(error, 500),
      code: undefined,
      type: undefined,
    };
  }

  return {
    message: 'Unknown error',
    code: undefined,
    type: typeof error,
  };
}

/**
 * Extracts a safe route template from a request path.
 * Replaces dynamic segments with placeholders to prevent unbounded cardinality.
 */
export function safeRouteTemplate(path: string): string {
  return path
    .replace(
      /\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/gu,
      '/:uuid',
    )
    .replace(/\/\d+/gu, '/:id');
}

/**
 * Creates a safe request summary for logging.
 */
export function createSafeRequestSummary(request: { method: string; url: string; id: string }): {
  method: string;
  route: string;
  requestId: string;
} {
  const url = new URL(request.url, 'http://localhost');
  return {
    method: request.method,
    route: safeRouteTemplate(url.pathname),
    requestId: request.id,
  };
}
