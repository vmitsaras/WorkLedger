import { randomUUID } from 'node:crypto';

import pg from 'pg';

import { createDatabaseHarnessState } from '@workledger/test-utils';

const { Client } = pg;

function createIsolatedSchemaName(): string {
  return `wl_test_${randomUUID().replaceAll('-', '')}`;
}

function quoteIdentifier(identifier: string): string {
  if (!/^[a-z_][a-z0-9_]*$/.test(identifier)) {
    throw new Error(`Unsafe PostgreSQL identifier: ${identifier}`);
  }

  return `"${identifier}"`;
}

const databaseHarness = createDatabaseHarnessState(process.env);
const integrationTest = databaseHarness.enabled ? test : test.skip;

integrationTest(
  `connects to PostgreSQL and cleans up an isolated schema (${databaseHarness.safeLabel})`,
  async () => {
    const schemaName = createIsolatedSchemaName();
    const schemaIdentifier = quoteIdentifier(schemaName);
    const client = new Client({
      application_name: 'workledger-postgres-integration-test',
      connectionString: databaseHarness.url,
      connectionTimeoutMillis: 5_000,
    });

    await client.connect();

    try {
      const identityResult = await client.query<{
        database_name: string;
        user_name: string;
      }>('select current_database() as database_name, current_user as user_name');

      expect(identityResult.rows[0]?.database_name).toBeTruthy();
      expect(identityResult.rows[0]?.user_name).toBeTruthy();

      await client.query(`create schema ${schemaIdentifier}`);
      await client.query(`
        create table ${schemaIdentifier}.lifecycle_probe (
          id integer primary key,
          label text not null
        )
      `);
      await client.query(
        `insert into ${schemaIdentifier}.lifecycle_probe (id, label) values ($1, $2)`,
        [1, 'isolated-test-row'],
      );

      const probeResult = await client.query<{ label: string }>(
        `select label from ${schemaIdentifier}.lifecycle_probe where id = $1`,
        [1],
      );
      expect(probeResult.rows[0]?.label).toBe('isolated-test-row');
    } finally {
      await client.query(`drop schema if exists ${schemaIdentifier} cascade`);
      await client.end();
    }

    const cleanupClient = new Client({
      application_name: 'workledger-postgres-cleanup-check',
      connectionString: databaseHarness.url,
      connectionTimeoutMillis: 5_000,
    });
    await cleanupClient.connect();

    try {
      const cleanupResult = await cleanupClient.query<{ remaining: string }>(
        'select count(*) as remaining from pg_namespace where nspname = $1',
        [schemaName],
      );

      expect(Number(cleanupResult.rows[0]?.remaining ?? -1)).toBe(0);
    } finally {
      await cleanupClient.end();
    }
  },
);
