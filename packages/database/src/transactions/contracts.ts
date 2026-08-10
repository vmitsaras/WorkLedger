import type {
  AuditRepository,
  AttendanceRepository,
  AuthorizationRepository,
  DailyProjectionRepository,
  EmployeeRepository,
  OrganizationRepository,
  TimeAccountRepository,
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
  readonly audit: AuditRepository;
  readonly attendance: AttendanceRepository;
  readonly authorization: AuthorizationRepository;
  readonly dailyProjections: DailyProjectionRepository;
  readonly employees: EmployeeRepository;
  readonly organizations: OrganizationRepository;
  readonly timeAccount: TimeAccountRepository;
}

export interface WorkLedgerDatabase {
  close(): Promise<void>;
  transaction<T>(
    operation: (transaction: WorkLedgerTransaction) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T>;
}
