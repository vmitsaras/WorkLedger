import type {
  AbsenceTypeCode,
  AbsenceTypePolicy,
  AbsenceTypePolicyInput,
  AttendanceCommand,
  AttendanceState,
  DomainId,
  Instant,
  LeaveEntitlementLedgerEntry,
  LocalDate,
  NonNegativeMinutes,
  PolicyAssignment,
  PunchEvent,
  PunchEventType,
  ScheduleAssignment,
  TimeAccountLedgerEntry,
  MonthlyPeriodStatus,
  CalculationBlockerCode,
  EffectiveAssignmentRecord,
  EffectiveAssignmentTransition,
} from '@workledger/domain';

export type EmployeeStatus = 'ACTIVE' | 'INACTIVE';
export type DailyProjectionStatus = 'PROVISIONAL' | 'INCOMPLETE' | 'COMPLETE';
export type CorrectionRequestStatus =
  'SUBMITTED' | 'CHANGES_REQUESTED' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';
export type CorrectionDecisionAction = 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES';
export type ApplicationRole = 'EMPLOYEE' | 'MANAGER' | 'HR_ADMINISTRATOR' | 'SYSTEM_ADMINISTRATOR';
export type EmployeeAuthorizationScope = 'ORGANIZATION' | 'REPORTS' | 'SELF' | 'SELF_AND_REPORTS';
export type TeamAvailabilityState = 'OFF_WORK' | 'ON_BREAK' | 'UNAVAILABLE' | 'WORKING';
export type NotificationEvent =
  'ITEM_APPROVED' | 'ITEM_REJECTED' | 'ITEM_CHANGES_REQUESTED' | 'ITEM_ACKNOWLEDGED';
export type NotificationSourceKind = 'REQUEST' | 'MONTHLY_PERIOD';
export type NotificationDestinationPath = '/requests' | `/monthly-periods/${string}`;
export type NotificationDeliveryOutcome = 'DELIVERED' | 'FAILED';
export type NotificationDeliveryStatus = 'NOT_CONFIGURED' | 'PENDING' | NotificationDeliveryOutcome;
export type ApprovalInboxStatus = 'ACTION_REQUIRED' | 'COMPLETED' | 'WAITING_ON_EMPLOYEE';
export type ApprovalInboxType = 'ABSENCE' | 'CANCELLATION' | 'CORRECTION' | 'MONTHLY_PERIOD';
export type ApprovalInboxSort = 'AFFECTED_DATE' | 'EMPLOYEE' | 'SUBMITTED_AT';
export type ReportSort = 'DATE' | 'EMPLOYEE' | 'STATUS' | 'VALUE';
export type ReportDirection = 'ASC' | 'DESC';
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

export type AppendNotificationInput = Readonly<{
  deliveryRequested: boolean;
  destinationPath: NotificationDestinationPath;
  event: NotificationEvent;
  occurredAt: Instant;
  organizationId: DomainId<'Organization'>;
  recipientEmployeeId: DomainId<'Employee'>;
  sourceId: string;
  sourceKind: NotificationSourceKind;
  sourceVersion: number;
}>;

export type NotificationRecord = AppendNotificationInput &
  Readonly<{
    deliveryRequested: boolean;
    dismissedAt: Instant | null;
    id: DomainId<'Notification'>;
    recipientAccountId: DomainId<'Account'> | null;
    recipientEmail: string | null;
  }>;

export type AppendNotificationDeliveryAttemptInput = Readonly<{
  attemptedAt: Instant;
  attemptNumber: number;
  failureCode: string | null;
  notificationId: DomainId<'Notification'>;
  organizationId: DomainId<'Organization'>;
  outcome: NotificationDeliveryOutcome;
}>;

export type ListNotificationsInput = Readonly<{
  accountId: DomainId<'Account'>;
  employeeId: DomainId<'Employee'> | null;
  limit: number;
  offset: number;
  organizationId: DomainId<'Organization'>;
}>;

export type DismissNotificationInput = Readonly<{
  accountId: DomainId<'Account'>;
  dismissedAt: Instant;
  employeeId: DomainId<'Employee'> | null;
  notificationId: DomainId<'Notification'>;
  organizationId: DomainId<'Organization'>;
}>;

export type NotificationListItemRecord = Readonly<{
  deliveryStatus: NotificationDeliveryStatus;
  destinationPath: NotificationDestinationPath;
  dismissedAt: Instant | null;
  event: NotificationEvent;
  id: DomainId<'Notification'>;
  occurredAt: Instant;
}>;

export type NotificationPageRecord = Readonly<{
  items: readonly NotificationListItemRecord[];
  total: number;
}>;

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

export type DecisionActorAuthority = 'SELF' | 'CURRENT_MANAGER' | 'ORGANIZATION_HR';
export type DecisionActorRecord = Readonly<{
  accountId: DomainId<'Account'>;
  authority: DecisionActorAuthority;
  employeeId: DomainId<'Employee'> | null;
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

export type ListTeamStatusInput = Readonly<{
  actorEmployeeId: DomainId<'Employee'> | null;
  localDate: LocalDate;
  organizationId: DomainId<'Organization'>;
  scope: EmployeeAuthorizationScope;
}>;

export type ListTeamCalendarInput = Readonly<{
  actorEmployeeId: DomainId<'Employee'> | null;
  endDate: LocalDate;
  organizationId: DomainId<'Organization'>;
  scope: EmployeeAuthorizationScope;
  scopeLocalDate: LocalDate;
  startDate: LocalDate;
}>;

export type TeamCalendarEntryRecord = Readonly<{
  coverageKind: AbsenceCoverageSegmentInput['kind'];
  employeeDisplayName: string;
  endsAtMinute: number | null;
  localDate: LocalDate;
  startsAtMinute: number | null;
  teamName: string | null;
}>;

export type TeamStatusMemberRecord = Readonly<{
  availability: TeamAvailabilityState;
  displayName: string;
  hasUnresolvedRecords: boolean;
  teamName: string | null;
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

export type AdministrationEmploymentPeriodRecord = Readonly<{
  endsOn: LocalDate | null;
  id: DomainId<'EmploymentPeriod'>;
  startsOn: LocalDate;
}>;

export type AdministrationEmployeeRecord = Readonly<{
  account: Readonly<{
    active: boolean;
    email: string;
    id: DomainId<'Account'>;
    invitationPending: boolean;
  }> | null;
  displayName: string;
  employeeNumber: string;
  employmentHistory: readonly AdministrationEmploymentPeriodRecord[];
  id: DomainId<'Employee'>;
  organizationId: DomainId<'Organization'>;
  roles: readonly ApplicationRole[];
  status: EmployeeStatus;
}>;

export type AdministrationEmployeePageRecord = Readonly<{
  items: readonly AdministrationEmployeeRecord[];
  total: number;
}>;

export type AdministrationTeamRecord = Readonly<{
  active: boolean;
  currentMemberCount: number;
  id: DomainId<'Team'>;
  name: string;
}>;

export type AdministrationTeamPageRecord = Readonly<{
  items: readonly AdministrationTeamRecord[];
  total: number;
}>;

export type AdministrationTeamAssignmentRecord = Readonly<{
  endsOn: LocalDate | null;
  id: DomainId<'TeamAssignment'>;
  startsOn: LocalDate;
  team: Readonly<{
    active: boolean;
    id: DomainId<'Team'>;
    name: string;
  }>;
}>;

export type AdministrationManagerAssignmentRecord = Readonly<{
  endsOn: LocalDate | null;
  id: DomainId<'ManagerAssignment'>;
  manager: Readonly<{
    displayName: string;
    employeeNumber: string;
    id: DomainId<'Employee'>;
    status: EmployeeStatus;
  }>;
  startsOn: LocalDate;
}>;

export type AdministrationManagerCandidateRecord = Readonly<{
  displayName: string;
  employeeNumber: string;
  id: DomainId<'Employee'>;
}>;

export type AdministrationEmployeeAssignmentsRecord = Readonly<{
  activeTeams: readonly AdministrationTeamRecord[];
  currentManager: AdministrationManagerAssignmentRecord | null;
  currentTeam: AdministrationTeamAssignmentRecord | null;
  eligibleManagers: readonly AdministrationManagerCandidateRecord[];
  employeeStatus: EmployeeStatus;
  managerHistory: readonly AdministrationManagerAssignmentRecord[];
  teamHistory: readonly AdministrationTeamAssignmentRecord[];
}>;

export type ApplyAdministrationAssignmentTransitionInput = Readonly<{
  employeeId: DomainId<'Employee'>;
  organizationId: DomainId<'Organization'>;
  transition: EffectiveAssignmentTransition;
}>;

export type CreateAdministrationEmployeeInput = Readonly<{
  accountEmail: string;
  accountName: string;
  createdAt: Instant;
  employeeNumber: string;
  employmentStartsOn: LocalDate;
  invitationExpiresAt: Instant;
  invitationIdentifier: string;
  organizationId: DomainId<'Organization'>;
  roles: readonly ApplicationRole[];
}>;

export type AdministrationSystemAccountRecord = Readonly<{
  active: boolean;
  employeeLinked: boolean;
  email: string;
  id: DomainId<'Account'>;
  invitationPending: boolean;
  name: string;
  sessions: readonly AccountSessionRecord[];
  systemAdministrator: boolean;
}>;

export type AdministrationSystemAccountPageRecord = Readonly<{
  items: readonly AdministrationSystemAccountRecord[];
  total: number;
}>;

export type CreateAdministrationTechnicalAccountInput = Readonly<{
  createdAt: Instant;
  email: string;
  invitationExpiresAt: Instant;
  invitationIdentifier: string;
  name: string;
  organizationId: DomainId<'Organization'>;
}>;

export type ActivateAdministrationInvitationInput = Readonly<{
  activatedAt: Instant;
  invitationIdentifier: string;
  passwordHash: string;
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

export type MonthlyPeriodRecord = Readonly<{
  approvedAt: Instant | null;
  employeeDisplayName: string;
  employeeId: DomainId<'Employee'>;
  id: DomainId<'MonthlyPeriod'>;
  lockedAt: Instant | null;
  monthStart: LocalDate;
  organizationId: DomainId<'Organization'>;
  status: MonthlyPeriodStatus;
  submittedAt: Instant | null;
  submittedByAccountId: DomainId<'Account'> | null;
  submittedSourceFingerprint: string | null;
  version: number;
}>;

export type MonthlyPeriodProtectionStatus = Extract<
  MonthlyPeriodStatus,
  'APPROVED' | 'LOCKED' | 'SUBMITTED'
>;

export type MonthlyPeriodDecisionAction = 'APPROVE' | 'LOCK' | 'REQUEST_CHANGES';

export type ApprovedMonthlySnapshotRecord = Readonly<{
  approvalCycle: number;
  approvedAt: Instant;
  approver: DecisionActorRecord;
  engineVersion: string;
  id: DomainId<'MonthlySnapshot'>;
  monthlyPeriodId: DomainId<'MonthlyPeriod'>;
  organizationId: DomainId<'Organization'>;
  periodVersion: number;
  schemaVersion: number;
  snapshot: Readonly<Record<string, unknown>>;
  snapshotFingerprint: string;
  sourceFingerprint: string;
}>;

export type MonthlyPeriodDecisionRecord = Readonly<{
  action: MonthlyPeriodDecisionAction;
  actor: DecisionActorRecord;
  decidedAt: Instant;
  id: DomainId<'MonthlyPeriodDecision'>;
  monthlyPeriodId: DomainId<'MonthlyPeriod'>;
  monthlySnapshotId: DomainId<'MonthlySnapshot'> | null;
  nextStatus: Extract<MonthlyPeriodStatus, 'APPROVED' | 'CHANGES_REQUESTED' | 'LOCKED'>;
  nextVersion: number;
  organizationId: DomainId<'Organization'>;
  previousStatus: Extract<MonthlyPeriodStatus, 'APPROVED' | 'SUBMITTED'>;
  previousVersion: number;
  reason: string | null;
}>;

export type AppendApprovedMonthlySnapshotInput = ApprovedMonthlySnapshotRecord;

export type AppendMonthlyPeriodDecisionInput = Omit<MonthlyPeriodDecisionRecord, 'id'>;

export type TransitionMonthlyPeriodInput = Readonly<{
  action: MonthlyPeriodDecisionAction;
  approvedAt: Instant | null;
  expectedStatus: Extract<MonthlyPeriodStatus, 'APPROVED' | 'SUBMITTED'>;
  expectedVersion: number;
  lockedAt: Instant | null;
  nextStatus: Extract<MonthlyPeriodStatus, 'APPROVED' | 'CHANGES_REQUESTED' | 'LOCKED'>;
  organizationId: DomainId<'Organization'>;
  periodId: DomainId<'MonthlyPeriod'>;
}>;

export type SubmitMonthlyPeriodInput = Readonly<{
  actorAccountId: DomainId<'Account'>;
  expectedVersion: number;
  organizationId: DomainId<'Organization'>;
  periodId: DomainId<'MonthlyPeriod'>;
  sourceFingerprint: string;
  submittedAt: Instant;
}>;

export type SubmittedMonthlyPeriodRecord = Readonly<{
  status: 'SUBMITTED';
  submittedAt: Instant;
  submittedByAccountId: DomainId<'Account'>;
  submittedSourceFingerprint: string;
  version: number;
}>;

export type MonthlyPeriodRangeRecord = Readonly<{
  endsOn: LocalDate | null;
  id: string;
  startsOn: LocalDate;
}>;

export type ReportRangeInput = Readonly<{
  authorizedEmployeeIds: readonly DomainId<'Employee'>[];
  direction: ReportDirection;
  from: LocalDate;
  limit: number;
  offset: number;
  organizationId: DomainId<'Organization'>;
  sort: ReportSort;
  to: LocalDate;
}>;

export type MonthlyTimeReportRecord = Readonly<{
  balanceMinutes: number;
  creditedMinutes: number;
  employeeDisplayName: string;
  employeeId: DomainId<'Employee'>;
  expectedMinutes: number;
  incompleteRecordCount: number;
  monthStart: LocalDate;
  monthlyPeriodId: DomainId<'MonthlyPeriod'>;
  postLockDeltaMinutes: number;
  workedMinutes: number;
  workflowStatus: MonthlyPeriodStatus;
}>;

export type FlexibleTimeReportRecord = Readonly<{
  closingBalanceMinutes: number;
  employeeDisplayName: string;
  employeeId: DomainId<'Employee'>;
  openingBalanceMinutes: number;
  rangeChangeMinutes: number;
}>;

export type LeaveReportRecord = Readonly<{
  accountName: string;
  availableChangeMinutes: number;
  closingAvailableMinutes: number;
  employeeDisplayName: string;
  employeeId: DomainId<'Employee'>;
  openingAvailableMinutes: number;
  projectedRemainingMinutes: number;
  reservedMinutes: number;
}>;

export type MissingRecordReportRecord = Readonly<{
  employeeDisplayName: string;
  employeeId: DomainId<'Employee'>;
  expectedMinutes: number;
  localDate: LocalDate;
  warningCodes: readonly string[];
  workedMinutes: number;
}>;

export type MonthlyTimeReportPage = Readonly<{
  items: readonly MonthlyTimeReportRecord[];
  summary: Omit<
    MonthlyTimeReportRecord,
    'employeeDisplayName' | 'employeeId' | 'monthStart' | 'monthlyPeriodId' | 'workflowStatus'
  >;
  total: number;
}>;

export type FlexibleTimeReportPage = Readonly<{
  items: readonly FlexibleTimeReportRecord[];
  summary: Omit<FlexibleTimeReportRecord, 'employeeDisplayName' | 'employeeId'>;
  total: number;
}>;

export type LeaveReportPage = Readonly<{
  items: readonly LeaveReportRecord[];
  summary: Omit<LeaveReportRecord, 'accountName' | 'employeeDisplayName' | 'employeeId'>;
  total: number;
}>;

export type MissingRecordReportPage = Readonly<{
  items: readonly MissingRecordReportRecord[];
  total: number;
}>;

export type MonthlyScheduleAssignmentRecord = MonthlyPeriodRangeRecord &
  Readonly<{
    scheduleId: DomainId<'WeeklySchedule'>;
    scheduleVersion: number;
    scheduledMinutesByIsoWeekday: readonly [number, number, number, number, number, number, number];
  }>;

export type MonthlyPolicyAssignmentRecord = MonthlyPeriodRangeRecord &
  Readonly<{
    policyId: DomainId<'TimePolicy'>;
    policyVersion: number;
  }>;

export type MonthlyHolidaySourceRecord = Readonly<{
  holidayId: DomainId<'Holiday'>;
  localDate: LocalDate;
}>;

export type MonthlyAbsenceEffectSourceRecord = Readonly<{
  absenceCreditMinutes: number;
  absenceExpectedReductionMinutes: number;
  effectId: DomainId<'AbsenceEffect'>;
  effectVersion: number;
  localDate: LocalDate;
}>;

export type MonthlyAppliedCorrectionSourceRecord = Readonly<{
  appliedCorrectionId: DomainId<'AppliedCorrection'>;
  localDate: LocalDate;
  version: number;
}>;

export type PostLockAdjustmentRecord = Readonly<{
  adjustmentVersion: number;
  appliedCorrectionId: DomainId<'AppliedCorrection'>;
  correctionDecisionId: DomainId<'CorrectionDecision'>;
  correctionRequestId: DomainId<'CorrectionRequest'>;
  createdAt: Instant;
  employeeId: DomainId<'Employee'>;
  id: DomainId<'PostLockAdjustment'>;
  localDate: LocalDate;
  minutes: number;
  monthlySnapshotId: DomainId<'MonthlySnapshot'>;
  organizationId: DomainId<'Organization'>;
  previousAdjustedWorkedMinutes: number;
  proposedWorkedMinutes: number;
  reason: string;
  reversesAdjustmentId: DomainId<'PostLockAdjustment'> | null;
  sourceId: DomainId<'AppliedCorrection'>;
}>;

export type AppendPostLockAdjustmentInput = PostLockAdjustmentRecord;

export type MonthlyLedgerEntryRecord = TimeAccountLedgerEntry &
  Readonly<{ sourceFingerprint: string }>;

export type MonthlyPeriodBlockerSourceRecord = Readonly<{
  code: Extract<CalculationBlockerCode, 'ABSENCE_APPROVAL_PENDING' | 'CORRECTION_UNRESOLVED'>;
  localDate: LocalDate;
  sourceId: string;
  sourceVersion: number;
}>;

export type MonthlyPeriodProjectionSourceRecord = Readonly<{
  absenceEffects: readonly MonthlyAbsenceEffectSourceRecord[];
  appliedCorrections: readonly MonthlyAppliedCorrectionSourceRecord[];
  dailyProjections: readonly DailyProjectionRecord[];
  employmentPeriods: readonly MonthlyPeriodRangeRecord[];
  holidays: readonly MonthlyHolidaySourceRecord[];
  ledgerEntries: readonly MonthlyLedgerEntryRecord[];
  period: MonthlyPeriodRecord;
  postLockAdjustments: readonly PostLockAdjustmentRecord[];
  policyAssignments: readonly MonthlyPolicyAssignmentRecord[];
  scheduleAssignments: readonly MonthlyScheduleAssignmentRecord[];
  sourceBlockers: readonly MonthlyPeriodBlockerSourceRecord[];
}>;

export type ReplaceDailyProjectionInput = Omit<DailyProjectionRecord, 'id'>;

export type CorrectionRequestRecord = Readonly<{
  createdAt: Instant;
  employeeId: DomainId<'Employee'>;
  id: DomainId<'CorrectionRequest'>;
  localDate: LocalDate;
  lockedMonthlySnapshotId: DomainId<'MonthlySnapshot'> | null;
  organizationId: DomainId<'Organization'>;
  originalInterpretation: Readonly<Record<string, unknown>>;
  proposedInterpretation: Readonly<Record<string, unknown>>;
  reason: string;
  requestedByEmployeeId: DomainId<'Employee'>;
  status: CorrectionRequestStatus;
  version: number;
}>;

export type SubmitCorrectionRequestInput = Omit<CorrectionRequestRecord, 'id' | 'createdAt'>;
export type CorrectionReviewRecord = CorrectionRequestRecord &
  Readonly<{ employeeDisplayName: string }>;
export type DecideCorrectionRequestInput = Readonly<{
  action: CorrectionDecisionAction;
  actor: DecisionActorRecord;
  expectedVersion: number;
  organizationId: DomainId<'Organization'>;
  reason: string;
  requestId: DomainId<'CorrectionRequest'>;
}>;
export type AppliedCorrectionRecord = Readonly<{
  correctionDecisionId: DomainId<'CorrectionDecision'>;
  correctionRequestId: DomainId<'CorrectionRequest'>;
  id: DomainId<'AppliedCorrection'>;
  interpretation: Readonly<Record<string, unknown>>;
  version: number;
}>;
export type ApplyCorrectionInput = Readonly<{
  correctionDecisionId: DomainId<'CorrectionDecision'>;
  correctionRequestId: DomainId<'CorrectionRequest'>;
  employeeId: DomainId<'Employee'>;
  interpretation: Readonly<Record<string, unknown>>;
  localDate: LocalDate;
  organizationId: DomainId<'Organization'>;
  version: number;
}>;

export type AppendTimeAccountEntryInput = Readonly<{
  entry: TimeAccountLedgerEntry;
  sourceFingerprint: string;
}>;

export type LeaveEntitlementEntryRecord = LeaveEntitlementLedgerEntry &
  Readonly<{ absenceTypeName: string }>;

export type AppendLeaveEntitlementEntryInput = Readonly<{
  entry: LeaveEntitlementLedgerEntry;
}>;

export type VacationAbsenceTypeRecord = Readonly<{
  active: boolean;
  id: DomainId<'AbsenceTypeVersion'>;
  name: string;
  policy: AbsenceTypePolicyInput;
  validFrom: LocalDate;
  validTo: LocalDate | null;
}>;

export type AbsenceRequestConfigurationInput = Readonly<{
  absenceCode: AbsenceTypeCode;
  employeeId: DomainId<'Employee'>;
  endDate: LocalDate;
  organizationId: DomainId<'Organization'>;
  startDate: LocalDate;
}>;

export type VacationRequestConfigurationRecord = Readonly<{
  absenceTypes: readonly VacationAbsenceTypeRecord[];
  holidayDates: readonly LocalDate[];
  scheduleAssignments: readonly ScheduleAssignment[];
}>;

export type AbsenceCoverageSegmentInput = Readonly<{
  endsAtMinute: number | null;
  kind: 'FIRST_HALF' | 'FULL_DAY' | 'MINUTE_INTERVAL' | 'SECOND_HALF';
  localDate: LocalDate;
  startsAtMinute: number | null;
}>;

export type SubmitVacationRequestInput = Readonly<{
  absenceTypeId: DomainId<'AbsenceTypeVersion'>;
  coverage: readonly AbsenceCoverageSegmentInput[];
  employeeId: DomainId<'Employee'>;
  organizationId: DomainId<'Organization'>;
  requestedByEmployeeId: DomainId<'Employee'>;
  submittedAt: Instant;
}>;

export type VacationRequestRecord = Readonly<{
  absenceTypeId: DomainId<'AbsenceTypeVersion'>;
  createdAt: Instant;
  employeeId: DomainId<'Employee'>;
  id: DomainId<'AbsenceRequest'>;
  organizationId: DomainId<'Organization'>;
  status: 'SUBMITTED';
  submittedAt: Instant;
  version: number;
}>;

export type SubmitSicknessReportInput = Readonly<{
  absenceTypeId: DomainId<'AbsenceTypeVersion'>;
  coverage: readonly Readonly<{
    creditMinutes: NonNegativeMinutes;
    endsAtMinute: number | null;
    kind: AbsenceCoverageSegmentInput['kind'];
    localDate: LocalDate;
    startsAtMinute: number | null;
  }>[];
  employeeId: DomainId<'Employee'>;
  organizationId: DomainId<'Organization'>;
  requestedByEmployeeId: DomainId<'Employee'>;
  reportedAt: Instant;
}>;

export type SicknessReportRecord = Readonly<{
  employeeId: DomainId<'Employee'>;
  id: DomainId<'AbsenceRequest'>;
  requestedByEmployeeId: DomainId<'Employee'>;
  status: 'ACKNOWLEDGED' | 'REPORTED';
  version: number;
}>;

export type AbsenceCancellationStatus =
  'PENDING_DECISION' | 'CHANGES_REQUESTED' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';
export type AbsenceCancellationDecisionAction =
  'APPROVE' | 'REJECT' | 'REQUEST_CHANGES' | 'WITHDRAW';

export type AbsenceCancellationRecord = Readonly<{
  absenceRequestId: DomainId<'AbsenceRequest'>;
  absenceTypeId: DomainId<'AbsenceTypeVersion'>;
  employeeId: DomainId<'Employee'>;
  id: DomainId<'AbsenceCancellation'>;
  organizationId: DomainId<'Organization'>;
  status: AbsenceCancellationStatus;
  version: number;
}>;

export type SubmitAbsenceCancellationInput = Readonly<{
  coverageSegmentIds: readonly DomainId<'AbsenceCoverageSegment'>[] | null;
  employeeId: DomainId<'Employee'>;
  expectedRequestVersion: number;
  organizationId: DomainId<'Organization'>;
  requestId: DomainId<'AbsenceRequest'>;
  requestedByEmployeeId: DomainId<'Employee'>;
  submittedAt: Instant;
}>;

export type DecideAbsenceCancellationInput = Readonly<{
  action: Exclude<AbsenceCancellationDecisionAction, 'WITHDRAW'>;
  actor: DecisionActorRecord;
  cancellationId: DomainId<'AbsenceCancellation'>;
  expectedVersion: number;
  organizationId: DomainId<'Organization'>;
  reason: string | null;
  decidedAt: Instant;
}>;

export type WithdrawAbsenceCancellationInput = Readonly<{
  actor: DecisionActorRecord & Readonly<{ employeeId: DomainId<'Employee'> }>;
  cancellationId: DomainId<'AbsenceCancellation'>;
  expectedVersion: number;
  organizationId: DomainId<'Organization'>;
  decidedAt: Instant;
}>;

export type AbsenceCancellationDecisionResult = AbsenceCancellationRecord &
  Readonly<{
    restoration: Readonly<{
      absenceTypeId: DomainId<'AbsenceTypeVersion'>;
      effectiveOn: LocalDate;
      employeeId: DomainId<'Employee'>;
      minutes: number;
    }> | null;
  }>;

export type PersonalCalendarAbsenceRecord = Readonly<{
  absenceTypeName: string;
  endsAtMinute: number | null;
  kind: AbsenceCoverageSegmentInput['kind'];
  localDate: LocalDate;
  startsAtMinute: number | null;
  status:
    | 'ACKNOWLEDGED'
    | 'APPROVED'
    | 'CHANGES_REQUESTED'
    | 'PARTIALLY_CANCELLED'
    | 'REPORTED'
    | 'SUBMITTED';
}>;

export type PersonalCalendarHolidayRecord = Readonly<{
  localDate: LocalDate;
  name: string;
}>;

export type PersonalCalendarRecords = Readonly<{
  absences: readonly PersonalCalendarAbsenceRecord[];
  holidays: readonly PersonalCalendarHolidayRecord[];
}>;

export type ApprovalInboxTeamRecord = Readonly<{
  id: DomainId<'Team'>;
  name: string;
}>;

export type ApprovalInboxItemRecord = Readonly<{
  affectedEndDate: LocalDate;
  affectedStartDate: LocalDate;
  employeeDisplayName: string;
  employeeId: DomainId<'Employee'>;
  id:
    | DomainId<'AbsenceCancellation'>
    | DomainId<'AbsenceRequest'>
    | DomainId<'CorrectionRequest'>
    | DomainId<'MonthlyPeriod'>;
  status: ApprovalInboxStatus;
  submittedAt: Instant;
  team: ApprovalInboxTeamRecord | null;
  type: ApprovalInboxType;
  version: number;
}>;

export type ApprovalInboxPageRecord = Readonly<{
  items: readonly ApprovalInboxItemRecord[];
  teams: readonly ApprovalInboxTeamRecord[];
  total: number;
}>;

export type ApprovalAbsenceRecord = Readonly<{
  absenceCode: AbsenceTypeCode;
  absenceTypeId: DomainId<'AbsenceTypeVersion'>;
  absenceTypeName: string;
  coverage: readonly (AbsenceCoverageSegmentInput &
    Readonly<{ id: DomainId<'AbsenceCoverageSegment'> }>)[];
  employeeDisplayName: string;
  employeeId: DomainId<'Employee'>;
  id: DomainId<'AbsenceRequest'>;
  organizationId: DomainId<'Organization'>;
  policy: AbsenceTypePolicy;
  status:
    | 'SUBMITTED'
    | 'REPORTED'
    | 'ACKNOWLEDGED'
    | 'CHANGES_REQUESTED'
    | 'APPROVED'
    | 'REJECTED'
    | 'WITHDRAWN'
    | 'PARTIALLY_CANCELLED'
    | 'CANCELLED';
  submittedAt: Instant;
  version: number;
}>;

export type ApprovalCancellationRecord = Readonly<{
  absenceCode: AbsenceTypeCode;
  absenceTypeId: DomainId<'AbsenceTypeVersion'>;
  absenceTypeName: string;
  coverage: readonly (AbsenceCoverageSegmentInput &
    Readonly<{ id: DomainId<'AbsenceCoverageSegment'> }>)[];
  employeeDisplayName: string;
  employeeId: DomainId<'Employee'>;
  id: DomainId<'AbsenceCancellation'>;
  organizationId: DomainId<'Organization'>;
  policy: AbsenceTypePolicy;
  status: AbsenceCancellationStatus;
  submittedAt: Instant;
  version: number;
}>;

export type DecideAbsenceRequestInput = Readonly<{
  action: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES';
  actor: DecisionActorRecord;
  decidedAt: Instant;
  effects: readonly Readonly<{
    absenceCoverageSegmentId: DomainId<'AbsenceCoverageSegment'>;
    creditMinutes: number;
    entitlementMinutes: number;
    expectedReductionMinutes: number;
    localDate: LocalDate;
  }>[];
  expectedVersion: number;
  organizationId: DomainId<'Organization'>;
  reason: string;
  requestId: DomainId<'AbsenceRequest'>;
}>;

export type ListApprovalInboxInput = Readonly<{
  actorEmployeeId: DomainId<'Employee'> | null;
  direction: 'ASC' | 'DESC';
  employeeId: DomainId<'Employee'> | null;
  from: LocalDate | null;
  limit: number;
  localDate: LocalDate;
  offset: number;
  organizationId: DomainId<'Organization'>;
  scope: EmployeeAuthorizationScope;
  sort: ApprovalInboxSort;
  status: 'ALL' | ApprovalInboxStatus;
  teamId: DomainId<'Team'> | null;
  to: LocalDate | null;
  type: 'ALL' | ApprovalInboxType;
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

export interface ApprovalInboxRepository {
  list(input: ListApprovalInboxInput): Promise<ApprovalInboxPageRecord>;
}

export interface ReportRepository {
  listFlexibleTime(input: ReportRangeInput): Promise<FlexibleTimeReportPage>;
  listLeave(input: ReportRangeInput): Promise<LeaveReportPage>;
  listMissingRecords(input: ReportRangeInput): Promise<MissingRecordReportPage>;
  listMonthlyTime(input: ReportRangeInput): Promise<MonthlyTimeReportPage>;
}

export interface TeamStatusRepository {
  listCalendar(input: ListTeamCalendarInput): Promise<readonly TeamCalendarEntryRecord[]>;
  listCurrent(input: ListTeamStatusInput): Promise<readonly TeamStatusMemberRecord[]>;
}

export interface NotificationRepository {
  append(input: AppendNotificationInput): Promise<NotificationRecord>;
  appendDeliveryAttempt(input: AppendNotificationDeliveryAttemptInput): Promise<void>;
  dismiss(input: DismissNotificationInput): Promise<NotificationListItemRecord | null>;
  list(input: ListNotificationsInput): Promise<NotificationPageRecord>;
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

export interface AdministrationRepository {
  activateEmployee(
    organizationId: DomainId<'Organization'>,
    employeeId: DomainId<'Employee'>,
    startsOn: LocalDate,
    changedAt: Instant,
  ): Promise<AdministrationEmployeeRecord | null>;
  activateInvitation(input: ActivateAdministrationInvitationInput): Promise<Readonly<{
    accountId: DomainId<'Account'>;
    organizationId: DomainId<'Organization'>;
  }> | null>;
  createEmployee(input: CreateAdministrationEmployeeInput): Promise<AdministrationEmployeeRecord>;
  createTeam(
    organizationId: DomainId<'Organization'>,
    name: string,
  ): Promise<AdministrationTeamRecord>;
  createTechnicalAccount(
    input: CreateAdministrationTechnicalAccountInput,
  ): Promise<AdministrationSystemAccountRecord>;
  deactivateEmployee(
    organizationId: DomainId<'Organization'>,
    employeeId: DomainId<'Employee'>,
    endsOn: LocalDate,
    changedAt: Instant,
  ): Promise<AdministrationEmployeeRecord | null>;
  findEmployee(
    organizationId: DomainId<'Organization'>,
    employeeId: DomainId<'Employee'>,
    at: Instant,
  ): Promise<AdministrationEmployeeRecord | null>;
  findEmployeeAssignments(
    organizationId: DomainId<'Organization'>,
    employeeId: DomainId<'Employee'>,
    localDate: LocalDate,
  ): Promise<AdministrationEmployeeAssignmentsRecord | null>;
  applyManagerAssignmentTransition(
    input: ApplyAdministrationAssignmentTransitionInput,
  ): Promise<string | null>;
  applyTeamAssignmentTransition(
    input: ApplyAdministrationAssignmentTransitionInput,
  ): Promise<string | null>;
  listManagerAssignmentGraph(
    organizationId: DomainId<'Organization'>,
  ): Promise<readonly EffectiveAssignmentRecord[]>;
  listEmployees(
    input: Readonly<{
      at: Instant;
      limit: number;
      offset: number;
      organizationId: DomainId<'Organization'>;
      status: EmployeeStatus | null;
    }>,
  ): Promise<AdministrationEmployeePageRecord>;
  listSystemAccounts(
    input: Readonly<{
      at: Instant;
      limit: number;
      offset: number;
      organizationId: DomainId<'Organization'>;
    }>,
  ): Promise<AdministrationSystemAccountPageRecord>;
  listTeams(
    input: Readonly<{
      limit: number;
      localDate: LocalDate;
      offset: number;
      organizationId: DomainId<'Organization'>;
      active: boolean | null;
    }>,
  ): Promise<AdministrationTeamPageRecord>;
  replaceEmployeeRoles(
    organizationId: DomainId<'Organization'>,
    employeeId: DomainId<'Employee'>,
    roles: readonly ApplicationRole[],
    changedAt: Instant,
  ): Promise<AdministrationEmployeeRecord | null>;
  reissueInvitation(
    input: Readonly<{
      accountId: DomainId<'Account'>;
      expiresAt: Instant;
      invitationIdentifier: string;
      organizationId: DomainId<'Organization'>;
    }>,
  ): Promise<boolean>;
  revokeAccountSession(
    organizationId: DomainId<'Organization'>,
    accountId: DomainId<'Account'>,
    sessionId: DomainId<'Session'>,
  ): Promise<boolean>;
  setAccountActive(
    organizationId: DomainId<'Organization'>,
    accountId: DomainId<'Account'>,
    active: boolean,
    changedAt: Instant,
  ): Promise<boolean>;
  setSystemRole(
    organizationId: DomainId<'Organization'>,
    accountId: DomainId<'Account'>,
    enabled: boolean,
    changedAt: Instant,
  ): Promise<boolean>;
  setTeamActive(
    organizationId: DomainId<'Organization'>,
    teamId: DomainId<'Team'>,
    active: boolean,
    localDate: LocalDate,
  ): Promise<boolean>;
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
  listPunchEventsUntil(
    organizationId: DomainId<'Organization'>,
    employeeId: DomainId<'Employee'>,
    occurredAt: Instant,
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
  findForEmployee(
    organizationId: DomainId<'Organization'>,
    employeeId: DomainId<'Employee'>,
    projectionId: DomainId<'DailyProjection'>,
  ): Promise<DailyProjectionRecord | null>;
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

export interface MonthlyPeriodRepository {
  appendDecision(input: AppendMonthlyPeriodDecisionInput): Promise<MonthlyPeriodDecisionRecord>;
  appendSnapshot(input: AppendApprovedMonthlySnapshotInput): Promise<ApprovedMonthlySnapshotRecord>;
  findProtectionForRange(
    organizationId: DomainId<'Organization'>,
    employeeId: DomainId<'Employee'>,
    startDate: LocalDate,
    endDate: LocalDate,
  ): Promise<MonthlyPeriodProtectionStatus | null>;
  findByEmployeeMonth(
    organizationId: DomainId<'Organization'>,
    employeeId: DomainId<'Employee'>,
    monthStart: LocalDate,
  ): Promise<MonthlyPeriodRecord | null>;
  loadProjectionSource(
    organizationId: DomainId<'Organization'>,
    periodId: DomainId<'MonthlyPeriod'>,
  ): Promise<MonthlyPeriodProjectionSourceRecord | null>;
  findLatestSnapshot(
    organizationId: DomainId<'Organization'>,
    periodId: DomainId<'MonthlyPeriod'>,
  ): Promise<ApprovedMonthlySnapshotRecord | null>;
  listDecisions(
    organizationId: DomainId<'Organization'>,
    periodId: DomainId<'MonthlyPeriod'>,
  ): Promise<readonly MonthlyPeriodDecisionRecord[]>;
  lockForSubmission(
    organizationId: DomainId<'Organization'>,
    periodId: DomainId<'MonthlyPeriod'>,
  ): Promise<MonthlyPeriodRecord | null>;
  submit(input: SubmitMonthlyPeriodInput): Promise<SubmittedMonthlyPeriodRecord | null>;
  transition(input: TransitionMonthlyPeriodInput): Promise<MonthlyPeriodRecord | null>;
}

export interface CorrectionRequestRepository {
  appendPostLockAdjustment(
    input: AppendPostLockAdjustmentInput,
  ): Promise<PostLockAdjustmentRecord | null>;
  apply(input: ApplyCorrectionInput): Promise<AppliedCorrectionRecord | null>;
  decide(input: DecideCorrectionRequestInput): Promise<CorrectionReviewRecord | null>;
  findForReview(
    organizationId: DomainId<'Organization'>,
    requestId: DomainId<'CorrectionRequest'>,
  ): Promise<CorrectionReviewRecord | null>;
  findApprovedDecisionId(
    organizationId: DomainId<'Organization'>,
    requestId: DomainId<'CorrectionRequest'>,
  ): Promise<DomainId<'CorrectionDecision'> | null>;
  hasLockedMonth(
    organizationId: DomainId<'Organization'>,
    employeeId: DomainId<'Employee'>,
    localDate: LocalDate,
  ): Promise<boolean>;
  hasApplied(
    organizationId: DomainId<'Organization'>,
    requestId: DomainId<'CorrectionRequest'>,
  ): Promise<boolean>;
  listPendingForEmployees(
    organizationId: DomainId<'Organization'>,
    employeeIds: readonly DomainId<'Employee'>[],
  ): Promise<readonly CorrectionReviewRecord[]>;
  listPostLockAdjustments(
    organizationId: DomainId<'Organization'>,
    monthlySnapshotId: DomainId<'MonthlySnapshot'>,
  ): Promise<readonly PostLockAdjustmentRecord[]>;
  submit(input: SubmitCorrectionRequestInput): Promise<CorrectionRequestRecord>;
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

export interface LeaveEntitlementRepository {
  append(input: AppendLeaveEntitlementEntryInput): Promise<LeaveEntitlementEntryRecord>;
  listForEmployee(
    organizationId: DomainId<'Organization'>,
    employeeId: DomainId<'Employee'>,
  ): Promise<readonly LeaveEntitlementEntryRecord[]>;
}

export interface AbsenceRequestRepository {
  hasCoverageConflict(
    organizationId: DomainId<'Organization'>,
    employeeId: DomainId<'Employee'>,
    coverage: readonly AbsenceCoverageSegmentInput[],
  ): Promise<boolean>;
  acknowledgeSickness(
    organizationId: DomainId<'Organization'>,
    requestId: DomainId<'AbsenceRequest'>,
    actor: DecisionActorRecord,
    expectedVersion: number,
    acknowledgedAt: Instant,
  ): Promise<SicknessReportRecord | null>;
  decideRequest(input: DecideAbsenceRequestInput): Promise<ApprovalAbsenceRecord | null>;
  decideCancellation(
    input: DecideAbsenceCancellationInput,
  ): Promise<AbsenceCancellationDecisionResult | null>;
  findCancellation(
    organizationId: DomainId<'Organization'>,
    cancellationId: DomainId<'AbsenceCancellation'>,
  ): Promise<AbsenceCancellationRecord | null>;
  findForApproval(
    organizationId: DomainId<'Organization'>,
    requestId: DomainId<'AbsenceRequest'>,
  ): Promise<ApprovalAbsenceRecord | null>;
  findCancellationForApproval(
    organizationId: DomainId<'Organization'>,
    cancellationId: DomainId<'AbsenceCancellation'>,
  ): Promise<ApprovalCancellationRecord | null>;
  findSicknessReport(
    organizationId: DomainId<'Organization'>,
    requestId: DomainId<'AbsenceRequest'>,
  ): Promise<SicknessReportRecord | null>;
  loadConfiguration(
    input: AbsenceRequestConfigurationInput,
  ): Promise<VacationRequestConfigurationRecord>;
  listPersonalCalendar(
    organizationId: DomainId<'Organization'>,
    employeeId: DomainId<'Employee'>,
    startDate: LocalDate,
    endDate: LocalDate,
  ): Promise<PersonalCalendarRecords>;
  submitSickness(input: SubmitSicknessReportInput): Promise<SicknessReportRecord>;
  submitCancellation(
    input: SubmitAbsenceCancellationInput,
  ): Promise<AbsenceCancellationRecord | null>;
  submitVacation(input: SubmitVacationRequestInput): Promise<VacationRequestRecord>;
  withdrawCancellation(
    input: WithdrawAbsenceCancellationInput,
  ): Promise<AbsenceCancellationRecord | null>;
}
