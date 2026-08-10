import type {
  AttendanceState,
  DomainId,
  Instant,
  LocalDate,
  PunchEvent,
  TimeAccountLedgerEntry,
} from '@workledger/domain';

export type EmployeeStatus = 'ACTIVE' | 'INACTIVE';
export type DailyProjectionStatus = 'PROVISIONAL' | 'INCOMPLETE' | 'COMPLETE';
export type ApplicationRole = 'EMPLOYEE' | 'MANAGER' | 'HR_ADMINISTRATOR' | 'SYSTEM_ADMINISTRATOR';
export type EmployeeAuthorizationScope = 'ORGANIZATION' | 'REPORTS' | 'SELF' | 'SELF_AND_REPORTS';

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

export interface OrganizationRepository {
  findById(organizationId: DomainId<'Organization'>): Promise<OrganizationRecord | null>;
}

export interface EmployeeRepository {
  findById(
    organizationId: DomainId<'Organization'>,
    employeeId: DomainId<'Employee'>,
  ): Promise<EmployeeRecord | null>;
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
  listPunchEvents(
    organizationId: DomainId<'Organization'>,
    employeeId: DomainId<'Employee'>,
  ): Promise<readonly StoredPunchEvent[]>;
  lockHead(
    organizationId: DomainId<'Organization'>,
    employeeId: DomainId<'Employee'>,
  ): Promise<AttendanceHeadRecord | null>;
}

export interface DailyProjectionRepository {
  findByEmployeeDate(
    organizationId: DomainId<'Organization'>,
    employeeId: DomainId<'Employee'>,
    localDate: LocalDate,
  ): Promise<DailyProjectionRecord | null>;
  replaceNext(input: ReplaceDailyProjectionInput): Promise<DailyProjectionRecord | null>;
}

export interface TimeAccountRepository {
  append(input: AppendTimeAccountEntryInput): Promise<TimeAccountLedgerEntry>;
  listForEmployee(
    organizationId: DomainId<'Organization'>,
    employeeId: DomainId<'Employee'>,
  ): Promise<readonly TimeAccountLedgerEntry[]>;
}
