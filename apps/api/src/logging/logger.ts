/**
 * Structured logging for WorkLedger API.
 *
 * Uses allowlisted structured fields with automatic redaction of sensitive data.
 * Never logs raw request URLs, bodies, responses, cookies, secrets, passwords,
 * session/reset/CSRF/idempotency values, notes, reasons, sickness data, or
 * database statements with bound values.
 *
 * See docs/06-security-operations.md section 12.
 */

import type { FastifyReply, FastifyRequest } from 'fastify';
import pino from 'pino';
import { createSafeRequestSummary, redactError } from './redaction.js';

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface WorkLedgerLogger {
  child(bindings: Record<string, unknown>): WorkLedgerLogger;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, error?: unknown, data?: Record<string, unknown>): void;
  fatal(message: string, error?: unknown, data?: Record<string, unknown>): void;
  debug(message: string, data?: Record<string, unknown>): void;
  logRequest(request: FastifyRequest, reply: FastifyReply, latencyMs: number): void;
  logDependencyCall(
    dependency: string,
    operation: string,
    latencyMs: number,
    success: boolean,
    error?: unknown,
  ): void;
}

const ALLOWLISTED_LOG_FIELDS = new Set([
  'service',
  'version',
  'environment',
  'timestamp',
  'level',
  'message',
  'requestId',
  'method',
  'route',
  'statusCode',
  'latencyMs',
  'dependency',
  'operation',
  'success',
  'error',
  'errorCode',
  'errorType',
  'actorId',
]);

export function createWorkLedgerLogger(options: {
  environment: string;
  service: string;
  version: string;
  level?: LogLevel;
}): WorkLedgerLogger {
  const isDevelopment = options.environment === 'development';

  const pinoLogger = pino({
    level: options.level ?? (isDevelopment ? 'debug' : 'info'),
    base: {
      service: options.service,
      version: options.version,
      environment: options.environment,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level(label) {
        return { level: label };
      },
      bindings() {
        return {};
      },
    },
    redact: {
      paths: [
        'req',
        'res',
        'err.stack',
        'error.stack',
        '*.password',
        '*.secret',
        '*.token',
        '*.key',
        '*.grant',
        '*.credential',
      ],
      remove: true,
    },
    serializers: {
      err: (err: Error) => redactError(err),
      error: (err: unknown) => redactError(err),
    },
    ...(isDevelopment
      ? {
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
            },
          },
        }
      : {}),
  });

  return createLogger(pinoLogger);
}

function createLogger(pinoLogger: pino.Logger): WorkLedgerLogger {
  const log = (level: pino.Level, message: string, data?: Record<string, unknown>) => {
    const allowlistedData = filterAllowlistedFields(data ?? {});
    pinoLogger[level](allowlistedData, message);
  };

  return {
    child(bindings: Record<string, unknown>): WorkLedgerLogger {
      const allowlistedBindings = filterAllowlistedFields(bindings);
      return createLogger(pinoLogger.child(allowlistedBindings));
    },

    info(message: string, data?: Record<string, unknown>) {
      log('info', message, data);
    },

    warn(message: string, data?: Record<string, unknown>) {
      log('warn', message, data);
    },

    error(message: string, error?: unknown, data?: Record<string, unknown>) {
      const errorData = error ? { error: redactError(error), ...data } : data;
      log('error', message, errorData);
    },

    fatal(message: string, error?: unknown, data?: Record<string, unknown>) {
      const errorData = error ? { error: redactError(error), ...data } : data;
      log('fatal', message, errorData);
    },

    debug(message: string, data?: Record<string, unknown>) {
      log('debug', message, data);
    },

    logRequest(request: FastifyRequest, reply: FastifyReply, latencyMs: number) {
      const summary = createSafeRequestSummary({
        method: request.method,
        url: request.url,
        id: request.id,
      });

      const statusCode = reply.statusCode;
      const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

      log(level, 'Request completed', {
        ...summary,
        statusCode,
        latencyMs: Math.round(latencyMs),
      });
    },

    logDependencyCall(
      dependency: string,
      operation: string,
      latencyMs: number,
      success: boolean,
      error?: unknown,
    ) {
      const level = success ? 'info' : 'error';
      const errorData = error ? { error: redactError(error) } : {};

      log(level, `Dependency call: ${dependency}.${operation}`, {
        dependency,
        operation,
        latencyMs: Math.round(latencyMs),
        success,
        ...errorData,
      });
    },
  };
}

function filterAllowlistedFields(data: Record<string, unknown>): Record<string, unknown> {
  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (ALLOWLISTED_LOG_FIELDS.has(key)) {
      filtered[key] = value;
    }
  }
  return filtered;
}
