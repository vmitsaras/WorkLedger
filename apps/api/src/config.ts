import { Buffer } from 'node:buffer';
import { isIP } from 'node:net';
import { URL } from 'node:url';

import {
  DEFAULT_COMPANY_IDENTITY,
  companyIdentityAccentSchema,
  companyIdentityFaviconPathSchema,
  companyIdentityLogoPathSchema,
  type CompanyIdentity,
} from '@workledger/contracts';

export const RUNTIME_ENVIRONMENT_VARIABLES = {
  environment: 'WORKLEDGER_ENVIRONMENT',
  origin: 'WORKLEDGER_ORIGIN',
  trustedProxyAddresses: 'WORKLEDGER_TRUSTED_PROXY_ADDRESSES',
  databaseUrl: 'WORKLEDGER_DATABASE_URL',
  authSecret: 'WORKLEDGER_AUTH_SECRET',
  organizationName: 'WORKLEDGER_ORGANIZATION_NAME',
  organizationLogoPath: 'WORKLEDGER_ORGANIZATION_LOGO_PATH',
  organizationFaviconPath: 'WORKLEDGER_ORGANIZATION_FAVICON_PATH',
  organizationAccentColor: 'WORKLEDGER_ORGANIZATION_ACCENT_COLOR',
} as const;

export type RuntimeEnvironment = 'development' | 'test' | 'production';

export interface RuntimeConfig {
  readonly environment: RuntimeEnvironment;
  readonly canonicalOrigin: string;
  readonly companyIdentity: CompanyIdentity;
  readonly trustedProxyAddresses: readonly string[];
  readonly databaseUrl?: string;
  readonly authSecret?: string;
}

export interface RuntimeConfigSummary {
  readonly environment: RuntimeEnvironment;
  readonly canonicalOrigin: string;
  readonly organizationAccentConfigured: boolean;
  readonly organizationFaviconConfigured: boolean;
  readonly organizationIdentityConfigured: boolean;
  readonly organizationLogoConfigured: boolean;
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
const COMPANY_IDENTITY_MINIMUM_BOUNDARY_CONTRAST = 3;
const COMPANY_IDENTITY_REFERENCE_SURFACES = ['#ffffff', '#f5f7f9'] as const;
const UNSAFE_DISPLAY_NAME_CHARACTERS = /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u;
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

function parseCompanyIdentity({
  environment,
  issues,
  source,
}: {
  readonly environment: RuntimeEnvironment;
  readonly issues: string[];
  readonly source: EnvironmentSource;
}): CompanyIdentity {
  const organizationName = parseOrganizationName({ environment, issues, source });
  const logoPath = parseIdentityAssetPath({
    issues,
    source,
    variableName: RUNTIME_ENVIRONMENT_VARIABLES.organizationLogoPath,
    validate: (value) => companyIdentityLogoPathSchema.safeParse(value).success,
    acceptedTypes: 'AVIF, PNG, SVG, or WebP',
  });
  const faviconPath = parseIdentityAssetPath({
    issues,
    source,
    variableName: RUNTIME_ENVIRONMENT_VARIABLES.organizationFaviconPath,
    validate: (value) => companyIdentityFaviconPathSchema.safeParse(value).success,
    acceptedTypes: 'ICO, PNG, or SVG',
  });
  const accentColor = parseOrganizationAccentColor(source, issues);

  return Object.freeze({ accentColor, faviconPath, logoPath, organizationName });
}

function parseOrganizationName({
  environment,
  issues,
  source,
}: {
  readonly environment: RuntimeEnvironment;
  readonly issues: string[];
  readonly source: EnvironmentSource;
}): string {
  const variableName = RUNTIME_ENVIRONMENT_VARIABLES.organizationName;
  const configuredName = readOptionalValue(source, variableName);
  if (configuredName === undefined) {
    if (environment === PRODUCTION_ENVIRONMENT) {
      issues.push(`${variableName} is required in production.`);
    }
    return DEFAULT_COMPANY_IDENTITY.organizationName;
  }
  if (configuredName.length > 80 || UNSAFE_DISPLAY_NAME_CHARACTERS.test(configuredName)) {
    issues.push(
      `${variableName} must contain 1 to 80 visible characters without control or bidirectional formatting characters.`,
    );
    return DEFAULT_COMPANY_IDENTITY.organizationName;
  }
  return configuredName;
}

function parseIdentityAssetPath({
  acceptedTypes,
  issues,
  source,
  validate,
  variableName,
}: {
  readonly acceptedTypes: string;
  readonly issues: string[];
  readonly source: EnvironmentSource;
  readonly validate: (value: string) => boolean;
  readonly variableName: string;
}): string | null {
  const path = readOptionalValue(source, variableName);
  if (path === undefined) return null;
  if (!validate(path)) {
    issues.push(
      `${variableName} must be a same-origin /identity/ path using an approved ${acceptedTypes} file extension without traversal, query, or fragment content.`,
    );
    return null;
  }
  return path;
}

function parseOrganizationAccentColor(source: EnvironmentSource, issues: string[]): string {
  const variableName = RUNTIME_ENVIRONMENT_VARIABLES.organizationAccentColor;
  const configuredAccent = readOptionalValue(source, variableName);
  if (configuredAccent === undefined) return DEFAULT_COMPANY_IDENTITY.accentColor;
  const accentColor = configuredAccent.toLocaleLowerCase('en-US');
  if (!companyIdentityAccentSchema.safeParse(accentColor).success) {
    issues.push(`${variableName} must be a six-digit hexadecimal color such as #075985.`);
    return DEFAULT_COMPANY_IDENTITY.accentColor;
  }
  if (
    COMPANY_IDENTITY_REFERENCE_SURFACES.some(
      (surface) => contrastRatio(accentColor, surface) < COMPANY_IDENTITY_MINIMUM_BOUNDARY_CONTRAST,
    )
  ) {
    issues.push(
      `${variableName} must have at least 3:1 contrast against the WorkLedger raised and page surfaces.`,
    );
    return DEFAULT_COMPANY_IDENTITY.accentColor;
  }
  return accentColor;
}

function contrastRatio(firstColor: string, secondColor: string): number {
  const firstLuminance = relativeLuminance(firstColor);
  const secondLuminance = relativeLuminance(secondColor);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function relativeLuminance(color: string): number {
  const channels = [1, 3, 5].map((offset) => {
    const channel = Number.parseInt(color.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const [red = 0, green = 0, blue = 0] = channels;
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
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
  const companyIdentity = parseCompanyIdentity({
    environment: runtimeEnvironment,
    issues,
    source: environment,
  });

  if (issues.length > 0) throw new RuntimeConfigError(issues);

  return Object.freeze({
    environment: runtimeEnvironment,
    canonicalOrigin,
    companyIdentity,
    trustedProxyAddresses,
    ...(databaseUrl ? { databaseUrl } : {}),
    ...(authSecret ? { authSecret } : {}),
  });
}

export function summarizeRuntimeConfig(config: RuntimeConfig): RuntimeConfigSummary {
  return Object.freeze({
    environment: config.environment,
    canonicalOrigin: config.canonicalOrigin,
    organizationAccentConfigured:
      config.companyIdentity.accentColor !== DEFAULT_COMPANY_IDENTITY.accentColor,
    organizationFaviconConfigured: config.companyIdentity.faviconPath !== null,
    organizationIdentityConfigured:
      config.companyIdentity.organizationName !== DEFAULT_COMPANY_IDENTITY.organizationName,
    organizationLogoConfigured: config.companyIdentity.logoPath !== null,
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
    `organizationIdentity=${summary.organizationIdentityConfigured ? 'configured' : 'fallback'};`,
    `organizationLogo=${summary.organizationLogoConfigured ? 'configured' : 'fallback'};`,
    `organizationFavicon=${summary.organizationFaviconConfigured ? 'configured' : 'fallback'};`,
    `organizationAccent=${summary.organizationAccentConfigured ? 'configured' : 'fallback'};`,
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
