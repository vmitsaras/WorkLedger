import { workspacePackage as domainPackage } from '@workledger/domain';

export {
  createWorkLedgerDatabase,
  DatabaseClosedError,
  DatabaseConfigurationError,
  TransactionConfigurationError,
  type WorkLedgerDatabaseConfiguration,
} from './client.js';
export { DatabaseValueError } from './mapping/domain-values.js';
export type {
  AdvanceAttendanceHeadInput,
  AppendPunchEvent,
  AppendTimeAccountEntryInput,
  AttendanceHeadRecord,
  AttendanceRepository,
  DailyProjectionRecord,
  DailyProjectionRepository,
  DailyProjectionStatus,
  EmployeeRecord,
  EmployeeRepository,
  EmployeeStatus,
  OrganizationRecord,
  OrganizationRepository,
  ReplaceDailyProjectionInput,
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
