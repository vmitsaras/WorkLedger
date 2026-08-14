import type {
  AccountSelfServiceRepository,
  AbsenceRequestRepository,
  ApprovalInboxRepository,
  AuditRepository,
  AttendanceIdempotencyRepository,
  AttendanceRepository,
  CorrectionRequestRepository,
  AuthorizationRepository,
  DailyProjectionRepository,
  EmployeeRepository,
  LeaveEntitlementRepository,
  OrganizationRepository,
  NotificationRepository,
  MonthlyPeriodRepository,
  TimeAccountRepository,
  TeamStatusRepository,
  TodayAttendanceRepository,
} from '../repositories/contracts.js';

export type TransactionIsolationLevel = 'read committed' | 'repeatable read' | 'serializable';

export type TransactionRetry = Readonly<{
  maxAttempts: number;
  mode: 'DATABASE_ONLY';
}>;

export type TransactionOptions = Readonly<{
  isolationLevel?: TransactionIsolationLevel;
  retry?: TransactionRetry;
}>;

export interface WorkLedgerTransaction {
  readonly accountSelfService: AccountSelfServiceRepository;
  readonly absenceRequests: AbsenceRequestRepository;
  readonly approvalInbox: ApprovalInboxRepository;
  readonly audit: AuditRepository;
  readonly attendance: AttendanceRepository;
  readonly attendanceIdempotency: AttendanceIdempotencyRepository;
  readonly authorization: AuthorizationRepository;
  readonly correctionRequests: CorrectionRequestRepository;
  readonly dailyProjections: DailyProjectionRepository;
  readonly employees: EmployeeRepository;
  readonly leaveEntitlements: LeaveEntitlementRepository;
  readonly organizations: OrganizationRepository;
  readonly notifications: NotificationRepository;
  readonly monthlyPeriods: MonthlyPeriodRepository;
  readonly timeAccount: TimeAccountRepository;
  readonly teamStatus: TeamStatusRepository;
  readonly todayAttendance: TodayAttendanceRepository;
}

export interface WorkLedgerDatabase {
  close(): Promise<void>;
  transaction<T>(
    operation: (transaction: WorkLedgerTransaction) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T>;
}
