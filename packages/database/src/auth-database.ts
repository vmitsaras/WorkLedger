import { and, eq, gt, sql } from 'drizzle-orm';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import type { BetterAuthOptions } from 'better-auth';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

import {
  authAccounts,
  authRateLimits,
  authSessions,
  authUsers,
  authVerifications,
} from './schema/index.js';
import * as schema from './schema/index.js';

const { Pool } = pg;
export type WorkLedgerAuthDatabaseConfiguration = Readonly<{
  connectionString: string;
  maxConnections?: number;
}>;

export interface WorkLedgerAuthDatabase {
  readonly adapter: NonNullable<BetterAuthOptions['database']>;
  close(): Promise<void>;
  consumeRateLimit(
    key: string,
    rule: Readonly<{ max: number; window: number }>,
    now?: number,
  ): Promise<Readonly<{ allowed: boolean; retryAfter: number | null }>>;
  deactivateUser(userId: string): Promise<void>;
  getRateLimit(key: string): Promise<Readonly<RateLimitRecord> | null>;
  isUserActive(userId: string): Promise<boolean>;
  revokeUserSessions(userId: string): Promise<void>;
  setRateLimit(key: string, value: Readonly<RateLimitRecord>): Promise<void>;
  touchSession(sessionToken: string, now?: Date): Promise<boolean>;
}

type RateLimitRecord = Readonly<{
  count: number;
  key: string;
  lastRequest: number;
}>;

export function createWorkLedgerAuthDatabase(
  configuration: WorkLedgerAuthDatabaseConfiguration,
): WorkLedgerAuthDatabase {
  const pool = new Pool({
    application_name: 'workledger-auth',
    connectionString: configuration.connectionString,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
    max: resolveMaxConnections(configuration.maxConnections),
  });
  const database = drizzle(pool, { schema });
  let closed = false;

  return Object.freeze({
    adapter: drizzleAdapter(database, {
      provider: 'pg',
      schema: {
        account: authAccounts,
        rateLimit: authRateLimits,
        session: authSessions,
        user: authUsers,
        verification: authVerifications,
      },
      transaction: true,
    }),
    async close(): Promise<void> {
      if (closed) return;
      closed = true;
      await pool.end();
    },
    async consumeRateLimit(
      key: string,
      rule: Readonly<{ max: number; window: number }>,
      now = Date.now(),
    ) {
      const client = await pool.connect();
      try {
        await client.query('begin');
        const inserted = await client.query<{ count: number; last_request: string }>(
          `insert into auth_rate_limits (key, count, last_request)
           values ($1, 1, $2)
           on conflict (key) do nothing
           returning count, last_request`,
          [key, now],
        );

        if (inserted.rowCount === 1) {
          await client.query('commit');
          return Object.freeze({ allowed: true, retryAfter: null });
        }

        const existing = await client.query<{ count: number; last_request: string }>(
          `select count, last_request
           from auth_rate_limits
           where key = $1
           for update`,
          [key],
        );
        const row = existing.rows[0];
        if (!row) throw new Error('Rate-limit row disappeared while it was locked.');

        const lastRequest = Number(row.last_request);
        const windowMilliseconds = rule.window * 1_000;
        if (lastRequest + windowMilliseconds <= now) {
          await client.query(
            `update auth_rate_limits
             set count = 1, last_request = $2
             where key = $1`,
            [key, now],
          );
          await client.query('commit');
          return Object.freeze({ allowed: true, retryAfter: null });
        }

        if (row.count >= rule.max) {
          await client.query('commit');
          return Object.freeze({
            allowed: false,
            retryAfter: Math.max(1, Math.ceil((lastRequest + windowMilliseconds - now) / 1_000)),
          });
        }

        await client.query(
          `update auth_rate_limits
           set count = count + 1, last_request = $2
           where key = $1`,
          [key, now],
        );
        await client.query('commit');
        return Object.freeze({ allowed: true, retryAfter: null });
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }
    },
    async deactivateUser(userId: string): Promise<void> {
      await database.transaction(async (transaction) => {
        await transaction.update(authUsers).set({ active: false }).where(eq(authUsers.id, userId));
        await transaction.delete(authSessions).where(eq(authSessions.userId, userId));
      });
    },
    async getRateLimit(key: string): Promise<Readonly<RateLimitRecord> | null> {
      const [row] = await database
        .select({
          count: authRateLimits.count,
          key: authRateLimits.key,
          lastRequest: authRateLimits.lastRequest,
        })
        .from(authRateLimits)
        .where(eq(authRateLimits.key, key))
        .limit(1);
      return row ? Object.freeze(row) : null;
    },
    async isUserActive(userId: string): Promise<boolean> {
      const [row] = await database
        .select({ active: authUsers.active })
        .from(authUsers)
        .where(eq(authUsers.id, userId))
        .limit(1);
      return row?.active === true;
    },
    async revokeUserSessions(userId: string): Promise<void> {
      await database.delete(authSessions).where(eq(authSessions.userId, userId));
    },
    async setRateLimit(key: string, value: Readonly<RateLimitRecord>): Promise<void> {
      await database
        .insert(authRateLimits)
        .values({ count: value.count, key, lastRequest: value.lastRequest })
        .onConflictDoUpdate({
          set: { count: value.count, lastRequest: value.lastRequest },
          target: authRateLimits.key,
        });
    },
    async touchSession(sessionToken: string, now = new Date()): Promise<boolean> {
      const [row] = await database
        .update(authSessions)
        .set({
          expiresAt: sql`least(${now}::timestamptz + interval '30 minutes', ${authSessions.createdAt} + interval '12 hours')`,
          updatedAt: now,
        })
        .where(
          and(
            eq(authSessions.token, sessionToken),
            gt(authSessions.expiresAt, now),
            sql`${authSessions.createdAt} + interval '12 hours' > ${now}::timestamptz`,
            sql`exists (
              select 1 from ${authUsers}
              where ${authUsers.id} = ${authSessions.userId} and ${authUsers.active} = true
            )`,
          ),
        )
        .returning({ id: authSessions.id });

      return row !== undefined;
    },
  });
}

function resolveMaxConnections(value = 5): number {
  if (!Number.isSafeInteger(value) || value < 1 || value > 20) {
    throw new Error('Invalid WorkLedger authentication database maxConnections.');
  }
  return value;
}
