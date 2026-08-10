import { randomUUID } from 'node:crypto';

import { createDatabaseHarnessState } from '@workledger/test-utils';

import { createMigratedPostgresFixture } from './postgres-fixture.js';

const databaseHarness = createDatabaseHarnessState(process.env);
const integrationTest = databaseHarness.enabled ? test : test.skip;

integrationTest(
  `applies the initial migrations and enforces core invariants (${databaseHarness.safeLabel})`,
  async () => {
    const fixture = await createMigratedPostgresFixture(databaseHarness.url, 'migration');
    const { client, schemaName } = fixture;

    try {
      const tableCount = await client.query<{ count: string }>(
        `select count(*) from information_schema.tables where table_schema = $1`,
        [schemaName],
      );
      expect(Number(tableCount.rows[0]?.count)).toBe(28);

      const organization = await client.query<{ id: string }>(
        `insert into organizations (name, time_zone) values ($1, $2) returning id`,
        ['Migration test organization', 'Europe/Berlin'],
      );
      const organizationId = organization.rows[0]?.id;
      expect(organizationId).toBeTruthy();

      const uuidVersion = await client.query<{ version: number }>(
        `select uuid_extract_version($1::uuid) as version`,
        [organizationId],
      );
      expect(uuidVersion.rows[0]?.version).toBe(7);

      const employee = await client.query<{ id: string }>(
        `insert into employees (organization_id, employee_number, display_name) values ($1, $2, $3) returning id`,
        [organizationId, 'WL-TEST-1', 'Migration Test Employee'],
      );
      const employeeId = employee.rows[0]?.id;
      expect(employeeId).toBeTruthy();

      await client.query(
        `insert into employment_periods (organization_id, employee_id, starts_on, ends_on) values ($1, $2, $3, $4)`,
        [organizationId, employeeId, '2026-01-01', '2026-07-01'],
      );
      await expect(
        client.query(
          `insert into employment_periods (organization_id, employee_id, starts_on, ends_on) values ($1, $2, $3, $4)`,
          [organizationId, employeeId, '2026-06-01', null],
        ),
      ).rejects.toMatchObject({ code: '23P01' });
      await expect(
        client.query(
          `insert into employment_periods (organization_id, employee_id, starts_on, ends_on) values ($1, $2, $3, $4)`,
          [organizationId, employeeId, '2026-07-01', null],
        ),
      ).resolves.toBeDefined();

      const otherOrganization = await client.query<{ id: string }>(
        `insert into organizations (name, time_zone) values ($1, $2) returning id`,
        ['Other migration test organization', 'Europe/Berlin'],
      );
      await expect(
        client.query(
          `insert into daily_projections (organization_id, employee_id, local_date, calculation_status, projection_version, engine_version, source_fingerprint, expected_minutes, worked_minutes, break_minutes, absence_credit_minutes, adjustment_minutes, credited_minutes, balance_minutes, source_references, calculated_at) values ($1, $2, $3, 'COMPLETE', 1, 'test', $4, 480, 480, 0, 0, 0, 480, 0, '{}'::jsonb, $5)`,
          [
            otherOrganization.rows[0]?.id,
            employeeId,
            '2026-01-02',
            'a'.repeat(64),
            '2026-01-03T00:00:00Z',
          ],
        ),
      ).rejects.toMatchObject({ code: '23503' });

      const punch = await client.query<{ id: string }>(
        `insert into punch_events (organization_id, employee_id, event_sequence, event_type, occurred_at, command_id) values ($1, $2, 1, 'CLOCK_IN', $3, $4) returning id`,
        [organizationId, employeeId, '2026-01-02T08:00:00Z', randomUUID()],
      );
      await expect(
        client.query(`update punch_events set occurred_at = $1 where id = $2`, [
          '2026-01-02T09:00:00Z',
          punch.rows[0]?.id,
        ]),
      ).rejects.toMatchObject({ code: '55000' });

      await expect(
        client.query(
          `insert into daily_projections (organization_id, employee_id, local_date, calculation_status, projection_version, engine_version, source_fingerprint, expected_minutes, worked_minutes, break_minutes, absence_credit_minutes, adjustment_minutes, credited_minutes, balance_minutes, source_references, calculated_at) values ($1, $2, $3, 'COMPLETE', 1, 'test', $4, 480, 480, 0, 0, 0, 470, -10, '{}'::jsonb, $5)`,
          [organizationId, employeeId, '2026-01-02', 'a'.repeat(64), '2026-01-03T00:00:00Z'],
        ),
      ).rejects.toMatchObject({ code: '23514' });
    } finally {
      await fixture.cleanup();
    }
  },
);
