import type {
  AccountSelfServiceRepository,
  AuditRepository,
  AttendanceIdempotencyRepository,
  AttendanceRepository,
  CorrectionRequestRepository,
  AuthorizationRepository,
  DailyProjectionRepository,
  EmployeeRepository,
  OrganizationRepository,
  TimeAccountRepository,
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
  readonly audit: AuditRepository;
  readonly attendance: AttendanceRepository;
  readonly attendanceIdempotency: AttendanceIdempotencyRepository;
  readonly authorization: AuthorizationRepository;
  readonly correctionRequests: CorrectionRequestRepository;
  readonly dailyProjections: DailyProjectionRepository;
  readonly employees: EmployeeRepository;
  readonly organizations: OrganizationRepository;
  readonly timeAccount: TimeAccountRepository;
  readonly todayAttendance: TodayAttendanceRepository;
}

export interface WorkLedgerDatabase {
  close(): Promise<void>;
  transaction<T>(
    operation: (transaction: WorkLedgerTransaction) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T>;
}
