import { randomUUID } from 'node:crypto';

import {
  parseDomainId,
  parseInstant,
  parseLocalDate,
  parseSignedMinutes,
  type DomainId,
  type Instant,
  type LeaveEntitlementLedgerEntry,
  type LocalDate,
  type SignedMinutes,
  type TimeAccountLedgerEntry,
} from '@workledger/domain';
import { createDatabaseHarnessState } from '@workledger/test-utils';

import { createWorkLedgerDatabase } from '../src/index.js';
import { createMigratedPostgresFixture } from './postgres-fixture.js';

const databaseHarness = createDatabaseHarnessState(process.env);
const integrationTest = databaseHarness.enabled ? test : test.skip;

integrationTest(
  `keeps repository work scoped and atomic (${databaseHarness.safeLabel})`,
  async () => {
    const fixture = await createMigratedPostgresFixture(databaseHarness.url, 'repositories');
    const database = createWorkLedgerDatabase({
      applicationName: 'workledger-repository-test',
      connectionString: fixture.databaseUrl,
      maxConnections: 4,
    });

    try {
      const organizationResult = await fixture.client.query<{ id: string }>(
        `insert into organizations (name, time_zone) values ($1, $2) returning id`,
        ['Repository test organization', 'Europe/Berlin'],
      );
      const organizationId = domainId<'Organization'>(organizationResult.rows[0]?.id);
      const employeeResult = await fixture.client.query<{ id: string }>(
        `insert into employees (organization_id, employee_number, display_name) values ($1, $2, $3) returning id`,
        [organizationId, 'WL-REPOSITORY-1', 'Repository Test Employee'],
      );
      const employeeId = domainId<'Employee'>(employeeResult.rows[0]?.id);
      const absenceTypeResult = await fixture.client.query<{ id: string }>(
        `insert into absence_types
          (organization_id, code, name, version, active, valid_from, valid_to, policy)
         values ($1, 'VACATION', 'Vacation', 1, true, '2026-01-01', null, '{}'::jsonb)
         returning id`,
        [organizationId],
      );
      const absenceTypeId = domainId<'AbsenceTypeVersion'>(absenceTypeResult.rows[0]?.id);

      const initial = await database.transaction(async (transaction) => {
        const organization = await transaction.organizations.findById(organizationId);
        const employee = await transaction.employees.findById(organizationId, employeeId);
        await transaction.attendance.ensureHead(organizationId, employeeId);
        const head = await transaction.attendance.lockHead(organizationId, employeeId);
        return { employee, head, organization };
      });

      expect(initial.organization?.id).toBe(organizationId);
      expect(initial.employee?.id).toBe(employeeId);
      expect(initial.head).toMatchObject({
        attendanceRevision: 0,
        nextEventSequence: 1,
        state: 'OFF_WORK',
      });

      const commandId = domainId<'AttendanceCommand'>(randomUUID());
      await database.transaction(
        async (transaction) => {
          const head = await transaction.attendance.lockHead(organizationId, employeeId);
          expect(head).not.toBeNull();
          const advanced = await transaction.attendance.advanceHead({
            appendedEventCount: 1,
            employeeId,
            expectedAttendanceRevision: 0,
            expectedNextEventSequence: 1,
            nextState: 'WORKING',
            organizationId,
          });
          expect(advanced?.attendanceRevision).toBe(1);
          await transaction.attendance.appendPunchEvents(organizationId, employeeId, [
            {
              actorEmployeeId: employeeId,
              commandId,
              event: {
                eventSequence: 1,
                occurredAt: instant('2026-08-10T08:00:00Z'),
                type: 'CLOCK_IN',
              },
            },
          ]);
        },
        { isolationLevel: 'serializable' },
      );

      const staleResult = await database.transaction(async (transaction) => {
        await transaction.attendance.lockHead(organizationId, employeeId);
        return transaction.attendance.advanceHead({
          appendedEventCount: 1,
          employeeId,
          expectedAttendanceRevision: 0,
          expectedNextEventSequence: 1,
          nextState: 'ON_BREAK',
          organizationId,
        });
      });
      expect(staleResult).toBeNull();

      const ledgerEntry = createLedgerEntry(organizationId, employeeId);
      const leaveAllocation = createLeaveEntry(
        organizationId,
        employeeId,
        absenceTypeId,
        'ALLOCATION',
        4_800,
      );
      const projectionDate = localDate('2026-08-10');
      await database.transaction(async (transaction) => {
        await transaction.timeAccount.append({
          entry: ledgerEntry,
          sourceFingerprint: 'b'.repeat(64),
        });
        await transaction.leaveEntitlements.append({ entry: leaveAllocation });
        const projection = await transaction.dailyProjections.replaceNext({
          absenceCreditMinutes: 0,
          adjustmentMinutes: 0,
          balanceMinutes: 0,
          breakMinutes: 0,
          calculatedAt: instant('2026-08-11T00:00:00Z'),
          calculationStatus: 'COMPLETE',
          creditedMinutes: 480,
          employeeId,
          engineVersion: 'repository-test-v1',
          expectedMinutes: 480,
          localDate: projectionDate,
          organizationId,
          projectionVersion: 1,
          sourceFingerprint: 'c'.repeat(64),
          sourceReferences: { punchEventIds: [commandId] },
          warningCodes: [],
          workedMinutes: 480,
        });
        expect(projection?.projectionVersion).toBe(1);
      });

      const rollbackMarker = new Error('ROLLBACK_TEST');
      await expect(
        database.transaction(async (transaction) => {
          await transaction.dailyProjections.replaceNext({
            absenceCreditMinutes: 0,
            adjustmentMinutes: 0,
            balanceMinutes: 60,
            breakMinutes: 0,
            calculatedAt: instant('2026-08-11T01:00:00Z'),
            calculationStatus: 'COMPLETE',
            creditedMinutes: 540,
            employeeId,
            engineVersion: 'repository-test-v1',
            expectedMinutes: 480,
            localDate: projectionDate,
            organizationId,
            projectionVersion: 2,
            sourceFingerprint: 'd'.repeat(64),
            sourceReferences: { punchEventIds: [commandId] },
            warningCodes: [],
            workedMinutes: 540,
          });
          throw rollbackMarker;
        }),
      ).rejects.toBe(rollbackMarker);

      const persisted = await database.transaction(async (transaction) => ({
        events: await transaction.attendance.listPunchEvents(organizationId, employeeId),
        ledger: await transaction.timeAccount.listForEmployee(organizationId, employeeId),
        leaveEntries: await transaction.leaveEntitlements.listForEmployee(
          organizationId,
          employeeId,
        ),
        projection: await transaction.dailyProjections.findByEmployeeDate(
          organizationId,
          employeeId,
          projectionDate,
        ),
      }));
      expect(persisted.events).toHaveLength(1);
      expect(persisted.events[0]?.event.type).toBe('CLOCK_IN');
      expect(persisted.ledger).toEqual([ledgerEntry]);
      expect(persisted.leaveEntries).toMatchObject([
        { entryType: 'ALLOCATION', minutes: 4_800, absenceTypeName: 'Vacation' },
      ]);
      expect(persisted.projection?.projectionVersion).toBe(1);

      const reservationSource = domainId<'LeaveEntitlementSource'>(randomUUID());
      const reservationOne = createLeaveEntry(
        organizationId,
        employeeId,
        absenceTypeId,
        'PENDING_RESERVATION',
        -480,
        reservationSource,
      );
      const reservationTwo = {
        ...reservationOne,
        entryId: domainId<'LeaveEntitlementEntry'>(randomUUID()),
      };
      const concurrentReservationResults = await Promise.allSettled([
        database.transaction((transaction) =>
          transaction.leaveEntitlements.append({ entry: reservationOne }),
        ),
        database.transaction((transaction) =>
          transaction.leaveEntitlements.append({ entry: reservationTwo }),
        ),
      ]);
      expect(
        concurrentReservationResults.filter(({ status }) => status === 'fulfilled'),
      ).toHaveLength(1);
      expect(
        concurrentReservationResults.filter(({ status }) => status === 'rejected'),
      ).toHaveLength(1);
      const leaveAfterRace = await database.transaction((transaction) =>
        transaction.leaveEntitlements.listForEmployee(organizationId, employeeId),
      );
      expect(
        leaveAfterRace.filter(({ entryType }) => entryType === 'PENDING_RESERVATION'),
      ).toHaveLength(1);

      const otherOrganizationResult = await fixture.client.query<{ id: string }>(
        `insert into organizations (name, time_zone) values ($1, $2) returning id`,
        ['Other repository test organization', 'Europe/Berlin'],
      );
      const otherOrganizationId = domainId<'Organization'>(otherOrganizationResult.rows[0]?.id);
      const crossOrganizationEmployee = await database.transaction((transaction) =>
        transaction.employees.findById(otherOrganizationId, employeeId),
      );
      expect(crossOrganizationEmployee).toBeNull();

      let retryAttempts = 0;
      const retryResult = await database.transaction(
        async () => {
          retryAttempts += 1;
          if (retryAttempts === 1) {
            throw Object.assign(new Error('simulated serialization failure'), { code: '40001' });
          }
          return 'retried';
        },
        {
          isolationLevel: 'serializable',
          retry: { maxAttempts: 2, mode: 'DATABASE_ONLY' },
        },
      );
      expect(retryResult).toBe('retried');
      expect(retryAttempts).toBe(2);
    } finally {
      await database.close();
      await fixture.cleanup();
    }
  },
);

function createLedgerEntry(
  organizationId: DomainId<'Organization'>,
  employeeId: DomainId<'Employee'>,
): TimeAccountLedgerEntry {
  return Object.freeze({
    actor: Object.freeze({
      kind: 'SYSTEM' as const,
      systemProcess: domainId<'SystemProcess'>(randomUUID()),
    }),
    amountMinutes: signedMinutes(0),
    effectiveDate: localDate('2026-08-10'),
    entryId: domainId<'TimeAccountLedgerEntry'>(randomUUID()),
    entryType: 'OPENING_BALANCE',
    explanationCode: domainId<'TimeAccountExplanationCode'>('INITIAL_BALANCE'),
    organizationId,
    recordedAt: instant('2026-08-10T07:00:00Z'),
    sourceKey: domainId<'TimeAccountLedgerSource'>(randomUUID()),
    subjectEmployeeId: employeeId,
  });
}

function createLeaveEntry(
  organizationId: DomainId<'Organization'>,
  employeeId: DomainId<'Employee'>,
  absenceTypeId: DomainId<'AbsenceTypeVersion'>,
  entryType: LeaveEntitlementLedgerEntry['entryType'],
  minutes: number,
  sourceId = domainId<'LeaveEntitlementSource'>(randomUUID()),
): LeaveEntitlementLedgerEntry {
  return Object.freeze({
    absenceTypeId,
    effectiveOn: localDate('2026-08-10'),
    entryId: domainId<'LeaveEntitlementEntry'>(randomUUID()),
    entryType,
    minutes: signedMinutes(minutes),
    organizationId,
    postedAt: instant('2026-08-10T07:00:00Z'),
    sourceId,
    subjectEmployeeId: employeeId,
  });
}

function domainId<Entity extends string>(value: unknown): DomainId<Entity> {
  const result = parseDomainId<Entity>(value);
  if (!result.ok) throw new Error('Invalid test domain identifier.');
  return result.value;
}

function instant(value: string): Instant {
  const result = parseInstant(value);
  if (!result.ok) throw new Error('Invalid test instant.');
  return result.value;
}

function localDate(value: string): LocalDate {
  const result = parseLocalDate(value);
  if (!result.ok) throw new Error('Invalid test local date.');
  return result.value;
}

function signedMinutes(value: number): SignedMinutes {
  const result = parseSignedMinutes(value);
  if (!result.ok) throw new Error('Invalid test signed minutes.');
  return result.value;
}
