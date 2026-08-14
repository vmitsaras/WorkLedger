import { hashPassword } from 'better-auth/crypto';
import { fileURLToPath } from 'node:url';

import type pg from 'pg';

import {
  approvalDecisionEnvelopeSchema,
  approvalDetailEnvelopeSchema,
  approvalInboxEnvelopeSchema,
  dismissedNotificationEnvelopeSchema,
  notificationHistoryEnvelopeSchema,
  type ApprovalInbox,
  type NotificationHistory,
} from '@workledger/contracts';
import { createDatabaseHarnessState, createPostgresSchemaFixture } from '@workledger/test-utils';

import { createRuntimeConfig } from '../src/config.js';
import type {
  NotificationDeliveryAdapter,
  NotificationDeliveryMessage,
} from '../src/notifications/delivery.js';
import { createApiServer } from '../src/server.js';

const databaseHarness = createDatabaseHarnessState(process.env);
const integrationTest = databaseHarness.enabled ? test : test.skip;
const ORIGIN = 'https://ledger.example.test';
const AUTH_SECRET = 'approval-inbox-secret-with-more-than-thirty-two-bytes';
const NOW = '2026-08-13T10:30:45Z';
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
  '0015_rainy_nightshade.sql',
  '0016_flimsy_oracle.sql',
  '0017_boring_aaron_stack.sql',
].map((file) => `${repositoryDirectory}/packages/database/migrations/${file}`);

integrationTest(
  `returns a privacy-minimized inbox after authorization scope and self-exclusion (${databaseHarness.safeLabel})`,
  async () => {
    const fixture = await createPostgresSchemaFixture({
      connectionString: databaseHarness.url,
      label: 'approval_inbox',
      migrationFiles,
    });
    const notificationDelivery = createFailingNotificationDelivery();
    const app = createApiServer(
      createRuntimeConfig({
        WORKLEDGER_AUTH_SECRET: AUTH_SECRET,
        WORKLEDGER_DATABASE_URL: fixture.databaseUrl,
        WORKLEDGER_ENVIRONMENT: 'test',
        WORKLEDGER_ORIGIN: ORIGIN,
      }),
      { notificationDelivery, now: () => NOW },
    );

    try {
      const scenario = await createScenario(fixture.client);
      const unauthenticated = await app.inject({
        method: 'GET',
        url: '/v1/approvals',
        headers: { origin: ORIGIN },
      });
      expect(unauthenticated.statusCode).toBe(401);

      const managerCookie = await signIn(app, scenario.manager.email, scenario.manager.password);
      const alphaCookie = await signIn(app, scenario.alpha.email, scenario.alpha.password);
      const employeeDenied = await getInbox(app, alphaCookie);
      expect(employeeDenied.statusCode).toBe(403);
      expect(employeeDenied.json()).toMatchObject({ error: { code: 'ACCESS_DENIED' } });

      const response = await getInbox(app, managerCookie);
      expect(response.statusCode).toBe(200);
      expect(response.headers['cache-control']).toBe('private, no-store');
      const inbox = approvalInboxEnvelopeSchema.parse(response.json()).data;
      expect(inbox).toMatchObject({
        filterOptions: {
          teams: [
            { id: scenario.alphaTeamId, name: 'Alpha team' },
            { id: scenario.betaTeamId, name: 'Beta team' },
          ],
        },
        pagination: { limit: 20, page: 1, total: 14, totalPages: 1 },
        timeZone: 'Europe/Berlin',
      });
      expect(inbox.items).toHaveLength(14);
      expect(new Set(inbox.items.map((item) => item.kind))).toEqual(
        new Set(['ABSENCE', 'CANCELLATION', 'CORRECTION', 'MONTHLY_PERIOD']),
      );
      expect(inbox.items.every((item) => item.status === 'ACTION_REQUIRED')).toBe(true);
      expect(inbox.items.map((item) => item.employeeDisplayName)).not.toEqual(
        expect.arrayContaining([
          'Former report',
          'HR reviewer',
          'Inbox manager',
          'Unrelated employee',
        ]),
      );
      assertPrivacyMinimized(inbox);

      const currentReportDetail = await getApprovalDetail(
        app,
        managerCookie,
        scenario.alphaCorrectionId,
      );
      expect(currentReportDetail.statusCode).toBe(200);
      expect(approvalDetailEnvelopeSchema.parse(currentReportDetail.json()).data).toMatchObject({
        employeeDisplayName: 'Alpha report',
        id: scenario.alphaCorrectionId,
      });
      for (const deniedId of [scenario.managerCorrectionId, scenario.unrelatedCorrectionId]) {
        const directDenied = await getApprovalDetail(app, managerCookie, deniedId);
        expect(directDenied.statusCode).toBe(403);
        expect(directDenied.json()).toMatchObject({ error: { code: 'ACCESS_DENIED' } });
        expect(directDenied.payload).not.toMatch(/Inbox manager|Unrelated employee/u);
      }
      const crossOrganization = await getApprovalDetail(
        app,
        managerCookie,
        scenario.crossOrganizationCorrectionId,
      );
      expect(crossOrganization.statusCode).toBe(404);
      expect(crossOrganization.json()).toMatchObject({ error: { code: 'ROUTE_NOT_FOUND' } });
      expect(crossOrganization.payload).not.toContain('Cross-organization employee');

      const waiting = await parsedInbox(app, managerCookie, '?status=WAITING_ON_EMPLOYEE');
      expect(waiting.pagination.total).toBe(1);
      expect(waiting.items).toMatchObject([
        { employeeDisplayName: 'Alpha report', kind: 'CORRECTION', status: 'WAITING_ON_EMPLOYEE' },
      ]);

      const absences = await parsedInbox(app, managerCookie, '?type=ABSENCE');
      expect(absences.pagination.total).toBe(1);
      expect(absences.items).toMatchObject([
        {
          affectedEndDate: '2026-08-14',
          affectedStartDate: '2026-08-13',
          employeeDisplayName: 'Alpha report',
          kind: 'ABSENCE',
          status: 'ACTION_REQUIRED',
        },
      ]);
      assertPrivacyMinimized(absences);

      const cancellation = await parsedInbox(app, managerCookie, '?type=CANCELLATION');
      expect(cancellation.pagination.total).toBe(1);
      expect(cancellation.items[0]).toMatchObject({
        affectedEndDate: '2026-08-21',
        affectedStartDate: '2026-08-20',
        employeeDisplayName: 'Alpha report',
        kind: 'CANCELLATION',
      });

      const monthlyPeriods = await parsedInbox(app, managerCookie, '?type=MONTHLY_PERIOD');
      expect(monthlyPeriods.pagination.total).toBe(1);
      expect(monthlyPeriods.items).toMatchObject([
        {
          affectedEndDate: '2026-07-31',
          affectedStartDate: '2026-07-01',
          employeeDisplayName: 'Alpha report',
          id: scenario.alphaMonthlyPeriodId,
          kind: 'MONTHLY_PERIOD',
          status: 'ACTION_REQUIRED',
          team: { id: scenario.alphaTeamId, name: 'Alpha team' },
          version: 2,
        },
      ]);
      assertPrivacyMinimized(monthlyPeriods);

      const betaTeam = await parsedInbox(app, managerCookie, `?team=${scenario.betaTeamId}`);
      expect(betaTeam.pagination.total).toBe(1);
      expect(betaTeam.items).toMatchObject([
        {
          employeeDisplayName: 'Beta report',
          kind: 'CORRECTION',
          team: { id: scenario.betaTeamId, name: 'Beta team' },
        },
      ]);

      const affectedDate = await parsedInbox(app, managerCookie, '?from=2026-08-13&to=2026-08-13');
      expect(affectedDate.pagination.total).toBe(1);
      expect(affectedDate.items[0]).toMatchObject({
        affectedEndDate: '2026-08-14',
        affectedStartDate: '2026-08-13',
        kind: 'ABSENCE',
      });

      const completed = await parsedInbox(app, managerCookie, '?status=COMPLETED');
      expect(completed.pagination.total).toBe(2);
      expect(completed.items.every((item) => item.kind === 'ABSENCE')).toBe(true);
      assertPrivacyMinimized(completed);

      const firstPage = await parsedInbox(
        app,
        managerCookie,
        '?limit=10&page=1&sort=SUBMITTED_AT&direction=DESC',
      );
      const secondPage = await parsedInbox(
        app,
        managerCookie,
        '?limit=10&page=2&sort=SUBMITTED_AT&direction=DESC',
      );
      expect(firstPage.pagination).toEqual({ limit: 10, page: 1, total: 14, totalPages: 2 });
      expect(firstPage.items).toHaveLength(10);
      expect(secondPage.pagination).toEqual({ limit: 10, page: 2, total: 14, totalPages: 2 });
      expect(secondPage.items).toHaveLength(4);
      const firstPageIds = new Set(firstPage.items.map(({ id }) => id));
      expect(secondPage.items.every(({ id }) => !firstPageIds.has(id))).toBe(true);
      expect(
        [...firstPage.items, ...secondPage.items].map((item) => item.employeeDisplayName),
      ).not.toEqual(
        expect.arrayContaining([
          'Former report',
          'HR reviewer',
          'Inbox manager',
          'Unrelated employee',
        ]),
      );

      const hrOnlyCookie = await signIn(app, scenario.hrOnly.email, scenario.hrOnly.password);
      const hrOnly = await parsedInbox(app, hrOnlyCookie);
      expect(hrOnly.pagination.total).toBe(18);
      expect(hrOnly.items.map((item) => item.employeeDisplayName)).toEqual(
        expect.arrayContaining([
          'Former report',
          'HR reviewer',
          'Inbox manager',
          'Unrelated employee',
        ]),
      );
      assertPrivacyMinimized(hrOnly);

      const linkedHrCookie = await signIn(app, scenario.linkedHr.email, scenario.linkedHr.password);
      const linkedHr = await parsedInbox(app, linkedHrCookie);
      expect(linkedHr.pagination.total).toBe(17);
      expect(linkedHr.items.map((item) => item.employeeDisplayName)).not.toContain('HR reviewer');
      assertPrivacyMinimized(linkedHr);
      const combinedRoleSelfDenied = await getApprovalDetail(
        app,
        linkedHrCookie,
        scenario.hrCorrectionId,
      );
      expect(combinedRoleSelfDenied.statusCode).toBe(403);
      expect(combinedRoleSelfDenied.payload).not.toContain('Private HR correction reason');

      const systemCookie = await signIn(app, scenario.system.email, scenario.system.password);
      const denied = await getInbox(app, systemCookie);
      expect(denied.statusCode).toBe(403);
      expect(denied.json()).toMatchObject({ error: { code: 'ACCESS_DENIED' } });
      const systemDetailDenied = await getApprovalDetail(
        app,
        systemCookie,
        scenario.alphaCorrectionId,
      );
      expect(systemDetailDenied.statusCode).toBe(403);
      expect(systemDetailDenied.payload).not.toContain('Private correction reason');
      await fixture.client.query(`update auth_users set active = false where id = $1`, [
        scenario.system.accountId,
      ]);
      const inactiveDenied = await getInbox(app, systemCookie);
      expect(inactiveDenied.statusCode).toBe(401);
      expect(inactiveDenied.json()).toMatchObject({ error: { code: 'AUTH_SESSION_EXPIRED' } });

      for (const query of [
        '?type=SICKNESS',
        '?from=2026-08-01',
        '?page=0',
        '?unsupported=do-not-reflect-this-value',
      ]) {
        const invalid = await getInbox(app, managerCookie, query);
        expect(invalid.statusCode).toBe(422);
        expect(invalid.json()).toMatchObject({ error: { code: 'VALIDATION_FAILED' } });
        expect(invalid.payload).not.toContain('do-not-reflect-this-value');
      }

      const detailResponse = await app.inject({
        method: 'GET',
        url: `/v1/approvals/${scenario.alphaCorrectionId}`,
        headers: { cookie: hrOnlyCookie, origin: ORIGIN },
      });
      expect(detailResponse.statusCode).toBe(200);
      const detail = approvalDetailEnvelopeSchema.parse(detailResponse.json()).data;
      expect(detail).toMatchObject({
        employeeDisplayName: 'Alpha report',
        id: scenario.alphaCorrectionId,
        kind: 'CORRECTION',
        status: 'SUBMITTED',
        version: 1,
      });
      expect(detail.availableActions).toEqual(['APPROVE', 'REQUEST_CHANGES', 'REJECT']);

      const csrf = await app.inject({
        method: 'GET',
        url: '/v1/me/csrf',
        headers: { cookie: hrOnlyCookie, origin: ORIGIN },
      });
      const decisionResponse = await app.inject({
        method: 'POST',
        url: `/v1/approvals/${scenario.alphaCorrectionId}/decision`,
        headers: {
          'content-type': 'application/json',
          cookie: hrOnlyCookie,
          origin: ORIGIN,
          'x-workledger-csrf': csrf.json<{ data: { token: string } }>().data.token,
        },
        payload: {
          action: 'REJECT',
          expectedVersion: 1,
          reason: 'The submitted interval does not match the supporting record.',
        },
      });
      expect(decisionResponse.statusCode).toBe(200);
      expect(approvalDecisionEnvelopeSchema.parse(decisionResponse.json()).data).toMatchObject({
        id: scenario.alphaCorrectionId,
        kind: 'CORRECTION',
        status: 'REJECTED',
        version: 2,
      });
      const storedDecision = await fixture.client.query<{
        actor_account_id: string;
        actor_authority: string;
        actor_employee_id: string | null;
      }>(
        `select actor_account_id, actor_authority, actor_employee_id
         from correction_decisions where correction_request_id = $1`,
        [scenario.alphaCorrectionId],
      );
      expect(storedDecision.rows).toEqual([
        {
          actor_account_id: scenario.hrOnly.accountId,
          actor_authority: 'ORGANIZATION_HR',
          actor_employee_id: null,
        },
      ]);

      expect(notificationDelivery.messages).toHaveLength(2);
      expect(notificationDelivery.messages).toEqual([
        {
          body: 'An item you submitted was not approved.',
          destinationPath: '/requests',
          notificationId: expect.any(String),
          recipientEmail: scenario.alpha.email,
          subject: 'A WorkLedger item was not approved',
        },
        {
          body: 'An item you submitted was not approved.',
          destinationPath: '/requests',
          notificationId: expect.any(String),
          recipientEmail: scenario.alpha.email,
          subject: 'A WorkLedger item was not approved',
        },
      ]);
      expect(notificationDelivery.messages[0]?.notificationId).toBe(
        notificationDelivery.messages[1]?.notificationId,
      );
      expect(JSON.stringify(notificationDelivery.messages)).not.toMatch(
        /correction|sickness|vacation|supporting record/iu,
      );
      const deliveryAttempts = await fixture.client.query<{
        attempt_number: number;
        failure_code: string | null;
        outcome: string;
      }>(
        `select attempt_number, failure_code, outcome
         from notification_delivery_attempts
         order by attempt_number`,
      );
      expect(deliveryAttempts.rows).toEqual([
        {
          attempt_number: 1,
          failure_code: 'DELIVERY_DEPENDENCY_FAILED',
          outcome: 'FAILED',
        },
        {
          attempt_number: 2,
          failure_code: 'DELIVERY_DEPENDENCY_FAILED',
          outcome: 'FAILED',
        },
      ]);

      const initialNotifications = await parsedNotifications(app, alphaCookie);
      expect(initialNotifications.pagination).toEqual({
        limit: 20,
        page: 1,
        total: 1,
        totalPages: 1,
      });
      expect(initialNotifications.items).toEqual([
        {
          body: 'An item you submitted was not approved.',
          deliveryStatus: 'FAILED',
          destinationPath: '/requests',
          dismissedAt: null,
          event: 'ITEM_REJECTED',
          id: notificationDelivery.messages[0]?.notificationId,
          occurredAt: NOW,
          status: 'ACTIVE',
          title: 'Item not approved',
        },
      ]);
      assertNotificationPrivacy(initialNotifications);
      expect((await parsedNotifications(app, managerCookie)).pagination.total).toBe(0);
      const invalidNotificationQuery = await app.inject({
        method: 'GET',
        url: '/v1/me/notifications?absenceType=SICKNESS',
        headers: { cookie: alphaCookie, origin: ORIGIN },
      });
      expect(invalidNotificationQuery.statusCode).toBe(422);
      expect(invalidNotificationQuery.json()).toMatchObject({
        error: { code: 'VALIDATION_FAILED' },
      });
      expect(invalidNotificationQuery.payload).not.toContain('SICKNESS');

      const alphaCsrf = await getCsrfToken(app, alphaCookie);
      const notificationId = requiredId(initialNotifications.items[0]?.id);
      const dismiss = await app.inject({
        method: 'POST',
        url: `/v1/me/notifications/${notificationId}/dismiss`,
        headers: {
          cookie: alphaCookie,
          origin: ORIGIN,
          'x-workledger-csrf': alphaCsrf,
        },
      });
      expect(dismiss.statusCode, dismiss.payload).toBe(200);
      expect(dismissedNotificationEnvelopeSchema.parse(dismiss.json()).data).toEqual({
        dismissedAt: NOW,
        id: notificationId,
        status: 'DISMISSED',
      });
      expect((await parsedNotifications(app, alphaCookie)).items[0]).toMatchObject({
        dismissedAt: NOW,
        id: notificationId,
        status: 'DISMISSED',
      });

      const managerCsrf = await getCsrfToken(app, managerCookie);
      const foreignDismiss = await app.inject({
        method: 'POST',
        url: `/v1/me/notifications/${notificationId}/dismiss`,
        headers: {
          cookie: managerCookie,
          origin: ORIGIN,
          'x-workledger-csrf': managerCsrf,
        },
      });
      expect(foreignDismiss.statusCode).toBe(404);
      expect(foreignDismiss.json()).toMatchObject({ error: { code: 'ROUTE_NOT_FOUND' } });

      const staleDecision = await app.inject({
        method: 'POST',
        url: `/v1/approvals/${scenario.alphaCorrectionId}/decision`,
        headers: {
          'content-type': 'application/json',
          cookie: hrOnlyCookie,
          origin: ORIGIN,
          'x-workledger-csrf': csrf.json<{ data: { token: string } }>().data.token,
        },
        payload: {
          action: 'APPROVE',
          expectedVersion: 1,
          reason: 'A stale browser tab must not overwrite the recorded outcome.',
        },
      });
      expect(staleDecision.statusCode).toBe(409);
      expect(staleDecision.json()).toMatchObject({ error: { code: 'APPROVAL_STATE_CONFLICT' } });
      expect((await parsedNotifications(app, alphaCookie)).pagination.total).toBe(1);
      expect(notificationDelivery.messages).toHaveLength(2);

      const sicknessDetailResponse = await app.inject({
        method: 'GET',
        url: `/v1/approvals/${scenario.sicknessReportId}`,
        headers: { cookie: hrOnlyCookie, origin: ORIGIN },
      });
      expect(sicknessDetailResponse.statusCode).toBe(200);
      expect(approvalDetailEnvelopeSchema.parse(sicknessDetailResponse.json()).data).toMatchObject({
        availableActions: ['ACKNOWLEDGE', 'REQUEST_CHANGES'],
        id: scenario.sicknessReportId,
        kind: 'ABSENCE',
        status: 'REPORTED',
        workflow: 'REPORT_AND_ACKNOWLEDGE',
      });
      const acknowledge = await app.inject({
        method: 'POST',
        url: `/v1/approvals/${scenario.sicknessReportId}/decision`,
        headers: {
          'content-type': 'application/json',
          cookie: hrOnlyCookie,
          origin: ORIGIN,
          'x-workledger-csrf': csrf.json<{ data: { token: string } }>().data.token,
        },
        payload: { action: 'ACKNOWLEDGE', expectedVersion: 1 },
      });
      expect(acknowledge.statusCode).toBe(200);
      expect(approvalDecisionEnvelopeSchema.parse(acknowledge.json()).data).toMatchObject({
        id: scenario.sicknessReportId,
        kind: 'ABSENCE',
        status: 'ACKNOWLEDGED',
        version: 2,
      });
      const afterSickness = await parsedNotifications(app, alphaCookie);
      expect(afterSickness.pagination.total).toBe(2);
      expect(afterSickness.items[0]).toMatchObject({
        body: 'An item you submitted was acknowledged.',
        deliveryStatus: 'FAILED',
        event: 'ITEM_ACKNOWLEDGED',
        title: 'Item acknowledged',
      });
      assertNotificationPrivacy(afterSickness);

      const vacation = await createAbsence(
        fixture.client,
        scenario.organizationId,
        scenario.alphaEmployeeId,
        scenario.vacationTypeId,
        {
          dates: ['2026-08-26'],
          status: 'SUBMITTED',
          submittedAt: '2026-08-14T10:00:00Z',
        },
      );
      await fixture.client.query(
        `insert into leave_entitlement_entries
          (organization_id, employee_id, absence_type_id, entry_type, minutes, source_id,
           effective_on, created_at)
         values ($1, $2, $3, 'ALLOCATION', 960, uuidv7(), '2026-01-01', '2026-01-01T00:00:00Z'),
                ($1, $2, $3, 'PENDING_RESERVATION', -480, $4, '2026-08-26',
                 '2026-08-14T10:00:00Z')`,
        [
          scenario.organizationId,
          scenario.alphaEmployeeId,
          scenario.vacationTypeId,
          vacation.requestId,
        ],
      );
      const approveVacation = await app.inject({
        method: 'POST',
        url: `/v1/approvals/${vacation.requestId}/decision`,
        headers: {
          'content-type': 'application/json',
          cookie: hrOnlyCookie,
          origin: ORIGIN,
          'x-workledger-csrf': csrf.json<{ data: { token: string } }>().data.token,
        },
        payload: {
          action: 'APPROVE',
          expectedVersion: 1,
          reason: 'The requested vacation is covered by the employee entitlement.',
        },
      });
      expect(approveVacation.statusCode).toBe(200);
      expect(approvalDecisionEnvelopeSchema.parse(approveVacation.json()).data).toMatchObject({
        id: vacation.requestId,
        kind: 'ABSENCE',
        status: 'APPROVED',
        version: 2,
      });
      const entitlementTransition = await fixture.client.query<{
        entry_type: string;
        minutes: number;
      }>(
        `select entry_type, minutes from leave_entitlement_entries
         where employee_id = $1 and absence_type_id = $2 order by created_at, entry_type`,
        [scenario.alphaEmployeeId, scenario.vacationTypeId],
      );
      expect(entitlementTransition.rows).toEqual(
        expect.arrayContaining([
          { entry_type: 'PENDING_RESERVATION', minutes: -480 },
          { entry_type: 'RESERVATION_RELEASE', minutes: 480 },
          { entry_type: 'APPROVED_DEDUCTION', minutes: -480 },
        ]),
      );
      expect(entitlementTransition.rows.reduce((total, entry) => total + entry.minutes, 0)).toBe(
        480,
      );
      const effect = await fixture.client.query<{
        credit_minutes: number;
        entitlement_minutes: number;
        expected_reduction_minutes: number;
      }>(
        `select credit_minutes, entitlement_minutes, expected_reduction_minutes
         from absence_effects where absence_request_id = $1`,
        [vacation.requestId],
      );
      expect(effect.rows).toEqual([
        { credit_minutes: 480, entitlement_minutes: 480, expected_reduction_minutes: 0 },
      ]);
      const finalNotifications = await parsedNotifications(app, alphaCookie);
      expect(finalNotifications.pagination.total).toBe(3);
      expect(finalNotifications.items[0]).toMatchObject({
        body: 'An item you submitted was approved.',
        deliveryStatus: 'FAILED',
        event: 'ITEM_APPROVED',
        title: 'Item approved',
      });
      assertNotificationPrivacy(finalNotifications);

      await fixture.client.query(
        `update manager_assignments
         set ends_on = '2026-08-12'
         where organization_id = $1 and manager_employee_id = $2 and ends_on is null`,
        [scenario.organizationId, scenario.managerEmployeeId],
      );
      const formerManagerDenied = await getApprovalDetail(
        app,
        managerCookie,
        scenario.sicknessReportId,
      );
      expect(formerManagerDenied.statusCode).toBe(403);
      expect(formerManagerDenied.payload).not.toContain('Sickness');
    } finally {
      await app.close();
      await fixture.cleanup();
    }
  },
);

type Credentials = Readonly<{ accountId: string; email: string; password: string }>;

async function createScenario(client: pg.PoolClient) {
  const organizationId = requiredId(
    (
      await client.query<{ id: string }>(
        `insert into organizations (name, time_zone)
         values ('Approval inbox organization', 'Europe/Berlin') returning id`,
      )
    ).rows[0]?.id,
  );
  const alphaTeamId = await createTeam(client, organizationId, 'Alpha team');
  const betaTeamId = await createTeam(client, organizationId, 'Beta team');
  const managerEmployeeId = await createEmployee(
    client,
    organizationId,
    'INBOX-MGR',
    'Inbox manager',
  );
  const alphaEmployeeId = await createEmployee(
    client,
    organizationId,
    'INBOX-ALPHA',
    'Alpha report',
  );
  const betaEmployeeId = await createEmployee(client, organizationId, 'INBOX-BETA', 'Beta report');
  const formerEmployeeId = await createEmployee(
    client,
    organizationId,
    'INBOX-FORMER',
    'Former report',
  );
  const unrelatedEmployeeId = await createEmployee(
    client,
    organizationId,
    'INBOX-UNRELATED',
    'Unrelated employee',
  );
  const hrEmployeeId = await createEmployee(client, organizationId, 'INBOX-HR', 'HR reviewer');

  const scheduleId = requiredId(
    (
      await client.query<{ id: string }>(
        `insert into weekly_schedules
          (organization_id, name, version, monday_minutes, tuesday_minutes, wednesday_minutes,
           thursday_minutes, friday_minutes, saturday_minutes, sunday_minutes)
         values ($1, 'Approval test schedule', 1, 480, 480, 480, 480, 480, 0, 0) returning id`,
        [organizationId],
      )
    ).rows[0]?.id,
  );
  await client.query(
    `insert into schedule_assignments
      (organization_id, employee_id, schedule_id, starts_on)
     values ($1, $2, $3, '2025-01-01')`,
    [organizationId, alphaEmployeeId, scheduleId],
  );

  await client.query(
    `insert into manager_assignments
      (organization_id, employee_id, manager_employee_id, starts_on, ends_on)
     values ($1, $2, $3, '2025-01-01', null),
            ($1, $4, $3, '2025-01-01', null),
            ($1, $5, $3, '2025-01-01', '2026-08-01')`,
    [organizationId, alphaEmployeeId, managerEmployeeId, betaEmployeeId, formerEmployeeId],
  );
  await client.query(
    `insert into team_assignments
      (organization_id, employee_id, team_id, starts_on)
     values ($1, $2, $3, '2025-01-01'),
            ($1, $4, $5, '2025-01-01')`,
    [organizationId, alphaEmployeeId, alphaTeamId, betaEmployeeId, betaTeamId],
  );

  const manager = await createAccount(client, organizationId, {
    email: 'approval-manager@example.test',
    employeeId: managerEmployeeId,
    name: 'Inbox manager',
    password: 'safe approval manager passphrase 2026',
    roles: ['MANAGER'],
  });
  const alpha = await createAccount(client, organizationId, {
    email: 'approval-alpha@example.test',
    employeeId: alphaEmployeeId,
    name: 'Alpha report',
    password: 'safe approval alpha passphrase 2026',
    roles: ['EMPLOYEE'],
  });
  const hrOnly = await createAccount(client, organizationId, {
    email: 'approval-hr-only@example.test',
    name: 'HR only reviewer',
    password: 'safe approval hr only passphrase 2026',
    roles: ['HR_ADMINISTRATOR'],
  });
  const linkedHr = await createAccount(client, organizationId, {
    email: 'approval-linked-hr@example.test',
    employeeId: hrEmployeeId,
    name: 'HR reviewer',
    password: 'safe approval linked hr passphrase 2026',
    roles: ['HR_ADMINISTRATOR', 'MANAGER'],
  });
  const system = await createAccount(client, organizationId, {
    email: 'approval-system@example.test',
    name: 'System administrator',
    password: 'safe approval system passphrase 2026',
    roles: ['SYSTEM_ADMINISTRATOR'],
  });
  const alphaMonthlyPeriodId = requiredId(
    (
      await client.query<{ id: string }>(
        `insert into monthly_periods
          (organization_id, employee_id, month_start, status, version, submitted_at,
           submitted_by_account_id, submitted_source_fingerprint)
         values ($1, $2, '2026-07-01', 'SUBMITTED', 2, '2026-08-01T08:00:00Z', $3, $4)
         returning id`,
        [organizationId, alphaEmployeeId, alpha.accountId, 'a'.repeat(64)],
      )
    ).rows[0]?.id,
  );

  let alphaCorrectionId: string | undefined;
  for (let day = 1; day <= 10; day += 1) {
    const localDate = `2026-08-${String(day).padStart(2, '0')}`;
    const correctionId = await createCorrection(client, organizationId, alphaEmployeeId, {
      createdAt: `${localDate}T08:00:00Z`,
      localDate,
      reason: `Private correction reason ${day}`,
      status: 'SUBMITTED',
    });
    alphaCorrectionId ??= correctionId;
  }
  await createCorrection(client, organizationId, betaEmployeeId, {
    createdAt: '2026-08-12T08:00:00Z',
    localDate: '2026-08-12',
    reason: 'Private beta correction reason',
    status: 'SUBMITTED',
  });
  await createCorrection(client, organizationId, alphaEmployeeId, {
    createdAt: '2026-08-09T09:00:00Z',
    localDate: '2026-08-09',
    reason: 'Private waiting correction reason',
    status: 'CHANGES_REQUESTED',
  });

  const sicknessTypeId = await createAbsenceType(client, organizationId, 'SICKNESS', 'Sickness');
  const vacationTypeId = await createAbsenceType(client, organizationId, 'VACATION', 'Vacation');
  const sicknessReport = await createAbsence(
    client,
    organizationId,
    alphaEmployeeId,
    sicknessTypeId,
    {
      dates: ['2026-08-13', '2026-08-14'],
      status: 'REPORTED',
      submittedAt: '2026-08-13T09:00:00Z',
    },
  );
  await createAbsence(client, organizationId, alphaEmployeeId, vacationTypeId, {
    dates: ['2026-08-05'],
    status: 'REJECTED',
    submittedAt: '2026-08-04T09:00:00Z',
  });
  const cancellationSource = await createAbsence(
    client,
    organizationId,
    alphaEmployeeId,
    vacationTypeId,
    {
      dates: ['2026-08-20', '2026-08-21'],
      status: 'APPROVED',
      submittedAt: '2026-08-11T09:00:00Z',
    },
  );
  await createCancellation(
    client,
    organizationId,
    alphaEmployeeId,
    cancellationSource.requestId,
    cancellationSource.segmentIds,
  );

  await createCorrection(client, organizationId, formerEmployeeId, {
    createdAt: '2026-08-14T12:00:00Z',
    localDate: '2026-08-14',
    reason: 'Private former report correction reason',
    status: 'SUBMITTED',
  });
  const unrelatedCorrectionId = await createCorrection(
    client,
    organizationId,
    unrelatedEmployeeId,
    {
      createdAt: '2026-08-14T13:00:00Z',
      localDate: '2026-08-14',
      reason: 'Private unrelated correction reason',
      status: 'SUBMITTED',
    },
  );
  const managerCorrectionId = await createCorrection(client, organizationId, managerEmployeeId, {
    createdAt: '2026-08-14T14:00:00Z',
    localDate: '2026-08-14',
    reason: 'Private manager correction reason',
    status: 'SUBMITTED',
  });
  const hrCorrectionId = await createCorrection(client, organizationId, hrEmployeeId, {
    createdAt: '2026-08-14T15:00:00Z',
    localDate: '2026-08-14',
    reason: 'Private HR correction reason',
    status: 'SUBMITTED',
  });

  const crossOrganizationId = requiredId(
    (
      await client.query<{ id: string }>(
        `insert into organizations (name, time_zone)
         values ('Cross-organization approval test', 'Europe/Berlin') returning id`,
      )
    ).rows[0]?.id,
  );
  const crossOrganizationEmployeeId = await createEmployee(
    client,
    crossOrganizationId,
    'INBOX-CROSS',
    'Cross-organization employee',
  );
  const crossOrganizationCorrectionId = await createCorrection(
    client,
    crossOrganizationId,
    crossOrganizationEmployeeId,
    {
      createdAt: '2026-08-14T16:00:00Z',
      localDate: '2026-08-14',
      reason: 'Private cross-organization correction reason',
      status: 'SUBMITTED',
    },
  );

  return Object.freeze({
    alpha,
    alphaCorrectionId: requiredId(alphaCorrectionId),
    alphaEmployeeId,
    alphaMonthlyPeriodId,
    alphaTeamId,
    betaTeamId,
    crossOrganizationCorrectionId,
    hrCorrectionId,
    hrOnly,
    linkedHr,
    manager,
    managerCorrectionId,
    managerEmployeeId,
    organizationId,
    sicknessReportId: sicknessReport.requestId,
    system,
    unrelatedCorrectionId,
    vacationTypeId,
  });
}

async function createTeam(client: pg.PoolClient, organizationId: string, name: string) {
  return requiredId(
    (
      await client.query<{ id: string }>(
        'insert into teams (organization_id, name) values ($1, $2) returning id',
        [organizationId, name],
      )
    ).rows[0]?.id,
  );
}

async function createEmployee(
  client: pg.PoolClient,
  organizationId: string,
  employeeNumber: string,
  displayName: string,
) {
  const employeeId = requiredId(
    (
      await client.query<{ id: string }>(
        `insert into employees (organization_id, employee_number, display_name, status)
         values ($1, $2, $3, 'ACTIVE') returning id`,
        [organizationId, employeeNumber, displayName],
      )
    ).rows[0]?.id,
  );
  await client.query(
    `insert into employment_periods (organization_id, employee_id, starts_on)
     values ($1, $2, '2025-01-01')`,
    [organizationId, employeeId],
  );
  return employeeId;
}

async function createAccount(
  client: pg.PoolClient,
  organizationId: string,
  input: Readonly<{
    email: string;
    employeeId?: string;
    name: string;
    password: string;
    roles: readonly ('EMPLOYEE' | 'HR_ADMINISTRATOR' | 'MANAGER' | 'SYSTEM_ADMINISTRATOR')[];
  }>,
): Promise<Credentials> {
  const accountId = requiredId(
    (
      await client.query<{ id: string }>(
        `insert into auth_users (name, email, email_verified, active)
         values ($1, $2, true, true) returning id`,
        [input.name, input.email],
      )
    ).rows[0]?.id,
  );
  await client.query(
    `insert into auth_accounts (user_id, account_id, provider_id, password)
     values ($1, $2, 'credential', $3)`,
    [accountId, accountId, await hashPassword(input.password)],
  );
  if (input.employeeId !== undefined) {
    await client.query(
      `insert into account_employee_links (organization_id, user_id, employee_id)
       values ($1, $2, $3)`,
      [organizationId, accountId, input.employeeId],
    );
  }
  for (const role of input.roles) {
    await client.query(
      `insert into account_role_assignments (organization_id, user_id, role)
       values ($1, $2, $3)`,
      [organizationId, accountId, role],
    );
  }
  return Object.freeze({ accountId, email: input.email, password: input.password });
}

async function createCorrection(
  client: pg.PoolClient,
  organizationId: string,
  employeeId: string,
  input: Readonly<{
    createdAt: string;
    localDate: string;
    reason: string;
    status: 'CHANGES_REQUESTED' | 'SUBMITTED';
  }>,
) {
  return requiredId(
    (
      await client.query<{ id: string }>(
        `insert into correction_requests
      (organization_id, employee_id, requested_by_employee_id, local_date, status, reason,
       original_interpretation, proposed_interpretation, version, created_at)
     values ($1, $2, $2, $3, $4, $5, $6::jsonb, $7::jsonb, 1, $8) returning id`,
        [
          organizationId,
          employeeId,
          input.localDate,
          input.status,
          input.reason,
          JSON.stringify({
            calculation: {
              balanceMinutes: 0,
              breakMinutes: 0,
              creditedMinutes: 480,
              expectedMinutes: 480,
              workedMinutes: 480,
            },
            events: [{ occurredAt: input.createdAt, sequence: 1, type: 'CLOCK_IN' }],
            projectionId: '123e4567-e89b-42d3-a456-426614174777',
            private: 'raw-event-must-not-leave-api',
          }),
          JSON.stringify({
            endsAt: input.createdAt,
            private: 'source-record-must-not-leave-api',
            startsAt: input.createdAt,
          }),
          input.createdAt,
        ],
      )
    ).rows[0]?.id,
  );
}

async function createAbsenceType(
  client: pg.PoolClient,
  organizationId: string,
  code: 'SICKNESS' | 'VACATION',
  name: string,
) {
  return requiredId(
    (
      await client.query<{ id: string }>(
        `insert into absence_types
          (organization_id, code, name, version, active, valid_from, policy)
         values ($1, $2, $3, 1, true, '2025-01-01', $4::jsonb) returning id`,
        [organizationId, code, name, JSON.stringify(absencePolicy(code))],
      )
    ).rows[0]?.id,
  );
}

async function createAbsence(
  client: pg.PoolClient,
  organizationId: string,
  employeeId: string,
  absenceTypeId: string,
  input: Readonly<{
    dates: readonly string[];
    status: 'APPROVED' | 'REJECTED' | 'REPORTED' | 'SUBMITTED';
    submittedAt: string;
  }>,
) {
  const requestId = requiredId(
    (
      await client.query<{ id: string }>(
        `insert into absence_requests
          (organization_id, employee_id, absence_type_id, requested_by_employee_id, status,
           version, submitted_at, created_at)
         values ($1, $2, $3, $2, $4, 1, $5, $5) returning id`,
        [organizationId, employeeId, absenceTypeId, input.status, input.submittedAt],
      )
    ).rows[0]?.id,
  );
  const segmentIds: string[] = [];
  for (const localDate of input.dates) {
    segmentIds.push(
      requiredId(
        (
          await client.query<{ id: string }>(
            `insert into absence_coverage_segments
              (organization_id, absence_request_id, local_date, kind)
             values ($1, $2, $3, 'FULL_DAY') returning id`,
            [organizationId, requestId, localDate],
          )
        ).rows[0]?.id,
      ),
    );
  }
  return Object.freeze({ requestId, segmentIds: Object.freeze(segmentIds) });
}

function absencePolicy(code: 'SICKNESS' | 'VACATION') {
  return {
    allowedCoverageUnits: ['FULL_DAY', 'HALF_DAY', 'MINUTES'],
    availabilityState: 'UNAVAILABLE',
    entitlementAccountCategory: code === 'VACATION' ? 'VACATION' : null,
    maximumRetrospectiveCalendarDays: code === 'SICKNESS' ? 7 : null,
    minimumLeadCalendarDays: 0,
    pendingReservationBehavior: code === 'VACATION' ? 'RESERVE_PENDING' : 'NONE',
    requestNoteMode: code === 'VACATION' ? 'OPTIONAL' : 'DISABLED',
    timeTreatment: 'CREDIT_COVERED_EXPECTATION',
    workflow: code === 'VACATION' ? 'APPROVAL_REQUIRED' : 'REPORT_AND_ACKNOWLEDGE',
  };
}

async function createCancellation(
  client: pg.PoolClient,
  organizationId: string,
  employeeId: string,
  absenceRequestId: string,
  segmentIds: readonly string[],
) {
  const cancellationId = requiredId(
    (
      await client.query<{ id: string }>(
        `insert into absence_cancellations
          (organization_id, absence_request_id, employee_id, requested_by_employee_id, status,
           version, submitted_at, created_at)
         values ($1, $2, $3, $3, 'PENDING_DECISION', 1,
                 '2026-08-12T10:00:00Z', '2026-08-12T10:00:00Z') returning id`,
        [organizationId, absenceRequestId, employeeId],
      )
    ).rows[0]?.id,
  );
  for (const segmentId of segmentIds) {
    await client.query(
      `insert into absence_cancellation_segments
        (organization_id, absence_cancellation_id, absence_coverage_segment_id)
       values ($1, $2, $3)`,
      [organizationId, cancellationId, segmentId],
    );
  }
}

async function parsedInbox(
  app: ReturnType<typeof createApiServer>,
  cookie: string,
  query = '',
): Promise<ApprovalInbox> {
  const response = await getInbox(app, cookie, query);
  expect(response.statusCode).toBe(200);
  return approvalInboxEnvelopeSchema.parse(response.json()).data;
}

async function parsedNotifications(
  app: ReturnType<typeof createApiServer>,
  cookie: string,
): Promise<NotificationHistory> {
  const response = await app.inject({
    method: 'GET',
    url: '/v1/me/notifications',
    headers: { cookie, origin: ORIGIN },
  });
  expect(response.statusCode).toBe(200);
  expect(response.headers['cache-control']).toBe('private, no-store');
  return notificationHistoryEnvelopeSchema.parse(response.json()).data;
}

async function getCsrfToken(
  app: ReturnType<typeof createApiServer>,
  cookie: string,
): Promise<string> {
  const response = await app.inject({
    method: 'GET',
    url: '/v1/me/csrf',
    headers: { cookie, origin: ORIGIN },
  });
  expect(response.statusCode).toBe(200);
  return response.json<{ data: { token: string } }>().data.token;
}

async function getInbox(app: ReturnType<typeof createApiServer>, cookie: string, query = '') {
  return app.inject({
    method: 'GET',
    url: `/v1/approvals${query}`,
    headers: { cookie, origin: ORIGIN },
  });
}

async function getApprovalDetail(
  app: ReturnType<typeof createApiServer>,
  cookie: string,
  approvalId: string,
) {
  return app.inject({
    method: 'GET',
    url: `/v1/approvals/${approvalId}`,
    headers: { cookie, origin: ORIGIN },
  });
}

async function signIn(
  app: ReturnType<typeof createApiServer>,
  email: string,
  password: string,
): Promise<string> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/sign-in/email',
    headers: { 'content-type': 'application/json', origin: ORIGIN },
    payload: { email, password },
  });
  expect(response.statusCode).toBe(200);
  const setCookie = Array.isArray(response.headers['set-cookie'])
    ? response.headers['set-cookie'][0]
    : response.headers['set-cookie'];
  const cookie = setCookie?.split(';', 1)[0];
  if (cookie === undefined) throw new Error('Expected session cookie.');
  return cookie;
}

function assertPrivacyMinimized(inbox: ApprovalInbox) {
  const serialized = JSON.stringify(inbox);
  for (const forbiddenValue of [
    'SICKNESS',
    'Sickness',
    'VACATION',
    'Vacation',
    'Private ',
    'raw-event-must-not-leave-api',
    'source-record-must-not-leave-api',
  ]) {
    expect(serialized).not.toContain(forbiddenValue);
  }
  const keys = collectKeys(inbox);
  for (const forbiddenKey of [
    'absenceSubtype',
    'absenceType',
    'absenceTypeCode',
    'absenceTypeId',
    'absenceTypeName',
    'employeeId',
    'entitlement',
    'entitlementMinutes',
    'events',
    'reason',
    'sourceRecord',
    'sourceStatus',
    'statusCode',
  ]) {
    expect(keys).not.toContain(forbiddenKey);
  }
}

function assertNotificationPrivacy(history: NotificationHistory) {
  const serialized = JSON.stringify(history);
  for (const forbiddenValue of [
    'SICKNESS',
    'Sickness',
    'VACATION',
    'Vacation',
    'correction',
    'supporting record',
  ]) {
    expect(serialized).not.toContain(forbiddenValue);
  }
  const keys = collectKeys(history);
  for (const forbiddenKey of [
    'absenceType',
    'employeeId',
    'entitlementMinutes',
    'reason',
    'reviewer',
    'sourceId',
  ]) {
    expect(keys).not.toContain(forbiddenKey);
  }
}

function createFailingNotificationDelivery(): NotificationDeliveryAdapter &
  Readonly<{ messages: NotificationDeliveryMessage[] }> {
  const messages: NotificationDeliveryMessage[] = [];
  return Object.freeze({
    configured: true,
    async deliver(message: NotificationDeliveryMessage) {
      messages.push(message);
      return Object.freeze({
        failureCode: 'DELIVERY_DEPENDENCY_FAILED' as const,
        outcome: 'FAILED' as const,
      });
    },
    messages,
  });
}

function collectKeys(value: unknown, keys: string[] = []): readonly string[] {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, keys);
    return keys;
  }
  if (value === null || typeof value !== 'object') return keys;
  for (const [key, nested] of Object.entries(value)) {
    keys.push(key);
    collectKeys(nested, keys);
  }
  return keys;
}

function requiredId(value: string | undefined): string {
  if (value === undefined) throw new Error('Expected database identifier.');
  return value;
}
