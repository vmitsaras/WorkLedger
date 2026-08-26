import { hashPassword } from 'better-auth/crypto';
import { fileURLToPath } from 'node:url';

import type pg from 'pg';

import { createDatabaseHarnessState, createPostgresSchemaFixture } from '@workledger/test-utils';

import { createRuntimeConfig } from '../src/config.js';
import { createApiServer } from '../src/server.js';

const databaseHarness = createDatabaseHarnessState(process.env);
const integrationTest = databaseHarness.enabled ? test : test.skip;
const ORIGIN = 'https://ledger.example.test';
const AUTH_SECRET = 'today-attendance-secret-with-more-than-thirty-two-bytes';
const EMAIL = 'today@example.test';
const PASSWORD = 'safe today attendance passphrase 2026';
const NOW = '2026-02-03T10:30:45Z';
const repositoryDirectory = fileURLToPath(new URL('../../..', import.meta.url));
const migrationFiles = [
  '0000_initial_schema.sql',
  '0001_integrity_constraints.sql',
  '0002_auth_foundation.sql',
  '0003_authorization_foundation.sql',
  '0004_audit_foundation.sql',
  '0005_idempotency_foundation.sql',
  '0006_zero_daily_delta.sql',
  '0007_correction_request_snapshots.sql',
  '0008_nappy_bromley.sql',
  '0009_married_justin_hammer.sql',
  '0010_broad_sunfire.sql',
  '0011_nasty_red_hulk.sql',
  '0012_silly_magik.sql',
  '0013_brave_bulldozer.sql',
  '0014_adorable_piledriver.sql',
  '0022_account_locale.sql',
].map((file) => `${repositoryDirectory}/packages/database/migrations/${file}`);

integrationTest(
  `serves a permission-scoped, provisional Today read model (${databaseHarness.safeLabel})`,
  async () => {
    const fixture = await createPostgresSchemaFixture({
      connectionString: databaseHarness.url,
      label: 'today_attendance',
      migrationFiles,
    });
    const app = createApiServer(
      createRuntimeConfig({
        WORKLEDGER_AUTH_SECRET: AUTH_SECRET,
        WORKLEDGER_DATABASE_URL: fixture.databaseUrl,
        WORKLEDGER_ENVIRONMENT: 'test',
        WORKLEDGER_ORIGIN: ORIGIN,
      }),
      { now: () => NOW },
    );

    try {
      const employee = await createTodayEmployee(fixture.client);
      const cookie = await signIn(app);
      const response = await app.inject({
        method: 'GET',
        url: '/v1/me/attendance/today',
        headers: { cookie, origin: ORIGIN },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['cache-control']).toBe('private, no-store');
      expect(response.json()).toMatchObject({
        data: {
          appliedCorrections: [],
          asOf: '2026-02-03T10:30:00Z',
          attendance: {
            actionAvailability: [
              {
                available: false,
                blockingReason: 'CURRENT_ATTENDANCE_STATE',
                command: 'CLOCK_IN',
              },
              { available: true, blockingReason: null, command: 'START_BREAK' },
              {
                available: false,
                blockingReason: 'CURRENT_ATTENDANCE_STATE',
                command: 'RESUME',
              },
              { available: true, blockingReason: null, command: 'CLOCK_OUT' },
            ],
            activeElapsedMinutes: 15,
            activeSince: '2026-02-03T10:15:00Z',
            attendanceRevision: 3,
            state: 'WORKING',
            validActions: ['START_BREAK', 'CLOCK_OUT'],
          },
          calculation: {
            attentionItems: [],
            estimatedFinishAt: '2026-02-03T15:15:00Z',
            estimatedFinishUnavailableReason: null,
            isPeriodPostedOrLocked: false,
            provisional: {
              calculationSources: {
                approvedCorrectionMinutes: 0,
                breakMinutesToday: 15,
                otherApprovedAdjustmentMinutes: 0,
                workedMinutesToday: 195,
              },
              creditedMinutesToday: 195,
              expectedMinutesToday: 480,
              provisionalDifferenceMinutes: -285,
            },
            holidayName: null,
            remainingExpectedMinutes: 285,
            status: 'PROVISIONAL',
          },
          localDate: '2026-02-03',
          postedFlexBalanceMinutes: 0,
          postedThroughDate: null,
          snapshotCapturedAt: NOW,
          timeZone: 'Europe/Berlin',
          timeline: [
            { occurredAt: '2026-02-03T07:00:00Z', type: 'CLOCK_IN' },
            { occurredAt: '2026-02-03T10:00:00Z', type: 'BREAK_START' },
            { occurredAt: '2026-02-03T10:15:00Z', type: 'BREAK_END' },
          ],
          timelineTruncated: false,
        },
      });
      expect(response.payload).not.toContain('employeeId');
      expect(response.payload).not.toContain('organizationId');

      const correctionRequest = await fixture.client.query<{ id: string }>(
        `insert into correction_requests (
           organization_id, employee_id, requested_by_employee_id, local_date, status, reason,
           original_interpretation, proposed_interpretation, version
         ) values ($1, $2, $2, '2026-02-03', 'APPROVED', 'Private correction reason', $3::jsonb, $4::jsonb, 2)
         returning id`,
        [
          employee.organizationId,
          employee.employeeId,
          JSON.stringify({ calculation: { workedMinutes: 195 } }),
          JSON.stringify({
            endsAt: '2026-02-03T10:30:00Z',
            kind: 'REPLACE_DAILY_WORK_INTERVAL',
            startsAt: '2026-02-03T07:00:00Z',
          }),
        ],
      );
      const correctionRequestId = correctionRequest.rows[0]?.id;
      if (correctionRequestId === undefined) throw new Error('Expected correction request ID.');
      const correctionDecision = await fixture.client.query<{ id: string }>(
        `insert into correction_decisions (
           organization_id, correction_request_id, actor_account_id, actor_employee_id,
           actor_authority, action, reason, decided_at
         ) values ($1, $2, $3, null, 'ORGANIZATION_HR', 'APPROVE', 'Private decision reason', $4)
         returning id`,
        [employee.organizationId, correctionRequestId, employee.accountId, NOW],
      );
      const correctionDecisionId = correctionDecision.rows[0]?.id;
      if (correctionDecisionId === undefined) throw new Error('Expected correction decision ID.');
      await fixture.client.query(
        `insert into applied_corrections (
           organization_id, correction_request_id, correction_decision_id, employee_id,
           local_date, version, interpretation, created_at
         ) values ($1, $2, $3, $4, '2026-02-03', 1, $5::jsonb, '2026-02-03T10:30:30Z')`,
        [
          employee.organizationId,
          correctionRequestId,
          correctionDecisionId,
          employee.employeeId,
          JSON.stringify({
            endsAt: '2026-02-03T10:30:00Z',
            kind: 'REPLACE_DAILY_WORK_INTERVAL',
            startsAt: '2026-02-03T07:00:00Z',
            workedMinutes: 210,
          }),
        ],
      );

      const correctedResponse = await app.inject({
        method: 'GET',
        url: '/v1/me/attendance/today',
        headers: { cookie, origin: ORIGIN },
      });
      expect(correctedResponse.statusCode).toBe(200);
      expect(correctedResponse.json()).toMatchObject({
        data: {
          appliedCorrections: [
            {
              correctedWorkedMinutes: 210,
              originalWorkedMinutes: 195,
            },
          ],
          calculation: {
            attentionItems: [],
            provisional: {
              calculationSources: {
                approvedCorrectionMinutes: 15,
                otherApprovedAdjustmentMinutes: 0,
              },
              creditedMinutesToday: 210,
              provisionalDifferenceMinutes: -270,
            },
            remainingExpectedMinutes: 270,
            status: 'PROVISIONAL',
          },
        },
      });
      expect(correctedResponse.payload).not.toContain('Private correction reason');
      expect(correctedResponse.payload).not.toContain('Private decision reason');
      expect(correctedResponse.payload).not.toContain(correctionRequestId);
      expect(correctedResponse.payload).not.toContain(correctionDecisionId);

      await fixture.client.query(`delete from schedule_assignments where employee_id = $1`, [
        employee.employeeId,
      ]);
      const missingScheduleResponse = await app.inject({
        method: 'GET',
        url: '/v1/me/attendance/today',
        headers: { cookie, origin: ORIGIN },
      });
      expect(missingScheduleResponse.statusCode).toBe(200);
      expect(missingScheduleResponse.json()).toMatchObject({
        data: {
          calculation: {
            attentionItems: [
              {
                blocksSubmission: true,
                code: 'SCHEDULE_NOT_ASSIGNED',
                severity: 'BLOCKER',
                source: 'CURRENT_DAY_CALCULATION',
              },
            ],
            estimatedFinishAt: null,
            estimatedFinishUnavailableReason: 'CALCULATION_UNAVAILABLE',
            provisional: null,
            remainingExpectedMinutes: null,
            status: 'INCOMPLETE',
          },
        },
      });

      await fixture.client.query(`update employees set status = 'INACTIVE' where id = $1`, [
        employee.employeeId,
      ]);
      const deniedResponse = await app.inject({
        method: 'GET',
        url: '/v1/me/attendance/today',
        headers: { cookie, origin: ORIGIN },
      });
      expect(deniedResponse.statusCode).toBe(403);
      expect(deniedResponse.json()).toMatchObject({ error: { code: 'ACCESS_DENIED' } });
      expect(deniedResponse.payload).not.toContain('attendanceRevision');
      expect(deniedResponse.payload).not.toContain(employee.employeeId);
    } finally {
      await app.close();
      await fixture.cleanup();
    }
  },
);

integrationTest(
  `separates posted flexible-time facts from eligible projections (${databaseHarness.safeLabel})`,
  async () => {
    const fixture = await createPostgresSchemaFixture({
      connectionString: databaseHarness.url,
      label: 'my_time',
      migrationFiles,
    });
    const app = createApiServer(
      createRuntimeConfig({
        WORKLEDGER_AUTH_SECRET: AUTH_SECRET,
        WORKLEDGER_DATABASE_URL: fixture.databaseUrl,
        WORKLEDGER_ENVIRONMENT: 'test',
        WORKLEDGER_ORIGIN: ORIGIN,
      }),
      { now: () => NOW },
    );

    try {
      const employee = await createTodayEmployee(fixture.client);
      const postedProjection = await insertProjection(
        fixture.client,
        employee,
        '2026-02-02',
        'COMPLETE',
        30,
      );
      await insertProjection(fixture.client, employee, '2026-02-03', 'COMPLETE', 15);
      await insertProjection(fixture.client, employee, '2026-02-04', 'INCOMPLETE', -480);
      await fixture.client.query(
        `insert into time_account_entries (
           organization_id, employee_id, local_date, entry_type, minutes, source_id,
           source_fingerprint, actor_kind, actor_id, explanation_code, posted_at
         ) values
           ($1, $2, '2026-01-01', 'OPENING_BALANCE', 600, uuidv7(), $3, 'SYSTEM', 'test', 'OPENING_BALANCE', '2026-01-01T08:00:00Z'),
           ($1, $2, '2026-02-02', 'DAILY_DELTA', 30, $4, $3, 'SYSTEM', 'test', 'DAILY_CALCULATION', '2026-02-02T18:00:00Z')`,
        [employee.organizationId, employee.employeeId, 'a'.repeat(64), postedProjection],
      );
      const absenceType = await fixture.client.query<{ id: string }>(
        `insert into absence_types
          (organization_id, code, name, version, active, valid_from, valid_to, policy)
         values ($1, 'VACATION', 'Vacation', 1, true, '2026-01-01', null, '{}'::jsonb)
         returning id`,
        [employee.organizationId],
      );
      await fixture.client.query(
        `insert into leave_entitlement_entries
          (organization_id, employee_id, absence_type_id, entry_type, minutes, source_id, effective_on)
         values
          ($1, $2, $3, 'ALLOCATION', 4800, uuidv7(), '2026-01-01'),
          ($1, $2, $3, 'PENDING_RESERVATION', -720, uuidv7(), '2026-02-05')`,
        [employee.organizationId, employee.employeeId, absenceType.rows[0]?.id],
      );

      const cookie = await signIn(app);
      const response = await app.inject({
        method: 'GET',
        url: '/v1/me/time?date=2026-02-03&view=WEEK&page=1&limit=10',
        headers: { cookie, origin: ORIGIN },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['cache-control']).toBe('private, no-store');
      expect(response.json()).toMatchObject({
        data: {
          balance: {
            eligibleProjectedMinutes: 15,
            excludedIncompleteDates: ['2026-02-04'],
            postedBalanceMinutes: 630,
            projectedBalanceMinutes: 645,
          },
          ledger: { page: 1, total: 2 },
          leave: {
            accounts: [
              {
                availableMinutes: 4800,
                name: 'Vacation',
                projectedRemainingMinutes: 4080,
                reservedMinutes: 720,
              },
            ],
            ledger: { page: 1, total: 2 },
          },
          period: {
            endDate: '2026-02-08',
            monthlyPeriodId: null,
            startDate: '2026-02-02',
            view: 'WEEK',
          },
          summary: { completeBalanceMinutes: 45, incompleteRecordCount: 1, recordedDayCount: 3 },
          timeZone: 'Europe/Berlin',
        },
      });
      expect(response.payload).not.toContain(employee.employeeId);
      expect(response.payload).not.toContain(employee.organizationId);

      await fixture.client.query(
        `insert into time_account_entries (
           organization_id, employee_id, local_date, entry_type, minutes, source_id,
           source_fingerprint, actor_kind, actor_id, explanation_code, posted_at
         ) values
           ($1, $2, '2026-02-02', 'MANUAL_ADMINISTRATIVE_ADJUSTMENT', 500, uuidv7(), $3, 'SYSTEM', 'test', 'FUTURE_POSTING', '2026-02-03T10:31:00Z'),
           ($1, $2, '2026-02-03', 'MANUAL_ADMINISTRATIVE_ADJUSTMENT', 20, uuidv7(), $4, 'SYSTEM', 'test', 'CURRENT_DATE_POSTING', '2026-02-03T10:00:00Z')`,
        [employee.organizationId, employee.employeeId, 'c'.repeat(64), 'd'.repeat(64)],
      );

      const todayResponse = await app.inject({
        method: 'GET',
        url: '/v1/me/attendance/today',
        headers: { cookie, origin: ORIGIN },
      });
      expect(todayResponse.statusCode).toBe(200);
      expect(todayResponse.json()).toMatchObject({
        data: {
          calculation: {
            attentionItems: [
              {
                blocksSubmission: false,
                code: 'FLEX_POSITIVE_THRESHOLD_EXCEEDED',
                recovery: {
                  action: 'REVIEW_BALANCE_HISTORY',
                  destination: 'MY_BALANCES',
                  label: 'View balance history',
                },
                severity: 'WARNING',
                source: 'POSTED_FLEX_BALANCE',
                title: 'Positive flexible-time threshold reached',
              },
            ],
          },
          postedFlexBalanceMinutes: 630,
          postedThroughDate: '2026-02-02',
        },
      });
    } finally {
      await app.close();
      await fixture.cleanup();
    }
  },
);

integrationTest(
  `serves a minimized daily record with reconstructed work and break intervals (${databaseHarness.safeLabel})`,
  async () => {
    const fixture = await createPostgresSchemaFixture({
      connectionString: databaseHarness.url,
      label: 'daily_time_record',
      migrationFiles,
    });
    const app = createApiServer(
      createRuntimeConfig({
        WORKLEDGER_AUTH_SECRET: AUTH_SECRET,
        WORKLEDGER_DATABASE_URL: fixture.databaseUrl,
        WORKLEDGER_ENVIRONMENT: 'test',
        WORKLEDGER_ORIGIN: ORIGIN,
      }),
      { now: () => NOW },
    );

    try {
      const employee = await createTodayEmployee(fixture.client);
      const projectionId = await insertProjection(
        fixture.client,
        employee,
        '2026-02-03',
        'COMPLETE',
        -285,
      );
      await fixture.client.query(
        `update daily_projections
         set break_minutes = 15, warning_codes = '["FLEX_NEGATIVE_THRESHOLD_EXCEEDED"]'::jsonb
         where id = $1`,
        [projectionId],
      );
      await fixture.client.query(
        `update attendance_heads
         set attendance_revision = 4, next_event_sequence = 5, state = 'OFF_WORK',
             updated_at = '2026-02-03T10:30:00Z'
         where employee_id = $1`,
        [employee.employeeId],
      );
      await fixture.client.query(
        `insert into punch_events (
           organization_id, employee_id, event_sequence, event_type, occurred_at,
           actor_employee_id, command_id
         ) values ($1, $2, 4, 'CLOCK_OUT', '2026-02-03T10:30:00Z', $2, uuidv7())`,
        [employee.organizationId, employee.employeeId],
      );
      const cookie = await signIn(app);
      const response = await app.inject({
        method: 'GET',
        url: `/v1/me/time-records/${projectionId}`,
        headers: { cookie, origin: ORIGIN },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['cache-control']).toBe('private, no-store');
      expect(response.json()).toMatchObject({
        data: {
          attention: {
            blockers: [],
            warnings: ['FLEX_NEGATIVE_THRESHOLD_EXCEEDED'],
          },
          calculation: {
            balanceMinutes: -285,
            breakMinutes: 15,
            expectedMinutes: 480,
            workedMinutes: 195,
          },
          events: [
            { sequence: 1, type: 'CLOCK_IN' },
            { sequence: 2, type: 'BREAK_START' },
            { sequence: 3, type: 'BREAK_END' },
            { sequence: 4, type: 'CLOCK_OUT' },
          ],
          localDate: '2026-02-03',
          sessions: [
            {
              breaks: [{ durationMinutes: 15 }],
              continuesFromPreviousDate: false,
              continuesToNextDate: false,
              workIntervals: [{ durationMinutes: 180 }, { durationMinutes: 15 }],
            },
          ],
          status: 'COMPLETE',
          timeZone: 'Europe/Berlin',
        },
      });
      expect(response.payload).not.toContain(employee.employeeId);
      expect(response.payload).not.toContain('sourceFingerprint');

      const otherEmployee = await fixture.client.query<{ id: string }>(
        `insert into employees (organization_id, employee_number, display_name, status)
         values ($1, 'TODAY-002', 'Other Employee', 'ACTIVE')
         returning id`,
        [employee.organizationId],
      );
      const otherEmployeeId = otherEmployee.rows[0]?.id;
      if (otherEmployeeId === undefined) throw new Error('Expected other employee ID.');
      const otherProjectionId = await insertProjection(
        fixture.client,
        { employeeId: otherEmployeeId, organizationId: employee.organizationId },
        '2026-02-03',
        'COMPLETE',
        30,
      );
      const outOfScope = await app.inject({
        method: 'GET',
        url: `/v1/me/time-records/${otherProjectionId}`,
        headers: { cookie, origin: ORIGIN },
      });
      expect(outOfScope.statusCode).toBe(404);
      expect(outOfScope.payload).not.toContain('Other Employee');

      const missing = await app.inject({
        method: 'GET',
        url: '/v1/me/time-records/not-a-projection',
        headers: { cookie, origin: ORIGIN },
      });
      expect(missing.statusCode).toBe(404);
    } finally {
      await app.close();
      await fixture.cleanup();
    }
  },
);

integrationTest(
  `identifies an unfinished attendance entry with a stable blocker (${databaseHarness.safeLabel})`,
  async () => {
    const fixture = await createPostgresSchemaFixture({
      connectionString: databaseHarness.url,
      label: 'daily_time_attention',
      migrationFiles,
    });
    const app = createApiServer(
      createRuntimeConfig({
        WORKLEDGER_AUTH_SECRET: AUTH_SECRET,
        WORKLEDGER_DATABASE_URL: fixture.databaseUrl,
        WORKLEDGER_ENVIRONMENT: 'test',
        WORKLEDGER_ORIGIN: ORIGIN,
      }),
      { now: () => NOW },
    );

    try {
      const employee = await createTodayEmployee(fixture.client);
      const projectionId = await insertProjection(
        fixture.client,
        employee,
        '2026-02-03',
        'INCOMPLETE',
        -285,
      );
      const cookie = await signIn(app);
      const response = await app.inject({
        method: 'GET',
        url: `/v1/me/time-records/${projectionId}`,
        headers: { cookie, origin: ORIGIN },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        data: {
          attention: { blockers: ['ATTENDANCE_INCOMPLETE'], warnings: [] },
          status: 'INCOMPLETE',
        },
      });
      expect(response.payload).not.toContain('sourceFingerprint');
    } finally {
      await app.close();
      await fixture.cleanup();
    }
  },
);

integrationTest(
  `submits a schedule-aware vacation request and reserves entitlement once (${databaseHarness.safeLabel})`,
  async () => {
    const fixture = await createPostgresSchemaFixture({
      connectionString: databaseHarness.url,
      label: 'vacation_request',
      migrationFiles,
    });
    const app = createApiServer(
      createRuntimeConfig({
        WORKLEDGER_AUTH_SECRET: AUTH_SECRET,
        WORKLEDGER_DATABASE_URL: fixture.databaseUrl,
        WORKLEDGER_ENVIRONMENT: 'test',
        WORKLEDGER_ORIGIN: ORIGIN,
      }),
      { now: () => NOW },
    );

    try {
      const employee = await createTodayEmployee(fixture.client);
      const vacationType = await fixture.client.query<{ id: string }>(
        `insert into absence_types
          (organization_id, code, name, version, active, valid_from, valid_to, policy)
         values ($1, 'VACATION', 'Vacation', 1, true, '2026-01-01', null, $2::jsonb)
         returning id`,
        [
          employee.organizationId,
          JSON.stringify({
            allowedCoverageUnits: ['FULL_DAY', 'HALF_DAY', 'MINUTES'],
            availabilityState: 'UNAVAILABLE',
            entitlementAccountCategory: 'VACATION',
            maximumRetrospectiveCalendarDays: null,
            minimumLeadCalendarDays: 0,
            pendingReservationBehavior: 'RESERVE_PENDING',
            requestNoteMode: 'OPTIONAL',
            timeTreatment: 'CREDIT_COVERED_EXPECTATION',
            workflow: 'APPROVAL_REQUIRED',
          }),
        ],
      );
      await fixture.client.query(
        `insert into leave_entitlement_entries
          (organization_id, employee_id, absence_type_id, entry_type, minutes, source_id, effective_on)
         values ($1, $2, $3, 'ALLOCATION', 480, uuidv7(), '2026-01-01')`,
        [employee.organizationId, employee.employeeId, vacationType.rows[0]?.id],
      );
      await fixture.client.query(
        `insert into holidays (organization_id, holiday_date, name) values ($1, '2026-02-10', 'Local holiday')`,
        [employee.organizationId],
      );
      const cookie = await signIn(app);
      const csrf = await app.inject({
        method: 'GET',
        url: '/v1/me/csrf',
        headers: { cookie, origin: ORIGIN },
      });
      const token = csrf.json<{ data: { token: string } }>().data.token;
      const response = await app.inject({
        method: 'POST',
        url: '/v1/me/vacation-requests',
        headers: {
          'content-type': 'application/json',
          cookie,
          origin: ORIGIN,
          'x-workledger-csrf': token,
        },
        payload: { endDate: '2026-02-10', kind: 'FULL_DAY', startDate: '2026-02-06' },
      });

      expect(response.statusCode).toBe(201);
      expect(response.headers['cache-control']).toBe('private, no-store');
      expect(response.json()).toMatchObject({
        data: {
          coverage: [
            { entitlementMinutes: 480, localDate: '2026-02-06' },
            { entitlementMinutes: 0, localDate: '2026-02-07' },
            { entitlementMinutes: 0, localDate: '2026-02-08' },
            { entitlementMinutes: 480, localDate: '2026-02-09' },
            { entitlementMinutes: 0, holiday: true, localDate: '2026-02-10' },
          ],
          entitlementMinutes: 960,
          projectedRemainingMinutes: -480,
          status: 'PENDING_APPROVAL',
        },
      });
      await expect(
        fixture.client.query(
          `select id from absence_requests where organization_id = $1 and employee_id = $2`,
          [employee.organizationId, employee.employeeId],
        ),
      ).resolves.toMatchObject({ rowCount: 1 });
      await expect(
        fixture.client.query(
          `select id from absence_coverage_segments where organization_id = $1`,
          [employee.organizationId],
        ),
      ).resolves.toMatchObject({ rowCount: 5 });
      await expect(
        fixture.client.query<{ entry_type: string; minutes: number }>(
          `select entry_type, minutes from leave_entitlement_entries
           where organization_id = $1 order by created_at`,
          [employee.organizationId],
        ),
      ).resolves.toMatchObject({
        rows: [
          { entry_type: 'ALLOCATION', minutes: 480 },
          { entry_type: 'PENDING_RESERVATION', minutes: -960 },
        ],
      });
      const duplicate = await app.inject({
        method: 'POST',
        url: '/v1/me/vacation-requests',
        headers: {
          'content-type': 'application/json',
          cookie,
          origin: ORIGIN,
          'x-workledger-csrf': token,
        },
        payload: { endDate: '2026-02-10', kind: 'FULL_DAY', startDate: '2026-02-06' },
      });
      expect(duplicate.statusCode).toBe(422);
      expect(duplicate.json()).toMatchObject({ error: { code: 'ABSENCE_OVERLAP' } });

      const firstHalf = await app.inject({
        method: 'POST',
        url: '/v1/me/vacation-requests',
        headers: {
          'content-type': 'application/json',
          cookie,
          origin: ORIGIN,
          'x-workledger-csrf': token,
        },
        payload: { kind: 'FIRST_HALF', localDate: '2026-02-11' },
      });
      const secondHalf = await app.inject({
        method: 'POST',
        url: '/v1/me/vacation-requests',
        headers: {
          'content-type': 'application/json',
          cookie,
          origin: ORIGIN,
          'x-workledger-csrf': token,
        },
        payload: { kind: 'SECOND_HALF', localDate: '2026-02-11' },
      });
      expect(firstHalf.json()).toMatchObject({
        data: { coverage: [{ entitlementMinutes: 240, kind: 'FIRST_HALF' }] },
      });
      expect(secondHalf.json()).toMatchObject({
        data: { coverage: [{ entitlementMinutes: 240, kind: 'SECOND_HALF' }] },
      });
      const minuteMixedWithHalf = await app.inject({
        method: 'POST',
        url: '/v1/me/vacation-requests',
        headers: {
          'content-type': 'application/json',
          cookie,
          origin: ORIGIN,
          'x-workledger-csrf': token,
        },
        payload: {
          endsAtMinute: 660,
          kind: 'MINUTE_INTERVAL',
          localDate: '2026-02-11',
          startsAtMinute: 540,
        },
      });
      expect(minuteMixedWithHalf.statusCode).toBe(422);
      expect(minuteMixedWithHalf.json()).toMatchObject({ error: { code: 'ABSENCE_OVERLAP' } });
    } finally {
      await app.close();
      await fixture.cleanup();
    }
  },
);

integrationTest(
  `reports sickness without medical detail and creates one immediate effect (${databaseHarness.safeLabel})`,
  async () => {
    const fixture = await createPostgresSchemaFixture({
      connectionString: databaseHarness.url,
      label: 'sickness_report',
      migrationFiles,
    });
    const app = createApiServer(
      createRuntimeConfig({
        WORKLEDGER_AUTH_SECRET: AUTH_SECRET,
        WORKLEDGER_DATABASE_URL: fixture.databaseUrl,
        WORKLEDGER_ENVIRONMENT: 'test',
        WORKLEDGER_ORIGIN: ORIGIN,
      }),
      { now: () => NOW },
    );
    try {
      const employee = await createTodayEmployee(fixture.client);
      await fixture.client.query(
        `insert into absence_types (organization_id, code, name, version, active, valid_from, valid_to, policy)
         values ($1, 'SICKNESS', 'Sickness', 1, true, '2026-01-01', null, $2::jsonb)`,
        [
          employee.organizationId,
          JSON.stringify({
            allowedCoverageUnits: ['FULL_DAY', 'HALF_DAY', 'MINUTES'],
            availabilityState: 'UNAVAILABLE',
            entitlementAccountCategory: null,
            maximumRetrospectiveCalendarDays: 7,
            minimumLeadCalendarDays: 0,
            pendingReservationBehavior: 'NONE',
            requestNoteMode: 'DISABLED',
            timeTreatment: 'CREDIT_COVERED_EXPECTATION',
            workflow: 'REPORT_AND_ACKNOWLEDGE',
          }),
        ],
      );
      const cookie = await signIn(app);
      const csrf = await app.inject({
        method: 'GET',
        url: '/v1/me/csrf',
        headers: { cookie, origin: ORIGIN },
      });
      const token = csrf.json<{ data: { token: string } }>().data.token;
      const response = await app.inject({
        method: 'POST',
        url: '/v1/me/sickness-reports',
        headers: {
          'content-type': 'application/json',
          cookie,
          origin: ORIGIN,
          'x-workledger-csrf': token,
        },
        payload: { endDate: '2026-02-03', kind: 'FULL_DAY', startDate: '2026-02-02' },
      });
      expect(response.statusCode).toBe(201);
      expect(response.headers['cache-control']).toBe('private, no-store');
      expect(response.json()).toMatchObject({
        data: {
          coverage: [
            { creditMinutes: 480, localDate: '2026-02-02' },
            { creditMinutes: 480, localDate: '2026-02-03' },
          ],
          status: 'REPORTED',
        },
      });
      expect(response.payload).not.toContain('diagnosis');
      expect(
        (
          await fixture.client.query<{ credit_minutes: number; entitlement_minutes: number }>(
            'select credit_minutes, entitlement_minutes from absence_effects where organization_id = $1 order by local_date',
            [employee.organizationId],
          )
        ).rows,
      ).toEqual([
        { credit_minutes: 480, entitlement_minutes: 0 },
        { credit_minutes: 480, entitlement_minutes: 0 },
      ]);
      const unknownField = await app.inject({
        method: 'POST',
        url: '/v1/me/sickness-reports',
        headers: {
          'content-type': 'application/json',
          cookie,
          origin: ORIGIN,
          'x-workledger-csrf': token,
        },
        payload: {
          diagnosis: 'private',
          endDate: '2026-02-03',
          kind: 'FULL_DAY',
          startDate: '2026-02-03',
        },
      });
      expect(unknownField.statusCode).toBe(422);
      expect(unknownField.payload).not.toContain('private');
      const tooOld = await app.inject({
        method: 'POST',
        url: '/v1/me/sickness-reports',
        headers: {
          'content-type': 'application/json',
          cookie,
          origin: ORIGIN,
          'x-workledger-csrf': token,
        },
        payload: { endDate: '2026-01-25', kind: 'FULL_DAY', startDate: '2026-01-25' },
      });
      expect(tooOld.json()).toMatchObject({ error: { code: 'ABSENCE_RETROACTIVE_LIMIT' } });
    } finally {
      await app.close();
      await fixture.cleanup();
    }
  },
);

integrationTest(
  `returns only the current employee's month of holidays and absence coverage (${databaseHarness.safeLabel})`,
  async () => {
    const fixture = await createPostgresSchemaFixture({
      connectionString: databaseHarness.url,
      label: 'personal_calendar',
      migrationFiles,
    });
    const app = createApiServer(
      createRuntimeConfig({
        WORKLEDGER_AUTH_SECRET: AUTH_SECRET,
        WORKLEDGER_DATABASE_URL: fixture.databaseUrl,
        WORKLEDGER_ENVIRONMENT: 'test',
        WORKLEDGER_ORIGIN: ORIGIN,
      }),
      { now: () => NOW },
    );
    try {
      const employee = await createTodayEmployee(fixture.client);
      const absenceType = await fixture.client.query<{ id: string }>(
        `insert into absence_types
          (organization_id, code, name, version, active, valid_from, valid_to, policy)
         values ($1, 'VACATION', 'Vacation', 1, true, '2026-01-01', null, $2::jsonb)
         returning id`,
        [
          employee.organizationId,
          JSON.stringify({
            allowedCoverageUnits: ['FULL_DAY', 'HALF_DAY', 'MINUTES'],
            availabilityState: 'UNAVAILABLE',
            entitlementAccountCategory: 'VACATION',
            maximumRetrospectiveCalendarDays: null,
            minimumLeadCalendarDays: 0,
            pendingReservationBehavior: 'RESERVE_PENDING',
            requestNoteMode: 'OPTIONAL',
            timeTreatment: 'CREDIT_COVERED_EXPECTATION',
            workflow: 'APPROVAL_REQUIRED',
          }),
        ],
      );
      const request = await fixture.client.query<{ id: string }>(
        `insert into absence_requests
          (organization_id, employee_id, absence_type_id, requested_by_employee_id, status, submitted_at)
         values ($1, $2, $3, $2, 'SUBMITTED', $4)
         returning id`,
        [employee.organizationId, employee.employeeId, absenceType.rows[0]?.id, NOW],
      );
      await fixture.client.query(
        `insert into absence_coverage_segments
          (organization_id, absence_request_id, local_date, kind, starts_at_minute, ends_at_minute)
         values ($1, $2, '2026-02-10', 'FULL_DAY', null, null),
                ($1, $2, '2026-02-12', 'MINUTE_INTERVAL', 540, 660)`,
        [employee.organizationId, request.rows[0]?.id],
      );
      await fixture.client.query(
        `insert into holidays (organization_id, holiday_date, name)
         values ($1, '2026-02-11', 'Regional holiday')`,
        [employee.organizationId],
      );
      const cookie = await signIn(app);
      const response = await app.inject({
        method: 'GET',
        url: '/v1/me/calendar?month=2026-02',
        headers: { cookie, origin: ORIGIN },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['cache-control']).toBe('private, no-store');
      expect(response.json()).toMatchObject({
        data: {
          absences: [
            {
              absenceTypeName: 'Vacation',
              kind: 'FULL_DAY',
              localDate: '2026-02-10',
              status: 'SUBMITTED',
            },
            {
              endsAtMinute: 660,
              kind: 'MINUTE_INTERVAL',
              localDate: '2026-02-12',
              startsAtMinute: 540,
            },
          ],
          holidays: [{ localDate: '2026-02-11', name: 'Regional holiday' }],
          leadingEmptyDays: 6,
          month: '2026-02',
        },
      });
      expect(response.payload).not.toContain('employeeId');
      expect(response.payload).not.toContain('organizationId');
    } finally {
      await app.close();
      await fixture.cleanup();
    }
  },
);

async function createTodayEmployee(
  client: pg.PoolClient,
): Promise<Readonly<{ accountId: string; employeeId: string; organizationId: string }>> {
  const passwordHash = await hashPassword(PASSWORD);
  const organization = await client.query<{ id: string }>(
    `insert into organizations (name, time_zone)
     values ('Today Organization', 'Europe/Berlin')
     returning id`,
  );
  const organizationId = organization.rows[0]?.id;
  if (organizationId === undefined) throw new Error('Expected organization ID.');
  const account = await client.query<{ id: string }>(
    `insert into auth_users (name, email, email_verified, active)
     values ('Today Employee', $1, true, true)
     returning id`,
    [EMAIL],
  );
  const accountId = account.rows[0]?.id;
  if (accountId === undefined) throw new Error('Expected account ID.');
  await client.query(
    `insert into auth_accounts (user_id, account_id, provider_id, password)
     values ($1, $2, 'credential', $3)`,
    [accountId, accountId, passwordHash],
  );
  const employee = await client.query<{ id: string }>(
    `insert into employees (organization_id, employee_number, display_name, status)
     values ($1, 'TODAY-001', 'Today Employee', 'ACTIVE')
     returning id`,
    [organizationId],
  );
  const employeeId = employee.rows[0]?.id;
  if (employeeId === undefined) throw new Error('Expected employee ID.');
  await client.query(
    `insert into employment_periods (organization_id, employee_id, starts_on)
     values ($1, $2, '2025-01-01')`,
    [organizationId, employeeId],
  );
  await client.query(
    `insert into account_employee_links (organization_id, user_id, employee_id)
     values ($1, $2, $3)`,
    [organizationId, accountId, employeeId],
  );
  await client.query(
    `insert into account_role_assignments (organization_id, user_id, role)
     values ($1, $2, 'EMPLOYEE')`,
    [organizationId, accountId],
  );

  const schedule = await client.query<{ id: string }>(
    `insert into weekly_schedules (
       organization_id, name, version, monday_minutes, tuesday_minutes, wednesday_minutes,
       thursday_minutes, friday_minutes, saturday_minutes, sunday_minutes
     ) values ($1, 'Standard', 1, 480, 480, 480, 480, 480, 0, 0)
     returning id`,
    [organizationId],
  );
  const scheduleId = schedule.rows[0]?.id;
  if (scheduleId === undefined) throw new Error('Expected schedule ID.');
  await client.query(
    `insert into schedule_assignments (organization_id, employee_id, schedule_id, starts_on)
     values ($1, $2, $3, '2025-01-01')`,
    [organizationId, employeeId, scheduleId],
  );

  const policy = await client.query<{ id: string }>(
    `insert into time_policies (organization_id, name, version, rules)
     values ($1, 'Standard', 1, '{"flexibleTimeWarningMinutes":30}'::jsonb)
     returning id`,
    [organizationId],
  );
  const policyId = policy.rows[0]?.id;
  if (policyId === undefined) throw new Error('Expected policy ID.');
  await client.query(
    `insert into policy_assignments (organization_id, employee_id, policy_id, starts_on)
     values ($1, $2, $3, '2025-01-01')`,
    [organizationId, employeeId, policyId],
  );

  await client.query(
    `insert into attendance_heads (
       employee_id, organization_id, state, attendance_revision, next_event_sequence, updated_at
     ) values ($1, $2, 'WORKING', 3, 4, $3)`,
    [employeeId, organizationId, '2026-02-03T10:15:00Z'],
  );
  const eventValues = [
    [1, 'CLOCK_IN', '2026-02-03T07:00:00Z'],
    [2, 'BREAK_START', '2026-02-03T10:00:00Z'],
    [3, 'BREAK_END', '2026-02-03T10:15:00Z'],
  ] as const;
  for (const [sequence, type, occurredAt] of eventValues) {
    await client.query(
      `insert into punch_events (
         organization_id, employee_id, event_sequence, event_type, occurred_at,
         actor_employee_id, command_id
       ) values ($1, $2, $3, $4, $5, $2, uuidv7())`,
      [organizationId, employeeId, sequence, type, occurredAt],
    );
  }

  return Object.freeze({ accountId, employeeId, organizationId });
}

async function insertProjection(
  client: pg.PoolClient,
  employee: Readonly<{ employeeId: string; organizationId: string }>,
  localDate: string,
  calculationStatus: 'COMPLETE' | 'INCOMPLETE',
  balanceMinutes: number,
): Promise<string> {
  const creditedMinutes = Math.max(0, 480 + balanceMinutes);
  const projection = await client.query<{ id: string }>(
    `insert into daily_projections (
       organization_id, employee_id, local_date, calculation_status, projection_version,
       engine_version, source_fingerprint, expected_minutes, worked_minutes, break_minutes,
       absence_credit_minutes, adjustment_minutes, credited_minutes, balance_minutes,
       warning_codes, source_references, calculated_at
     ) values ($1, $2, $3, $4, 1, 'test', $5, 480, $6, 0, 0, 0, $6, $7, '[]'::jsonb, '{}'::jsonb, $8)
     returning id`,
    [
      employee.organizationId,
      employee.employeeId,
      localDate,
      calculationStatus,
      'b'.repeat(64),
      creditedMinutes,
      balanceMinutes,
      '2026-02-03T10:30:00Z',
    ],
  );
  const id = projection.rows[0]?.id;
  if (id === undefined) throw new Error('Expected daily projection ID.');
  return id;
}

async function signIn(app: ReturnType<typeof createApiServer>): Promise<string> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/sign-in/email',
    headers: { 'content-type': 'application/json', origin: ORIGIN },
    payload: { email: EMAIL, password: PASSWORD },
  });
  expect(response.statusCode).toBe(200);
  const setCookie = Array.isArray(response.headers['set-cookie'])
    ? response.headers['set-cookie'][0]
    : response.headers['set-cookie'];
  const cookie = setCookie?.split(';', 1)[0];
  if (cookie === undefined) throw new Error('Expected session cookie.');
  return cookie;
}
