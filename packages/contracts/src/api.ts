import { z } from 'zod';

export const API_ERROR_CODES = [
  'ABSENCE_ALREADY_DECIDED',
  'ABSENCE_AMBIGUOUS_LOCAL_TIME',
  'ABSENCE_CANNOT_CANCEL',
  'ABSENCE_COVERAGE_INVALID',
  'ABSENCE_DURATION_NOT_ALLOWED',
  'ABSENCE_INSUFFICIENT_BALANCE',
  'ABSENCE_NONEXISTENT_LOCAL_TIME',
  'ABSENCE_OVERLAP',
  'ABSENCE_OVERRIDE_REASON_REQUIRED',
  'ABSENCE_POLICY_INACTIVE',
  'ABSENCE_REPORT_CANNOT_REJECT',
  'ABSENCE_REQUEST_NOTE_NOT_ALLOWED',
  'ABSENCE_RETROACTIVE_LIMIT',
  'ABSENCE_STATE_CHANGED',
  'ACCESS_DENIED',
  'APPROVAL_OUT_OF_SCOPE',
  'APPROVAL_REASON_REQUIRED',
  'APPROVAL_SELF_NOT_ALLOWED',
  'APPROVAL_STATE_CONFLICT',
  'ATTENDANCE_ALREADY_OFF_WORK',
  'ATTENDANCE_ALREADY_ON_BREAK',
  'ATTENDANCE_ALREADY_WORKING',
  'ATTENDANCE_AMBIGUOUS_LOCAL_TIME',
  'ATTENDANCE_BREAK_CONFIRMATION_REQUIRED',
  'ATTENDANCE_FUTURE_EVENT',
  'ATTENDANCE_INCOMPLETE',
  'ATTENDANCE_INVALID_EVENT_ORDER',
  'ATTENDANCE_INVALID_EVENT_PRECISION',
  'ATTENDANCE_NONEXISTENT_LOCAL_TIME',
  'ATTENDANCE_NOT_ON_BREAK',
  'ATTENDANCE_NOT_WORKING',
  'ATTENDANCE_OVERLAP',
  'ATTENDANCE_STATE_CHANGED',
  'AUTH_CSRF_INVALID',
  'AUTH_INVALID_CREDENTIALS',
  'AUTH_INVITATION_INVALID_OR_EXPIRED',
  'AUTH_ORIGIN_INVALID',
  'AUTH_REQUIRED',
  'AUTH_RESET_INVALID_OR_EXPIRED',
  'AUTH_SESSION_EXPIRED',
  'AUTH_SESSION_NOT_FRESH',
  'ACCOUNT_EMAIL_ALREADY_EXISTS',
  'ACCOUNT_STATE_CONFLICT',
  'ASSIGNMENT_EFFECTIVE_DATE_INVALID',
  'ASSIGNMENT_STATE_CONFLICT',
  'CORRECTION_UNRESOLVED',
  'DATABASE_UNAVAILABLE',
  'EMPLOYEE_NOT_FOUND',
  'EMPLOYEE_NUMBER_ALREADY_EXISTS',
  'EMPLOYEE_STATE_CONFLICT',
  'EMPLOYMENT_PERIOD_OVERLAP',
  'IDEMPOTENCY_KEY_CONFLICT',
  'IDEMPOTENCY_KEY_INVALID',
  'IDEMPOTENCY_KEY_REQUIRED',
  'INTERNAL_ERROR',
  'LEDGER_SOURCE_MISMATCH',
  'LEAVE_ENTITLEMENT_LEDGER_DUPLICATE_ENTRY',
  'LEAVE_ENTITLEMENT_LEDGER_DUPLICATE_SOURCE',
  'LEAVE_ENTITLEMENT_LEDGER_ENTRY_INVALID',
  'LEAVE_ENTITLEMENT_LEDGER_SCOPE_MISMATCH',
  'LEAVE_ENTITLEMENT_LEDGER_TOTAL_INVALID',
  'MALFORMED_REQUEST',
  'MANAGER_ASSIGNMENT_CYCLE',
  'MANAGER_NOT_ELIGIBLE',
  'ORGANIZATION_TIMEZONE_LOCKED',
  'PERIOD_ADJUSTMENT_REQUIRED',
  'PERIOD_ALREADY_SUBMITTED',
  'PERIOD_LEDGER_MISMATCH',
  'PERIOD_LOCKED',
  'PERIOD_NOT_READY',
  'PERIOD_REOPEN_REQUIRED',
  'PERIOD_SOURCE_CHANGED',
  'PERIOD_STATE_CONFLICT',
  'PERIOD_VERSION_CONFLICT',
  'PERIOD_WARNING_ACKNOWLEDGEMENT_REQUIRED',
  'POLICY_ASSIGNMENT_OVERLAP',
  'POLICY_CONFIGURATION_INVALID',
  'POLICY_NOT_ASSIGNED',
  'RATE_LIMITED',
  'RECORD_VERSION_CONFLICT',
  'REPORT_EXPORT_TOO_LARGE',
  'REQUEST_TOO_LARGE',
  'ROUTE_NOT_FOUND',
  'SCHEDULE_ASSIGNMENT_OVERLAP',
  'SCHEDULE_NOT_ASSIGNED',
  'SCHEDULE_VERSION_CONFLICT',
  'SCHEDULE_VERSION_NO_CHANGE',
  'POLICY_VERSION_CONFLICT',
  'POLICY_VERSION_NO_CHANGE',
  'TEAM_NAME_ALREADY_EXISTS',
  'TEAM_STATE_CONFLICT',
  'TIME_ACCOUNT_LEDGER_DUPLICATE_ENTRY',
  'TIME_ACCOUNT_LEDGER_DUPLICATE_SOURCE',
  'TIME_ACCOUNT_LEDGER_SCOPE_MISMATCH',
  'TIME_ACCOUNT_LEDGER_TOTAL_INVALID',
  'UNSUPPORTED_MEDIA_TYPE',
  'VALIDATION_FAILED',
] as const;

export const API_FIELD_ERROR_CODES = [
  'INVALID_FORMAT',
  'INVALID_TYPE',
  'INVALID_VALUE',
  'REQUIRED',
  'UNKNOWN_FIELD',
  'VALUE_TOO_LARGE',
  'VALUE_TOO_SMALL',
] as const;

export const apiErrorCodeSchema = z.enum(API_ERROR_CODES);
export const apiFieldErrorCodeSchema = z.enum(API_FIELD_ERROR_CODES);
export const requestIdSchema = z.uuid();

const safeMessageSchema = z.string().min(1).max(256);
const fieldPathSchema = z.string().min(1).max(256);
const recoveryContextKeySchema = z.string().regex(/^[A-Za-z][A-Za-z0-9]{0,63}$/u);
const recoveryContextScalarSchema = z.union([
  z.string().max(256),
  z.number().safe().finite(),
  z.boolean(),
  z.null(),
]);
const recoveryContextValueSchema = z.union([
  recoveryContextScalarSchema,
  z.array(recoveryContextScalarSchema).max(50),
]);

export const apiFieldErrorSchema = z.strictObject({
  code: apiFieldErrorCodeSchema,
  message: safeMessageSchema,
});

export const apiFieldErrorsSchema = z.record(
  fieldPathSchema,
  z.array(apiFieldErrorSchema).min(1).max(10),
);

export const apiRecoveryContextSchema = z
  .record(recoveryContextKeySchema, recoveryContextValueSchema)
  .refine((value) => Object.keys(value).length <= 20, 'Too many recovery-context fields.');

export const apiErrorSchema = z.strictObject({
  code: apiErrorCodeSchema,
  context: apiRecoveryContextSchema.optional(),
  fields: apiFieldErrorsSchema.optional(),
  message: safeMessageSchema,
  requestId: requestIdSchema,
});

export const apiResponseMetaSchema = z.strictObject({
  idempotentReplay: z.boolean().optional(),
  requestId: requestIdSchema,
});

export const apiErrorMetaSchema = z.strictObject({
  idempotentReplay: z.boolean(),
});

export const apiErrorEnvelopeSchema = z.strictObject({
  error: apiErrorSchema,
  meta: apiErrorMetaSchema.optional(),
});

export function createSuccessEnvelopeSchema<const DataSchema extends z.ZodType>(
  dataSchema: DataSchema,
) {
  return z.strictObject({
    data: dataSchema,
    meta: apiResponseMetaSchema,
  });
}

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;
export type ApiErrorEnvelope = z.infer<typeof apiErrorEnvelopeSchema>;
export type ApiFieldError = z.infer<typeof apiFieldErrorSchema>;
export type ApiFieldErrorCode = z.infer<typeof apiFieldErrorCodeSchema>;
export type ApiFieldErrors = z.infer<typeof apiFieldErrorsSchema>;
export type ApiRecoveryContext = z.infer<typeof apiRecoveryContextSchema>;
export type ApiResponseMeta = z.infer<typeof apiResponseMetaSchema>;
