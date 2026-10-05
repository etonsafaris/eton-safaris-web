import { Pool, type PoolClient as PgNativeClient, type QueryResult as PgQueryResult } from 'pg';
import { isPgTooManyClientsError } from '@/lib/pg-retry';
import { serialPgWork } from '@/lib/pg-serial';

const isServer = typeof window === 'undefined';

/** Minimal client shape used across admin + public data loaders. */
export type QueryResultRow = Record<string, unknown>;

export type QueryResult<T extends QueryResultRow = QueryResultRow> = {
  rows: T[];
  rowCount: number | null;
  command: string;
  oid: number;
  fields: [];
};

export type PoolClient = {
  query: <T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[]
  ) => Promise<QueryResult<T>>;
  release: (err?: boolean | Error) => void;
};

export type PgPool = {
  connect: () => Promise<PoolClient>;
  query: <T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[]
  ) => Promise<QueryResult<T>>;
  end: () => Promise<void>;
  on: (event: string, listener: (...args: unknown[]) => void) => PgPool;
};

const globalForDb = globalThis as typeof globalThis & {
  _aivenPool?: Pool;
  aivenPool?: Pool;
};

function normalizePgUrl(raw: string): string {
  return raw.replace(/[?&]sslmode=require\b/, '').replace(/[?&]sslmode=verify-full\b/, '');
}

/** Aiven PostgreSQL via `DATABASE_URL` (Vercel / local Node). */
export function resolveAivenConnectionString(): string | undefined {
  const fromEnv = process.env.DATABASE_URL?.trim();
  if (fromEnv) return normalizePgUrl(fromEnv);
  return undefined;
}

export function getDatabaseConnectionSource(): 'direct' | 'none' {
  return process.env.DATABASE_URL?.trim() ? 'direct' : 'none';
}

export function isDatabaseConfigured(): boolean {
  return getDatabaseConnectionSource() !== 'none';
}

/** Aiven tier ≈ 20 connections — cap per serverless isolate. */
export const AIVEN_POOL_HARD_CAP = 15;

const POOL_MAX = Math.max(
  1,
  Math.min(
    AIVEN_POOL_HARD_CAP,
    Number(process.env.PG_POOL_MAX) || (process.env.VERCEL ? 3 : AIVEN_POOL_HARD_CAP)
  )
);

function mapPgResult<T extends QueryResultRow>(result: PgQueryResult<T>): QueryResult<T> {
  return {
    rows: result.rows,
    rowCount: result.rowCount,
    command: result.command,
    oid: result.oid ?? 0,
    fields: [],
  };
}

function createPgPool(): Pool {
  const connectionString = resolveAivenConnectionString();
  if (!connectionString) {
    throw new Error('Aiven DATABASE_URL is not configured.');
  }
  return new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: POOL_MAX,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    application_name: 'eton-safaris-web',
  });
}

/** One cached `pg` Pool per isolate — prevents connection leaks under serverless traffic. */
function getNativePool(): Pool {
  if (!isServer) {
    throw new Error('Database pool is server-only.');
  }
  if (!globalForDb._aivenPool) {
    globalForDb._aivenPool = createPgPool();
    globalForDb.aivenPool = globalForDb._aivenPool;
  }
  return globalForDb._aivenPool;
}

function clientFromNative(native: PgNativeClient): PoolClient {
  return {
    query: async <T extends QueryResultRow = QueryResultRow>(text: string, values?: unknown[]) => {
      const result = values?.length
        ? await native.query<T>(text, values)
        : await native.query<T>(text);
      return mapPgResult(result);
    },
    release: (err?: boolean | Error) => {
      native.release(err);
    },
  };
}

export function getAivenPool(): PgPool | null {
  if (!isServer || !resolveAivenConnectionString()) return null;

  const native = getNativePool();
  const poolLike: PgPool = {
    connect: async () => {
      const client = await native.connect();
      return clientFromNative(client);
    },
    query: async <T extends QueryResultRow = QueryResultRow>(text: string, values?: unknown[]) => {
      const result = values?.length
        ? await native.query<T>(text, values)
        : await native.query<T>(text);
      return mapPgResult(result);
    },
    end: async () => {
      await native.end();
      globalForDb._aivenPool = undefined;
      globalForDb.aivenPool = undefined;
    },
    on: (event, listener) => {
      native.on(event, listener);
      return poolLike;
    },
  };
  return poolLike;
}

export const getPool = getAivenPool;

/** @deprecated Use `db.query` / `withPgClient` — kept for legacy imports. */
export function getSql(): never {
  throw new Error('getSql() was removed; use db.query() or withPgClient() with the pg pool.');
}

const PG_SLOT_MAX = Math.max(
  1,
  Math.min(POOL_MAX, Number(process.env.PG_SLOT_MAX) || (process.env.VERCEL ? 2 : 4))
);
let pgSlotsInUse = 0;
const pgSlotWaiters: Array<() => void> = [];

const PG_SLOT_WAIT_MS = Math.max(
  5000,
  Number(process.env.PG_SLOT_WAIT_MS) || (process.env.VERCEL ? 12_000 : 45_000)
);

function connectRetryDelayMs(attempt: number) {
  const base = 350 * Math.pow(2, attempt);
  return Math.min(12_000, base + Math.floor(Math.random() * 300));
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

export async function withPgClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const pool = getAivenPool();
  if (!pool) {
    throw new Error('Aiven DATABASE_URL is not configured.');
  }
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
