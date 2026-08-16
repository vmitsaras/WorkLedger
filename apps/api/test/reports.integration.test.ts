import { fileURLToPath } from 'node:url';

import {
  csrfBootstrapEnvelopeSchema,
  reportCatalogEnvelopeSchema,
  reportResultEnvelopeSchema,
  type ReportResult,
} from '@workledger/contracts';
import { seedDevelopmentDatabase } from '@workledger/database';
import { createDatabaseHarnessState, createPostgresSchemaFixture } from '@workledger/test-utils';

import { createRuntimeConfig } from '../src/config.js';
import { createApiServer } from '../src/server.js';

const databaseHarness = createDatabaseHarnessState(process.env);
const integrationTest = databaseHarness.enabled ? test : test.skip;
const ORIGIN = 'https://ledger.example.test';
const AUTH_SECRET = 'reports-secret-with-more-than-thirty-two-bytes';
const NOW = '2026-02-13T10:30:45Z';
const PASSWORD = 'Northstar-Demo-2026!';
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
  '0019_stale_loners.sql',
  '0020_chemical_micromacro.sql',
].map((file) => `${repositoryDirectory}/packages/database/migrations/${file}`);

integrationTest(
  `runs purpose-minimized reports after employee scope is fixed (${databaseHarness.safeLabel})`,
  async () => {
    const fixture = await createPostgresSchemaFixture({
      connectionString: databaseHarness.url,
      label: 'reports',
      migrationFiles,
    });
    await seedDevelopmentDatabase({
      connectionString: fixture.databaseUrl,
      environment: 'test',
    });
    const employeeIds = await fixture.client.query<{ display_name: string; id: string }>(
      `select id, display_name from employees where display_name in ('Emma Reed', 'Owen Ford')`,
    );
    const emmaId = requiredEmployeeId(employeeIds.rows, 'Emma Reed');
    const owenId = requiredEmployeeId(employeeIds.rows, 'Owen Ford');
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
      const unauthenticated = await app.inject({
        method: 'GET',
        url: '/v1/reports',
        headers: { origin: ORIGIN },
      });
      expect(unauthenticated.statusCode).toBe(401);

      const employeeCookie = await signIn(app, 'emma@northstar.test');
      const managerCookie = await signIn(app, 'alex@northstar.test');
      const hrCookie = await signIn(app, 'priya@northstar.test');
      const systemCookie = await signIn(app, 'sam@northstar.test');

      const employeeCatalogResponse = await get(app, employeeCookie, '/v1/reports');
      expect(employeeCatalogResponse.statusCode).toBe(200);
      expect(employeeCatalogResponse.headers['cache-control']).toBe('private, no-store');
      const employeeCatalog = reportCatalogEnvelopeSchema.parse(
        employeeCatalogResponse.json(),
      ).data;
      expect(employeeCatalog.defaultRange).toEqual({ from: '2026-02-01', to: '2026-02-28' });
      expect(employeeCatalog.reports.map(({ key }) => key)).toEqual([
        'monthly-time',
        'flexible-time',
        'leave',
        'missing-records',
      ]);

      for (const cookie of [managerCookie, hrCookie]) {
        const catalog = reportCatalogEnvelopeSchema.parse(
          (await get(app, cookie, '/v1/reports')).json(),
        ).data;
        expect(catalog.reports.map(({ key }) => key)).toContain('pending-approvals');
      }
      const systemCatalog = await get(app, systemCookie, '/v1/reports');
      expect(systemCatalog.statusCode).toBe(403);
      expect(systemCatalog.json()).toMatchObject({ error: { code: 'ACCESS_DENIED' } });

      const employeeFlexible = await parsedReport(
        app,
        employeeCookie,
        'flexible-time',
        '2026-01-01',
        '2026-02-28',
      );
      expect(employeeFlexible.scope).toBe('SELF');
      expect(employeeFlexible.pagination.total).toBe(1);
      expect(employeeFlexible.rows).toMatchObject([
        { employeeDisplayName: 'Emma Reed', kind: 'FLEXIBLE_TIME' },
      ]);

      const managerFlexible = await parsedReport(
        app,
        managerCookie,
        'flexible-time',
        '2026-01-01',
        '2026-02-28',
      );
      expect(managerFlexible.scope).toBe('SELF_AND_REPORTS');
      expect(managerFlexible.pagination.total).toBe(6);
      expect(managerFlexible.rows.map(employeeName)).toEqual(
        expect.arrayContaining([
          'Alex Morgan',
          'Daniel Cole',
          'Emma Reed',
          'Leon Papas',
          'Mina Georgiou',
          'Sofia Marin',
        ]),
      );
      expect(managerFlexible.rows.map(employeeName)).not.toEqual(
        expect.arrayContaining(['Nora Blake', 'Owen Ford', 'Priya Shah']),
      );
      const targetedManagerFlexible = await parsedReport(
        app,
        managerCookie,
        'flexible-time',
        '2026-01-01',
        '2026-02-28',
        emmaId,
      );
      expect(targetedManagerFlexible.pagination.total).toBe(1);
      expect(targetedManagerFlexible.rows.map(employeeName)).toEqual(['Emma Reed']);
      const unrelatedTarget = await get(
        app,
        managerCookie,
        reportPath('flexible-time', '2026-01-01', '2026-02-28', 'EMPLOYEE', owenId),
      );
      expect(unrelatedTarget.statusCode).toBe(403);
      expect(unrelatedTarget.json()).toMatchObject({ error: { code: 'ACCESS_DENIED' } });

      const hrFlexible = await parsedReport(
        app,
        hrCookie,
        'flexible-time',
        '2026-01-01',
        '2026-02-28',
      );
      expect(hrFlexible.scope).toBe('ORGANIZATION');
      expect(hrFlexible.pagination.total).toBe(9);
      expect(hrFlexible.rows.map(employeeName)).toContain('Owen Ford');

      const monthly = await parsedReport(
        app,
        managerCookie,
        'monthly-time',
        '2026-02-01',
        '2026-02-28',
      );
      expect(monthly.partial).toBe(true);
      expect(monthly.summary).toMatchObject({
        incompleteRecordCount: 1,
        kind: 'MONTHLY_TIME',
      });
      expect(monthly.rows.map(employeeName)).toEqual(
        expect.arrayContaining(['Daniel Cole', 'Mina Georgiou']),
      );

      const missing = await parsedReport(
        app,
        managerCookie,
        'missing-records',
        '2026-02-01',
        '2026-02-28',
      );
      expect(missing.rows).toMatchObject([
        {
          employeeDisplayName: 'Daniel Cole',
          kind: 'MISSING_RECORD',
          status: 'INCOMPLETE',
          warningCodes: ['ATTENDANCE_INCOMPLETE'],
        },
      ]);

      const leave = await parsedReport(app, managerCookie, 'leave', '2026-02-01', '2026-02-28');
      expect(leave.rows.length).toBeGreaterThan(0);
      expect(JSON.stringify(leave)).not.toMatch(/sickness|reason|note/iu);
      assertPurposeMinimized(leave);

      const pending = await parsedReport(
        app,
        managerCookie,
        'pending-approvals',
        '2026-02-01',
        '2026-03-31',
      );
      expect(pending.scope).toBe('REPORTS');
      expect(pending.rows.length).toBeGreaterThan(0);
      expect(pending.rows.map(employeeName)).not.toContain('Alex Morgan');
      assertPurposeMinimized(pending);

      const employeePending = await get(
        app,
        employeeCookie,
        reportPath('pending-approvals', '2026-02-01', '2026-02-28'),
      );
      expect(employeePending.statusCode).toBe(403);

      for (const path of [
        reportPath('flexible-time', '2026-02-01', '2026-02-28', 'STATUS'),
        '/v1/reports/flexible-time?from=2026-02-01&to=2026-02-28&person=private',
        '/v1/reports/flexible-time',
      ]) {
        const invalid = await get(app, managerCookie, path);
        expect(invalid.statusCode).toBe(422);
        expect(invalid.json()).toMatchObject({ error: { code: 'VALIDATION_FAILED' } });
        expect(invalid.payload).not.toContain('private');
      }

      const csrfToken = await csrf(app, managerCookie);
      const missingCsrf = await postExport(app, managerCookie, '', 'flexible-time', {
        direction: 'ASC',
        employeeId: emmaId,
        from: '2026-01-01',
        sort: 'EMPLOYEE',
        to: '2026-02-28',
      });
      expect(missingCsrf.statusCode).toBe(403);
      expect(missingCsrf.json()).toMatchObject({ error: { code: 'AUTH_CSRF_INVALID' } });

      await fixture.client.query(`update employees set display_name = $1 where id = $2`, [
        '=2+2, "Northstar"',
        emmaId,
      ]);
      const exported = await postExport(app, managerCookie, csrfToken, 'flexible-time', {
        direction: 'ASC',
        employeeId: emmaId,
        from: '2026-01-01',
        sort: 'EMPLOYEE',
        to: '2026-02-28',
      });
      expect(exported.statusCode, exported.payload).toBe(200);
      expect(exported.headers['cache-control']).toBe('private, no-store');
      expect(exported.headers['content-type']).toBe('text/csv; charset=utf-8');
      expect(exported.headers['content-disposition']).toBe(
        'attachment; filename="workledger-flexible-time-2026-01-01-to-2026-02-28.csv"',
      );
      expect(exported.headers['x-content-type-options']).toBe('nosniff');
      expect(exported.payload).toContain(
        'employee_name,opening_balance_minutes,range_change_minutes,closing_balance_minutes\r\n',
      );
      expect(exported.payload).toContain('"\'=2+2, ""Northstar"""');
      expect(exported.payload.endsWith('\r\n')).toBe(true);
      expect(Buffer.from(exported.rawPayload).toString('utf8')).toBe(exported.payload);
      expect(exported.payload).not.toMatch(
        /employee_id|source_id|approval_id|monthly_period_id|sickness|reason|note/iu,
      );
      expect(exported.headers['content-disposition']).not.toContain('Emma');

      const auditRows = await fixture.client.query<{
        action_code: string;
        facts: Readonly<{ sourceCount: number }>;
        outcome: string;
        reason_code: string;
        subject_employee_id: string | null;
        target_kind: string;
      }>(
        `select action_code, facts, outcome, reason_code, subject_employee_id, target_kind
         from domain_audit_events
         where action_code = 'REPORT_FLEXIBLE_TIME_EXPORTED'`,
      );
      expect(auditRows.rows).toEqual([
        expect.objectContaining({
          action_code: 'REPORT_FLEXIBLE_TIME_EXPORTED',
          facts: { sourceCount: 1 },
          outcome: 'SUCCESS',
          reason_code: 'SCOPE_SELF_AND_REPORTS',
          subject_employee_id: emmaId,
          target_kind: 'EXPORT',
        }),
      ]);

      await fixture.client.query(
        `update manager_assignments
         set ends_on = '2026-02-13'
         where employee_id = $1 and ends_on is null`,
        [emmaId],
      );
      const afterScopeLoss = await postExport(app, managerCookie, csrfToken, 'flexible-time', {
        direction: 'ASC',
        employeeId: emmaId,
        from: '2026-01-01',
        sort: 'EMPLOYEE',
        to: '2026-02-28',
      });
      expect(afterScopeLoss.statusCode).toBe(403);
      expect(afterScopeLoss.json()).toMatchObject({ error: { code: 'ACCESS_DENIED' } });
      const auditCount = await fixture.client.query<{ count: string }>(
        `select count(*)::text as count
         from domain_audit_events
         where action_code = 'REPORT_FLEXIBLE_TIME_EXPORTED'`,
      );
      expect(auditCount.rows[0]?.count).toBe('1');

      const extraPaginationField = await postExport(
        app,
        hrCookie,
        await csrf(app, hrCookie),
        'flexible-time',
        {
          direction: 'ASC',
          from: '2026-01-01',
          limit: 20,
          sort: 'EMPLOYEE',
          to: '2026-02-28',
        },
      );
      expect(extraPaginationField.statusCode).toBe(422);
      expect(extraPaginationField.json()).toMatchObject({
        error: { code: 'VALIDATION_FAILED' },
      });
    } finally {
      await app.close();
      await fixture.cleanup();
    }
  },
);

async function parsedReport(
  app: ReturnType<typeof createApiServer>,
  cookie: string,
  key: string,
  from: string,
  to: string,
  employeeId?: string,
): Promise<ReportResult> {
  const response = await get(app, cookie, reportPath(key, from, to, 'EMPLOYEE', employeeId));
  expect(response.statusCode, response.payload).toBe(200);
  expect(response.headers['cache-control']).toBe('private, no-store');
  return reportResultEnvelopeSchema.parse(response.json()).data;
}

function reportPath(
  key: string,
  from: string,
  to: string,
  sort = 'EMPLOYEE',
  employeeId?: string,
): string {
  const query = new URLSearchParams({
    direction: 'ASC',
    from,
    limit: '20',
    page: '1',
    sort,
    to,
  });
  if (employeeId !== undefined) query.set('employeeId', employeeId);
  return `/v1/reports/${key}?${query.toString()}`;
}

function get(app: ReturnType<typeof createApiServer>, cookie: string, url: string) {
  return app.inject({ method: 'GET', url, headers: { cookie, origin: ORIGIN } });
}

function postExport(
  app: ReturnType<typeof createApiServer>,
  cookie: string,
  csrfToken: string,
  key: string,
  payload: Readonly<Record<string, unknown>>,
) {
  return app.inject({
    method: 'POST',
    url: `/v1/reports/${key}/export`,
    headers: {
      cookie,
      'content-type': 'application/json',
      origin: ORIGIN,
      'x-workledger-csrf': csrfToken,
    },
    payload,
  });
}

async function csrf(app: ReturnType<typeof createApiServer>, cookie: string): Promise<string> {
  const response = await get(app, cookie, '/v1/me/csrf');
  expect(response.statusCode).toBe(200);
  return csrfBootstrapEnvelopeSchema.parse(response.json()).data.token;
}

async function signIn(app: ReturnType<typeof createApiServer>, email: string): Promise<string> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/sign-in/email',
    headers: { 'content-type': 'application/json', origin: ORIGIN },
    payload: { email, password: PASSWORD },
  });
  expect(response.statusCode).toBe(200);
  const setCookie = Array.isArray(response.headers['set-cookie'])
    ? response.headers['set-cookie'][0]
    : response.headers['set-cookie'];
  const cookie = setCookie?.split(';', 1)[0];
  if (cookie === undefined) throw new Error('Expected session cookie.');
  return cookie;
}

function employeeName(row: ReportResult['rows'][number]): string {
  return row.employeeDisplayName;
}

function requiredEmployeeId(
  rows: readonly Readonly<{ display_name: string; id: string }>[],
  displayName: string,
): string {
  const id = rows.find((row) => row.display_name === displayName)?.id;
  if (id === undefined) throw new Error(`Expected seeded employee: ${displayName}`);
  return id;
}

function assertPurposeMinimized(report: ReportResult) {
  const keys = collectKeys(report);
  for (const key of [
    'employeeId',
    'absenceTypeCode',
    'absenceTypeId',
    'requestReason',
    'reviewerReason',
    'sicknessClassification',
    'sourceId',
  ]) {
    expect(keys).not.toContain(key);
  }
}

function collectKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(collectKeys);
  if (value === null || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, nested]) => [key, ...collectKeys(nested)]);
}
