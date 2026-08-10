import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { getTableConfig } from 'drizzle-orm/pg-core';

import {
  accountEmployeeLinks,
  accountRoleAssignments,
  approvedMonthlySnapshots,
  authAccounts,
  authSessions,
  authUsers,
  dailyProjections,
  employmentPeriods,
  punchEvents,
  timeAccountEntries,
} from '../src/schema/index.js';

const packageDirectory = fileURLToPath(new URL('..', import.meta.url));

describe('initial PostgreSQL schema', () => {
  it('uses UUIDv7 defaults and the expected projection/ledger keys', () => {
    expect(getTableConfig(punchEvents).columns.find(({ name }) => name === 'id')?.hasDefault).toBe(
      true,
    );
    expect(getTableConfig(dailyProjections).indexes.map(({ config }) => config.name)).toContain(
      'daily_projections_employee_date_uidx',
    );
    expect(getTableConfig(timeAccountEntries).indexes.map(({ config }) => config.name)).toContain(
      'time_account_entries_employee_source_uidx',
    );
  });

  it('keeps authoritative facts separate from replaceable projections and approved snapshots', () => {
    expect(getTableConfig(punchEvents).name).toBe('punch_events');
    expect(getTableConfig(dailyProjections).name).toBe('daily_projections');
    expect(getTableConfig(approvedMonthlySnapshots).name).toBe('approved_monthly_snapshots');
    expect(getTableConfig(employmentPeriods).name).toBe('employment_periods');
  });

  it('maps the Better Auth persistence surface without exposing domain roles', () => {
    expect(getTableConfig(authUsers).name).toBe('auth_users');
    expect(getTableConfig(authSessions).indexes.map(({ config }) => config.name)).toContain(
      'auth_sessions_token_uidx',
    );
    expect(getTableConfig(authAccounts).indexes.map(({ config }) => config.name)).toContain(
      'auth_accounts_provider_account_uidx',
    );
    expect(getTableConfig(authUsers).columns.map(({ name }) => name)).not.toContain('role');
  });

  it('keeps application roles and employee links outside Better Auth records', () => {
    expect(getTableConfig(accountEmployeeLinks).indexes.map(({ config }) => config.name)).toEqual(
      expect.arrayContaining([
        'account_employee_links_active_employee_uidx',
        'account_employee_links_active_user_uidx',
      ]),
    );
    expect(
      getTableConfig(accountRoleAssignments).indexes.map(({ config }) => config.name),
    ).toContain('account_role_assignments_active_role_uidx');
  });

  it('commits generated and custom migration metadata', () => {
    const journal = JSON.parse(
      readFileSync(`${packageDirectory}/migrations/meta/_journal.json`, 'utf8'),
    ) as { entries: Array<{ tag: string }> };

    expect(journal.entries.map(({ tag }) => tag)).toEqual([
      '0000_initial_schema',
      '0001_integrity_constraints',
      '0002_auth_foundation',
      '0003_authorization_foundation',
    ]);
  });
});
