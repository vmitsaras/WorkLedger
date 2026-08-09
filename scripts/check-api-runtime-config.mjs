import { createRuntimeConfig, formatRuntimeConfigSummary } from '../apps/api/dist/config.js';

try {
  const config = createRuntimeConfig(process.env);
  console.log(formatRuntimeConfigSummary(config));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
