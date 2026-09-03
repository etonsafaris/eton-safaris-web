import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
const normalizedConnectionString = connectionString
  ? connectionString.replace(/[?&]sslmode=require\b/, '').replace(/[?&]sslmode=verify-full\b/, '')
  : undefined;

// Global caching wrapper to protect your 20 max connection limits on Vercel
const cachedPool: Pool | null = normalizedConnectionString
  ? (global.aivenPool ||= new Pool({
      connectionString: normalizedConnectionString,
      ssl: { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
    }))
  : null;

export const db = {
  async connect() {
    if (!cachedPool) throw new Error('Aiven DATABASE_URL is not configured.');
    return cachedPool.connect();
  },
};

// Safe utility helper to handle simple data queries inside your backend
export const aivenFetch = async (tableName: string, columns = '*') => {
  try {
    const client = await db.connect();
    const queryText = `SELECT ${columns} FROM ${tableName}`;
    const res = await client.query(queryText);
    client.release();
    return { data: res.rows, error: null };
  } catch (error: any) {
    console.error(`Aiven server query error on [${tableName}]:`, error.message);
    return { data: null, error };
  }
};
