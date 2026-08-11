import { DevelopmentSeedError, seedDevelopmentDatabase } from './development.js';

const defaultPostgresPort = process.env['WORKLEDGER_POSTGRES_PORT']?.trim() || '54329';
const DEFAULT_MIGRATION_DATABASE_URL = `postgres://workledger_migrator:workledger_migration_password@127.0.0.1:${defaultPostgresPort}/workledger_dev`;

async function main(): Promise<void> {
  const result = await seedDevelopmentDatabase({
    applyMigrations: true,
    connectionString:
      process.env['WORKLEDGER_MIGRATION_DATABASE_URL']?.trim() || DEFAULT_MIGRATION_DATABASE_URL,
    environment: process.env['NODE_ENV'] === 'production' ? 'production' : 'development',
  });
  console.log(
    `Northstar development seed ${result.status.toLowerCase()}: ${result.personaCount} personas; anchor=${result.anchorDate}.`,
  );
  console.log('Development-only credentials are documented in docs/48-development-seed.md.');
}

main().catch((error) => {
  console.error(
    error instanceof DevelopmentSeedError
      ? `Development seed rejected: ${error.reason}.`
      : 'Development seed failed. Inspect restricted database diagnostics; no seed payload was logged.',
  );
  process.exitCode = 1;
});
