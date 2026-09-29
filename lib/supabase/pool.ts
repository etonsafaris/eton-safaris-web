import type { Pool as PgPool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { isPgTooManyClientsError } from '@/lib/pg-retry';
import { serialPgWork } from '@/lib/pg-serial';

const connectionString = process.env.DATABASE_URL;
const normalizedConnectionString = connectionString
  ? connectionString.replace(/[?&]sslmode=require\b/, '').replace(/[?&]sslmode=verify-full\b/, '')
  : undefined;

const isServer = typeof window === 'undefined';

/** Aiven free tier ≈ 20 connections — never exceed this per Node process. */
export const AIVEN_POOL_HARD_CAP = 15;

/**
 * One shared pool per process (`global._aivenPool`) — survives Next.js hot reload without leaking connections.
 * Keep per-instance pool small on Vercel (many lambdas); cap at 15 via env for dedicated servers.
 */
const DEFAULT_POOL_MAX = process.env.VERCEL ? 2 : 5;
const POOL_MAX = Math.max(
  1,
  Math.min(AIVEN_POOL_HARD_CAP, Number(process.env.PG_POOL_MAX) || DEFAULT_POOL_MAX)
);

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
  const { Pool } = require('pg') as typeof import('pg');
  const pool = new Pool({
    connectionString: normalizedConnectionString,
    ssl: { rejectUnauthorized: false },
    max: POOL_MAX,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 8000,
    maxUses: 750,
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
const PG_SLOT_MAX = Math.max(
  1,
  Math.min(POOL_MAX, Number(process.env.PG_SLOT_MAX) || (process.env.VERCEL ? 2 : 4))
);
let pgSlotsInUse = 0;
const pgSlotWaiters: Array<() => void> = [];

const PG_SLOT_WAIT_MS = Math.max(
  5000,
  Number(process.env.PG_SLOT_WAIT_MS) || (process.env.VERCEL ? 12000 : 45000)
);

function connectRetryDelayMs(attempt: number) {
  const base = 350 * Math.pow(2, attempt);
  return Math.min(12000, base + Math.floor(Math.random() * 300));
}

async function connectWithRetry(pool: PgPool): Promise<PoolClient> {
  let lastError: unknown;
  const maxAttempts = process.env.VERCEL ? 4 : 8;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await pool.connect();
    } catch (error) {
      lastError = error;
      if (!isPgTooManyClientsError(error) || attempt >= maxAttempts - 1) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, connectRetryDelayMs(attempt)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Could not connect to database');
}

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
  return serialPgWork(async () => {
    let slotHeld = false;
    let client: PoolClient | null = null;
    try {
      await acquirePgSlot();
      slotHeld = true;
      client = await connectWithRetry(pool);
      return await fn(client);
    } finally {
      client?.release();
      if (slotHeld) releasePgSlot();
    }
  });
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
    let slotHeld = false;
    try {
      await acquirePgSlot();
      slotHeld = true;
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
      if (slotHeld) releasePgSlot();
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
