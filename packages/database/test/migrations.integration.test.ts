import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { createDatabaseHarnessState, createPostgresSchemaFixture } from '@workledger/test-utils';

import { createMigratedPostgresFixture } from './postgres-fixture.js';

const databaseHarness = createDatabaseHarnessState(process.env);
const integrationTest = databaseHarness.enabled ? test : test.skip;
const packageDirectory = fileURLToPath(new URL('..', import.meta.url));
const preDecisionActorMigrations = [
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
].map((file) => `${packageDirectory}/migrations/${file}`);

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
      expect(Number(tableCount.rows[0]?.count)).toBe(42);

      const organization = await client.query<{ id: string }>(
        `insert into organizations (name, time_zone) values ($1, $2) returning id`,
        ['Migration test organization', 'Europe/Berlin'],
      );
      const organizationId = organization.rows[0]?.id;
      expect(organizationId).toBeTruthy();

      await expect(
        client.query(
          `insert into absence_types
            (organization_id, code, name, version, active, valid_from, valid_to, policy)
           values ($1, 'VACATION', 'Vacation', 1, true, '2026-07-01', '2026-07-01', '{}'::jsonb)`,
          [organizationId],
        ),
      ).rejects.toMatchObject({ code: '23514' });
      await expect(
        client.query(
          `insert into absence_types
            (organization_id, code, name, version, active, valid_from, valid_to, policy)
           values ($1, 'VACATION', 'Vacation', 1, true, '2026-01-01', null, '{}'::jsonb)`,
          [organizationId],
        ),
      ).resolves.toBeDefined();
      const vacationAbsenceType = await client.query<{ id: string }>(
        `insert into absence_types
          (organization_id, code, name, version, active, valid_from, valid_to, policy)
         values ($1, 'VACATION', 'Vacation', 2, true, '2027-01-01', null, '{}'::jsonb)
         returning id`,
        [organizationId],
      );

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

      await expect(
        client.query(
          `insert into leave_entitlement_entries
            (organization_id, employee_id, absence_type_id, entry_type, minutes, source_id, effective_on)
           values ($1, $2, $3, 'PENDING_RESERVATION', -480, uuidv7(), '2026-01-01')`,
          [organizationId, employeeId, vacationAbsenceType.rows[0]?.id],
        ),
      ).resolves.toBeDefined();

      const account = await client.query<{ id: string }>(
        `insert into auth_users (name, email) values ('Migration Account', 'migration@example.test') returning id`,
      );
      await client.query(
        `insert into account_employee_links (organization_id, user_id, employee_id) values ($1, $2, $3)`,
        [organizationId, account.rows[0]?.id, employeeId],
      );
      const secondEmployee = await client.query<{ id: string }>(
        `insert into employees (organization_id, employee_number, display_name) values ($1, 'WL-TEST-2', 'Second Migration Employee') returning id`,
        [organizationId],
      );
      await expect(
        client.query(
          `insert into account_employee_links (organization_id, user_id, employee_id) values ($1, $2, $3)`,
          [organizationId, account.rows[0]?.id, secondEmployee.rows[0]?.id],
        ),
      ).rejects.toMatchObject({ code: '23505' });

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
      const otherVacationAbsenceType = await client.query<{ id: string }>(
        `insert into absence_types
          (organization_id, code, name, version, active, valid_from, valid_to, policy)
         values ($1, 'VACATION', 'Vacation', 1, true, '2026-01-01', null, '{}'::jsonb)
         returning id`,
        [otherOrganization.rows[0]?.id],
      );
      await expect(
        client.query(
          `insert into leave_entitlement_entries
            (organization_id, employee_id, absence_type_id, entry_type, minutes, source_id, effective_on)
           values ($1, $2, $3, 'ALLOCATION', 480, uuidv7(), '2026-01-01')`,
          [organizationId, employeeId, otherVacationAbsenceType.rows[0]?.id],
        ),
      ).rejects.toMatchObject({ code: '23503' });
      await expect(
        client.query(
          `insert into idempotency_records
            (organization_id, actor_account_id, employee_id, command,
             idempotency_key_hash, request_fingerprint)
           values ($1, $2, $3, 'CLOCK_IN', $4, $5)`,
          [
            otherOrganization.rows[0]?.id,
            account.rows[0]?.id,
            employeeId,
            'f'.repeat(64),
            'e'.repeat(64),
          ],
        ),
      ).rejects.toMatchObject({ code: '23503' });
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

      const hrOnlyAccount = await client.query<{ id: string }>(
        `insert into auth_users (name, email)
         values ('HR-only decision actor', 'hr-only-decision@example.test') returning id`,
      );
      const correctionRequest = await client.query<{ id: string }>(
        `insert into correction_requests
          (organization_id, employee_id, requested_by_employee_id, local_date, status, reason,
           original_interpretation, proposed_interpretation)
         values ($1, $2, $2, '2026-01-02', 'SUBMITTED', 'Migration decision reason',
                 '{}'::jsonb, '{}'::jsonb) returning id`,
        [organizationId, employeeId],
      );
      const decision = await client.query<{ id: string }>(
        `insert into correction_decisions
          (organization_id, correction_request_id, actor_account_id, actor_employee_id,
           actor_authority, action, reason, decided_at)
         values ($1, $2, $3, null, 'ORGANIZATION_HR', 'APPROVE',
                 'HR-only migration decision', '2026-01-02T09:00:00Z') returning id`,
        [organizationId, correctionRequest.rows[0]?.id, hrOnlyAccount.rows[0]?.id],
      );
      await expect(
        client.query(`update correction_decisions set reason = 'Changed' where id = $1`, [
          decision.rows[0]?.id,
        ]),
      ).rejects.toMatchObject({ code: '55000' });

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

      const domainAudit = await client.query<{ id: string }>(
        `insert into domain_audit_events
          (organization_id, actor_kind, actor_account_id, actor_role, action_code, outcome,
           subject_employee_id, target_kind, target_id, facts, occurred_at)
         values ($1, 'ACCOUNT', $2, 'HR_ADMINISTRATOR', 'EMPLOYEE_UPDATED', 'SUCCESS',
                 $3, 'EMPLOYEE', $5, '{}'::jsonb, $4)
         returning id`,
        [organizationId, account.rows[0]?.id, employeeId, '2026-01-02T10:00:00Z', employeeId],
      );
      await expect(
        client.query(`update domain_audit_events set outcome = 'FAILURE' where id = $1`, [
          domainAudit.rows[0]?.id,
        ]),
      ).rejects.toMatchObject({ code: '55000' });
      await expect(
        client.query(
          `insert into domain_audit_events
            (organization_id, actor_kind, actor_system_process, action_code, outcome,
             subject_employee_id, target_kind, target_id, facts, occurred_at)
           values ($1, 'SYSTEM', 'audit-test', 'AUDIT_TEST', 'SUCCESS', $2,
                   'EMPLOYEE', $4, '{}'::jsonb, $3)`,
          [otherOrganization.rows[0]?.id, employeeId, '2026-01-02T10:01:00Z', employeeId],
        ),
      ).rejects.toMatchObject({ code: '23503' });
      const securityAudit = await client.query<{ id: string }>(
        `insert into security_audit_events
          (organization_id, actor_kind, actor_system_process, action_code, outcome,
           target_kind, target_id, facts, occurred_at)
         values ($1, 'SYSTEM', 'audit-test', 'SIGN_IN_FAILED', 'FAILURE',
                 'AUTHENTICATION', 'authentication-attempt', '{}'::jsonb, $2)
         returning id`,
        [organizationId, '2026-01-02T10:02:00Z'],
      );
      await expect(
        client.query(`delete from security_audit_events where id = $1`, [
          securityAudit.rows[0]?.id,
        ]),
      ).rejects.toMatchObject({ code: '55000' });
      await expect(
        client.query(
          `insert into security_audit_events
            (organization_id, actor_kind, actor_system_process, action_code, outcome,
             target_kind, target_id, facts, occurred_at)
           values ($1, 'SYSTEM', 'audit-test', 'AUDIT_TEST', 'SUCCESS',
                   'AUTHENTICATION', $2, '{}'::jsonb, $3)`,
          [organizationId, '</script>', '2026-01-02T10:03:00Z'],
        ),
      ).rejects.toMatchObject({ code: '23514' });

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

integrationTest(
  `backfills historical decision accounts and manager authority before making actor accounts required (${databaseHarness.safeLabel})`,
  async () => {
    const fixture = await createPostgresSchemaFixture({
      connectionString: databaseHarness.url,
      label: 'decision_actor_backfill',
      migrationFiles: preDecisionActorMigrations,
    });
    try {
      const organizationId = (
        await fixture.client.query<{ id: string }>(
          `insert into organizations (name, time_zone)
           values ('Decision actor backfill', 'Europe/Berlin') returning id`,
        )
      ).rows[0]?.id;
      const employees = await fixture.client.query<{ id: string }>(
        `insert into employees (organization_id, employee_number, display_name)
         values ($1, 'BACKFILL-MANAGER', 'Historical manager'),
                ($1, 'BACKFILL-TARGET', 'Historical report') returning id`,
        [organizationId],
      );
      const managerEmployeeId = employees.rows[0]?.id;
      const targetEmployeeId = employees.rows[1]?.id;
      const accountId = (
        await fixture.client.query<{ id: string }>(
          `insert into auth_users (name, email)
           values ('Historical manager', 'historical-manager@example.test') returning id`,
        )
      ).rows[0]?.id;
      await fixture.client.query(
        `insert into account_employee_links
          (organization_id, user_id, employee_id, linked_at)
         values ($1, $2, $3, '2026-01-01T00:00:00Z')`,
        [organizationId, accountId, managerEmployeeId],
      );
      await fixture.client.query(
        `insert into account_role_assignments
          (organization_id, user_id, role, assigned_at)
         values ($1, $2, 'MANAGER', '2026-01-01T00:00:00Z')`,
        [organizationId, accountId],
      );
      await fixture.client.query(
        `insert into manager_assignments
          (organization_id, employee_id, manager_employee_id, starts_on)
         values ($1, $2, $3, '2026-01-01')`,
        [organizationId, targetEmployeeId, managerEmployeeId],
      );
      const correctionId = (
        await fixture.client.query<{ id: string }>(
          `insert into correction_requests
            (organization_id, employee_id, requested_by_employee_id, local_date, status, reason,
             original_interpretation, proposed_interpretation)
           values ($1, $2, $2, '2026-08-13', 'APPROVED', 'Historical correction',
                   '{}'::jsonb, '{}'::jsonb) returning id`,
          [organizationId, targetEmployeeId],
        )
      ).rows[0]?.id;
      await fixture.client.query(
        `insert into correction_decisions
          (organization_id, correction_request_id, actor_employee_id, action, reason, decided_at)
         values ($1, $2, $3, 'APPROVE', 'Historical manager approval',
                 '2026-08-13T10:00:00Z')`,
        [organizationId, correctionId, managerEmployeeId],
      );

      const actorMigration = readFileSync(
        `${packageDirectory}/migrations/0014_adorable_piledriver.sql`,
        'utf8',
      ).replaceAll('"public".', `"${fixture.schemaName}".`);
      await fixture.client.query(actorMigration);
      const backfilled = await fixture.client.query<{
        actor_account_id: string;
        actor_authority: string;
        actor_employee_id: string;
      }>(`select actor_account_id, actor_authority, actor_employee_id from correction_decisions`);
      expect(backfilled.rows).toEqual([
        {
          actor_account_id: accountId,
          actor_authority: 'CURRENT_MANAGER',
          actor_employee_id: managerEmployeeId,
        },
      ]);
    } finally {
      await fixture.cleanup();
    }
  },
);
