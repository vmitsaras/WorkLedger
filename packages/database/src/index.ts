import { workspacePackage as domainPackage } from '@workledger/domain';

export {
  createWorkLedgerAuthDatabase,
  type WorkLedgerAuthDatabase,
  type WorkLedgerAuthDatabaseConfiguration,
} from './auth-database.js';
export {
  createWorkLedgerDatabase,
  DatabaseClosedError,
  DatabaseConfigurationError,
  TransactionConfigurationError,
  type WorkLedgerDatabaseConfiguration,
} from './client.js';
export { DatabaseValueError } from './mapping/domain-values.js';
export type {
  ApplicationRole,
  AdvanceAttendanceHeadInput,
  AppendPunchEvent,
  AppendTimeAccountEntryInput,
  AttendanceHeadRecord,
  AttendanceRepository,
  AuthorizationActorRecord,
  AuthorizationChangeInput,
  AuthorizationRepository,
  DailyProjectionRecord,
  DailyProjectionRepository,
  DailyProjectionStatus,
  EmployeeRecord,
  EmployeeRepository,
  EmployeeAuthorizationScope,
  EmployeeStatus,
  OrganizationRecord,
  OrganizationRepository,
  LinkEmployeeInput,
  ListAuthorizedEmployeesInput,
  ReplaceDailyProjectionInput,
  ReplaceActiveRolesInput,
  StoredPunchEvent,
  TimeAccountRepository,
} from './repositories/contracts.js';
export type {
  TransactionIsolationLevel,
  TransactionOptions,
  TransactionRetry,
  WorkLedgerDatabase,
  WorkLedgerTransaction,
} from './transactions/contracts.js';

export const workspacePackage = '@workledger/database' as const;
export const workspaceDependencies = [domainPackage] as const;

export type WorkspacePackageName = typeof workspacePackage;
export type WorkspaceDependencyName = (typeof workspaceDependencies)[number];
