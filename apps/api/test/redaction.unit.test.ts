/**
 * Tests for redaction utilities.
 */

import { describe, expect, it } from 'vitest';
import {
  redactHeaders,
  redactQueryParams,
  redactSensitiveFields,
  sanitizeLogText,
  redactError,
  safeRouteTemplate,
  createSafeRequestSummary,
} from '../src/logging/redaction.js';

describe('redactHeaders', () => {
  it('redacts sensitive headers', () => {
    const headers = {
      'content-type': 'application/json',
      authorization: 'Bearer secret-token',
      cookie: 'session=abc123',
      'x-csrf-token': 'csrf-value',
      'user-agent': 'test',
    };

    const redacted = redactHeaders(headers);

    expect(redacted['content-type']).toBe('application/json');
    expect(redacted['user-agent']).toBe('test');
    expect(redacted['authorization']).toBe('[REDACTED]');
    expect(redacted['cookie']).toBe('[REDACTED]');
    expect(redacted['x-csrf-token']).toBe('[REDACTED]');
  });

  it('handles case-insensitive header names', () => {
    const headers = {
      Authorization: 'Bearer token',
      COOKIE: 'value',
    };

    const redacted = redactHeaders(headers);

    expect(redacted['Authorization']).toBe('[REDACTED]');
    expect(redacted['COOKIE']).toBe('[REDACTED]');
  });

  it('returns empty object for undefined headers', () => {
    expect(redactHeaders(undefined)).toEqual({});
  });
});

describe('redactQueryParams', () => {
  it('redacts sensitive query parameters', () => {
    const query = {
      page: '1',
      limit: '20',
      token: 'reset-token',
      grant: 'invitation-grant',
      password: 'secret',
    };

    const redacted = redactQueryParams(query);

    expect(redacted['page']).toBe('1');
    expect(redacted['limit']).toBe('20');
    expect(redacted['token']).toBe('[REDACTED]');
    expect(redacted['grant']).toBe('[REDACTED]');
    expect(redacted['password']).toBe('[REDACTED]');
  });

  it('returns empty object for undefined query', () => {
    expect(redactQueryParams(undefined)).toEqual({});
  });
});

describe('redactSensitiveFields', () => {
  it('redacts fields matching sensitive patterns', () => {
    const obj = {
      name: 'Alice',
      email: 'alice@example.com',
      password: 'secret123',
      authToken: 'token-value',
      apiKey: 'key-value',
      csrfToken: 'csrf-value',
    };

    const redacted = redactSensitiveFields(obj);

    expect(redacted['name']).toBe('Alice');
    expect(redacted['email']).toBe('alice@example.com');
    expect(redacted['password']).toBe('[REDACTED]');
    expect(redacted['authToken']).toBe('[REDACTED]');
    expect(redacted['apiKey']).toBe('[REDACTED]');
    expect(redacted['csrfToken']).toBe('[REDACTED]');
  });

  it('recursively redacts nested objects', () => {
    const obj = {
      user: {
        name: 'Alice',
        credentials: {
          password: 'secret',
          apiKey: 'key',
        },
      },
      metadata: {
        timestamp: '2024-01-01',
      },
    };

    const redacted = redactSensitiveFields(obj);

    expect(redacted).toMatchObject({
      user: {
        name: 'Alice',
        credentials: {
          password: '[REDACTED]',
          apiKey: '[REDACTED]',
        },
      },
      metadata: {
        timestamp: '2024-01-01',
      },
    });
  });

  it('returns empty object for undefined input', () => {
    expect(redactSensitiveFields(undefined)).toEqual({});
  });
});

describe('sanitizeLogText', () => {
  it('removes control characters', () => {
    const text = 'Hello\x00World\x1FTest';
    const sanitized = sanitizeLogText(text);
    expect(sanitized).toBe('HelloWorldTest');
  });

  it('replaces newlines with spaces', () => {
    const text = 'Line1\nLine2\rLine3\r\nLine4';
    const sanitized = sanitizeLogText(text);
    expect(sanitized).toBe('Line1 Line2 Line3 Line4');
  });

  it('truncates excessive length', () => {
    const text = 'a'.repeat(2000);
    const sanitized = sanitizeLogText(text, 100);
    expect(sanitized.length).toBeLessThanOrEqual(120);
    expect(sanitized).toContain('... [truncated]');
  });

  it('returns empty string for undefined input', () => {
    expect(sanitizeLogText(undefined)).toBe('');
  });
});

describe('redactError', () => {
  it('extracts safe error information from Error', () => {
    const error = new Error('Database connection failed');
    (error as Error & { code?: string }).code = 'ECONNREFUSED';

    const redacted = redactError(error);

    expect(redacted.message).toBe('Database connection failed');
    expect(redacted.code).toBe('ECONNREFUSED');
    expect(redacted.type).toBe('Error');
  });

  it('handles custom error types', () => {
    class CustomError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'CustomError';
      }
    }

    const error = new CustomError('Custom error occurred');
    const redacted = redactError(error);

    expect(redacted.message).toBe('Custom error occurred');
    expect(redacted.type).toBe('CustomError');
  });

  it('handles string errors', () => {
    const error = 'Simple error string';
    const redacted = redactError(error);

    expect(redacted.message).toBe('Simple error string');
    expect(redacted.type).toBeUndefined();
  });

  it('handles unknown error types', () => {
    const error = { unknown: 'object' };
    const redacted = redactError(error);

    expect(redacted.message).toBe('Unknown error');
    expect(redacted.type).toBe('object');
  });

  it('truncates long error messages', () => {
    const error = new Error('x'.repeat(1000));
    const redacted = redactError(error);

    expect(redacted.message.length).toBeLessThanOrEqual(520);
  });
});

describe('safeRouteTemplate', () => {
  it('replaces numeric IDs with placeholders', () => {
    expect(safeRouteTemplate('/v1/employees/12345')).toBe('/v1/employees/:id');
    expect(safeRouteTemplate('/v1/reports/987/details')).toBe('/v1/reports/:id/details');
  });

  it('replaces UUIDs with placeholders', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    expect(safeRouteTemplate(`/v1/sessions/${uuid}`)).toBe('/v1/sessions/:uuid');
  });

  it('handles routes without dynamic segments', () => {
    expect(safeRouteTemplate('/v1/health')).toBe('/v1/health');
    expect(safeRouteTemplate('/v1/system/operations')).toBe('/v1/system/operations');
  });
});

describe('createSafeRequestSummary', () => {
  it('creates safe request summary', () => {
    const request = {
      method: 'POST',
      url: 'http://localhost:3000/v1/employees/123/attendance?token=secret',
      id: 'req-123',
    };

    const summary = createSafeRequestSummary(request);

    expect(summary.method).toBe('POST');
    expect(summary.route).toBe('/v1/employees/:id/attendance');
    expect(summary.requestId).toBe('req-123');
  });

  it('handles root path', () => {
    const request = {
      method: 'GET',
      url: 'http://localhost:3000/',
      id: 'req-456',
    };

    const summary = createSafeRequestSummary(request);

    expect(summary.route).toBe('/');
  });
});
