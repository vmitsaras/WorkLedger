import { and, asc, eq, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import type { DomainId, TimeAccountEntryActor, TimeAccountLedgerEntry } from '@workledger/domain';

import {
  attendanceHeads,
  dailyProjections,
  employees,
  organizations,
  punchEvents,
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
  AppendPunchEvent,
  AppendTimeAccountEntryInput,
  AttendanceHeadRecord,
  AttendanceRepository,
  DailyProjectionRecord,
  DailyProjectionRepository,
  EmployeeRecord,
  EmployeeRepository,
  OrganizationRecord,
  OrganizationRepository,
  ReplaceDailyProjectionInput,
  StoredPunchEvent,
  TimeAccountRepository,
} from './contracts.js';

import * as schema from '../schema/index.js';

type RootDatabase = NodePgDatabase<typeof schema>;
export type RepositoryTransaction = Parameters<Parameters<RootDatabase['transaction']>[0]>[0];

export function createTransactionRepositories(transaction: RepositoryTransaction): Readonly<{
  attendance: AttendanceRepository;
  dailyProjections: DailyProjectionRepository;
  employees: EmployeeRepository;
  organizations: OrganizationRepository;
  timeAccount: TimeAccountRepository;
}> {
  return Object.freeze({
    attendance: new PostgresAttendanceRepository(transaction),
    dailyProjections: new PostgresDailyProjectionRepository(transaction),
    employees: new PostgresEmployeeRepository(transaction),
    organizations: new PostgresOrganizationRepository(transaction),
    timeAccount: new PostgresTimeAccountRepository(transaction),
  });
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
