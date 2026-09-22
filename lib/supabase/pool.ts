import type { Pool as PgPool, PoolClient, QueryResult, QueryResultRow } from 'pg';

const connectionString = process.env.DATABASE_URL;
const normalizedConnectionString = connectionString
  ? connectionString.replace(/[?&]sslmode=require\b/, '').replace(/[?&]sslmode=verify-full\b/, '')
  : undefined;

const isServer = typeof window === 'undefined';

/** Aiven free tier = 20 connections total (all apps + dev). Cap each Node process via PG_POOL_MAX. */
const POOL_MAX = Math.max(1, Math.min(20, Number(process.env.PG_POOL_MAX) || 5));

declare global {
  // eslint-disable-next-line no-var
  var _aivenPool: PgPool | undefined;
  // eslint-disable-next-line no-var
  var aivenPool: PgPool | undefined;
}

function createAivenPool(): PgPool {
  if (!normalizedConnectionString) {
    throw new Error('Aiven DATABASE_URL is not configured.');
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Pool } = require('pg') as typeof import('pg');
  const pool = new Pool({
    connectionString: normalizedConnectionString,
    ssl: { rejectUnauthorized: false },
    max: POOL_MAX,
    idleTimeoutMillis: 15000,
    connectionTimeoutMillis: 5000,
    statement_timeout: 12000,
    allowExitOnIdle: true,
  });
  pool.on('error', (err: Error) => {
    console.error('[Aiven] Unexpected idle pool client error:', err.message);
  });
  return pool;
}

/**
 * One shared pool per Node process — survives Next.js hot reload via `global._aivenPool`.
 */
export function getAivenPool(): PgPool | null {
  if (!isServer || !normalizedConnectionString) return null;

  if (!global._aivenPool) {
    global._aivenPool = global.aivenPool ?? createAivenPool();
    global.aivenPool = global._aivenPool;
  }

  return global._aivenPool;
}

/** Alias used by API routes and docs. */
export const getPool = getAivenPool;

/** Caps parallel checkout so ISR + admin + uploads do not exhaust Aiven (20 conn). */
const PG_SLOT_MAX = Math.max(1, Math.min(POOL_MAX, Number(process.env.PG_SLOT_MAX) || 3));
let pgSlotsInUse = 0;
const pgSlotWaiters: Array<() => void> = [];

const PG_SLOT_WAIT_MS = Math.max(5000, Number(process.env.PG_SLOT_WAIT_MS) || 25000);

function acquirePgSlot(): Promise<void> {
  if (pgSlotsInUse < PG_SLOT_MAX) {
    pgSlotsInUse += 1;
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const onAcquire = () => {
      clearTimeout(timer);
      pgSlotsInUse += 1;
      resolve();
    };
    const timer = setTimeout(() => {
      const index = pgSlotWaiters.indexOf(onAcquire);
      if (index >= 0) pgSlotWaiters.splice(index, 1);
      reject(new Error('Database is busy. Wait a moment and click Refresh.'));
    }, PG_SLOT_WAIT_MS);
    pgSlotWaiters.push(onAcquire);
  });
}

function releasePgSlot() {
  pgSlotsInUse = Math.max(0, pgSlotsInUse - 1);
  const next = pgSlotWaiters.shift();
  if (next) next();
}

/**
 * Preferred API: acquire one client, run queries, always `release()` in `finally`.
 */
export async function withPgClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const pool = getAivenPool();
  if (!pool) throw new Error('Aiven DATABASE_URL is not configured.');
  let slotHeld = false;
  let client: PoolClient | null = null;
  try {
    await acquirePgSlot();
    slotHeld = true;
    client = await pool.connect();
    return await fn(client);
  } finally {
    client?.release();
    if (slotHeld) releasePgSlot();
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
  async connect(): Promise<PoolClient> {
    const pool = getAivenPool();
    if (!pool) throw new Error('Aiven DATABASE_URL is not configured.');
    await acquirePgSlot();
    try {
      const client = await pool.connect();
      const originalRelease = client.release.bind(client);
      let released = false;
      client.release = (err?: boolean | Error) => {
        if (released) return;
        released = true;
        originalRelease(err);
        releasePgSlot();
      };
      return client;
    } catch (error) {
      releasePgSlot();
      throw error;
    }
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Aiven server query error on [${tableName}]:`, message);
    return { data: null, error };
  }
};
