import { createHash } from 'node:crypto';

import {
  and,
  asc,
  desc,
  eq,
  count,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  ne,
  or,
  sql,
} from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { unionAll } from 'drizzle-orm/pg-core';

import {
  createAbsenceTypeVersion,
  createLocalDateRange,
  createPolicyAssignment,
  createScheduleAssignment,
  createTimePolicy,
  createWeeklySchedule,
  addLocalDateDays,
  localDateAtInstant,
  parseNonNegativeMinutes,
  parseTimeZoneId,
  type DomainId,
  type Instant,
  type LocalDate,
  type AbsenceTypeCode,
  type AbsenceTypePolicy,
  type AbsenceTypePolicyInput,
  type TimeAccountEntryActor,
  type TimeAccountLedgerEntry,
} from '@workledger/domain';

import {
  accountEmployeeLinks,
  accountRoleAssignments,
  authAccounts,
  authSessions,
  authUsers,
  authVerifications,
  attendanceHeads,
  absenceCoverageSegments,
  absenceCancellations,
  absenceCancellationSegments,
  absenceCancellationDecisions,
  absenceDecisions,
  absenceEffects,
  absenceRequests,
  absenceTypes,
  correctionRequests,
  correctionDecisions,
  appliedCorrections,
  approvedMonthlySnapshots,
  postLockAdjustments,
  monthlyPeriodDecisions,
  monthlyPeriods,
  notificationDeliveryAttempts,
  notifications,
  dailyProjections,
  domainAuditEvents,
  employees,
  employmentPeriods,
  idempotencyRecords,
  holidays,
  leaveEntitlementEntries,
  managerAssignments,
  organizations,
  policyAssignments,
  punchEvents,
  scheduleAssignments,
  securityAuditEvents,
  timeAccountEntries,
  timePolicies,
  teamAssignments,
  teams,
  weeklySchedules,
} from '../schema/index.js';
import {
  DatabaseValueError,
  mapDomainId,
  mapInstant,
  mapLocalDate,
  mapNonNegativeMinutes,
  mapSignedMinutes,
} from '../mapping/domain-values.js';
import type {
  AccountSelfContextRecord,
  AccountSelfServiceRepository,
  AccountSessionRecord,
  AdministrationEmployeeRecord,
  AdministrationRepository,
  AdministrationSystemAccountRecord,
  AdministrationWeeklyScheduleRecord,
  AbsenceCoverageSegmentInput,
  AbsenceCancellationRecord,
  AbsenceCancellationDecisionResult,
  AbsenceRequestRepository,
  ApprovalAbsenceRecord,
  ApprovalCancellationRecord,
  ApprovalInboxItemRecord,
  ApprovalInboxRepository,
  AbsenceRequestConfigurationInput,
  DecideAbsenceCancellationInput,
  DecideAbsenceRequestInput,
  DecisionActorRecord,
  AdvanceAttendanceHeadInput,
  ApplicationRole,
  AuditActor,
  AuditRepository,
  AppendPunchEvent,
  AppendLeaveEntitlementEntryInput,
  AppendTimeAccountEntryInput,
  AttendanceHeadRecord,
  AttendanceIdempotencyClaim,
  AttendanceIdempotencyRepository,
  AttendanceRepository,
  AuthorizationActorRecord,
  AuthorizationRepository,
  CorrectionRequestRecord,
  CorrectionRequestRepository,
  CorrectionReviewRecord,
  DecideCorrectionRequestInput,
  AppliedCorrectionRecord,
  ApplyCorrectionInput,
  AppendPostLockAdjustmentInput,
  ApprovedMonthlySnapshotRecord,
  DailyProjectionRecord,
  DailyProjectionRepository,
  DomainAuditEventRecord,
  EmployeeRecord,
  EmployeeRepository,
  LinkEmployeeInput,
  LeaveEntitlementEntryRecord,
  LeaveEntitlementRepository,
  ListAuthorizedEmployeesInput,
  ListApprovalInboxInput,
  ListTeamCalendarInput,
  ListTeamStatusInput,
  MonthlyPeriodBlockerSourceRecord,
  MonthlyPeriodDecisionRecord,
  MonthlyPeriodProjectionSourceRecord,
  MonthlyPeriodRecord,
  MonthlyPeriodRepository,
  MonthlyPeriodRangeRecord,
  PostLockAdjustmentRecord,
  OrganizationRecord,
  OrganizationRepository,
  NotificationListItemRecord,
  NotificationRepository,
  ReportRepository,
  ReportRangeInput,
  MonthlyTimeReportPage,
  MonthlyTimeReportRecord,
  FlexibleTimeReportPage,
  FlexibleTimeReportRecord,
  LeaveReportPage,
  LeaveReportRecord,
  MissingRecordReportRecord,
  PersonalCalendarRecords,
  ReplaceDailyProjectionInput,
  ReplaceActiveRolesInput,
  SecurityAuditEventRecord,
  StoredPunchEvent,
  SubmitCorrectionRequestInput,
  SubmitSicknessReportInput,
  SubmitAbsenceCancellationInput,
  TeamStatusMemberRecord,
  TeamCalendarEntryRecord,
  TeamStatusRepository,
  TimeAccountRepository,
  TodayAttendanceRepository,
  TodayAttendanceSourceRecord,
  SubmitVacationRequestInput,
  VacationRequestConfigurationRecord,
  VacationRequestRecord,
  SicknessReportRecord,
  WithdrawAbsenceCancellationInput,
} from './contracts.js';
import {
  AuditValueError,
  parseDomainAuditFacts,
  parseSecurityAuditFacts,
  validateDomainAuditInput,
  validateSecurityAuditInput,
} from './audit-values.js';
import {
  IdempotencyValueError,
  parseAttendanceIdempotencyOutcome,
  validateIdempotencyKey,
  validateOriginalHttpStatus,
  validateRequestFingerprint,
} from './idempotency-values.js';
import {
  AbsenceCancellationLockedPeriodError,
  AbsenceCancellationReopenPeriodError,
} from './absence-cancellation-errors.js';

import * as schema from '../schema/index.js';

type RootDatabase = NodePgDatabase<typeof schema>;
export type RepositoryTransaction = Parameters<Parameters<RootDatabase['transaction']>[0]>[0];

export function createTransactionRepositories(transaction: RepositoryTransaction): Readonly<{
  accountSelfService: AccountSelfServiceRepository;
  administration: AdministrationRepository;
  absenceRequests: AbsenceRequestRepository;
  approvalInbox: ApprovalInboxRepository;
  audit: AuditRepository;
  attendance: AttendanceRepository;
  attendanceIdempotency: AttendanceIdempotencyRepository;
  authorization: AuthorizationRepository;
  correctionRequests: CorrectionRequestRepository;
  dailyProjections: DailyProjectionRepository;
  employees: EmployeeRepository;
  leaveEntitlements: LeaveEntitlementRepository;
  organizations: OrganizationRepository;
  notifications: NotificationRepository;
  reports: ReportRepository;
  monthlyPeriods: MonthlyPeriodRepository;
  timeAccount: TimeAccountRepository;
  teamStatus: TeamStatusRepository;
  todayAttendance: TodayAttendanceRepository;
}> {
  return Object.freeze({
    accountSelfService: new PostgresAccountSelfServiceRepository(transaction),
    administration: new PostgresAdministrationRepository(transaction),
    absenceRequests: new PostgresAbsenceRequestRepository(transaction),
    approvalInbox: new PostgresApprovalInboxRepository(transaction),
    audit: new PostgresAuditRepository(transaction),
    attendance: new PostgresAttendanceRepository(transaction),
    attendanceIdempotency: new PostgresAttendanceIdempotencyRepository(transaction),
    authorization: new PostgresAuthorizationRepository(transaction),
    correctionRequests: new PostgresCorrectionRequestRepository(transaction),
    dailyProjections: new PostgresDailyProjectionRepository(transaction),
    employees: new PostgresEmployeeRepository(transaction),
    leaveEntitlements: new PostgresLeaveEntitlementRepository(transaction),
    organizations: new PostgresOrganizationRepository(transaction),
    notifications: new PostgresNotificationRepository(transaction),
    reports: new PostgresReportRepository(transaction),
    monthlyPeriods: new PostgresMonthlyPeriodRepository(transaction),
    timeAccount: new PostgresTimeAccountRepository(transaction),
    teamStatus: new PostgresTeamStatusRepository(transaction),
    todayAttendance: new PostgresTodayAttendanceRepository(transaction),
  });
}

class PostgresAccountSelfServiceRepository implements AccountSelfServiceRepository {
  constructor(private readonly transaction: RepositoryTransaction) {}

  async deleteSession(
    accountId: Parameters<AccountSelfServiceRepository['deleteSession']>[0],
    sessionId: Parameters<AccountSelfServiceRepository['deleteSession']>[1],
  ): Promise<boolean> {
    const deleted = await this.transaction
      .delete(authSessions)
      .where(and(eq(authSessions.userId, accountId), eq(authSessions.id, sessionId)))
      .returning({ id: authSessions.id });
    return deleted.length === 1;
  }

  async findContext(
    accountId: Parameters<AccountSelfServiceRepository['findContext']>[0],
    at: Parameters<AccountSelfServiceRepository['findContext']>[1],
  ): Promise<AccountSelfContextRecord | null> {
    const [account] = await this.transaction
      .select({
        active: authUsers.active,
        email: authUsers.email,
        id: authUsers.id,
        name: authUsers.name,
      })
      .from(authUsers)
      .where(eq(authUsers.id, accountId))
      .limit(1);
    if (account === undefined) return null;

    const [activeLink] = await this.transaction
      .select({
        employeeId: accountEmployeeLinks.employeeId,
        organizationId: accountEmployeeLinks.organizationId,
      })
      .from(accountEmployeeLinks)
      .where(
        and(eq(accountEmployeeLinks.userId, accountId), isNull(accountEmployeeLinks.unlinkedAt)),
      )
      .limit(1);
    const roleRows = await this.transaction
      .select({
        organizationId: accountRoleAssignments.organizationId,
        role: accountRoleAssignments.role,
      })
      .from(accountRoleAssignments)
      .where(
        and(eq(accountRoleAssignments.userId, accountId), isNull(accountRoleAssignments.revokedAt)),
      )
      .orderBy(asc(accountRoleAssignments.role));

    const organizationIds = new Set<string>();
    if (activeLink !== undefined) organizationIds.add(activeLink.organizationId);
    for (const roleRow of roleRows) organizationIds.add(roleRow.organizationId);
    if (organizationIds.size === 0) return null;
    if (organizationIds.size > 1) {
      throw new DatabaseValueError('account_role_assignments', 'organization_id');
    }
    const organizationIdValue = [...organizationIds][0];
    if (organizationIdValue === undefined) return null;
    const organizationId = mapDomainId<'Organization'>(
      organizationIdValue,
      'account_role_assignments',
      'organization_id',
    );

    const [organizationRow] = await this.transaction
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);
    if (organizationRow === undefined) return null;
    const timeZone = parseTimeZoneId(organizationRow.timeZone);
    if (!timeZone.ok) throw new DatabaseValueError('organizations', 'time_zone');
    const localDate = localDateAtInstant(at, timeZone.value);

    let employee: EmployeeRecord | null = null;
    let hasCurrentEmployment = false;
    if (activeLink !== undefined && activeLink.organizationId === organizationId) {
      const [employeeRow] = await this.transaction
        .select()
        .from(employees)
        .where(
          and(
            eq(employees.organizationId, organizationId),
            eq(employees.id, activeLink.employeeId),
          ),
        )
        .limit(1);
      if (employeeRow !== undefined) {
        employee = mapEmployee(employeeRow);
        const [employment] = await this.transaction
          .select({ id: employmentPeriods.id })
          .from(employmentPeriods)
          .where(
            and(
              eq(employmentPeriods.organizationId, organizationId),
              eq(employmentPeriods.employeeId, activeLink.employeeId),
              lte(employmentPeriods.startsOn, localDate),
              or(isNull(employmentPeriods.endsOn), gt(employmentPeriods.endsOn, localDate)),
            ),
          )
          .limit(1);
        hasCurrentEmployment = employment !== undefined;
      }
    }

    return Object.freeze({
      accountActive: account.active,
      accountId: mapDomainId<'Account'>(account.id, 'auth_users', 'id'),
      email: account.email,
      employee,
      employeeCapabilityActive:
        account.active && employee?.status === 'ACTIVE' && hasCurrentEmployment,
      name: account.name,
      organization: mapOrganization(organizationRow),
      roles: Object.freeze(roleRows.map(({ role }) => role)),
    });
  }

  async listActiveSessions(
    accountId: Parameters<AccountSelfServiceRepository['listActiveSessions']>[0],
    at: Parameters<AccountSelfServiceRepository['listActiveSessions']>[1],
  ): Promise<readonly AccountSessionRecord[]> {
    const atDate = new Date(at);
    const rows = await this.transaction
      .select({
        createdAt: authSessions.createdAt,
        expiresAt: authSessions.expiresAt,
        id: authSessions.id,
        lastActiveAt: authSessions.updatedAt,
        userAgent: authSessions.userAgent,
        userId: authSessions.userId,
      })
      .from(authSessions)
      .where(
        and(
          eq(authSessions.userId, accountId),
          gt(authSessions.expiresAt, atDate),
          sql`${authSessions.createdAt} + interval '12 hours' > ${atDate}::timestamptz`,
        ),
      )
      .orderBy(desc(authSessions.updatedAt), desc(authSessions.id))
      .limit(50);
    return Object.freeze(rows.map(mapAccountSession));
  }

  async lockSession(
    accountId: Parameters<AccountSelfServiceRepository['lockSession']>[0],
    sessionId: Parameters<AccountSelfServiceRepository['lockSession']>[1],
  ): Promise<AccountSessionRecord | null> {
    const [row] = await this.transaction
      .select({
        createdAt: authSessions.createdAt,
        expiresAt: authSessions.expiresAt,
        id: authSessions.id,
        lastActiveAt: authSessions.updatedAt,
        userAgent: authSessions.userAgent,
        userId: authSessions.userId,
      })
      .from(authSessions)
      .where(and(eq(authSessions.userId, accountId), eq(authSessions.id, sessionId)))
      .for('update')
      .limit(1);
    return row === undefined ? null : mapAccountSession(row);
  }
}

class PostgresAdministrationRepository implements AdministrationRepository {
  constructor(private readonly transaction: RepositoryTransaction) {}

  async applyScheduleAssignmentTransition(
    input: Parameters<AdministrationRepository['applyScheduleAssignmentTransition']>[0],
  ) {
    if (!(await this.lockActiveEmployee(input.organizationId, input.employeeId))) return null;
    const insert = input.transition.insert;
    if (insert !== null) {
      const [schedule] = await this.transaction
        .select({ id: weeklySchedules.id })
        .from(weeklySchedules)
        .where(
          and(
            eq(weeklySchedules.organizationId, input.organizationId),
            eq(
              weeklySchedules.id,
              mapDomainId<'WorkScheduleVersion'>(
                insert.targetId,
                'schedule_assignments',
                'schedule_id',
              ),
            ),
          ),
        )
        .limit(1);
      if (schedule === undefined) return null;
    }
    const closedId = await this.closeScheduleAssignment(input);
    if (input.transition.closeAssignmentId !== null && closedId === null) return null;
    if (insert === null) return closedId;
    const [created] = await this.transaction
      .insert(scheduleAssignments)
      .values({
        employeeId: input.employeeId,
        endsOn: insert.endsOn,
        organizationId: input.organizationId,
        scheduleId: mapDomainId<'WorkScheduleVersion'>(
          insert.targetId,
          'schedule_assignments',
          'schedule_id',
        ),
        startsOn: input.transition.effectiveFrom,
      })
      .returning({ id: scheduleAssignments.id });
    return created?.id ?? null;
  }

  async applyManagerAssignmentTransition(
    input: Parameters<AdministrationRepository['applyManagerAssignmentTransition']>[0],
  ) {
    if (!(await this.lockActiveEmployee(input.organizationId, input.employeeId))) return null;
    if (input.transition.insert !== null) {
      const managerEmployeeId = mapDomainId<'Employee'>(
        input.transition.insert.targetId,
        'manager_assignments',
        'manager_employee_id',
      );
      if (managerEmployeeId === input.employeeId) return null;
      const [eligibleManager] = await this.transaction
        .select({ id: employees.id })
        .from(employees)
        .innerJoin(
          employmentPeriods,
          and(
            eq(employmentPeriods.organizationId, input.organizationId),
            eq(employmentPeriods.employeeId, employees.id),
            lte(employmentPeriods.startsOn, input.transition.effectiveFrom),
            or(
              isNull(employmentPeriods.endsOn),
              gt(employmentPeriods.endsOn, input.transition.effectiveFrom),
            ),
          ),
        )
        .innerJoin(
          accountEmployeeLinks,
          and(
            eq(accountEmployeeLinks.organizationId, input.organizationId),
            eq(accountEmployeeLinks.employeeId, employees.id),
            isNull(accountEmployeeLinks.unlinkedAt),
          ),
        )
        .innerJoin(
          authUsers,
          and(eq(authUsers.id, accountEmployeeLinks.userId), eq(authUsers.active, true)),
        )
        .innerJoin(
          accountRoleAssignments,
          and(
            eq(accountRoleAssignments.organizationId, input.organizationId),
            eq(accountRoleAssignments.userId, authUsers.id),
            eq(accountRoleAssignments.role, 'MANAGER'),
            isNull(accountRoleAssignments.revokedAt),
          ),
        )
        .where(
          and(
            eq(employees.organizationId, input.organizationId),
            eq(employees.id, managerEmployeeId),
            eq(employees.status, 'ACTIVE'),
          ),
        )
        .limit(1);
      if (eligibleManager === undefined) return null;
    }
    const closedId = await this.closeManagerAssignment(input);
    if (input.transition.closeAssignmentId !== null && closedId === null) return null;
    if (input.transition.insert === null) return closedId;
    const [created] = await this.transaction
      .insert(managerAssignments)
      .values({
        employeeId: input.employeeId,
        endsOn: input.transition.insert.endsOn,
        managerEmployeeId: mapDomainId<'Employee'>(
          input.transition.insert.targetId,
          'manager_assignments',
          'manager_employee_id',
        ),
        organizationId: input.organizationId,
        startsOn: input.transition.effectiveFrom,
      })
      .returning({ id: managerAssignments.id });
    return created?.id ?? null;
  }

  async applyTeamAssignmentTransition(
    input: Parameters<AdministrationRepository['applyTeamAssignmentTransition']>[0],
  ) {
    if (!(await this.lockActiveEmployee(input.organizationId, input.employeeId))) return null;
    if (input.transition.insert !== null) {
      const [team] = await this.transaction
        .select({ id: teams.id })
        .from(teams)
        .where(
          and(
            eq(teams.organizationId, input.organizationId),
            eq(
              teams.id,
              mapDomainId<'Team'>(input.transition.insert.targetId, 'team_assignments', 'team_id'),
            ),
            eq(teams.active, true),
          ),
        )
        .for('update')
        .limit(1);
      if (team === undefined) return null;
    }
    const closedId = await this.closeTeamAssignment(input);
    if (input.transition.closeAssignmentId !== null && closedId === null) return null;
    if (input.transition.insert === null) return closedId;
    const [created] = await this.transaction
      .insert(teamAssignments)
      .values({
        employeeId: input.employeeId,
        endsOn: input.transition.insert.endsOn,
        organizationId: input.organizationId,
        startsOn: input.transition.effectiveFrom,
        teamId: mapDomainId<'Team'>(
          input.transition.insert.targetId,
          'team_assignments',
          'team_id',
        ),
      })
      .returning({ id: teamAssignments.id });
    return created?.id ?? null;
  }

  async activateEmployee(
    organizationId: Parameters<AdministrationRepository['activateEmployee']>[0],
    employeeId: Parameters<AdministrationRepository['activateEmployee']>[1],
    startsOn: Parameters<AdministrationRepository['activateEmployee']>[2],
    changedAt: Parameters<AdministrationRepository['activateEmployee']>[3],
  ) {
    const [employee] = await this.transaction
      .select({ id: employees.id, status: employees.status })
      .from(employees)
      .where(and(eq(employees.organizationId, organizationId), eq(employees.id, employeeId)))
      .for('update')
      .limit(1);
    if (employee === undefined || employee.status !== 'INACTIVE') return null;

    await this.transaction.insert(employmentPeriods).values({
      employeeId,
      organizationId,
      startsOn,
    });
    await this.transaction
      .update(employees)
      .set({ status: 'ACTIVE' })
      .where(and(eq(employees.organizationId, organizationId), eq(employees.id, employeeId)));
    const [link] = await this.transaction
      .select({ accountId: accountEmployeeLinks.userId })
      .from(accountEmployeeLinks)
      .where(
        and(
          eq(accountEmployeeLinks.organizationId, organizationId),
          eq(accountEmployeeLinks.employeeId, employeeId),
          isNull(accountEmployeeLinks.unlinkedAt),
        ),
      )
      .limit(1);
    if (link !== undefined) {
      await this.transaction
        .update(authUsers)
        .set({ active: true, updatedAt: new Date(changedAt) })
        .where(eq(authUsers.id, link.accountId));
      await this.transaction.delete(authSessions).where(eq(authSessions.userId, link.accountId));
    }
    return this.findEmployee(organizationId, employeeId, changedAt);
  }

  async activateInvitation(input: Parameters<AdministrationRepository['activateInvitation']>[0]) {
    const [verification] = await this.transaction
      .select({
        expiresAt: authVerifications.expiresAt,
        id: authVerifications.id,
        value: authVerifications.value,
      })
      .from(authVerifications)
      .where(eq(authVerifications.identifier, input.invitationIdentifier))
      .for('update')
      .limit(1);
    if (
      verification === undefined ||
      verification.expiresAt.getTime() <= new Date(input.activatedAt).getTime() ||
      !verification.value.startsWith(INVITATION_ACCOUNT_VALUE_PREFIX)
    ) {
      return null;
    }
    const accountId = mapDomainId<'Account'>(
      verification.value.slice(INVITATION_ACCOUNT_VALUE_PREFIX.length),
      'auth_verifications',
      'value',
    );
    const [account] = await this.transaction
      .select({ active: authUsers.active, id: authUsers.id })
      .from(authUsers)
      .where(eq(authUsers.id, accountId))
      .for('update')
      .limit(1);
    if (account === undefined || account.active) return null;
    const organizationId = await this.findAccountOrganization(accountId);
    if (organizationId === null) return null;
    const [employeeLink] = await this.transaction
      .select({ employeeStatus: employees.status })
      .from(accountEmployeeLinks)
      .innerJoin(employees, eq(employees.id, accountEmployeeLinks.employeeId))
      .where(
        and(
          eq(accountEmployeeLinks.organizationId, organizationId),
          eq(accountEmployeeLinks.userId, accountId),
          isNull(accountEmployeeLinks.unlinkedAt),
        ),
      )
      .limit(1);
    if (employeeLink !== undefined && employeeLink.employeeStatus !== 'ACTIVE') return null;

    const [credential] = await this.transaction
      .select({ id: authAccounts.id })
      .from(authAccounts)
      .where(and(eq(authAccounts.userId, accountId), eq(authAccounts.providerId, 'credential')))
      .limit(1);
    if (credential === undefined) {
      await this.transaction.insert(authAccounts).values({
        accountId,
        password: input.passwordHash,
        providerId: 'credential',
        userId: accountId,
      });
    } else {
      await this.transaction
        .update(authAccounts)
        .set({ password: input.passwordHash, updatedAt: new Date(input.activatedAt) })
        .where(eq(authAccounts.id, credential.id));
    }
    await this.transaction
      .update(authUsers)
      .set({ active: true, emailVerified: true, updatedAt: new Date(input.activatedAt) })
      .where(eq(authUsers.id, accountId));
    await this.transaction.delete(authSessions).where(eq(authSessions.userId, accountId));
    await this.transaction
      .delete(authVerifications)
      .where(eq(authVerifications.id, verification.id));
    return Object.freeze({ accountId, organizationId });
  }

  async createEmployee(input: Parameters<AdministrationRepository['createEmployee']>[0]) {
    const [employee] = await this.transaction
      .insert(employees)
      .values({
        displayName: input.accountName,
        employeeNumber: input.employeeNumber,
        organizationId: input.organizationId,
        status: 'ACTIVE',
      })
      .returning({ id: employees.id });
    if (employee === undefined) throw new DatabaseValueError('employees', 'id');
    const employeeId = mapDomainId<'Employee'>(employee.id, 'employees', 'id');
    await this.transaction.insert(employmentPeriods).values({
      employeeId,
      organizationId: input.organizationId,
      startsOn: input.employmentStartsOn,
    });
    const [account] = await this.transaction
      .insert(authUsers)
      .values({
        active: false,
        email: input.accountEmail,
        emailVerified: false,
        name: input.accountName,
      })
      .returning({ id: authUsers.id });
    if (account === undefined) throw new DatabaseValueError('auth_users', 'id');
    const accountId = mapDomainId<'Account'>(account.id, 'auth_users', 'id');
    await this.transaction.insert(accountEmployeeLinks).values({
      employeeId,
      organizationId: input.organizationId,
      userId: accountId,
    });
    await this.transaction.insert(accountRoleAssignments).values(
      [...new Set(input.roles)].map((role) => ({
        organizationId: input.organizationId,
        role,
        userId: accountId,
      })),
    );
    await this.insertInvitation(accountId, input.invitationIdentifier, input.invitationExpiresAt);
    const result = await this.findEmployee(input.organizationId, employeeId, input.createdAt);
    if (result === null) throw new DatabaseValueError('employees', 'id');
    return result;
  }

  async createTeam(
    organizationId: Parameters<AdministrationRepository['createTeam']>[0],
    name: Parameters<AdministrationRepository['createTeam']>[1],
  ) {
    const [team] = await this.transaction
      .insert(teams)
      .values({ name, organizationId })
      .returning({ active: teams.active, id: teams.id, name: teams.name });
    if (team === undefined) throw new DatabaseValueError('teams', 'id');
    return Object.freeze({
      active: team.active,
      currentMemberCount: 0,
      id: mapDomainId<'Team'>(team.id, 'teams', 'id'),
      name: team.name,
    });
  }

  async createScheduleVersion(
    input: Parameters<AdministrationRepository['createScheduleVersion']>[0],
  ) {
    const [organization] = await this.transaction
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.id, input.organizationId))
      .for('update')
      .limit(1);
    if (organization === undefined) return null;
    const [latest] = await this.transaction
      .select()
      .from(weeklySchedules)
      .where(
        and(
          eq(weeklySchedules.organizationId, input.organizationId),
          eq(weeklySchedules.name, input.name),
        ),
      )
      .orderBy(desc(weeklySchedules.version))
      .limit(1);
    if (
      latest !== undefined &&
      scheduleMinutesEqual(mapAdministrationWeeklySchedule(latest, true), input.scheduledMinutes)
    ) {
      return null;
    }
    const [created] = await this.transaction
      .insert(weeklySchedules)
      .values({
        fridayMinutes: input.scheduledMinutes.FRIDAY,
        mondayMinutes: input.scheduledMinutes.MONDAY,
        name: input.name,
        organizationId: input.organizationId,
        saturdayMinutes: input.scheduledMinutes.SATURDAY,
        sundayMinutes: input.scheduledMinutes.SUNDAY,
        thursdayMinutes: input.scheduledMinutes.THURSDAY,
        tuesdayMinutes: input.scheduledMinutes.TUESDAY,
        version: (latest?.version ?? 0) + 1,
        wednesdayMinutes: input.scheduledMinutes.WEDNESDAY,
      })
      .returning();
    return created === undefined ? null : mapAdministrationWeeklySchedule(created, true);
  }

  async createTechnicalAccount(
    input: Parameters<AdministrationRepository['createTechnicalAccount']>[0],
  ) {
    const [account] = await this.transaction
      .insert(authUsers)
      .values({ active: false, email: input.email, emailVerified: false, name: input.name })
      .returning({ id: authUsers.id });
    if (account === undefined) throw new DatabaseValueError('auth_users', 'id');
    const accountId = mapDomainId<'Account'>(account.id, 'auth_users', 'id');
    await this.transaction.insert(accountRoleAssignments).values({
      organizationId: input.organizationId,
      role: 'SYSTEM_ADMINISTRATOR',
      userId: accountId,
    });
    await this.insertInvitation(accountId, input.invitationIdentifier, input.invitationExpiresAt);
    const result = await this.findSystemAccount(input.organizationId, accountId, input.createdAt);
    if (result === null) throw new DatabaseValueError('auth_users', 'id');
    return result;
  }

  async deactivateEmployee(
    organizationId: Parameters<AdministrationRepository['deactivateEmployee']>[0],
    employeeId: Parameters<AdministrationRepository['deactivateEmployee']>[1],
    endsOn: Parameters<AdministrationRepository['deactivateEmployee']>[2],
    changedAt: Parameters<AdministrationRepository['deactivateEmployee']>[3],
  ) {
    const [employee] = await this.transaction
      .select({ id: employees.id, status: employees.status })
      .from(employees)
      .where(and(eq(employees.organizationId, organizationId), eq(employees.id, employeeId)))
      .for('update')
      .limit(1);
    if (employee === undefined || employee.status !== 'ACTIVE') return null;
    const [period] = await this.transaction
      .select({ id: employmentPeriods.id, startsOn: employmentPeriods.startsOn })
      .from(employmentPeriods)
      .where(
        and(
          eq(employmentPeriods.organizationId, organizationId),
          eq(employmentPeriods.employeeId, employeeId),
          isNull(employmentPeriods.endsOn),
        ),
      )
      .for('update')
      .limit(1);
    if (period === undefined || period.startsOn >= endsOn) return null;
    await this.transaction
      .update(employmentPeriods)
      .set({ endsOn })
      .where(eq(employmentPeriods.id, period.id));
    await this.transaction
      .update(employees)
      .set({ status: 'INACTIVE' })
      .where(and(eq(employees.organizationId, organizationId), eq(employees.id, employeeId)));
    const accountId = await this.findEmployeeAccountId(organizationId, employeeId);
    if (accountId !== null) {
      await this.transaction
        .update(authUsers)
        .set({ active: false, updatedAt: new Date(changedAt) })
        .where(eq(authUsers.id, accountId));
      await this.transaction.delete(authSessions).where(eq(authSessions.userId, accountId));
      await this.transaction
        .delete(authVerifications)
        .where(eq(authVerifications.value, invitationAccountValue(accountId)));
    }
    return this.findEmployee(organizationId, employeeId, changedAt);
  }

  async findEmployee(
    organizationId: Parameters<AdministrationRepository['findEmployee']>[0],
    employeeId: Parameters<AdministrationRepository['findEmployee']>[1],
    at: Parameters<AdministrationRepository['findEmployee']>[2],
  ): Promise<AdministrationEmployeeRecord | null> {
    const [employee] = await this.transaction
      .select()
      .from(employees)
      .where(and(eq(employees.organizationId, organizationId), eq(employees.id, employeeId)))
      .limit(1);
    if (employee === undefined) return null;
    const periodRows = await this.transaction
      .select()
      .from(employmentPeriods)
      .where(
        and(
          eq(employmentPeriods.organizationId, organizationId),
          eq(employmentPeriods.employeeId, employeeId),
        ),
      )
      .orderBy(desc(employmentPeriods.startsOn), desc(employmentPeriods.id));
    const accountId = await this.findEmployeeAccountId(organizationId, employeeId);
    let account: AdministrationEmployeeRecord['account'] = null;
    let roles: readonly ApplicationRole[] = Object.freeze([]);
    if (accountId !== null) {
      const [accountRow] = await this.transaction
        .select({ active: authUsers.active, email: authUsers.email })
        .from(authUsers)
        .where(eq(authUsers.id, accountId))
        .limit(1);
      if (accountRow !== undefined) {
        account = Object.freeze({
          active: accountRow.active,
          email: accountRow.email,
          id: accountId,
          invitationPending: await this.invitationPending(accountId, at),
        });
      }
      roles = await this.listActiveRoles(organizationId, accountId);
    }
    return Object.freeze({
      account,
      displayName: employee.displayName,
      employeeNumber: employee.employeeNumber,
      employmentHistory: Object.freeze(
        periodRows.map((period) =>
          Object.freeze({
            endsOn:
              period.endsOn === null
                ? null
                : mapLocalDate(period.endsOn, 'employment_periods', 'ends_on'),
            id: mapDomainId<'EmploymentPeriod'>(period.id, 'employment_periods', 'id'),
            startsOn: mapLocalDate(period.startsOn, 'employment_periods', 'starts_on'),
          }),
        ),
      ),
      id: mapDomainId<'Employee'>(employee.id, 'employees', 'id'),
      organizationId,
      roles,
      status: employee.status,
    });
  }

  async findEmployeeAssignments(
    organizationId: Parameters<AdministrationRepository['findEmployeeAssignments']>[0],
    employeeId: Parameters<AdministrationRepository['findEmployeeAssignments']>[1],
    localDate: Parameters<AdministrationRepository['findEmployeeAssignments']>[2],
  ) {
    const [employee] = await this.transaction
      .select({ status: employees.status })
      .from(employees)
      .where(and(eq(employees.organizationId, organizationId), eq(employees.id, employeeId)))
      .limit(1);
    if (employee === undefined) return null;

    const teamRows = await this.transaction
      .select({
        endsOn: teamAssignments.endsOn,
        id: teamAssignments.id,
        startsOn: teamAssignments.startsOn,
        teamActive: teams.active,
        teamId: teams.id,
        teamName: teams.name,
      })
      .from(teamAssignments)
      .innerJoin(
        teams,
        and(eq(teams.organizationId, organizationId), eq(teams.id, teamAssignments.teamId)),
      )
      .where(
        and(
          eq(teamAssignments.organizationId, organizationId),
          eq(teamAssignments.employeeId, employeeId),
        ),
      )
      .orderBy(desc(teamAssignments.startsOn), desc(teamAssignments.id));
    const managerRows = await this.transaction
      .select({
        endsOn: managerAssignments.endsOn,
        id: managerAssignments.id,
        managerDisplayName: employees.displayName,
        managerEmployeeNumber: employees.employeeNumber,
        managerId: employees.id,
        managerStatus: employees.status,
        startsOn: managerAssignments.startsOn,
      })
      .from(managerAssignments)
      .innerJoin(
        employees,
        and(
          eq(employees.organizationId, organizationId),
          eq(employees.id, managerAssignments.managerEmployeeId),
        ),
      )
      .where(
        and(
          eq(managerAssignments.organizationId, organizationId),
          eq(managerAssignments.employeeId, employeeId),
        ),
      )
      .orderBy(desc(managerAssignments.startsOn), desc(managerAssignments.id));
    const activeTeamRows = await this.transaction
      .select({ active: teams.active, id: teams.id, name: teams.name })
      .from(teams)
      .where(and(eq(teams.organizationId, organizationId), eq(teams.active, true)))
      .orderBy(asc(teams.name), asc(teams.id))
      .limit(250);
    const managerCandidates = await this.transaction
      .selectDistinct({
        displayName: employees.displayName,
        employeeNumber: employees.employeeNumber,
        id: employees.id,
      })
      .from(employees)
      .innerJoin(
        employmentPeriods,
        and(
          eq(employmentPeriods.organizationId, organizationId),
          eq(employmentPeriods.employeeId, employees.id),
          lte(employmentPeriods.startsOn, localDate),
          or(isNull(employmentPeriods.endsOn), gt(employmentPeriods.endsOn, localDate)),
        ),
      )
      .innerJoin(
        accountEmployeeLinks,
        and(
          eq(accountEmployeeLinks.organizationId, organizationId),
          eq(accountEmployeeLinks.employeeId, employees.id),
          isNull(accountEmployeeLinks.unlinkedAt),
        ),
      )
      .innerJoin(
        authUsers,
        and(eq(authUsers.id, accountEmployeeLinks.userId), eq(authUsers.active, true)),
      )
      .innerJoin(
        accountRoleAssignments,
        and(
          eq(accountRoleAssignments.organizationId, organizationId),
          eq(accountRoleAssignments.userId, authUsers.id),
          eq(accountRoleAssignments.role, 'MANAGER'),
          isNull(accountRoleAssignments.revokedAt),
        ),
      )
      .where(
        and(
          eq(employees.organizationId, organizationId),
          eq(employees.status, 'ACTIVE'),
          ne(employees.id, employeeId),
        ),
      )
      .orderBy(asc(employees.displayName), asc(employees.employeeNumber), asc(employees.id))
      .limit(250);

    const teamHistory = Object.freeze(teamRows.map(mapAdministrationTeamAssignment));
    const managerHistory = Object.freeze(
      managerRows.map((row) =>
        Object.freeze({
          endsOn:
            row.endsOn === null ? null : mapLocalDate(row.endsOn, 'manager_assignments', 'ends_on'),
          id: mapDomainId<'ManagerAssignment'>(row.id, 'manager_assignments', 'id'),
          manager: Object.freeze({
            displayName: row.managerDisplayName,
            employeeNumber: row.managerEmployeeNumber,
            id: mapEmployeeId(row.managerId),
            status: row.managerStatus,
          }),
          startsOn: mapLocalDate(row.startsOn, 'manager_assignments', 'starts_on'),
        }),
      ),
    );
    return Object.freeze({
      activeTeams: Object.freeze(
        activeTeamRows.map((team) =>
          Object.freeze({
            active: team.active,
            currentMemberCount: 0,
            id: mapDomainId<'Team'>(team.id, 'teams', 'id'),
            name: team.name,
          }),
        ),
      ),
      currentManager:
        managerHistory.find((assignment) => assignmentContains(assignment, localDate)) ?? null,
      currentTeam:
        teamHistory.find((assignment) => assignmentContains(assignment, localDate)) ?? null,
      eligibleManagers: Object.freeze(
        managerCandidates.map((candidate) =>
          Object.freeze({
            displayName: candidate.displayName,
            employeeNumber: candidate.employeeNumber,
            id: mapEmployeeId(candidate.id),
          }),
        ),
      ),
      employeeStatus: employee.status,
      managerHistory,
      teamHistory,
    });
  }

  async findEmployeeSchedule(
    organizationId: Parameters<AdministrationRepository['findEmployeeSchedule']>[0],
    employeeId: Parameters<AdministrationRepository['findEmployeeSchedule']>[1],
  ) {
    const [employee] = await this.transaction
      .select({ status: employees.status })
      .from(employees)
      .where(and(eq(employees.organizationId, organizationId), eq(employees.id, employeeId)))
      .limit(1);
    if (employee === undefined) return null;
    const employmentRows = await this.transaction
      .select({
        endsOn: employmentPeriods.endsOn,
        id: employmentPeriods.id,
        startsOn: employmentPeriods.startsOn,
      })
      .from(employmentPeriods)
      .where(
        and(
          eq(employmentPeriods.organizationId, organizationId),
          eq(employmentPeriods.employeeId, employeeId),
        ),
      )
      .orderBy(asc(employmentPeriods.startsOn), asc(employmentPeriods.id));
    const assignmentRows = await this.transaction
      .select({
        assignmentEndsOn: scheduleAssignments.endsOn,
        assignmentId: scheduleAssignments.id,
        assignmentStartsOn: scheduleAssignments.startsOn,
        schedule: weeklySchedules,
      })
      .from(scheduleAssignments)
      .innerJoin(
        weeklySchedules,
        and(
          eq(weeklySchedules.organizationId, organizationId),
          eq(weeklySchedules.id, scheduleAssignments.scheduleId),
        ),
      )
      .where(
        and(
          eq(scheduleAssignments.organizationId, organizationId),
          eq(scheduleAssignments.employeeId, employeeId),
        ),
      )
      .orderBy(desc(scheduleAssignments.startsOn), desc(scheduleAssignments.id));
    const schedules = await this.listScheduleVersions(organizationId);
    const latestByName = new Map(
      schedules
        .filter(({ latestVersion }) => latestVersion)
        .map((schedule) => [schedule.name, schedule.version]),
    );
    return Object.freeze({
      employeeStatus: employee.status,
      employmentHistory: Object.freeze(
        employmentRows.map((row) =>
          Object.freeze({
            endsOn:
              row.endsOn === null
                ? null
                : mapLocalDate(row.endsOn, 'employment_periods', 'ends_on'),
            id: mapDomainId<'EmploymentPeriod'>(row.id, 'employment_periods', 'id'),
            startsOn: mapLocalDate(row.startsOn, 'employment_periods', 'starts_on'),
          }),
        ),
      ),
      history: Object.freeze(
        assignmentRows.map((row) =>
          Object.freeze({
            endsOn:
              row.assignmentEndsOn === null
                ? null
                : mapLocalDate(row.assignmentEndsOn, 'schedule_assignments', 'ends_on'),
            id: mapDomainId<'ScheduleAssignment'>(row.assignmentId, 'schedule_assignments', 'id'),
            schedule: mapAdministrationWeeklySchedule(
              row.schedule,
              latestByName.get(row.schedule.name) === row.schedule.version,
            ),
            startsOn: mapLocalDate(row.assignmentStartsOn, 'schedule_assignments', 'starts_on'),
          }),
        ),
      ),
      schedules,
    });
  }

  async listEmployees(input: Parameters<AdministrationRepository['listEmployees']>[0]) {
    const statusCondition = input.status === null ? undefined : eq(employees.status, input.status);
    const where = and(eq(employees.organizationId, input.organizationId), statusCondition);
    const [totalRow] = await this.transaction
      .select({ value: count() })
      .from(employees)
      .where(where);
    const rows = await this.transaction
      .select({ id: employees.id })
      .from(employees)
      .where(where)
      .orderBy(asc(employees.displayName), asc(employees.employeeNumber), asc(employees.id))
      .limit(input.limit)
      .offset(input.offset);
    const items: AdministrationEmployeeRecord[] = [];
    for (const row of rows) {
      const item = await this.findEmployee(input.organizationId, mapEmployeeId(row.id), input.at);
      if (item !== null) items.push(item);
    }
    return Object.freeze({ items: Object.freeze(items), total: totalRow?.value ?? 0 });
  }

  async listManagerAssignmentGraph(
    organizationId: Parameters<AdministrationRepository['listManagerAssignmentGraph']>[0],
  ) {
    const rows = await this.transaction
      .select({
        employeeId: managerAssignments.employeeId,
        endsOn: managerAssignments.endsOn,
        id: managerAssignments.id,
        managerEmployeeId: managerAssignments.managerEmployeeId,
        startsOn: managerAssignments.startsOn,
      })
      .from(managerAssignments)
      .where(eq(managerAssignments.organizationId, organizationId))
      .orderBy(asc(managerAssignments.startsOn), asc(managerAssignments.id));
    return Object.freeze(
      rows.map((row) =>
        Object.freeze({
          endsOn:
            row.endsOn === null ? null : mapLocalDate(row.endsOn, 'manager_assignments', 'ends_on'),
          id: row.id,
          startsOn: mapLocalDate(row.startsOn, 'manager_assignments', 'starts_on'),
          subjectId: row.employeeId,
          targetId: row.managerEmployeeId,
        }),
      ),
    );
  }

  async listScheduleVersions(
    organizationId: Parameters<AdministrationRepository['listScheduleVersions']>[0],
  ) {
    const rows = await this.transaction
      .select()
      .from(weeklySchedules)
      .where(eq(weeklySchedules.organizationId, organizationId))
      .orderBy(asc(weeklySchedules.name), desc(weeklySchedules.version), asc(weeklySchedules.id))
      .limit(250);
    const latestNames = new Set<string>();
    return Object.freeze(
      rows.map((row) => {
        const latestVersion = !latestNames.has(row.name);
        latestNames.add(row.name);
        return mapAdministrationWeeklySchedule(row, latestVersion);
      }),
    );
  }

  async listTeams(input: Parameters<AdministrationRepository['listTeams']>[0]) {
    const statusCondition = input.active === null ? undefined : eq(teams.active, input.active);
    const where = and(eq(teams.organizationId, input.organizationId), statusCondition);
    const [totalRow] = await this.transaction.select({ value: count() }).from(teams).where(where);
    const rows = await this.transaction
      .select({ active: teams.active, id: teams.id, name: teams.name })
      .from(teams)
      .where(where)
      .orderBy(asc(teams.name), asc(teams.id))
      .limit(input.limit)
      .offset(input.offset);
    const items = [];
    for (const row of rows) {
      const [memberCount] = await this.transaction
        .select({ value: count() })
        .from(teamAssignments)
        .innerJoin(
          employees,
          and(
            eq(employees.organizationId, input.organizationId),
            eq(employees.id, teamAssignments.employeeId),
            eq(employees.status, 'ACTIVE'),
          ),
        )
        .where(
          and(
            eq(teamAssignments.organizationId, input.organizationId),
            eq(teamAssignments.teamId, row.id),
            lte(teamAssignments.startsOn, input.localDate),
            or(isNull(teamAssignments.endsOn), gt(teamAssignments.endsOn, input.localDate)),
            sql`exists (
              select 1 from ${employmentPeriods}
              where ${employmentPeriods.organizationId} = ${input.organizationId}
                and ${employmentPeriods.employeeId} = ${teamAssignments.employeeId}
                and ${employmentPeriods.startsOn} <= ${input.localDate}
                and (${employmentPeriods.endsOn} is null or ${employmentPeriods.endsOn} > ${input.localDate})
            )`,
          ),
        );
      items.push(
        Object.freeze({
          active: row.active,
          currentMemberCount: memberCount?.value ?? 0,
          id: mapDomainId<'Team'>(row.id, 'teams', 'id'),
          name: row.name,
        }),
      );
    }
    return Object.freeze({ items: Object.freeze(items), total: totalRow?.value ?? 0 });
  }

  async listSystemAccounts(input: Parameters<AdministrationRepository['listSystemAccounts']>[0]) {
    const association = or(
      eq(accountRoleAssignments.organizationId, input.organizationId),
      eq(accountEmployeeLinks.organizationId, input.organizationId),
    );
    const accountIds = this.transaction
      .selectDistinct({ id: authUsers.id })
      .from(authUsers)
      .leftJoin(accountRoleAssignments, eq(accountRoleAssignments.userId, authUsers.id))
      .leftJoin(accountEmployeeLinks, eq(accountEmployeeLinks.userId, authUsers.id))
      .where(association);
    const [totalRow] = await this.transaction
      .select({ value: count() })
      .from(accountIds.as('administration_accounts'));
    const rows = await this.transaction
      .selectDistinct({ id: authUsers.id, name: authUsers.name })
      .from(authUsers)
      .leftJoin(accountRoleAssignments, eq(accountRoleAssignments.userId, authUsers.id))
      .leftJoin(accountEmployeeLinks, eq(accountEmployeeLinks.userId, authUsers.id))
      .where(association)
      .orderBy(asc(authUsers.name), asc(authUsers.id))
      .limit(input.limit)
      .offset(input.offset);
    const items: AdministrationSystemAccountRecord[] = [];
    for (const row of rows) {
      const item = await this.findSystemAccount(
        input.organizationId,
        mapDomainId<'Account'>(row.id, 'auth_users', 'id'),
        input.at,
      );
      if (item !== null) items.push(item);
    }
    return Object.freeze({ items: Object.freeze(items), total: totalRow?.value ?? 0 });
  }

  async replaceEmployeeRoles(
    organizationId: Parameters<AdministrationRepository['replaceEmployeeRoles']>[0],
    employeeId: Parameters<AdministrationRepository['replaceEmployeeRoles']>[1],
    roles: Parameters<AdministrationRepository['replaceEmployeeRoles']>[2],
    changedAt: Parameters<AdministrationRepository['replaceEmployeeRoles']>[3],
  ) {
    const accountId = await this.findEmployeeAccountId(organizationId, employeeId);
    if (accountId === null) return null;
    await this.replaceRoles(organizationId, accountId, roles, changedAt, false);
    return this.findEmployee(organizationId, employeeId, changedAt);
  }

  async reissueInvitation(input: Parameters<AdministrationRepository['reissueInvitation']>[0]) {
    if (!(await this.accountBelongsToOrganization(input.organizationId, input.accountId)))
      return false;
    await this.transaction
      .delete(authVerifications)
      .where(eq(authVerifications.value, invitationAccountValue(input.accountId)));
    await this.insertInvitation(input.accountId, input.invitationIdentifier, input.expiresAt);
    return true;
  }

  async revokeAccountSession(
    organizationId: Parameters<AdministrationRepository['revokeAccountSession']>[0],
    accountId: Parameters<AdministrationRepository['revokeAccountSession']>[1],
    sessionId: Parameters<AdministrationRepository['revokeAccountSession']>[2],
  ) {
    if (!(await this.accountBelongsToOrganization(organizationId, accountId))) return false;
    const rows = await this.transaction
      .delete(authSessions)
      .where(and(eq(authSessions.userId, accountId), eq(authSessions.id, sessionId)))
      .returning({ id: authSessions.id });
    return rows.length === 1;
  }

  async setAccountActive(
    organizationId: Parameters<AdministrationRepository['setAccountActive']>[0],
    accountId: Parameters<AdministrationRepository['setAccountActive']>[1],
    active: Parameters<AdministrationRepository['setAccountActive']>[2],
    changedAt: Parameters<AdministrationRepository['setAccountActive']>[3],
  ) {
    if (!(await this.accountBelongsToOrganization(organizationId, accountId))) return false;
    if (active) {
      if (await this.invitationPending(accountId, changedAt)) return false;
      const [employeeLink] = await this.transaction
        .select({ employeeStatus: employees.status })
        .from(accountEmployeeLinks)
        .innerJoin(employees, eq(employees.id, accountEmployeeLinks.employeeId))
        .where(
          and(
            eq(accountEmployeeLinks.organizationId, organizationId),
            eq(accountEmployeeLinks.userId, accountId),
            isNull(accountEmployeeLinks.unlinkedAt),
          ),
        )
        .limit(1);
      if (employeeLink !== undefined && employeeLink.employeeStatus !== 'ACTIVE') return false;
    }
    const rows = await this.transaction
      .update(authUsers)
      .set({ active, updatedAt: new Date(changedAt) })
      .where(and(eq(authUsers.id, accountId), sql`${authUsers.active} <> ${active}`))
      .returning({ id: authUsers.id });
    if (rows.length === 0) return false;
    await this.transaction.delete(authSessions).where(eq(authSessions.userId, accountId));
    if (!active) {
      await this.transaction
        .delete(authVerifications)
        .where(eq(authVerifications.value, invitationAccountValue(accountId)));
    }
    return true;
  }

  async setSystemRole(
    organizationId: Parameters<AdministrationRepository['setSystemRole']>[0],
    accountId: Parameters<AdministrationRepository['setSystemRole']>[1],
    enabled: Parameters<AdministrationRepository['setSystemRole']>[2],
    changedAt: Parameters<AdministrationRepository['setSystemRole']>[3],
  ) {
    if (!(await this.accountBelongsToOrganization(organizationId, accountId))) return false;
    const [current] = await this.transaction
      .select({ id: accountRoleAssignments.id })
      .from(accountRoleAssignments)
      .where(
        and(
          eq(accountRoleAssignments.organizationId, organizationId),
          eq(accountRoleAssignments.userId, accountId),
          eq(accountRoleAssignments.role, 'SYSTEM_ADMINISTRATOR'),
          isNull(accountRoleAssignments.revokedAt),
        ),
      )
      .for('update')
      .limit(1);
    if ((enabled && current !== undefined) || (!enabled && current === undefined)) return false;
    if (enabled) {
      await this.transaction.insert(accountRoleAssignments).values({
        assignedAt: new Date(changedAt),
        organizationId,
        role: 'SYSTEM_ADMINISTRATOR',
        userId: accountId,
      });
    } else if (current !== undefined) {
      await this.transaction
        .update(accountRoleAssignments)
        .set({ revokedAt: new Date(changedAt) })
        .where(eq(accountRoleAssignments.id, current.id));
    }
    await this.transaction.delete(authSessions).where(eq(authSessions.userId, accountId));
    return true;
  }

  async setTeamActive(
    organizationId: Parameters<AdministrationRepository['setTeamActive']>[0],
    teamId: Parameters<AdministrationRepository['setTeamActive']>[1],
    active: Parameters<AdministrationRepository['setTeamActive']>[2],
    localDate: Parameters<AdministrationRepository['setTeamActive']>[3],
  ) {
    const [team] = await this.transaction
      .select({ active: teams.active })
      .from(teams)
      .where(and(eq(teams.organizationId, organizationId), eq(teams.id, teamId)))
      .for('update')
      .limit(1);
    if (team === undefined || team.active === active) return false;
    if (!active) {
      const [assignment] = await this.transaction
        .select({ id: teamAssignments.id })
        .from(teamAssignments)
        .where(
          and(
            eq(teamAssignments.organizationId, organizationId),
            eq(teamAssignments.teamId, teamId),
            or(isNull(teamAssignments.endsOn), gt(teamAssignments.endsOn, localDate)),
          ),
        )
        .limit(1);
      if (assignment !== undefined) return false;
    }
    const rows = await this.transaction
      .update(teams)
      .set({ active })
      .where(and(eq(teams.organizationId, organizationId), eq(teams.id, teamId)))
      .returning({ id: teams.id });
    return rows.length === 1;
  }

  private async closeManagerAssignment(
    input: Parameters<AdministrationRepository['applyManagerAssignmentTransition']>[0],
  ): Promise<string | null> {
    if (input.transition.closeAssignmentId === null) return null;
    const rows = await this.transaction
      .update(managerAssignments)
      .set({ endsOn: input.transition.effectiveFrom })
      .where(
        and(
          eq(managerAssignments.organizationId, input.organizationId),
          eq(managerAssignments.employeeId, input.employeeId),
          eq(
            managerAssignments.id,
            mapDomainId<'ManagerAssignment'>(
              input.transition.closeAssignmentId,
              'manager_assignments',
              'id',
            ),
          ),
          lt(managerAssignments.startsOn, input.transition.effectiveFrom),
          or(
            isNull(managerAssignments.endsOn),
            gt(managerAssignments.endsOn, input.transition.effectiveFrom),
          ),
        ),
      )
      .returning({ id: managerAssignments.id });
    return rows[0]?.id ?? null;
  }

  private async closeScheduleAssignment(
    input: Parameters<AdministrationRepository['applyScheduleAssignmentTransition']>[0],
  ): Promise<string | null> {
    if (input.transition.closeAssignmentId === null) return null;
    const rows = await this.transaction
      .update(scheduleAssignments)
      .set({ endsOn: input.transition.effectiveFrom })
      .where(
        and(
          eq(scheduleAssignments.organizationId, input.organizationId),
          eq(scheduleAssignments.employeeId, input.employeeId),
          eq(
            scheduleAssignments.id,
            mapDomainId<'ScheduleAssignment'>(
              input.transition.closeAssignmentId,
              'schedule_assignments',
              'id',
            ),
          ),
          lt(scheduleAssignments.startsOn, input.transition.effectiveFrom),
          or(
            isNull(scheduleAssignments.endsOn),
            gt(scheduleAssignments.endsOn, input.transition.effectiveFrom),
          ),
        ),
      )
      .returning({ id: scheduleAssignments.id });
    return rows[0]?.id ?? null;
  }

  private async closeTeamAssignment(
    input: Parameters<AdministrationRepository['applyTeamAssignmentTransition']>[0],
  ): Promise<string | null> {
    if (input.transition.closeAssignmentId === null) return null;
    const rows = await this.transaction
      .update(teamAssignments)
      .set({ endsOn: input.transition.effectiveFrom })
      .where(
        and(
          eq(teamAssignments.organizationId, input.organizationId),
          eq(teamAssignments.employeeId, input.employeeId),
          eq(
            teamAssignments.id,
            mapDomainId<'TeamAssignment'>(
              input.transition.closeAssignmentId,
              'team_assignments',
              'id',
            ),
          ),
          lt(teamAssignments.startsOn, input.transition.effectiveFrom),
          or(
            isNull(teamAssignments.endsOn),
            gt(teamAssignments.endsOn, input.transition.effectiveFrom),
          ),
        ),
      )
      .returning({ id: teamAssignments.id });
    return rows[0]?.id ?? null;
  }

  private async lockActiveEmployee(
    organizationId: DomainId<'Organization'>,
    employeeId: DomainId<'Employee'>,
  ): Promise<boolean> {
    const [employee] = await this.transaction
      .select({ id: employees.id })
      .from(employees)
      .where(
        and(
          eq(employees.organizationId, organizationId),
          eq(employees.id, employeeId),
          eq(employees.status, 'ACTIVE'),
        ),
      )
      .for('update')
      .limit(1);
    return employee !== undefined;
  }

  private async accountBelongsToOrganization(
    organizationId: DomainId<'Organization'>,
    accountId: DomainId<'Account'>,
  ) {
    const [row] = await this.transaction
      .select({ id: authUsers.id })
      .from(authUsers)
      .leftJoin(
        accountRoleAssignments,
        and(
          eq(accountRoleAssignments.userId, authUsers.id),
          eq(accountRoleAssignments.organizationId, organizationId),
        ),
      )
      .leftJoin(
        accountEmployeeLinks,
        and(
          eq(accountEmployeeLinks.userId, authUsers.id),
          eq(accountEmployeeLinks.organizationId, organizationId),
        ),
      )
      .where(
        and(
          eq(authUsers.id, accountId),
          or(isNotNull(accountRoleAssignments.id), isNotNull(accountEmployeeLinks.id)),
        ),
      )
      .limit(1);
    return row !== undefined;
  }

  private async findAccountOrganization(accountId: DomainId<'Account'>) {
    const roleRows = await this.transaction
      .selectDistinct({ organizationId: accountRoleAssignments.organizationId })
      .from(accountRoleAssignments)
      .where(
        and(eq(accountRoleAssignments.userId, accountId), isNull(accountRoleAssignments.revokedAt)),
      );
    const linkRows = await this.transaction
      .selectDistinct({ organizationId: accountEmployeeLinks.organizationId })
      .from(accountEmployeeLinks)
      .where(
        and(eq(accountEmployeeLinks.userId, accountId), isNull(accountEmployeeLinks.unlinkedAt)),
      );
    const ids = new Set([...roleRows, ...linkRows].map(({ organizationId }) => organizationId));
    if (ids.size !== 1) return null;
    const value = [...ids][0];
    return value === undefined
      ? null
      : mapDomainId<'Organization'>(value, 'account_role_assignments', 'organization_id');
  }

  private async findEmployeeAccountId(
    organizationId: DomainId<'Organization'>,
    employeeId: DomainId<'Employee'>,
  ) {
    const [row] = await this.transaction
      .select({ accountId: accountEmployeeLinks.userId })
      .from(accountEmployeeLinks)
      .where(
        and(
          eq(accountEmployeeLinks.organizationId, organizationId),
          eq(accountEmployeeLinks.employeeId, employeeId),
          isNull(accountEmployeeLinks.unlinkedAt),
        ),
      )
      .limit(1);
    return row === undefined
      ? null
      : mapDomainId<'Account'>(row.accountId, 'account_employee_links', 'user_id');
  }

  private async findSystemAccount(
    organizationId: DomainId<'Organization'>,
    accountId: DomainId<'Account'>,
    at: Instant,
  ): Promise<AdministrationSystemAccountRecord | null> {
    if (!(await this.accountBelongsToOrganization(organizationId, accountId))) return null;
    const [row] = await this.transaction
      .select({
        active: authUsers.active,
        email: authUsers.email,
        id: authUsers.id,
        name: authUsers.name,
      })
      .from(authUsers)
      .where(eq(authUsers.id, accountId))
      .limit(1);
    if (row === undefined) return null;
    const [link] = await this.transaction
      .select({ id: accountEmployeeLinks.id })
      .from(accountEmployeeLinks)
      .where(
        and(
          eq(accountEmployeeLinks.organizationId, organizationId),
          eq(accountEmployeeLinks.userId, accountId),
          isNull(accountEmployeeLinks.unlinkedAt),
        ),
      )
      .limit(1);
    const roles = await this.listActiveRoles(organizationId, accountId);
    const atDate = new Date(at);
    const sessionRows = await this.transaction
      .select({
        createdAt: authSessions.createdAt,
        expiresAt: authSessions.expiresAt,
        id: authSessions.id,
        lastActiveAt: authSessions.updatedAt,
        userAgent: authSessions.userAgent,
        userId: authSessions.userId,
      })
      .from(authSessions)
      .where(and(eq(authSessions.userId, accountId), gt(authSessions.expiresAt, atDate)))
      .orderBy(desc(authSessions.updatedAt), desc(authSessions.id))
      .limit(50);
    return Object.freeze({
      active: row.active,
      employeeLinked: link !== undefined,
      email: row.email,
      id: accountId,
      invitationPending: await this.invitationPending(accountId, at),
      name: row.name,
      sessions: Object.freeze(sessionRows.map(mapAccountSession)),
      systemAdministrator: roles.includes('SYSTEM_ADMINISTRATOR'),
    });
  }

  private async insertInvitation(
    accountId: DomainId<'Account'>,
    identifier: string,
    expiresAt: Instant,
  ) {
    await this.transaction.insert(authVerifications).values({
      expiresAt: new Date(expiresAt),
      identifier,
      value: invitationAccountValue(accountId),
    });
  }

  private async invitationPending(accountId: DomainId<'Account'>, at: Instant) {
    const [row] = await this.transaction
      .select({ id: authVerifications.id })
      .from(authVerifications)
      .where(
        and(
          eq(authVerifications.value, invitationAccountValue(accountId)),
          gt(authVerifications.expiresAt, new Date(at)),
        ),
      )
      .limit(1);
    return row !== undefined;
  }

  private async listActiveRoles(
    organizationId: DomainId<'Organization'>,
    accountId: DomainId<'Account'>,
  ) {
    const rows = await this.transaction
      .select({ role: accountRoleAssignments.role })
      .from(accountRoleAssignments)
      .where(
        and(
          eq(accountRoleAssignments.organizationId, organizationId),
          eq(accountRoleAssignments.userId, accountId),
          isNull(accountRoleAssignments.revokedAt),
        ),
      )
      .orderBy(asc(accountRoleAssignments.role));
    return Object.freeze(rows.map(({ role }) => role));
  }

  private async replaceRoles(
    organizationId: DomainId<'Organization'>,
    accountId: DomainId<'Account'>,
    roles: readonly ApplicationRole[],
    changedAt: Instant,
    includeSystemRole: boolean,
  ) {
    const requested = [...new Set(roles)].filter(
      (role) => includeSystemRole || role !== 'SYSTEM_ADMINISTRATOR',
    );
    const current = await this.listActiveRoles(organizationId, accountId);
    const managedCurrent = current.filter(
      (role) => includeSystemRole || role !== 'SYSTEM_ADMINISTRATOR',
    );
    const removed = managedCurrent.filter((role) => !requested.includes(role));
    const added = requested.filter((role) => !managedCurrent.includes(role));
    if (removed.length > 0) {
      await this.transaction
        .update(accountRoleAssignments)
        .set({ revokedAt: new Date(changedAt) })
        .where(
          and(
            eq(accountRoleAssignments.organizationId, organizationId),
            eq(accountRoleAssignments.userId, accountId),
            isNull(accountRoleAssignments.revokedAt),
            inArray(accountRoleAssignments.role, removed),
          ),
        );
    }
    if (added.length > 0) {
      await this.transaction.insert(accountRoleAssignments).values(
        added.map((role) => ({
          assignedAt: new Date(changedAt),
          organizationId,
          role,
          userId: accountId,
        })),
      );
    }
    if (removed.length > 0 || added.length > 0) {
      await this.transaction.delete(authSessions).where(eq(authSessions.userId, accountId));
    }
  }
}

function mapAdministrationWeeklySchedule(
  row: Readonly<{
    fridayMinutes: number;
    id: string;
    mondayMinutes: number;
    name: string;
    saturdayMinutes: number;
    sundayMinutes: number;
    thursdayMinutes: number;
    tuesdayMinutes: number;
    version: number;
    wednesdayMinutes: number;
  }>,
  latestVersion: boolean,
): AdministrationWeeklyScheduleRecord {
  const scheduledMinutes = Object.freeze({
    FRIDAY: mapNonNegativeMinutes(row.fridayMinutes, 'weekly_schedules', 'friday_minutes'),
    MONDAY: mapNonNegativeMinutes(row.mondayMinutes, 'weekly_schedules', 'monday_minutes'),
    SATURDAY: mapNonNegativeMinutes(row.saturdayMinutes, 'weekly_schedules', 'saturday_minutes'),
    SUNDAY: mapNonNegativeMinutes(row.sundayMinutes, 'weekly_schedules', 'sunday_minutes'),
    THURSDAY: mapNonNegativeMinutes(row.thursdayMinutes, 'weekly_schedules', 'thursday_minutes'),
    TUESDAY: mapNonNegativeMinutes(row.tuesdayMinutes, 'weekly_schedules', 'tuesday_minutes'),
    WEDNESDAY: mapNonNegativeMinutes(row.wednesdayMinutes, 'weekly_schedules', 'wednesday_minutes'),
  });
  return Object.freeze({
    id: mapDomainId<'WorkScheduleVersion'>(row.id, 'weekly_schedules', 'id'),
    latestVersion,
    name: row.name,
    scheduledMinutes,
    version: row.version,
    weeklyTotalMinutes: Object.values(scheduledMinutes).reduce(
      (total, minutes) => total + minutes,
      0,
    ),
  });
}

function scheduleMinutesEqual(
  schedule: AdministrationWeeklyScheduleRecord,
  minutes: AdministrationWeeklyScheduleRecord['scheduledMinutes'],
): boolean {
  return Object.entries(minutes).every(
    ([weekday, value]) => schedule.scheduledMinutes[weekday as keyof typeof minutes] === value,
  );
}

function mapAdministrationTeamAssignment(
  row: Readonly<{
    endsOn: string | null;
    id: string;
    startsOn: string;
    teamActive: boolean;
    teamId: string;
    teamName: string;
  }>,
) {
  return Object.freeze({
    endsOn: row.endsOn === null ? null : mapLocalDate(row.endsOn, 'team_assignments', 'ends_on'),
    id: mapDomainId<'TeamAssignment'>(row.id, 'team_assignments', 'id'),
    startsOn: mapLocalDate(row.startsOn, 'team_assignments', 'starts_on'),
    team: Object.freeze({
      active: row.teamActive,
      id: mapDomainId<'Team'>(row.teamId, 'teams', 'id'),
      name: row.teamName,
    }),
  });
}

function assignmentContains(
  assignment: Readonly<{ endsOn: LocalDate | null; startsOn: LocalDate }>,
  localDate: LocalDate,
) {
  return (
    assignment.startsOn <= localDate &&
    (assignment.endsOn === null || localDate < assignment.endsOn)
  );
}

const INVITATION_ACCOUNT_VALUE_PREFIX = 'workledger-invitation-account:';

function invitationAccountValue(accountId: DomainId<'Account'>): string {
  return `${INVITATION_ACCOUNT_VALUE_PREFIX}${accountId}`;
}

class PostgresApprovalInboxRepository implements ApprovalInboxRepository {
  constructor(private readonly transaction: RepositoryTransaction) {}

  async list(input: ListApprovalInboxInput) {
    const scopeCondition = employeeScopeCondition(input);
    const selfExclusion =
      input.actorEmployeeId === null ? undefined : sql`${employees.id} <> ${input.actorEmployeeId}`;
    const currentManagerJoin = and(
      eq(managerAssignments.organizationId, input.organizationId),
      eq(managerAssignments.employeeId, employees.id),
      lte(managerAssignments.startsOn, input.localDate),
      or(isNull(managerAssignments.endsOn), gt(managerAssignments.endsOn, input.localDate)),
    );
    const currentTeamJoin = and(
      eq(teamAssignments.organizationId, input.organizationId),
      eq(teamAssignments.employeeId, employees.id),
      lte(teamAssignments.startsOn, input.localDate),
      or(isNull(teamAssignments.endsOn), gt(teamAssignments.endsOn, input.localDate)),
    );

    const correctionQuery = this.transaction
      .select({
        affectedEndDate: sql<LocalDate>`${correctionRequests.localDate}`.as('affected_end_date'),
        affectedStartDate: sql<LocalDate>`${correctionRequests.localDate}`.as(
          'affected_start_date',
        ),
        employeeDisplayName: sql<string>`${employees.displayName}`.as('employee_display_name'),
        employeeId: sql<string>`${employees.id}`.as('employee_id'),
        id: sql<string>`${correctionRequests.id}`.as('item_id'),
        status: sql<ApprovalInboxItemRecord['status']>`case
          when ${correctionRequests.status} = 'CHANGES_REQUESTED' then 'WAITING_ON_EMPLOYEE'
          when ${correctionRequests.status} = 'APPROVED' and exists (
            select 1 from ${appliedCorrections}
            where ${appliedCorrections.organizationId} = ${input.organizationId}
              and ${appliedCorrections.correctionRequestId} = ${correctionRequests.id}
          ) then 'COMPLETED'
          when ${correctionRequests.status} in ('SUBMITTED', 'APPROVED') then 'ACTION_REQUIRED'
          else 'COMPLETED'
        end`.as('status'),
        submittedAt: sql<string>`${correctionRequests.createdAt}`.as('submitted_at'),
        teamId: sql<string | null>`${teams.id}`.as('team_id'),
        teamName: sql<string | null>`${teams.name}`.as('team_name'),
        type: sql<ApprovalInboxItemRecord['type']>`'CORRECTION'`.as('type'),
        version: sql<number>`${correctionRequests.version}`.as('version'),
      })
      .from(correctionRequests)
      .innerJoin(
        employees,
        and(
          eq(employees.organizationId, input.organizationId),
          eq(employees.id, correctionRequests.employeeId),
        ),
      )
      .leftJoin(managerAssignments, currentManagerJoin)
      .leftJoin(teamAssignments, currentTeamJoin)
      .leftJoin(
        teams,
        and(eq(teams.organizationId, input.organizationId), eq(teams.id, teamAssignments.teamId)),
      )
      .where(
        and(
          eq(correctionRequests.organizationId, input.organizationId),
          scopeCondition,
          selfExclusion,
        ),
      );

    const absenceQuery = this.transaction
      .select({
        affectedEndDate: sql<LocalDate>`max(${absenceCoverageSegments.localDate})`.as(
          'affected_end_date',
        ),
        affectedStartDate: sql<LocalDate>`min(${absenceCoverageSegments.localDate})`.as(
          'affected_start_date',
        ),
        employeeDisplayName: sql<string>`${employees.displayName}`.as('employee_display_name'),
        employeeId: sql<string>`${employees.id}`.as('employee_id'),
        id: sql<string>`${absenceRequests.id}`.as('item_id'),
        status: sql<ApprovalInboxItemRecord['status']>`case
          when ${absenceRequests.status} = 'CHANGES_REQUESTED' then 'WAITING_ON_EMPLOYEE'
          when ${absenceRequests.status} in ('SUBMITTED', 'REPORTED') then 'ACTION_REQUIRED'
          else 'COMPLETED'
        end`.as('status'),
        submittedAt: sql<string>`${absenceRequests.submittedAt}`.as('submitted_at'),
        teamId: sql<string | null>`${teams.id}`.as('team_id'),
        teamName: sql<string | null>`${teams.name}`.as('team_name'),
        type: sql<ApprovalInboxItemRecord['type']>`'ABSENCE'`.as('type'),
        version: sql<number>`${absenceRequests.version}`.as('version'),
      })
      .from(absenceRequests)
      .innerJoin(
        employees,
        and(
          eq(employees.organizationId, input.organizationId),
          eq(employees.id, absenceRequests.employeeId),
        ),
      )
      .innerJoin(
        absenceCoverageSegments,
        and(
          eq(absenceCoverageSegments.organizationId, input.organizationId),
          eq(absenceCoverageSegments.absenceRequestId, absenceRequests.id),
        ),
      )
      .leftJoin(managerAssignments, currentManagerJoin)
      .leftJoin(teamAssignments, currentTeamJoin)
      .leftJoin(
        teams,
        and(eq(teams.organizationId, input.organizationId), eq(teams.id, teamAssignments.teamId)),
      )
      .where(
        and(
          eq(absenceRequests.organizationId, input.organizationId),
          scopeCondition,
          selfExclusion,
        ),
      )
      .groupBy(
        absenceRequests.id,
        employees.id,
        teams.id,
        teams.name,
        absenceRequests.status,
        absenceRequests.submittedAt,
        absenceRequests.version,
      );

    const cancellationQuery = this.transaction
      .select({
        affectedEndDate: sql<LocalDate>`max(${absenceCoverageSegments.localDate})`.as(
          'affected_end_date',
        ),
        affectedStartDate: sql<LocalDate>`min(${absenceCoverageSegments.localDate})`.as(
          'affected_start_date',
        ),
        employeeDisplayName: sql<string>`${employees.displayName}`.as('employee_display_name'),
        employeeId: sql<string>`${employees.id}`.as('employee_id'),
        id: sql<string>`${absenceCancellations.id}`.as('item_id'),
        status: sql<ApprovalInboxItemRecord['status']>`case
          when ${absenceCancellations.status} = 'CHANGES_REQUESTED' then 'WAITING_ON_EMPLOYEE'
          when ${absenceCancellations.status} = 'PENDING_DECISION' then 'ACTION_REQUIRED'
          else 'COMPLETED'
        end`.as('status'),
        submittedAt: sql<string>`${absenceCancellations.submittedAt}`.as('submitted_at'),
        teamId: sql<string | null>`${teams.id}`.as('team_id'),
        teamName: sql<string | null>`${teams.name}`.as('team_name'),
        type: sql<ApprovalInboxItemRecord['type']>`'CANCELLATION'`.as('type'),
        version: sql<number>`${absenceCancellations.version}`.as('version'),
      })
      .from(absenceCancellations)
      .innerJoin(
        employees,
        and(
          eq(employees.organizationId, input.organizationId),
          eq(employees.id, absenceCancellations.employeeId),
        ),
      )
      .innerJoin(
        absenceCancellationSegments,
        and(
          eq(absenceCancellationSegments.organizationId, input.organizationId),
          eq(absenceCancellationSegments.absenceCancellationId, absenceCancellations.id),
        ),
      )
      .innerJoin(
        absenceCoverageSegments,
        and(
          eq(absenceCoverageSegments.organizationId, input.organizationId),
          eq(absenceCoverageSegments.id, absenceCancellationSegments.absenceCoverageSegmentId),
        ),
      )
      .leftJoin(managerAssignments, currentManagerJoin)
      .leftJoin(teamAssignments, currentTeamJoin)
      .leftJoin(
        teams,
        and(eq(teams.organizationId, input.organizationId), eq(teams.id, teamAssignments.teamId)),
      )
      .where(
        and(
          eq(absenceCancellations.organizationId, input.organizationId),
          scopeCondition,
          selfExclusion,
        ),
      )
      .groupBy(
        absenceCancellations.id,
        employees.id,
        teams.id,
        teams.name,
        absenceCancellations.status,
        absenceCancellations.submittedAt,
        absenceCancellations.version,
      );

    const monthlyPeriodQuery = this.transaction
      .select({
        affectedEndDate:
          sql<LocalDate>`(${monthlyPeriods.monthStart} + interval '1 month - 1 day')::date`.as(
            'affected_end_date',
          ),
        affectedStartDate: sql<LocalDate>`${monthlyPeriods.monthStart}`.as('affected_start_date'),
        employeeDisplayName: sql<string>`${employees.displayName}`.as('employee_display_name'),
        employeeId: sql<string>`${employees.id}`.as('employee_id'),
        id: sql<string>`${monthlyPeriods.id}`.as('item_id'),
        status: sql<ApprovalInboxItemRecord['status']>`case
          when ${monthlyPeriods.status} = 'CHANGES_REQUESTED' then 'WAITING_ON_EMPLOYEE'
          when ${monthlyPeriods.status} in ('SUBMITTED', 'APPROVED') then 'ACTION_REQUIRED'
          else 'COMPLETED'
        end`.as('status'),
        submittedAt: sql<string>`${monthlyPeriods.submittedAt}`.as('submitted_at'),
        teamId: sql<string | null>`${teams.id}`.as('team_id'),
        teamName: sql<string | null>`${teams.name}`.as('team_name'),
        type: sql<ApprovalInboxItemRecord['type']>`'MONTHLY_PERIOD'`.as('type'),
        version: sql<number>`${monthlyPeriods.version}`.as('version'),
      })
      .from(monthlyPeriods)
      .innerJoin(
        employees,
        and(
          eq(employees.organizationId, input.organizationId),
          eq(employees.id, monthlyPeriods.employeeId),
        ),
      )
      .leftJoin(managerAssignments, currentManagerJoin)
      .leftJoin(teamAssignments, currentTeamJoin)
      .leftJoin(
        teams,
        and(eq(teams.organizationId, input.organizationId), eq(teams.id, teamAssignments.teamId)),
      )
      .where(
        and(
          eq(monthlyPeriods.organizationId, input.organizationId),
          inArray(monthlyPeriods.status, ['SUBMITTED', 'CHANGES_REQUESTED', 'APPROVED', 'LOCKED']),
          isNotNull(monthlyPeriods.submittedAt),
          scopeCondition,
          selfExclusion,
        ),
      );

    const unified = unionAll(
      correctionQuery,
      absenceQuery,
      cancellationQuery,
      monthlyPeriodQuery,
    ).as('approval_inbox');
    const filters = and(
      input.employeeId === null ? undefined : eq(unified.employeeId, input.employeeId),
      input.type === 'ALL' ? undefined : eq(unified.type, input.type),
      input.status === 'ALL' ? undefined : eq(unified.status, input.status),
      input.teamId === null ? undefined : eq(unified.teamId, input.teamId),
      input.from === null ? undefined : gte(unified.affectedEndDate, input.from),
      input.to === null ? undefined : lte(unified.affectedStartDate, input.to),
    );
    const direction = input.direction === 'ASC' ? asc : desc;
    const primarySort =
      input.sort === 'AFFECTED_DATE'
        ? unified.affectedStartDate
        : input.sort === 'EMPLOYEE'
          ? sql`lower(${unified.employeeDisplayName})`
          : unified.submittedAt;
    const rows = await this.transaction
      .select()
      .from(unified)
      .where(filters)
      .orderBy(
        direction(primarySort),
        direction(unified.submittedAt),
        direction(unified.type),
        direction(unified.id),
      )
      .limit(input.limit)
      .offset(input.offset);
    const [countRow] = await this.transaction
      .select({ total: sql<number>`count(*)::integer`.mapWith(Number) })
      .from(unified)
      .where(filters);
    const teamRows = await this.transaction
      .selectDistinct({ id: unified.teamId, name: unified.teamName })
      .from(unified)
      .where(isNotNull(unified.teamId))
      .orderBy(asc(unified.teamName), asc(unified.teamId));

    return Object.freeze({
      items: Object.freeze(rows.map(mapApprovalInboxItem)),
      teams: Object.freeze(
        teamRows.map((team) => {
          if (team.id === null || team.name === null) {
            throw new DatabaseValueError('teams', 'id');
          }
          return Object.freeze({
            id: mapDomainId<'Team'>(team.id, 'teams', 'id'),
            name: team.name,
          });
        }),
      ),
      total: countRow?.total ?? 0,
    });
  }
}

class PostgresReportRepository implements ReportRepository {
  constructor(private readonly transaction: RepositoryTransaction) {}

  async listMonthlyTime(input: ReportRangeInput) {
    if (input.authorizedEmployeeIds.length === 0) {
      return Object.freeze({
        items: Object.freeze([]),
        summary: emptyMonthlyTimeReportSummary(),
        total: 0,
      });
    }

    const rows = await this.transaction
      .select({
        balanceMinutes:
          sql<number>`coalesce(sum(${dailyProjections.balanceMinutes}), 0)::integer`.mapWith(
            Number,
          ),
        creditedMinutes:
          sql<number>`coalesce(sum(${dailyProjections.creditedMinutes}), 0)::integer`.mapWith(
            Number,
          ),
        employeeDisplayName: employees.displayName,
        employeeId: employees.id,
        expectedMinutes:
          sql<number>`coalesce(sum(${dailyProjections.expectedMinutes}), 0)::integer`.mapWith(
            Number,
          ),
        incompleteRecordCount:
          sql<number>`count(*) filter (where ${dailyProjections.calculationStatus} = 'INCOMPLETE')::integer`.mapWith(
            Number,
          ),
        monthStart: monthlyPeriods.monthStart,
        monthlyPeriodId: monthlyPeriods.id,
        workedMinutes:
          sql<number>`coalesce(sum(${dailyProjections.workedMinutes}), 0)::integer`.mapWith(Number),
        workflowStatus: monthlyPeriods.status,
      })
      .from(monthlyPeriods)
      .innerJoin(
        employees,
        and(
          eq(employees.organizationId, input.organizationId),
          eq(employees.id, monthlyPeriods.employeeId),
        ),
      )
      .innerJoin(
        dailyProjections,
        and(
          eq(dailyProjections.organizationId, input.organizationId),
          eq(dailyProjections.employeeId, monthlyPeriods.employeeId),
          sql`date_trunc('month', ${dailyProjections.localDate}::timestamp)::date = ${monthlyPeriods.monthStart}`,
          gte(dailyProjections.localDate, input.from),
          lte(dailyProjections.localDate, input.to),
        ),
      )
      .where(
        and(
          eq(monthlyPeriods.organizationId, input.organizationId),
          inArray(monthlyPeriods.employeeId, [...input.authorizedEmployeeIds]),
        ),
      )
      .groupBy(
        monthlyPeriods.id,
        monthlyPeriods.monthStart,
        monthlyPeriods.status,
        employees.id,
        employees.displayName,
      );

    const adjustmentRows = await this.transaction
      .select({
        deltaMinutes:
          sql<number>`coalesce(sum(${postLockAdjustments.minutes}), 0)::integer`.mapWith(Number),
        monthlyPeriodId: approvedMonthlySnapshots.monthlyPeriodId,
      })
      .from(postLockAdjustments)
      .innerJoin(
        approvedMonthlySnapshots,
        and(
          eq(approvedMonthlySnapshots.organizationId, input.organizationId),
          eq(approvedMonthlySnapshots.id, postLockAdjustments.monthlySnapshotId),
        ),
      )
      .where(
        and(
          eq(postLockAdjustments.organizationId, input.organizationId),
          inArray(postLockAdjustments.employeeId, [...input.authorizedEmployeeIds]),
          gte(postLockAdjustments.localDate, input.from),
          lte(postLockAdjustments.localDate, input.to),
        ),
      )
      .groupBy(approvedMonthlySnapshots.monthlyPeriodId);
    const adjustmentByPeriod = new Map(
      adjustmentRows.map((row) => [row.monthlyPeriodId, row.deltaMinutes]),
    );
    const records: MonthlyTimeReportRecord[] = rows.map((row) => {
      const postLockDeltaMinutes = adjustmentByPeriod.get(row.monthlyPeriodId) ?? 0;
      return Object.freeze({
        balanceMinutes: row.balanceMinutes + postLockDeltaMinutes,
        creditedMinutes: row.creditedMinutes + postLockDeltaMinutes,
        employeeDisplayName: row.employeeDisplayName,
        employeeId: mapEmployeeId(row.employeeId),
        expectedMinutes: row.expectedMinutes,
        incompleteRecordCount: row.incompleteRecordCount,
        monthStart: mapLocalDate(row.monthStart, 'monthly_periods', 'month_start'),
        monthlyPeriodId: mapDomainId<'MonthlyPeriod'>(row.monthlyPeriodId, 'monthly_periods', 'id'),
        postLockDeltaMinutes,
        workedMinutes: row.workedMinutes + postLockDeltaMinutes,
        workflowStatus: row.workflowStatus,
      });
    });
    const sorted = sortMonthlyTimeReport(records, input);
    return Object.freeze({
      items: Object.freeze(sorted.slice(input.offset, input.offset + input.limit)),
      summary: sumMonthlyTimeReport(records),
      total: records.length,
    });
  }

  async listFlexibleTime(input: ReportRangeInput) {
    if (input.authorizedEmployeeIds.length === 0) {
      return Object.freeze({
        items: Object.freeze([]),
        summary: emptyFlexibleTimeReportSummary(),
        total: 0,
      });
    }
    const openingExpression = sql<number>`coalesce(sum(case when ${timeAccountEntries.localDate} < ${input.from} then ${timeAccountEntries.minutes} else 0 end), 0)::integer`;
    const changeExpression = sql<number>`coalesce(sum(case when ${timeAccountEntries.localDate} >= ${input.from} and ${timeAccountEntries.localDate} <= ${input.to} then ${timeAccountEntries.minutes} else 0 end), 0)::integer`;
    const closingExpression = sql<number>`coalesce(sum(case when ${timeAccountEntries.localDate} <= ${input.to} then ${timeAccountEntries.minutes} else 0 end), 0)::integer`;
    const rows = await this.transaction
      .select({
        closingBalanceMinutes: closingExpression.mapWith(Number),
        employeeDisplayName: employees.displayName,
        employeeId: employees.id,
        openingBalanceMinutes: openingExpression.mapWith(Number),
        rangeChangeMinutes: changeExpression.mapWith(Number),
      })
      .from(employees)
      .leftJoin(
        timeAccountEntries,
        and(
          eq(timeAccountEntries.organizationId, input.organizationId),
          eq(timeAccountEntries.employeeId, employees.id),
          lte(timeAccountEntries.localDate, input.to),
        ),
      )
      .where(
        and(
          eq(employees.organizationId, input.organizationId),
          inArray(employees.id, [...input.authorizedEmployeeIds]),
        ),
      )
      .groupBy(employees.id, employees.displayName);
    const records: FlexibleTimeReportRecord[] = rows.map((row) =>
      Object.freeze({
        ...row,
        employeeId: mapEmployeeId(row.employeeId),
      }),
    );
    const sorted = sortFlexibleTimeReport(records, input);
    return Object.freeze({
      items: Object.freeze(sorted.slice(input.offset, input.offset + input.limit)),
      summary: sumFlexibleTimeReport(records),
      total: records.length,
    });
  }

  async listLeave(input: ReportRangeInput) {
    if (input.authorizedEmployeeIds.length === 0) {
      return Object.freeze({
        items: Object.freeze([]),
        summary: emptyLeaveReportSummary(),
        total: 0,
      });
    }
    const finalEntry = sql`${leaveEntitlementEntries.entryType} not in ('PENDING_RESERVATION', 'RESERVATION_RELEASE')`;
    const openingExpression = sql<number>`coalesce(sum(case when ${finalEntry} and ${leaveEntitlementEntries.effectiveOn} < ${input.from} then ${leaveEntitlementEntries.minutes} else 0 end), 0)::integer`;
    const changeExpression = sql<number>`coalesce(sum(case when ${finalEntry} and ${leaveEntitlementEntries.effectiveOn} >= ${input.from} and ${leaveEntitlementEntries.effectiveOn} <= ${input.to} then ${leaveEntitlementEntries.minutes} else 0 end), 0)::integer`;
    const closingExpression = sql<number>`coalesce(sum(case when ${finalEntry} and ${leaveEntitlementEntries.effectiveOn} <= ${input.to} then ${leaveEntitlementEntries.minutes} else 0 end), 0)::integer`;
    const reservedExpression = sql<number>`-coalesce(sum(case when ${leaveEntitlementEntries.entryType} in ('PENDING_RESERVATION', 'RESERVATION_RELEASE') and ${leaveEntitlementEntries.effectiveOn} <= ${input.to} then ${leaveEntitlementEntries.minutes} else 0 end), 0)::integer`;
    const rows = await this.transaction
      .select({
        accountName: absenceTypes.name,
        availableChangeMinutes: changeExpression.mapWith(Number),
        closingAvailableMinutes: closingExpression.mapWith(Number),
        employeeDisplayName: employees.displayName,
        employeeId: employees.id,
        openingAvailableMinutes: openingExpression.mapWith(Number),
        reservedMinutes: reservedExpression.mapWith(Number),
      })
      .from(leaveEntitlementEntries)
      .innerJoin(
        employees,
        and(
          eq(employees.organizationId, input.organizationId),
          eq(employees.id, leaveEntitlementEntries.employeeId),
        ),
      )
      .innerJoin(
        absenceTypes,
        and(
          eq(absenceTypes.organizationId, input.organizationId),
          eq(absenceTypes.id, leaveEntitlementEntries.absenceTypeId),
        ),
      )
      .where(
        and(
          eq(leaveEntitlementEntries.organizationId, input.organizationId),
          inArray(leaveEntitlementEntries.employeeId, [...input.authorizedEmployeeIds]),
          lte(leaveEntitlementEntries.effectiveOn, input.to),
          sql`${absenceTypes.code} <> 'SICKNESS'`,
        ),
      )
      .groupBy(employees.id, employees.displayName, absenceTypes.name);
    const records: LeaveReportRecord[] = rows.map((row) =>
      Object.freeze({
        ...row,
        employeeId: mapEmployeeId(row.employeeId),
        projectedRemainingMinutes: row.closingAvailableMinutes - row.reservedMinutes,
      }),
    );
    const sorted = sortLeaveReport(records, input);
    return Object.freeze({
      items: Object.freeze(sorted.slice(input.offset, input.offset + input.limit)),
      summary: sumLeaveReport(records),
      total: records.length,
    });
  }

  async listMissingRecords(input: ReportRangeInput) {
    if (input.authorizedEmployeeIds.length === 0) {
      return Object.freeze({ items: Object.freeze([]), total: 0 });
    }
    const direction = input.direction === 'ASC' ? asc : desc;
    const primarySort =
      input.sort === 'EMPLOYEE' ? sql`lower(${employees.displayName})` : dailyProjections.localDate;
    const where = and(
      eq(dailyProjections.organizationId, input.organizationId),
      inArray(dailyProjections.employeeId, [...input.authorizedEmployeeIds]),
      eq(dailyProjections.calculationStatus, 'INCOMPLETE'),
      gte(dailyProjections.localDate, input.from),
      lte(dailyProjections.localDate, input.to),
    );
    const rows = await this.transaction
      .select({
        employeeDisplayName: employees.displayName,
        employeeId: employees.id,
        expectedMinutes: dailyProjections.expectedMinutes,
        localDate: dailyProjections.localDate,
        warningCodes: dailyProjections.warningCodes,
        workedMinutes: dailyProjections.workedMinutes,
      })
      .from(dailyProjections)
      .innerJoin(
        employees,
        and(
          eq(employees.organizationId, input.organizationId),
          eq(employees.id, dailyProjections.employeeId),
        ),
      )
      .where(where)
      .orderBy(
        direction(primarySort),
        direction(sql`lower(${employees.displayName})`),
        direction(dailyProjections.localDate),
        direction(dailyProjections.id),
      )
      .limit(input.limit)
      .offset(input.offset);
    const [countRow] = await this.transaction
      .select({ total: sql<number>`count(*)::integer`.mapWith(Number) })
      .from(dailyProjections)
      .where(where);
    return Object.freeze({
      items: Object.freeze(
        rows.map((row): MissingRecordReportRecord => {
          if (!Array.isArray(row.warningCodes)) {
            throw new DatabaseValueError('daily_projections', 'warning_codes');
          }
          return Object.freeze({
            employeeDisplayName: row.employeeDisplayName,
            employeeId: mapEmployeeId(row.employeeId),
            expectedMinutes: mapNonNegativeMinutes(
              row.expectedMinutes,
              'daily_projections',
              'expected_minutes',
            ),
            localDate: mapLocalDate(row.localDate, 'daily_projections', 'local_date'),
            warningCodes: Object.freeze(row.warningCodes.map(mapWarningCode)),
            workedMinutes: mapNonNegativeMinutes(
              row.workedMinutes,
              'daily_projections',
              'worked_minutes',
            ),
          });
        }),
      ),
      total: countRow?.total ?? 0,
    });
  }
}

class PostgresAttendanceIdempotencyRepository implements AttendanceIdempotencyRepository {
  constructor(private readonly transaction: RepositoryTransaction) {}

  async claim(
    input: Parameters<AttendanceIdempotencyRepository['claim']>[0],
  ): Promise<AttendanceIdempotencyClaim> {
    validateIdempotencyKey(input.idempotencyKey);
    validateRequestFingerprint(input.requestFingerprint);
    const idempotencyKeyHash = createHash('sha256')
      .update(input.idempotencyKey, 'utf8')
      .digest('hex');
    const [inserted] = await this.transaction
      .insert(idempotencyRecords)
      .values({
        actorAccountId: input.actorAccountId,
        command: input.command,
        employeeId: input.employeeId,
        idempotencyKeyHash,
        organizationId: input.organizationId,
        requestFingerprint: input.requestFingerprint,
      })
      .onConflictDoNothing()
      .returning({ id: idempotencyRecords.id });

    if (inserted !== undefined) {
      return Object.freeze({
        kind: 'CLAIMED',
        recordId: mapDomainId<'IdempotencyRecord'>(inserted.id, 'idempotency_records', 'id'),
      });
    }

    const [existing] = await this.transaction
      .select({
        originalHttpStatus: idempotencyRecords.originalHttpStatus,
        outcome: idempotencyRecords.outcome,
        requestFingerprint: idempotencyRecords.requestFingerprint,
        terminal: idempotencyRecords.terminal,
      })
      .from(idempotencyRecords)
      .where(
        and(
          eq(idempotencyRecords.organizationId, input.organizationId),
          eq(idempotencyRecords.actorAccountId, input.actorAccountId),
          eq(idempotencyRecords.idempotencyKeyHash, idempotencyKeyHash),
        ),
      )
      .for('update')
      .limit(1);
    if (existing === undefined) throw new DatabaseValueError('idempotency_records', 'claim');
    if (existing.requestFingerprint !== input.requestFingerprint) {
      return Object.freeze({ kind: 'CONFLICT' });
    }
    if (!existing.terminal || existing.originalHttpStatus === null || existing.outcome === null) {
      throw new DatabaseValueError('idempotency_records', 'terminal');
    }
    return Object.freeze({
      kind: 'REPLAY',
      originalHttpStatus: existing.originalHttpStatus,
      outcome: parseAttendanceIdempotencyOutcome(existing.outcome),
    });
  }

  async complete(
    input: Parameters<AttendanceIdempotencyRepository['complete']>[0],
  ): Promise<boolean> {
    validateRequestFingerprint(input.requestFingerprint);
    validateOriginalHttpStatus(input.originalHttpStatus);
    const outcome = parseAttendanceIdempotencyOutcome(input.outcome);
    if (
      (outcome.kind === 'SUCCESS' &&
        (outcome.data.command !== input.command || input.originalHttpStatus >= 300)) ||
      (outcome.kind === 'ERROR' &&
        (input.originalHttpStatus < 400 || input.originalHttpStatus >= 500))
    ) {
      throw new IdempotencyValueError('outcome');
    }
    const rows = await this.transaction
      .update(idempotencyRecords)
      .set({
        completedAt: input.completedAt,
        originalHttpStatus: input.originalHttpStatus,
        outcome,
        terminal: true,
      })
      .where(
        and(
          eq(idempotencyRecords.id, input.recordId),
          eq(idempotencyRecords.command, input.command),
          eq(idempotencyRecords.requestFingerprint, input.requestFingerprint),
          eq(idempotencyRecords.terminal, false),
        ),
      )
      .returning({ id: idempotencyRecords.id });
    return rows.length === 1;
  }
}

class PostgresTeamStatusRepository implements TeamStatusRepository {
  constructor(private readonly transaction: RepositoryTransaction) {}

  async listCalendar(input: ListTeamCalendarInput): Promise<readonly TeamCalendarEntryRecord[]> {
    const scopeCondition = employeeScopeCondition({
      actorEmployeeId: input.actorEmployeeId,
      limit: 100_001,
      localDate: input.scopeLocalDate,
      offset: 0,
      organizationId: input.organizationId,
      scope: input.scope,
    });
    const currentManagerJoin = and(
      eq(managerAssignments.organizationId, input.organizationId),
      eq(managerAssignments.employeeId, employees.id),
      lte(managerAssignments.startsOn, input.scopeLocalDate),
      or(isNull(managerAssignments.endsOn), gt(managerAssignments.endsOn, input.scopeLocalDate)),
    );
    const currentTeamJoin = and(
      eq(teamAssignments.organizationId, input.organizationId),
      eq(teamAssignments.employeeId, employees.id),
      lte(teamAssignments.startsOn, input.scopeLocalDate),
      or(isNull(teamAssignments.endsOn), gt(teamAssignments.endsOn, input.scopeLocalDate)),
    );
    const rows = await this.transaction
      .select({
        coverageKind: absenceCoverageSegments.kind,
        employeeDisplayName: employees.displayName,
        endsAtMinute: absenceCoverageSegments.endsAtMinute,
        localDate: absenceEffects.localDate,
        startsAtMinute: absenceCoverageSegments.startsAtMinute,
        teamName: teams.name,
      })
      .from(absenceEffects)
      .innerJoin(
        absenceCoverageSegments,
        and(
          eq(absenceCoverageSegments.id, absenceEffects.absenceCoverageSegmentId),
          eq(absenceCoverageSegments.organizationId, absenceEffects.organizationId),
        ),
      )
      .innerJoin(
        employees,
        and(
          eq(employees.id, absenceEffects.employeeId),
          eq(employees.organizationId, absenceEffects.organizationId),
        ),
      )
      .leftJoin(managerAssignments, currentManagerJoin)
      .leftJoin(teamAssignments, currentTeamJoin)
      .leftJoin(
        teams,
        and(eq(teams.organizationId, input.organizationId), eq(teams.id, teamAssignments.teamId)),
      )
      .where(
        and(
          eq(absenceEffects.organizationId, input.organizationId),
          eq(absenceEffects.effectVersion, 1),
          gte(absenceEffects.localDate, input.startDate),
          lte(absenceEffects.localDate, input.endDate),
          eq(employees.status, 'ACTIVE'),
          scopeCondition,
          sql`exists (
            select 1 from ${employmentPeriods}
            where ${employmentPeriods.organizationId} = ${input.organizationId}
              and ${employmentPeriods.employeeId} = ${employees.id}
              and ${employmentPeriods.startsOn} <= ${input.scopeLocalDate}
              and (${employmentPeriods.endsOn} is null or ${employmentPeriods.endsOn} > ${input.scopeLocalDate})
          )`,
          sql`not exists (
            select 1
            from ${absenceCancellationSegments}
            inner join ${absenceCancellations}
              on ${absenceCancellations.id} = ${absenceCancellationSegments.absenceCancellationId}
             and ${absenceCancellations.organizationId} = ${input.organizationId}
             and ${absenceCancellations.status} = 'APPROVED'
            where ${absenceCancellationSegments.absenceCoverageSegmentId} = ${absenceEffects.absenceCoverageSegmentId}
          )`,
        ),
      )
      .orderBy(
        asc(absenceEffects.localDate),
        asc(employees.displayName),
        asc(absenceCoverageSegments.id),
      )
      .limit(100_001);

    return Object.freeze(
      rows.map((row) =>
        Object.freeze({
          coverageKind: row.coverageKind,
          employeeDisplayName: row.employeeDisplayName,
          endsAtMinute: row.endsAtMinute,
          localDate: mapLocalDate(row.localDate, 'absence_effects', 'local_date'),
          startsAtMinute: row.startsAtMinute,
          teamName: row.teamName,
        }),
      ),
    );
  }

  async listCurrent(input: ListTeamStatusInput): Promise<readonly TeamStatusMemberRecord[]> {
    const scopeCondition = employeeScopeCondition({ ...input, limit: 1_000, offset: 0 });
    const currentManagerJoin = and(
      eq(managerAssignments.organizationId, input.organizationId),
      eq(managerAssignments.employeeId, employees.id),
      lte(managerAssignments.startsOn, input.localDate),
      or(isNull(managerAssignments.endsOn), gt(managerAssignments.endsOn, input.localDate)),
    );
    const currentTeamJoin = and(
      eq(teamAssignments.organizationId, input.organizationId),
      eq(teamAssignments.employeeId, employees.id),
      lte(teamAssignments.startsOn, input.localDate),
      or(isNull(teamAssignments.endsOn), gt(teamAssignments.endsOn, input.localDate)),
    );
    const rows = await this.transaction
      .select({
        availability: sql<TeamStatusMemberRecord['availability']>`case
          when ${attendanceHeads.state} = 'WORKING' then 'WORKING'
          when ${attendanceHeads.state} = 'ON_BREAK' then 'ON_BREAK'
          when exists (
            select 1
            from ${absenceEffects}
            where ${absenceEffects.organizationId} = ${input.organizationId}
              and ${absenceEffects.employeeId} = ${employees.id}
              and ${absenceEffects.localDate} = ${input.localDate}
              and ${absenceEffects.effectVersion} = 1
              and not exists (
                select 1
                from ${absenceCancellationSegments}
                inner join ${absenceCancellations}
                  on ${absenceCancellations.id} = ${absenceCancellationSegments.absenceCancellationId}
                 and ${absenceCancellations.organizationId} = ${input.organizationId}
                 and ${absenceCancellations.status} = 'APPROVED'
                where ${absenceCancellationSegments.absenceCoverageSegmentId} = ${absenceEffects.absenceCoverageSegmentId}
              )
          ) then 'UNAVAILABLE'
          else 'OFF_WORK'
        end`.as('availability'),
        displayName: employees.displayName,
        hasUnresolvedRecords: sql<boolean>`(
          exists (
            select 1 from ${correctionRequests}
            where ${correctionRequests.organizationId} = ${input.organizationId}
              and ${correctionRequests.employeeId} = ${employees.id}
              and (
                ${correctionRequests.status} in ('SUBMITTED', 'CHANGES_REQUESTED')
                or (
                  ${correctionRequests.status} = 'APPROVED'
                  and not exists (
                    select 1 from ${appliedCorrections}
                    where ${appliedCorrections.organizationId} = ${input.organizationId}
                      and ${appliedCorrections.correctionRequestId} = ${correctionRequests.id}
                  )
                )
              )
          )
          or exists (
            select 1 from ${absenceRequests}
            where ${absenceRequests.organizationId} = ${input.organizationId}
              and ${absenceRequests.employeeId} = ${employees.id}
              and ${absenceRequests.status} in ('SUBMITTED', 'REPORTED', 'CHANGES_REQUESTED')
          )
          or exists (
            select 1 from ${absenceCancellations}
            where ${absenceCancellations.organizationId} = ${input.organizationId}
              and ${absenceCancellations.employeeId} = ${employees.id}
              and ${absenceCancellations.status} in ('PENDING_DECISION', 'CHANGES_REQUESTED')
          )
        )`.as('has_unresolved_records'),
        teamName: teams.name,
      })
      .from(employees)
      .leftJoin(managerAssignments, currentManagerJoin)
      .leftJoin(teamAssignments, currentTeamJoin)
      .leftJoin(
        teams,
        and(eq(teams.organizationId, input.organizationId), eq(teams.id, teamAssignments.teamId)),
      )
      .leftJoin(
        attendanceHeads,
        and(
          eq(attendanceHeads.organizationId, input.organizationId),
          eq(attendanceHeads.employeeId, employees.id),
        ),
      )
      .where(
        and(
          eq(employees.organizationId, input.organizationId),
          eq(employees.status, 'ACTIVE'),
          scopeCondition,
          sql`exists (
            select 1 from ${employmentPeriods}
            where ${employmentPeriods.organizationId} = ${input.organizationId}
              and ${employmentPeriods.employeeId} = ${employees.id}
              and ${employmentPeriods.startsOn} <= ${input.localDate}
              and (${employmentPeriods.endsOn} is null or ${employmentPeriods.endsOn} > ${input.localDate})
          )`,
        ),
      )
      .orderBy(asc(employees.displayName), asc(employees.id))
      .limit(1_000);

    return Object.freeze(
      rows.map((row) =>
        Object.freeze({
          availability: row.availability,
          displayName: row.displayName,
          hasUnresolvedRecords: row.hasUnresolvedRecords,
          teamName: row.teamName,
        }),
      ),
    );
  }
}

class PostgresNotificationRepository implements NotificationRepository {
  constructor(private readonly transaction: RepositoryTransaction) {}

  async append(
    input: Parameters<NotificationRepository['append']>[0],
  ): Promise<Awaited<ReturnType<NotificationRepository['append']>>> {
    const [recipient] = await this.transaction
      .select({ accountId: authUsers.id, email: authUsers.email })
      .from(accountEmployeeLinks)
      .innerJoin(authUsers, eq(authUsers.id, accountEmployeeLinks.userId))
      .where(
        and(
          eq(accountEmployeeLinks.organizationId, input.organizationId),
          eq(accountEmployeeLinks.employeeId, input.recipientEmployeeId),
          isNull(accountEmployeeLinks.unlinkedAt),
          eq(authUsers.active, true),
        ),
      )
      .limit(1);
    const deliveryRequested = input.deliveryRequested && recipient !== undefined;
    const [row] = await this.transaction
      .insert(notifications)
      .values({
        deliveryRequested,
        destinationPath: input.destinationPath,
        event: input.event,
        occurredAt: input.occurredAt,
        organizationId: input.organizationId,
        recipientAccountId: recipient?.accountId ?? null,
        recipientEmployeeId: input.recipientEmployeeId,
        sourceId: input.sourceId,
        sourceKind: input.sourceKind,
        sourceVersion: input.sourceVersion,
      })
      .returning();
    if (row === undefined) throw new DatabaseValueError('notifications', 'id');
    return Object.freeze({
      deliveryRequested,
      destinationPath: mapNotificationDestination(row.destinationPath),
      dismissedAt:
        row.dismissedAt === null
          ? null
          : mapInstant(row.dismissedAt, 'notifications', 'dismissed_at'),
      event: row.event,
      id: mapDomainId<'Notification'>(row.id, 'notifications', 'id'),
      occurredAt: mapInstant(row.occurredAt, 'notifications', 'occurred_at'),
      organizationId: mapDomainId<'Organization'>(
        row.organizationId,
        'notifications',
        'organization_id',
      ),
      recipientAccountId:
        row.recipientAccountId === null
          ? null
          : mapDomainId<'Account'>(row.recipientAccountId, 'notifications', 'recipient_account_id'),
      recipientEmail: deliveryRequested ? (recipient?.email ?? null) : null,
      recipientEmployeeId: mapEmployeeId(row.recipientEmployeeId),
      sourceId: row.sourceId,
      sourceKind: row.sourceKind,
      sourceVersion: row.sourceVersion,
    });
  }

  async appendDeliveryAttempt(
    input: Parameters<NotificationRepository['appendDeliveryAttempt']>[0],
  ): Promise<void> {
    const [row] = await this.transaction
      .insert(notificationDeliveryAttempts)
      .values(input)
      .returning({ id: notificationDeliveryAttempts.id });
    if (row === undefined) throw new DatabaseValueError('notification_delivery_attempts', 'id');
  }

  async dismiss(
    input: Parameters<NotificationRepository['dismiss']>[0],
  ): Promise<NotificationListItemRecord | null> {
    const ownership = notificationOwnership(input.accountId, input.employeeId);
    await this.transaction
      .update(notifications)
      .set({ dismissedAt: input.dismissedAt })
      .where(
        and(
          eq(notifications.id, input.notificationId),
          eq(notifications.organizationId, input.organizationId),
          ownership,
          isNull(notifications.dismissedAt),
        ),
      );

    const [existing] = await this.transaction
      .select(notificationCoreSelection())
      .from(notifications)
      .where(
        and(
          eq(notifications.id, input.notificationId),
          eq(notifications.organizationId, input.organizationId),
          ownership,
        ),
      )
      .limit(1);
    if (existing === undefined) return null;
    return mapNotificationListItem(
      existing,
      existing.deliveryRequested ? 'PENDING' : 'NOT_CONFIGURED',
    );
  }

  async list(
    input: Parameters<NotificationRepository['list']>[0],
  ): Promise<Awaited<ReturnType<NotificationRepository['list']>>> {
    const ownership = notificationOwnership(input.accountId, input.employeeId);
    const where = and(eq(notifications.organizationId, input.organizationId), ownership);
    const rows = await this.transaction
      .select(notificationCoreSelection())
      .from(notifications)
      .where(where)
      .orderBy(desc(notifications.occurredAt), desc(notifications.id))
      .limit(input.limit)
      .offset(input.offset);
    const totalRows = await this.transaction
      .select({ total: sql<number>`count(*)::integer`.mapWith(Number) })
      .from(notifications)
      .where(where);
    const requestedIds = rows.filter((row) => row.deliveryRequested).map((row) => row.id);
    const attempts =
      requestedIds.length === 0
        ? []
        : await this.transaction
            .select({
              notificationId: notificationDeliveryAttempts.notificationId,
              outcome: notificationDeliveryAttempts.outcome,
            })
            .from(notificationDeliveryAttempts)
            .where(inArray(notificationDeliveryAttempts.notificationId, requestedIds))
            .orderBy(
              desc(notificationDeliveryAttempts.attemptNumber),
              desc(notificationDeliveryAttempts.id),
            );
    const deliveryStatuses = new Map<string, NotificationListItemRecord['deliveryStatus']>();
    for (const attempt of attempts) {
      if (!deliveryStatuses.has(attempt.notificationId)) {
        deliveryStatuses.set(attempt.notificationId, attempt.outcome);
      }
    }
    return Object.freeze({
      items: Object.freeze(
        rows.map((row) =>
          mapNotificationListItem(
            row,
            row.deliveryRequested ? (deliveryStatuses.get(row.id) ?? 'PENDING') : 'NOT_CONFIGURED',
          ),
        ),
      ),
      total: totalRows[0]?.total ?? 0,
    });
  }
}

function notificationOwnership(
  accountId: DomainId<'Account'>,
  employeeId: DomainId<'Employee'> | null,
) {
  return employeeId === null
    ? eq(notifications.recipientAccountId, accountId)
    : or(
        eq(notifications.recipientAccountId, accountId),
        eq(notifications.recipientEmployeeId, employeeId),
      );
}

function notificationCoreSelection() {
  return {
    deliveryRequested: notifications.deliveryRequested,
    destinationPath: notifications.destinationPath,
    dismissedAt: notifications.dismissedAt,
    event: notifications.event,
    id: notifications.id,
    occurredAt: notifications.occurredAt,
  };
}

function mapNotificationDestination(value: string): NotificationListItemRecord['destinationPath'] {
  if (isNotificationDestination(value)) return value;
  throw new DatabaseValueError('notifications', 'destination_path');
}

function isNotificationDestination(
  value: string,
): value is NotificationListItemRecord['destinationPath'] {
  return value === '/requests' || /^\/monthly-periods\/[0-9a-f-]{36}$/iu.test(value);
}

function mapNotificationListItem(
  row: Readonly<{
    deliveryRequested: boolean;
    destinationPath: string;
    dismissedAt: string | null;
    event: NotificationListItemRecord['event'];
    id: string;
    occurredAt: string;
  }>,
  deliveryStatus: NotificationListItemRecord['deliveryStatus'],
): NotificationListItemRecord {
  return Object.freeze({
    deliveryStatus,
    destinationPath: row.destinationPath as '/requests',
    dismissedAt:
      row.dismissedAt === null
        ? null
        : mapInstant(row.dismissedAt, 'notifications', 'dismissed_at'),
    event: row.event,
    id: mapDomainId<'Notification'>(row.id, 'notifications', 'id'),
    occurredAt: mapInstant(row.occurredAt, 'notifications', 'occurred_at'),
  });
}

class PostgresAuditRepository implements AuditRepository {
  constructor(private readonly transaction: RepositoryTransaction) {}

  async appendDomain(
    input: Parameters<AuditRepository['appendDomain']>[0],
  ): Promise<DomainAuditEventRecord> {
    validateDomainAuditInput(input);
    const [row] = await this.transaction
      .insert(domainAuditEvents)
      .values({
        actionCode: input.actionCode,
        ...auditActorColumns(input.actor),
        facts: { ...input.facts },
        occurredAt: input.occurredAt,
        organizationId: input.organizationId,
        outcome: input.outcome,
        privileged: input.privileged,
        reasonCode: input.reasonCode,
        requestId: input.requestId,
        restrictedReasonId: input.restrictedReasonId,
        subjectEmployeeId: input.subjectEmployeeId,
        targetId: input.targetId,
        targetKind: input.targetKind,
      })
      .returning();
    if (row === undefined) throw new DatabaseValueError('domain_audit_events', 'id');
    return mapDomainAuditEvent(row);
  }

  async appendSecurity(
    input: Parameters<AuditRepository['appendSecurity']>[0],
  ): Promise<SecurityAuditEventRecord> {
    validateSecurityAuditInput(input);
    const [row] = await this.transaction
      .insert(securityAuditEvents)
      .values({
        actionCode: input.actionCode,
        ...auditActorColumns(input.actor),
        facts: { ...input.facts },
        occurredAt: input.occurredAt,
        organizationId: input.organizationId,
        outcome: input.outcome,
        privileged: input.privileged,
        reasonCode: input.reasonCode,
        requestId: input.requestId,
        targetAccountId: input.targetAccountId,
        targetId: input.targetId,
        targetKind: input.targetKind,
      })
      .returning();
    if (row === undefined) throw new DatabaseValueError('security_audit_events', 'id');
    return mapSecurityAuditEvent(row);
  }

  async listDomainForEmployee(
    input: Parameters<AuditRepository['listDomainForEmployee']>[0],
  ): Promise<readonly DomainAuditEventRecord[]> {
    validateAuditPage(input.limit, input.offset);
    const rows = await this.transaction
      .select()
      .from(domainAuditEvents)
      .where(
        and(
          eq(domainAuditEvents.organizationId, input.organizationId),
          eq(domainAuditEvents.subjectEmployeeId, input.subjectEmployeeId),
        ),
      )
      .orderBy(desc(domainAuditEvents.occurredAt), desc(domainAuditEvents.id))
      .limit(input.limit)
      .offset(input.offset);
    return Object.freeze(rows.map(mapDomainAuditEvent));
  }

  async listSecurity(
    input: Parameters<AuditRepository['listSecurity']>[0],
  ): Promise<readonly SecurityAuditEventRecord[]> {
    validateAuditPage(input.limit, input.offset);
    const rows = await this.transaction
      .select()
      .from(securityAuditEvents)
      .where(eq(securityAuditEvents.organizationId, input.organizationId))
      .orderBy(desc(securityAuditEvents.occurredAt), desc(securityAuditEvents.id))
      .limit(input.limit)
      .offset(input.offset);
    return Object.freeze(rows.map(mapSecurityAuditEvent));
  }
}

class PostgresAuthorizationRepository implements AuthorizationRepository {
  constructor(private readonly transaction: RepositoryTransaction) {}

  async findActor(
    organizationId: Parameters<AuthorizationRepository['findActor']>[0],
    accountId: Parameters<AuthorizationRepository['findActor']>[1],
    localDate: Parameters<AuthorizationRepository['findActor']>[2],
  ): Promise<AuthorizationActorRecord | null> {
    const [account] = await this.transaction
      .select({
        accountActive: authUsers.active,
        accountId: authUsers.id,
        employeeId: accountEmployeeLinks.employeeId,
        employeeStatus: employees.status,
      })
      .from(authUsers)
      .leftJoin(
        accountEmployeeLinks,
        and(
          eq(accountEmployeeLinks.userId, authUsers.id),
          eq(accountEmployeeLinks.organizationId, organizationId),
          isNull(accountEmployeeLinks.unlinkedAt),
        ),
      )
      .leftJoin(
        employees,
        and(
          eq(employees.id, accountEmployeeLinks.employeeId),
          eq(employees.organizationId, organizationId),
        ),
      )
      .where(eq(authUsers.id, accountId))
      .limit(1);

    if (account === undefined) return null;

    const roleRows = await this.transaction
      .select({ role: accountRoleAssignments.role })
      .from(accountRoleAssignments)
      .where(
        and(
          eq(accountRoleAssignments.organizationId, organizationId),
          eq(accountRoleAssignments.userId, accountId),
          isNull(accountRoleAssignments.revokedAt),
        ),
      )
      .orderBy(asc(accountRoleAssignments.role));

    let hasCurrentEmployment = false;
    if (account.employeeId !== null) {
      const [employment] = await this.transaction
        .select({ id: employmentPeriods.id })
        .from(employmentPeriods)
        .where(
          and(
            eq(employmentPeriods.organizationId, organizationId),
            eq(employmentPeriods.employeeId, account.employeeId),
            lte(employmentPeriods.startsOn, localDate),
            or(isNull(employmentPeriods.endsOn), gt(employmentPeriods.endsOn, localDate)),
          ),
        )
        .limit(1);
      hasCurrentEmployment = employment !== undefined;
    }

    return Object.freeze({
      accountActive: account.accountActive,
      accountId: mapDomainId<'Account'>(account.accountId, 'auth_users', 'id'),
      employeeCapabilityActive:
        account.accountActive && account.employeeStatus === 'ACTIVE' && hasCurrentEmployment,
      employeeId:
        account.employeeId === null
          ? null
          : mapDomainId<'Employee'>(account.employeeId, 'account_employee_links', 'employee_id'),
      organizationId,
      roles: Object.freeze(roleRows.map(({ role }) => role)),
    });
  }

  async isCurrentManager(
    organizationId: Parameters<AuthorizationRepository['isCurrentManager']>[0],
    managerEmployeeId: Parameters<AuthorizationRepository['isCurrentManager']>[1],
    employeeId: Parameters<AuthorizationRepository['isCurrentManager']>[2],
    localDate: Parameters<AuthorizationRepository['isCurrentManager']>[3],
  ): Promise<boolean> {
    const [row] = await this.transaction
      .select({ id: managerAssignments.id })
      .from(managerAssignments)
      .innerJoin(
        employees,
        and(
          eq(employees.id, managerAssignments.employeeId),
          eq(employees.organizationId, organizationId),
          eq(employees.status, 'ACTIVE'),
        ),
      )
      .where(
        and(
          eq(managerAssignments.organizationId, organizationId),
          eq(managerAssignments.employeeId, employeeId),
          eq(managerAssignments.managerEmployeeId, managerEmployeeId),
          lte(managerAssignments.startsOn, localDate),
          or(isNull(managerAssignments.endsOn), gt(managerAssignments.endsOn, localDate)),
          sql`exists (
            select 1 from ${employmentPeriods}
            where ${employmentPeriods.organizationId} = ${organizationId}
              and ${employmentPeriods.employeeId} = ${employeeId}
              and ${employmentPeriods.startsOn} <= ${localDate}
              and (${employmentPeriods.endsOn} is null or ${employmentPeriods.endsOn} > ${localDate})
          )`,
        ),
      )
      .limit(1);
    return row !== undefined;
  }

  async linkEmployee(input: LinkEmployeeInput): Promise<void> {
    await this.transaction.insert(accountEmployeeLinks).values({
      employeeId: input.employeeId,
      linkedAt: new Date(input.changedAt),
      organizationId: input.organizationId,
      userId: input.accountId,
    });
    await this.transaction.delete(authSessions).where(eq(authSessions.userId, input.accountId));
  }

  async listAuthorizedEmployeeIds(
    input: ListAuthorizedEmployeesInput,
  ): Promise<readonly ReturnType<typeof mapEmployeeId>[]> {
    const scopeCondition = employeeScopeCondition(input);
    const rows = await this.transaction
      .selectDistinct({ employeeId: employees.id })
      .from(employees)
      .leftJoin(
        managerAssignments,
        and(
          eq(managerAssignments.organizationId, input.organizationId),
          eq(managerAssignments.employeeId, employees.id),
          lte(managerAssignments.startsOn, input.localDate),
          or(isNull(managerAssignments.endsOn), gt(managerAssignments.endsOn, input.localDate)),
        ),
      )
      .where(and(eq(employees.organizationId, input.organizationId), scopeCondition))
      .orderBy(asc(employees.id))
      .limit(input.limit)
      .offset(input.offset);

    return Object.freeze(rows.map(({ employeeId }) => mapEmployeeId(employeeId)));
  }

  async replaceActiveRoles(input: ReplaceActiveRolesInput): Promise<void> {
    const requestedRoles = [...new Set(input.roles)].sort();
    const currentRows = await this.transaction
      .select({ role: accountRoleAssignments.role })
      .from(accountRoleAssignments)
      .where(
        and(
          eq(accountRoleAssignments.organizationId, input.organizationId),
          eq(accountRoleAssignments.userId, input.accountId),
          isNull(accountRoleAssignments.revokedAt),
        ),
      );
    const currentRoles = currentRows.map(({ role }) => role);
    const removedRoles = currentRoles.filter((role) => !requestedRoles.includes(role));
    const addedRoles = requestedRoles.filter((role) => !currentRoles.includes(role));
    if (removedRoles.length === 0 && addedRoles.length === 0) return;

    const changedAt = new Date(input.changedAt);
    if (removedRoles.length > 0) {
      await this.transaction
        .update(accountRoleAssignments)
        .set({ revokedAt: changedAt })
        .where(
          and(
            eq(accountRoleAssignments.organizationId, input.organizationId),
            eq(accountRoleAssignments.userId, input.accountId),
            isNull(accountRoleAssignments.revokedAt),
            inArray(accountRoleAssignments.role, removedRoles),
          ),
        );
    }
    if (addedRoles.length > 0) {
      await this.transaction.insert(accountRoleAssignments).values(
        addedRoles.map((role) => ({
          assignedAt: changedAt,
          organizationId: input.organizationId,
          role,
          userId: input.accountId,
        })),
      );
    }
    await this.transaction.delete(authSessions).where(eq(authSessions.userId, input.accountId));
  }

  async unlinkEmployee(
    input: Parameters<AuthorizationRepository['unlinkEmployee']>[0],
  ): Promise<boolean> {
    const rows = await this.transaction
      .update(accountEmployeeLinks)
      .set({ unlinkedAt: new Date(input.changedAt) })
      .where(
        and(
          eq(accountEmployeeLinks.organizationId, input.organizationId),
          eq(accountEmployeeLinks.userId, input.accountId),
          isNull(accountEmployeeLinks.unlinkedAt),
        ),
      )
      .returning({ id: accountEmployeeLinks.id });
    if (rows.length === 0) return false;
    await this.transaction.delete(authSessions).where(eq(authSessions.userId, input.accountId));
    return true;
  }
}

function employeeScopeCondition(input: ListAuthorizedEmployeesInput) {
  if (input.scope === 'ORGANIZATION') return sql`true`;
  if (input.actorEmployeeId === null) return sql`false`;
  if (input.scope === 'SELF') return eq(employees.id, input.actorEmployeeId);
  const reportCondition = and(
    eq(managerAssignments.managerEmployeeId, input.actorEmployeeId),
    eq(employees.status, 'ACTIVE'),
    sql`exists (
      select 1 from ${employmentPeriods}
      where ${employmentPeriods.organizationId} = ${input.organizationId}
        and ${employmentPeriods.employeeId} = ${employees.id}
        and ${employmentPeriods.startsOn} <= ${input.localDate}
        and (${employmentPeriods.endsOn} is null or ${employmentPeriods.endsOn} > ${input.localDate})
    )`,
  );
  return input.scope === 'REPORTS'
    ? reportCondition
    : or(eq(employees.id, input.actorEmployeeId), reportCondition);
}

function emptyMonthlyTimeReportSummary(): MonthlyTimeReportPage['summary'] {
  return Object.freeze({
    balanceMinutes: 0,
    creditedMinutes: 0,
    expectedMinutes: 0,
    incompleteRecordCount: 0,
    postLockDeltaMinutes: 0,
    workedMinutes: 0,
  });
}

function sumMonthlyTimeReport(
  records: readonly MonthlyTimeReportRecord[],
): MonthlyTimeReportPage['summary'] {
  return Object.freeze(
    records.reduce(
      (summary, record) => ({
        balanceMinutes: summary.balanceMinutes + record.balanceMinutes,
        creditedMinutes: summary.creditedMinutes + record.creditedMinutes,
        expectedMinutes: summary.expectedMinutes + record.expectedMinutes,
        incompleteRecordCount: summary.incompleteRecordCount + record.incompleteRecordCount,
        postLockDeltaMinutes: summary.postLockDeltaMinutes + record.postLockDeltaMinutes,
        workedMinutes: summary.workedMinutes + record.workedMinutes,
      }),
      emptyMonthlyTimeReportSummary(),
    ),
  );
}

function emptyFlexibleTimeReportSummary(): FlexibleTimeReportPage['summary'] {
  return Object.freeze({
    closingBalanceMinutes: 0,
    openingBalanceMinutes: 0,
    rangeChangeMinutes: 0,
  });
}

function sumFlexibleTimeReport(
  records: readonly FlexibleTimeReportRecord[],
): FlexibleTimeReportPage['summary'] {
  return Object.freeze(
    records.reduce(
      (summary, record) => ({
        closingBalanceMinutes: summary.closingBalanceMinutes + record.closingBalanceMinutes,
        openingBalanceMinutes: summary.openingBalanceMinutes + record.openingBalanceMinutes,
        rangeChangeMinutes: summary.rangeChangeMinutes + record.rangeChangeMinutes,
      }),
      emptyFlexibleTimeReportSummary(),
    ),
  );
}

function emptyLeaveReportSummary(): LeaveReportPage['summary'] {
  return Object.freeze({
    availableChangeMinutes: 0,
    closingAvailableMinutes: 0,
    openingAvailableMinutes: 0,
    projectedRemainingMinutes: 0,
    reservedMinutes: 0,
  });
}

function sumLeaveReport(records: readonly LeaveReportRecord[]): LeaveReportPage['summary'] {
  return Object.freeze(
    records.reduce(
      (summary, record) => ({
        availableChangeMinutes: summary.availableChangeMinutes + record.availableChangeMinutes,
        closingAvailableMinutes: summary.closingAvailableMinutes + record.closingAvailableMinutes,
        openingAvailableMinutes: summary.openingAvailableMinutes + record.openingAvailableMinutes,
        projectedRemainingMinutes:
          summary.projectedRemainingMinutes + record.projectedRemainingMinutes,
        reservedMinutes: summary.reservedMinutes + record.reservedMinutes,
      }),
      emptyLeaveReportSummary(),
    ),
  );
}

function sortMonthlyTimeReport(
  records: readonly MonthlyTimeReportRecord[],
  input: Pick<ReportRangeInput, 'direction' | 'sort'>,
) {
  return [...records].sort((left, right) => {
    const primary =
      input.sort === 'DATE'
        ? compareText(left.monthStart, right.monthStart)
        : input.sort === 'VALUE'
          ? left.balanceMinutes - right.balanceMinutes
          : input.sort === 'STATUS'
            ? compareText(left.workflowStatus, right.workflowStatus)
            : compareText(left.employeeDisplayName, right.employeeDisplayName);
    const fallback =
      primary !== 0
        ? primary
        : compareText(left.employeeDisplayName, right.employeeDisplayName) ||
          compareText(left.monthStart, right.monthStart) ||
          compareText(left.monthlyPeriodId, right.monthlyPeriodId);
    return input.direction === 'ASC' ? fallback : -fallback;
  });
}

function sortFlexibleTimeReport(
  records: readonly FlexibleTimeReportRecord[],
  input: Pick<ReportRangeInput, 'direction' | 'sort'>,
) {
  return [...records].sort((left, right) => {
    const primary =
      input.sort === 'VALUE'
        ? left.closingBalanceMinutes - right.closingBalanceMinutes
        : compareText(left.employeeDisplayName, right.employeeDisplayName);
    const fallback =
      primary !== 0
        ? primary
        : compareText(left.employeeDisplayName, right.employeeDisplayName) ||
          compareText(left.employeeId, right.employeeId);
    return input.direction === 'ASC' ? fallback : -fallback;
  });
}

function sortLeaveReport(
  records: readonly LeaveReportRecord[],
  input: Pick<ReportRangeInput, 'direction' | 'sort'>,
) {
  return [...records].sort((left, right) => {
    const primary =
      input.sort === 'VALUE'
        ? left.projectedRemainingMinutes - right.projectedRemainingMinutes
        : compareText(left.employeeDisplayName, right.employeeDisplayName);
    const fallback =
      primary !== 0
        ? primary
        : compareText(left.employeeDisplayName, right.employeeDisplayName) ||
          compareText(left.accountName, right.accountName) ||
          compareText(left.employeeId, right.employeeId);
    return input.direction === 'ASC' ? fallback : -fallback;
  });
}

function compareText(left: string, right: string): number {
  const normalizedLeft = left.toLocaleLowerCase('en');
  const normalizedRight = right.toLocaleLowerCase('en');
  if (normalizedLeft < normalizedRight) return -1;
  if (normalizedLeft > normalizedRight) return 1;
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function mapEmployeeId(value: string) {
  return mapDomainId<'Employee'>(value, 'employees', 'id');
}

function mapApprovalInboxItem(
  value: Readonly<{
    affectedEndDate: string;
    affectedStartDate: string;
    employeeDisplayName: string;
    employeeId: string;
    id: string;
    status: ApprovalInboxItemRecord['status'];
    submittedAt: string;
    teamId: string | null;
    teamName: string | null;
    type: ApprovalInboxItemRecord['type'];
    version: number;
  }>,
): ApprovalInboxItemRecord {
  const team =
    value.teamId === null && value.teamName === null
      ? null
      : value.teamId !== null && value.teamName !== null
        ? Object.freeze({
            id: mapDomainId<'Team'>(value.teamId, 'teams', 'id'),
            name: value.teamName,
          })
        : (() => {
            throw new DatabaseValueError('team_assignments', 'team_id');
          })();
  const id =
    value.type === 'CORRECTION'
      ? mapDomainId<'CorrectionRequest'>(value.id, 'correction_requests', 'id')
      : value.type === 'ABSENCE'
        ? mapDomainId<'AbsenceRequest'>(value.id, 'absence_requests', 'id')
        : value.type === 'CANCELLATION'
          ? mapDomainId<'AbsenceCancellation'>(value.id, 'absence_cancellations', 'id')
          : mapDomainId<'MonthlyPeriod'>(value.id, 'monthly_periods', 'id');
  return Object.freeze({
    affectedEndDate: mapLocalDate(
      value.affectedEndDate,
      approvalInboxSource(value.type),
      'affected_end_date',
    ),
    affectedStartDate: mapLocalDate(
      value.affectedStartDate,
      approvalInboxSource(value.type),
      'affected_start_date',
    ),
    employeeDisplayName: value.employeeDisplayName,
    employeeId: mapEmployeeId(value.employeeId),
    id,
    status: value.status,
    submittedAt: mapInstant(value.submittedAt, approvalInboxSource(value.type), 'submitted_at'),
    team,
    type: value.type,
    version: value.version,
  });
}

function approvalInboxSource(type: ApprovalInboxItemRecord['type']): string {
  return type === 'CORRECTION'
    ? 'correction_requests'
    : type === 'ABSENCE'
      ? 'absence_requests'
      : type === 'CANCELLATION'
        ? 'absence_cancellations'
        : 'monthly_periods';
}

class PostgresOrganizationRepository implements OrganizationRepository {
  constructor(private readonly transaction: RepositoryTransaction) {}

  async findById(organizationId: DomainId<'Organization'>): Promise<OrganizationRecord | null> {
    const [row] = await this.transaction
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    return row === undefined ? null : mapOrganization(row);
  }
}

class PostgresEmployeeRepository implements EmployeeRepository {
  constructor(private readonly transaction: RepositoryTransaction) {}

  async findById(
    organizationId: DomainId<'Organization'>,
    employeeId: DomainId<'Employee'>,
  ): Promise<EmployeeRecord | null> {
    const [row] = await this.transaction
      .select()
      .from(employees)
      .where(and(eq(employees.organizationId, organizationId), eq(employees.id, employeeId)))
      .limit(1);

    return row === undefined ? null : mapEmployee(row);
  }
}

class PostgresAttendanceRepository implements AttendanceRepository {
  constructor(private readonly transaction: RepositoryTransaction) {}

  async ensureHead(
    organizationId: DomainId<'Organization'>,
    employeeId: DomainId<'Employee'>,
  ): Promise<void> {
    await this.transaction
      .insert(attendanceHeads)
      .values({ employeeId, organizationId })
      .onConflictDoNothing({ target: attendanceHeads.employeeId });
  }

  async lockHead(
    organizationId: DomainId<'Organization'>,
    employeeId: DomainId<'Employee'>,
  ): Promise<AttendanceHeadRecord | null> {
    const [row] = await this.transaction
      .select()
      .from(attendanceHeads)
      .where(
        and(
          eq(attendanceHeads.organizationId, organizationId),
          eq(attendanceHeads.employeeId, employeeId),
        ),
      )
      .for('update')
      .limit(1);

    return row === undefined ? null : mapAttendanceHead(row);
  }

  async appendPunchEvents(
    organizationId: DomainId<'Organization'>,
    employeeId: DomainId<'Employee'>,
    events: readonly AppendPunchEvent[],
  ): Promise<readonly StoredPunchEvent[]> {
    if (events.length === 0) return Object.freeze([]);

    const rows = await this.transaction
      .insert(punchEvents)
      .values(
        events.map(({ actorEmployeeId, commandId, event }) => ({
          actorEmployeeId,
          commandId,
          employeeId,
          eventSequence: event.eventSequence,
          eventType: event.type,
          occurredAt: event.occurredAt,
          organizationId,
        })),
      )
      .returning();

    return Object.freeze(rows.map(mapStoredPunchEvent));
  }

  async findLatestPunchEvent(
    organizationId: DomainId<'Organization'>,
    employeeId: DomainId<'Employee'>,
  ): Promise<StoredPunchEvent | null> {
    const [row] = await this.transaction
      .select()
      .from(punchEvents)
      .where(
        and(eq(punchEvents.organizationId, organizationId), eq(punchEvents.employeeId, employeeId)),
      )
      .orderBy(desc(punchEvents.eventSequence))
      .limit(1);

    return row === undefined ? null : mapStoredPunchEvent(row);
  }

  async advanceHead(input: AdvanceAttendanceHeadInput): Promise<AttendanceHeadRecord | null> {
    const [row] = await this.transaction
      .update(attendanceHeads)
      .set({
        attendanceRevision: input.expectedAttendanceRevision + 1,
        nextEventSequence: input.expectedNextEventSequence + input.appendedEventCount,
        state: input.nextState,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(attendanceHeads.organizationId, input.organizationId),
          eq(attendanceHeads.employeeId, input.employeeId),
          eq(attendanceHeads.attendanceRevision, input.expectedAttendanceRevision),
          eq(attendanceHeads.nextEventSequence, input.expectedNextEventSequence),
        ),
      )
      .returning();

    return row === undefined ? null : mapAttendanceHead(row);
  }

  async listPunchEvents(
    organizationId: DomainId<'Organization'>,
    employeeId: DomainId<'Employee'>,
  ): Promise<readonly StoredPunchEvent[]> {
    const rows = await this.transaction
      .select()
      .from(punchEvents)
      .where(
        and(eq(punchEvents.organizationId, organizationId), eq(punchEvents.employeeId, employeeId)),
      )
      .orderBy(asc(punchEvents.eventSequence));

    return Object.freeze(rows.map(mapStoredPunchEvent));
  }

  async listPunchEventsUntil(
    organizationId: DomainId<'Organization'>,
    employeeId: DomainId<'Employee'>,
    occurredAt: Instant,
  ): Promise<readonly StoredPunchEvent[]> {
    const rows = await this.transaction
      .select()
      .from(punchEvents)
      .where(
        and(
          eq(punchEvents.organizationId, organizationId),
          eq(punchEvents.employeeId, employeeId),
          lte(punchEvents.occurredAt, occurredAt),
        ),
      )
      .orderBy(asc(punchEvents.eventSequence));

    return Object.freeze(rows.map(mapStoredPunchEvent));
  }
}

const TODAY_SOURCE_EVENT_LIMIT = 500;

class PostgresTodayAttendanceRepository implements TodayAttendanceRepository {
  constructor(private readonly transaction: RepositoryTransaction) {}

  async loadSource(
    input: Parameters<TodayAttendanceRepository['loadSource']>[0],
  ): Promise<TodayAttendanceSourceRecord> {
    const [headRow] = await this.transaction
      .select()
      .from(attendanceHeads)
      .where(
        and(
          eq(attendanceHeads.organizationId, input.organizationId),
          eq(attendanceHeads.employeeId, input.employeeId),
        ),
      )
      .limit(1);

    const [anchorRow] = await this.transaction
      .select({ eventSequence: punchEvents.eventSequence })
      .from(punchEvents)
      .where(
        and(
          eq(punchEvents.organizationId, input.organizationId),
          eq(punchEvents.employeeId, input.employeeId),
          eq(punchEvents.eventType, 'CLOCK_IN'),
          lt(punchEvents.occurredAt, input.dayStartsAt),
        ),
      )
      .orderBy(desc(punchEvents.eventSequence))
      .limit(1);
    const eventStart =
      anchorRow === undefined
        ? gte(punchEvents.occurredAt, input.dayStartsAt)
        : gte(punchEvents.eventSequence, anchorRow.eventSequence);
    const eventRows = await this.transaction
      .select()
      .from(punchEvents)
      .where(
        and(
          eq(punchEvents.organizationId, input.organizationId),
          eq(punchEvents.employeeId, input.employeeId),
          eventStart,
          lte(punchEvents.occurredAt, input.calculationAsOf),
        ),
      )
      .orderBy(desc(punchEvents.eventSequence))
      .limit(TODAY_SOURCE_EVENT_LIMIT + 1);
    const timelineTruncated = eventRows.length > TODAY_SOURCE_EVENT_LIMIT;
    const events = eventRows.slice(0, TODAY_SOURCE_EVENT_LIMIT).reverse().map(mapStoredPunchEvent);

    const scheduleRows = await this.transaction
      .select({
        assignmentEndsOn: scheduleAssignments.endsOn,
        assignmentId: scheduleAssignments.id,
        assignmentStartsOn: scheduleAssignments.startsOn,
        fridayMinutes: weeklySchedules.fridayMinutes,
        mondayMinutes: weeklySchedules.mondayMinutes,
        saturdayMinutes: weeklySchedules.saturdayMinutes,
        scheduleId: weeklySchedules.id,
        sundayMinutes: weeklySchedules.sundayMinutes,
        thursdayMinutes: weeklySchedules.thursdayMinutes,
        tuesdayMinutes: weeklySchedules.tuesdayMinutes,
        wednesdayMinutes: weeklySchedules.wednesdayMinutes,
      })
      .from(scheduleAssignments)
      .innerJoin(
        weeklySchedules,
        and(
          eq(weeklySchedules.id, scheduleAssignments.scheduleId),
          eq(weeklySchedules.organizationId, scheduleAssignments.organizationId),
        ),
      )
      .where(
        and(
          eq(scheduleAssignments.organizationId, input.organizationId),
          eq(scheduleAssignments.employeeId, input.employeeId),
          lte(scheduleAssignments.startsOn, input.localDate),
          or(isNull(scheduleAssignments.endsOn), gt(scheduleAssignments.endsOn, input.localDate)),
        ),
      )
      .orderBy(asc(scheduleAssignments.startsOn), asc(scheduleAssignments.id));
    const mappedScheduleAssignments = scheduleRows.map((row) => {
      const range = createLocalDateRange(
        mapLocalDate(row.assignmentStartsOn, 'schedule_assignments', 'starts_on'),
        row.assignmentEndsOn === null
          ? null
          : mapLocalDate(row.assignmentEndsOn, 'schedule_assignments', 'ends_on'),
      );
      const schedule = createWeeklySchedule(
        mapDomainId<'WorkScheduleVersion'>(row.scheduleId, 'weekly_schedules', 'id'),
        {
          FRIDAY: row.fridayMinutes,
          MONDAY: row.mondayMinutes,
          SATURDAY: row.saturdayMinutes,
          SUNDAY: row.sundayMinutes,
          THURSDAY: row.thursdayMinutes,
          TUESDAY: row.tuesdayMinutes,
          WEDNESDAY: row.wednesdayMinutes,
        },
      );
      if (!range.ok || !schedule.ok) {
        throw new DatabaseValueError('schedule_assignments', 'effective_configuration');
      }
      const assignment = createScheduleAssignment(
        mapDomainId<'ScheduleAssignment'>(row.assignmentId, 'schedule_assignments', 'id'),
        range.value,
        schedule.value,
      );
      if (!assignment.ok) throw new DatabaseValueError('schedule_assignments', 'id');
      return assignment.value;
    });

    const policyRows = await this.transaction
      .select({
        assignmentEndsOn: policyAssignments.endsOn,
        assignmentId: policyAssignments.id,
        assignmentStartsOn: policyAssignments.startsOn,
        policyId: timePolicies.id,
        rules: timePolicies.rules,
      })
      .from(policyAssignments)
      .innerJoin(
        timePolicies,
        and(
          eq(timePolicies.id, policyAssignments.policyId),
          eq(timePolicies.organizationId, policyAssignments.organizationId),
        ),
      )
      .where(
        and(
          eq(policyAssignments.organizationId, input.organizationId),
          eq(policyAssignments.employeeId, input.employeeId),
          lte(policyAssignments.startsOn, input.localDate),
          or(isNull(policyAssignments.endsOn), gt(policyAssignments.endsOn, input.localDate)),
        ),
      )
      .orderBy(asc(policyAssignments.startsOn), asc(policyAssignments.id));
    const mappedPolicyAssignments = policyRows.map((row) => {
      const range = createLocalDateRange(
        mapLocalDate(row.assignmentStartsOn, 'policy_assignments', 'starts_on'),
        row.assignmentEndsOn === null
          ? null
          : mapLocalDate(row.assignmentEndsOn, 'policy_assignments', 'ends_on'),
      );
      const policy = createTimePolicy(
        mapDomainId<'TimePolicyVersion'>(row.policyId, 'time_policies', 'id'),
      );
      if (!range.ok || !policy.ok) {
        throw new DatabaseValueError('policy_assignments', 'effective_configuration');
      }
      const assignment = createPolicyAssignment(
        mapDomainId<'PolicyAssignment'>(row.assignmentId, 'policy_assignments', 'id'),
        range.value,
        policy.value,
      );
      if (!assignment.ok) throw new DatabaseValueError('policy_assignments', 'id');
      return assignment.value;
    });
    const warningThreshold =
      policyRows.length === 1 ? mapPolicyWarningThreshold(policyRows[0]?.rules) : null;

    const [holidayRow] = await this.transaction
      .select({ id: holidays.id, name: holidays.name })
      .from(holidays)
      .where(
        and(
          eq(holidays.organizationId, input.organizationId),
          eq(holidays.holidayDate, input.localDate),
        ),
      )
      .limit(1);

    const absenceRows = await this.transaction
      .select({
        absenceCoverageSegmentId: absenceEffects.absenceCoverageSegmentId,
        creditMinutes: absenceEffects.creditMinutes,
        effectVersion: absenceEffects.effectVersion,
        expectedReductionMinutes: absenceEffects.expectedReductionMinutes,
      })
      .from(absenceEffects)
      .where(
        and(
          eq(absenceEffects.organizationId, input.organizationId),
          eq(absenceEffects.employeeId, input.employeeId),
          eq(absenceEffects.localDate, input.localDate),
        ),
      )
      .orderBy(asc(absenceEffects.absenceCoverageSegmentId), desc(absenceEffects.effectVersion));
    const latestAbsenceRows = new Map<string, (typeof absenceRows)[number]>();
    for (const row of absenceRows) {
      if (!latestAbsenceRows.has(row.absenceCoverageSegmentId)) {
        latestAbsenceRows.set(row.absenceCoverageSegmentId, row);
      }
    }
    const absenceCreditMinutes = mapSummedNonNegativeMinutes(
      [...latestAbsenceRows.values()].map(({ creditMinutes }) => creditMinutes),
      'credit_minutes',
    );
    const absenceExpectedReductionMinutes = mapSummedNonNegativeMinutes(
      [...latestAbsenceRows.values()].map(
        ({ expectedReductionMinutes }) => expectedReductionMinutes,
      ),
      'expected_reduction_minutes',
    );

    const [unresolvedCorrection] = await this.transaction
      .select({ id: correctionRequests.id })
      .from(correctionRequests)
      .where(
        and(
          eq(correctionRequests.organizationId, input.organizationId),
          eq(correctionRequests.employeeId, input.employeeId),
          eq(correctionRequests.localDate, input.localDate),
          inArray(correctionRequests.status, ['SUBMITTED', 'CHANGES_REQUESTED', 'APPROVED']),
        ),
      )
      .limit(1);
    const [unresolvedAbsence] = await this.transaction
      .select({ id: absenceRequests.id })
      .from(absenceRequests)
      .innerJoin(
        absenceCoverageSegments,
        and(
          eq(absenceCoverageSegments.absenceRequestId, absenceRequests.id),
          eq(absenceCoverageSegments.organizationId, absenceRequests.organizationId),
        ),
      )
      .where(
        and(
          eq(absenceRequests.organizationId, input.organizationId),
          eq(absenceRequests.employeeId, input.employeeId),
          eq(absenceRequests.status, 'SUBMITTED'),
          eq(absenceCoverageSegments.localDate, input.localDate),
        ),
      )
      .limit(1);

    return Object.freeze({
      absenceCreditMinutes,
      absenceExpectedReductionMinutes,
      events: Object.freeze(events),
      flexNegativeThresholdMinutes: warningThreshold,
      flexPositiveThresholdMinutes: warningThreshold,
      hasUnresolvedApprovalRequiredAbsence: unresolvedAbsence !== undefined,
      hasUnresolvedCorrection: unresolvedCorrection !== undefined,
      head: headRow === undefined ? null : mapAttendanceHead(headRow),
      holiday:
        holidayRow === undefined
          ? null
          : Object.freeze({
              id: mapDomainId<'Holiday'>(holidayRow.id, 'holidays', 'id'),
              name: holidayRow.name,
            }),
      policyAssignments: Object.freeze(mappedPolicyAssignments),
      scheduleAssignments: Object.freeze(mappedScheduleAssignments),
      timelineTruncated,
    });
  }
}

function mapPolicyWarningThreshold(rules: Readonly<Record<string, unknown>> | undefined) {
  if (rules === undefined) return null;
  const value = rules['flexibleTimeWarningMinutes'];
  if (value === undefined) return null;
  const parsed = parseNonNegativeMinutes(value);
  if (!parsed.ok) throw new DatabaseValueError('time_policies', 'rules');
  return parsed.value;
}

function mapSummedNonNegativeMinutes(values: readonly number[], column: string) {
  const parsed = parseNonNegativeMinutes(values.reduce((total, value) => total + value, 0));
  if (!parsed.ok) throw new DatabaseValueError('absence_effects', column);
  return parsed.value;
}

class PostgresDailyProjectionRepository implements DailyProjectionRepository {
  constructor(private readonly transaction: RepositoryTransaction) {}

  async findForEmployee(
    organizationId: DomainId<'Organization'>,
    employeeId: DomainId<'Employee'>,
    projectionId: DomainId<'DailyProjection'>,
  ): Promise<DailyProjectionRecord | null> {
    const [row] = await this.transaction
      .select()
      .from(dailyProjections)
      .where(
        and(
          eq(dailyProjections.organizationId, organizationId),
          eq(dailyProjections.employeeId, employeeId),
          eq(dailyProjections.id, projectionId),
        ),
      )
      .limit(1);

    return row === undefined ? null : mapDailyProjection(row);
  }

  async findByEmployeeDate(
    organizationId: DomainId<'Organization'>,
    employeeId: DomainId<'Employee'>,
    localDate: ReplaceDailyProjectionInput['localDate'],
  ): Promise<DailyProjectionRecord | null> {
    const [row] = await this.transaction
      .select()
      .from(dailyProjections)
      .where(
        and(
          eq(dailyProjections.organizationId, organizationId),
          eq(dailyProjections.employeeId, employeeId),
          eq(dailyProjections.localDate, localDate),
        ),
      )
      .limit(1);

    return row === undefined ? null : mapDailyProjection(row);
  }

  async listForEmployeeRange(
    organizationId: DomainId<'Organization'>,
    employeeId: DomainId<'Employee'>,
    startDate: DailyProjectionRecord['localDate'],
    endDate: DailyProjectionRecord['localDate'],
  ): Promise<readonly DailyProjectionRecord[]> {
    const rows = await this.transaction
      .select()
      .from(dailyProjections)
      .where(
        and(
          eq(dailyProjections.organizationId, organizationId),
          eq(dailyProjections.employeeId, employeeId),
          gte(dailyProjections.localDate, startDate),
          lte(dailyProjections.localDate, endDate),
        ),
      )
      .orderBy(asc(dailyProjections.localDate));

    return Object.freeze(rows.map(mapDailyProjection));
  }

  async listForEmployeeThroughDate(
    organizationId: DomainId<'Organization'>,
    employeeId: DomainId<'Employee'>,
    endDate: DailyProjectionRecord['localDate'],
  ): Promise<readonly DailyProjectionRecord[]> {
    const rows = await this.transaction
      .select()
      .from(dailyProjections)
      .where(
        and(
          eq(dailyProjections.organizationId, organizationId),
          eq(dailyProjections.employeeId, employeeId),
          lte(dailyProjections.localDate, endDate),
        ),
      )
      .orderBy(asc(dailyProjections.localDate));

    return Object.freeze(rows.map(mapDailyProjection));
  }

  async replaceNext(input: ReplaceDailyProjectionInput): Promise<DailyProjectionRecord | null> {
    const values = {
      absenceCreditMinutes: input.absenceCreditMinutes,
      adjustmentMinutes: input.adjustmentMinutes,
      balanceMinutes: input.balanceMinutes,
      breakMinutes: input.breakMinutes,
      calculatedAt: input.calculatedAt,
      calculationStatus: input.calculationStatus,
      creditedMinutes: input.creditedMinutes,
      employeeId: input.employeeId,
      engineVersion: input.engineVersion,
      expectedMinutes: input.expectedMinutes,
      localDate: input.localDate,
      organizationId: input.organizationId,
      projectionVersion: input.projectionVersion,
      sourceFingerprint: input.sourceFingerprint,
      sourceReferences: input.sourceReferences,
      warningCodes: [...input.warningCodes],
      workedMinutes: input.workedMinutes,
    };
    const [row] = await this.transaction
      .insert(dailyProjections)
      .values(values)
      .onConflictDoUpdate({
        set: values,
        setWhere: sql`${dailyProjections.projectionVersion} + 1 = ${input.projectionVersion}`,
        target: [dailyProjections.employeeId, dailyProjections.localDate],
      })
      .returning();

    return row === undefined ? null : mapDailyProjection(row);
  }
}

class PostgresMonthlyPeriodRepository implements MonthlyPeriodRepository {
  constructor(private readonly transaction: RepositoryTransaction) {}

  async appendDecision(
    input: Parameters<MonthlyPeriodRepository['appendDecision']>[0],
  ): Promise<MonthlyPeriodDecisionRecord> {
    const [row] = await this.transaction
      .insert(monthlyPeriodDecisions)
      .values({
        action: input.action,
        actorAccountId: input.actor.accountId,
        actorAuthority: input.actor.authority,
        actorEmployeeId: input.actor.employeeId,
        decidedAt: input.decidedAt,
        monthlyPeriodId: input.monthlyPeriodId,
        monthlySnapshotId: input.monthlySnapshotId,
        nextStatus: input.nextStatus,
        nextVersion: input.nextVersion,
        organizationId: input.organizationId,
        previousStatus: input.previousStatus,
        previousVersion: input.previousVersion,
        reason: input.reason,
      })
      .returning();
    if (row === undefined) throw new DatabaseValueError('monthly_period_decisions', 'id');
    return mapMonthlyPeriodDecision(row);
  }

  async appendSnapshot(
    input: Parameters<MonthlyPeriodRepository['appendSnapshot']>[0],
  ): Promise<ApprovedMonthlySnapshotRecord> {
    const [row] = await this.transaction
      .insert(approvedMonthlySnapshots)
      .values({
        approvalCycle: input.approvalCycle,
        approvedAt: input.approvedAt,
        approvedByAccountId: input.approver.accountId,
        approvedByAuthority: input.approver.authority,
        approvedByEmployeeId: input.approver.employeeId,
        engineVersion: input.engineVersion,
        id: input.id,
        monthlyPeriodId: input.monthlyPeriodId,
        organizationId: input.organizationId,
        periodVersion: input.periodVersion,
        schemaVersion: input.schemaVersion,
        snapshot: input.snapshot,
        snapshotFingerprint: input.snapshotFingerprint,
        sourceFingerprint: input.sourceFingerprint,
      })
      .returning();
    if (row === undefined) throw new DatabaseValueError('approved_monthly_snapshots', 'id');
    return mapApprovedMonthlySnapshot(row);
  }

  async findProtectionForRange(
    organizationId: Parameters<MonthlyPeriodRepository['findProtectionForRange']>[0],
    employeeId: Parameters<MonthlyPeriodRepository['findProtectionForRange']>[1],
    startDate: Parameters<MonthlyPeriodRepository['findProtectionForRange']>[2],
    endDate: Parameters<MonthlyPeriodRepository['findProtectionForRange']>[3],
  ): ReturnType<MonthlyPeriodRepository['findProtectionForRange']> {
    const rows = await this.transaction
      .select({ status: monthlyPeriods.status })
      .from(monthlyPeriods)
      .where(
        and(
          eq(monthlyPeriods.organizationId, organizationId),
          eq(monthlyPeriods.employeeId, employeeId),
          gte(monthlyPeriods.monthStart, `${startDate.slice(0, 7)}-01`),
          lte(monthlyPeriods.monthStart, `${endDate.slice(0, 7)}-01`),
        ),
      )
      .orderBy(
        sql`case ${monthlyPeriods.status} when 'LOCKED' then 1 when 'APPROVED' then 2 when 'SUBMITTED' then 3 else 4 end`,
        asc(monthlyPeriods.monthStart),
      )
      .for('share');
    const row = rows[0];
    if (
      row === undefined ||
      (row.status !== 'SUBMITTED' && row.status !== 'APPROVED' && row.status !== 'LOCKED')
    ) {
      return null;
    }
    return row.status;
  }

  async findByEmployeeMonth(
    organizationId: Parameters<MonthlyPeriodRepository['findByEmployeeMonth']>[0],
    employeeId: Parameters<MonthlyPeriodRepository['findByEmployeeMonth']>[1],
    monthStart: Parameters<MonthlyPeriodRepository['findByEmployeeMonth']>[2],
  ): Promise<MonthlyPeriodRecord | null> {
    const [row] = await this.transaction
      .select({ employeeDisplayName: employees.displayName, period: monthlyPeriods })
      .from(monthlyPeriods)
      .innerJoin(
        employees,
        and(
          eq(employees.id, monthlyPeriods.employeeId),
          eq(employees.organizationId, monthlyPeriods.organizationId),
        ),
      )
      .where(
        and(
          eq(monthlyPeriods.organizationId, organizationId),
          eq(monthlyPeriods.employeeId, employeeId),
          eq(monthlyPeriods.monthStart, monthStart),
        ),
      )
      .limit(1);
    return row === undefined ? null : mapMonthlyPeriod(row.period, row.employeeDisplayName);
  }

  async loadProjectionSource(
    organizationId: Parameters<MonthlyPeriodRepository['loadProjectionSource']>[0],
    periodId: Parameters<MonthlyPeriodRepository['loadProjectionSource']>[1],
  ): Promise<MonthlyPeriodProjectionSourceRecord | null> {
    const [row] = await this.transaction
      .select({ employeeDisplayName: employees.displayName, period: monthlyPeriods })
      .from(monthlyPeriods)
      .innerJoin(
        employees,
        and(
          eq(employees.id, monthlyPeriods.employeeId),
          eq(employees.organizationId, monthlyPeriods.organizationId),
        ),
      )
      .where(
        and(eq(monthlyPeriods.organizationId, organizationId), eq(monthlyPeriods.id, periodId)),
      )
      .limit(1);
    if (row === undefined) return null;

    const period = mapMonthlyPeriod(row.period, row.employeeDisplayName);
    const monthEnd = endOfMonth(period.monthStart);

    const employmentRows = await this.transaction
      .select({
        endsOn: employmentPeriods.endsOn,
        id: employmentPeriods.id,
        startsOn: employmentPeriods.startsOn,
      })
      .from(employmentPeriods)
      .where(
        and(
          eq(employmentPeriods.organizationId, organizationId),
          eq(employmentPeriods.employeeId, period.employeeId),
          lte(employmentPeriods.startsOn, monthEnd),
          or(isNull(employmentPeriods.endsOn), gt(employmentPeriods.endsOn, period.monthStart)),
        ),
      )
      .orderBy(asc(employmentPeriods.startsOn), asc(employmentPeriods.id));
    const scheduleRows = await this.transaction
      .select({
        endsOn: scheduleAssignments.endsOn,
        id: scheduleAssignments.id,
        fridayMinutes: weeklySchedules.fridayMinutes,
        mondayMinutes: weeklySchedules.mondayMinutes,
        saturdayMinutes: weeklySchedules.saturdayMinutes,
        scheduleId: weeklySchedules.id,
        scheduleVersion: weeklySchedules.version,
        startsOn: scheduleAssignments.startsOn,
        sundayMinutes: weeklySchedules.sundayMinutes,
        thursdayMinutes: weeklySchedules.thursdayMinutes,
        tuesdayMinutes: weeklySchedules.tuesdayMinutes,
        wednesdayMinutes: weeklySchedules.wednesdayMinutes,
      })
      .from(scheduleAssignments)
      .innerJoin(
        weeklySchedules,
        and(
          eq(weeklySchedules.organizationId, organizationId),
          eq(weeklySchedules.id, scheduleAssignments.scheduleId),
        ),
      )
      .where(
        and(
          eq(scheduleAssignments.organizationId, organizationId),
          eq(scheduleAssignments.employeeId, period.employeeId),
          lte(scheduleAssignments.startsOn, monthEnd),
          or(isNull(scheduleAssignments.endsOn), gt(scheduleAssignments.endsOn, period.monthStart)),
        ),
      )
      .orderBy(asc(scheduleAssignments.startsOn), asc(scheduleAssignments.id));
    const policyRows = await this.transaction
      .select({
        endsOn: policyAssignments.endsOn,
        id: policyAssignments.id,
        policyId: timePolicies.id,
        policyVersion: timePolicies.version,
        startsOn: policyAssignments.startsOn,
      })
      .from(policyAssignments)
      .innerJoin(
        timePolicies,
        and(
          eq(timePolicies.organizationId, organizationId),
          eq(timePolicies.id, policyAssignments.policyId),
        ),
      )
      .where(
        and(
          eq(policyAssignments.organizationId, organizationId),
          eq(policyAssignments.employeeId, period.employeeId),
          lte(policyAssignments.startsOn, monthEnd),
          or(isNull(policyAssignments.endsOn), gt(policyAssignments.endsOn, period.monthStart)),
        ),
      )
      .orderBy(asc(policyAssignments.startsOn), asc(policyAssignments.id));
    const projectionRows = await this.transaction
      .select()
      .from(dailyProjections)
      .where(
        and(
          eq(dailyProjections.organizationId, organizationId),
          eq(dailyProjections.employeeId, period.employeeId),
          gte(dailyProjections.localDate, period.monthStart),
          lte(dailyProjections.localDate, monthEnd),
        ),
      )
      .orderBy(asc(dailyProjections.localDate));
    const holidayRows = await this.transaction
      .select({ id: holidays.id, localDate: holidays.holidayDate })
      .from(holidays)
      .where(
        and(
          eq(holidays.organizationId, organizationId),
          gte(holidays.holidayDate, period.monthStart),
          lte(holidays.holidayDate, monthEnd),
        ),
      )
      .orderBy(asc(holidays.holidayDate), asc(holidays.id));
    const absenceEffectRows = await this.transaction
      .select({
        absenceCreditMinutes: absenceEffects.creditMinutes,
        absenceExpectedReductionMinutes: absenceEffects.expectedReductionMinutes,
        coverageSegmentId: absenceEffects.absenceCoverageSegmentId,
        effectId: absenceEffects.id,
        effectVersion: absenceEffects.effectVersion,
        localDate: absenceEffects.localDate,
      })
      .from(absenceEffects)
      .where(
        and(
          eq(absenceEffects.organizationId, organizationId),
          eq(absenceEffects.employeeId, period.employeeId),
          gte(absenceEffects.localDate, period.monthStart),
          lte(absenceEffects.localDate, monthEnd),
        ),
      )
      .orderBy(
        asc(absenceEffects.localDate),
        asc(absenceEffects.absenceCoverageSegmentId),
        desc(absenceEffects.effectVersion),
        asc(absenceEffects.id),
      );
    const latestAbsenceEffects = new Map<string, (typeof absenceEffectRows)[number]>();
    for (const effect of absenceEffectRows) {
      if (!latestAbsenceEffects.has(effect.coverageSegmentId)) {
        latestAbsenceEffects.set(effect.coverageSegmentId, effect);
      }
    }
    const appliedCorrectionRows = await this.transaction
      .select({
        appliedCorrectionId: appliedCorrections.id,
        localDate: appliedCorrections.localDate,
        version: appliedCorrections.version,
      })
      .from(appliedCorrections)
      .where(
        and(
          eq(appliedCorrections.organizationId, organizationId),
          eq(appliedCorrections.employeeId, period.employeeId),
          gte(appliedCorrections.localDate, period.monthStart),
          lte(appliedCorrections.localDate, monthEnd),
        ),
      )
      .orderBy(
        asc(appliedCorrections.localDate),
        asc(appliedCorrections.version),
        asc(appliedCorrections.id),
      );
    const postLockAdjustmentRows = await this.transaction
      .select({ adjustment: postLockAdjustments })
      .from(postLockAdjustments)
      .innerJoin(
        approvedMonthlySnapshots,
        and(
          eq(approvedMonthlySnapshots.id, postLockAdjustments.monthlySnapshotId),
          eq(approvedMonthlySnapshots.organizationId, postLockAdjustments.organizationId),
        ),
      )
      .where(
        and(
          eq(postLockAdjustments.organizationId, organizationId),
          eq(postLockAdjustments.employeeId, period.employeeId),
          eq(approvedMonthlySnapshots.monthlyPeriodId, period.id),
          isNotNull(postLockAdjustments.adjustmentVersion),
          isNotNull(postLockAdjustments.appliedCorrectionId),
          isNotNull(postLockAdjustments.correctionDecisionId),
          isNotNull(postLockAdjustments.correctionRequestId),
          isNotNull(postLockAdjustments.previousAdjustedWorkedMinutes),
          isNotNull(postLockAdjustments.proposedWorkedMinutes),
        ),
      )
      .orderBy(asc(postLockAdjustments.adjustmentVersion), asc(postLockAdjustments.id));
    const ledgerRows = await this.transaction
      .select()
      .from(timeAccountEntries)
      .where(
        and(
          eq(timeAccountEntries.organizationId, organizationId),
          eq(timeAccountEntries.employeeId, period.employeeId),
          lte(timeAccountEntries.localDate, monthEnd),
        ),
      )
      .orderBy(asc(timeAccountEntries.postedAt), asc(timeAccountEntries.id));
    const correctionRows = await this.transaction
      .select({
        id: correctionRequests.id,
        localDate: correctionRequests.localDate,
        version: correctionRequests.version,
      })
      .from(correctionRequests)
      .where(
        and(
          eq(correctionRequests.organizationId, organizationId),
          eq(correctionRequests.employeeId, period.employeeId),
          gte(correctionRequests.localDate, period.monthStart),
          lte(correctionRequests.localDate, monthEnd),
          inArray(correctionRequests.status, ['SUBMITTED', 'CHANGES_REQUESTED', 'APPROVED']),
          sql`(${correctionRequests.status} <> 'APPROVED' or not exists (
              select 1 from ${appliedCorrections}
              where ${appliedCorrections.organizationId} = ${organizationId}
                and ${appliedCorrections.correctionRequestId} = ${correctionRequests.id}
            ))`,
        ),
      )
      .orderBy(asc(correctionRequests.localDate), asc(correctionRequests.id));
    const absenceRows = await this.transaction
      .selectDistinct({
        id: absenceRequests.id,
        localDate: absenceCoverageSegments.localDate,
        version: absenceRequests.version,
      })
      .from(absenceRequests)
      .innerJoin(
        absenceCoverageSegments,
        and(
          eq(absenceCoverageSegments.absenceRequestId, absenceRequests.id),
          eq(absenceCoverageSegments.organizationId, absenceRequests.organizationId),
        ),
      )
      .innerJoin(
        absenceTypes,
        and(
          eq(absenceTypes.id, absenceRequests.absenceTypeId),
          eq(absenceTypes.organizationId, absenceRequests.organizationId),
        ),
      )
      .where(
        and(
          eq(absenceRequests.organizationId, organizationId),
          eq(absenceRequests.employeeId, period.employeeId),
          gte(absenceCoverageSegments.localDate, period.monthStart),
          lte(absenceCoverageSegments.localDate, monthEnd),
          inArray(absenceRequests.status, ['SUBMITTED', 'CHANGES_REQUESTED']),
          sql`${absenceTypes.policy}->>'workflow' = 'APPROVAL_REQUIRED'`,
        ),
      )
      .orderBy(asc(absenceCoverageSegments.localDate), asc(absenceRequests.id));
    const cancellationRows = await this.transaction
      .selectDistinct({
        id: absenceCancellations.id,
        localDate: absenceCoverageSegments.localDate,
        version: absenceCancellations.version,
      })
      .from(absenceCancellations)
      .innerJoin(
        absenceCancellationSegments,
        and(
          eq(absenceCancellationSegments.absenceCancellationId, absenceCancellations.id),
          eq(absenceCancellationSegments.organizationId, absenceCancellations.organizationId),
        ),
      )
      .innerJoin(
        absenceCoverageSegments,
        and(
          eq(absenceCoverageSegments.id, absenceCancellationSegments.absenceCoverageSegmentId),
          eq(absenceCoverageSegments.organizationId, absenceCancellations.organizationId),
        ),
      )
      .where(
        and(
          eq(absenceCancellations.organizationId, organizationId),
          eq(absenceCancellations.employeeId, period.employeeId),
          gte(absenceCoverageSegments.localDate, period.monthStart),
          lte(absenceCoverageSegments.localDate, monthEnd),
          inArray(absenceCancellations.status, ['PENDING_DECISION', 'CHANGES_REQUESTED']),
        ),
      )
      .orderBy(asc(absenceCoverageSegments.localDate), asc(absenceCancellations.id));

    return Object.freeze({
      absenceEffects: Object.freeze(
        [...latestAbsenceEffects.values()].map((effect) =>
          Object.freeze({
            absenceCreditMinutes: mapNonNegativeMinutes(
              effect.absenceCreditMinutes,
              'absence_effects',
              'credit_minutes',
            ),
            absenceExpectedReductionMinutes: mapNonNegativeMinutes(
              effect.absenceExpectedReductionMinutes,
              'absence_effects',
              'expected_reduction_minutes',
            ),
            effectId: mapDomainId<'AbsenceEffect'>(effect.effectId, 'absence_effects', 'id'),
            effectVersion: mapPositiveVersion(
              effect.effectVersion,
              'absence_effects',
              'effect_version',
            ),
            localDate: mapLocalDate(effect.localDate, 'absence_effects', 'local_date'),
          }),
        ),
      ),
      appliedCorrections: Object.freeze(
        appliedCorrectionRows.map((correction) =>
          Object.freeze({
            appliedCorrectionId: mapDomainId<'AppliedCorrection'>(
              correction.appliedCorrectionId,
              'applied_corrections',
              'id',
            ),
            localDate: mapLocalDate(correction.localDate, 'applied_corrections', 'local_date'),
            version: mapPositiveVersion(correction.version, 'applied_corrections', 'version'),
          }),
        ),
      ),
      dailyProjections: Object.freeze(projectionRows.map(mapDailyProjection)),
      employmentPeriods: Object.freeze(
        employmentRows.map((range) => mapMonthlyRange(range, 'employment_periods')),
      ),
      holidays: Object.freeze(
        holidayRows.map((holiday) =>
          Object.freeze({
            holidayId: mapDomainId<'Holiday'>(holiday.id, 'holidays', 'id'),
            localDate: mapLocalDate(holiday.localDate, 'holidays', 'holiday_date'),
          }),
        ),
      ),
      ledgerEntries: Object.freeze(
        ledgerRows.map((entry) =>
          Object.freeze({
            ...mapTimeAccountEntry(entry),
            sourceFingerprint: entry.sourceFingerprint,
          }),
        ),
      ),
      period,
      postLockAdjustments: Object.freeze(
        postLockAdjustmentRows.map(({ adjustment }) => mapPostLockAdjustment(adjustment)),
      ),
      policyAssignments: Object.freeze(
        policyRows.map((assignment) =>
          Object.freeze({
            ...mapMonthlyRange(assignment, 'policy_assignments'),
            policyId: mapDomainId<'TimePolicy'>(assignment.policyId, 'time_policies', 'id'),
            policyVersion: mapPositiveVersion(assignment.policyVersion, 'time_policies', 'version'),
          }),
        ),
      ),
      scheduleAssignments: Object.freeze(
        scheduleRows.map((assignment) =>
          Object.freeze({
            ...mapMonthlyRange(assignment, 'schedule_assignments'),
            scheduleId: mapDomainId<'WeeklySchedule'>(
              assignment.scheduleId,
              'weekly_schedules',
              'id',
            ),
            scheduleVersion: mapPositiveVersion(
              assignment.scheduleVersion,
              'weekly_schedules',
              'version',
            ),
            scheduledMinutesByIsoWeekday: Object.freeze([
              mapNonNegativeMinutes(assignment.mondayMinutes, 'weekly_schedules', 'monday_minutes'),
              mapNonNegativeMinutes(
                assignment.tuesdayMinutes,
                'weekly_schedules',
                'tuesday_minutes',
              ),
              mapNonNegativeMinutes(
                assignment.wednesdayMinutes,
                'weekly_schedules',
                'wednesday_minutes',
              ),
              mapNonNegativeMinutes(
                assignment.thursdayMinutes,
                'weekly_schedules',
                'thursday_minutes',
              ),
              mapNonNegativeMinutes(assignment.fridayMinutes, 'weekly_schedules', 'friday_minutes'),
              mapNonNegativeMinutes(
                assignment.saturdayMinutes,
                'weekly_schedules',
                'saturday_minutes',
              ),
              mapNonNegativeMinutes(assignment.sundayMinutes, 'weekly_schedules', 'sunday_minutes'),
            ]) as readonly [number, number, number, number, number, number, number],
          }),
        ),
      ),
      sourceBlockers: Object.freeze([
        ...correctionRows.map((source) => mapMonthlyBlocker(source, 'CORRECTION_UNRESOLVED')),
        ...absenceRows.map((source) => mapMonthlyBlocker(source, 'ABSENCE_APPROVAL_PENDING')),
        ...cancellationRows.map((source) => mapMonthlyBlocker(source, 'ABSENCE_APPROVAL_PENDING')),
      ]),
    });
  }

  async findLatestSnapshot(
    organizationId: Parameters<MonthlyPeriodRepository['findLatestSnapshot']>[0],
    periodId: Parameters<MonthlyPeriodRepository['findLatestSnapshot']>[1],
  ): Promise<ApprovedMonthlySnapshotRecord | null> {
    const [row] = await this.transaction
      .select()
      .from(approvedMonthlySnapshots)
      .where(
        and(
          eq(approvedMonthlySnapshots.organizationId, organizationId),
          eq(approvedMonthlySnapshots.monthlyPeriodId, periodId),
        ),
      )
      .orderBy(desc(approvedMonthlySnapshots.approvalCycle))
      .limit(1);
    return row === undefined ? null : mapApprovedMonthlySnapshot(row);
  }

  async listDecisions(
    organizationId: Parameters<MonthlyPeriodRepository['listDecisions']>[0],
    periodId: Parameters<MonthlyPeriodRepository['listDecisions']>[1],
  ): Promise<readonly MonthlyPeriodDecisionRecord[]> {
    const rows = await this.transaction
      .select()
      .from(monthlyPeriodDecisions)
      .where(
        and(
          eq(monthlyPeriodDecisions.organizationId, organizationId),
          eq(monthlyPeriodDecisions.monthlyPeriodId, periodId),
        ),
      )
      .orderBy(asc(monthlyPeriodDecisions.nextVersion));
    return Object.freeze(rows.map(mapMonthlyPeriodDecision));
  }

  async lockForSubmission(
    organizationId: Parameters<MonthlyPeriodRepository['lockForSubmission']>[0],
    periodId: Parameters<MonthlyPeriodRepository['lockForSubmission']>[1],
  ): Promise<MonthlyPeriodRecord | null> {
    const [row] = await this.transaction
      .select({ employeeDisplayName: employees.displayName, period: monthlyPeriods })
      .from(monthlyPeriods)
      .innerJoin(
        employees,
        and(
          eq(employees.id, monthlyPeriods.employeeId),
          eq(employees.organizationId, monthlyPeriods.organizationId),
        ),
      )
      .where(
        and(eq(monthlyPeriods.organizationId, organizationId), eq(monthlyPeriods.id, periodId)),
      )
      .for('update', { of: monthlyPeriods })
      .limit(1);
    return row === undefined ? null : mapMonthlyPeriod(row.period, row.employeeDisplayName);
  }

  async submit(
    input: Parameters<MonthlyPeriodRepository['submit']>[0],
  ): ReturnType<MonthlyPeriodRepository['submit']> {
    const [row] = await this.transaction
      .update(monthlyPeriods)
      .set({
        status: 'SUBMITTED',
        submittedAt: input.submittedAt,
        submittedByAccountId: input.actorAccountId,
        submittedSourceFingerprint: input.sourceFingerprint,
        version: input.expectedVersion + 1,
      })
      .where(
        and(
          eq(monthlyPeriods.organizationId, input.organizationId),
          eq(monthlyPeriods.id, input.periodId),
          inArray(monthlyPeriods.status, ['OPEN', 'CHANGES_REQUESTED']),
          eq(monthlyPeriods.version, input.expectedVersion),
        ),
      )
      .returning({
        status: monthlyPeriods.status,
        submittedAt: monthlyPeriods.submittedAt,
        submittedByAccountId: monthlyPeriods.submittedByAccountId,
        submittedSourceFingerprint: monthlyPeriods.submittedSourceFingerprint,
        version: monthlyPeriods.version,
      });
    if (
      row === undefined ||
      row.status !== 'SUBMITTED' ||
      row.submittedAt === null ||
      row.submittedByAccountId === null ||
      row.submittedSourceFingerprint === null
    ) {
      return null;
    }
    return Object.freeze({
      status: row.status,
      submittedAt: mapInstant(row.submittedAt, 'monthly_periods', 'submitted_at'),
      submittedByAccountId: mapDomainId<'Account'>(
        row.submittedByAccountId,
        'monthly_periods',
        'submitted_by_account_id',
      ),
      submittedSourceFingerprint: row.submittedSourceFingerprint,
      version: row.version,
    });
  }

  async transition(
    input: Parameters<MonthlyPeriodRepository['transition']>[0],
  ): Promise<MonthlyPeriodRecord | null> {
    const [row] = await this.transaction
      .update(monthlyPeriods)
      .set({
        ...(input.action === 'REQUEST_CHANGES'
          ? {
              approvedAt: null,
              submittedSourceFingerprint: null,
            }
          : {}),
        ...(input.action === 'APPROVE' ? { approvedAt: input.approvedAt } : {}),
        ...(input.action === 'LOCK' ? { lockedAt: input.lockedAt } : {}),
        status: input.nextStatus,
        version: input.expectedVersion + 1,
      })
      .where(
        and(
          eq(monthlyPeriods.organizationId, input.organizationId),
          eq(monthlyPeriods.id, input.periodId),
          eq(monthlyPeriods.status, input.expectedStatus),
          eq(monthlyPeriods.version, input.expectedVersion),
        ),
      )
      .returning();
    if (row === undefined) return null;
    const [employee] = await this.transaction
      .select({ displayName: employees.displayName })
      .from(employees)
      .where(
        and(eq(employees.organizationId, input.organizationId), eq(employees.id, row.employeeId)),
      )
      .limit(1);
    if (employee === undefined) throw new DatabaseValueError('employees', 'display_name');
    return mapMonthlyPeriod(row, employee.displayName);
  }
}

class PostgresCorrectionRequestRepository implements CorrectionRequestRepository {
  constructor(private readonly transaction: RepositoryTransaction) {}

  async submit(input: SubmitCorrectionRequestInput): Promise<CorrectionRequestRecord> {
    const [row] = await this.transaction
      .insert(correctionRequests)
      .values({
        employeeId: input.employeeId,
        localDate: input.localDate,
        lockedMonthlySnapshotId: input.lockedMonthlySnapshotId,
        organizationId: input.organizationId,
        originalInterpretation: input.originalInterpretation,
        proposedInterpretation: input.proposedInterpretation,
        reason: input.reason,
        requestedByEmployeeId: input.requestedByEmployeeId,
        status: input.status,
        version: input.version,
      })
      .returning();
    if (row === undefined) throw new DatabaseValueError('correction_requests', 'id');
    return mapCorrectionRequest(row);
  }

  async findApprovedDecisionId(
    organizationId: DomainId<'Organization'>,
    requestId: DomainId<'CorrectionRequest'>,
  ): Promise<DomainId<'CorrectionDecision'> | null> {
    const [row] = await this.transaction
      .select({ id: correctionDecisions.id })
      .from(correctionDecisions)
      .where(
        and(
          eq(correctionDecisions.organizationId, organizationId),
          eq(correctionDecisions.correctionRequestId, requestId),
          eq(correctionDecisions.action, 'APPROVE'),
        ),
      )
      .orderBy(desc(correctionDecisions.decidedAt), desc(correctionDecisions.id))
      .limit(1);
    return row === undefined
      ? null
      : mapDomainId<'CorrectionDecision'>(row.id, 'correction_decisions', 'id');
  }

  async appendPostLockAdjustment(
    input: AppendPostLockAdjustmentInput,
  ): Promise<PostLockAdjustmentRecord | null> {
    const [row] = await this.transaction
      .insert(postLockAdjustments)
      .values({
        adjustmentVersion: input.adjustmentVersion,
        appliedCorrectionId: input.appliedCorrectionId,
        correctionDecisionId: input.correctionDecisionId,
        correctionRequestId: input.correctionRequestId,
        createdAt: input.createdAt,
        employeeId: input.employeeId,
        id: input.id,
        localDate: input.localDate,
        minutes: input.minutes,
        monthlySnapshotId: input.monthlySnapshotId,
        organizationId: input.organizationId,
        previousAdjustedWorkedMinutes: input.previousAdjustedWorkedMinutes,
        proposedWorkedMinutes: input.proposedWorkedMinutes,
        reason: input.reason,
        reversesAdjustmentId: input.reversesAdjustmentId,
        sourceId: input.sourceId,
      })
      .onConflictDoNothing()
      .returning();
    return row === undefined ? null : mapPostLockAdjustment(row);
  }

  async hasLockedMonth(
    organizationId: DomainId<'Organization'>,
    employeeId: DomainId<'Employee'>,
    localDate: LocalDate,
  ): Promise<boolean> {
    const monthStart = `${localDate.slice(0, 7)}-01`;
    const [row] = await this.transaction
      .select({ id: monthlyPeriods.id })
      .from(monthlyPeriods)
      .where(
        and(
          eq(monthlyPeriods.organizationId, organizationId),
          eq(monthlyPeriods.employeeId, employeeId),
          eq(monthlyPeriods.monthStart, monthStart),
          eq(monthlyPeriods.status, 'LOCKED'),
        ),
      )
      .limit(1);
    return row !== undefined;
  }

  async hasApplied(
    organizationId: DomainId<'Organization'>,
    requestId: DomainId<'CorrectionRequest'>,
  ): Promise<boolean> {
    const [row] = await this.transaction
      .select({ id: appliedCorrections.id })
      .from(appliedCorrections)
      .where(
        and(
          eq(appliedCorrections.organizationId, organizationId),
          eq(appliedCorrections.correctionRequestId, requestId),
        ),
      )
      .limit(1);
    return row !== undefined;
  }

  async apply(input: ApplyCorrectionInput): Promise<AppliedCorrectionRecord | null> {
    const [row] = await this.transaction
      .insert(appliedCorrections)
      .values({
        correctionDecisionId: input.correctionDecisionId,
        correctionRequestId: input.correctionRequestId,
        employeeId: input.employeeId,
        interpretation: input.interpretation,
        localDate: input.localDate,
        organizationId: input.organizationId,
        version: input.version,
      })
      .onConflictDoNothing()
      .returning();
    if (row === undefined) return null;
    return Object.freeze({
      correctionDecisionId: mapDomainId<'CorrectionDecision'>(
        row.correctionDecisionId,
        'applied_corrections',
        'correction_decision_id',
      ),
      correctionRequestId: mapDomainId<'CorrectionRequest'>(
        row.correctionRequestId,
        'applied_corrections',
        'correction_request_id',
      ),
      id: mapDomainId<'AppliedCorrection'>(row.id, 'applied_corrections', 'id'),
      interpretation: Object.freeze(row.interpretation),
      version: row.version,
    });
  }

  async listPendingForEmployees(
    organizationId: DomainId<'Organization'>,
    employeeIds: readonly DomainId<'Employee'>[],
  ): Promise<readonly CorrectionReviewRecord[]> {
    if (employeeIds.length === 0) return Object.freeze([]);
    const rows = await this.transaction
      .select({ request: correctionRequests, employeeDisplayName: employees.displayName })
      .from(correctionRequests)
      .innerJoin(employees, eq(employees.id, correctionRequests.employeeId))
      .leftJoin(
        appliedCorrections,
        eq(appliedCorrections.correctionRequestId, correctionRequests.id),
      )
      .where(
        and(
          eq(correctionRequests.organizationId, organizationId),
          inArray(correctionRequests.employeeId, [...employeeIds]),
          inArray(correctionRequests.status, ['SUBMITTED', 'CHANGES_REQUESTED', 'APPROVED']),
          isNull(appliedCorrections.id),
        ),
      )
      .orderBy(asc(correctionRequests.createdAt), asc(correctionRequests.id));
    return Object.freeze(
      rows.map((row) => mapCorrectionReview(row.request, row.employeeDisplayName)),
    );
  }

  async listPostLockAdjustments(
    organizationId: DomainId<'Organization'>,
    monthlySnapshotId: DomainId<'MonthlySnapshot'>,
  ): Promise<readonly PostLockAdjustmentRecord[]> {
    const rows = await this.transaction
      .select()
      .from(postLockAdjustments)
      .where(
        and(
          eq(postLockAdjustments.organizationId, organizationId),
          eq(postLockAdjustments.monthlySnapshotId, monthlySnapshotId),
          isNotNull(postLockAdjustments.adjustmentVersion),
          isNotNull(postLockAdjustments.appliedCorrectionId),
          isNotNull(postLockAdjustments.correctionDecisionId),
          isNotNull(postLockAdjustments.correctionRequestId),
          isNotNull(postLockAdjustments.previousAdjustedWorkedMinutes),
          isNotNull(postLockAdjustments.proposedWorkedMinutes),
        ),
      )
      .orderBy(asc(postLockAdjustments.adjustmentVersion), asc(postLockAdjustments.id));
    return Object.freeze(rows.map(mapPostLockAdjustment));
  }

  async findForReview(
    organizationId: DomainId<'Organization'>,
    requestId: DomainId<'CorrectionRequest'>,
  ): Promise<CorrectionReviewRecord | null> {
    const [row] = await this.transaction
      .select({ request: correctionRequests, employeeDisplayName: employees.displayName })
      .from(correctionRequests)
      .innerJoin(employees, eq(employees.id, correctionRequests.employeeId))
      .where(
        and(
          eq(correctionRequests.organizationId, organizationId),
          eq(correctionRequests.id, requestId),
        ),
      )
      .limit(1);
    return row === undefined ? null : mapCorrectionReview(row.request, row.employeeDisplayName);
  }

  async decide(input: DecideCorrectionRequestInput): Promise<CorrectionReviewRecord | null> {
    const status =
      input.action === 'APPROVE'
        ? 'APPROVED'
        : input.action === 'REJECT'
          ? 'REJECTED'
          : 'CHANGES_REQUESTED';
    const [updated] = await this.transaction
      .update(correctionRequests)
      .set({ status, version: sql`${correctionRequests.version} + 1` })
      .where(
        and(
          eq(correctionRequests.organizationId, input.organizationId),
          eq(correctionRequests.id, input.requestId),
          eq(correctionRequests.version, input.expectedVersion),
          inArray(correctionRequests.status, ['SUBMITTED', 'CHANGES_REQUESTED']),
        ),
      )
      .returning();
    if (updated === undefined) return null;
    await this.transaction.insert(correctionDecisions).values({
      action: input.action,
      actorAccountId: input.actor.accountId,
      actorAuthority: input.actor.authority,
      actorEmployeeId: input.actor.employeeId,
      correctionRequestId: input.requestId,
      organizationId: input.organizationId,
      reason: input.reason,
      decidedAt: sql`now()`,
    });
    return mapCorrectionReview(
      updated,
      (
        await this.transaction
          .select({ displayName: employees.displayName })
          .from(employees)
          .where(eq(employees.id, updated.employeeId))
          .limit(1)
      )[0]?.displayName ?? '',
    );
  }
}

class PostgresAbsenceRequestRepository implements AbsenceRequestRepository {
  constructor(private readonly transaction: RepositoryTransaction) {}

  async findForApproval(
    organizationId: DomainId<'Organization'>,
    requestId: DomainId<'AbsenceRequest'>,
  ): Promise<ApprovalAbsenceRecord | null> {
    const [row] = await this.transaction
      .select({
        request: absenceRequests,
        absenceTypeActive: absenceTypes.active,
        absenceCode: absenceTypes.code,
        absenceTypeValidFrom: absenceTypes.validFrom,
        absenceTypeValidTo: absenceTypes.validTo,
        absenceTypeName: absenceTypes.name,
        policy: absenceTypes.policy,
        employeeDisplayName: employees.displayName,
      })
      .from(absenceRequests)
      .innerJoin(absenceTypes, eq(absenceTypes.id, absenceRequests.absenceTypeId))
      .innerJoin(employees, eq(employees.id, absenceRequests.employeeId))
      .where(
        and(eq(absenceRequests.organizationId, organizationId), eq(absenceRequests.id, requestId)),
      )
      .limit(1);
    if (row === undefined) return null;
    const coverage = await this.transaction
      .select()
      .from(absenceCoverageSegments)
      .where(
        and(
          eq(absenceCoverageSegments.organizationId, organizationId),
          eq(absenceCoverageSegments.absenceRequestId, requestId),
        ),
      )
      .orderBy(asc(absenceCoverageSegments.localDate), asc(absenceCoverageSegments.id));
    return Object.freeze({
      absenceCode: mapAbsenceTypeCode(row.absenceCode),
      absenceTypeId: mapDomainId<'AbsenceTypeVersion'>(
        row.request.absenceTypeId,
        'absence_requests',
        'absence_type_id',
      ),
      absenceTypeName: row.absenceTypeName,
      coverage: Object.freeze(coverage.map(mapApprovalCoverage)),
      employeeDisplayName: row.employeeDisplayName,
      employeeId: mapDomainId<'Employee'>(
        row.request.employeeId,
        'absence_requests',
        'employee_id',
      ),
      id: mapDomainId<'AbsenceRequest'>(row.request.id, 'absence_requests', 'id'),
      organizationId: mapDomainId<'Organization'>(
        row.request.organizationId,
        'absence_requests',
        'organization_id',
      ),
      policy: mapResolvedAbsenceTypePolicy({
        active: row.absenceTypeActive,
        code: mapAbsenceTypeCode(row.absenceCode),
        id: row.request.absenceTypeId,
        name: row.absenceTypeName,
        policy: row.policy,
        validFrom: row.absenceTypeValidFrom,
        validTo: row.absenceTypeValidTo,
      }),
      status: row.request.status,
      submittedAt: mapInstant(row.request.submittedAt, 'absence_requests', 'submitted_at'),
      version: row.request.version,
    });
  }

  async findCancellationForApproval(
    organizationId: DomainId<'Organization'>,
    cancellationId: DomainId<'AbsenceCancellation'>,
  ): Promise<ApprovalCancellationRecord | null> {
    const [row] = await this.transaction
      .select({
        cancellation: absenceCancellations,
        absenceTypeActive: absenceTypes.active,
        absenceCode: absenceTypes.code,
        absenceTypeId: absenceRequests.absenceTypeId,
        absenceTypeName: absenceTypes.name,
        absenceTypeValidFrom: absenceTypes.validFrom,
        absenceTypeValidTo: absenceTypes.validTo,
        employeeDisplayName: employees.displayName,
        policy: absenceTypes.policy,
      })
      .from(absenceCancellations)
      .innerJoin(absenceRequests, eq(absenceRequests.id, absenceCancellations.absenceRequestId))
      .innerJoin(absenceTypes, eq(absenceTypes.id, absenceRequests.absenceTypeId))
      .innerJoin(employees, eq(employees.id, absenceCancellations.employeeId))
      .where(
        and(
          eq(absenceCancellations.organizationId, organizationId),
          eq(absenceCancellations.id, cancellationId),
        ),
      )
      .limit(1);
    if (row === undefined) return null;
    const coverage = await this.transaction
      .select({ coverage: absenceCoverageSegments })
      .from(absenceCancellationSegments)
      .innerJoin(
        absenceCoverageSegments,
        eq(absenceCoverageSegments.id, absenceCancellationSegments.absenceCoverageSegmentId),
      )
      .where(
        and(
          eq(absenceCancellationSegments.organizationId, organizationId),
          eq(absenceCancellationSegments.absenceCancellationId, cancellationId),
        ),
      )
      .orderBy(asc(absenceCoverageSegments.localDate), asc(absenceCoverageSegments.id));
    return Object.freeze({
      absenceCode: mapAbsenceTypeCode(row.absenceCode),
      absenceTypeId: mapDomainId<'AbsenceTypeVersion'>(
        row.absenceTypeId,
        'absence_requests',
        'absence_type_id',
      ),
      absenceTypeName: row.absenceTypeName,
      coverage: Object.freeze(coverage.map(({ coverage: value }) => mapApprovalCoverage(value))),
      employeeDisplayName: row.employeeDisplayName,
      employeeId: mapDomainId<'Employee'>(
        row.cancellation.employeeId,
        'absence_cancellations',
        'employee_id',
      ),
      id: mapDomainId<'AbsenceCancellation'>(row.cancellation.id, 'absence_cancellations', 'id'),
      organizationId: mapDomainId<'Organization'>(
        row.cancellation.organizationId,
        'absence_cancellations',
        'organization_id',
      ),
      policy: mapResolvedAbsenceTypePolicy({
        active: row.absenceTypeActive,
        code: mapAbsenceTypeCode(row.absenceCode),
        id: row.absenceTypeId,
        name: row.absenceTypeName,
        policy: row.policy,
        validFrom: row.absenceTypeValidFrom,
        validTo: row.absenceTypeValidTo,
      }),
      status: row.cancellation.status,
      submittedAt: mapInstant(
        row.cancellation.submittedAt,
        'absence_cancellations',
        'submitted_at',
      ),
      version: row.cancellation.version,
    });
  }

  async decideRequest(input: DecideAbsenceRequestInput): Promise<ApprovalAbsenceRecord | null> {
    const nextStatus =
      input.action === 'APPROVE'
        ? 'APPROVED'
        : input.action === 'REJECT'
          ? 'REJECTED'
          : 'CHANGES_REQUESTED';
    const [updated] = await this.transaction
      .update(absenceRequests)
      .set({ status: nextStatus, version: sql`${absenceRequests.version} + 1` })
      .where(
        and(
          eq(absenceRequests.organizationId, input.organizationId),
          eq(absenceRequests.id, input.requestId),
          eq(absenceRequests.version, input.expectedVersion),
          input.action === 'REQUEST_CHANGES'
            ? inArray(absenceRequests.status, ['SUBMITTED', 'REPORTED'])
            : eq(absenceRequests.status, 'SUBMITTED'),
        ),
      )
      .returning();
    if (updated === undefined) return null;
    const [decision] = await this.transaction
      .insert(absenceDecisions)
      .values({
        absenceRequestId: input.requestId,
        action: input.action,
        actorAccountId: input.actor.accountId,
        actorAuthority: input.actor.authority,
        actorEmployeeId: input.actor.employeeId,
        decidedAt: input.decidedAt,
        organizationId: input.organizationId,
        reason: input.reason,
      })
      .returning({ id: absenceDecisions.id });
    if (decision === undefined) throw new DatabaseValueError('absence_decisions', 'id');
    if (input.action === 'APPROVE') {
      await this.transaction.insert(absenceEffects).values(
        input.effects.map((effect) => ({
          absenceCoverageSegmentId: effect.absenceCoverageSegmentId,
          absenceRequestId: input.requestId,
          creditMinutes: effect.creditMinutes,
          effectVersion: 1,
          employeeId: updated.employeeId,
          entitlementMinutes: effect.entitlementMinutes,
          expectedReductionMinutes: effect.expectedReductionMinutes,
          localDate: effect.localDate,
          organizationId: input.organizationId,
          sourceDecisionId: decision.id,
        })),
      );
    }
    return this.findForApproval(input.organizationId, input.requestId);
  }

  async findCancellation(
    organizationId: DomainId<'Organization'>,
    cancellationId: DomainId<'AbsenceCancellation'>,
  ): Promise<AbsenceCancellationRecord | null> {
    const [row] = await this.transaction
      .select({ cancellation: absenceCancellations, absenceTypeId: absenceRequests.absenceTypeId })
      .from(absenceCancellations)
      .innerJoin(absenceRequests, eq(absenceRequests.id, absenceCancellations.absenceRequestId))
      .where(
        and(
          eq(absenceCancellations.organizationId, organizationId),
          eq(absenceCancellations.id, cancellationId),
          eq(absenceRequests.organizationId, organizationId),
        ),
      )
      .limit(1);
    return row === undefined ? null : mapAbsenceCancellation(row.cancellation, row.absenceTypeId);
  }

  async submitCancellation(
    input: SubmitAbsenceCancellationInput,
  ): Promise<AbsenceCancellationRecord | null> {
    const [request] = await this.transaction
      .select()
      .from(absenceRequests)
      .where(
        and(
          eq(absenceRequests.organizationId, input.organizationId),
          eq(absenceRequests.id, input.requestId),
          eq(absenceRequests.employeeId, input.employeeId),
          eq(absenceRequests.version, input.expectedRequestVersion),
          inArray(absenceRequests.status, [
            'REPORTED',
            'ACKNOWLEDGED',
            'APPROVED',
            'PARTIALLY_CANCELLED',
          ]),
        ),
      )
      .limit(1);
    if (request === undefined) return null;

    const coverageRows = await this.transaction
      .select({ id: absenceCoverageSegments.id, localDate: absenceCoverageSegments.localDate })
      .from(absenceCoverageSegments)
      .where(
        and(
          eq(absenceCoverageSegments.organizationId, input.organizationId),
          eq(absenceCoverageSegments.absenceRequestId, input.requestId),
          input.coverageSegmentIds === null
            ? undefined
            : inArray(absenceCoverageSegments.id, [...input.coverageSegmentIds]),
        ),
      );
    if (
      coverageRows.length === 0 ||
      (input.coverageSegmentIds !== null && coverageRows.length !== input.coverageSegmentIds.length)
    ) {
      return null;
    }
    const targetIds = coverageRows.map((row) => row.id);
    const existing = await this.transaction
      .select({ id: absenceCancellationSegments.id })
      .from(absenceCancellationSegments)
      .innerJoin(
        absenceCancellations,
        eq(absenceCancellations.id, absenceCancellationSegments.absenceCancellationId),
      )
      .where(
        and(
          eq(absenceCancellations.organizationId, input.organizationId),
          inArray(absenceCancellationSegments.absenceCoverageSegmentId, targetIds),
          inArray(absenceCancellations.status, [
            'PENDING_DECISION',
            'CHANGES_REQUESTED',
            'APPROVED',
          ]),
        ),
      )
      .limit(1);
    if (existing.length > 0) return null;

    const monthStarts = [...new Set(coverageRows.map((row) => `${row.localDate.slice(0, 7)}-01`))];
    const [protectedPeriod] = await this.transaction
      .select({ status: monthlyPeriods.status })
      .from(monthlyPeriods)
      .where(
        and(
          eq(monthlyPeriods.organizationId, input.organizationId),
          eq(monthlyPeriods.employeeId, input.employeeId),
          inArray(monthlyPeriods.status, ['SUBMITTED', 'APPROVED', 'LOCKED']),
          inArray(monthlyPeriods.monthStart, monthStarts),
        ),
      )
      .orderBy(
        sql`case ${monthlyPeriods.status} when 'LOCKED' then 1 when 'APPROVED' then 2 else 3 end`,
      )
      .for('share')
      .limit(1);
    if (protectedPeriod?.status === 'LOCKED') throw new AbsenceCancellationLockedPeriodError();
    if (protectedPeriod?.status === 'SUBMITTED' || protectedPeriod?.status === 'APPROVED') {
      throw new AbsenceCancellationReopenPeriodError();
    }

    const [cancellation] = await this.transaction
      .insert(absenceCancellations)
      .values({
        absenceRequestId: input.requestId,
        employeeId: input.employeeId,
        organizationId: input.organizationId,
        requestedByEmployeeId: input.requestedByEmployeeId,
        status: 'PENDING_DECISION',
        submittedAt: input.submittedAt,
        version: 1,
      })
      .returning();
    if (cancellation === undefined) throw new DatabaseValueError('absence_cancellations', 'id');
    await this.transaction.insert(absenceCancellationSegments).values(
      targetIds.map((absenceCoverageSegmentId) => ({
        absenceCancellationId: cancellation.id,
        absenceCoverageSegmentId,
        organizationId: input.organizationId,
      })),
    );
    return mapAbsenceCancellation(cancellation, request.absenceTypeId);
  }

  async decideCancellation(
    input: DecideAbsenceCancellationInput,
  ): Promise<AbsenceCancellationDecisionResult | null> {
    const nextStatus =
      input.action === 'APPROVE'
        ? 'APPROVED'
        : input.action === 'REJECT'
          ? 'REJECTED'
          : 'CHANGES_REQUESTED';
    const [updated] = await this.transaction
      .update(absenceCancellations)
      .set({ status: nextStatus, version: sql`${absenceCancellations.version} + 1` })
      .where(
        and(
          eq(absenceCancellations.organizationId, input.organizationId),
          eq(absenceCancellations.id, input.cancellationId),
          eq(absenceCancellations.version, input.expectedVersion),
          inArray(absenceCancellations.status, ['PENDING_DECISION', 'CHANGES_REQUESTED']),
        ),
      )
      .returning();
    if (updated === undefined) return null;
    await this.transaction.insert(absenceCancellationDecisions).values({
      absenceCancellationId: updated.id,
      action: input.action,
      actorAccountId: input.actor.accountId,
      actorAuthority: input.actor.authority,
      actorEmployeeId: input.actor.employeeId,
      decidedAt: input.decidedAt,
      organizationId: input.organizationId,
      reason: input.reason,
    });

    const [request] = await this.transaction
      .select()
      .from(absenceRequests)
      .where(eq(absenceRequests.id, updated.absenceRequestId))
      .limit(1);
    if (request === undefined) throw new DatabaseValueError('absence_requests', 'id');
    let restoration: AbsenceCancellationDecisionResult['restoration'] = null;
    if (input.action === 'APPROVE') {
      const coverageRows = await this.transaction
        .select({
          coverageSegmentId: absenceCoverageSegments.id,
          localDate: absenceCoverageSegments.localDate,
        })
        .from(absenceCancellationSegments)
        .innerJoin(
          absenceCoverageSegments,
          eq(absenceCoverageSegments.id, absenceCancellationSegments.absenceCoverageSegmentId),
        )
        .leftJoin(
          absenceEffects,
          eq(absenceEffects.absenceCoverageSegmentId, absenceCoverageSegments.id),
        )
        .where(eq(absenceCancellationSegments.absenceCancellationId, updated.id));
      const targetCoverageIds = coverageRows.map((row) => row.coverageSegmentId);
      const effectRows = await this.transaction
        .select({
          absenceCoverageSegmentId: absenceEffects.absenceCoverageSegmentId,
          creditMinutes: absenceEffects.creditMinutes,
          effectVersion: absenceEffects.effectVersion,
          entitlementMinutes: absenceEffects.entitlementMinutes,
          expectedReductionMinutes: absenceEffects.expectedReductionMinutes,
          localDate: absenceEffects.localDate,
        })
        .from(absenceEffects)
        .where(
          and(
            eq(absenceEffects.organizationId, input.organizationId),
            inArray(absenceEffects.absenceCoverageSegmentId, targetCoverageIds),
          ),
        )
        .orderBy(desc(absenceEffects.effectVersion));
      const latestEffects = new Map<string, (typeof effectRows)[number]>();
      for (const effect of effectRows) {
        if (!latestEffects.has(effect.absenceCoverageSegmentId)) {
          latestEffects.set(effect.absenceCoverageSegmentId, effect);
        }
      }
      const effectMinutes = [...latestEffects.values()].reduce(
        (total, effect) => total + effect.entitlementMinutes,
        0,
      );
      const [deduction] = await this.transaction
        .select({ minutes: sql<number>`coalesce(sum(${leaveEntitlementEntries.minutes}), 0)` })
        .from(leaveEntitlementEntries)
        .where(
          and(
            eq(leaveEntitlementEntries.organizationId, input.organizationId),
            eq(leaveEntitlementEntries.employeeId, updated.employeeId),
            eq(leaveEntitlementEntries.absenceTypeId, request.absenceTypeId),
            eq(leaveEntitlementEntries.entryType, 'APPROVED_DEDUCTION'),
            eq(leaveEntitlementEntries.sourceId, request.id),
          ),
        );
      const restorationMinutes = Math.min(effectMinutes, Math.max(0, -(deduction?.minutes ?? 0)));
      if (restorationMinutes > 0) {
        const firstDate = coverageRows.map((row) => row.localDate).sort()[0];
        if (firstDate === undefined)
          throw new DatabaseValueError('absence_cancellation_segments', 'id');
        restoration = Object.freeze({
          absenceTypeId: mapDomainId<'AbsenceTypeVersion'>(
            request.absenceTypeId,
            'absence_requests',
            'absence_type_id',
          ),
          effectiveOn: mapLocalDate(firstDate, 'absence_coverage_segments', 'local_date'),
          employeeId: mapDomainId<'Employee'>(
            updated.employeeId,
            'absence_cancellations',
            'employee_id',
          ),
          minutes: restorationMinutes,
        });
      }
      if (latestEffects.size > 0) {
        await this.transaction.insert(absenceEffects).values(
          [...latestEffects.values()].map((effect) => ({
            absenceCoverageSegmentId: effect.absenceCoverageSegmentId,
            absenceRequestId: request.id,
            creditMinutes: 0,
            effectVersion: effect.effectVersion + 1,
            employeeId: updated.employeeId,
            entitlementMinutes: 0,
            expectedReductionMinutes: 0,
            localDate: effect.localDate,
            organizationId: input.organizationId,
            sourceDecisionId: null,
          })),
        );
      }
      const [counts] = await this.transaction
        .select({
          cancelled: sql<number>`count(${absenceCancellationSegments.id}) filter (where ${absenceCancellations.status} = 'APPROVED')`,
          total: sql<number>`count(distinct ${absenceCoverageSegments.id})`,
        })
        .from(absenceCoverageSegments)
        .leftJoin(
          absenceCancellationSegments,
          eq(absenceCancellationSegments.absenceCoverageSegmentId, absenceCoverageSegments.id),
        )
        .leftJoin(
          absenceCancellations,
          eq(absenceCancellations.id, absenceCancellationSegments.absenceCancellationId),
        )
        .where(eq(absenceCoverageSegments.absenceRequestId, request.id));
      await this.transaction
        .update(absenceRequests)
        .set({
          status:
            (counts?.cancelled ?? 0) >= (counts?.total ?? 1) ? 'CANCELLED' : 'PARTIALLY_CANCELLED',
          version: sql`${absenceRequests.version} + 1`,
        })
        .where(eq(absenceRequests.id, request.id));
    }
    return Object.freeze({
      ...mapAbsenceCancellation(updated, request.absenceTypeId),
      restoration,
    });
  }

  async withdrawCancellation(
    input: WithdrawAbsenceCancellationInput,
  ): Promise<AbsenceCancellationRecord | null> {
    const [updated] = await this.transaction
      .update(absenceCancellations)
      .set({ status: 'WITHDRAWN', version: sql`${absenceCancellations.version} + 1` })
      .where(
        and(
          eq(absenceCancellations.organizationId, input.organizationId),
          eq(absenceCancellations.id, input.cancellationId),
          eq(absenceCancellations.employeeId, input.actor.employeeId),
          eq(absenceCancellations.version, input.expectedVersion),
          inArray(absenceCancellations.status, ['PENDING_DECISION', 'CHANGES_REQUESTED']),
        ),
      )
      .returning();
    if (updated === undefined) return null;
    await this.transaction.insert(absenceCancellationDecisions).values({
      absenceCancellationId: updated.id,
      action: 'WITHDRAW',
      actorAccountId: input.actor.accountId,
      actorAuthority: input.actor.authority,
      actorEmployeeId: input.actor.employeeId,
      decidedAt: input.decidedAt,
      organizationId: input.organizationId,
      reason: null,
    });
    const [request] = await this.transaction
      .select({ absenceTypeId: absenceRequests.absenceTypeId })
      .from(absenceRequests)
      .where(eq(absenceRequests.id, updated.absenceRequestId))
      .limit(1);
    if (request === undefined) throw new DatabaseValueError('absence_requests', 'id');
    return mapAbsenceCancellation(updated, request.absenceTypeId);
  }

  async loadConfiguration(
    input: AbsenceRequestConfigurationInput,
  ): Promise<VacationRequestConfigurationRecord> {
    const [absenceTypeRows, scheduleRows, holidayRows] = await Promise.all([
      this.transaction
        .select({
          active: absenceTypes.active,
          id: absenceTypes.id,
          name: absenceTypes.name,
          policy: absenceTypes.policy,
          validFrom: absenceTypes.validFrom,
          validTo: absenceTypes.validTo,
        })
        .from(absenceTypes)
        .where(
          and(
            eq(absenceTypes.organizationId, input.organizationId),
            eq(absenceTypes.code, input.absenceCode),
            lte(absenceTypes.validFrom, input.startDate),
            or(isNull(absenceTypes.validTo), gt(absenceTypes.validTo, input.endDate)),
          ),
        )
        .orderBy(asc(absenceTypes.validFrom), asc(absenceTypes.id)),
      this.transaction
        .select({
          assignmentEndsOn: scheduleAssignments.endsOn,
          assignmentId: scheduleAssignments.id,
          assignmentStartsOn: scheduleAssignments.startsOn,
          fridayMinutes: weeklySchedules.fridayMinutes,
          mondayMinutes: weeklySchedules.mondayMinutes,
          saturdayMinutes: weeklySchedules.saturdayMinutes,
          scheduleId: weeklySchedules.id,
          sundayMinutes: weeklySchedules.sundayMinutes,
          thursdayMinutes: weeklySchedules.thursdayMinutes,
          tuesdayMinutes: weeklySchedules.tuesdayMinutes,
          wednesdayMinutes: weeklySchedules.wednesdayMinutes,
        })
        .from(scheduleAssignments)
        .innerJoin(
          weeklySchedules,
          and(
            eq(weeklySchedules.id, scheduleAssignments.scheduleId),
            eq(weeklySchedules.organizationId, scheduleAssignments.organizationId),
          ),
        )
        .where(
          and(
            eq(scheduleAssignments.organizationId, input.organizationId),
            eq(scheduleAssignments.employeeId, input.employeeId),
            lte(scheduleAssignments.startsOn, input.endDate),
            or(isNull(scheduleAssignments.endsOn), gt(scheduleAssignments.endsOn, input.startDate)),
          ),
        )
        .orderBy(asc(scheduleAssignments.startsOn), asc(scheduleAssignments.id)),
      this.transaction
        .select({ localDate: holidays.holidayDate })
        .from(holidays)
        .where(
          and(
            eq(holidays.organizationId, input.organizationId),
            gte(holidays.holidayDate, input.startDate),
            lte(holidays.holidayDate, input.endDate),
          ),
        )
        .orderBy(asc(holidays.holidayDate)),
    ]);

    const assignments = scheduleRows.map((row) => {
      const range = createLocalDateRange(
        mapLocalDate(row.assignmentStartsOn, 'schedule_assignments', 'starts_on'),
        row.assignmentEndsOn === null
          ? null
          : mapLocalDate(row.assignmentEndsOn, 'schedule_assignments', 'ends_on'),
      );
      const schedule = createWeeklySchedule(
        mapDomainId<'WorkScheduleVersion'>(row.scheduleId, 'weekly_schedules', 'id'),
        {
          FRIDAY: row.fridayMinutes,
          MONDAY: row.mondayMinutes,
          SATURDAY: row.saturdayMinutes,
          SUNDAY: row.sundayMinutes,
          THURSDAY: row.thursdayMinutes,
          TUESDAY: row.tuesdayMinutes,
          WEDNESDAY: row.wednesdayMinutes,
        },
      );
      if (!range.ok || !schedule.ok) {
        throw new DatabaseValueError('schedule_assignments', 'effective_configuration');
      }
      const assignment = createScheduleAssignment(
        mapDomainId<'ScheduleAssignment'>(row.assignmentId, 'schedule_assignments', 'id'),
        range.value,
        schedule.value,
      );
      if (!assignment.ok) throw new DatabaseValueError('schedule_assignments', 'id');
      return assignment.value;
    });

    return Object.freeze({
      absenceTypes: Object.freeze(
        absenceTypeRows.map((row) =>
          Object.freeze({
            active: row.active,
            id: mapDomainId<'AbsenceTypeVersion'>(row.id, 'absence_types', 'id'),
            name: row.name,
            policy: mapAbsenceTypePolicyInput(row.policy),
            validFrom: mapLocalDate(row.validFrom, 'absence_types', 'valid_from'),
            validTo:
              row.validTo === null ? null : mapLocalDate(row.validTo, 'absence_types', 'valid_to'),
          }),
        ),
      ),
      holidayDates: Object.freeze(
        holidayRows.map((row) => mapLocalDate(row.localDate, 'holidays', 'holiday_date')),
      ),
      scheduleAssignments: Object.freeze(assignments),
    });
  }

  async hasCoverageConflict(
    organizationId: DomainId<'Organization'>,
    employeeId: DomainId<'Employee'>,
    coverage: readonly AbsenceCoverageSegmentInput[],
  ): Promise<boolean> {
    if (coverage.length === 0) return false;
    const localDates = [...new Set(coverage.map((segment) => segment.localDate))];
    const rows = await this.transaction
      .select({
        endsAtMinute: absenceCoverageSegments.endsAtMinute,
        kind: absenceCoverageSegments.kind,
        localDate: absenceCoverageSegments.localDate,
        startsAtMinute: absenceCoverageSegments.startsAtMinute,
      })
      .from(absenceRequests)
      .innerJoin(
        absenceCoverageSegments,
        and(
          eq(absenceCoverageSegments.absenceRequestId, absenceRequests.id),
          eq(absenceCoverageSegments.organizationId, absenceRequests.organizationId),
        ),
      )
      .where(
        and(
          eq(absenceRequests.organizationId, organizationId),
          eq(absenceRequests.employeeId, employeeId),
          inArray(absenceCoverageSegments.localDate, [...localDates]),
          inArray(absenceRequests.status, [
            'SUBMITTED',
            'REPORTED',
            'ACKNOWLEDGED',
            'CHANGES_REQUESTED',
            'APPROVED',
            'PARTIALLY_CANCELLED',
          ]),
        ),
      );
    return rows.some((row) =>
      coverage.some((candidate) =>
        coverageSegmentsOverlap(candidate, {
          endsAtMinute: row.endsAtMinute,
          kind: row.kind,
          localDate: mapLocalDate(row.localDate, 'absence_coverage_segments', 'local_date'),
          startsAtMinute: row.startsAtMinute,
        }),
      ),
    );
  }

  async listPersonalCalendar(
    organizationId: DomainId<'Organization'>,
    employeeId: DomainId<'Employee'>,
    startDate: LocalDate,
    endDate: LocalDate,
  ): Promise<PersonalCalendarRecords> {
    const [absenceRows, holidayRows] = await Promise.all([
      this.transaction
        .select({
          absenceTypeName: absenceTypes.name,
          endsAtMinute: absenceCoverageSegments.endsAtMinute,
          kind: absenceCoverageSegments.kind,
          localDate: absenceCoverageSegments.localDate,
          startsAtMinute: absenceCoverageSegments.startsAtMinute,
          status: absenceRequests.status,
        })
        .from(absenceRequests)
        .innerJoin(
          absenceCoverageSegments,
          and(
            eq(absenceCoverageSegments.absenceRequestId, absenceRequests.id),
            eq(absenceCoverageSegments.organizationId, absenceRequests.organizationId),
          ),
        )
        .innerJoin(
          absenceTypes,
          and(
            eq(absenceTypes.id, absenceRequests.absenceTypeId),
            eq(absenceTypes.organizationId, absenceRequests.organizationId),
          ),
        )
        .where(
          and(
            eq(absenceRequests.organizationId, organizationId),
            eq(absenceRequests.employeeId, employeeId),
            gte(absenceCoverageSegments.localDate, startDate),
            lte(absenceCoverageSegments.localDate, endDate),
            inArray(absenceRequests.status, [
              'SUBMITTED',
              'REPORTED',
              'ACKNOWLEDGED',
              'CHANGES_REQUESTED',
              'APPROVED',
              'PARTIALLY_CANCELLED',
            ]),
          ),
        )
        .orderBy(asc(absenceCoverageSegments.localDate), asc(absenceRequests.submittedAt)),
      this.transaction
        .select({ localDate: holidays.holidayDate, name: holidays.name })
        .from(holidays)
        .where(
          and(
            eq(holidays.organizationId, organizationId),
            gte(holidays.holidayDate, startDate),
            lte(holidays.holidayDate, endDate),
          ),
        )
        .orderBy(asc(holidays.holidayDate), asc(holidays.id)),
    ]);

    return Object.freeze({
      absences: Object.freeze(
        absenceRows.map((row) =>
          Object.freeze({
            absenceTypeName: row.absenceTypeName,
            endsAtMinute: row.endsAtMinute,
            kind: row.kind,
            localDate: mapLocalDate(row.localDate, 'absence_coverage_segments', 'local_date'),
            startsAtMinute: row.startsAtMinute,
            status: mapPersonalCalendarAbsenceStatus(row.status),
          }),
        ),
      ),
      holidays: Object.freeze(
        holidayRows.map((row) =>
          Object.freeze({
            localDate: mapLocalDate(row.localDate, 'holidays', 'holiday_date'),
            name: row.name,
          }),
        ),
      ),
    });
  }

  async submitVacation(input: SubmitVacationRequestInput): Promise<VacationRequestRecord> {
    const [request] = await this.transaction
      .insert(absenceRequests)
      .values({
        absenceTypeId: input.absenceTypeId,
        employeeId: input.employeeId,
        organizationId: input.organizationId,
        requestedByEmployeeId: input.requestedByEmployeeId,
        status: 'SUBMITTED',
        submittedAt: input.submittedAt,
        version: 1,
      })
      .returning();
    if (request === undefined) throw new DatabaseValueError('absence_requests', 'id');
    await this.transaction.insert(absenceCoverageSegments).values(
      input.coverage.map((coverage) => ({
        absenceRequestId: request.id,
        endsAtMinute: coverage.endsAtMinute,
        kind: coverage.kind,
        localDate: coverage.localDate,
        organizationId: input.organizationId,
        startsAtMinute: coverage.startsAtMinute,
      })),
    );
    return mapVacationRequest(request);
  }

  async submitSickness(input: SubmitSicknessReportInput): Promise<SicknessReportRecord> {
    const [request] = await this.transaction
      .insert(absenceRequests)
      .values({
        absenceTypeId: input.absenceTypeId,
        employeeId: input.employeeId,
        organizationId: input.organizationId,
        requestedByEmployeeId: input.requestedByEmployeeId,
        status: 'REPORTED',
        submittedAt: input.reportedAt,
        version: 1,
      })
      .returning();
    if (request === undefined) throw new DatabaseValueError('absence_requests', 'id');
    const segments = await this.transaction
      .insert(absenceCoverageSegments)
      .values(
        input.coverage.map((coverage) => ({
          absenceRequestId: request.id,
          endsAtMinute: coverage.endsAtMinute,
          kind: coverage.kind,
          localDate: coverage.localDate,
          organizationId: input.organizationId,
          startsAtMinute: coverage.startsAtMinute,
        })),
      )
      .returning({ id: absenceCoverageSegments.id, localDate: absenceCoverageSegments.localDate });
    const creditByDate = new Map(input.coverage.map((coverage) => [coverage.localDate, coverage]));
    await this.transaction.insert(absenceEffects).values(
      segments.map((segment) => {
        const coverage = creditByDate.get(
          mapLocalDate(segment.localDate, 'absence_coverage_segments', 'local_date'),
        );
        if (coverage === undefined)
          throw new DatabaseValueError('absence_coverage_segments', 'local_date');
        return {
          absenceCoverageSegmentId: segment.id,
          absenceRequestId: request.id,
          creditMinutes: coverage.creditMinutes,
          effectVersion: 1,
          employeeId: input.employeeId,
          entitlementMinutes: 0,
          expectedReductionMinutes: 0,
          localDate: coverage.localDate,
          organizationId: input.organizationId,
          sourceDecisionId: null,
        };
      }),
    );
    return mapSicknessReport(request);
  }

  async findSicknessReport(
    organizationId: DomainId<'Organization'>,
    requestId: DomainId<'AbsenceRequest'>,
  ): Promise<SicknessReportRecord | null> {
    const [row] = await this.transaction
      .select()
      .from(absenceRequests)
      .innerJoin(absenceTypes, eq(absenceTypes.id, absenceRequests.absenceTypeId))
      .where(
        and(
          eq(absenceRequests.organizationId, organizationId),
          eq(absenceRequests.id, requestId),
          eq(absenceTypes.code, 'SICKNESS'),
        ),
      )
      .limit(1);
    return row === undefined ? null : mapSicknessReport(row.absence_requests);
  }

  async acknowledgeSickness(
    organizationId: DomainId<'Organization'>,
    requestId: DomainId<'AbsenceRequest'>,
    actor: DecisionActorRecord,
    expectedVersion: number,
    acknowledgedAt: Instant,
  ): Promise<SicknessReportRecord | null> {
    const [updated] = await this.transaction
      .update(absenceRequests)
      .set({ status: 'ACKNOWLEDGED', version: sql`${absenceRequests.version} + 1` })
      .where(
        and(
          eq(absenceRequests.organizationId, organizationId),
          eq(absenceRequests.id, requestId),
          eq(absenceRequests.version, expectedVersion),
          eq(absenceRequests.status, 'REPORTED'),
        ),
      )
      .returning();
    if (updated === undefined) return null;
    await this.transaction.insert(absenceDecisions).values({
      absenceRequestId: requestId,
      action: 'ACKNOWLEDGE',
      actorAccountId: actor.accountId,
      actorAuthority: actor.authority,
      actorEmployeeId: actor.employeeId,
      decidedAt: acknowledgedAt,
      organizationId,
      reason: null,
    });
    return mapSicknessReport(updated);
  }
}

function coverageSegmentsOverlap(
  left: AbsenceCoverageSegmentInput,
  right: Readonly<{
    endsAtMinute: number | null;
    kind: AbsenceCoverageSegmentInput['kind'];
    localDate: LocalDate;
    startsAtMinute: number | null;
  }>,
): boolean {
  if (left.localDate !== right.localDate) return false;
  if (left.kind === 'FULL_DAY' || right.kind === 'FULL_DAY') return true;
  const leftIsMinute = left.kind === 'MINUTE_INTERVAL';
  const rightIsMinute = right.kind === 'MINUTE_INTERVAL';
  if (leftIsMinute || rightIsMinute) {
    if (!leftIsMinute || !rightIsMinute) return true;
    if (
      left.startsAtMinute === null ||
      left.endsAtMinute === null ||
      right.startsAtMinute === null ||
      right.endsAtMinute === null
    ) {
      throw new DatabaseValueError('absence_coverage_segments', 'minute_shape');
    }
    return left.startsAtMinute < right.endsAtMinute && left.endsAtMinute > right.startsAtMinute;
  }
  return left.kind === right.kind;
}

function mapPersonalCalendarAbsenceStatus(
  status: typeof absenceRequests.$inferSelect.status,
): PersonalCalendarRecords['absences'][number]['status'] {
  if (
    status === 'SUBMITTED' ||
    status === 'REPORTED' ||
    status === 'ACKNOWLEDGED' ||
    status === 'CHANGES_REQUESTED' ||
    status === 'APPROVED' ||
    status === 'PARTIALLY_CANCELLED'
  ) {
    return status;
  }
  throw new DatabaseValueError('absence_requests', 'status');
}

class PostgresTimeAccountRepository implements TimeAccountRepository {
  constructor(private readonly transaction: RepositoryTransaction) {}

  async append(input: AppendTimeAccountEntryInput): Promise<TimeAccountLedgerEntry> {
    const { actor, entryId, entryType, explanationCode, organizationId, recordedAt, sourceKey } =
      input.entry;
    const actorId = actor.kind === 'ACCOUNT' ? actor.accountId : actor.systemProcess;
    const [row] = await this.transaction
      .insert(timeAccountEntries)
      .values({
        actorId,
        actorKind: actor.kind,
        employeeId: input.entry.subjectEmployeeId,
        entryType,
        explanationCode,
        id: entryId,
        localDate: input.entry.effectiveDate,
        minutes: input.entry.amountMinutes,
        organizationId,
        postedAt: recordedAt,
        sourceFingerprint: input.sourceFingerprint,
        sourceId: sourceKey,
      })
      .returning();

    if (row === undefined) throw new DatabaseValueError('time_account_entries', 'id');
    return mapTimeAccountEntry(row);
  }

  async listForEmployee(
    organizationId: DomainId<'Organization'>,
    employeeId: DomainId<'Employee'>,
  ): Promise<readonly TimeAccountLedgerEntry[]> {
    const rows = await this.transaction
      .select()
      .from(timeAccountEntries)
      .where(
        and(
          eq(timeAccountEntries.organizationId, organizationId),
          eq(timeAccountEntries.employeeId, employeeId),
        ),
      )
      .orderBy(asc(timeAccountEntries.postedAt), asc(timeAccountEntries.id));

    return Object.freeze(rows.map(mapTimeAccountEntry));
  }

  async listForEmployeeThroughDate(
    organizationId: DomainId<'Organization'>,
    employeeId: DomainId<'Employee'>,
    endDate: TimeAccountLedgerEntry['effectiveDate'],
  ): Promise<readonly TimeAccountLedgerEntry[]> {
    const rows = await this.transaction
      .select()
      .from(timeAccountEntries)
      .where(
        and(
          eq(timeAccountEntries.organizationId, organizationId),
          eq(timeAccountEntries.employeeId, employeeId),
          lte(timeAccountEntries.localDate, endDate),
        ),
      )
      .orderBy(asc(timeAccountEntries.postedAt), asc(timeAccountEntries.id));

    return Object.freeze(rows.map(mapTimeAccountEntry));
  }
}

class PostgresLeaveEntitlementRepository implements LeaveEntitlementRepository {
  constructor(private readonly transaction: RepositoryTransaction) {}

  async append(input: AppendLeaveEntitlementEntryInput): Promise<LeaveEntitlementEntryRecord> {
    const [row] = await this.transaction
      .insert(leaveEntitlementEntries)
      .values({
        absenceTypeId: input.entry.absenceTypeId,
        effectiveOn: input.entry.effectiveOn,
        entryType: input.entry.entryType,
        id: input.entry.entryId,
        employeeId: input.entry.subjectEmployeeId,
        minutes: input.entry.minutes,
        organizationId: input.entry.organizationId,
        sourceId: input.entry.sourceId,
      })
      .returning();
    if (row === undefined) throw new DatabaseValueError('leave_entitlement_entries', 'id');

    const [absenceType] = await this.transaction
      .select({ name: absenceTypes.name })
      .from(absenceTypes)
      .where(eq(absenceTypes.id, row.absenceTypeId))
      .limit(1);
    if (absenceType === undefined) throw new DatabaseValueError('absence_types', 'id');
    return mapLeaveEntitlementEntry(row, absenceType.name);
  }

  async listForEmployee(
    organizationId: DomainId<'Organization'>,
    employeeId: DomainId<'Employee'>,
  ): Promise<readonly LeaveEntitlementEntryRecord[]> {
    const rows = await this.transaction
      .select({ entry: leaveEntitlementEntries, absenceTypeName: absenceTypes.name })
      .from(leaveEntitlementEntries)
      .innerJoin(absenceTypes, eq(leaveEntitlementEntries.absenceTypeId, absenceTypes.id))
      .where(
        and(
          eq(leaveEntitlementEntries.organizationId, organizationId),
          eq(leaveEntitlementEntries.employeeId, employeeId),
        ),
      )
      .orderBy(asc(leaveEntitlementEntries.createdAt), asc(leaveEntitlementEntries.id));

    return Object.freeze(
      rows.map(({ absenceTypeName, entry }) => mapLeaveEntitlementEntry(entry, absenceTypeName)),
    );
  }
}

function mapOrganization(row: typeof organizations.$inferSelect): OrganizationRecord {
  return Object.freeze({
    createdAt: mapInstant(row.createdAt, 'organizations', 'created_at'),
    id: mapDomainId<'Organization'>(row.id, 'organizations', 'id'),
    name: row.name,
    timeZone: row.timeZone,
  });
}

function mapEmployee(row: typeof employees.$inferSelect): EmployeeRecord {
  return Object.freeze({
    createdAt: mapInstant(row.createdAt, 'employees', 'created_at'),
    displayName: row.displayName,
    employeeNumber: row.employeeNumber,
    id: mapDomainId<'Employee'>(row.id, 'employees', 'id'),
    organizationId: mapDomainId<'Organization'>(row.organizationId, 'employees', 'organization_id'),
    status: row.status,
  });
}

function mapAccountSession(row: {
  createdAt: Date;
  expiresAt: Date;
  id: string;
  lastActiveAt: Date;
  userAgent: string | null;
  userId: string;
}): AccountSessionRecord {
  return Object.freeze({
    accountId: mapDomainId<'Account'>(row.userId, 'auth_sessions', 'user_id'),
    createdAt: mapInstant(row.createdAt.toISOString(), 'auth_sessions', 'created_at'),
    expiresAt: mapInstant(row.expiresAt.toISOString(), 'auth_sessions', 'expires_at'),
    id: mapDomainId<'Session'>(row.id, 'auth_sessions', 'id'),
    lastActiveAt: mapInstant(row.lastActiveAt.toISOString(), 'auth_sessions', 'updated_at'),
    userAgent: row.userAgent,
  });
}

function mapAttendanceHead(row: typeof attendanceHeads.$inferSelect): AttendanceHeadRecord {
  return Object.freeze({
    attendanceRevision: row.attendanceRevision,
    employeeId: mapDomainId<'Employee'>(row.employeeId, 'attendance_heads', 'employee_id'),
    nextEventSequence: row.nextEventSequence,
    organizationId: mapDomainId<'Organization'>(
      row.organizationId,
      'attendance_heads',
      'organization_id',
    ),
    state: row.state,
    updatedAt: mapInstant(row.updatedAt, 'attendance_heads', 'updated_at'),
  });
}

function mapStoredPunchEvent(row: typeof punchEvents.$inferSelect): StoredPunchEvent {
  return Object.freeze({
    actorEmployeeId:
      row.actorEmployeeId === null
        ? null
        : mapDomainId<'Employee'>(row.actorEmployeeId, 'punch_events', 'actor_employee_id'),
    commandId: mapDomainId<'AttendanceCommand'>(row.commandId, 'punch_events', 'command_id'),
    employeeId: mapDomainId<'Employee'>(row.employeeId, 'punch_events', 'employee_id'),
    event: Object.freeze({
      eventSequence: row.eventSequence,
      occurredAt: mapInstant(row.occurredAt, 'punch_events', 'occurred_at'),
      type: row.eventType,
    }),
    id: mapDomainId<'PunchEvent'>(row.id, 'punch_events', 'id'),
    organizationId: mapDomainId<'Organization'>(
      row.organizationId,
      'punch_events',
      'organization_id',
    ),
    recordedAt: mapInstant(row.recordedAt, 'punch_events', 'recorded_at'),
  });
}

function mapDailyProjection(row: typeof dailyProjections.$inferSelect): DailyProjectionRecord {
  if (!Array.isArray(row.warningCodes)) {
    throw new DatabaseValueError('daily_projections', 'warning_codes');
  }
  if (
    row.sourceReferences === null ||
    Array.isArray(row.sourceReferences) ||
    typeof row.sourceReferences !== 'object'
  ) {
    throw new DatabaseValueError('daily_projections', 'source_references');
  }

  return Object.freeze({
    absenceCreditMinutes: mapNonNegativeMinutes(
      row.absenceCreditMinutes,
      'daily_projections',
      'absence_credit_minutes',
    ),
    adjustmentMinutes: mapSignedMinutes(
      row.adjustmentMinutes,
      'daily_projections',
      'adjustment_minutes',
    ),
    balanceMinutes: mapSignedMinutes(row.balanceMinutes, 'daily_projections', 'balance_minutes'),
    breakMinutes: mapNonNegativeMinutes(row.breakMinutes, 'daily_projections', 'break_minutes'),
    calculatedAt: mapInstant(row.calculatedAt, 'daily_projections', 'calculated_at'),
    calculationStatus: row.calculationStatus,
    creditedMinutes: mapNonNegativeMinutes(
      row.creditedMinutes,
      'daily_projections',
      'credited_minutes',
    ),
    employeeId: mapDomainId<'Employee'>(row.employeeId, 'daily_projections', 'employee_id'),
    engineVersion: row.engineVersion,
    expectedMinutes: mapNonNegativeMinutes(
      row.expectedMinutes,
      'daily_projections',
      'expected_minutes',
    ),
    id: mapDomainId<'DailyProjection'>(row.id, 'daily_projections', 'id'),
    localDate: mapLocalDate(row.localDate, 'daily_projections', 'local_date'),
    organizationId: mapDomainId<'Organization'>(
      row.organizationId,
      'daily_projections',
      'organization_id',
    ),
    projectionVersion: row.projectionVersion,
    sourceFingerprint: row.sourceFingerprint,
    sourceReferences: Object.freeze(row.sourceReferences),
    warningCodes: Object.freeze(row.warningCodes.map(mapWarningCode)),
    workedMinutes: mapNonNegativeMinutes(row.workedMinutes, 'daily_projections', 'worked_minutes'),
  });
}

function mapCorrectionRequest(
  row: typeof correctionRequests.$inferSelect,
): CorrectionRequestRecord {
  if (
    row.originalInterpretation === null ||
    Array.isArray(row.originalInterpretation) ||
    typeof row.originalInterpretation !== 'object' ||
    row.proposedInterpretation === null ||
    Array.isArray(row.proposedInterpretation) ||
    typeof row.proposedInterpretation !== 'object'
  ) {
    throw new DatabaseValueError('correction_requests', 'interpretation');
  }
  return Object.freeze({
    createdAt: mapInstant(row.createdAt, 'correction_requests', 'created_at'),
    employeeId: mapDomainId<'Employee'>(row.employeeId, 'correction_requests', 'employee_id'),
    id: mapDomainId<'CorrectionRequest'>(row.id, 'correction_requests', 'id'),
    localDate: mapLocalDate(row.localDate, 'correction_requests', 'local_date'),
    lockedMonthlySnapshotId:
      row.lockedMonthlySnapshotId === null
        ? null
        : mapDomainId<'MonthlySnapshot'>(
            row.lockedMonthlySnapshotId,
            'correction_requests',
            'locked_monthly_snapshot_id',
          ),
    organizationId: mapDomainId<'Organization'>(
      row.organizationId,
      'correction_requests',
      'organization_id',
    ),
    originalInterpretation: Object.freeze(row.originalInterpretation),
    proposedInterpretation: Object.freeze(row.proposedInterpretation),
    reason: row.reason,
    requestedByEmployeeId: mapDomainId<'Employee'>(
      row.requestedByEmployeeId,
      'correction_requests',
      'requested_by_employee_id',
    ),
    status: row.status,
    version: row.version,
  });
}

function mapCorrectionReview(
  row: typeof correctionRequests.$inferSelect,
  employeeDisplayName: string,
): CorrectionReviewRecord {
  return Object.freeze({ ...mapCorrectionRequest(row), employeeDisplayName });
}

function mapPostLockAdjustment(
  row: typeof postLockAdjustments.$inferSelect,
): PostLockAdjustmentRecord {
  if (
    row.adjustmentVersion === null ||
    row.appliedCorrectionId === null ||
    row.correctionDecisionId === null ||
    row.correctionRequestId === null ||
    row.previousAdjustedWorkedMinutes === null ||
    row.proposedWorkedMinutes === null
  ) {
    throw new DatabaseValueError('post_lock_adjustments', 'linkage');
  }
  return Object.freeze({
    adjustmentVersion: mapPositiveVersion(
      row.adjustmentVersion,
      'post_lock_adjustments',
      'adjustment_version',
    ),
    appliedCorrectionId: mapDomainId<'AppliedCorrection'>(
      row.appliedCorrectionId,
      'post_lock_adjustments',
      'applied_correction_id',
    ),
    correctionDecisionId: mapDomainId<'CorrectionDecision'>(
      row.correctionDecisionId,
      'post_lock_adjustments',
      'correction_decision_id',
    ),
    correctionRequestId: mapDomainId<'CorrectionRequest'>(
      row.correctionRequestId,
      'post_lock_adjustments',
      'correction_request_id',
    ),
    createdAt: mapInstant(row.createdAt, 'post_lock_adjustments', 'created_at'),
    employeeId: mapDomainId<'Employee'>(row.employeeId, 'post_lock_adjustments', 'employee_id'),
    id: mapDomainId<'PostLockAdjustment'>(row.id, 'post_lock_adjustments', 'id'),
    localDate: mapLocalDate(row.localDate, 'post_lock_adjustments', 'local_date'),
    minutes: mapSignedMinutes(row.minutes, 'post_lock_adjustments', 'minutes'),
    monthlySnapshotId: mapDomainId<'MonthlySnapshot'>(
      row.monthlySnapshotId,
      'post_lock_adjustments',
      'monthly_snapshot_id',
    ),
    organizationId: mapDomainId<'Organization'>(
      row.organizationId,
      'post_lock_adjustments',
      'organization_id',
    ),
    previousAdjustedWorkedMinutes: mapNonNegativeMinutes(
      row.previousAdjustedWorkedMinutes,
      'post_lock_adjustments',
      'previous_adjusted_worked_minutes',
    ),
    proposedWorkedMinutes: mapNonNegativeMinutes(
      row.proposedWorkedMinutes,
      'post_lock_adjustments',
      'proposed_worked_minutes',
    ),
    reason: row.reason,
    reversesAdjustmentId:
      row.reversesAdjustmentId === null
        ? null
        : mapDomainId<'PostLockAdjustment'>(
            row.reversesAdjustmentId,
            'post_lock_adjustments',
            'reverses_adjustment_id',
          ),
    sourceId: mapDomainId<'AppliedCorrection'>(row.sourceId, 'post_lock_adjustments', 'source_id'),
  });
}

function mapVacationRequest(row: typeof absenceRequests.$inferSelect): VacationRequestRecord {
  if (row.status !== 'SUBMITTED') {
    throw new DatabaseValueError('absence_requests', 'status');
  }
  return Object.freeze({
    absenceTypeId: mapDomainId<'AbsenceTypeVersion'>(
      row.absenceTypeId,
      'absence_requests',
      'absence_type_id',
    ),
    createdAt: mapInstant(row.createdAt, 'absence_requests', 'created_at'),
    employeeId: mapDomainId<'Employee'>(row.employeeId, 'absence_requests', 'employee_id'),
    id: mapDomainId<'AbsenceRequest'>(row.id, 'absence_requests', 'id'),
    organizationId: mapDomainId<'Organization'>(
      row.organizationId,
      'absence_requests',
      'organization_id',
    ),
    status: 'SUBMITTED',
    submittedAt: mapInstant(row.submittedAt, 'absence_requests', 'submitted_at'),
    version: row.version,
  });
}

function mapSicknessReport(row: typeof absenceRequests.$inferSelect): SicknessReportRecord {
  if (row.status !== 'REPORTED' && row.status !== 'ACKNOWLEDGED') {
    throw new DatabaseValueError('absence_requests', 'status');
  }
  return Object.freeze({
    employeeId: mapDomainId<'Employee'>(row.employeeId, 'absence_requests', 'employee_id'),
    id: mapDomainId<'AbsenceRequest'>(row.id, 'absence_requests', 'id'),
    requestedByEmployeeId: mapDomainId<'Employee'>(
      row.requestedByEmployeeId,
      'absence_requests',
      'requested_by_employee_id',
    ),
    status: row.status,
    version: row.version,
  });
}

function mapAbsenceCancellation(
  row: typeof absenceCancellations.$inferSelect,
  absenceTypeId: string,
): AbsenceCancellationRecord {
  return Object.freeze({
    absenceRequestId: mapDomainId<'AbsenceRequest'>(
      row.absenceRequestId,
      'absence_cancellations',
      'absence_request_id',
    ),
    absenceTypeId: mapDomainId<'AbsenceTypeVersion'>(
      absenceTypeId,
      'absence_requests',
      'absence_type_id',
    ),
    employeeId: mapDomainId<'Employee'>(row.employeeId, 'absence_cancellations', 'employee_id'),
    id: mapDomainId<'AbsenceCancellation'>(row.id, 'absence_cancellations', 'id'),
    organizationId: mapDomainId<'Organization'>(
      row.organizationId,
      'absence_cancellations',
      'organization_id',
    ),
    status: row.status,
    version: row.version,
  });
}

function mapApprovalCoverage(
  row: typeof absenceCoverageSegments.$inferSelect,
): AbsenceCoverageSegmentInput & Readonly<{ id: DomainId<'AbsenceCoverageSegment'> }> {
  return Object.freeze({
    endsAtMinute: row.endsAtMinute,
    id: mapDomainId<'AbsenceCoverageSegment'>(row.id, 'absence_coverage_segments', 'id'),
    kind: row.kind,
    localDate: mapLocalDate(row.localDate, 'absence_coverage_segments', 'local_date'),
    startsAtMinute: row.startsAtMinute,
  });
}

function mapAbsenceTypePolicyInput(
  value: Readonly<Record<string, unknown>>,
): AbsenceTypePolicyInput {
  return Object.freeze({
    allowedCoverageUnits: value['allowedCoverageUnits'],
    availabilityState: value['availabilityState'],
    entitlementAccountCategory: value['entitlementAccountCategory'],
    maximumRetrospectiveCalendarDays: value['maximumRetrospectiveCalendarDays'],
    minimumLeadCalendarDays: value['minimumLeadCalendarDays'],
    pendingReservationBehavior: value['pendingReservationBehavior'],
    requestNoteMode: value['requestNoteMode'],
    timeTreatment: value['timeTreatment'],
    workflow: value['workflow'],
  });
}

function mapResolvedAbsenceTypePolicy(
  input: Readonly<{
    active: boolean;
    code: AbsenceTypeCode;
    id: string;
    name: string;
    policy: Readonly<Record<string, unknown>>;
    validFrom: string;
    validTo: string | null;
  }>,
): AbsenceTypePolicy {
  const effectiveRange = createLocalDateRange(
    mapLocalDate(input.validFrom, 'absence_types', 'valid_from'),
    input.validTo === null ? null : mapLocalDate(input.validTo, 'absence_types', 'valid_to'),
  );
  if (!effectiveRange.ok) throw new DatabaseValueError('absence_types', 'effective_range');
  const version = createAbsenceTypeVersion(
    mapDomainId<'AbsenceTypeVersion'>(input.id, 'absence_types', 'id'),
    input.code,
    input.name,
    effectiveRange.value,
    input.active,
    mapAbsenceTypePolicyInput(input.policy),
  );
  if (!version.ok) throw new DatabaseValueError('absence_types', 'policy');
  return version.value.policy;
}

function mapAbsenceTypeCode(value: string): AbsenceTypeCode {
  switch (value) {
    case 'VACATION':
    case 'SICKNESS':
    case 'UNPAID':
    case 'OTHER':
      return value;
    default:
      throw new DatabaseValueError('absence_types', 'code');
  }
}

function mapMonthlyPeriod(
  row: typeof monthlyPeriods.$inferSelect,
  employeeDisplayName: string,
): MonthlyPeriodRecord {
  return Object.freeze({
    approvedAt:
      row.approvedAt === null ? null : mapInstant(row.approvedAt, 'monthly_periods', 'approved_at'),
    employeeDisplayName,
    employeeId: mapDomainId<'Employee'>(row.employeeId, 'monthly_periods', 'employee_id'),
    id: mapDomainId<'MonthlyPeriod'>(row.id, 'monthly_periods', 'id'),
    lockedAt:
      row.lockedAt === null ? null : mapInstant(row.lockedAt, 'monthly_periods', 'locked_at'),
    monthStart: mapLocalDate(row.monthStart, 'monthly_periods', 'month_start'),
    organizationId: mapDomainId<'Organization'>(
      row.organizationId,
      'monthly_periods',
      'organization_id',
    ),
    status: row.status,
    submittedAt:
      row.submittedAt === null
        ? null
        : mapInstant(row.submittedAt, 'monthly_periods', 'submitted_at'),
    submittedByAccountId:
      row.submittedByAccountId === null
        ? null
        : mapDomainId<'Account'>(
            row.submittedByAccountId,
            'monthly_periods',
            'submitted_by_account_id',
          ),
    submittedSourceFingerprint: row.submittedSourceFingerprint,
    version: row.version,
  });
}

function mapApprovedMonthlySnapshot(
  row: typeof approvedMonthlySnapshots.$inferSelect,
): ApprovedMonthlySnapshotRecord {
  return Object.freeze({
    approvalCycle: row.approvalCycle,
    approvedAt: mapInstant(row.approvedAt, 'approved_monthly_snapshots', 'approved_at'),
    approver: Object.freeze({
      accountId: mapDomainId<'Account'>(
        row.approvedByAccountId,
        'approved_monthly_snapshots',
        'approved_by_account_id',
      ),
      authority: row.approvedByAuthority,
      employeeId:
        row.approvedByEmployeeId === null
          ? null
          : mapDomainId<'Employee'>(
              row.approvedByEmployeeId,
              'approved_monthly_snapshots',
              'approved_by_employee_id',
            ),
    }),
    engineVersion: row.engineVersion,
    id: mapDomainId<'MonthlySnapshot'>(row.id, 'approved_monthly_snapshots', 'id'),
    monthlyPeriodId: mapDomainId<'MonthlyPeriod'>(
      row.monthlyPeriodId,
      'approved_monthly_snapshots',
      'monthly_period_id',
    ),
    organizationId: mapDomainId<'Organization'>(
      row.organizationId,
      'approved_monthly_snapshots',
      'organization_id',
    ),
    periodVersion: row.periodVersion,
    schemaVersion: row.schemaVersion,
    snapshot: Object.freeze({ ...row.snapshot }),
    snapshotFingerprint: row.snapshotFingerprint,
    sourceFingerprint: row.sourceFingerprint,
  });
}

function mapMonthlyPeriodDecision(
  row: typeof monthlyPeriodDecisions.$inferSelect,
): MonthlyPeriodDecisionRecord {
  if (
    (row.previousStatus !== 'SUBMITTED' && row.previousStatus !== 'APPROVED') ||
    (row.nextStatus !== 'CHANGES_REQUESTED' &&
      row.nextStatus !== 'APPROVED' &&
      row.nextStatus !== 'LOCKED')
  ) {
    throw new DatabaseValueError('monthly_period_decisions', 'status');
  }
  return Object.freeze({
    action: row.action,
    actor: Object.freeze({
      accountId: mapDomainId<'Account'>(
        row.actorAccountId,
        'monthly_period_decisions',
        'actor_account_id',
      ),
      authority: row.actorAuthority,
      employeeId:
        row.actorEmployeeId === null
          ? null
          : mapDomainId<'Employee'>(
              row.actorEmployeeId,
              'monthly_period_decisions',
              'actor_employee_id',
            ),
    }),
    decidedAt: mapInstant(row.decidedAt, 'monthly_period_decisions', 'decided_at'),
    id: mapDomainId<'MonthlyPeriodDecision'>(row.id, 'monthly_period_decisions', 'id'),
    monthlyPeriodId: mapDomainId<'MonthlyPeriod'>(
      row.monthlyPeriodId,
      'monthly_period_decisions',
      'monthly_period_id',
    ),
    monthlySnapshotId:
      row.monthlySnapshotId === null
        ? null
        : mapDomainId<'MonthlySnapshot'>(
            row.monthlySnapshotId,
            'monthly_period_decisions',
            'monthly_snapshot_id',
          ),
    nextStatus: row.nextStatus,
    nextVersion: row.nextVersion,
    organizationId: mapDomainId<'Organization'>(
      row.organizationId,
      'monthly_period_decisions',
      'organization_id',
    ),
    previousStatus: row.previousStatus,
    previousVersion: row.previousVersion,
    reason: row.reason,
  });
}

function mapMonthlyRange(
  row: Readonly<{ endsOn: string | null; id: string; startsOn: string }>,
  table: 'employment_periods' | 'policy_assignments' | 'schedule_assignments',
): MonthlyPeriodRangeRecord {
  return Object.freeze({
    endsOn: row.endsOn === null ? null : mapLocalDate(row.endsOn, table, 'ends_on'),
    id: row.id,
    startsOn: mapLocalDate(row.startsOn, table, 'starts_on'),
  });
}

function mapMonthlyBlocker(
  row: Readonly<{ id: string; localDate: string; version: number }>,
  code: MonthlyPeriodBlockerSourceRecord['code'],
): MonthlyPeriodBlockerSourceRecord {
  return Object.freeze({
    code,
    localDate: mapLocalDate(row.localDate, 'monthly_periods', 'source_local_date'),
    sourceId: row.id,
    sourceVersion: row.version,
  });
}

function mapPositiveVersion(value: number, table: string, column: string): number {
  if (!Number.isSafeInteger(value) || value < 1) throw new DatabaseValueError(table, column);
  return value;
}

function endOfMonth(monthStart: LocalDate): LocalDate {
  let endDate = addLocalDateDays(monthStart, 27);
  while (addLocalDateDays(endDate, 1).slice(0, 7) === monthStart.slice(0, 7)) {
    endDate = addLocalDateDays(endDate, 1);
  }
  return endDate;
}

function mapWarningCode(value: unknown): string {
  if (typeof value !== 'string') {
    throw new DatabaseValueError('daily_projections', 'warning_codes');
  }
  return value;
}

function mapTimeAccountEntry(row: typeof timeAccountEntries.$inferSelect): TimeAccountLedgerEntry {
  return Object.freeze({
    actor: mapTimeAccountActor(row.actorKind, row.actorId),
    amountMinutes: mapSignedMinutes(row.minutes, 'time_account_entries', 'minutes'),
    effectiveDate: mapLocalDate(row.localDate, 'time_account_entries', 'local_date'),
    entryId: mapDomainId<'TimeAccountLedgerEntry'>(row.id, 'time_account_entries', 'id'),
    entryType: row.entryType,
    explanationCode: mapDomainId<'TimeAccountExplanationCode'>(
      row.explanationCode,
      'time_account_entries',
      'explanation_code',
    ),
    organizationId: mapDomainId<'Organization'>(
      row.organizationId,
      'time_account_entries',
      'organization_id',
    ),
    recordedAt: mapInstant(row.postedAt, 'time_account_entries', 'posted_at'),
    sourceKey: mapDomainId<'TimeAccountLedgerSource'>(
      row.sourceId,
      'time_account_entries',
      'source_id',
    ),
    subjectEmployeeId: mapDomainId<'Employee'>(
      row.employeeId,
      'time_account_entries',
      'employee_id',
    ),
  });
}

function mapLeaveEntitlementEntry(
  row: typeof leaveEntitlementEntries.$inferSelect,
  absenceTypeName: string,
): LeaveEntitlementEntryRecord {
  return Object.freeze({
    absenceTypeId: mapDomainId<'AbsenceTypeVersion'>(
      row.absenceTypeId,
      'leave_entitlement_entries',
      'absence_type_id',
    ),
    absenceTypeName,
    effectiveOn: mapLocalDate(row.effectiveOn, 'leave_entitlement_entries', 'effective_on'),
    entryId: mapDomainId<'LeaveEntitlementEntry'>(row.id, 'leave_entitlement_entries', 'id'),
    entryType: row.entryType,
    minutes: mapSignedMinutes(row.minutes, 'leave_entitlement_entries', 'minutes'),
    organizationId: mapDomainId<'Organization'>(
      row.organizationId,
      'leave_entitlement_entries',
      'organization_id',
    ),
    postedAt: mapInstant(row.createdAt, 'leave_entitlement_entries', 'created_at'),
    sourceId: mapDomainId<'LeaveEntitlementSource'>(
      row.sourceId,
      'leave_entitlement_entries',
      'source_id',
    ),
    subjectEmployeeId: mapDomainId<'Employee'>(
      row.employeeId,
      'leave_entitlement_entries',
      'employee_id',
    ),
  });
}

function auditActorColumns(actor: AuditActor) {
  return actor.kind === 'ACCOUNT'
    ? {
        actorAccountId: actor.accountId,
        actorKind: actor.kind,
        actorRole: actor.role,
        actorSystemProcess: null,
      }
    : {
        actorAccountId: null,
        actorKind: actor.kind,
        actorRole: null,
        actorSystemProcess: actor.systemProcess,
      };
}

function mapDomainAuditEvent(row: typeof domainAuditEvents.$inferSelect): DomainAuditEventRecord {
  return Object.freeze({
    actionCode: row.actionCode,
    actor: mapAuditActor(row, 'domain_audit_events'),
    facts: parseDomainAuditFacts(row.facts),
    id: mapDomainId<'DomainAuditEvent'>(row.id, 'domain_audit_events', 'id'),
    occurredAt: mapInstant(row.occurredAt, 'domain_audit_events', 'occurred_at'),
    organizationId: mapDomainId<'Organization'>(
      row.organizationId,
      'domain_audit_events',
      'organization_id',
    ),
    outcome: row.outcome,
    privileged: row.privileged,
    reasonCode: row.reasonCode,
    requestId:
      row.requestId === null
        ? null
        : mapDomainId<'Request'>(row.requestId, 'domain_audit_events', 'request_id'),
    restrictedReasonId:
      row.restrictedReasonId === null
        ? null
        : mapDomainId<'RestrictedReason'>(
            row.restrictedReasonId,
            'domain_audit_events',
            'restricted_reason_id',
          ),
    subjectEmployeeId:
      row.subjectEmployeeId === null
        ? null
        : mapDomainId<'Employee'>(
            row.subjectEmployeeId,
            'domain_audit_events',
            'subject_employee_id',
          ),
    targetId: row.targetId,
    targetKind: row.targetKind,
  });
}

function mapSecurityAuditEvent(
  row: typeof securityAuditEvents.$inferSelect,
): SecurityAuditEventRecord {
  return Object.freeze({
    actionCode: row.actionCode,
    actor: mapAuditActor(row, 'security_audit_events'),
    facts: parseSecurityAuditFacts(row.facts),
    id: mapDomainId<'SecurityAuditEvent'>(row.id, 'security_audit_events', 'id'),
    occurredAt: mapInstant(row.occurredAt, 'security_audit_events', 'occurred_at'),
    organizationId: mapDomainId<'Organization'>(
      row.organizationId,
      'security_audit_events',
      'organization_id',
    ),
    outcome: row.outcome,
    privileged: row.privileged,
    reasonCode: row.reasonCode,
    requestId:
      row.requestId === null
        ? null
        : mapDomainId<'Request'>(row.requestId, 'security_audit_events', 'request_id'),
    targetAccountId:
      row.targetAccountId === null
        ? null
        : mapDomainId<'Account'>(row.targetAccountId, 'security_audit_events', 'target_account_id'),
    targetId: row.targetId,
    targetKind: row.targetKind,
  });
}

function mapAuditActor(
  row: Readonly<{
    actorAccountId: string | null;
    actorKind: 'ACCOUNT' | 'SYSTEM';
    actorRole: ApplicationRole | null;
    actorSystemProcess: string | null;
  }>,
  table: 'domain_audit_events' | 'security_audit_events',
): AuditActor {
  if (row.actorKind === 'ACCOUNT' && row.actorAccountId !== null) {
    return Object.freeze({
      accountId: mapDomainId<'Account'>(row.actorAccountId, table, 'actor_account_id'),
      kind: 'ACCOUNT' as const,
      role: row.actorRole,
    });
  }
  if (row.actorKind === 'SYSTEM' && row.actorSystemProcess !== null) {
    return Object.freeze({
      kind: 'SYSTEM' as const,
      systemProcess: mapDomainId<'SystemProcess'>(
        row.actorSystemProcess,
        table,
        'actor_system_process',
      ),
    });
  }
  throw new DatabaseValueError(table, 'actor_kind');
}

function validateAuditPage(limit: number, offset: number): void {
  if (
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 100 ||
    !Number.isSafeInteger(offset) ||
    offset < 0
  ) {
    throw new AuditValueError('pagination');
  }
}

function mapTimeAccountActor(kind: 'ACCOUNT' | 'SYSTEM', actorId: string): TimeAccountEntryActor {
  return kind === 'ACCOUNT'
    ? Object.freeze({
        accountId: mapDomainId<'Account'>(actorId, 'time_account_entries', 'actor_id'),
        kind,
      })
    : Object.freeze({
        kind,
        systemProcess: mapDomainId<'SystemProcess'>(actorId, 'time_account_entries', 'actor_id'),
      });
}
