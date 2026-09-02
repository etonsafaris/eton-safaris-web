import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('Missing DATABASE_URL connection string inside environment variables.');
}

// Global caching wrapper to protect your 20 max connection limits on Vercel
let cachedPool: Pool;

if (!global.aivenPool) {
  global.aivenPool = new Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
  });
}
cachedPool = global.aivenPool;

export const db = cachedPool;

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
