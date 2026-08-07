export const TEST_DATABASE_URL_ENV = 'WORKLEDGER_TEST_DATABASE_URL';

export interface DatabaseHarnessState {
  readonly enabled: boolean;
  readonly safeLabel: string;
  readonly url?: string;
}

export function createDatabaseHarnessState(
  environment: Readonly<Record<string, string | undefined>>,
): DatabaseHarnessState {
  const url = environment[TEST_DATABASE_URL_ENV]?.trim();
  if (!url) {
    return {
      enabled: false,
      safeLabel: `${TEST_DATABASE_URL_ENV} is not set`,
    };
  }

  const parsed = new URL(url);
  if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') {
    throw new Error(`${TEST_DATABASE_URL_ENV} must use a postgres:// or postgresql:// URL.`);
  }

  parsed.password = parsed.password ? '<redacted>' : '';
  parsed.username = parsed.username ? '<user>' : '';

  return {
    enabled: true,
    safeLabel: parsed.toString(),
    url,
  };
}
