import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

import { createTransactionRepositories } from './repositories/postgres.js';
import * as schema from './schema/index.js';
import type {
  TransactionOptions,
  WorkLedgerDatabase,
  WorkLedgerTransaction,
} from './transactions/contracts.js';

const { Pool } = pg;
const RETRYABLE_TRANSACTION_CODES = new Set(['40001', '40P01']);

export type WorkLedgerDatabaseConfiguration = Readonly<{
  applicationName?: string;
  connectionString: string;
  connectionTimeoutMilliseconds?: number;
  idleTimeoutMilliseconds?: number;
  maxConnections?: number;
}>;

export class DatabaseConfigurationError extends Error {
  readonly code = 'DATABASE_CONFIGURATION_INVALID';

  constructor(readonly field: keyof WorkLedgerDatabaseConfiguration) {
    super(`Invalid database configuration field: ${field}.`);
    this.name = 'DatabaseConfigurationError';
  }
}

export class DatabaseClosedError extends Error {
  readonly code = 'DATABASE_CLOSED';

  constructor() {
    super('The WorkLedger database has been closed.');
    this.name = 'DatabaseClosedError';
  }
}

export class TransactionConfigurationError extends Error {
  readonly code = 'TRANSACTION_CONFIGURATION_INVALID';

  constructor(readonly field: 'isolationLevel' | 'retry.maxAttempts' | 'retry.mode') {
    super(`Invalid transaction configuration field: ${field}.`);
    this.name = 'TransactionConfigurationError';
  }
}

export function createWorkLedgerDatabase(
  configuration: WorkLedgerDatabaseConfiguration,
): WorkLedgerDatabase {
  const resolved = resolveConfiguration(configuration);
  const pool = new Pool({
    application_name: resolved.applicationName,
    connectionString: resolved.connectionString,
    connectionTimeoutMillis: resolved.connectionTimeoutMilliseconds,
    idleTimeoutMillis: resolved.idleTimeoutMilliseconds,
    max: resolved.maxConnections,
  });
  const database = drizzle(pool, { schema });
  let closed = false;

  return Object.freeze({
    async close(): Promise<void> {
      if (closed) return;
      closed = true;
      await pool.end();
    },
    async transaction<T>(
      operation: (transaction: WorkLedgerTransaction) => Promise<T>,
      options?: TransactionOptions,
    ): Promise<T> {
      if (closed) throw new DatabaseClosedError();
      const transactionOptions = resolveTransactionOptions(options);
      let attempt = 1;

      while (true) {
        try {
          return await database.transaction(
            async (transaction) =>
              operation(Object.freeze(createTransactionRepositories(transaction))),
            {
              accessMode: 'read write',
              isolationLevel: transactionOptions.isolationLevel,
            },
          );
        } catch (error) {
          if (attempt >= transactionOptions.maxAttempts || !isRetryableTransactionError(error)) {
            throw error;
          }
          attempt += 1;
        }
      }
    },
  });
}

type ResolvedDatabaseConfiguration = Readonly<{
  applicationName: string;
  connectionString: string;
  connectionTimeoutMilliseconds: number;
  idleTimeoutMilliseconds: number;
  maxConnections: number;
}>;

function resolveConfiguration(
  configuration: WorkLedgerDatabaseConfiguration,
): ResolvedDatabaseConfiguration {
  let databaseUrl: URL;
  try {
    databaseUrl = new URL(configuration.connectionString);
  } catch {
    throw new DatabaseConfigurationError('connectionString');
  }
  if (!['postgres:', 'postgresql:'].includes(databaseUrl.protocol)) {
    throw new DatabaseConfigurationError('connectionString');
  }

  const applicationName = configuration.applicationName ?? 'workledger-api';
  if (!/^[a-z][a-z0-9_-]{0,62}$/.test(applicationName)) {
    throw new DatabaseConfigurationError('applicationName');
  }

  return Object.freeze({
    applicationName,
    connectionString: configuration.connectionString,
    connectionTimeoutMilliseconds: boundedInteger(
      configuration.connectionTimeoutMilliseconds ?? 5_000,
      100,
      60_000,
      'connectionTimeoutMilliseconds',
    ),
    idleTimeoutMilliseconds: boundedInteger(
      configuration.idleTimeoutMilliseconds ?? 30_000,
      1_000,
      600_000,
      'idleTimeoutMilliseconds',
    ),
    maxConnections: boundedInteger(configuration.maxConnections ?? 10, 1, 100, 'maxConnections'),
  });
}

function boundedInteger(
  value: number,
  minimum: number,
  maximum: number,
  field: keyof WorkLedgerDatabaseConfiguration,
): number {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new DatabaseConfigurationError(field);
  }
  return value;
}

function resolveTransactionOptions(options?: TransactionOptions): Readonly<{
  isolationLevel: 'read committed' | 'repeatable read' | 'serializable';
  maxAttempts: number;
}> {
  const isolationLevel = options?.isolationLevel ?? 'read committed';
  if (!['read committed', 'repeatable read', 'serializable'].includes(isolationLevel)) {
    throw new TransactionConfigurationError('isolationLevel');
  }
  if (options?.retry !== undefined && options.retry.mode !== 'DATABASE_ONLY') {
    throw new TransactionConfigurationError('retry.mode');
  }
  const maxAttempts = options?.retry?.maxAttempts ?? 1;
  if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 2 || maxAttempts > 5) {
    if (options?.retry !== undefined) {
      throw new TransactionConfigurationError('retry.maxAttempts');
    }
  }

  return Object.freeze({
    isolationLevel,
    maxAttempts,
  });
}

function isRetryableTransactionError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) return false;
  return typeof error.code === 'string' && RETRYABLE_TRANSACTION_CODES.has(error.code);
}
