import { and, asc, desc, eq, gt, inArray, isNull, lte, or, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import type { DomainId, TimeAccountEntryActor, TimeAccountLedgerEntry } from '@workledger/domain';

import {
  accountEmployeeLinks,
  accountRoleAssignments,
  authSessions,
  authUsers,
  attendanceHeads,
  dailyProjections,
  domainAuditEvents,
  employees,
  employmentPeriods,
  managerAssignments,
  organizations,
  punchEvents,
  securityAuditEvents,
  timeAccountEntries,
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
  AdvanceAttendanceHeadInput,
  ApplicationRole,
  AuditActor,
  AuditRepository,
  AppendPunchEvent,
  AppendTimeAccountEntryInput,
  AttendanceHeadRecord,
  AttendanceRepository,
  AuthorizationActorRecord,
  AuthorizationRepository,
  DailyProjectionRecord,
  DailyProjectionRepository,
  DomainAuditEventRecord,
  EmployeeRecord,
  EmployeeRepository,
  LinkEmployeeInput,
  ListAuthorizedEmployeesInput,
  OrganizationRecord,
  OrganizationRepository,
  ReplaceDailyProjectionInput,
  ReplaceActiveRolesInput,
  SecurityAuditEventRecord,
  StoredPunchEvent,
  TimeAccountRepository,
} from './contracts.js';
import {
  AuditValueError,
  parseDomainAuditFacts,
  parseSecurityAuditFacts,
  validateDomainAuditInput,
  validateSecurityAuditInput,
} from './audit-values.js';

import * as schema from '../schema/index.js';

type RootDatabase = NodePgDatabase<typeof schema>;
export type RepositoryTransaction = Parameters<Parameters<RootDatabase['transaction']>[0]>[0];

export function createTransactionRepositories(transaction: RepositoryTransaction): Readonly<{
  audit: AuditRepository;
  attendance: AttendanceRepository;
  authorization: AuthorizationRepository;
  dailyProjections: DailyProjectionRepository;
  employees: EmployeeRepository;
  organizations: OrganizationRepository;
  timeAccount: TimeAccountRepository;
}> {
  return Object.freeze({
    audit: new PostgresAuditRepository(transaction),
    attendance: new PostgresAttendanceRepository(transaction),
    authorization: new PostgresAuthorizationRepository(transaction),
    dailyProjections: new PostgresDailyProjectionRepository(transaction),
    employees: new PostgresEmployeeRepository(transaction),
    organizations: new PostgresOrganizationRepository(transaction),
    timeAccount: new PostgresTimeAccountRepository(transaction),
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

function mapEmployeeId(value: string) {
  return mapDomainId<'Employee'>(value, 'employees', 'id');
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
}

class PostgresDailyProjectionRepository implements DailyProjectionRepository {
  constructor(private readonly transaction: RepositoryTransaction) {}

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
