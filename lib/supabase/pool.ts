import type { Pool as PgPool } from 'pg';

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
    max: 8,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    statement_timeout: 8000,
    maxLifetimeSeconds: 60,
  });
  return global.aivenPool;
}

export const db = {
  async connect() {
    const pool = getPool();
    if (!pool) throw new Error('Aiven DATABASE_URL is not configured.');
    return pool.connect();
  },
  async query<T = any>(text: string, values?: unknown[]) {
    const pool = getPool();
    if (!pool) throw new Error('Aiven DATABASE_URL is not configured.');
    return pool.query<T>(text, values);
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
