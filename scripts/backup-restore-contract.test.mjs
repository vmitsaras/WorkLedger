import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('restore compose remains quarantined and cannot send mail or publish ports', async () => {
  const compose = await readFile('infra/compose/restore.yml', 'utf8');
  assert.match(compose, /internal: true/);
  assert.match(compose, /restore_postgres_password/);
  assert.doesNotMatch(compose, /^\s+ports:/m);
  assert.doesNotMatch(compose, /smtp|mail|webhook|caddy|api:/i);
});

test('restore verification revokes credentials and reconciles protected history', async () => {
  const sql = await readFile('scripts/sql/verify-restored-database.sql', 'utf8');
  for (const required of [
    'delete from auth_sessions',
    'delete from auth_verifications',
    'daily projection reconciliation failed',
    'monthly snapshot metadata or totals reconciliation failed',
    'post-lock snapshot reconciliation failed',
    'punch_events',
    'time_account_entries',
    'leave_entitlement_entries',
    'domain_audit_events',
    'security_audit_events',
  ]) {
    assert.match(sql, new RegExp(required));
  }
});

test('restore orchestration rejects unsafe paths and version drift before decryption', async () => {
  const restore = await readFile('scripts/workledger-restore.mjs', 'utf8');
  assert.match(restore, /Manifest artifact path is unsafe/);
  assert.match(restore, /matching application and schema version/);
  assert.match(restore, /checksum mismatch/);
  assert.match(restore, /Backup has expired/);
});
