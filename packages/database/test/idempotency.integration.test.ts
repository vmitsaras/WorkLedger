import { createHash, randomUUID } from 'node:crypto';

import { parseDomainId, parseInstant, type DomainId, type Instant } from '@workledger/domain';
import { createDatabaseHarnessState } from '@workledger/test-utils';

import { createWorkLedgerDatabase, type AttendanceIdempotencyOutcome } from '../src/index.js';
import { createMigratedPostgresFixture } from './postgres-fixture.js';

const databaseHarness = createDatabaseHarnessState(process.env);
const integrationTest = databaseHarness.enabled ? test : test.skip;

integrationTest(
  `claims, completes, replays, conflicts, and rolls back attendance idempotency (${databaseHarness.safeLabel})`,
  async () => {
    const fixture = await createMigratedPostgresFixture(databaseHarness.url, 'idempotency');
    const database = createWorkLedgerDatabase({
      applicationName: 'workledger-idempotency-test',
      connectionString: fixture.databaseUrl,
      maxConnections: 4,
    });

    try {
      const organization = await fixture.client.query<{ id: string }>(
        `insert into organizations (name, time_zone) values ($1, $2) returning id`,
        ['Idempotency test organization', 'Europe/Berlin'],
      );
      const organizationId = domainId<'Organization'>(organization.rows[0]?.id);
      const employee = await fixture.client.query<{ id: string }>(
        `insert into employees (organization_id, employee_number, display_name) values ($1, $2, $3) returning id`,
        [organizationId, 'WL-IDEMPOTENCY-1', 'Idempotency Test Employee'],
      );
      const employeeId = domainId<'Employee'>(employee.rows[0]?.id);
      const account = await fixture.client.query<{ id: string }>(
        `insert into auth_users (name, email) values ($1, $2) returning id`,
        ['Idempotency Test Account', 'idempotency@example.test'],
      );
      const accountId = domainId<'Account'>(account.rows[0]?.id);
      const key = 'attendance-intent-00000001';
      const requestFingerprint = 'a'.repeat(64);
      const occurredAt = instant('2026-08-11T08:00:00Z');

      const original = await database.transaction(async (transaction) => {
        const claim = await transaction.attendanceIdempotency.claim({
          actorAccountId: accountId,
          command: 'CLOCK_IN',
          employeeId,
          idempotencyKey: key,
          organizationId,
          requestFingerprint,
        });
        expect(claim.kind).toBe('CLAIMED');
        if (claim.kind !== 'CLAIMED') throw new Error('Expected a fresh idempotency claim.');

        await transaction.attendance.ensureHead(organizationId, employeeId);
        const head = await transaction.attendance.advanceHead({
          appendedEventCount: 1,
          employeeId,
          expectedAttendanceRevision: 0,
          expectedNextEventSequence: 1,
          nextState: 'WORKING',
          organizationId,
        });
        expect(head?.attendanceRevision).toBe(1);
        const events = await transaction.attendance.appendPunchEvents(organizationId, employeeId, [
          {
            actorEmployeeId: employeeId,
            commandId: domainId<'AttendanceCommand'>(randomUUID()),
            event: { eventSequence: 1, occurredAt, type: 'CLOCK_IN' },
          },
        ]);
        await transaction.audit.appendDomain({
          actionCode: 'ATTENDANCE_CLOCK_IN',
          actor: { accountId, kind: 'ACCOUNT', role: 'EMPLOYEE' },
          facts: { attendanceRevision: 1, eventCount: 1 },
          occurredAt,
          organizationId,
          outcome: 'SUCCESS',
          privileged: false,
          reasonCode: null,
          requestId: domainId<'Request'>(randomUUID()),
          restrictedReasonId: null,
          subjectEmployeeId: employeeId,
          targetId: employeeId,
          targetKind: 'ATTENDANCE',
        });
        const outcome: AttendanceIdempotencyOutcome = Object.freeze({
          kind: 'SUCCESS',
          data: Object.freeze({
            attendanceRevision: 1,
            command: 'CLOCK_IN',
            createdEvents: Object.freeze(
              events.map((event) => Object.freeze({ id: event.id, type: event.event.type })),
            ),
            occurredAt,
            resultingState: 'WORKING',
            validActions: Object.freeze(['START_BREAK', 'CLOCK_OUT']),
          }),
        });
        expect(
          await transaction.attendanceIdempotency.complete({
            command: 'CLOCK_IN',
            completedAt: instant('2026-08-11T08:00:01Z'),
            originalHttpStatus: 200,
            outcome,
            recordId: claim.recordId,
            requestFingerprint,
          }),
        ).toBe(true);
        return outcome;
      });

      const replay = await database.transaction((transaction) =>
        transaction.attendanceIdempotency.claim({
          actorAccountId: accountId,
          command: 'CLOCK_IN',
          employeeId,
          idempotencyKey: key,
          organizationId,
          requestFingerprint,
        }),
      );
      expect(replay).toEqual({ kind: 'REPLAY', originalHttpStatus: 200, outcome: original });

      const conflict = await database.transaction((transaction) =>
        transaction.attendanceIdempotency.claim({
          actorAccountId: accountId,
          command: 'CLOCK_OUT',
          employeeId,
          idempotencyKey: key,
          organizationId,
          requestFingerprint: 'b'.repeat(64),
        }),
      );
      expect(conflict).toEqual({ kind: 'CONFLICT' });

      const stored = await fixture.client.query<{
        audit_count: string;
        event_count: string;
        idempotency_key_hash: string;
        raw_key_count: string;
        record_count: string;
      }>(
        `select
           (select count(*) from domain_audit_events) as audit_count,
           (select count(*) from punch_events) as event_count,
           min(idempotency_key_hash) as idempotency_key_hash,
           count(*) filter (where idempotency_key_hash = $1) as raw_key_count,
           count(*) as record_count
         from idempotency_records`,
        [key],
      );
      expect(stored.rows[0]).toMatchObject({
        audit_count: '1',
        event_count: '1',
        idempotency_key_hash: createHash('sha256').update(key).digest('hex'),
        raw_key_count: '0',
        record_count: '1',
      });
      await expect(
        fixture.client.query(
          `update idempotency_records set original_http_status = 201 where idempotency_key_hash = $1`,
          [stored.rows[0]?.idempotency_key_hash],
        ),
      ).rejects.toMatchObject({ code: '55000' });
      await expect(
        fixture.client.query(`delete from idempotency_records where idempotency_key_hash = $1`, [
          stored.rows[0]?.idempotency_key_hash,
        ]),
      ).rejects.toMatchObject({ code: '55000' });

      const rollbackKey = 'attendance-intent-rollback-01';
      const rollbackMarker = new Error('ROLLBACK_IDEMPOTENCY');
      await expect(
        database.transaction(async (transaction) => {
          const claim = await transaction.attendanceIdempotency.claim({
            actorAccountId: accountId,
            command: 'START_BREAK',
            employeeId,
            idempotencyKey: rollbackKey,
            organizationId,
            requestFingerprint: 'c'.repeat(64),
          });
          expect(claim.kind).toBe('CLAIMED');
          throw rollbackMarker;
        }),
      ).rejects.toBe(rollbackMarker);
      const retry = await database.transaction(async (transaction) => {
        const claim = await transaction.attendanceIdempotency.claim({
          actorAccountId: accountId,
          command: 'START_BREAK',
          employeeId,
          idempotencyKey: rollbackKey,
          organizationId,
          requestFingerprint: 'c'.repeat(64),
        });
        if (claim.kind !== 'CLAIMED') throw new Error('Expected a claim after rollback.');
        expect(
          await transaction.attendanceIdempotency.complete({
            command: 'START_BREAK',
            completedAt: instant('2026-08-11T08:30:00Z'),
            originalHttpStatus: 409,
            outcome: {
              kind: 'ERROR',
              error: { code: 'ATTENDANCE_STATE_CHANGED' },
            },
            recordId: claim.recordId,
            requestFingerprint: 'e'.repeat(64),
          }),
        ).toBe(false);
        expect(
          await transaction.attendanceIdempotency.complete({
            command: 'START_BREAK',
            completedAt: instant('2026-08-11T08:30:00Z'),
            originalHttpStatus: 409,
            outcome: {
              kind: 'ERROR',
              error: { code: 'ATTENDANCE_STATE_CHANGED' },
            },
            recordId: claim.recordId,
            requestFingerprint: 'c'.repeat(64),
          }),
        ).toBe(true);
        return claim;
      });
      expect(retry.kind).toBe('CLAIMED');
    } finally {
      await database.close();
      await fixture.cleanup();
    }
  },
);

integrationTest(
  `serializes concurrent matching attendance claims to one terminal result (${databaseHarness.safeLabel})`,
  async () => {
    const fixture = await createMigratedPostgresFixture(databaseHarness.url, 'idempotency_race');
    const database = createWorkLedgerDatabase({
      applicationName: 'workledger-idempotency-race-test',
      connectionString: fixture.databaseUrl,
      maxConnections: 4,
    });

    try {
      const organization = await fixture.client.query<{ id: string }>(
        `insert into organizations (name, time_zone) values ($1, $2) returning id`,
        ['Idempotency race organization', 'Europe/Berlin'],
      );
      const organizationId = domainId<'Organization'>(organization.rows[0]?.id);
      const employee = await fixture.client.query<{ id: string }>(
        `insert into employees (organization_id, employee_number, display_name) values ($1, $2, $3) returning id`,
        [organizationId, 'WL-IDEMPOTENCY-RACE', 'Idempotency Race Employee'],
      );
      const employeeId = domainId<'Employee'>(employee.rows[0]?.id);
      const account = await fixture.client.query<{ id: string }>(
        `insert into auth_users (name, email) values ($1, $2) returning id`,
        ['Idempotency Race Account', 'idempotency-race@example.test'],
      );
      const accountId = domainId<'Account'>(account.rows[0]?.id);
      const request = Object.freeze({
        actorAccountId: accountId,
        command: 'CLOCK_IN' as const,
        employeeId,
        idempotencyKey: 'attendance-intent-concurrent-01',
        organizationId,
        requestFingerprint: 'd'.repeat(64),
      });
      let releaseFirst: (() => void) | undefined;
      const holdFirst = new Promise<void>((resolve) => {
        releaseFirst = resolve;
      });
      let firstClaimed: (() => void) | undefined;
      const firstHasClaim = new Promise<void>((resolve) => {
        firstClaimed = resolve;
      });
      const terminalError: AttendanceIdempotencyOutcome = Object.freeze({
        kind: 'ERROR',
        error: Object.freeze({
          attendanceRevision: 0,
          code: 'ATTENDANCE_ALREADY_OFF_WORK',
          currentState: 'OFF_WORK',
          validActions: Object.freeze(['CLOCK_IN']),
        }),
      });

      const first = database.transaction(async (transaction) => {
        const claim = await transaction.attendanceIdempotency.claim(request);
        if (claim.kind !== 'CLAIMED') throw new Error('Expected the first request to claim.');
        firstClaimed?.();
        await holdFirst;
        await transaction.attendanceIdempotency.complete({
          command: 'CLOCK_IN',
          completedAt: instant('2026-08-11T09:00:00Z'),
          originalHttpStatus: 409,
          outcome: terminalError,
          recordId: claim.recordId,
          requestFingerprint: request.requestFingerprint,
        });
        return claim.kind;
      });
      await firstHasClaim;
      const second = database.transaction((transaction) =>
        transaction.attendanceIdempotency.claim(request),
      );
      releaseFirst?.();

      await expect(first).resolves.toBe('CLAIMED');
      await expect(second).resolves.toEqual({
        kind: 'REPLAY',
        originalHttpStatus: 409,
        outcome: terminalError,
      });
      const count = await fixture.client.query<{ count: string }>(
        `select count(*) from idempotency_records`,
      );
      expect(count.rows[0]?.count).toBe('1');
    } finally {
      await database.close();
      await fixture.cleanup();
    }
  },
);

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
