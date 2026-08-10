export const workspacePackage = '@workledger/contracts' as const;
export const workspaceDependencies = [] as const;

export type WorkspacePackageName = typeof workspacePackage;
export type WorkspaceDependencyName = (typeof workspaceDependencies)[number];

export {
  API_ERROR_CODES,
  API_FIELD_ERROR_CODES,
  apiErrorCodeSchema,
  apiErrorEnvelopeSchema,
  apiErrorMetaSchema,
  apiErrorSchema,
  apiFieldErrorCodeSchema,
  apiFieldErrorSchema,
  apiFieldErrorsSchema,
  apiRecoveryContextSchema,
  apiResponseMetaSchema,
  createSuccessEnvelopeSchema,
  requestIdSchema,
  type ApiErrorCode,
  type ApiErrorEnvelope,
  type ApiFieldError,
  type ApiFieldErrorCode,
  type ApiFieldErrors,
  type ApiRecoveryContext,
  type ApiResponseMeta,
} from './api.js';
