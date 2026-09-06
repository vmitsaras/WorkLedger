import { findOllamaCompatibilityProfile } from './ollama-compatibility.js';
import {
  createOllamaSchemaChallenge,
  createOllamaTopicSchemaChallenge,
  validateOllamaSchemaChallenge,
  validateOllamaTopicSchemaChallenge,
} from './ollama-schema-challenges.js';
import { Buffer } from 'node:buffer';
import { lookup } from 'node:dns/promises';
import { request as requestHttp } from 'node:http';
import { request as requestHttps } from 'node:https';
import { isIP } from 'node:net';
import { URL } from 'node:url';

import {
  AiProviderError,
  type AiProvider,
  type AiProviderErrorCode,
  type AiProviderHealth,
  type AiProviderHealthReasonCode,
  type AiProviderMessage,
  type AiProviderRequest,
  type AiProviderRequestOptions,
  type AiProviderResponse,
  type AiProviderToolCall,
  type OllamaAiProviderConfig,
} from './contracts.js';
import { isPrivateNetworkAddress, normalizeUrlHostname } from './private-network.js';

const ALLOWED_OLLAMA_PATHS = new Set(['/api/chat', '/api/show', '/api/tags', '/api/version']);
const MAXIMUM_REQUEST_BYTES = 256 * 1_024;
const MAXIMUM_RESPONSE_BYTES = 1_024 * 1_024;
const MAXIMUM_MESSAGE_CODE_UNITS = 64_000;
// Idle expiry fallback if health cannot reach the second probe's unload request.
const SYNTHETIC_HEALTH_KEEP_ALIVE = '120s';
export const OLLAMA_MAX_GENERATED_TOKENS = 1_024;
const TOOL_NAME_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/u;
const MISCONFIGURATION_CODES = new Set<AiProviderErrorCode>([
  'ADDRESS_MISMATCH',
  'CAPABILITY_MISSING',
  'CAPABILITY_PROBE_FAILED',
  'PROVIDER_PROFILE_MISMATCH',
  'SCHEMA_PROBE_FAILED',
  'CLOUD_MODEL_DENIED',
  'INVALID_RESPONSE',
  'MODEL_DIGEST_MISMATCH',
  'MODEL_NOT_FOUND',
  'NON_PRIVATE_ADDRESS',
  'REDIRECT_DENIED',
  'REQUEST_INVALID',
]);

export interface ResolvedHostAddress {
  readonly address: string;
  readonly family: 4 | 6;
}

export interface OllamaAiProviderDependencies {
  /** Closed application purpose; legacy qualification retains its original default probe. */
  readonly schemaHealthPurpose?: 'english-topics-v1';
  readonly resolveHost?: (hostname: string) => Promise<readonly ResolvedHostAddress[]>;
  readonly now?: () => string;
  /** Injection for isolated adapter tests; configuration never exposes this override. */
  readonly findCompatibilityProfile?: typeof findOllamaCompatibilityProfile;
}

export function createOllamaAiProvider(
  config: OllamaAiProviderConfig,
  dependencies: OllamaAiProviderDependencies = {},
): AiProvider & { checkIdentity(options?: AiProviderRequestOptions): Promise<void> } {
  const origin = new URL(config.origin);
  const resolveHost = dependencies.resolveHost ?? defaultResolveHost;
  const now = dependencies.now ?? (() => new Date().toISOString());
  const findProfile = dependencies.findCompatibilityProfile ?? findOllamaCompatibilityProfile;
  async function verifyVersion(
    signal: AbortSignal,
    addresses: readonly ResolvedHostAddress[],
  ): Promise<void> {
    const profile = findProfile(config.compatibilityProfile);
    if (
      profile === undefined ||
      profile.model !== config.model ||
      profile.modelDigest !== config.modelDigest ||
      profile.schemaSuiteRevision !== 'schema-v1'
    ) {
      throw new AiProviderError('PROVIDER_PROFILE_MISMATCH');
    }
    const version = await requestJson(
      origin,
      resolveHost,
      '/api/version',
      'GET',
      undefined,
      signal,
      addresses,
    );
    if (readObject(version)?.['version'] !== profile.serverVersion)
      throw new AiProviderError('PROVIDER_PROFILE_MISMATCH');
  }
  let activeRequests = 0;
  let readyAddresses: readonly ResolvedHostAddress[] | null = null;
  let currentHealth = createHealth({
    checkedAt: now(),
    mode: 'ollama',
    status: 'unavailable',
    capabilities: [],
    reasonCode: null,
  });

  async function runOperation<T>(
    signal: AbortSignal | undefined,
    operation: (operationSignal: AbortSignal) => Promise<T>,
  ): Promise<T> {
    if (activeRequests >= config.concurrencyLimit) {
      throw new AiProviderError('PROVIDER_BUSY');
    }
    activeRequests += 1;
    try {
      return await runWithDeadline(config.timeoutMs, signal, operation);
    } finally {
      activeRequests -= 1;
    }
  }

  async function checkHealth(options: AiProviderRequestOptions = {}): Promise<AiProviderHealth> {
    readyAddresses = null;
    try {
      await runOperation(options.signal, async (signal) => {
        const startupAddresses = await resolvePrivateAddresses(origin, resolveHost, signal);
        await verifyVersion(signal, startupAddresses);
        const tags = await requestJson(
          origin,
          resolveHost,
          '/api/tags',
          'GET',
          undefined,
          signal,
          startupAddresses,
        );
        validateModelDigest(tags, config);
        const show = await requestJson(
          origin,
          resolveHost,
          '/api/show',
          'POST',
          { model: config.model, verbose: false },
          signal,
          startupAddresses,
        );
        validateModelCapabilities(show, config);
        const probe = await requestJson(
          origin,
          resolveHost,
          '/api/chat',
          'POST',
          createCapabilityProbe(config.model),
          signal,
          startupAddresses,
        );
        validateCapabilityProbe(probe);
        const challenge = await requestJson(
          origin,
          resolveHost,
          '/api/chat',
          'POST',
          {
            ...createChatRequest(
              config.model,
              dependencies.schemaHealthPurpose === 'english-topics-v1'
                ? createOllamaTopicSchemaChallenge()
                : createOllamaSchemaChallenge('compact'),
            ),
            keep_alive: 0,
          },
          signal,
          startupAddresses,
        );
        try {
          const parsed = parseChatResponse(challenge);
          if (
            parsed.toolCalls.length !== 0 ||
            !(dependencies.schemaHealthPurpose === 'english-topics-v1'
              ? validateOllamaTopicSchemaChallenge(parsed.content)
              : validateOllamaSchemaChallenge('compact', parsed.content))
          ) {
            throw new AiProviderError('SCHEMA_PROBE_FAILED');
          }
        } catch {
          throw new AiProviderError('SCHEMA_PROBE_FAILED');
        }
        readyAddresses = Object.freeze([...startupAddresses]);
      });

      currentHealth = createHealth({
        checkedAt: now(),
        mode: 'ollama',
        status: 'ready',
        capabilities: config.requiredCapabilities,
        reasonCode: null,
      });
      return currentHealth;
    } catch (error) {
      readyAddresses = null;
      const providerError = normalizeProviderError(error);
      const reasonCode = healthReasonCode(providerError.code);
      currentHealth = createHealth({
        checkedAt: now(),
        mode: 'ollama',
        status: MISCONFIGURATION_CODES.has(providerError.code) ? 'misconfigured' : 'unavailable',
        capabilities: [],
        reasonCode,
      });
      return currentHealth;
    }
  }

  async function generate(
    request: AiProviderRequest,
    options: AiProviderRequestOptions = {},
  ): Promise<AiProviderResponse> {
    const approvedAddresses = readyAddresses;
    if (approvedAddresses === null) throw new AiProviderError('PROVIDER_NOT_READY');
    validateGenerateRequest(request);
    try {
      return await runOperation(options.signal, async (signal) => {
        await verifyVersion(signal, approvedAddresses);
        const tags = await requestJson(
          origin,
          resolveHost,
          '/api/tags',
          'GET',
          undefined,
          signal,
          approvedAddresses,
        );
        validateModelDigest(tags, config);
        const response = await requestJson(
          origin,
          resolveHost,
          '/api/chat',
          'POST',
          createChatRequest(config.model, request),
          signal,
          approvedAddresses,
        );
        return parseChatResponse(response);
      });
    } catch (error) {
      const providerError = normalizeProviderError(error);
      if (MISCONFIGURATION_CODES.has(providerError.code)) {
        readyAddresses = null;
        currentHealth = createHealth({
          checkedAt: now(),
          mode: 'ollama',
          status: 'misconfigured',
          capabilities: [],
          reasonCode: healthReasonCode(providerError.code),
        });
      }
      throw providerError;
    }
  }

  async function checkIdentity(options: AiProviderRequestOptions = {}): Promise<void> {
    const addresses = readyAddresses;
    if (addresses === null) throw new AiProviderError('PROVIDER_NOT_READY');
    try {
      await runOperation(options.signal, async (signal) => {
        await verifyVersion(signal, addresses);
        const tags = await requestJson(
          origin,
          resolveHost,
          '/api/tags',
          'GET',
          undefined,
          signal,
          addresses,
        );
        validateModelDigest(tags, config);
      });
    } catch (error) {
      readyAddresses = null;
      const failure = normalizeProviderError(error);
      currentHealth = createHealth({
        checkedAt: now(),
        mode: 'ollama',
        status: MISCONFIGURATION_CODES.has(failure.code) ? 'misconfigured' : 'unavailable',
        capabilities: [],
        reasonCode: healthReasonCode(failure.code),
      });
      throw failure;
    }
  }

  return Object.freeze({
    checkIdentity,
    mode: 'ollama' as const,
    checkHealth,
    getHealth: () => currentHealth,
    generate,
  });
}

async function defaultResolveHost(hostname: string): Promise<readonly ResolvedHostAddress[]> {
  const family = isIP(hostname);
  if (family === 4) {
    const address: ResolvedHostAddress = { address: hostname, family: 4 };
    return Object.freeze([address]);
  }
  if (family === 6) {
    const address: ResolvedHostAddress = { address: hostname, family: 6 };
    return Object.freeze([address]);
  }
  const addresses = await lookup(hostname, { all: true, verbatim: true });
  const resolvedAddresses: ResolvedHostAddress[] = [];
  for (const { address, family: resolvedFamily } of addresses) {
    if (resolvedFamily === 4 || resolvedFamily === 6) {
      resolvedAddresses.push({ address, family: resolvedFamily });
    }
  }
  return Object.freeze(resolvedAddresses);
}

async function resolvePrivateAddresses(
  origin: URL,
  resolveHost: NonNullable<OllamaAiProviderDependencies['resolveHost']>,
  signal: AbortSignal,
): Promise<readonly ResolvedHostAddress[]> {
  if (signal.aborted) throw new AiProviderError('CANCELLED');
  const hostname = normalizeUrlHostname(origin.hostname);
  let addresses: readonly ResolvedHostAddress[];
  try {
    addresses = await resolveHost(hostname);
  } catch {
    throw new AiProviderError('DNS_RESOLUTION_FAILED');
  }
  if (signal.aborted) throw new AiProviderError('CANCELLED');
  if (addresses.length === 0) throw new AiProviderError('DNS_RESOLUTION_FAILED');
  if (
    addresses.some(
      ({ address, family }) => isIP(address) !== family || !isPrivateNetworkAddress(address),
    )
  ) {
    throw new AiProviderError('NON_PRIVATE_ADDRESS');
  }
  return addresses;
}

async function requestJson(
  origin: URL,
  resolveHost: NonNullable<OllamaAiProviderDependencies['resolveHost']>,
  path: string,
  method: 'GET' | 'POST',
  body: unknown,
  signal: AbortSignal,
  expectedAddresses?: readonly ResolvedHostAddress[],
): Promise<unknown> {
  if (!ALLOWED_OLLAMA_PATHS.has(path)) throw new AiProviderError('REQUEST_INVALID');
  let requestBody: Buffer | undefined;
  try {
    requestBody = body === undefined ? undefined : Buffer.from(JSON.stringify(body), 'utf8');
  } catch {
    throw new AiProviderError('REQUEST_INVALID');
  }
  if (requestBody !== undefined && requestBody.byteLength > MAXIMUM_REQUEST_BYTES) {
    throw new AiProviderError('REQUEST_INVALID');
  }
  const addresses = await resolvePrivateAddresses(origin, resolveHost, signal);
  if (expectedAddresses !== undefined && !addressSetsMatch(addresses, expectedAddresses)) {
    throw new AiProviderError('ADDRESS_MISMATCH');
  }
  if (signal.aborted) throw new AiProviderError('CANCELLED');

  const address = addresses[0];
  if (address === undefined) throw new AiProviderError('DNS_RESOLUTION_FAILED');
  const originalHostname = normalizeUrlHostname(origin.hostname);
  const transport = origin.protocol === 'https:' ? requestHttps : requestHttp;

  return new Promise<unknown>((resolve, reject) => {
    let settled = false;
    const finish = (result: { readonly value?: unknown; readonly error?: AiProviderError }) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener('abort', abortRequest);
      if (result.error !== undefined) reject(result.error);
      else resolve(result.value);
    };
    const request = transport({
      protocol: origin.protocol,
      hostname: address.address,
      port: origin.port || (origin.protocol === 'https:' ? 443 : 80),
      path,
      method,
      agent: false,
      headers: {
        accept: 'application/json',
        connection: 'close',
        host: origin.host,
        ...(requestBody === undefined
          ? {}
          : {
              'content-length': String(requestBody.byteLength),
              'content-type': 'application/json',
            }),
      },
      ...(origin.protocol === 'https:' && isIP(originalHostname) === 0
        ? { servername: originalHostname }
        : {}),
    });
    function abortRequest() {
      request.destroy();
      finish({ error: new AiProviderError('CANCELLED') });
    }
    signal.addEventListener('abort', abortRequest, { once: true });

    request.once('error', () => finish({ error: new AiProviderError('CONNECTION_FAILED') }));
    request.once('response', (response) => {
      const statusCode = response.statusCode ?? 0;
      if (statusCode >= 300 && statusCode < 400) {
        response.resume();
        finish({ error: new AiProviderError('REDIRECT_DENIED') });
        return;
      }
      if (statusCode < 200 || statusCode >= 300) {
        response.resume();
        finish({
          error: new AiProviderError(
            statusCode === 404 && path !== '/api/tags' ? 'MODEL_NOT_FOUND' : 'UNEXPECTED_STATUS',
          ),
        });
        return;
      }
      const contentType = String(response.headers['content-type'] ?? '').toLocaleLowerCase('en-US');
      if (!contentType.startsWith('application/json')) {
        response.resume();
        finish({ error: new AiProviderError('INVALID_RESPONSE') });
        return;
      }

      const chunks: Buffer[] = [];
      let responseBytes = 0;
      response.on('data', (chunk: Buffer | string) => {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        responseBytes += buffer.byteLength;
        if (responseBytes > MAXIMUM_RESPONSE_BYTES) {
          response.destroy();
          finish({ error: new AiProviderError('INVALID_RESPONSE') });
          return;
        }
        chunks.push(buffer);
      });
      response.once('end', () => {
        if (settled) return;
        try {
          finish({ value: JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown });
        } catch {
          finish({ error: new AiProviderError('INVALID_RESPONSE') });
        }
      });
      response.once('error', () => finish({ error: new AiProviderError('CONNECTION_FAILED') }));
    });

    if (requestBody !== undefined) request.write(requestBody);
    request.end();
  });
}

async function runWithDeadline<T>(
  timeoutMs: number,
  callerSignal: AbortSignal | undefined,
  operation: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  if (callerSignal?.aborted === true) throw new AiProviderError('CANCELLED');

  const controller = new AbortController();
  let abortCode: 'CANCELLED' | 'TIMEOUT' | null = null;
  const cancel = () => {
    abortCode = 'CANCELLED';
    controller.abort();
  };
  callerSignal?.addEventListener('abort', cancel, { once: true });
  const timer = setTimeout(() => {
    abortCode = 'TIMEOUT';
    controller.abort();
  }, timeoutMs);

  const aborted = new Promise<never>((_resolve, reject) => {
    controller.signal.addEventListener(
      'abort',
      () => reject(new AiProviderError(abortCode ?? 'CANCELLED')),
      { once: true },
    );
  });

  try {
    return await Promise.race([operation(controller.signal), aborted]);
  } catch (error) {
    if (abortCode !== null) throw new AiProviderError(abortCode);
    throw normalizeProviderError(error);
  } finally {
    clearTimeout(timer);
    callerSignal?.removeEventListener('abort', cancel);
  }
}

function validateModelDigest(response: unknown, config: OllamaAiProviderConfig): void {
  const models = readObject(response)?.['models'];
  if (!Array.isArray(models)) throw new AiProviderError('INVALID_RESPONSE');
  const configuredModel = models
    .map(readObject)
    .find((model) => model?.['name'] === config.model && model['model'] === config.model);
  if (configuredModel === undefined) throw new AiProviderError('MODEL_NOT_FOUND');
  if (
    readOptionalString(configuredModel['remote_host']) !== undefined ||
    readOptionalString(configuredModel['remote_model']) !== undefined
  ) {
    throw new AiProviderError('CLOUD_MODEL_DENIED');
  }
  if (configuredModel['digest'] !== config.modelDigest) {
    throw new AiProviderError('MODEL_DIGEST_MISMATCH');
  }
}

function validateModelCapabilities(response: unknown, config: OllamaAiProviderConfig): void {
  const object = readObject(response);
  if (object === undefined) throw new AiProviderError('INVALID_RESPONSE');
  if (
    readOptionalString(object['remote_host']) !== undefined ||
    readOptionalString(object['remote_model']) !== undefined
  ) {
    throw new AiProviderError('CLOUD_MODEL_DENIED');
  }
  const capabilities = object['capabilities'];
  if (!Array.isArray(capabilities) || capabilities.some((value) => typeof value !== 'string')) {
    throw new AiProviderError('INVALID_RESPONSE');
  }
  if (!capabilities.includes('completion') || !capabilities.includes('tools')) {
    throw new AiProviderError('CAPABILITY_MISSING');
  }
  if (
    !config.requiredCapabilities.includes('CHAT') ||
    !config.requiredCapabilities.includes('STRUCTURED_OUTPUT') ||
    !config.requiredCapabilities.includes('TOOLS')
  ) {
    throw new AiProviderError('CAPABILITY_MISSING');
  }
}

function createCapabilityProbe(model: string): Readonly<Record<string, unknown>> {
  return Object.freeze({
    model,
    messages: Object.freeze([
      Object.freeze({
        role: 'system',
        content: 'Return only the requested JSON. Do not include an explanation.',
      }),
      Object.freeze({ role: 'user', content: 'Return an object with ready set to true.' }),
    ]),
    stream: false,
    think: false,
    format: Object.freeze({
      type: 'object',
      properties: Object.freeze({ ready: Object.freeze({ type: 'boolean', const: true }) }),
      required: Object.freeze(['ready']),
      additionalProperties: false,
    }),
    options: Object.freeze({ temperature: 0, num_predict: 16 }),
    keep_alive: SYNTHETIC_HEALTH_KEEP_ALIVE,
  });
}

function validateCapabilityProbe(response: unknown): void {
  const object = readObject(response);
  const message = readObject(object?.['message']);
  if (object?.['done'] !== true || message?.['role'] !== 'assistant') {
    throw new AiProviderError('CAPABILITY_PROBE_FAILED');
  }
  if (
    hasThinkingContent(message['thinking']) ||
    (message['tool_calls'] !== undefined &&
      (!Array.isArray(message['tool_calls']) || message['tool_calls'].length !== 0))
  ) {
    throw new AiProviderError('CAPABILITY_PROBE_FAILED');
  }
  const content = message['content'];
  if (typeof content !== 'string') throw new AiProviderError('CAPABILITY_PROBE_FAILED');
  try {
    const parsed = readObject(JSON.parse(content) as unknown);
    if (
      parsed === undefined ||
      parsed['ready'] !== true ||
      Object.keys(parsed).some((key) => key !== 'ready')
    ) {
      throw new AiProviderError('CAPABILITY_PROBE_FAILED');
    }
  } catch (error) {
    if (error instanceof AiProviderError) throw error;
    throw new AiProviderError('CAPABILITY_PROBE_FAILED');
  }
}

function validateGenerateRequest(request: AiProviderRequest): void {
  if (
    request.messages.length === 0 ||
    request.messages.length > 16 ||
    request.tools.length > 8 ||
    request.messages.some(
      (message) =>
        message.content.length > MAXIMUM_MESSAGE_CODE_UNITS ||
        (message.role === 'tool' &&
          (message.toolName === undefined || !TOOL_NAME_PATTERN.test(message.toolName))) ||
        (message.role !== 'tool' && message.toolName !== undefined) ||
        (message.role !== 'assistant' && message.toolCalls !== undefined),
    ) ||
    request.tools.some(
      (tool) =>
        !TOOL_NAME_PATTERN.test(tool.name) ||
        tool.description.length === 0 ||
        tool.description.length > 500,
    )
  ) {
    throw new AiProviderError('REQUEST_INVALID');
  }
}

function createChatRequest(
  model: string,
  request: AiProviderRequest,
): Readonly<Record<string, unknown>> {
  return Object.freeze({
    model,
    messages: Object.freeze(request.messages.map(serializeMessage)),
    ...(request.tools.length === 0
      ? {}
      : {
          tools: Object.freeze(
            request.tools.map((tool) =>
              Object.freeze({
                type: 'function',
                function: Object.freeze({
                  name: tool.name,
                  description: tool.description,
                  parameters: tool.parameters,
                }),
              }),
            ),
          ),
        }),
    stream: false,
    think: false,
    ...(request.outputSchema === undefined ? {} : { format: request.outputSchema }),
    options: Object.freeze({
      temperature: 0,
      num_predict: OLLAMA_MAX_GENERATED_TOKENS,
    }),
  });
}

function serializeMessage(message: AiProviderMessage): Readonly<Record<string, unknown>> {
  return Object.freeze({
    role: message.role,
    content: message.content,
    ...(message.toolName === undefined ? {} : { tool_name: message.toolName }),
    ...(message.toolCalls === undefined
      ? {}
      : {
          tool_calls: Object.freeze(
            message.toolCalls.map((toolCall) =>
              Object.freeze({
                ...(toolCall.id === undefined ? {} : { id: toolCall.id }),
                function: Object.freeze({
                  name: toolCall.name,
                  arguments: toolCall.arguments,
                }),
              }),
            ),
          ),
        }),
  });
}

function parseChatResponse(response: unknown): AiProviderResponse {
  const object = readObject(response);
  const message = readObject(object?.['message']);
  if (object?.['done'] !== true || message?.['role'] !== 'assistant') {
    throw new AiProviderError('INVALID_RESPONSE');
  }
  if (hasThinkingContent(message['thinking'])) {
    throw new AiProviderError('INVALID_RESPONSE');
  }
  const content = message['content'];
  if (typeof content !== 'string') throw new AiProviderError('INVALID_RESPONSE');
  const rawToolCalls = message['tool_calls'];
  if (rawToolCalls !== undefined && !Array.isArray(rawToolCalls)) {
    throw new AiProviderError('INVALID_RESPONSE');
  }
  const toolCalls = (rawToolCalls ?? []).map(parseToolCall);
  const inputTokens = readOptionalTokenCount(object['prompt_eval_count']);
  const outputTokens = readOptionalTokenCount(object['eval_count']);
  return Object.freeze({
    content,
    toolCalls: Object.freeze(toolCalls),
    ...(inputTokens === undefined && outputTokens === undefined
      ? {}
      : {
          usage: Object.freeze({
            inputTokens: inputTokens ?? null,
            outputTokens: outputTokens ?? null,
          }),
        }),
  });
}

function parseToolCall(value: unknown): AiProviderToolCall {
  const object = readObject(value);
  const functionCall = readObject(object?.['function']);
  const id = readOptionalString(object?.['id']);
  const name = functionCall?.['name'];
  if (
    object === undefined ||
    functionCall === undefined ||
    typeof name !== 'string' ||
    !TOOL_NAME_PATTERN.test(name) ||
    functionCall['arguments'] === undefined
  ) {
    throw new AiProviderError('INVALID_RESPONSE');
  }
  return Object.freeze({
    ...(id === undefined ? {} : { id }),
    name,
    arguments: functionCall['arguments'],
  });
}

function readObject(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function readOptionalTokenCount(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new AiProviderError('INVALID_RESPONSE');
  }
  return value as number;
}

function hasThinkingContent(value: unknown): boolean {
  return value !== undefined && value !== '';
}

function normalizeProviderError(error: unknown): AiProviderError {
  return error instanceof AiProviderError ? error : new AiProviderError('CONNECTION_FAILED');
}

function healthReasonCode(code: AiProviderErrorCode): AiProviderHealthReasonCode {
  if (code === 'PROVIDER_BUSY') return 'CONCURRENCY_LIMIT';
  if (code === 'PROVIDER_DISABLED' || code === 'PROVIDER_NOT_READY' || code === 'REQUEST_INVALID') {
    return 'INVALID_RESPONSE';
  }
  return code;
}

function addressSetsMatch(
  left: readonly ResolvedHostAddress[],
  right: readonly ResolvedHostAddress[],
): boolean {
  if (left.length !== right.length) return false;
  const rightAddresses = new Set(right.map(({ address, family }) => `${family}:${address}`));
  return left.every(({ address, family }) => rightAddresses.has(`${family}:${address}`));
}

function createHealth(health: AiProviderHealth): AiProviderHealth {
  return Object.freeze({ ...health, capabilities: Object.freeze([...health.capabilities]) });
}
