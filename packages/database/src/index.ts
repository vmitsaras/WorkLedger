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
export { IdempotencyValueError } from './repositories/idempotency-values.js';
export {
  DEVELOPMENT_SEED_ANCHOR_DATE,
  DEVELOPMENT_SEED_ORGANIZATION_ID,
  DevelopmentSeedError,
  seedDevelopmentDatabase,
  type DevelopmentSeedConfiguration,
  type DevelopmentSeedEnvironment,
  type DevelopmentSeedResult,
} from './seed/development.js';
export type {
  AccountSelfContextRecord,
  AccountSelfServiceRepository,
  AccountSessionRecord,
  AppendDomainAuditEventInput,
  AppendSecurityAuditEventInput,
  ApplicationRole,
  AdvanceAttendanceHeadInput,
  AppendPunchEvent,
  AppendTimeAccountEntryInput,
  AuditActor,
  AuditOutcome,
  AuditRepository,
  AttendanceIdempotencyClaim,
  AttendanceIdempotencyErrorSnapshot,
  AttendanceIdempotencyOutcome,
  AttendanceIdempotencyRepository,
  AttendanceIdempotencySuccessSnapshot,
  AttendanceHeadRecord,
  AttendanceRepository,
  AuthorizationActorRecord,
  AuthorizationChangeInput,
  AuthorizationRepository,
  ClaimAttendanceIdempotencyInput,
  CompleteAttendanceIdempotencyInput,
  CorrectionRequestRecord,
  CorrectionRequestRepository,
  CorrectionRequestStatus,
  CorrectionReviewRecord,
  DecideCorrectionRequestInput,
  AppliedCorrectionRecord,
  ApplyCorrectionInput,
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
  SubmitCorrectionRequestInput,
  SecurityAuditFacts,
  SecurityAuditTargetKind,
  StoredPunchEvent,
  TimeAccountRepository,
  TodayAttendanceRepository,
  TodayAttendanceSourceInput,
  TodayAttendanceSourceRecord,
  TodayHolidayRecord,
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
