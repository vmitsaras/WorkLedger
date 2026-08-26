import type { ApiErrorCode, ApiFieldErrors, ApiRecoveryContext } from '@workledger/contracts';

export const API_ERROR_STATUS_CODES = [400, 401, 403, 404, 409, 413, 415, 422, 429, 503] as const;

export type ApiErrorStatusCode = (typeof API_ERROR_STATUS_CODES)[number];

export class WorkLedgerApiError extends Error {
  readonly code: ApiErrorCode;
  readonly context: ApiRecoveryContext | undefined;
  readonly fields: ApiFieldErrors | undefined;
  readonly idempotentReplay: boolean | undefined;
  readonly statusCode: ApiErrorStatusCode;

  constructor(
    input: Readonly<{
      code: ApiErrorCode;
      context?: ApiRecoveryContext;
      fields?: ApiFieldErrors;
      idempotentReplay?: boolean;
      statusCode: ApiErrorStatusCode;
    }>,
  ) {
    super(input.code);
    this.name = 'WorkLedgerApiError';
    this.code = input.code;
    this.context = input.context;
    this.fields = input.fields;
    this.idempotentReplay = input.idempotentReplay;
    this.statusCode = input.statusCode;
  }
}
