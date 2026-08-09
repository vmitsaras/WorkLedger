import pg from 'pg';

const { Client } = pg;

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = '54329';
const DEFAULT_DATABASE = 'workledger_dev';
const DEFAULT_USER = 'workledger_app';
const DEFAULT_PASSWORD = 'workledger_dev_password';

function createDefaultDatabaseUrl() {
  const port = process.env.WORKLEDGER_POSTGRES_PORT?.trim() || DEFAULT_PORT;
  return `postgres://${DEFAULT_USER}:${DEFAULT_PASSWORD}@${DEFAULT_HOST}:${port}/${DEFAULT_DATABASE}`;
}

function createSafeDatabaseUrlLabel(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('WORKLEDGER_DATABASE_URL must be a valid URL.');
  }

  if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') {
    throw new Error('WORKLEDGER_DATABASE_URL must use a postgres:// or postgresql:// URL.');
  }

  parsed.username = parsed.username ? '<user>' : '';
  parsed.password = parsed.password ? '<redacted>' : '';
  return parsed.toString();
}

async function main() {
  const databaseUrl = process.env.WORKLEDGER_DATABASE_URL?.trim() || createDefaultDatabaseUrl();
  const safeUrl = createSafeDatabaseUrlLabel(databaseUrl);
  const client = new Client({
    application_name: 'workledger-local-postgres-healthcheck',
    connectionString: databaseUrl,
    connectionTimeoutMillis: 5_000,
  });

  try {
    await client.connect();
    const result = await client.query({
      text: 'select current_database() as database_name, current_user as user_name',
    });
    const row = result.rows[0];
    console.log(
      `PostgreSQL reachable at ${safeUrl}; database=${row.database_name}; user=${row.user_name}.`,
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  const databaseUrl = process.env.WORKLEDGER_DATABASE_URL?.trim() || createDefaultDatabaseUrl();
  let safeUrl = '<invalid database URL>';
  try {
    safeUrl = createSafeDatabaseUrlLabel(databaseUrl);
  } catch {
    // Keep diagnostics free of raw connection strings when URL parsing fails.
  }

  console.error(`PostgreSQL health check failed for ${safeUrl}.`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
