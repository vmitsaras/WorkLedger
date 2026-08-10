import { workspacePackage as contractsPackage } from '@workledger/contracts';
import { workspacePackage as databasePackage } from '@workledger/database';
import { workspacePackage as domainPackage } from '@workledger/domain';

export {
  RUNTIME_ENVIRONMENT_VARIABLES,
  RuntimeConfigError,
  createRuntimeConfig,
  formatRuntimeConfigSummary,
  resolveCanonicalUrl,
  summarizeRuntimeConfig,
} from './config.js';
export { createApiServer } from './server.js';
export {
  AUTH_SECURITY_PROFILE,
  createAuthOptions,
  createWorkLedgerAuthentication,
  type PasswordResetMessage,
  type PasswordResetSender,
  type SafeAuthSession,
  type WorkLedgerAuthentication,
} from './auth/authentication.js';
export {
  PASSWORD_MAXIMUM_LENGTH,
  PASSWORD_MINIMUM_LENGTH,
  PasswordPolicyError,
  validateCredentialPassword,
} from './auth/password-policy.js';
export { createSessionCsrfToken, verifySessionCsrfToken } from './auth/session-csrf.js';
export {
  authorizeAccountTarget,
  authorizeEmployeeTarget,
  authorizeInstallationAction,
  employeeCollectionScope,
  type AccountTargetAction,
  type AuthorizationDecision,
  type AuthorizationGrantScope,
  type EmployeeTargetAction,
  type InstallationAction,
} from './authorization/policy.js';
export {
  createAuthorizationService,
  type AuthorizationService,
  type AuthorizedEmployeeCollection,
  type EmployeeAuthorizationRequest,
} from './authorization/service.js';
export type { RuntimeConfig, RuntimeConfigSummary, RuntimeEnvironment } from './config.js';

export const workspacePackage = '@workledger/api' as const;
export const workspaceDependencies = [contractsPackage, databasePackage, domainPackage] as const;

export type WorkspacePackageName = typeof workspacePackage;
export type WorkspaceDependencyName = (typeof workspaceDependencies)[number];
