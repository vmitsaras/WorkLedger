\set ON_ERROR_STOP on
begin;

-- Restored browser credentials and one-time grants must never survive quarantine.
delete from auth_sessions;
delete from auth_verifications;

do $$
declare
  broken_foreign_keys bigint;
  invalid_daily_rows bigint;
  invalid_snapshot_links bigint;
  invalid_snapshot_totals bigint;
begin
  select count(*) into broken_foreign_keys
  from pg_constraint constraint_row
  where constraint_row.contype = 'f'
    and not constraint_row.convalidated;
  if broken_foreign_keys <> 0 then
    raise exception 'restore contains unvalidated foreign keys';
  end if;

  select count(*) into invalid_daily_rows
  from daily_projections
  where credited_minutes <> worked_minutes + absence_credit_minutes + adjustment_minutes
     or balance_minutes <> credited_minutes - expected_minutes;
  if invalid_daily_rows <> 0 then
    raise exception 'daily projection reconciliation failed';
  end if;

  select count(*) into invalid_snapshot_links
  from post_lock_adjustments adjustment
  join approved_monthly_snapshots snapshot on snapshot.id = adjustment.monthly_snapshot_id
  where snapshot.organization_id <> adjustment.organization_id
     or adjustment.minutes <> adjustment.credited_minutes_delta - adjustment.expected_minutes_delta;
  if invalid_snapshot_links <> 0 then
    raise exception 'post-lock snapshot reconciliation failed';
  end if;

  select count(*) into invalid_snapshot_totals
  from approved_monthly_snapshots snapshot_row
  cross join lateral (
    select
      coalesce(sum((day_row->>'workedMinutes')::integer), 0) as worked,
      coalesce(sum((day_row->>'creditedMinutes')::integer), 0) as credited,
      coalesce(sum((day_row->>'expectedMinutes')::integer), 0) as expected,
      coalesce(sum((day_row->>'balanceMinutes')::integer), 0) as balance
    from jsonb_array_elements(snapshot_row.snapshot->'approvedRecord'->'rows') day_row
  ) totals
  where (snapshot_row.snapshot->'approvedRecord'->>'periodVersion')::integer <> snapshot_row.period_version
     or (snapshot_row.snapshot->'approvedRecord'->>'schemaVersion')::integer <> snapshot_row.schema_version
     or snapshot_row.snapshot->'approvedRecord'->>'sourceFingerprint' <> snapshot_row.source_fingerprint
     or snapshot_row.snapshot->'approvedRecord'->>'snapshotFingerprint' <> snapshot_row.snapshot_fingerprint
     or totals.worked <> (snapshot_row.snapshot->'approvedRecord'->'totals'->>'workedMinutes')::integer
     or totals.credited <> (snapshot_row.snapshot->'approvedRecord'->'totals'->>'creditedMinutes')::integer
     or totals.expected <> (snapshot_row.snapshot->'approvedRecord'->'totals'->>'expectedMinutes')::integer
     or totals.balance <> (snapshot_row.snapshot->'approvedRecord'->'totals'->>'balanceMinutes')::integer;
  if invalid_snapshot_totals <> 0 then
    raise exception 'monthly snapshot metadata or totals reconciliation failed';
  end if;
end $$;

select 'organizations' as evidence, count(*)::text as value from organizations
union all select 'employees', count(*)::text from employees
union all select 'punch_events', count(*)::text from punch_events
union all select 'time_account_entries', count(*)::text from time_account_entries
union all select 'leave_entitlement_entries', count(*)::text from leave_entitlement_entries
union all select 'approved_monthly_snapshots', count(*)::text from approved_monthly_snapshots
union all select 'post_lock_adjustments', count(*)::text from post_lock_adjustments
union all select 'domain_audit_events', count(*)::text from domain_audit_events
union all select 'security_audit_events', count(*)::text from security_audit_events
union all select 'restored_sessions', count(*)::text from auth_sessions
union all select 'restored_grants', count(*)::text from auth_verifications;

commit;
