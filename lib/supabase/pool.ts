import type { Pool as PgPool, PoolClient, QueryResult } from 'pg';

const connectionString = process.env.DATABASE_URL;
const normalizedConnectionString = connectionString
  ? connectionString.replace(/[?&]sslmode=require\b/, '').replace(/[?&]sslmode=verify-full\b/, '')
  : undefined;

const isServer = typeof window === 'undefined';

declare global {
  // eslint-disable-next-line no-var
  var aivenPool: PgPool | undefined;
  // eslint-disable-next-line no-var
  var _aivenPool: PgPool | undefined;
}

/**
 * Single cached Aiven pool (survives Next.js hot reload). Lazy init avoids bundling `pg` in the browser.
 */
export function getAivenPool(): PgPool | null {
  if (!isServer || !normalizedConnectionString) return null;
  if (global._aivenPool) return global._aivenPool;
  if (global.aivenPool) {
    global._aivenPool = global.aivenPool;
    return global.aivenPool;
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Pool } = require('pg') as typeof import('pg');
  const pool =
    global._aivenPool ||
    new Pool({
      connectionString: normalizedConnectionString,
      ssl: { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 15000,
      connectionTimeoutMillis: 4500,
      statement_timeout: 12000,
    });
  if (!global._aivenPool) {
    global._aivenPool = pool;
    global.aivenPool = pool;
  }
  return global._aivenPool;
}

/** Run a query with a dedicated client; always calls `client.release()` in `finally`. */
export async function withPgClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const pool = getAivenPool();
  if (!pool) throw new Error('Aiven DATABASE_URL is not configured.');
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

export const db = {
  connect() {
    const pool = getAivenPool();
    if (!pool) throw new Error('Aiven DATABASE_URL is not configured.');
    return pool.connect();
  },
  async query<T = any>(text: string, values?: unknown[]): Promise<QueryResult<T>> {
    return withPgClient((client) => client.query<T>(text, values));
  },
};

export const aivenFetch = async (tableName: string, columns = '*') => {
  const pool = getAivenPool();
  if (!pool) {
    return { data: null, error: new Error('Aiven DATABASE_URL is not configured.') };
  }
  const client = await pool.connect();
  try {
    const queryText = `SELECT ${columns} FROM ${tableName}`;
    const res = await client.query(queryText);
    return { data: res.rows, error: null };
  } catch (error: any) {
    console.error(`Aiven server query error on [${tableName}]:`, error.message);
    return { data: null, error };
  } finally {
    client.release();
  }
};
