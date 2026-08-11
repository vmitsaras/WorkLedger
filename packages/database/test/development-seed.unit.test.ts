import { DevelopmentSeedError, seedDevelopmentDatabase } from '../src/index.js';

describe('development seed target guard', () => {
  it('rejects production before attempting a connection', async () => {
    await expect(
      seedDevelopmentDatabase({
        connectionString: 'postgres://production.example.test/workledger',
        environment: 'production',
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<DevelopmentSeedError>>({
        code: 'DEVELOPMENT_SEED_REJECTED',
        reason: 'PRODUCTION_DISABLED',
      }),
    );
  });

  it.each([
    'postgres://database.example.test/workledger_dev',
    'postgres://127.0.0.1/workledger',
    'not-a-database-url',
  ])('rejects a non-local development target without echoing it', async (connectionString) => {
    await expect(
      seedDevelopmentDatabase({ connectionString, environment: 'development' }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<DevelopmentSeedError>>({
        code: 'DEVELOPMENT_SEED_REJECTED',
        reason: 'TARGET_NOT_LOCAL',
      }),
    );
  });
});
