import { fileURLToPath } from 'node:url';

import type {
  BalanceChangeInsightRequest,
  InsightNativePayload,
} from '@workledger/contracts/insights';
import { parseDomainId, parseInstant, type DomainId, type Instant } from '@workledger/domain';
import { createWorkLedgerDatabase, type ApplicationRole } from '@workledger/database';
import { createDatabaseHarnessState, createPostgresSchemaFixture } from '@workledger/test-utils';

import {
  createInsightService,
  type EmployeeInsightAuthority,
  type InsightHandler,
} from '../src/insights/insight-service.js';
import { createInsightToolRegistry } from '../src/insights/insight-tool-registry.js';

const databaseHarness = createDatabaseHarnessState(process.env);
const integrationTest = databaseHarness.enabled ? test : test.skip;
const repositoryDirectory = fileURLToPath(new URL('../../..', import.meta.url));
const migrationFiles = [
  '0000_initial_schema.sql',
  '0001_integrity_constraints.sql',
  '0002_auth_foundation.sql',
  '0003_authorization_foundation.sql',
  '0022_account_locale.sql',
].map((file) => `${repositoryDirectory}/packages/database/migrations/${file}`);
const CAPTURED_AT = instant('2026-08-27T09:30:45Z');
const REQUEST = Object.freeze({
  kind: 'balance-change' as const,
  period: Object.freeze({
    endDate: '2026-08-26',
    kind: 'DATE_RANGE' as const,
    startDate: '2026-08-01',
  }),
  workspace: 'EMPLOYEE' as const,
});

integrationTest(
  `reauthorizes one employee workspace and constructs trusted native metadata (${databaseHarness.safeLabel})`,
  async () => {
    const fixture = await createPostgresSchemaFixture({
      connectionString: databaseHarness.url,
      label: 'insight_service',
      migrationFiles,
    });
    const database = createWorkLedgerDatabase({
      applicationName: 'workledger-insight-service-test',
      connectionString: fixture.databaseUrl,
    });

    try {
      const organizationId = await createOrganization(fixture.client);
      const employee = await createEmployeeAccount(fixture.client, organizationId, 'employee', [
        'EMPLOYEE',
        'HR_ADMINISTRATOR',
        'MANAGER',
      ]);
      const technicalAccountId = await createTechnicalAccount(
        fixture.client,
        organizationId,
        'system',
        ['SYSTEM_ADMINISTRATOR'],
      );
      let authoritySeen: EmployeeInsightAuthority | null = null;
      let handlerCalls = 0;
      const handler: InsightHandler<BalanceChangeInsightRequest> = async (input) => {
        handlerCalls += 1;
        authoritySeen = input.authority;
        return createPayload(input.request);
      };
      const service = createInsightService(database, { 'balance-change': handler });

      const result = await service.run(
        Object.freeze({ accountId: employee.accountId, sessionFresh: true }),
        REQUEST,
        CAPTURED_AT,
      );

      expect(handlerCalls).toBe(1);
      expect(authoritySeen).toEqual({
        accountId: employee.accountId,
        employeeId: employee.employeeId,
        organizationId,
        scope: 'SELF',
        timeZone: 'Europe/Berlin',
        workspace: 'EMPLOYEE',
      });
      expect(result).toEqual({
        actions: [
          {
            code: 'OPEN_BALANCE_HISTORY',
            destination: 'MY_BALANCES',
            period: REQUEST.period,
            reference: 'action_balance_history',
            sourceReferences: ['source_balance_ledger'],
          },
        ],
        facts: [
          {
            code: 'BALANCE_CHANGE_MINUTES',
            qualifiers: ['POSTED'],
            reference: 'fact_balance_change',
            sourceReferences: ['source_balance_ledger'],
            value: { kind: 'MINUTES', value: 75 },
          },
        ],
        freshness: {
          boundaries: [
            {
              kind: 'POSTED_THROUGH',
              localDate: '2026-08-26',
              sourceReferences: ['source_balance_ledger'],
            },
          ],
          capturedAt: CAPTURED_AT,
        },
        kind: 'balance-change',
        limitations: [],
        period: REQUEST.period,
        scope: { kind: 'SELF', workspace: 'EMPLOYEE' },
        sources: [
          {
            destination: 'MY_BALANCES',
            kind: 'TIME_ACCOUNT_LEDGER',
            period: REQUEST.period,
            reference: 'source_balance_ledger',
          },
        ],
        timeZone: 'Europe/Berlin',
        workspace: 'EMPLOYEE',
      });
      const serialized = JSON.stringify(result);
      for (const forbidden of [
        employee.accountId,
        employee.employeeId,
        organizationId,
        'HR_ADMINISTRATOR',
        'MANAGER',
        'SYSTEM_ADMINISTRATOR',
      ]) {
        expect(serialized).not.toContain(forbidden);
      }

      const toolRegistry = createInsightToolRegistry(service);
      const toolContext = Object.freeze({
        activeWorkspace: 'EMPLOYEE' as const,
        capturedAt: CAPTURED_AT,
        identity: Object.freeze({ accountId: employee.accountId, sessionFresh: true }),
      });
      await expect(
        toolRegistry.execute(toolContext, {
          arguments: {
            endDate: REQUEST.period.endDate,
            startDate: REQUEST.period.startDate,
          },
          code: 'employee_balance_change',
        }),
      ).resolves.toEqual(result);
      expect(handlerCalls).toBe(2);
      await expect(
        toolRegistry.execute(
          { ...toolContext, activeWorkspace: 'MANAGER' },
          {
            arguments: {
              endDate: REQUEST.period.endDate,
              startDate: REQUEST.period.startDate,
            },
            code: 'employee_balance_change',
          },
        ),
      ).rejects.toMatchObject({ code: 'ACCESS_DENIED', statusCode: 403 });
      expect(handlerCalls).toBe(2);

      const missingHandler = createInsightService(database, {});
      await expect(
        missingHandler.run(
          Object.freeze({ accountId: employee.accountId, sessionFresh: true }),
          REQUEST,
          CAPTURED_AT,
        ),
      ).rejects.toMatchObject({ code: 'INTERNAL_ERROR', statusCode: 503 });

      const invalidResultService = createInsightService(database, {
        'balance-change': async (input) => {
          const validPayload = createPayload(input.request);
          return Object.freeze({
            ...validPayload,
            facts: [
              Object.freeze({
                ...validPayload.facts[0],
                sourceReferences: ['source_outside_result'],
              }),
            ],
          });
        },
      });
      await expect(
        invalidResultService.run(
          Object.freeze({ accountId: employee.accountId, sessionFresh: true }),
          REQUEST,
          CAPTURED_AT,
        ),
      ).rejects.toMatchObject({ code: 'INTERNAL_ERROR', statusCode: 503 });

      await expect(
        service.run(
          Object.freeze({ accountId: technicalAccountId, sessionFresh: true }),
          REQUEST,
          CAPTURED_AT,
        ),
      ).rejects.toMatchObject({ code: 'ACCESS_DENIED', statusCode: 403 });
      expect(handlerCalls).toBe(2);

      await fixture.client.query(`update employees set status = 'INACTIVE' where id = $1`, [
        employee.employeeId,
      ]);
      await expect(
        toolRegistry.execute(toolContext, {
          arguments: {
            endDate: REQUEST.period.endDate,
            startDate: REQUEST.period.startDate,
          },
          code: 'employee_balance_change',
        }),
      ).rejects.toMatchObject({ code: 'ACCESS_DENIED', statusCode: 403 });
      expect(handlerCalls).toBe(2);

      await fixture.client.query(`update employees set status = 'ACTIVE' where id = $1`, [
        employee.employeeId,
      ]);
      await fixture.client.query(`update auth_users set active = false where id = $1`, [
        employee.accountId,
      ]);
      await expect(
        toolRegistry.execute(toolContext, {
          arguments: {
            endDate: REQUEST.period.endDate,
            startDate: REQUEST.period.startDate,
          },
          code: 'employee_balance_change',
        }),
      ).rejects.toMatchObject({ code: 'AUTH_SESSION_EXPIRED', statusCode: 401 });
      expect(handlerCalls).toBe(2);
    } finally {
      await database.close();
      await fixture.cleanup();
    }
  },
);

function createPayload(request: BalanceChangeInsightRequest): InsightNativePayload {
  return Object.freeze({
    actions: [
      Object.freeze({
        code: 'OPEN_BALANCE_HISTORY',
        destination: 'MY_BALANCES',
        period: request.period,
        reference: 'action_balance_history',
        sourceReferences: ['source_balance_ledger'],
      }),
    ],
    facts: [
      Object.freeze({
        code: 'BALANCE_CHANGE_MINUTES',
        qualifiers: ['POSTED'],
        reference: 'fact_balance_change',
        sourceReferences: ['source_balance_ledger'],
        value: Object.freeze({ kind: 'MINUTES', value: 75 }),
      }),
    ],
    freshnessBoundaries: [
      Object.freeze({
        kind: 'POSTED_THROUGH',
        localDate: request.period.endDate,
        sourceReferences: ['source_balance_ledger'],
      }),
    ],
    limitations: [],
    sources: [
      Object.freeze({
        destination: 'MY_BALANCES',
        kind: 'TIME_ACCOUNT_LEDGER',
        period: request.period,
        reference: 'source_balance_ledger',
      }),
    ],
  });
}

async function createOrganization(client: import('pg').Client) {
  const organization = await client.query<{ id: string }>(
    `insert into organizations (name, time_zone)
     values ('Insight service organization', 'Europe/Berlin') returning id`,
  );
  return domainId<'Organization'>(organization.rows[0]?.id);
}

async function createEmployeeAccount(
  client: import('pg').Client,
  organizationId: DomainId<'Organization'>,
  label: string,
  roles: readonly ApplicationRole[],
) {
  const accountId = await createTechnicalAccount(client, organizationId, label, roles);
  const employee = await client.query<{ id: string }>(
    `insert into employees (organization_id, employee_number, display_name)
     values ($1, $2, $3) returning id`,
    [organizationId, `WL-${label}`, `${label} employee`],
  );
  const employeeId = domainId<'Employee'>(employee.rows[0]?.id);
  await client.query(
    `insert into employment_periods (organization_id, employee_id, starts_on)
     values ($1, $2, '2026-01-01')`,
    [organizationId, employeeId],
  );
  await client.query(
    `insert into account_employee_links (organization_id, user_id, employee_id, linked_at)
     values ($1, $2, $3, '2026-01-01T00:00:00Z')`,
    [organizationId, accountId, employeeId],
  );
  return Object.freeze({ accountId, employeeId });
}

async function createTechnicalAccount(
  client: import('pg').Client,
  organizationId: DomainId<'Organization'>,
  label: string,
  roles: readonly ApplicationRole[],
) {
  const account = await client.query<{ id: string }>(
    `insert into auth_users (name, email, email_verified, active)
     values ($1, $2, true, true) returning id`,
    [`${label} account`, `${label}@example.test`],
  );
  const accountId = domainId<'Account'>(account.rows[0]?.id);
  await client.query(
    `insert into account_role_assignments (organization_id, user_id, role, assigned_at)
     select $1, $2, role, '2026-01-01T00:00:00Z'
     from unnest($3::application_role[]) as role`,
    [organizationId, accountId, roles],
  );
  return accountId;
}

function domainId<Entity extends string>(value: unknown): DomainId<Entity> {
  const result = parseDomainId<Entity>(value);
  if (!result.ok) throw new Error(`Invalid test ${result.error.code}.`);
  return result.value;
}

function instant(value: string): Instant {
  const result = parseInstant(value);
  if (!result.ok) throw new Error(`Invalid test ${result.error.code}.`);
  return result.value;
}
