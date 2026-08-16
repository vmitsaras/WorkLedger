import { performance } from 'node:perf_hooks';

import pg from 'pg';

import { createDatabaseHarnessState } from '@workledger/test-utils';

import { createMigratedPostgresFixture } from './postgres-fixture.js';

const { Pool } = pg;
const databaseHarness = createDatabaseHarnessState(process.env);
const integrationTest = databaseHarness.enabled ? test : test.skip;
const ORGANIZATION_ID = '10000000-0000-4000-8000-000000000001';

integrationTest(
  `measures the supported 250-employee dataset and concurrent mutation guard (${databaseHarness.safeLabel})`,
  async () => {
    const fixture = await createMigratedPostgresFixture(databaseHarness.url, 'performance');
    const pool = new Pool({ connectionString: fixture.databaseUrl, max: 20 });

    try {
      await fixture.client.query(
        `insert into organizations (id, name, time_zone) values ($1, 'Performance fixture', 'Europe/Berlin')`,
        [ORGANIZATION_ID],
      );
      await fixture.client.query(
        `insert into employees (id, organization_id, employee_number, display_name)
         select ('20000000-0000-4000-8000-' || lpad(employee_number::text, 12, '0'))::uuid,
                $1, 'PERF-' || lpad(employee_number::text, 3, '0'),
                'Performance Employee ' || employee_number
         from generate_series(1, 250) employee_number`,
        [ORGANIZATION_ID],
      );
      await fixture.client.query(
        `insert into attendance_heads (organization_id, employee_id)
         select organization_id, id from employees where organization_id = $1`,
        [ORGANIZATION_ID],
      );
      await fixture.client.query(
        `insert into daily_projections
          (id, organization_id, employee_id, local_date, calculation_status, projection_version,
           engine_version, source_fingerprint, expected_minutes, worked_minutes, break_minutes,
           absence_credit_minutes, adjustment_minutes, credited_minutes, balance_minutes,
           warning_codes, source_references, calculated_at)
         select md5(employee.id::text || day.local_date::text)::uuid, $1, employee.id,
                day.local_date, 'COMPLETE', 1, 'performance-fixture-v1', repeat('a', 64),
                480, 480, 30, 0, 0, 480, 0, '[]'::jsonb, '{}'::jsonb,
                day.local_date::timestamp + interval '18 hours'
         from employees employee
         cross join lateral (
           select local_date::date
           from generate_series(date '2025-01-01', date '2025-12-31', interval '1 day') local_date
         ) day
         where employee.organization_id = $1`,
        [ORGANIZATION_ID],
      );
      await fixture.client.query(
        `insert into punch_events
          (id, organization_id, employee_id, event_sequence, event_type, occurred_at, command_id)
         select md5(employee.id::text || day.day_number::text || event.event_number::text)::uuid,
                $1, employee.id, ((day.day_number - 1) * 4) + event.event_number,
                (array['CLOCK_IN', 'BREAK_START', 'BREAK_END', 'CLOCK_OUT']::punch_event_type[])[event.event_number],
                timestamp with time zone '2025-10-01 06:00:00+00'
                  + ((day.day_number - 1) * interval '1 day')
                  + ((event.event_number - 1) * interval '3 hours'),
                md5('command-' || employee.id::text || day.day_number::text)::uuid
         from employees employee
         cross join generate_series(1, 90) day(day_number)
         cross join generate_series(1, 4) event(event_number)
         where employee.organization_id = $1`,
        [ORGANIZATION_ID],
      );
      await fixture.client.query(
        `insert into domain_audit_events
          (id, organization_id, actor_kind, actor_system_process, action_code, outcome,
           subject_employee_id, target_kind, target_id, facts, occurred_at)
         select md5(employee.id::text || ':' || day.day_number::text || ':' || event.event_number::text || ':audit')::uuid,
                $1, 'SYSTEM', 'performance-fixture', 'ATTENDANCE_RECALCULATED', 'SUCCESS',
                employee.id, 'ATTENDANCE',
                'attendance-' || day.day_number || '-' || event.event_number,
                '{}'::jsonb,
                timestamp with time zone '2025-10-01 06:00:00+00'
                  + ((day.day_number - 1) * interval '1 day')
                  + (event.event_number * interval '1 minute')
         from employees employee
         cross join generate_series(1, 90) day(day_number)
         cross join generate_series(1, 20) event(event_number)
         where employee.organization_id = $1`,
        [ORGANIZATION_ID],
      );
      await fixture.client.query(
        'analyze employees, daily_projections, punch_events, domain_audit_events',
      );

      const counts = await fixture.client.query<{
        audits: string;
        employees: string;
        projections: string;
        punches: string;
      }>(
        `select
           (select count(*) from employees where organization_id = $1) employees,
           (select count(*) from daily_projections where organization_id = $1) projections,
           (select count(*) from punch_events where organization_id = $1) punches,
           (select count(*) from domain_audit_events where organization_id = $1) audits`,
        [ORGANIZATION_ID],
      );
      expect(counts.rows[0]).toEqual({
        audits: '450000',
        employees: '250',
        projections: '91250',
        punches: '90000',
      });

      const employeeId = '20000000-0000-4000-8000-000000000125';
      const projectionPlan = await explain(
        fixture.client,
        `select * from daily_projections
         where employee_id = $1 and local_date between date '2025-01-01' and date '2025-12-31'
         order by local_date`,
        [employeeId],
      );
      expect(projectionPlan).toContain('daily_projections_employee_date_uidx');

      const auditPlan = await explain(
        fixture.client,
        `select * from domain_audit_events
         where organization_id = $1
         order by occurred_at desc, id desc limit 100 offset 10000`,
        [ORGANIZATION_ID],
      );
      expect(auditPlan).toContain('domain_audit_events_organization_time_idx');

      const projectionLatency = await measuredLatency(() =>
        fixture.client.query(
          `select * from daily_projections
           where employee_id = $1 and local_date between date '2025-01-01' and date '2025-12-31'
           order by local_date`,
          [employeeId],
        ),
      );
      const auditLatency = await measuredLatency(async () => {
        await fixture.client.query(
          `select * from domain_audit_events where organization_id = $1
           order by occurred_at desc, id desc limit 100 offset 10000`,
          [ORGANIZATION_ID],
        );
        await fixture.client.query(
          'select count(*) from domain_audit_events where organization_id = $1',
          [ORGANIZATION_ID],
        );
      });
      expect(projectionLatency.p95Milliseconds).toBeLessThan(1_000);
      expect(auditLatency.p95Milliseconds).toBeLessThan(1_000);

      const mutationResults = await Promise.all(
        Array.from({ length: 20 }, () =>
          pool.query(
            `update attendance_heads
             set state = 'WORKING', attendance_revision = 1, next_event_sequence = 2
             where organization_id = $1 and employee_id = $2 and attendance_revision = 0
             returning attendance_revision`,
            [ORGANIZATION_ID, employeeId],
          ),
        ),
      );
      expect(mutationResults.reduce((total, result) => total + result.rowCount, 0)).toBe(1);

      console.info(
        JSON.stringify({
          auditLatency,
          counts: counts.rows[0],
          projectionLatency,
          scenario: 'WL-1001-supported-scale',
        }),
      );
    } finally {
      await pool.end();
      await fixture.cleanup();
    }
  },
  120_000,
);

async function explain(
  client: pg.Client,
  query: string,
  values: readonly string[],
): Promise<string> {
  const result = await client.query<Record<string, unknown>>(
    `explain (format json) ${query}`,
    values,
  );
  return JSON.stringify(Object.values(result.rows[0] ?? {})[0] ?? null);
}

async function measuredLatency(operation: () => Promise<unknown>): Promise<{
  maximumMilliseconds: number;
  p50Milliseconds: number;
  p95Milliseconds: number;
}> {
  await operation();
  const samples: number[] = [];
  for (let iteration = 0; iteration < 10; iteration += 1) {
    const startedAt = performance.now();
    await operation();
    samples.push(performance.now() - startedAt);
  }
  samples.sort((left, right) => left - right);
  return {
    maximumMilliseconds: round(samples.at(-1) ?? 0),
    p50Milliseconds: round(samples[4] ?? 0),
    p95Milliseconds: round(samples[9] ?? 0),
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
