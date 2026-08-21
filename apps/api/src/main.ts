import { createRuntimeConfig } from './config.js';
import { loadRuntimeEnvironment } from './runtime-environment.js';
import { createApiServer } from './server.js';
import { createWorkLedgerLogger } from './logging/logger.js';
import { WORKLEDGER_VERSION } from './version.js';

async function main() {
  const environment = await loadRuntimeEnvironment(process.env);
  const config = createRuntimeConfig(environment);

  const logger = createWorkLedgerLogger({
    environment: config.environment,
    service: 'workledger-api',
    version: WORKLEDGER_VERSION,
  });

  const server = createApiServer(config, { logger });

  const envPort = process.env['PORT'];
  const port = envPort ? parseInt(envPort, 10) : 3000;
  await server.listen({ host: '0.0.0.0', port });

  logger.info('WorkLedger API started', {
    port,
    environment: config.environment,
  });
}

main().catch((err) => {
  console.error('Fatal API error', err);
  process.exit(1);
});
