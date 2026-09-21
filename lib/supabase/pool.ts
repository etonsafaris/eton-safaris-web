import type { Pool as PgPool, PoolClient, QueryResult, QueryResultRow } from 'pg';

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
 * One shared Aiven pool per Node process (survives Next.js hot reload).
 * Lazy init keeps `pg` out of the browser bundle.
 */
export function getAivenPool(): PgPool | null {
  if (!isServer || !normalizedConnectionString) return null;

  if (global._aivenPool) return global._aivenPool;
  if (global.aivenPool) {
    global._aivenPool = global.aivenPool;
    return global._aivenPool;
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
      allowExitOnIdle: true,
    });

  if (!global._aivenPool) {
    global._aivenPool = pool;
    global.aivenPool = pool;
  }

  return global._aivenPool;
}

/** Preferred API: one client per operation, always released in `finally`. */
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

export async function queryRows<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values?: unknown[]
): Promise<T[]> {
  const result = await withPgClient((client) => client.query<T>(text, values));
  return result.rows;
}

export const db = {
  connect() {
    const pool = getAivenPool();
    if (!pool) throw new Error('Aiven DATABASE_URL is not configured.');
    return pool.connect();
  },
  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[]
  ): Promise<QueryResult<T>> {
    return withPgClient((client) => client.query<T>(text, values));
  },
};

export const aivenFetch = async (tableName: string, columns = '*') => {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
    return { data: null, error: new Error('Invalid table name') };
  }
  try {
    const rows = await queryRows(`SELECT ${columns} FROM ${tableName}`);
    return { data: rows, error: null };
  } catch (error: any) {
    console.error(`Aiven server query error on [${tableName}]:`, error?.message || error);
    return { data: null, error };
  }
};
