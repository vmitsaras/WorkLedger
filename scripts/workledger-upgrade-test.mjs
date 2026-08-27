#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;

/**
 * Test upgrade from a prior release fixture to current version.
 *
 * This script:
 * 1. Creates a test database schema at 0.9.0 migration checkpoint
 * 2. Seeds representative domain data
 * 3. Applies migrations from 0.9.0 through current
 * 4. Validates data integrity and auth profile
 *
 * Usage:
 *   node scripts/workledger-upgrade-test.mjs [--database-url URL]
 */

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  console.log(`Usage: node scripts/workledger-upgrade-test.mjs [options]

Options:
  --database-url URL     PostgreSQL connection URL (defaults to test database)
  --from-version VER     Version to upgrade from (default: 0.9.0)
  --help                 Show this help
`);
  process.exit(0);
}

const databaseUrl =
  args.databaseUrl ??
  process.env.WORKLEDGER_TEST_DATABASE_URL ??
  'postgresql://workledger_test:workledger_test_password@127.0.0.1:54329/workledger_test';
const fromVersion = args.fromVersion ?? '0.9.0';
const packageRoot = fileURLToPath(new URL('..', import.meta.url));

console.log(`Testing upgrade from ${fromVersion} to current...`);

const pool = new Pool({ connectionString: databaseUrl, max: 1 });
const schemaName = `upgrade_test_${Date.now()}`;

try {
  await pool.query(`create schema ${schemaName}`);
  await pool.query(`set search_path to ${schemaName}`);

  // Step 1: Apply migrations up to from-version checkpoint
  const migrationCheckpoint = getMigrationCheckpoint(fromVersion);
  console.log(`Applying migrations up to ${migrationCheckpoint}...`);

  const migrationFiles = await readMigrationList();
  const checkpointIndex = migrationFiles.findIndex((file) => file.includes(migrationCheckpoint));

  if (checkpointIndex === -1) {
    throw new Error(`Migration checkpoint ${migrationCheckpoint} not found`);
  }

  for (let index = 0; index <= checkpointIndex; index += 1) {
    const migrationPath = `${packageRoot}/packages/database/migrations/${migrationFiles[index]}`;
    const migrationSql = await readFile(migrationPath, 'utf8');
    await applyMigration(pool, schemaName, migrationSql);
  }

  console.log(`✓ Applied ${checkpointIndex + 1} migrations to ${fromVersion}`);

  // Step 2: Seed representative domain data
  console.log('Seeding test data...');
  await seedTestData(pool, schemaName);
  console.log('✓ Test data seeded');

  // Step 3: Record pre-upgrade baseline
  const preUpgrade = await captureBaseline(pool, schemaName);
  console.log('✓ Pre-upgrade baseline captured');
  console.log(`  Organizations: ${preUpgrade.organizationCount}`);
  console.log(`  Employees: ${preUpgrade.employeeCount}`);
  console.log(`  Accounts: ${preUpgrade.accountCount}`);
  console.log(`  Punches: ${preUpgrade.punchCount}`);
  console.log(`  Ledger entries: ${preUpgrade.ledgerEntryCount}`);

  // Step 4: Apply remaining migrations
  console.log('Applying remaining migrations...');
  for (let index = checkpointIndex + 1; index < migrationFiles.length; index += 1) {
    const migrationPath = `${packageRoot}/packages/database/migrations/${migrationFiles[index]}`;
    const migrationSql = await readFile(migrationPath, 'utf8');
    await applyMigration(pool, schemaName, migrationSql);
  }
  console.log(`✓ Applied ${migrationFiles.length - checkpointIndex - 1} additional migrations`);

  // Step 5: Verify post-upgrade state
  console.log('Verifying post-upgrade state...');
  const postUpgrade = await captureBaseline(pool, schemaName);

  // Row counts should be preserved
  if (postUpgrade.organizationCount !== preUpgrade.organizationCount) {
    throw new Error(
      `Organization count mismatch: ${preUpgrade.organizationCount} → ${postUpgrade.organizationCount}`,
    );
  }
  if (postUpgrade.employeeCount !== preUpgrade.employeeCount) {
    throw new Error(
      `Employee count mismatch: ${preUpgrade.employeeCount} → ${postUpgrade.employeeCount}`,
    );
  }
  if (postUpgrade.accountCount !== preUpgrade.accountCount) {
    throw new Error(
      `Account count mismatch: ${preUpgrade.accountCount} → ${postUpgrade.accountCount}`,
    );
  }
  if (postUpgrade.punchCount !== preUpgrade.punchCount) {
    throw new Error(`Punch count mismatch: ${preUpgrade.punchCount} → ${postUpgrade.punchCount}`);
  }
  // Ledger may grow due to adjustments, but should not shrink
  if (postUpgrade.ledgerEntryCount < preUpgrade.ledgerEntryCount) {
    throw new Error(
      `Ledger entry count decreased: ${preUpgrade.ledgerEntryCount} → ${postUpgrade.ledgerEntryCount}`,
    );
  }

  console.log('✓ Row counts preserved');

  // Step 6: Run integrity checks
  console.log('Running integrity checks...');
  await runIntegrityChecks(pool, schemaName);
  console.log('✓ Integrity checks passed');

  // Step 7: Verify auth profile compatibility
  console.log('Verifying auth profile compatibility...');
  await verifyAuthProfile(pool, schemaName);
  console.log('✓ Auth profile compatible');

  console.log(`\n✓ Upgrade test from ${fromVersion} to current PASSED`);
} catch (error) {
  console.error('\n✗ Upgrade test FAILED');
  console.error(formatError(error));
  process.exitCode = 1;
} finally {
  try {
    await pool.query(`drop schema if exists ${schemaName} cascade`);
  } catch {
    // Cleanup failure is not critical
  }
  await pool.end();
}

function getMigrationCheckpoint(version) {
  // Map versions to their last migration tag
  const checkpoints = {
    '0.9.0': '0017_boring_aaron_stack', // Phase 9 completion
    '0.10.0': '0020_chemical_micromacro', // Phase 10 in progress (current)
  };
  return checkpoints[version] ?? checkpoints['0.9.0'];
}

async function readMigrationList() {
  const journal = JSON.parse(
    await readFile(`${packageRoot}/packages/database/migrations/meta/_journal.json`, 'utf8'),
  );
  return journal.entries.map((entry) => `${entry.tag}.sql`);
}

async function seedTestData(pool, schemaName) {
  // Create one organization
  const orgResult = await pool.query(
    `insert into ${schemaName}.organizations (name, time_zone) values ($1, $2) returning id`,
    ['Upgrade Test Organization', 'Europe/Amsterdam'],
  );
  const organizationId = orgResult.rows[0].id;

  // Create two employees
  const emp1Result = await pool.query(
    `insert into ${schemaName}.employees (organization_id, employee_number, display_name, status)
     values ($1, $2, $3, $4) returning id`,
    [organizationId, 'EMP-001', 'Test Employee One', 'ACTIVE'],
  );
  const employee1Id = emp1Result.rows[0].id;

  await pool.query(
    `insert into ${schemaName}.employees (organization_id, employee_number, display_name, status)
     values ($1, $2, $3, $4) returning id`,
    [organizationId, 'EMP-002', 'Test Employee Two', 'ACTIVE'],
  );

  // Create auth accounts (using Better Auth schema)
  const accountResult1 = await pool.query(
    `insert into ${schemaName}.auth_users (name, email, email_verified)
     values ($1, $2, true) returning id`,
    ['Upgrade Test Account', 'employee1@example.test'],
  );
  const userId1 = accountResult1.rows[0].id;

  await pool.query(
    `insert into ${schemaName}.auth_accounts (user_id, provider_id, account_id, password)
     values ($1, 'credential', $2, $3)`,
    [
      userId1,
      String(userId1),
      '$2b$10$abcdefghijklmnopqrstuv.abcdefghijklmnopqrstuv', // dummy hash
    ],
  );

  // Create immutable punch events for employee1
  await pool.query(
    `insert into ${schemaName}.punch_events
     (organization_id, employee_id, event_sequence, event_type, occurred_at, actor_employee_id, command_id)
     values ($1, $2, 1, 'CLOCK_IN', '2026-08-01 08:00:00+00', $2, gen_random_uuid())`,
    [organizationId, employee1Id],
  );

  await pool.query(
    `insert into ${schemaName}.punch_events
     (organization_id, employee_id, event_sequence, event_type, occurred_at, actor_employee_id, command_id)
     values ($1, $2, 2, 'CLOCK_OUT', '2026-08-01 17:00:00+00', $2, gen_random_uuid())`,
    [organizationId, employee1Id],
  );

  // Create explainable time-ledger entries
  await pool.query(
    `insert into ${schemaName}.time_account_entries
     (organization_id, employee_id, local_date, entry_type, minutes, source_id,
      source_fingerprint, actor_kind, actor_id, explanation_code, posted_at)
     values ($1, $2, '2026-07-31', 'OPENING_BALANCE', 0, gen_random_uuid(),
      repeat('a', 64), 'SYSTEM', 'upgrade-fixture', 'OPENING_BALANCE', '2026-07-31 23:00:00+00')`,
    [organizationId, employee1Id],
  );

  await pool.query(
    `insert into ${schemaName}.time_account_entries
     (organization_id, employee_id, local_date, entry_type, minutes, source_id,
      source_fingerprint, actor_kind, actor_id, explanation_code, posted_at)
     values ($1, $2, '2026-08-01', 'DAILY_DELTA', 60, gen_random_uuid(),
      repeat('b', 64), 'SYSTEM', 'upgrade-fixture', 'DAILY_BALANCE', '2026-08-01 18:00:00+00')`,
    [organizationId, employee1Id],
  );
}

async function captureBaseline(pool, schemaName) {
  const orgCount = await pool.query(`select count(*) from ${schemaName}.organizations`);
  const empCount = await pool.query(`select count(*) from ${schemaName}.employees`);
  const accountCount = await pool.query(`select count(*) from ${schemaName}.auth_users`);
  const punchCount = await pool.query(`select count(*) from ${schemaName}.punch_events`);
  const ledgerCount = await pool.query(`select count(*) from ${schemaName}.time_account_entries`);

  return {
    organizationCount: Number(orgCount.rows[0].count),
    employeeCount: Number(empCount.rows[0].count),
    accountCount: Number(accountCount.rows[0].count),
    punchCount: Number(punchCount.rows[0].count),
    ledgerEntryCount: Number(ledgerCount.rows[0].count),
  };
}

async function runIntegrityChecks(pool, schemaName) {
  // Check foreign key integrity
  const fkCheck = await pool.query(`
    select count(*) from ${schemaName}.employees e
    where not exists (select 1 from ${schemaName}.organizations o where o.id = e.organization_id)
  `);
  if (Number(fkCheck.rows[0].count) > 0) {
    throw new Error('Foreign key integrity violation detected');
  }

  // Check punch immutability (no duplicate sequence per employee)
  const punchCheck = await pool.query(`
    select employee_id, event_sequence, count(*)
    from ${schemaName}.punch_events
    group by employee_id, event_sequence
    having count(*) > 1
  `);
  if (punchCheck.rows.length > 0) {
    throw new Error('Duplicate punch detected (immutability violation)');
  }

  // Check every ledger entry retains its required explanation evidence.
  const ledgerCheck = await pool.query(`
    select id
    from ${schemaName}.time_account_entries
    where length(source_fingerprint) <> 64
       or length(btrim(actor_id)) = 0
       or length(btrim(explanation_code)) = 0
  `);
  if (ledgerCheck.rows.length > 0) {
    throw new Error('Ledger explanation evidence is incomplete');
  }

  // Check snapshot links (if post-lock adjustments exist)
  const snapshotLinkCheck = await pool.query(
    `
    select count(*) from information_schema.tables
    where table_schema = $1 and table_name = 'absence_cancellation_snapshot_links'
  `,
    [schemaName],
  );

  if (Number(snapshotLinkCheck.rows[0].count) > 0) {
    const linkIntegrity = await pool.query(`
      select count(*) from ${schemaName}.absence_cancellation_snapshot_links l
      where not exists (
        select 1 from ${schemaName}.absence_cancellations c
        where c.id = l.absence_cancellation_id
      ) or not exists (
        select 1 from ${schemaName}.approved_monthly_snapshots s
        where s.id = l.monthly_snapshot_id
      )
    `);
    if (Number(linkIntegrity.rows[0].count) > 0) {
      throw new Error('Snapshot link integrity violation detected');
    }
  }
}

async function verifyAuthProfile(pool, schemaName) {
  // Check that Better Auth tables exist and migrated accounts have the expected profile.
  const userColumns = await pool.query(
    `
    select column_name from information_schema.columns
    where table_schema = $1 and table_name = 'auth_users'
    order by ordinal_position
  `,
    [schemaName],
  );

  const expectedUserColumns = [
    'id',
    'email',
    'email_verified',
    'name',
    'image',
    'active',
    'created_at',
    'updated_at',
    'locale',
  ];
  const actualUserColumns = userColumns.rows.map((row) => row.column_name);

  for (const expectedCol of expectedUserColumns) {
    if (!actualUserColumns.includes(expectedCol)) {
      throw new Error(`Missing expected user column: ${expectedCol}`);
    }
  }

  // Check that accounts can be queried
  const accountCheck = await pool.query(`
    select count(*) from ${schemaName}.auth_accounts
  `);
  if (Number(accountCheck.rows[0].count) < 1) {
    console.warn('  Warning: No accounts found after upgrade');
  }

  // Verify session table exists (sessions may be empty in test data)
  const sessionTable = await pool.query(
    `
    select count(*) from information_schema.tables
    where table_schema = $1 and table_name = 'auth_sessions'
  `,
    [schemaName],
  );

  if (Number(sessionTable.rows[0].count) === 0) {
    throw new Error('Session table missing after upgrade');
  }

  const migratedLocales = await pool.query(`
    select distinct locale from ${schemaName}.auth_users
  `);
  if (migratedLocales.rows.length !== 1 || migratedLocales.rows[0]?.locale !== 'en-GB') {
    throw new Error('Existing accounts did not migrate to the en-GB locale');
  }

  await pool.query(`update ${schemaName}.auth_users set locale = 'de-DE'`);
  const supportedLocale = await pool.query(`
    select locale from ${schemaName}.auth_users limit 1
  `);
  if (supportedLocale.rows[0]?.locale !== 'de-DE') {
    throw new Error('Supported account locale could not be persisted after upgrade');
  }

  try {
    await pool.query(`update ${schemaName}.auth_users set locale = 'en-US'`);
    throw new Error('Unsupported account locale was accepted after upgrade');
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes('auth_users_locale_supported')) {
      throw error;
    }
  }
}

async function applyMigration(pool, schemaName, migrationSql) {
  const schemaIdentifier = `"${schemaName}"`;
  const statements = migrationSql
    .replaceAll('"public".', `${schemaIdentifier}.`)
    .split('--> statement-breakpoint')
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await pool.query(statement);
  }
}

function formatError(error) {
  if (error instanceof AggregateError) {
    return error.errors.map((nestedError) => formatError(nestedError)).join('\n');
  }
  if (error instanceof Error) return error.stack ?? error.message;
  return String(error);
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--help') return { help: true };
    if (argv[index] === '--database-url') {
      parsed.databaseUrl = argv[++index];
    } else if (argv[index] === '--from-version') {
      parsed.fromVersion = argv[++index];
    }
  }
  return parsed;
}
