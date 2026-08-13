import { verifyPassword } from 'better-auth/crypto';

import { createDatabaseHarnessState } from '@workledger/test-utils';

import {
  DEVELOPMENT_SEED_ORGANIZATION_ID,
  DevelopmentSeedError,
  seedDevelopmentDatabase,
} from '../src/index.js';
import { createMigratedPostgresFixture } from './postgres-fixture.js';

const databaseHarness = createDatabaseHarnessState(process.env);
const integrationTest = databaseHarness.enabled ? test : test.skip;

integrationTest(
  `creates deterministic, repeat-safe Northstar scenarios (${databaseHarness.safeLabel})`,
  async () => {
    const firstFixture = await createMigratedPostgresFixture(databaseHarness.url, 'seed_first');
    const secondFixture = await createMigratedPostgresFixture(databaseHarness.url, 'seed_second');
    const occupiedFixture = await createMigratedPostgresFixture(
      databaseHarness.url,
      'seed_occupied',
    );

    try {
      await expect(
        seedDevelopmentDatabase({
          connectionString: firstFixture.databaseUrl,
          environment: 'test',
        }),
      ).resolves.toEqual({
        anchorDate: '2026-02-02',
        organizationId: DEVELOPMENT_SEED_ORGANIZATION_ID,
        personaCount: 10,
        status: 'CREATED',
      });
      await expect(
        seedDevelopmentDatabase({
          connectionString: firstFixture.databaseUrl,
          environment: 'test',
        }),
      ).resolves.toMatchObject({ status: 'ALREADY_PRESENT' });
      await seedDevelopmentDatabase({
        connectionString: secondFixture.databaseUrl,
        environment: 'test',
      });

      const firstSummary = await seedSummary(firstFixture.client);
      const secondSummary = await seedSummary(secondFixture.client);
      expect(firstSummary).toEqual(secondSummary);
      expect(firstSummary).toMatchObject({
        active_accounts: '9',
        employees: '9',
        locked_periods: '2',
        pending_absences: '1',
        punch_events: '26',
      });

      const leonEntitlement = await firstFixture.client.query<{
        minutes: string;
        reservation: string;
      }>(
        `select
           sum(minutes)::text as minutes,
           sum(minutes) filter (where entry_type = 'PENDING_RESERVATION')::text as reservation
         from leave_entitlement_entries
         where employee_id = $1`,
        [seedId(21)],
      );
      expect(leonEntitlement.rows[0]).toEqual({ minutes: '4080', reservation: '-720' });

      const managerHistory = await firstFixture.client.query<{ manager_name: string }>(
        `select manager.display_name as manager_name
         from manager_assignments assignment
         join employees manager on manager.id = assignment.manager_employee_id
         where assignment.employee_id = $1
         order by assignment.starts_on`,
        [seedId(11)],
      );
      expect(managerHistory.rows.map(({ manager_name }) => manager_name)).toEqual([
        'Nora Blake',
        'Alex Morgan',
      ]);

      const credential = await firstFixture.client.query<{ active: boolean; password: string }>(
        `select users.active, accounts.password
         from auth_users users
         join auth_accounts accounts on accounts.user_id = users.id
         where users.email = 'emma@northstar.test'`,
      );
      expect(credential.rows[0]?.active).toBe(true);
      expect(
        await verifyPassword({
          hash: credential.rows[0]?.password ?? '',
          password: 'Northstar-Demo-2026!',
        }),
      ).toBe(true);

      const privacySnapshot = await firstFixture.client.query<{ snapshot: unknown }>(
        `select snapshot from approved_monthly_snapshots where id = $1`,
        [seedId(5011)],
      );
      const serializedSnapshot = JSON.stringify(privacySnapshot.rows[0]?.snapshot);
      expect(serializedSnapshot).toContain('neutralAbsenceEffectIds');
      expect(serializedSnapshot).not.toMatch(/sickness|diagnosis|note|entitlement/i);

      await occupiedFixture.client.query(
        `insert into organizations (name, time_zone) values ('Existing organization', 'UTC')`,
      );
      await expect(
        seedDevelopmentDatabase({
          connectionString: occupiedFixture.databaseUrl,
          environment: 'test',
        }),
      ).rejects.toEqual(
        expect.objectContaining<Partial<DevelopmentSeedError>>({ reason: 'DATABASE_NOT_EMPTY' }),
      );

      await firstFixture.client.query(`update organizations set name = 'Drifted' where id = $1`, [
        DEVELOPMENT_SEED_ORGANIZATION_ID,
      ]);
      await expect(
        seedDevelopmentDatabase({
          connectionString: firstFixture.databaseUrl,
          environment: 'test',
        }),
      ).rejects.toEqual(
        expect.objectContaining<Partial<DevelopmentSeedError>>({ reason: 'SEED_DRIFT' }),
      );
    } finally {
      await firstFixture.cleanup();
      await secondFixture.cleanup();
      await occupiedFixture.cleanup();
    }
  },
);

async function seedSummary(client: import('pg').Client): Promise<Record<string, string>> {
  const result = await client.query<Record<string, string>>(
    `select
       (select count(*) from auth_users where active) as active_accounts,
       (select count(*) from employees) as employees,
       (select count(*) from monthly_periods where status = 'LOCKED') as locked_periods,
       (select count(*) from absence_requests where status = 'SUBMITTED') as pending_absences,
       (select count(*) from punch_events) as punch_events,
       (select count(*) from domain_audit_events) as domain_audits,
       (select count(*) from daily_projections) as projections,
       (select count(*) from time_account_entries) as time_entries`,
  );
  return result.rows[0] ?? {};
}

function seedId(value: number): string {
  return `00000000-0000-4000-8000-${value.toString().padStart(12, '0')}`;
}
