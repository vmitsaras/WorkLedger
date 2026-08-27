import {
  RuntimeConfigError,
  createRuntimeConfig,
  resolveCanonicalUrl,
  summarizeRuntimeConfig,
} from '../src/config.js';

const PRODUCTION_ENVIRONMENT = {
  WORKLEDGER_ENVIRONMENT: 'production',
  WORKLEDGER_ORIGIN: 'https://ledger.example.test',
  WORKLEDGER_TRUSTED_PROXY_ADDRESSES: '192.0.2.10,2001:db8::10',
  WORKLEDGER_DATABASE_URL: 'postgres://ledger_app:integration-db-credential@db.internal/ledger',
  WORKLEDGER_AUTH_SECRET: 'a-secure-integration-auth-secret-value-that-is-long-enough',
  WORKLEDGER_ORGANIZATION_NAME: 'Northstar Studio',
  WORKLEDGER_ORGANIZATION_LOGO_PATH: '/identity/northstar-logo.webp',
  WORKLEDGER_ORGANIZATION_FAVICON_PATH: '/identity/northstar.svg',
  WORKLEDGER_ORGANIZATION_ACCENT_COLOR: '#14532d',
} as const;
const LOCAL_MODEL_DIGEST = 'a'.repeat(64);

test('uses loopback defaults and returns a secret-free configuration summary for development', () => {
  const config = createRuntimeConfig({});

  expect(config).toMatchObject({
    environment: 'development',
    canonicalOrigin: 'http://127.0.0.1:5173',
    companyIdentity: {
      accentColor: '#075985',
      faviconPath: null,
      logoPath: null,
      organizationName: 'WorkLedger',
    },
    trustedProxyAddresses: [],
    aiProvider: { mode: 'disabled' },
  });
  expect(summarizeRuntimeConfig(config)).toEqual({
    environment: 'development',
    canonicalOrigin: 'http://127.0.0.1:5173',
    organizationAccentConfigured: false,
    organizationFaviconConfigured: false,
    organizationIdentityConfigured: false,
    organizationLogoConfigured: false,
    trustedProxyAddressCount: 0,
    aiProviderMode: 'disabled',
    aiProviderTimeoutMs: null,
    aiProviderConcurrencyLimit: null,
    databaseConfigured: false,
    authSecretConfigured: false,
  });
});

test('rejects an unknown runtime environment', () => {
  expect(() => createRuntimeConfig({ WORKLEDGER_ENVIRONMENT: 'staging' })).toThrow(
    'WORKLEDGER_ENVIRONMENT must be development, test, or production.',
  );
});

test('accepts complete production configuration without exposing its secrets', () => {
  const config = createRuntimeConfig(PRODUCTION_ENVIRONMENT);
  const summary = JSON.stringify(summarizeRuntimeConfig(config));

  expect(config).toMatchObject({
    environment: 'production',
    canonicalOrigin: 'https://ledger.example.test',
    companyIdentity: {
      accentColor: '#14532d',
      faviconPath: '/identity/northstar.svg',
      logoPath: '/identity/northstar-logo.webp',
      organizationName: 'Northstar Studio',
    },
    trustedProxyAddresses: ['192.0.2.10', '2001:db8::10'],
  });
  expect(summary).not.toContain(PRODUCTION_ENVIRONMENT.WORKLEDGER_DATABASE_URL);
  expect(summary).not.toContain(PRODUCTION_ENVIRONMENT.WORKLEDGER_AUTH_SECRET);
  expect(summary).not.toContain(PRODUCTION_ENVIRONMENT.WORKLEDGER_ORGANIZATION_NAME);
  expect(summary).not.toContain(PRODUCTION_ENVIRONMENT.WORKLEDGER_ORGANIZATION_LOGO_PATH);
});

test('rejects unsafe company identity values without echoing deployment input', () => {
  const unsafeName = `Northstar\u202eStudio`;
  const unsafeLogo = 'https://tracking.example.test/logo.svg';

  try {
    createRuntimeConfig({
      WORKLEDGER_ENVIRONMENT: 'test',
      WORKLEDGER_ORGANIZATION_NAME: unsafeName,
      WORKLEDGER_ORGANIZATION_LOGO_PATH: unsafeLogo,
      WORKLEDGER_ORGANIZATION_FAVICON_PATH: '/identity/favicon.html',
      WORKLEDGER_ORGANIZATION_ACCENT_COLOR: '#fefefe',
    });
    throw new Error('Expected company identity configuration to fail.');
  } catch (error) {
    expect(error).toBeInstanceOf(RuntimeConfigError);
    if (error instanceof RuntimeConfigError) {
      expect(error.message).toContain('WORKLEDGER_ORGANIZATION_NAME');
      expect(error.message).toContain('WORKLEDGER_ORGANIZATION_LOGO_PATH');
      expect(error.message).toContain('WORKLEDGER_ORGANIZATION_FAVICON_PATH');
      expect(error.message).toContain('at least 3:1 contrast');
      expect(error.message).not.toContain(unsafeName);
      expect(error.message).not.toContain(unsafeLogo);
    }
  }
});

test('normalizes a valid company accent and rejects path traversal', () => {
  expect(
    createRuntimeConfig({
      WORKLEDGER_ENVIRONMENT: 'test',
      WORKLEDGER_ORGANIZATION_NAME: 'Northstar Studio',
      WORKLEDGER_ORGANIZATION_ACCENT_COLOR: '#14532D',
    }).companyIdentity.accentColor,
  ).toBe('#14532d');
  expect(() =>
    createRuntimeConfig({
      WORKLEDGER_ENVIRONMENT: 'test',
      WORKLEDGER_ORGANIZATION_LOGO_PATH: '/identity/../private.svg',
    }),
  ).toThrow('WORKLEDGER_ORGANIZATION_LOGO_PATH');
});

test('fails production configuration when required values are absent', () => {
  expect(() => createRuntimeConfig({ WORKLEDGER_ENVIRONMENT: 'production' })).toThrow(
    'WORKLEDGER_ORIGIN is required in production.',
  );
});

test('fails production configuration that is incomplete or unsafe without echoing values', () => {
  expect(() =>
    createRuntimeConfig({
      WORKLEDGER_ENVIRONMENT: 'production',
      WORKLEDGER_ORIGIN: 'http://ledger.example.test/reset',
      WORKLEDGER_TRUSTED_PROXY_ADDRESSES: '192.0.2.0/24',
      WORKLEDGER_DATABASE_URL:
        'postgres://workledger_app:workledger_owner_password@127.0.0.1/workledger_dev',
      WORKLEDGER_AUTH_SECRET: 'change-me',
    }),
  ).toThrow(RuntimeConfigError);

  try {
    createRuntimeConfig({
      WORKLEDGER_ENVIRONMENT: 'production',
      WORKLEDGER_ORIGIN: 'http://ledger.example.test/reset',
      WORKLEDGER_TRUSTED_PROXY_ADDRESSES: '192.0.2.0/24',
      WORKLEDGER_DATABASE_URL:
        'postgres://workledger_app:workledger_owner_password@127.0.0.1/workledger_dev',
      WORKLEDGER_AUTH_SECRET: 'change-me',
    });
  } catch (error) {
    expect(error).toBeInstanceOf(RuntimeConfigError);
    if (error instanceof RuntimeConfigError) {
      expect(error.message).toContain('WORKLEDGER_ORIGIN must use https in production.');
      expect(error.message).toContain('WORKLEDGER_TRUSTED_PROXY_ADDRESSES');
      expect(error.message).toContain('WORKLEDGER_DATABASE_URL');
      expect(error.message).toContain('WORKLEDGER_AUTH_SECRET');
      expect(error.message).not.toContain('workledger_owner_password');
    }
  }
});

test('builds external links only from the configured canonical origin', () => {
  const config = createRuntimeConfig(PRODUCTION_ENVIRONMENT);

  expect(resolveCanonicalUrl(config, '/reset?grant=opaque-value').toString()).toBe(
    'https://ledger.example.test/reset?grant=opaque-value',
  );
  expect(() => resolveCanonicalUrl(config, 'https://attacker.example.test/reset')).toThrow(
    'same-origin absolute path',
  );
  expect(() => resolveCanonicalUrl(config, '//attacker.example.test/reset')).toThrow(
    'same-origin absolute path',
  );
});

test('enables only a complete bounded private Ollama configuration', () => {
  const config = createRuntimeConfig({
    WORKLEDGER_ENVIRONMENT: 'test',
    WORKLEDGER_AI_PROVIDER_MODE: 'ollama',
    WORKLEDGER_OLLAMA_ORIGIN: 'http://127.0.0.1:11434',
    WORKLEDGER_OLLAMA_MODEL: 'workledger-insights:local',
    WORKLEDGER_OLLAMA_MODEL_DIGEST: LOCAL_MODEL_DIGEST,
    WORKLEDGER_OLLAMA_TIMEOUT_SECONDS: '45',
    WORKLEDGER_OLLAMA_CONCURRENCY: '4',
  });

  expect(config.aiProvider).toEqual({
    mode: 'ollama',
    origin: 'http://127.0.0.1:11434',
    model: 'workledger-insights:local',
    modelDigest: LOCAL_MODEL_DIGEST,
    timeoutMs: 45_000,
    concurrencyLimit: 4,
    requiredCapabilities: ['CHAT', 'STRUCTURED_OUTPUT', 'TOOLS'],
  });
  expect(summarizeRuntimeConfig(config)).toMatchObject({
    aiProviderMode: 'ollama',
    aiProviderTimeoutMs: 45_000,
    aiProviderConcurrencyLimit: 4,
  });
});

test('keeps the provider disabled by default and rejects stale provider specific values', () => {
  expect(createRuntimeConfig({ WORKLEDGER_ENVIRONMENT: 'test' }).aiProvider).toEqual({
    mode: 'disabled',
  });
  expect(() =>
    createRuntimeConfig({
      WORKLEDGER_ENVIRONMENT: 'test',
      WORKLEDGER_OLLAMA_ORIGIN: 'http://127.0.0.1:11434',
    }),
  ).toThrow('may be set only when WORKLEDGER_AI_PROVIDER_MODE=ollama');
});

test('rejects public, credentialed, cloud, incomplete, and unbounded provider configuration', () => {
  const unsafeOrigin = 'https://operator:secret@ollama.com/api?token=secret';
  const unsafeDigest = 'not-a-local-model-digest';
  try {
    createRuntimeConfig({
      WORKLEDGER_ENVIRONMENT: 'test',
      WORKLEDGER_AI_PROVIDER_MODE: 'ollama',
      WORKLEDGER_OLLAMA_ORIGIN: unsafeOrigin,
      WORKLEDGER_OLLAMA_MODEL: 'gpt-oss:cloud',
      WORKLEDGER_OLLAMA_MODEL_DIGEST: unsafeDigest,
      WORKLEDGER_OLLAMA_TIMEOUT_SECONDS: '121',
      WORKLEDGER_OLLAMA_CONCURRENCY: '9',
    });
    throw new Error('Expected provider configuration to fail.');
  } catch (error) {
    expect(error).toBeInstanceOf(RuntimeConfigError);
    if (error instanceof RuntimeConfigError) {
      expect(error.message).toContain('WORKLEDGER_OLLAMA_ORIGIN');
      expect(error.message).toContain('WORKLEDGER_OLLAMA_MODEL');
      expect(error.message).toContain('WORKLEDGER_OLLAMA_MODEL_DIGEST');
      expect(error.message).toContain('WORKLEDGER_OLLAMA_TIMEOUT_SECONDS');
      expect(error.message).toContain('WORKLEDGER_OLLAMA_CONCURRENCY');
      expect(error.message).not.toContain('operator:secret');
      expect(error.message).not.toContain(unsafeDigest);
    }
  }
});

test('rejects public literal provider addresses and applies safe provider bounds', () => {
  expect(() =>
    createRuntimeConfig({
      WORKLEDGER_ENVIRONMENT: 'test',
      WORKLEDGER_AI_PROVIDER_MODE: 'ollama',
      WORKLEDGER_OLLAMA_ORIGIN: 'http://203.0.113.10:11434',
      WORKLEDGER_OLLAMA_MODEL: 'workledger-insights:local',
      WORKLEDGER_OLLAMA_MODEL_DIGEST: LOCAL_MODEL_DIGEST,
    }),
  ).toThrow('loopback or private network address');

  const config = createRuntimeConfig({
    WORKLEDGER_ENVIRONMENT: 'test',
    WORKLEDGER_AI_PROVIDER_MODE: 'ollama',
    WORKLEDGER_OLLAMA_ORIGIN: 'http://ollama.internal:11434',
    WORKLEDGER_OLLAMA_MODEL: 'workledger-insights:local',
    WORKLEDGER_OLLAMA_MODEL_DIGEST: LOCAL_MODEL_DIGEST,
  });
  expect(config.aiProvider).toMatchObject({ timeoutMs: 30_000, concurrencyLimit: 2 });
});
