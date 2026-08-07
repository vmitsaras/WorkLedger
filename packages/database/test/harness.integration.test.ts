import { createDatabaseHarnessState, TEST_DATABASE_URL_ENV } from '@workledger/test-utils';

test('reports the database harness as disabled until WL-104 provides a test database', () => {
  expect(createDatabaseHarnessState({})).toEqual({
    enabled: false,
    safeLabel: `${TEST_DATABASE_URL_ENV} is not set`,
  });
});

test('redacts credentials from database harness labels', () => {
  const state = createDatabaseHarnessState({
    [TEST_DATABASE_URL_ENV]: 'postgres://workledger:secret@localhost:5432/workledger_test',
  });

  expect(state.enabled).toBe(true);
  expect(state.safeLabel).toBe(
    'postgres://%3Cuser%3E:%3Credacted%3E@localhost:5432/workledger_test',
  );
});
