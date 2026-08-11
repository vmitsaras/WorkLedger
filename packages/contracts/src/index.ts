export const workspacePackage = '@workledger/contracts' as const;
export const workspaceDependencies = [] as const;

export type WorkspacePackageName = typeof workspacePackage;
export type WorkspaceDependencyName = (typeof workspaceDependencies)[number];

export {
  APPLICATION_ROLES,
  NAVIGATION_AREAS,
  PASSWORD_MAXIMUM_LENGTH,
  PASSWORD_MINIMUM_LENGTH,
  accountSummarySchema,
  applicationRoleSchema,
  csrfBootstrapEnvelopeSchema,
  csrfBootstrapSchema,
  employeeSelfSummarySchema,
  navigationAreaSchema,
  organizationSummarySchema,
  revokeSelfSessionEnvelopeSchema,
  revokeSelfSessionResultSchema,
  selfContextEnvelopeSchema,
  selfContextSchema,
  selfProfileEnvelopeSchema,
  selfProfileSchema,
  selfSessionSummarySchema,
  type ApplicationRole,
  type NavigationArea,
  type SelfContext,
  type SelfProfile,
  type SelfSessionSummary,
} from './account.js';

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
