import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
const normalizedConnectionString = connectionString
  ? connectionString.replace(/[?&]sslmode=require\b/, '').replace(/[?&]sslmode=verify-full\b/, '')
  : undefined;

const cachedPool: Pool | null = normalizedConnectionString
  ? (global.aivenPool ||= new Pool({
      connectionString: normalizedConnectionString,
      ssl: { rejectUnauthorized: false },
      max: 2,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 4500,
      statement_timeout: 12000,
      maxLifetimeSeconds: 60,
    }))
  : null;

export const db = {
  async connect() {
    if (!cachedPool) throw new Error('Aiven DATABASE_URL is not configured.');
    return cachedPool.connect();
  },
  async query<T = any>(text: string, values?: unknown[]) {
    if (!cachedPool) throw new Error('Aiven DATABASE_URL is not configured.');
    return cachedPool.query<T>(text, values);
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
