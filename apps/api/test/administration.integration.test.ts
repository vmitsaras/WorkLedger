import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { hashPassword } from 'better-auth/crypto';
import type pg from 'pg';

import { createDatabaseHarnessState, createPostgresSchemaFixture } from '@workledger/test-utils';

import { createRuntimeConfig } from '../src/config.js';
import { createApiServer } from '../src/server.js';
import type { AccountInvitationMessage } from '../src/administration/service.js';

const databaseHarness = createDatabaseHarnessState(process.env);
const integrationTest = databaseHarness.enabled ? test : test.skip;
const ORIGIN = 'https://ledger.example.test';
const AUTH_SECRET = 'administration-integration-secret-with-more-than-thirty-two-bytes';
const ADMIN_PASSWORD = 'safe administration passphrase 2026';
const INVITED_PASSWORD = 'safe invited employee passphrase 2026';
const AT = '2026-08-14T10:00:00.000Z';
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
  '0018_bored_medusa.sql',
].map((file) => `${repositoryDirectory}/packages/database/migrations/${file}`);

integrationTest(
  `keeps employee lifecycle and technical account administration separated while preserving history (${databaseHarness.safeLabel})`,
  async () => {
    const fixture = await createPostgresSchemaFixture({
      connectionString: databaseHarness.url,
      label: 'administration',
      migrationFiles,
    });
    const invitations: AccountInvitationMessage[] = [];
    const app = createApiServer(
      createRuntimeConfig({
        WORKLEDGER_AUTH_SECRET: AUTH_SECRET,
        WORKLEDGER_DATABASE_URL: fixture.databaseUrl,
        WORKLEDGER_ENVIRONMENT: 'test',
        WORKLEDGER_ORIGIN: ORIGIN,
      }),
      {
        invitationSender: async (message) => {
          invitations.push(message);
        },
        now: () => AT,
      },
    );

    try {
      const actors = await createAdministrationActors(fixture.client);
      const hrCookie = await signIn(app, 'hr@example.test', ADMIN_PASSWORD);
      const systemCookie = await signIn(app, 'system@example.test', ADMIN_PASSWORD);
      const hrCsrf = await getCsrf(app, hrCookie);
      const systemCsrf = await getCsrf(app, systemCookie);

      const systemOnHr = await app.inject({
        headers: { cookie: systemCookie, origin: ORIGIN },
        method: 'GET',
        url: '/v1/hr/employees?limit=20&page=1&status=ALL',
      });
      expect(systemOnHr.statusCode).toBe(403);
      const hrOnSystem = await app.inject({
        headers: { cookie: hrCookie, origin: ORIGIN },
        method: 'GET',
        url: '/v1/system/accounts?limit=20&page=1',
      });
      expect(hrOnSystem.statusCode).toBe(403);

      const createEmployee = await app.inject({
        headers: mutationHeaders(hrCookie, hrCsrf),
        method: 'POST',
        payload: {
          displayName: 'Jordan Lee',
          email: 'jordan@example.test',
          employeeNumber: 'WL-900-001',
          employmentStartsOn: '2026-08-01',
          roles: ['EMPLOYEE', 'MANAGER'],
        },
        url: '/v1/hr/employees',
      });
      expect(createEmployee.statusCode, createEmployee.payload).toBe(200);
      expect(createEmployee.headers['cache-control']).toBe('private, no-store');
      const created = createEmployee.json().data as {
        account: { active: boolean; email: string; invitationPending: boolean };
        employmentHistory: Array<{ endsOn: string | null; startsOn: string }>;
        id: string;
        privilegedActionsAllowed: boolean;
        roles: string[];
      };
      expect(created).toMatchObject({
        account: { active: false, email: 'jordan@example.test', invitationPending: true },
        employmentHistory: [{ endsOn: null, startsOn: '2026-08-01' }],
        privilegedActionsAllowed: true,
        roles: ['EMPLOYEE', 'MANAGER'],
      });
      expect(createEmployee.payload).not.toMatch(/token|activationUrl/iu);
      expect(invitations).toHaveLength(1);
      const activationToken = invitations[0]?.activationUrl.searchParams.get('token');
      expect(activationToken).toMatch(/^[A-Za-z0-9_-]{43}$/u);
      const verification = await fixture.client.query<{ identifier: string }>(
        `select identifier from auth_verifications`,
      );
      expect(verification.rows).toHaveLength(1);
      expect(verification.rows[0]?.identifier).not.toContain(activationToken);
      const invitedAccount = await fixture.client.query<{ id: string }>(
        `select id from auth_users where email = 'jordan@example.test'`,
      );
      const invitedAccountId = invitedAccount.rows[0]?.id;
      if (invitedAccountId === undefined) throw new Error('Expected invited account ID.');
      const systemCannotBypassInvitation = await app.inject({
        headers: mutationHeaders(systemCookie, systemCsrf),
        method: 'POST',
        payload: { active: true },
        url: `/v1/system/accounts/${invitedAccountId}/state`,
      });
      expect(systemCannotBypassInvitation.statusCode).toBe(409);

      const activateInvitation = await app.inject({
        headers: { 'content-type': 'application/json', origin: ORIGIN },
        method: 'POST',
        payload: { password: INVITED_PASSWORD, token: activationToken },
        url: '/v1/account-invitations/activate',
      });
      expect(activateInvitation.statusCode).toBe(200);
      expect(activateInvitation.json()).toMatchObject({ data: { activated: true } });
      const replayInvitation = await app.inject({
        headers: { 'content-type': 'application/json', origin: ORIGIN },
        method: 'POST',
        payload: { password: INVITED_PASSWORD, token: activationToken },
        url: '/v1/account-invitations/activate',
      });
      expect(replayInvitation.statusCode).toBe(401);
      expect(replayInvitation.json()).toMatchObject({
        error: { code: 'AUTH_INVITATION_INVALID_OR_EXPIRED' },
      });

      const employeeCookie = await signIn(app, 'jordan@example.test', INVITED_PASSWORD);
      const employeeContext = await app.inject({
        headers: { cookie: employeeCookie, origin: ORIGIN },
        method: 'GET',
        url: '/v1/me/context',
      });
      expect(employeeContext.statusCode).toBe(200);
      expect(employeeContext.json()).toMatchObject({
        data: {
          employee: { employeeNumber: 'WL-900-001' },
          navigationAreas: ['EMPLOYEE', 'MANAGER'],
        },
      });
      const activeInvitationReissue = await app.inject({
        headers: mutationHeaders(hrCookie, hrCsrf),
        method: 'POST',
        payload: {},
        url: `/v1/hr/employees/${created.id}/invitation`,
      });
      expect(activeInvitationReissue.statusCode, activeInvitationReissue.payload).toBe(409);

      const selfDetail = await app.inject({
        headers: { cookie: hrCookie, origin: ORIGIN },
        method: 'GET',
        url: `/v1/hr/employees/${actors.hrEmployeeId}`,
      });
      expect(selfDetail.statusCode).toBe(200);
      expect(selfDetail.json()).toMatchObject({ data: { privilegedActionsAllowed: false } });
      const selfRoleChange = await app.inject({
        headers: mutationHeaders(hrCookie, hrCsrf),
        method: 'POST',
        payload: { roles: ['EMPLOYEE', 'HR_ADMINISTRATOR'] },
        url: `/v1/hr/employees/${actors.hrEmployeeId}/roles`,
      });
      expect(selfRoleChange.statusCode).toBe(403);

      const deactivate = await app.inject({
        headers: mutationHeaders(hrCookie, hrCsrf),
        method: 'POST',
        payload: { employmentEndsOn: '2026-08-15' },
        url: `/v1/hr/employees/${created.id}/deactivate`,
      });
      expect(deactivate.statusCode).toBe(200);
      const revokedContext = await app.inject({
        headers: { cookie: employeeCookie, origin: ORIGIN },
        method: 'GET',
        url: '/v1/me/context',
      });
      expect(revokedContext.statusCode).toBe(401);

      const reactivate = await app.inject({
        headers: mutationHeaders(hrCookie, hrCsrf),
        method: 'POST',
        payload: { employmentStartsOn: '2026-08-16' },
        url: `/v1/hr/employees/${created.id}/activate`,
      });
      expect(reactivate.statusCode).toBe(200);
      const history = await app.inject({
        headers: { cookie: hrCookie, origin: ORIGIN },
        method: 'GET',
        url: `/v1/hr/employees/${created.id}`,
      });
      expect(history.json().data.employmentHistory).toEqual([
        expect.objectContaining({ endsOn: null, startsOn: '2026-08-16' }),
        expect.objectContaining({ endsOn: '2026-08-15', startsOn: '2026-08-01' }),
      ]);

      const systemList = await app.inject({
        headers: { cookie: systemCookie, origin: ORIGIN },
        method: 'GET',
        url: '/v1/system/accounts?limit=20&page=1',
      });
      expect(systemList.statusCode).toBe(200);
      expect(systemList.payload).not.toMatch(
        /employeeNumber|employmentHistory|teamName|absence|sickness|userAgent|ipAddress/iu,
      );
      const accounts = systemList.json().data.items as Array<{
        email: string;
        id: string;
        privilegedActionsAllowed: boolean;
      }>;
      expect(accounts.find(({ email }) => email === 'system@example.test')).toMatchObject({
        privilegedActionsAllowed: false,
      });
      const employeeAccount = accounts.find(({ email }) => email === 'jordan@example.test');
      if (employeeAccount === undefined) throw new Error('Expected employee-linked account.');

      const selfSystemRole = await app.inject({
        headers: mutationHeaders(systemCookie, systemCsrf),
        method: 'POST',
        payload: { enabled: false },
        url: `/v1/system/accounts/${actors.systemAccountId}/system-role`,
      });
      expect(selfSystemRole.statusCode).toBe(403);

      const technicalDeactivate = await app.inject({
        headers: mutationHeaders(systemCookie, systemCsrf),
        method: 'POST',
        payload: { active: false },
        url: `/v1/system/accounts/${employeeAccount.id}/state`,
      });
      expect(technicalDeactivate.statusCode).toBe(200);
      const technicalReactivate = await app.inject({
        headers: mutationHeaders(systemCookie, systemCsrf),
        method: 'POST',
        payload: { active: true },
        url: `/v1/system/accounts/${employeeAccount.id}/state`,
      });
      expect(technicalReactivate.statusCode).toBe(200);
      const preservedEmployee = await fixture.client.query<{ status: string }>(
        `select status from employees where id = $1`,
        [created.id],
      );
      expect(preservedEmployee.rows[0]?.status).toBe('ACTIVE');

      const hrDeactivateAgain = await app.inject({
        headers: mutationHeaders(hrCookie, hrCsrf),
        method: 'POST',
        payload: { employmentEndsOn: '2026-08-17' },
        url: `/v1/hr/employees/${created.id}/deactivate`,
      });
      expect(hrDeactivateAgain.statusCode).toBe(200);
      const systemCannotOverrideEmployment = await app.inject({
        headers: mutationHeaders(systemCookie, systemCsrf),
        method: 'POST',
        payload: { active: true },
        url: `/v1/system/accounts/${employeeAccount.id}/state`,
      });
      expect(systemCannotOverrideEmployment.statusCode).toBe(409);
      expect(systemCannotOverrideEmployment.json()).toMatchObject({
        error: { code: 'ACCOUNT_STATE_CONFLICT' },
      });

      const createTechnical = await app.inject({
        headers: mutationHeaders(systemCookie, systemCsrf),
        method: 'POST',
        payload: {
          email: 'operator@example.test',
          name: 'Backup Operator',
          systemAdministrator: true,
        },
        url: '/v1/system/accounts',
      });
      expect(createTechnical.statusCode).toBe(200);
      expect(invitations).toHaveLength(2);

      const historyCounts = await fixture.client.query<{
        domain_count: string;
        period_count: string;
        security_count: string;
      }>(
        `select
           (select count(*) from employment_periods where employee_id = $1)::text as period_count,
           (select count(*) from domain_audit_events where subject_employee_id = $1)::text as domain_count,
           (select count(*) from security_audit_events where target_account_id is not null)::text as security_count`,
        [created.id],
      );
      expect(historyCounts.rows[0]).toMatchObject({ period_count: '2' });
      expect(Number(historyCounts.rows[0]?.domain_count)).toBeGreaterThanOrEqual(3);
      expect(Number(historyCounts.rows[0]?.security_count)).toBeGreaterThanOrEqual(5);
    } finally {
      await app.close();
      await fixture.cleanup();
    }
  },
);

integrationTest(
  `changes team and direct-manager scope immediately without rewriting assignment history (${databaseHarness.safeLabel})`,
  async () => {
    const fixture = await createPostgresSchemaFixture({
      connectionString: databaseHarness.url,
      label: 'team_administration',
      migrationFiles,
    });
    const app = createApiServer(
      createRuntimeConfig({
        WORKLEDGER_AUTH_SECRET: AUTH_SECRET,
        WORKLEDGER_DATABASE_URL: fixture.databaseUrl,
        WORKLEDGER_ENVIRONMENT: 'test',
        WORKLEDGER_ORIGIN: ORIGIN,
      }),
      { now: () => AT },
    );

    try {
      const actors = await createAdministrationActors(fixture.client);
      const passwordHash = await hashPassword(ADMIN_PASSWORD);
      const alice = await createManagedEmployee(
        fixture.client,
        actors.organizationId,
        passwordHash,
        'Alice Manager',
        'alice-manager@example.test',
        'MGR-101',
        true,
      );
      const bob = await createManagedEmployee(
        fixture.client,
        actors.organizationId,
        passwordHash,
        'Bob Employee',
        'bob-employee@example.test',
        'EMP-201',
        true,
      );
      const charlie = await createManagedEmployee(
        fixture.client,
        actors.organizationId,
        passwordHash,
        'Charlie Manager',
        'charlie-manager@example.test',
        'MGR-102',
        true,
      );
      const originalTeam = await fixture.client.query<{ id: string }>(
        `insert into teams (organization_id, name) values ($1, 'Client Services') returning id`,
        [actors.organizationId],
      );
      const originalTeamId = originalTeam.rows[0]?.id;
      if (originalTeamId === undefined) throw new Error('Expected original team ID.');
      await fixture.client.query(
        `insert into team_assignments (organization_id, employee_id, team_id, starts_on)
         values ($1, $2, $3, '2026-01-01')`,
        [actors.organizationId, bob.employeeId, originalTeamId],
      );
      await fixture.client.query(
        `insert into manager_assignments
           (organization_id, employee_id, manager_employee_id, starts_on)
         values ($1, $2, $3, '2026-01-01'), ($1, $4, $3, '2026-01-01')`,
        [actors.organizationId, bob.employeeId, alice.employeeId, charlie.employeeId],
      );

      const hrCookie = await signIn(app, 'hr@example.test', ADMIN_PASSWORD);
      const aliceCookie = await signIn(app, 'alice-manager@example.test', ADMIN_PASSWORD);
      const charlieCookie = await signIn(app, 'charlie-manager@example.test', ADMIN_PASSWORD);
      const hrCsrf = await getCsrf(app, hrCookie);

      const aliceBefore = await app.inject({
        headers: { cookie: aliceCookie, origin: ORIGIN },
        method: 'GET',
        url: '/v1/team/status',
      });
      expect(aliceBefore.statusCode).toBe(200);
      expect(aliceBefore.payload).toContain('Bob Employee');
      const charlieBefore = await app.inject({
        headers: { cookie: charlieCookie, origin: ORIGIN },
        method: 'GET',
        url: '/v1/team/status',
      });
      expect(charlieBefore.statusCode).toBe(200);
      expect(charlieBefore.payload).not.toContain('Bob Employee');

      const createTeam = await app.inject({
        headers: mutationHeaders(hrCookie, hrCsrf),
        method: 'POST',
        payload: { name: 'Operations' },
        url: '/v1/hr/teams',
      });
      expect(createTeam.statusCode, createTeam.payload).toBe(200);
      const operationsTeamId = String(createTeam.json().data.targetId);
      const duplicateTeam = await app.inject({
        headers: mutationHeaders(hrCookie, hrCsrf),
        method: 'POST',
        payload: { name: 'Operations' },
        url: '/v1/hr/teams',
      });
      expect(duplicateTeam.statusCode).toBe(409);
      expect(duplicateTeam.json()).toMatchObject({ error: { code: 'TEAM_NAME_ALREADY_EXISTS' } });

      const assignmentDetailBefore = await app.inject({
        headers: { cookie: hrCookie, origin: ORIGIN },
        method: 'GET',
        url: `/v1/hr/employees/${bob.employeeId}/assignments`,
      });
      expect(assignmentDetailBefore.statusCode).toBe(200);
      expect(assignmentDetailBefore.json()).toMatchObject({
        data: {
          asOfLocalDate: '2026-08-14',
          currentManager: { manager: { displayName: 'Alice Manager' } },
          currentTeam: { team: { name: 'Client Services' } },
          privilegedActionsAllowed: true,
        },
      });

      const changeTeam = await app.inject({
        headers: mutationHeaders(hrCookie, hrCsrf),
        method: 'POST',
        payload: { effectiveFrom: '2026-08-14', teamId: operationsTeamId },
        url: `/v1/hr/employees/${bob.employeeId}/team-assignment`,
      });
      expect(changeTeam.statusCode, changeTeam.payload).toBe(200);
      const changeManager = await app.inject({
        headers: mutationHeaders(hrCookie, hrCsrf),
        method: 'POST',
        payload: { effectiveFrom: '2026-08-14', managerEmployeeId: charlie.employeeId },
        url: `/v1/hr/employees/${bob.employeeId}/manager-assignment`,
      });
      expect(changeManager.statusCode, changeManager.payload).toBe(200);

      const aliceAfter = await app.inject({
        headers: { cookie: aliceCookie, origin: ORIGIN },
        method: 'GET',
        url: '/v1/team/status',
      });
      expect(aliceAfter.statusCode).toBe(200);
      expect(aliceAfter.payload).not.toContain('Bob Employee');
      const charlieAfter = await app.inject({
        headers: { cookie: charlieCookie, origin: ORIGIN },
        method: 'GET',
        url: '/v1/team/status',
      });
      expect(charlieAfter.statusCode).toBe(200);
      expect(charlieAfter.payload).toContain('Bob Employee');
      expect(charlieAfter.payload).toContain('Operations');

      const history = await app.inject({
        headers: { cookie: hrCookie, origin: ORIGIN },
        method: 'GET',
        url: `/v1/hr/employees/${bob.employeeId}/assignments`,
      });
      expect(history.json().data.teamHistory).toEqual([
        expect.objectContaining({ endsOn: null, startsOn: '2026-08-14' }),
        expect.objectContaining({ endsOn: '2026-08-14', startsOn: '2026-01-01' }),
      ]);
      expect(history.json().data.managerHistory).toEqual([
        expect.objectContaining({
          endsOn: null,
          manager: expect.objectContaining({ displayName: 'Charlie Manager' }),
          startsOn: '2026-08-14',
        }),
        expect.objectContaining({
          endsOn: '2026-08-14',
          manager: expect.objectContaining({ displayName: 'Alice Manager' }),
          startsOn: '2026-01-01',
        }),
      ]);

      const cycle = await app.inject({
        headers: mutationHeaders(hrCookie, hrCsrf),
        method: 'POST',
        payload: { effectiveFrom: '2026-08-14', managerEmployeeId: bob.employeeId },
        url: `/v1/hr/employees/${alice.employeeId}/manager-assignment`,
      });
      expect(cycle.statusCode, cycle.payload).toBe(409);
      expect(cycle.json()).toMatchObject({ error: { code: 'MANAGER_ASSIGNMENT_CYCLE' } });

      const assignedTeamCannotDeactivate = await app.inject({
        headers: mutationHeaders(hrCookie, hrCsrf),
        method: 'POST',
        payload: { active: false },
        url: `/v1/hr/teams/${operationsTeamId}/state`,
      });
      expect(assignedTeamCannotDeactivate.statusCode).toBe(409);
      const selfAssignment = await app.inject({
        headers: mutationHeaders(hrCookie, hrCsrf),
        method: 'POST',
        payload: { effectiveFrom: '2026-08-14', teamId: operationsTeamId },
        url: `/v1/hr/employees/${actors.hrEmployeeId}/team-assignment`,
      });
      expect(selfAssignment.statusCode).toBe(403);

      const persisted = await fixture.client.query<{
        assignment_count: string;
        audit_count: string;
      }>(
        `select
           (select count(*) from manager_assignments where employee_id = $1)::text as assignment_count,
           (select count(*) from domain_audit_events
              where subject_employee_id = $1 and action_code in ('TEAM_ASSIGNMENT_CHANGED', 'MANAGER_ASSIGNMENT_CHANGED'))::text as audit_count`,
        [bob.employeeId],
      );
      expect(persisted.rows[0]).toEqual({ assignment_count: '2', audit_count: '2' });
    } finally {
      await app.close();
      await fixture.cleanup();
    }
  },
);

integrationTest(
  `versions effective time and absence configuration and appends reasoned entitlement adjustments (${databaseHarness.safeLabel})`,
  async () => {
    const fixture = await createPostgresSchemaFixture({
      connectionString: databaseHarness.url,
      label: 'schedule_administration',
      migrationFiles,
    });
    const app = createApiServer(
      createRuntimeConfig({
        WORKLEDGER_AUTH_SECRET: AUTH_SECRET,
        WORKLEDGER_DATABASE_URL: fixture.databaseUrl,
        WORKLEDGER_ENVIRONMENT: 'test',
        WORKLEDGER_ORIGIN: ORIGIN,
      }),
      { now: () => AT },
    );

    try {
      const actors = await createAdministrationActors(fixture.client);
      const passwordHash = await hashPassword(ADMIN_PASSWORD);
      const employee = await createManagedEmployee(
        fixture.client,
        actors.organizationId,
        passwordHash,
        'Schedule Employee',
        'schedule-employee@example.test',
        'EMP-902',
        false,
      );
      const hrCookie = await signIn(app, 'hr@example.test', ADMIN_PASSWORD);
      const hrCsrf = await getCsrf(app, hrCookie);
      const standardMinutes = {
        FRIDAY: 480,
        MONDAY: 480,
        SATURDAY: 0,
        SUNDAY: 0,
        THURSDAY: 480,
        TUESDAY: 480,
        WEDNESDAY: 480,
      };

      const emptySettings = await app.inject({
        headers: { cookie: hrCookie, origin: ORIGIN },
        method: 'GET',
        url: '/v1/hr/time-settings',
      });
      expect(emptySettings.statusCode).toBe(200);
      expect(emptySettings.json()).toMatchObject({ data: { scheduleVersions: [] } });

      const createVersionOne = await app.inject({
        headers: mutationHeaders(hrCookie, hrCsrf),
        method: 'POST',
        payload: { name: 'Standard week', scheduledMinutes: standardMinutes },
        url: '/v1/hr/time-settings/schedule-versions',
      });
      expect(createVersionOne.statusCode, createVersionOne.payload).toBe(200);
      const versionOneId = String(createVersionOne.json().data.targetId);

      const noChange = await app.inject({
        headers: mutationHeaders(hrCookie, hrCsrf),
        method: 'POST',
        payload: { name: 'Standard week', scheduledMinutes: standardMinutes },
        url: '/v1/hr/time-settings/schedule-versions',
      });
      expect(noChange.statusCode).toBe(409);
      expect(noChange.json()).toMatchObject({ error: { code: 'SCHEDULE_VERSION_NO_CHANGE' } });

      const createVersionTwo = await app.inject({
        headers: mutationHeaders(hrCookie, hrCsrf),
        method: 'POST',
        payload: {
          name: 'Standard week',
          scheduledMinutes: { ...standardMinutes, FRIDAY: 360 },
        },
        url: '/v1/hr/time-settings/schedule-versions',
      });
      expect(createVersionTwo.statusCode, createVersionTwo.payload).toBe(200);
      const versionTwoId = String(createVersionTwo.json().data.targetId);

      const settings = await app.inject({
        headers: { cookie: hrCookie, origin: ORIGIN },
        method: 'GET',
        url: '/v1/hr/time-settings',
      });
      expect(settings.statusCode).toBe(200);
      expect(settings.json().data.scheduleVersions).toEqual([
        expect.objectContaining({ id: versionTwoId, latestVersion: true, version: 2 }),
        expect.objectContaining({ id: versionOneId, latestVersion: false, version: 1 }),
      ]);

      const uncovered = await app.inject({
        headers: { cookie: hrCookie, origin: ORIGIN },
        method: 'GET',
        url: `/v1/hr/employees/${employee.employeeId}/schedule`,
      });
      expect(uncovered.statusCode).toBe(200);
      expect(uncovered.json()).toMatchObject({
        data: {
          coverageGaps: [{ endsOn: null, startsOn: '2026-08-14' }],
          currentAssignment: null,
          privilegedActionsAllowed: true,
        },
      });

      const futureInitialAssignment = await app.inject({
        headers: mutationHeaders(hrCookie, hrCsrf),
        method: 'POST',
        payload: { effectiveFrom: '2026-08-15', scheduleId: versionOneId },
        url: `/v1/hr/employees/${employee.employeeId}/schedule-assignment`,
      });
      expect(futureInitialAssignment.statusCode).toBe(409);
      expect(futureInitialAssignment.json()).toMatchObject({
        error: { code: 'SCHEDULE_NOT_ASSIGNED' },
      });

      const initialAssignment = await app.inject({
        headers: mutationHeaders(hrCookie, hrCsrf),
        method: 'POST',
        payload: { effectiveFrom: '2026-08-14', scheduleId: versionOneId },
        url: `/v1/hr/employees/${employee.employeeId}/schedule-assignment`,
      });
      expect(initialAssignment.statusCode, initialAssignment.payload).toBe(200);

      const futureVersionChange = await app.inject({
        headers: mutationHeaders(hrCookie, hrCsrf),
        method: 'POST',
        payload: { effectiveFrom: '2026-09-01', scheduleId: versionTwoId },
        url: `/v1/hr/employees/${employee.employeeId}/schedule-assignment`,
      });
      expect(futureVersionChange.statusCode, futureVersionChange.payload).toBe(200);

      const selfAssignment = await app.inject({
        headers: mutationHeaders(hrCookie, hrCsrf),
        method: 'POST',
        payload: { effectiveFrom: '2026-08-14', scheduleId: versionOneId },
        url: `/v1/hr/employees/${actors.hrEmployeeId}/schedule-assignment`,
      });
      expect(selfAssignment.statusCode).toBe(403);

      const otherOrganization = await fixture.client.query<{ id: string }>(
        `insert into organizations (name, time_zone)
         values ('Other Schedule Organization', 'Europe/Berlin') returning id`,
      );
      const otherOrganizationId = otherOrganization.rows[0]?.id;
      if (otherOrganizationId === undefined) throw new Error('Expected other organization ID.');
      const otherSchedule = await fixture.client.query<{ id: string }>(
        `insert into weekly_schedules
           (organization_id, name, version, monday_minutes, tuesday_minutes, wednesday_minutes,
            thursday_minutes, friday_minutes, saturday_minutes, sunday_minutes)
         values ($1, 'Other schedule', 1, 480, 480, 480, 480, 480, 0, 0) returning id`,
        [otherOrganizationId],
      );
      const crossOrganizationAssignment = await app.inject({
        headers: mutationHeaders(hrCookie, hrCsrf),
        method: 'POST',
        payload: {
          effectiveFrom: '2026-10-01',
          scheduleId: otherSchedule.rows[0]?.id,
        },
        url: `/v1/hr/employees/${employee.employeeId}/schedule-assignment`,
      });
      expect(crossOrganizationAssignment.statusCode).toBe(409);
      expect(crossOrganizationAssignment.json()).toMatchObject({
        error: { code: 'SCHEDULE_VERSION_CONFLICT' },
      });

      const preservedHistory = await app.inject({
        headers: { cookie: hrCookie, origin: ORIGIN },
        method: 'GET',
        url: `/v1/hr/employees/${employee.employeeId}/schedule`,
      });
      expect(preservedHistory.statusCode).toBe(200);
      expect(preservedHistory.json().data.history).toEqual([
        expect.objectContaining({
          endsOn: null,
          schedule: expect.objectContaining({ id: versionTwoId, version: 2 }),
          startsOn: '2026-09-01',
        }),
        expect.objectContaining({
          endsOn: '2026-09-01',
          schedule: expect.objectContaining({ id: versionOneId, version: 1 }),
          startsOn: '2026-08-14',
        }),
      ]);
      expect(preservedHistory.json().data.coverageGaps).toEqual([]);

      const policyRules = {
        breakHandling: 'MANUAL_WITH_WARNINGS',
        flexibleTimeWarningMinutes: 30,
        rounding: 'NONE',
      };
      const createPolicyOne = await app.inject({
        headers: mutationHeaders(hrCookie, hrCsrf),
        method: 'POST',
        payload: { name: 'Standard policy', rules: policyRules },
        url: '/v1/hr/time-settings/policy-versions',
      });
      expect(createPolicyOne.statusCode, createPolicyOne.payload).toBe(200);
      const policyOneId = String(createPolicyOne.json().data.targetId);
      const duplicatePolicy = await app.inject({
        headers: mutationHeaders(hrCookie, hrCsrf),
        method: 'POST',
        payload: { name: 'Standard policy', rules: policyRules },
        url: '/v1/hr/time-settings/policy-versions',
      });
      expect(duplicatePolicy.statusCode).toBe(409);
      expect(duplicatePolicy.json()).toMatchObject({ error: { code: 'POLICY_VERSION_NO_CHANGE' } });
      const createPolicyTwo = await app.inject({
        headers: mutationHeaders(hrCookie, hrCsrf),
        method: 'POST',
        payload: {
          name: 'Standard policy',
          rules: { ...policyRules, flexibleTimeWarningMinutes: 45 },
        },
        url: '/v1/hr/time-settings/policy-versions',
      });
      expect(createPolicyTwo.statusCode, createPolicyTwo.payload).toBe(200);
      const policyTwoId = String(createPolicyTwo.json().data.targetId);
      const futureInitialPolicy = await app.inject({
        headers: mutationHeaders(hrCookie, hrCsrf),
        method: 'POST',
        payload: { effectiveFrom: '2026-08-15', policyId: policyOneId },
        url: `/v1/hr/employees/${employee.employeeId}/policy-assignment`,
      });
      expect(futureInitialPolicy.statusCode).toBe(409);
      expect(futureInitialPolicy.json()).toMatchObject({ error: { code: 'POLICY_NOT_ASSIGNED' } });
      for (const [effectiveFrom, policyId] of [
        ['2026-08-14', policyOneId],
        ['2026-09-01', policyTwoId],
      ] as const) {
        const response = await app.inject({
          headers: mutationHeaders(hrCookie, hrCsrf),
          method: 'POST',
          payload: { effectiveFrom, policyId },
          url: `/v1/hr/employees/${employee.employeeId}/policy-assignment`,
        });
        expect(response.statusCode, response.payload).toBe(200);
      }
      const policyHistory = await app.inject({
        headers: { cookie: hrCookie, origin: ORIGIN },
        method: 'GET',
        url: `/v1/hr/employees/${employee.employeeId}/policy`,
      });
      expect(policyHistory.statusCode).toBe(200);
      expect(policyHistory.json().data.history).toEqual([
        expect.objectContaining({
          startsOn: '2026-09-01',
          policy: expect.objectContaining({ id: policyTwoId, version: 2 }),
        }),
        expect.objectContaining({
          endsOn: '2026-09-01',
          startsOn: '2026-08-14',
          policy: expect.objectContaining({ id: policyOneId, version: 1 }),
        }),
      ]);
      expect(policyHistory.json().data.coverageGaps).toEqual([]);

      const vacationPolicy = {
        allowedCoverageUnits: ['FULL_DAY', 'HALF_DAY', 'MINUTES'],
        availabilityState: 'UNAVAILABLE',
        entitlementAccountCategory: 'VACATION',
        maximumRetrospectiveCalendarDays: null,
        minimumLeadCalendarDays: 0,
        pendingReservationBehavior: 'RESERVE_PENDING',
        requestNoteMode: 'OPTIONAL',
        timeTreatment: 'CREDIT_COVERED_EXPECTATION',
        workflow: 'APPROVAL_REQUIRED',
      };
      const createAbsenceType = await app.inject({
        headers: mutationHeaders(hrCookie, hrCsrf),
        method: 'POST',
        payload: {
          active: true,
          code: 'VACATION',
          effectiveFrom: '2026-08-14',
          name: 'Vacation',
          policy: vacationPolicy,
        },
        url: '/v1/hr/absence-settings/versions',
      });
      expect(createAbsenceType.statusCode, createAbsenceType.payload).toBe(200);
      const absenceTypeId = String(createAbsenceType.json().data.targetId);
      const invalidSickness = await app.inject({
        headers: mutationHeaders(hrCookie, hrCsrf),
        method: 'POST',
        payload: {
          active: true,
          code: 'SICKNESS',
          effectiveFrom: '2026-08-14',
          name: 'Sickness',
          policy: { ...vacationPolicy, entitlementAccountCategory: 'SICKNESS' },
        },
        url: '/v1/hr/absence-settings/versions',
      });
      expect(invalidSickness.statusCode).toBe(422);
      expect(invalidSickness.json()).toMatchObject({
        error: { code: 'POLICY_CONFIGURATION_INVALID' },
      });
      const adjustment = await app.inject({
        headers: mutationHeaders(hrCookie, hrCsrf),
        method: 'POST',
        payload: {
          absenceTypeId,
          effectiveOn: '2026-08-14',
          minutes: 480,
          reason: 'Initial entitlement allocation after employment review.',
        },
        url: `/v1/hr/employees/${employee.employeeId}/entitlement-adjustments`,
      });
      expect(adjustment.statusCode, adjustment.payload).toBe(200);
      const selfAdjustment = await app.inject({
        headers: mutationHeaders(hrCookie, hrCsrf),
        method: 'POST',
        payload: {
          absenceTypeId,
          effectiveOn: '2026-08-14',
          minutes: 60,
          reason: 'Prohibited self adjustment.',
        },
        url: `/v1/hr/employees/${actors.hrEmployeeId}/entitlement-adjustments`,
      });
      expect(selfAdjustment.statusCode).toBe(403);
      const entitlement = await app.inject({
        headers: { cookie: hrCookie, origin: ORIGIN },
        method: 'GET',
        url: `/v1/hr/employees/${employee.employeeId}/entitlements`,
      });
      expect(entitlement.statusCode).toBe(200);
      expect(entitlement.json()).toMatchObject({
        data: {
          accounts: [
            {
              absenceTypeId,
              availableMinutes: 480,
              projectedRemainingMinutes: 480,
              reservedMinutes: 0,
              entries: [
                {
                  entryType: 'MANUAL_ADJUSTMENT',
                  minutes: 480,
                  reason: 'Initial entitlement allocation after employment review.',
                },
              ],
            },
          ],
          privilegedActionsAllowed: true,
        },
      });

      const persisted = await fixture.client.query<{
        assignment_count: string;
        assignment_audit_count: string;
        version_audit_count: string;
      }>(
        `select
           (select count(*) from schedule_assignments where employee_id = $1)::text as assignment_count,
           (select count(*) from domain_audit_events
              where subject_employee_id = $1 and action_code = 'SCHEDULE_ASSIGNMENT_CHANGED')::text
              as assignment_audit_count,
           (select count(*) from domain_audit_events
              where organization_id = $2 and action_code = 'SCHEDULE_VERSION_CREATED')::text
              as version_audit_count`,
        [employee.employeeId, actors.organizationId],
      );
      expect(persisted.rows[0]).toEqual({
        assignment_audit_count: '2',
        assignment_count: '2',
        version_audit_count: '2',
      });
    } finally {
      await app.close();
      await fixture.cleanup();
    }
  },
);

async function createAdministrationActors(client: pg.PoolClient) {
  const passwordHash = await hashPassword(ADMIN_PASSWORD);
  const organization = await client.query<{ id: string }>(
    `insert into organizations (name, time_zone) values ('Administration Organization', 'Europe/Berlin') returning id`,
  );
  const organizationId = organization.rows[0]?.id;
  if (organizationId === undefined) throw new Error('Expected organization ID.');
  const hrAccountId = await insertCredentialAccount(
    client,
    'HR Administrator',
    'hr@example.test',
    passwordHash,
  );
  const systemAccountId = await insertCredentialAccount(
    client,
    'System Administrator',
    'system@example.test',
    passwordHash,
  );
  const employee = await client.query<{ id: string }>(
    `insert into employees (organization_id, employee_number, display_name, status)
     values ($1, 'HR-001', 'HR Administrator', 'ACTIVE') returning id`,
    [organizationId],
  );
  const hrEmployeeId = employee.rows[0]?.id;
  if (hrEmployeeId === undefined) throw new Error('Expected HR employee ID.');
  await client.query(
    `insert into employment_periods (organization_id, employee_id, starts_on) values ($1, $2, '2025-01-01')`,
    [organizationId, hrEmployeeId],
  );
  await client.query(
    `insert into account_employee_links (organization_id, user_id, employee_id) values ($1, $2, $3)`,
    [organizationId, hrAccountId, hrEmployeeId],
  );
  await client.query(
    `insert into account_role_assignments (organization_id, user_id, role) values
       ($1, $2, 'EMPLOYEE'), ($1, $2, 'HR_ADMINISTRATOR'), ($1, $3, 'SYSTEM_ADMINISTRATOR')`,
    [organizationId, hrAccountId, systemAccountId],
  );
  return { hrAccountId, hrEmployeeId, organizationId, systemAccountId };
}

async function createManagedEmployee(
  client: pg.PoolClient,
  organizationId: string,
  passwordHash: string,
  displayName: string,
  email: string,
  employeeNumber: string,
  manager: boolean,
) {
  const accountId = await insertCredentialAccount(client, displayName, email, passwordHash);
  const employee = await client.query<{ id: string }>(
    `insert into employees (organization_id, employee_number, display_name, status)
     values ($1, $2, $3, 'ACTIVE') returning id`,
    [organizationId, employeeNumber, displayName],
  );
  const employeeId = employee.rows[0]?.id;
  if (employeeId === undefined) throw new Error('Expected managed employee ID.');
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
     values ($1, $2, 'EMPLOYEE')${manager ? ", ($1, $2, 'MANAGER')" : ''}`,
    [organizationId, accountId],
  );
  return { accountId, employeeId };
}

async function insertCredentialAccount(
  client: pg.PoolClient,
  name: string,
  email: string,
  passwordHash: string,
) {
  const account = await client.query<{ id: string }>(
    `insert into auth_users (id, name, email, email_verified, active)
     values ($1, $2, $3, true, true) returning id`,
    [randomUUID(), name, email],
  );
  const accountId = account.rows[0]?.id;
  if (accountId === undefined) throw new Error('Expected account ID.');
  await client.query(
    `insert into auth_accounts (user_id, account_id, provider_id, password)
     values ($1::uuid, $1::text, 'credential', $2)`,
    [accountId, passwordHash],
  );
  return accountId;
}

async function signIn(app: ReturnType<typeof createApiServer>, email: string, password: string) {
  const response = await app.inject({
    headers: { 'content-type': 'application/json', origin: ORIGIN },
    method: 'POST',
    payload: { email, password, rememberMe: false },
    url: '/api/auth/sign-in/email',
  });
  expect(response.statusCode).toBe(200);
  const cookie = response.cookies.find(({ name }) => name === '__Host-workledger.session');
  if (cookie === undefined) throw new Error('Expected session cookie.');
  return `${cookie.name}=${cookie.value}`;
}

async function getCsrf(app: ReturnType<typeof createApiServer>, cookie: string) {
  const response = await app.inject({
    headers: { cookie, origin: ORIGIN },
    method: 'GET',
    url: '/v1/me/csrf',
  });
  expect(response.statusCode).toBe(200);
  return String(response.json().data.token);
}

function mutationHeaders(cookie: string, csrf: string) {
  return {
    'content-type': 'application/json',
    cookie,
    origin: ORIGIN,
    'x-workledger-csrf': csrf,
  };
}
