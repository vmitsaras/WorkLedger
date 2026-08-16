import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

const { Pool } = pg;

async function readDatabaseUrl(): Promise<string> {
  const directValue = process.env['WORKLEDGER_DATABASE_URL']?.trim();
  const filePath = process.env['WORKLEDGER_DATABASE_URL_FILE']?.trim();
  if (directValue && filePath) {
    throw new Error('Configure WORKLEDGER_DATABASE_URL or WORKLEDGER_DATABASE_URL_FILE, not both.');
  }
  const value = filePath ? (await readFile(filePath, 'utf8')).trim() : directValue;
  if (!value) throw new Error('A production database URL is required to apply migrations.');
  return value;
}

async function main(): Promise<void> {
  const pool = new Pool({
    application_name: 'workledger-migrations',
    connectionString: await readDatabaseUrl(),
    connectionTimeoutMillis: 10_000,
    max: 1,
  });
  try {
    await migrate(drizzle(pool), {
      migrationsFolder: fileURLToPath(new URL('../migrations', import.meta.url)),
    });
    console.log('WorkLedger database migrations applied.');
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Database migration failed.');
  process.exitCode = 1;
});
