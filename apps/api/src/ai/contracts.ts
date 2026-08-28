export const AI_PROVIDER_REQUIRED_CAPABILITIES = ['CHAT', 'STRUCTURED_OUTPUT', 'TOOLS'] as const;

export type AiProviderCapability = (typeof AI_PROVIDER_REQUIRED_CAPABILITIES)[number];

export interface DisabledAiProviderConfig {
  readonly mode: 'disabled';
}

export interface OllamaAiProviderConfig {
  readonly mode: 'ollama';
  readonly origin: string;
  readonly model: string;
  readonly modelDigest: string;
  readonly timeoutMs: number;
  readonly concurrencyLimit: number;
  readonly requiredCapabilities: readonly AiProviderCapability[];
}

export type AiProviderConfig = DisabledAiProviderConfig | OllamaAiProviderConfig;

export type AiProviderHealthStatus = 'disabled' | 'ready' | 'unavailable' | 'misconfigured';

export type AiProviderHealthReasonCode =
  | 'ADDRESS_MISMATCH'
  | 'CANCELLED'
  | 'CAPABILITY_MISSING'
  | 'CAPABILITY_PROBE_FAILED'
  | 'CLOUD_MODEL_DENIED'
  | 'CONCURRENCY_LIMIT'
  | 'CONNECTION_FAILED'
  | 'DNS_RESOLUTION_FAILED'
  | 'INVALID_RESPONSE'
  | 'MODEL_DIGEST_MISMATCH'
  | 'MODEL_NOT_FOUND'
  | 'NON_PRIVATE_ADDRESS'
  | 'REDIRECT_DENIED'
  | 'TIMEOUT'
  | 'UNEXPECTED_STATUS';

export interface AiProviderHealth {
  readonly mode: AiProviderConfig['mode'];
  readonly status: AiProviderHealthStatus;
  readonly capabilities: readonly AiProviderCapability[];
  readonly checkedAt: string;
  readonly reasonCode: AiProviderHealthReasonCode | null;
}

export type AiProviderErrorCode =
  | AiProviderHealthReasonCode
  | 'PROVIDER_BUSY'
  | 'PROVIDER_DISABLED'
  | 'PROVIDER_NOT_READY'
  | 'REQUEST_INVALID';

export class AiProviderError extends Error {
  readonly code: AiProviderErrorCode;

  constructor(code: AiProviderErrorCode) {
    super('The AI provider request could not be completed.');
    this.name = 'AiProviderError';
    this.code = code;
  }
}

export interface AiProviderToolCall {
  readonly id?: string;
  readonly name: string;
  readonly arguments: unknown;
}

export interface AiProviderMessage {
  readonly role: 'assistant' | 'system' | 'tool' | 'user';
  readonly content: string;
  readonly toolName?: string;
  readonly toolCalls?: readonly AiProviderToolCall[];
}

export interface AiProviderTool {
  readonly name: string;
  readonly description: string;
  readonly parameters: Readonly<Record<string, unknown>>;
}

export interface AiProviderRequest {
  readonly messages: readonly AiProviderMessage[];
  readonly tools: readonly AiProviderTool[];
  readonly outputSchema: Readonly<Record<string, unknown>>;
}

export interface AiProviderResponse {
  readonly content: string;
  readonly toolCalls: readonly AiProviderToolCall[];
}

export interface AiProviderRequestOptions {
  readonly signal?: AbortSignal;
}

export interface AiProvider {
  readonly mode: AiProviderConfig['mode'];
  checkHealth(options?: AiProviderRequestOptions): Promise<AiProviderHealth>;
  getHealth(): AiProviderHealth;
  generate(
    request: AiProviderRequest,
    options?: AiProviderRequestOptions,
  ): Promise<AiProviderResponse>;
}
