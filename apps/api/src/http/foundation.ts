import { randomUUID } from 'node:crypto';

import fastifySwagger from '@fastify/swagger';
import {
  apiErrorEnvelopeSchema,
  type ApiErrorCode,
  type ApiFieldErrorCode,
  type ApiFieldErrors,
} from '@workledger/contracts';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  createJsonSchemaTransform,
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError,
  jsonSchemaTransformObject,
  serializerCompiler,
  type ZodFastifySchemaValidationError,
  validatorCompiler,
} from 'fastify-type-provider-zod';

import { FIELD_ERROR_MESSAGES, safeApiErrorMessage, WorkLedgerApiError } from './errors.js';

const PATH_SEGMENT_PATTERN = /^(?:[A-Za-z][A-Za-z0-9_]{0,63}|\d{1,6})$/u;

export const WORKLEDGER_OPENAPI_VERSION = '1.0.0' as const;

export function createRequestId(): string {
  return randomUUID();
}

export function registerHttpFoundation(app: FastifyInstance): void {
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.register(fastifySwagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'WorkLedger API',
        version: WORKLEDGER_OPENAPI_VERSION,
      },
    },
    transform: createJsonSchemaTransform({
      zodToJsonConfig: { target: 'draft-2020-12' },
    }),
    transformObject: jsonSchemaTransformObject,
  });

  app.addHook('onRequest', async (request, reply) => {
    reply.header('x-request-id', request.id);
  });

  app.setNotFoundHandler(async (request, reply) => {
    return sendError(reply, request, 404, 'ROUTE_NOT_FOUND');
  });

  app.setErrorHandler(async (error, request, reply) => {
    reply.header('cache-control', 'private, no-store');

    if (hasZodFastifySchemaValidationErrors(error)) {
      const idempotencyHeaderCode = attendanceIdempotencyHeaderError(error.validation);
      if (idempotencyHeaderCode !== null) {
        return sendError(reply, request, 422, idempotencyHeaderCode);
      }
      return sendError(reply, request, 422, 'VALIDATION_FAILED', {
        fields: mapValidationFields(error.validation),
      });
    }

    if (error instanceof WorkLedgerApiError) {
      return sendError(reply, request, error.statusCode, error.code, {
        ...(error.context === undefined ? {} : { context: error.context }),
        ...(error.fields === undefined ? {} : { fields: error.fields }),
        ...(error.idempotentReplay === undefined
          ? {}
          : { idempotentReplay: error.idempotentReplay }),
      });
    }

    const errorCode = fastifyErrorCode(error);
    if (errorCode === 'FST_ERR_CTP_INVALID_JSON_BODY') {
      return sendError(reply, request, 400, 'MALFORMED_REQUEST');
    }
    if (errorCode === 'FST_ERR_CTP_BODY_TOO_LARGE') {
      return sendError(reply, request, 413, 'REQUEST_TOO_LARGE');
    }
    if (errorCode === 'FST_ERR_CTP_INVALID_MEDIA_TYPE') {
      return sendError(reply, request, 415, 'UNSUPPORTED_MEDIA_TYPE');
    }
    if (isResponseSerializationError(error)) {
      return sendError(reply, request, 500, 'INTERNAL_ERROR');
    }
    return sendError(reply, request, 500, 'INTERNAL_ERROR');
  });
}

function sendError(
  reply: FastifyReply,
  request: FastifyRequest,
  statusCode: number,
  code: ApiErrorCode,
  options: Readonly<{
    context?: WorkLedgerApiError['context'];
    fields?: ApiFieldErrors;
    idempotentReplay?: boolean;
  }> = {},
) {
  reply.header('cache-control', 'private, no-store');
  const envelope = {
    error: {
      code,
      ...(options.context === undefined ? {} : { context: options.context }),
      ...(options.fields === undefined ? {} : { fields: options.fields }),
      message: safeApiErrorMessage(code),
      requestId: request.id,
    },
    ...(options.idempotentReplay === undefined
      ? {}
      : { meta: { idempotentReplay: options.idempotentReplay } }),
  };
  const parsedEnvelope = apiErrorEnvelopeSchema.safeParse(envelope);
  if (parsedEnvelope.success) return reply.status(statusCode).send(parsedEnvelope.data);

  const fallbackEnvelope = {
    error: {
      code: 'INTERNAL_ERROR',
      message: safeApiErrorMessage('INTERNAL_ERROR'),
      requestId: request.id,
    },
  } as const;
  return reply.status(500).send(fallbackEnvelope);
}

function attendanceIdempotencyHeaderError(
  issues: readonly ZodFastifySchemaValidationError[],
): 'IDEMPOTENCY_KEY_INVALID' | 'IDEMPOTENCY_KEY_REQUIRED' | null {
  const issue = issues.find(({ instancePath }) => instancePath === '/idempotency-key');
  if (issue === undefined) return null;
  return issue.keyword === 'invalid_type' && issue.message?.includes('undefined') === true
    ? 'IDEMPOTENCY_KEY_REQUIRED'
    : 'IDEMPOTENCY_KEY_INVALID';
}

function mapValidationFields(issues: readonly ZodFastifySchemaValidationError[]): ApiFieldErrors {
  const fields: Record<string, Array<{ code: ApiFieldErrorCode; message: string }>> = {};

  for (const issue of issues) {
    const code = fieldCodeForIssue(issue);
    const path = code === 'UNKNOWN_FIELD' ? '$' : safeFieldPath(issue.instancePath);
    const item = { code, message: FIELD_ERROR_MESSAGES[code] };
    const current = fields[path] ?? [];
    if (!current.some((candidate) => candidate.code === item.code)) current.push(item);
    fields[path] = current;
  }

  return fields;
}

function fieldCodeForIssue(issue: ZodFastifySchemaValidationError): ApiFieldErrorCode {
  switch (issue.keyword) {
    case 'invalid_format':
      return 'INVALID_FORMAT';
    case 'invalid_type':
      return issue.message?.includes('undefined') === true ? 'REQUIRED' : 'INVALID_TYPE';
    case 'too_big':
      return 'VALUE_TOO_LARGE';
    case 'too_small':
      return 'VALUE_TOO_SMALL';
    case 'unrecognized_keys':
      return 'UNKNOWN_FIELD';
    default:
      return 'INVALID_VALUE';
  }
}

function fastifyErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) return undefined;
  return typeof error.code === 'string' ? error.code : undefined;
}

function safeFieldPath(instancePath: string): string {
  const segments = instancePath
    .split('/')
    .slice(1)
    .map((segment) => segment.replaceAll('~1', '/').replaceAll('~0', '~'));
  if (segments.length === 0 || segments.some((segment) => !PATH_SEGMENT_PATTERN.test(segment))) {
    return '$';
  }
  return segments.join('.');
}
