import {
  createWorkLedgerDatabase,
  DatabaseClosedError,
  DatabaseConfigurationError,
  TransactionConfigurationError,
} from '../src/index.js';

describe('database client boundary', () => {
  it.each([
    [{ connectionString: 'not-a-url' }, 'connectionString'],
    [{ connectionString: 'https://example.test/database' }, 'connectionString'],
    [
      { applicationName: 'Unsafe Name', connectionString: 'postgres://localhost/workledger' },
      'applicationName',
    ],
    [{ connectionString: 'postgres://localhost/workledger', maxConnections: 0 }, 'maxConnections'],
  ] as const)('rejects invalid configuration without echoing its value', (configuration, field) => {
    expect(() => createWorkLedgerDatabase(configuration)).toThrowError(
      expect.objectContaining<Partial<DatabaseConfigurationError>>({
        code: 'DATABASE_CONFIGURATION_INVALID',
        field,
      }),
    );

    try {
      createWorkLedgerDatabase(configuration);
    } catch (error) {
      expect(String(error)).not.toContain(configuration.connectionString);
    }
  });

  it('requires an explicit bounded database-only retry contract', async () => {
    const database = createWorkLedgerDatabase({
      connectionString: 'postgres://localhost/workledger',
    });

    await expect(
      database.transaction(async () => undefined, {
        retry: { maxAttempts: 1, mode: 'DATABASE_ONLY' },
      }),
    ).rejects.toBeInstanceOf(TransactionConfigurationError);
    await database.close();
  });

  it('closes idempotently and rejects later transactions', async () => {
    const database = createWorkLedgerDatabase({
      connectionString: 'postgres://localhost/workledger',
    });

    await database.close();
    await database.close();
    await expect(database.transaction(async () => undefined)).rejects.toBeInstanceOf(
      DatabaseClosedError,
    );
  });
});
