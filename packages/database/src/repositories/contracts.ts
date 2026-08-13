import type {
  AttendanceCommand,
  AttendanceState,
  DomainId,
  Instant,
  LocalDate,
  NonNegativeMinutes,
  PolicyAssignment,
  PunchEvent,
  PunchEventType,
  ScheduleAssignment,
  TimeAccountLedgerEntry,
} from '@workledger/domain';

export type EmployeeStatus = 'ACTIVE' | 'INACTIVE';
export type DailyProjectionStatus = 'PROVISIONAL' | 'INCOMPLETE' | 'COMPLETE';
export type ApplicationRole = 'EMPLOYEE' | 'MANAGER' | 'HR_ADMINISTRATOR' | 'SYSTEM_ADMINISTRATOR';
export type EmployeeAuthorizationScope = 'ORGANIZATION' | 'REPORTS' | 'SELF' | 'SELF_AND_REPORTS';
export type AuditOutcome = 'SUCCESS' | 'DENIED' | 'FAILURE';
export type DomainAuditTargetKind =
  | 'EMPLOYEE'
  | 'ATTENDANCE'
  | 'CORRECTION_REQUEST'
  | 'ABSENCE_REQUEST'
  | 'MONTHLY_PERIOD'
  | 'TIME_ACCOUNT'
  | 'LEAVE_ENTITLEMENT'
  | 'TEAM'
  | 'ASSIGNMENT'
  | 'CONFIGURATION'
  | 'EXPORT';
export type SecurityAuditTargetKind =
  | 'ACCOUNT'
  | 'SESSION'
  | 'AUTHENTICATION'
  | 'INVITATION'
  | 'RECOVERY'
  | 'AUTHORIZATION'
  | 'EXPORT'
  | 'OPERATIONS'
  | 'BACKUP'
  | 'SECRET'
  | 'NOTIFICATION_DELIVERY';

export type AuditActor =
  | Readonly<{
      accountId: DomainId<'Account'>;
      kind: 'ACCOUNT';
      role: ApplicationRole | null;
    }>
  | Readonly<{
      kind: 'SYSTEM';
      systemProcess: DomainId<'SystemProcess'>;
    }>;

export type DomainAuditFacts = Readonly<{
  attendanceRevision?: number;
  effectiveDate?: LocalDate;
  eventCount?: number;
  minutes?: number;
  nextStatus?: string;
  previousStatus?: string;
  sourceCount?: number;
  version?: number;
}>;

export type SecurityAuditFacts = Readonly<{
  authenticationMethod?: string;
  changedRole?: ApplicationRole;
  failureCategory?: string;
  httpStatus?: number;
  sessionId?: DomainId<'Session'>;
  scope?: string;
}>;

export type DomainAuditEventRecord = Readonly<{
  actionCode: string;
  actor: AuditActor;
  facts: DomainAuditFacts;
  id: DomainId<'DomainAuditEvent'>;
  occurredAt: Instant;
  organizationId: DomainId<'Organization'>;
  outcome: AuditOutcome;
  privileged: boolean;
  reasonCode: string | null;
  requestId: DomainId<'Request'> | null;
  restrictedReasonId: DomainId<'RestrictedReason'> | null;
  subjectEmployeeId: DomainId<'Employee'> | null;
  targetId: string;
  targetKind: DomainAuditTargetKind;
}>;

export type SecurityAuditEventRecord = Readonly<{
  actionCode: string;
  actor: AuditActor;
  facts: SecurityAuditFacts;
  id: DomainId<'SecurityAuditEvent'>;
  occurredAt: Instant;
  organizationId: DomainId<'Organization'>;
  outcome: AuditOutcome;
  privileged: boolean;
  reasonCode: string | null;
  requestId: DomainId<'Request'> | null;
  targetAccountId: DomainId<'Account'> | null;
  targetId: string;
  targetKind: SecurityAuditTargetKind;
}>;

export type AppendDomainAuditEventInput = Omit<DomainAuditEventRecord, 'id'>;
export type AppendSecurityAuditEventInput = Omit<SecurityAuditEventRecord, 'id'>;

export type ListDomainAuditEventsInput = Readonly<{
  limit: number;
  offset: number;
  organizationId: DomainId<'Organization'>;
  subjectEmployeeId: DomainId<'Employee'>;
}>;

export type ListSecurityAuditEventsInput = Readonly<{
  limit: number;
  offset: number;
  organizationId: DomainId<'Organization'>;
}>;

export type AuthorizationActorRecord = Readonly<{
  accountActive: boolean;
  accountId: DomainId<'Account'>;
  employeeCapabilityActive: boolean;
  employeeId: DomainId<'Employee'> | null;
  organizationId: DomainId<'Organization'>;
  roles: readonly ApplicationRole[];
}>;

export type AuthorizationChangeInput = Readonly<{
  accountId: DomainId<'Account'>;
  changedAt: Instant;
  organizationId: DomainId<'Organization'>;
}>;

export type LinkEmployeeInput = AuthorizationChangeInput &
  Readonly<{ employeeId: DomainId<'Employee'> }>;

export type ReplaceActiveRolesInput = AuthorizationChangeInput &
  Readonly<{ roles: readonly ApplicationRole[] }>;

export type ListAuthorizedEmployeesInput = Readonly<{
  actorEmployeeId: DomainId<'Employee'> | null;
  limit: number;
  localDate: LocalDate;
  offset: number;
  organizationId: DomainId<'Organization'>;
  scope: EmployeeAuthorizationScope;
}>;

export type OrganizationRecord = Readonly<{
  createdAt: Instant;
  id: DomainId<'Organization'>;
  name: string;
  timeZone: string;
}>;

export type EmployeeRecord = Readonly<{
  createdAt: Instant;
  displayName: string;
  employeeNumber: string;
  id: DomainId<'Employee'>;
  organizationId: DomainId<'Organization'>;
  status: EmployeeStatus;
}>;

export type AccountSelfContextRecord = Readonly<{
  accountActive: boolean;
  accountId: DomainId<'Account'>;
  email: string;
  employee: EmployeeRecord | null;
  employeeCapabilityActive: boolean;
  name: string;
  organization: OrganizationRecord;
  roles: readonly ApplicationRole[];
}>;

export type AccountSessionRecord = Readonly<{
  accountId: DomainId<'Account'>;
  createdAt: Instant;
  expiresAt: Instant;
  id: DomainId<'Session'>;
  lastActiveAt: Instant;
  userAgent: string | null;
}>;

export type AttendanceHeadRecord = Readonly<{
  attendanceRevision: number;
  employeeId: DomainId<'Employee'>;
  nextEventSequence: number;
  organizationId: DomainId<'Organization'>;
  state: AttendanceState;
  updatedAt: Instant;
}>;

export type StoredPunchEvent = Readonly<{
  actorEmployeeId: DomainId<'Employee'> | null;
  commandId: DomainId<'AttendanceCommand'>;
  employeeId: DomainId<'Employee'>;
  event: PunchEvent;
  id: DomainId<'PunchEvent'>;
  organizationId: DomainId<'Organization'>;
  recordedAt: Instant;
}>;

export type TodayHolidayRecord = Readonly<{
  id: DomainId<'Holiday'>;
  name: string;
}>;

export type TodayAttendanceSourceInput = Readonly<{
  calculationAsOf: Instant;
  dayStartsAt: Instant;
  employeeId: DomainId<'Employee'>;
  localDate: LocalDate;
  organizationId: DomainId<'Organization'>;
}>;

export type TodayAttendanceSourceRecord = Readonly<{
  absenceCreditMinutes: NonNegativeMinutes;
  absenceExpectedReductionMinutes: NonNegativeMinutes;
  events: readonly StoredPunchEvent[];
  flexNegativeThresholdMinutes: NonNegativeMinutes | null;
  flexPositiveThresholdMinutes: NonNegativeMinutes | null;
  hasUnresolvedApprovalRequiredAbsence: boolean;
  hasUnresolvedCorrection: boolean;
  head: AttendanceHeadRecord | null;
  holiday: TodayHolidayRecord | null;
  policyAssignments: readonly PolicyAssignment[];
  scheduleAssignments: readonly ScheduleAssignment[];
  timelineTruncated: boolean;
}>;

export type AppendPunchEvent = Readonly<{
  actorEmployeeId: DomainId<'Employee'> | null;
  commandId: DomainId<'AttendanceCommand'>;
  event: PunchEvent;
}>;

export type AdvanceAttendanceHeadInput = Readonly<{
  appendedEventCount: number;
  employeeId: DomainId<'Employee'>;
  expectedAttendanceRevision: number;
  expectedNextEventSequence: number;
  nextState: AttendanceState;
  organizationId: DomainId<'Organization'>;
}>;

export type DailyProjectionRecord = Readonly<{
  absenceCreditMinutes: number;
  adjustmentMinutes: number;
  balanceMinutes: number;
  breakMinutes: number;
  calculatedAt: Instant;
  calculationStatus: DailyProjectionStatus;
  creditedMinutes: number;
  employeeId: DomainId<'Employee'>;
  engineVersion: string;
  expectedMinutes: number;
  id: DomainId<'DailyProjection'>;
  localDate: LocalDate;
  organizationId: DomainId<'Organization'>;
  projectionVersion: number;
  sourceFingerprint: string;
  sourceReferences: Readonly<Record<string, unknown>>;
  warningCodes: readonly string[];
  workedMinutes: number;
}>;

export type ReplaceDailyProjectionInput = Omit<DailyProjectionRecord, 'id'>;

export type AppendTimeAccountEntryInput = Readonly<{
  entry: TimeAccountLedgerEntry;
  sourceFingerprint: string;
}>;

export type AttendanceIdempotencySuccessSnapshot = Readonly<{
  attendanceRevision: number;
  command: AttendanceCommand;
  createdEvents: readonly Readonly<{
    id: DomainId<'PunchEvent'>;
    type: PunchEventType;
  }>[];
  occurredAt: Instant;
  resultingState: AttendanceState;
  validActions: readonly AttendanceCommand[];
}>;

export type AttendanceIdempotencyErrorSnapshot = Readonly<{
  attendanceRevision?: number;
  code: string;
  currentState?: AttendanceState;
  requiresBreakConfirmation?: boolean;
  validActions?: readonly AttendanceCommand[];
}>;

export type AttendanceIdempotencyOutcome =
  | Readonly<{ kind: 'ERROR'; error: AttendanceIdempotencyErrorSnapshot }>
  | Readonly<{ kind: 'SUCCESS'; data: AttendanceIdempotencySuccessSnapshot }>;

export type ClaimAttendanceIdempotencyInput = Readonly<{
  actorAccountId: DomainId<'Account'>;
  command: AttendanceCommand;
  employeeId: DomainId<'Employee'>;
  idempotencyKey: string;
  organizationId: DomainId<'Organization'>;
  requestFingerprint: string;
}>;

export type AttendanceIdempotencyClaim =
  | Readonly<{ kind: 'CLAIMED'; recordId: DomainId<'IdempotencyRecord'> }>
  | Readonly<{ kind: 'CONFLICT' }>
  | Readonly<{
      kind: 'REPLAY';
      originalHttpStatus: number;
      outcome: AttendanceIdempotencyOutcome;
    }>;

export type CompleteAttendanceIdempotencyInput = Readonly<{
  command: AttendanceCommand;
  completedAt: Instant;
  originalHttpStatus: number;
  outcome: AttendanceIdempotencyOutcome;
  recordId: DomainId<'IdempotencyRecord'>;
  requestFingerprint: string;
}>;

export interface OrganizationRepository {
  findById(organizationId: DomainId<'Organization'>): Promise<OrganizationRecord | null>;
}

export interface AuditRepository {
  appendDomain(input: AppendDomainAuditEventInput): Promise<DomainAuditEventRecord>;
  appendSecurity(input: AppendSecurityAuditEventInput): Promise<SecurityAuditEventRecord>;
  listDomainForEmployee(
    input: ListDomainAuditEventsInput,
  ): Promise<readonly DomainAuditEventRecord[]>;
  listSecurity(input: ListSecurityAuditEventsInput): Promise<readonly SecurityAuditEventRecord[]>;
}

export interface EmployeeRepository {
  findById(
    organizationId: DomainId<'Organization'>,
    employeeId: DomainId<'Employee'>,
  ): Promise<EmployeeRecord | null>;
}

export interface AccountSelfServiceRepository {
  deleteSession(accountId: DomainId<'Account'>, sessionId: DomainId<'Session'>): Promise<boolean>;
  findContext(
    accountId: DomainId<'Account'>,
    at: Instant,
  ): Promise<AccountSelfContextRecord | null>;
  listActiveSessions(
    accountId: DomainId<'Account'>,
    at: Instant,
  ): Promise<readonly AccountSessionRecord[]>;
  lockSession(
    accountId: DomainId<'Account'>,
    sessionId: DomainId<'Session'>,
  ): Promise<AccountSessionRecord | null>;
}

export interface AuthorizationRepository {
  findActor(
    organizationId: DomainId<'Organization'>,
    accountId: DomainId<'Account'>,
    localDate: LocalDate,
  ): Promise<AuthorizationActorRecord | null>;
  isCurrentManager(
    organizationId: DomainId<'Organization'>,
    managerEmployeeId: DomainId<'Employee'>,
    employeeId: DomainId<'Employee'>,
    localDate: LocalDate,
  ): Promise<boolean>;
  linkEmployee(input: LinkEmployeeInput): Promise<void>;
  listAuthorizedEmployeeIds(
    input: ListAuthorizedEmployeesInput,
  ): Promise<readonly DomainId<'Employee'>[]>;
  replaceActiveRoles(input: ReplaceActiveRolesInput): Promise<void>;
  unlinkEmployee(input: AuthorizationChangeInput): Promise<boolean>;
}

export interface AttendanceRepository {
  advanceHead(input: AdvanceAttendanceHeadInput): Promise<AttendanceHeadRecord | null>;
  appendPunchEvents(
    organizationId: DomainId<'Organization'>,
    employeeId: DomainId<'Employee'>,
    events: readonly AppendPunchEvent[],
  ): Promise<readonly StoredPunchEvent[]>;
  ensureHead(
    organizationId: DomainId<'Organization'>,
    employeeId: DomainId<'Employee'>,
  ): Promise<void>;
  findLatestPunchEvent(
    organizationId: DomainId<'Organization'>,
    employeeId: DomainId<'Employee'>,
  ): Promise<StoredPunchEvent | null>;
  listPunchEvents(
    organizationId: DomainId<'Organization'>,
    employeeId: DomainId<'Employee'>,
  ): Promise<readonly StoredPunchEvent[]>;
  lockHead(
    organizationId: DomainId<'Organization'>,
    employeeId: DomainId<'Employee'>,
  ): Promise<AttendanceHeadRecord | null>;
}

export interface TodayAttendanceRepository {
  loadSource(input: TodayAttendanceSourceInput): Promise<TodayAttendanceSourceRecord>;
}

export interface AttendanceIdempotencyRepository {
  claim(input: ClaimAttendanceIdempotencyInput): Promise<AttendanceIdempotencyClaim>;
  complete(input: CompleteAttendanceIdempotencyInput): Promise<boolean>;
}

export interface DailyProjectionRepository {
  findByEmployeeDate(
    organizationId: DomainId<'Organization'>,
    employeeId: DomainId<'Employee'>,
    localDate: LocalDate,
  ): Promise<DailyProjectionRecord | null>;
  listForEmployeeRange(
    organizationId: DomainId<'Organization'>,
    employeeId: DomainId<'Employee'>,
    startDate: LocalDate,
    endDate: LocalDate,
  ): Promise<readonly DailyProjectionRecord[]>;
  listForEmployeeThroughDate(
    organizationId: DomainId<'Organization'>,
    employeeId: DomainId<'Employee'>,
    endDate: LocalDate,
  ): Promise<readonly DailyProjectionRecord[]>;
  replaceNext(input: ReplaceDailyProjectionInput): Promise<DailyProjectionRecord | null>;
}

export interface TimeAccountRepository {
  append(input: AppendTimeAccountEntryInput): Promise<TimeAccountLedgerEntry>;
  listForEmployee(
    organizationId: DomainId<'Organization'>,
    employeeId: DomainId<'Employee'>,
  ): Promise<readonly TimeAccountLedgerEntry[]>;
  listForEmployeeThroughDate(
    organizationId: DomainId<'Organization'>,
    employeeId: DomainId<'Employee'>,
    endDate: LocalDate,
  ): Promise<readonly TimeAccountLedgerEntry[]>;
}
