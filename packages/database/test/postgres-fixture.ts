import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import pg from 'pg';

const { Client } = pg;
const packageDirectory = fileURLToPath(new URL('..', import.meta.url));
const migrationFiles = ['0000_initial_schema.sql', '0001_integrity_constraints.sql'] as const;
const statementBreakpoint = '--> statement-breakpoint';

export type MigratedPostgresFixture = Readonly<{
  cleanup(): Promise<void>;
  client: pg.Client;
  databaseUrl: string;
  schemaName: string;
}>;

export async function createMigratedPostgresFixture(
  connectionString: string,
  label: string,
): Promise<MigratedPostgresFixture> {
  const schemaName = `wl_${label}_${randomUUID().replaceAll('-', '')}`;
  const schemaIdentifier = quoteIdentifier(schemaName);
  const client = new Client({
    application_name: `workledger-${label}-fixture`,
    connectionString,
    connectionTimeoutMillis: 5_000,
  });
  await client.connect();

  try {
    await client.query(`create schema ${schemaIdentifier}`);
    await client.query(`set search_path to ${schemaIdentifier}, public`);
    await client.query(`select pg_advisory_lock(hashtext('workledger-test-schema-migration'))`);
    try {
      for (const statement of await loadMigrationStatements(schemaIdentifier)) {
        await client.query(statement);
      }
    } finally {
      await client.query(`select pg_advisory_unlock(hashtext('workledger-test-schema-migration'))`);
    }
  } catch (error) {
    await client.query('reset search_path');
    await client.query(`drop schema if exists ${schemaIdentifier} cascade`);
    await client.end();
    throw error;
  }

  const databaseUrl = new URL(connectionString);
  databaseUrl.searchParams.set('options', `-c search_path=${schemaName},public`);
  let cleanedUp = false;

  return Object.freeze({
    async cleanup(): Promise<void> {
      if (cleanedUp) return;
      cleanedUp = true;
      await client.query('reset search_path');
      await client.query(`drop schema if exists ${schemaIdentifier} cascade`);
      await client.end();
    },
    client,
    databaseUrl: databaseUrl.toString(),
    schemaName,
  });
}

function quoteIdentifier(identifier: string): string {
  if (!/^[a-z_][a-z0-9_]*$/.test(identifier)) {
    throw new Error(`Unsafe PostgreSQL identifier: ${identifier}`);
  }
  return `"${identifier}"`;
}

async function loadMigrationStatements(schemaIdentifier: string): Promise<readonly string[]> {
  const statements: string[] = [];
  for (const migrationFile of migrationFiles) {
    const migration = await readFile(`${packageDirectory}/migrations/${migrationFile}`, 'utf8');
    statements.push(
      ...migration
        .replaceAll('"public".', `${schemaIdentifier}.`)
        .split(statementBreakpoint)
        .map((statement) => statement.trim())
        .filter(Boolean),
    );
  }
  return statements;
}
