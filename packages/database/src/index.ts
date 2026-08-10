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
export { AuditValueError } from './repositories/audit-values.js';
export type {
  AppendDomainAuditEventInput,
  AppendSecurityAuditEventInput,
  ApplicationRole,
  AdvanceAttendanceHeadInput,
  AppendPunchEvent,
  AppendTimeAccountEntryInput,
  AuditActor,
  AuditOutcome,
  AuditRepository,
  AttendanceHeadRecord,
  AttendanceRepository,
  AuthorizationActorRecord,
  AuthorizationChangeInput,
  AuthorizationRepository,
  DailyProjectionRecord,
  DailyProjectionRepository,
  DailyProjectionStatus,
  DomainAuditEventRecord,
  DomainAuditFacts,
  DomainAuditTargetKind,
  EmployeeRecord,
  EmployeeRepository,
  EmployeeAuthorizationScope,
  EmployeeStatus,
  OrganizationRecord,
  OrganizationRepository,
  LinkEmployeeInput,
  ListAuthorizedEmployeesInput,
  ListDomainAuditEventsInput,
  ListSecurityAuditEventsInput,
  ReplaceDailyProjectionInput,
  ReplaceActiveRolesInput,
  SecurityAuditEventRecord,
  SecurityAuditFacts,
  SecurityAuditTargetKind,
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
