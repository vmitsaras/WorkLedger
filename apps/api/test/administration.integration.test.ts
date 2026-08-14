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
