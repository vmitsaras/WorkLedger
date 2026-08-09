import { Buffer } from 'node:buffer';
import { isIP } from 'node:net';
import { URL } from 'node:url';

export const RUNTIME_ENVIRONMENT_VARIABLES = {
  environment: 'WORKLEDGER_ENVIRONMENT',
  origin: 'WORKLEDGER_ORIGIN',
  trustedProxyAddresses: 'WORKLEDGER_TRUSTED_PROXY_ADDRESSES',
  databaseUrl: 'WORKLEDGER_DATABASE_URL',
  authSecret: 'WORKLEDGER_AUTH_SECRET',
} as const;

export type RuntimeEnvironment = 'development' | 'test' | 'production';

export interface RuntimeConfig {
  readonly environment: RuntimeEnvironment;
  readonly canonicalOrigin: string;
  readonly trustedProxyAddresses: readonly string[];
  readonly databaseUrl?: string;
  readonly authSecret?: string;
}

export interface RuntimeConfigSummary {
  readonly environment: RuntimeEnvironment;
  readonly canonicalOrigin: string;
  readonly trustedProxyAddressCount: number;
  readonly databaseConfigured: boolean;
  readonly authSecretConfigured: boolean;
}

export class RuntimeConfigError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Invalid WorkLedger runtime configuration:\n- ${issues.join('\n- ')}`);
    this.name = 'RuntimeConfigError';
    this.issues = issues;
  }
}

type EnvironmentSource = Readonly<Record<string, string | undefined>>;

const DEFAULT_ENVIRONMENT: RuntimeEnvironment = 'development';
const DEFAULT_ORIGIN = 'http://127.0.0.1:5173';
const PRODUCTION_ENVIRONMENT: RuntimeEnvironment = 'production';
const UNSAFE_VALUE_MARKERS = [
  'change-me',
  'replace-me',
  'placeholder',
  'example',
  'workledger_owner_password',
  'workledger_test_password',
] as const;

function readOptionalValue(
  environment: EnvironmentSource,
  variableName: string,
): string | undefined {
  const value = environment[variableName]?.trim();
  return value || undefined;
}

function containsUnsafeValueMarker(value: string): boolean {
  const normalizedValue = value.toLocaleLowerCase('en-US');
  return UNSAFE_VALUE_MARKERS.some((marker) => normalizedValue.includes(marker));
}

function parseEnvironment(environment: EnvironmentSource, issues: string[]): RuntimeEnvironment {
  const value = readOptionalValue(environment, RUNTIME_ENVIRONMENT_VARIABLES.environment);
  if (!value) return DEFAULT_ENVIRONMENT;
  if (value === 'development' || value === 'test' || value === PRODUCTION_ENVIRONMENT) {
    return value;
  }

  issues.push(
    `${RUNTIME_ENVIRONMENT_VARIABLES.environment} must be development, test, or production.`,
  );
  return DEFAULT_ENVIRONMENT;
}

function parseCanonicalOrigin({
  environment,
  issues,
  source,
}: {
  readonly environment: RuntimeEnvironment;
  readonly issues: string[];
  readonly source: EnvironmentSource;
}): string {
  const configuredOrigin = readOptionalValue(source, RUNTIME_ENVIRONMENT_VARIABLES.origin);
  if (!configuredOrigin && environment === PRODUCTION_ENVIRONMENT) {
    issues.push(`${RUNTIME_ENVIRONMENT_VARIABLES.origin} is required in production.`);
    return DEFAULT_ORIGIN;
  }

  const originValue = configuredOrigin ?? DEFAULT_ORIGIN;
  try {
    const origin = new URL(originValue);
    const hasOnlyOriginParts =
      origin.pathname === '/' &&
      origin.search === '' &&
      origin.hash === '' &&
      origin.username === '' &&
      origin.password === '';

    if (!hasOnlyOriginParts || (origin.protocol !== 'http:' && origin.protocol !== 'https:')) {
      issues.push(
        `${RUNTIME_ENVIRONMENT_VARIABLES.origin} must be an http(s) origin without a path, query, fragment, or credentials.`,
      );
    }
    if (environment === PRODUCTION_ENVIRONMENT && origin.protocol !== 'https:') {
      issues.push(`${RUNTIME_ENVIRONMENT_VARIABLES.origin} must use https in production.`);
    }

    return origin.origin;
  } catch {
    issues.push(`${RUNTIME_ENVIRONMENT_VARIABLES.origin} must be a valid absolute URL.`);
    return DEFAULT_ORIGIN;
  }
}

function parseTrustedProxyAddresses({
  environment,
  issues,
  source,
}: {
  readonly environment: RuntimeEnvironment;
  readonly issues: string[];
  readonly source: EnvironmentSource;
}): readonly string[] {
  const configuredAddresses = readOptionalValue(
    source,
    RUNTIME_ENVIRONMENT_VARIABLES.trustedProxyAddresses,
  );
  if (!configuredAddresses) {
    if (environment === PRODUCTION_ENVIRONMENT) {
      issues.push(
        `${RUNTIME_ENVIRONMENT_VARIABLES.trustedProxyAddresses} is required in production.`,
      );
    }
    return [];
  }

  const addresses = configuredAddresses.split(',').map((address) => address.trim());
  const uniqueAddresses = new Set<string>();

  for (const address of addresses) {
    if (!address || address.includes('/') || isIP(address) === 0) {
      issues.push(
        `${RUNTIME_ENVIRONMENT_VARIABLES.trustedProxyAddresses} must contain only exact IPv4 or IPv6 addresses.`,
      );
      continue;
    }
    if (uniqueAddresses.has(address)) {
      issues.push(
        `${RUNTIME_ENVIRONMENT_VARIABLES.trustedProxyAddresses} must not repeat an address.`,
      );
      continue;
    }
    uniqueAddresses.add(address);
  }

  return Object.freeze([...uniqueAddresses]);
}

function parseDatabaseUrl({
  environment,
  issues,
  source,
}: {
  readonly environment: RuntimeEnvironment;
  readonly issues: string[];
  readonly source: EnvironmentSource;
}): string | undefined {
  const databaseUrl = readOptionalValue(source, RUNTIME_ENVIRONMENT_VARIABLES.databaseUrl);
  if (!databaseUrl) {
    if (environment === PRODUCTION_ENVIRONMENT) {
      issues.push(`${RUNTIME_ENVIRONMENT_VARIABLES.databaseUrl} is required in production.`);
    }
    return undefined;
  }

  try {
    const parsedUrl = new URL(databaseUrl);
    const usesPostgresProtocol =
      parsedUrl.protocol === 'postgres:' || parsedUrl.protocol === 'postgresql:';
    if (
      !usesPostgresProtocol ||
      !parsedUrl.hostname ||
      !parsedUrl.username ||
      !parsedUrl.password
    ) {
      issues.push(
        `${RUNTIME_ENVIRONMENT_VARIABLES.databaseUrl} must be a PostgreSQL URL with an explicit username and password.`,
      );
    }
  } catch {
    issues.push(`${RUNTIME_ENVIRONMENT_VARIABLES.databaseUrl} must be a valid PostgreSQL URL.`);
  }

  if (environment === PRODUCTION_ENVIRONMENT && containsUnsafeValueMarker(databaseUrl)) {
    issues.push(
      `${RUNTIME_ENVIRONMENT_VARIABLES.databaseUrl} must not use a local or placeholder value in production.`,
    );
  }

  return databaseUrl;
}

function parseAuthSecret({
  environment,
  issues,
  source,
}: {
  readonly environment: RuntimeEnvironment;
  readonly issues: string[];
  readonly source: EnvironmentSource;
}): string | undefined {
  const authSecret = readOptionalValue(source, RUNTIME_ENVIRONMENT_VARIABLES.authSecret);
  if (!authSecret) {
    if (environment === PRODUCTION_ENVIRONMENT) {
      issues.push(`${RUNTIME_ENVIRONMENT_VARIABLES.authSecret} is required in production.`);
    }
    return undefined;
  }

  const characters = [...authSecret];
  const repeatsOneCharacter =
    characters.length > 0 && characters.every((character) => character === characters[0]);
  if (
    Buffer.byteLength(authSecret, 'utf8') < 32 ||
    repeatsOneCharacter ||
    containsUnsafeValueMarker(authSecret)
  ) {
    issues.push(
      `${RUNTIME_ENVIRONMENT_VARIABLES.authSecret} must contain at least 32 bytes and must not use a placeholder or repeated character.`,
    );
  }

  return authSecret;
}

export function createRuntimeConfig(environment: EnvironmentSource): RuntimeConfig {
  const issues: string[] = [];
  const runtimeEnvironment = parseEnvironment(environment, issues);
  const canonicalOrigin = parseCanonicalOrigin({
    environment: runtimeEnvironment,
    issues,
    source: environment,
  });
  const trustedProxyAddresses = parseTrustedProxyAddresses({
    environment: runtimeEnvironment,
    issues,
    source: environment,
  });
  const databaseUrl = parseDatabaseUrl({
    environment: runtimeEnvironment,
    issues,
    source: environment,
  });
  const authSecret = parseAuthSecret({
    environment: runtimeEnvironment,
    issues,
    source: environment,
  });

  if (issues.length > 0) throw new RuntimeConfigError(issues);

  return Object.freeze({
    environment: runtimeEnvironment,
    canonicalOrigin,
    trustedProxyAddresses,
    ...(databaseUrl ? { databaseUrl } : {}),
    ...(authSecret ? { authSecret } : {}),
  });
}

export function summarizeRuntimeConfig(config: RuntimeConfig): RuntimeConfigSummary {
  return Object.freeze({
    environment: config.environment,
    canonicalOrigin: config.canonicalOrigin,
    trustedProxyAddressCount: config.trustedProxyAddresses.length,
    databaseConfigured: Boolean(config.databaseUrl),
    authSecretConfigured: Boolean(config.authSecret),
  });
}

export function formatRuntimeConfigSummary(config: RuntimeConfig): string {
  const summary = summarizeRuntimeConfig(config);
  return [
    'Runtime configuration valid:',
    `environment=${summary.environment};`,
    `canonicalOrigin=${summary.canonicalOrigin};`,
    `trustedProxyAddresses=${summary.trustedProxyAddressCount};`,
    `database=${summary.databaseConfigured ? 'configured' : 'not-configured'};`,
    `authSecret=${summary.authSecretConfigured ? 'configured' : 'not-configured'}.`,
  ].join(' ');
}

export function resolveCanonicalUrl(config: RuntimeConfig, path: string): URL {
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) {
    throw new Error('Canonical URLs must use a same-origin absolute path.');
  }

  const url = new URL(path, `${config.canonicalOrigin}/`);
  if (url.origin !== config.canonicalOrigin) {
    throw new Error('Canonical URLs must resolve to the configured origin.');
  }

  return url;
}
