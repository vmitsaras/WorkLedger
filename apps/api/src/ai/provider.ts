import {
  AiProviderError,
  type AiProvider,
  type AiProviderConfig,
  type AiProviderHealth,
  type AiProviderRequestOptions,
} from './contracts.js';
import { createOllamaAiProvider, type OllamaAiProviderDependencies } from './ollama-adapter.js';

export interface AiProviderDependencies extends OllamaAiProviderDependencies {}

export function createAiProvider(
  config: AiProviderConfig,
  dependencies: AiProviderDependencies = {},
): AiProvider {
  if (config.mode === 'ollama') return createOllamaAiProvider(config, dependencies);

  const now = dependencies.now ?? (() => new Date().toISOString());
  const health = Object.freeze({
    mode: 'disabled' as const,
    status: 'disabled' as const,
    capabilities: Object.freeze([]),
    checkedAt: now(),
    reasonCode: null,
  });
  return Object.freeze({
    mode: 'disabled' as const,
    async checkHealth(_options: AiProviderRequestOptions = {}): Promise<AiProviderHealth> {
      return health;
    },
    getHealth(): AiProviderHealth {
      return health;
    },
    async generate(): Promise<never> {
      throw new AiProviderError('PROVIDER_DISABLED');
    },
  });
}
