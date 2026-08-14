import type {
  ApiErrorCode,
  ApiFieldErrorCode,
  ApiFieldErrors,
  ApiRecoveryContext,
} from '@workledger/contracts';

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
    super(safeApiErrorMessage(input.code));
    this.name = 'WorkLedgerApiError';
    this.code = input.code;
    this.context = input.context;
    this.fields = input.fields;
    this.idempotentReplay = input.idempotentReplay;
    this.statusCode = input.statusCode;
  }
}

export function safeApiErrorMessage(code: ApiErrorCode): string {
  switch (code) {
    case 'ACCOUNT_EMAIL_ALREADY_EXISTS':
      return 'An account already uses that email address.';
    case 'ACCOUNT_STATE_CONFLICT':
      return 'The account is already in the requested state.';
    case 'ASSIGNMENT_EFFECTIVE_DATE_INVALID':
      return 'Choose an effective date that preserves the existing assignment history.';
    case 'ASSIGNMENT_STATE_CONFLICT':
      return 'The assignment changed. Refresh and review the current history.';
    case 'ACCESS_DENIED':
      return 'You do not have permission to perform this action.';
    case 'AUTH_REQUIRED':
      return 'Sign in to continue.';
    case 'AUTH_SESSION_EXPIRED':
      return 'Your session has expired. Sign in again.';
    case 'AUTH_SESSION_NOT_FRESH':
      return 'Confirm your identity before continuing.';
    case 'DATABASE_UNAVAILABLE':
      return 'The service is temporarily unavailable. Try again later.';
    case 'EMPLOYEE_NOT_FOUND':
      return 'The requested employee was not found.';
    case 'EMPLOYEE_NUMBER_ALREADY_EXISTS':
      return 'An employee already uses that employee number.';
    case 'EMPLOYEE_STATE_CONFLICT':
      return 'The employee is already in the requested state.';
    case 'EMPLOYMENT_PERIOD_OVERLAP':
      return 'The employment period overlaps existing history.';
    case 'MALFORMED_REQUEST':
      return 'The request body is not valid JSON.';
    case 'MANAGER_ASSIGNMENT_CYCLE':
      return 'That manager assignment would create a reporting cycle.';
    case 'MANAGER_NOT_ELIGIBLE':
      return 'Choose an active employee with current manager authority.';
    case 'RATE_LIMITED':
      return 'Too many requests. Try again later.';
    case 'REQUEST_TOO_LARGE':
      return 'The request is too large.';
    case 'REPORT_EXPORT_TOO_LARGE':
      return 'The report contains too many rows to export. Narrow the date range or employee scope.';
    case 'ROUTE_NOT_FOUND':
      return 'The requested endpoint was not found.';
    case 'TEAM_NAME_ALREADY_EXISTS':
      return 'A team already uses that name.';
    case 'TEAM_STATE_CONFLICT':
      return 'The team state changed or the team still has current or scheduled assignments.';
    case 'UNSUPPORTED_MEDIA_TYPE':
      return 'Use a supported request content type.';
    case 'VALIDATION_FAILED':
      return 'Correct the highlighted fields and try again.';
    case 'INTERNAL_ERROR':
      return 'The request could not be completed. Try again later.';
    default:
      return 'The request could not be completed.';
  }
}

export const FIELD_ERROR_MESSAGES: Readonly<Record<ApiFieldErrorCode, string>> = Object.freeze({
  INVALID_FORMAT: 'Use the required format.',
  INVALID_TYPE: 'Use the required value type.',
  INVALID_VALUE: 'Choose an allowed value.',
  REQUIRED: 'Enter a value.',
  UNKNOWN_FIELD: 'Remove fields that are not supported.',
  VALUE_TOO_LARGE: 'Use a smaller value.',
  VALUE_TOO_SMALL: 'Use a larger value.',
});
