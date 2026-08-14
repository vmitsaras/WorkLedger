import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { getTableConfig } from 'drizzle-orm/pg-core';

import {
  accountEmployeeLinks,
  accountRoleAssignments,
  absenceCancellationDecisions,
  absenceDecisions,
  absenceTypes,
  approvedMonthlySnapshots,
  authAccounts,
  authSessions,
  authUsers,
  correctionDecisions,
  correctionRequests,
  dailyProjections,
  domainAuditEvents,
  employmentPeriods,
  idempotencyRecords,
  monthlyPeriods,
  monthlyPeriodDecisions,
  notificationDeliveryAttempts,
  notifications,
  punchEvents,
  postLockAdjustments,
  securityAuditEvents,
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

  it('persists absence-type versions with an explicit valid date range', () => {
    const absenceTypeConfiguration = getTableConfig(absenceTypes);

    expect(absenceTypeConfiguration.columns.map(({ name }) => name)).toEqual(
      expect.arrayContaining(['active', 'policy', 'valid_from', 'valid_to', 'version']),
    );
    expect(absenceTypeConfiguration.checks.map(({ name }) => name)).toContain(
      'absence_types_valid_date_range',
    );
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

  it('separates domain and security audit storage with audience-specific indexes', () => {
    expect(getTableConfig(domainAuditEvents).name).toBe('domain_audit_events');
    expect(getTableConfig(securityAuditEvents).name).toBe('security_audit_events');
    expect(getTableConfig(domainAuditEvents).indexes.map(({ config }) => config.name)).toContain(
      'domain_audit_events_employee_time_idx',
    );
    expect(getTableConfig(securityAuditEvents).indexes.map(({ config }) => config.name)).toContain(
      'security_audit_events_account_time_idx',
    );
  });

  it('scopes attendance idempotency by organization, actor account, and protected key', () => {
    expect(getTableConfig(idempotencyRecords).indexes.map(({ config }) => config.name)).toEqual(
      expect.arrayContaining([
        'idempotency_records_scope_key_uidx',
        'idempotency_records_employee_created_idx',
      ]),
    );
    expect(getTableConfig(idempotencyRecords).columns.map(({ name }) => name)).not.toContain(
      'actor_scope',
    );
  });

  it('records approval actors by account and authority without requiring an employee link', () => {
    for (const table of [correctionDecisions, absenceDecisions, absenceCancellationDecisions]) {
      const columns = getTableConfig(table).columns;
      expect(columns.find(({ name }) => name === 'actor_account_id')?.notNull).toBe(true);
      expect(columns.find(({ name }) => name === 'actor_authority')?.notNull).toBe(true);
      expect(columns.find(({ name }) => name === 'actor_employee_id')?.notNull).toBe(false);
    }
  });

  it('records current monthly submission actor and exact source fingerprint', () => {
    const configuration = getTableConfig(monthlyPeriods);
    expect(configuration.columns.map(({ name }) => name)).toEqual(
      expect.arrayContaining([
        'submitted_at',
        'submitted_by_account_id',
        'submitted_source_fingerprint',
      ]),
    );
    expect(configuration.checks.map(({ name }) => name)).toContain(
      'monthly_periods_submitted_fingerprint_format',
    );
  });

  it('records account-first immutable monthly decisions and approval cycles', () => {
    const decisionColumns = getTableConfig(monthlyPeriodDecisions).columns;
    expect(decisionColumns.find(({ name }) => name === 'actor_account_id')?.notNull).toBe(true);
    expect(decisionColumns.find(({ name }) => name === 'actor_authority')?.notNull).toBe(true);
    expect(decisionColumns.find(({ name }) => name === 'actor_employee_id')?.notNull).toBe(false);

    const snapshotColumns = getTableConfig(approvedMonthlySnapshots).columns;
    expect(snapshotColumns.find(({ name }) => name === 'approval_cycle')?.notNull).toBe(true);
    expect(snapshotColumns.find(({ name }) => name === 'approved_by_account_id')?.notNull).toBe(
      true,
    );
    expect(snapshotColumns.find(({ name }) => name === 'approved_by_authority')?.notNull).toBe(
      true,
    );
    expect(snapshotColumns.find(({ name }) => name === 'approved_by_employee_id')?.notNull).toBe(
      false,
    );
  });

  it('links correction requests and append-only adjustment versions to locked snapshots', () => {
    expect(getTableConfig(correctionRequests).columns.map(({ name }) => name)).toContain(
      'locked_monthly_snapshot_id',
    );
    const adjustmentConfiguration = getTableConfig(postLockAdjustments);
    expect(adjustmentConfiguration.columns.map(({ name }) => name)).toEqual(
      expect.arrayContaining([
        'adjustment_version',
        'applied_correction_id',
        'correction_decision_id',
        'correction_request_id',
        'previous_adjusted_worked_minutes',
        'proposed_worked_minutes',
        'reverses_adjustment_id',
      ]),
    );
    expect(adjustmentConfiguration.indexes.map(({ config }) => config.name)).toEqual(
      expect.arrayContaining([
        'post_lock_adjustments_applied_correction_uidx',
        'post_lock_adjustments_snapshot_version_uidx',
      ]),
    );
    expect(adjustmentConfiguration.checks.map(({ name }) => name)).toEqual(
      expect.arrayContaining([
        'post_lock_adjustments_linkage_shape',
        'post_lock_adjustments_positive_version',
        'post_lock_adjustments_worked_delta_reconciles',
      ]),
    );
    expect(adjustmentConfiguration.checks.map(({ name }) => name)).not.toContain(
      'post_lock_adjustments_non_zero_minutes',
    );

    const migration = readFileSync(`${packageDirectory}/migrations/0018_bored_medusa.sql`, 'utf8');
    expect(migration).toContain('correction_requests_locked_snapshot_organization_fk');
    expect(migration).toContain('applied_corrections_request_organization_fk');
    expect(migration).toContain('post_lock_adjustments_request_organization_fk');
    expect(migration).toContain('post_lock_adjustments_reversal_organization_fk');
  });

  it('keeps generic notification history separate from append-only delivery attempts', () => {
    const notificationConfiguration = getTableConfig(notifications);
    const attemptConfiguration = getTableConfig(notificationDeliveryAttempts);

    expect(notificationConfiguration.columns.map(({ name }) => name)).toEqual(
      expect.arrayContaining([
        'dismissed_at',
        'recipient_account_id',
        'recipient_employee_id',
        'source_id',
        'source_kind',
        'source_version',
      ]),
    );
    expect(notificationConfiguration.indexes.map(({ config }) => config.name)).toContain(
      'notifications_source_recipient_event_version_uidx',
    );
    expect(attemptConfiguration.indexes.map(({ config }) => config.name)).toContain(
      'notification_delivery_attempts_number_uidx',
    );
    expect(attemptConfiguration.checks.map(({ name }) => name)).toEqual(
      expect.arrayContaining([
        'notification_delivery_attempts_outcome_shape',
        'notification_delivery_attempts_positive_number',
      ]),
    );
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
      '0004_audit_foundation',
      '0005_idempotency_foundation',
      '0006_zero_daily_delta',
      '0007_correction_request_snapshots',
      '0008_nappy_bromley',
      '0009_married_justin_hammer',
      '0010_broad_sunfire',
      '0011_nasty_red_hulk',
      '0012_silly_magik',
      '0013_brave_bulldozer',
      '0014_adorable_piledriver',
      '0015_rainy_nightshade',
      '0016_flimsy_oracle',
      '0017_boring_aaron_stack',
      '0018_bored_medusa',
      '0019_stale_loners',
    ]);
  });
});
