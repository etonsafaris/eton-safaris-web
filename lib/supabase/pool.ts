import type { Pool as PgPool, PoolClient } from 'pg';

const connectionString = process.env.DATABASE_URL;
const normalizedConnectionString = connectionString
  ? connectionString.replace(/[?&]sslmode=require\b/, '').replace(/[?&]sslmode=verify-full\b/, '')
  : undefined;

const isServer = typeof window === 'undefined';

/**
 * Build the pool lazily. Creating it while the module loads breaks any client
 * component that (indirectly) imports this file: `pg` cannot open sockets in the
 * browser bundle, the module throws, and React then renders `undefined`.
 */
function getPool(): PgPool | null {
  if (!isServer || !normalizedConnectionString) return null;
  if (global.aivenPool) return global.aivenPool;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Pool } = require('pg') as typeof import('pg');
  global.aivenPool = new Pool({
    connectionString: normalizedConnectionString,
    ssl: { rejectUnauthorized: false },
    max: 3,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 4500,
    statement_timeout: 8000,
    maxLifetimeSeconds: 60,
    allowExitOnIdle: true,
  });
  return global.aivenPool;
}

/** Run a query with a dedicated client; always calls `client.release()` in `finally`. */
export async function withPgClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const pool = getPool();
  if (!pool) throw new Error('Aiven DATABASE_URL is not configured.');
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

export const db = {
  async connect() {
    const pool = getPool();
    if (!pool) throw new Error('Aiven DATABASE_URL is not configured.');
    return pool.connect();
  },
  async query<T = any>(text: string, values?: unknown[]) {
    return withPgClient((client) => client.query<T>(text, values));
  },
};

export const aivenFetch = async (tableName: string, columns = '*') => {
  try {
    const client = await db.connect();
    try {
      const queryText = `SELECT ${columns} FROM ${tableName}`;
      const res = await client.query(queryText);
      return { data: res.rows, error: null };
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error(`Aiven server query error on [${tableName}]:`, error.message);
    return { data: null, error };
  }
};
