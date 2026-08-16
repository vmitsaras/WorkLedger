import { createRuntimeConfig } from './config.js';
import { createApiServer } from './server.js';

async function main() {
  const config = createRuntimeConfig(process.env);
  const server = createApiServer(config);

  const envPort = process.env['PORT'];
  const port = envPort ? parseInt(envPort, 10) : 3000;
  await server.listen({ host: '0.0.0.0', port });
  console.log(`WorkLedger API started on port ${port}`);
}

main().catch((err) => {
  console.error('Fatal API error', err);
  process.exit(1);
});
