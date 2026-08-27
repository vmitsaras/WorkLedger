import { performance } from 'node:perf_hooks';

import type { WorkLedgerLogger } from '../logging/logger.js';
import type { AiProvider, AiProviderHealth } from './contracts.js';

export async function checkAiProviderAtStartup(
  provider: AiProvider,
  logger: WorkLedgerLogger,
): Promise<AiProviderHealth> {
  const startedAt = performance.now();
  const health = await provider.checkHealth();
  const data = {
    dependency: 'ai-provider',
    operation: 'startup-health-check',
    latencyMs: Math.round(performance.now() - startedAt),
    providerMode: health.mode,
    providerStatus: health.status,
    providerCapabilities: health.capabilities,
    providerReasonCode: health.reasonCode,
    checkedAt: health.checkedAt,
  };

  if (health.status === 'ready' || health.status === 'disabled') {
    logger.info('AI provider startup health check completed', data);
  } else {
    logger.warn('AI provider startup health check did not pass', data);
  }
  return health;
}
