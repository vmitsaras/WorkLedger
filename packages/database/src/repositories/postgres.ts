import { createHash } from 'node:crypto';

import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  or,
  sql,
} from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { unionAll } from 'drizzle-orm/pg-core';

import {
  createLocalDateRange,
  createPolicyAssignment,
  createScheduleAssignment,
  createTimePolicy,
  createWeeklySchedule,
  localDateAtInstant,
  parseNonNegativeMinutes,
  parseTimeZoneId,
  type DomainId,
  type Instant,
  type LocalDate,
  type AbsenceTypePolicyInput,
  type TimeAccountEntryActor,
  type TimeAccountLedgerEntry,
} from '@workledger/domain';

import {
  accountEmployeeLinks,
  accountRoleAssignments,
  authSessions,
  authUsers,
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
  monthlyPeriods,
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
  AbsenceCoverageSegmentInput,
  AbsenceCancellationRecord,
  AbsenceCancellationDecisionResult,
  AbsenceRequestRepository,
  ApprovalInboxItemRecord,
  ApprovalInboxRepository,
  AbsenceRequestConfigurationInput,
  DecideAbsenceCancellationInput,
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
  OrganizationRecord,
  OrganizationRepository,
  PersonalCalendarRecords,
  ReplaceDailyProjectionInput,
  ReplaceActiveRolesInput,
  SecurityAuditEventRecord,
  StoredPunchEvent,
  SubmitCorrectionRequestInput,
  SubmitSicknessReportInput,
  SubmitAbsenceCancellationInput,
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
import { AbsenceCancellationLockedPeriodError } from './absence-cancellation-errors.js';

import * as schema from '../schema/index.js';

type RootDatabase = NodePgDatabase<typeof schema>;
export type RepositoryTransaction = Parameters<Parameters<RootDatabase['transaction']>[0]>[0];

export function createTransactionRepositories(transaction: RepositoryTransaction): Readonly<{
  accountSelfService: AccountSelfServiceRepository;
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
  timeAccount: TimeAccountRepository;
  todayAttendance: TodayAttendanceRepository;
}> {
  return Object.freeze({
    accountSelfService: new PostgresAccountSelfServiceRepository(transaction),
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
    timeAccount: new PostgresTimeAccountRepository(transaction),
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

    const unified = unionAll(correctionQuery, absenceQuery, cancellationQuery).as('approval_inbox');
    const filters = and(
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
        : mapDomainId<'AbsenceCancellation'>(value.id, 'absence_cancellations', 'id');
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
      : 'absence_cancellations';
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

class PostgresCorrectionRequestRepository implements CorrectionRequestRepository {
  constructor(private readonly transaction: RepositoryTransaction) {}

  async submit(input: SubmitCorrectionRequestInput): Promise<CorrectionRequestRecord> {
    const [row] = await this.transaction
      .insert(correctionRequests)
      .values({
        employeeId: input.employeeId,
        localDate: input.localDate,
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
      actorEmployeeId: input.actorEmployeeId,
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
    const locked = await this.transaction
      .select({ id: monthlyPeriods.id })
      .from(monthlyPeriods)
      .where(
        and(
          eq(monthlyPeriods.organizationId, input.organizationId),
          eq(monthlyPeriods.employeeId, input.employeeId),
          eq(monthlyPeriods.status, 'LOCKED'),
          inArray(monthlyPeriods.monthStart, monthStarts),
        ),
      )
      .limit(1);
    if (locked.length > 0) throw new AbsenceCancellationLockedPeriodError();

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
      actorEmployeeId: input.actorEmployeeId,
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
          eq(absenceCancellations.employeeId, input.actorEmployeeId),
          eq(absenceCancellations.version, input.expectedVersion),
          inArray(absenceCancellations.status, ['PENDING_DECISION', 'CHANGES_REQUESTED']),
        ),
      )
      .returning();
    if (updated === undefined) return null;
    await this.transaction.insert(absenceCancellationDecisions).values({
      absenceCancellationId: updated.id,
      action: 'WITHDRAW',
      actorEmployeeId: input.actorEmployeeId,
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
    actorEmployeeId: DomainId<'Employee'>,
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
      actorEmployeeId,
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
