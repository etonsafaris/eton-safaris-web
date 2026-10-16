import { isPgTooManyClientsError, withPgRetry } from '@/lib/pg-retry';

const isServer = typeof window === 'undefined';

type Sql = import('postgres').Sql;

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

/** Aiven free tier Γëê 20 connections ΓÇö cap per isolate/process. */
export const AIVEN_POOL_HARD_CAP = 15;

/** Allow a few concurrent public reads — serializing every query made every page crawl. */
const DEFAULT_POOL_MAX = process.env.VERCEL ? 4 : 6;

const POOL_MAX = Math.max(
  1,
  Math.min(AIVEN_POOL_HARD_CAP, Number(process.env.PG_POOL_MAX) || DEFAULT_POOL_MAX)
);

const POSTGRES_MAX = Math.min(10, POOL_MAX);

declare global {
  // eslint-disable-next-line no-var
  var _aivenSql: Sql | undefined;
  // eslint-disable-next-line no-var
  var _aivenPool: PgPool | undefined;
  // eslint-disable-next-line no-var
  var aivenPool: PgPool | undefined;
}

function getEdgeSql(): Sql {
  if (!global._aivenSql) {
    const connectionString = resolveAivenConnectionString();
    if (!connectionString) {
      throw new Error('Aiven DATABASE_URL is not configured.');
    }
    const postgresImport = require('postgres') as typeof import('postgres');
    const postgres = postgresImport.default ?? postgresImport;
    global._aivenSql = postgres(connectionString, {
      ssl: 'require',
      max: POSTGRES_MAX,
      idle_timeout: process.env.VERCEL ? 5 : 20,
      connect_timeout: 5,
      max_lifetime: process.env.VERCEL ? 60 : 60 * 5,
      prepare: false,
      fetch_types: false,
      connection: {
        application_name: 'eton-safaris-web',
      },
    });
  }
  return global._aivenSql;
}

function rowsFromSqlResult<T extends QueryResultRow>(rows: readonly T[]): QueryResult<T> {
  return {
    rows: [...rows],
    rowCount: rows.length,
    command: '',
    oid: 0,
    fields: [],
  };
}

function edgeClientFromSql(sql: Sql): PoolClient {
  const client = {
    query: async <T extends QueryResultRow = QueryResultRow>(
      text: string,
      values?: unknown[]
    ): Promise<QueryResult<T>> => {
      const rows = values?.length
        ? await sql.unsafe<T[]>(text, values as never[])
        : await sql.unsafe<T[]>(text);
      return rowsFromSqlResult(rows);
    },
    release: () => undefined,
  };
  return client;
}

export function getAivenPool(): PgPool | null {
  if (!isServer || !resolveAivenConnectionString()) return null;

  if (!global._aivenPool) {
    const sql = getEdgeSql();
    const poolLike: PgPool = {
      connect: async () => edgeClientFromSql(sql),
      query: async <T extends QueryResultRow = QueryResultRow>(text: string, values?: unknown[]) =>
        edgeClientFromSql(sql).query<T>(text, values),
      end: async () => {
        await sql.end({ timeout: 5 });
        global._aivenSql = undefined;
        global._aivenPool = undefined;
        global.aivenPool = undefined;
      },
      on: () => poolLike,
    };
    global._aivenPool = poolLike;
    global.aivenPool = poolLike;
  }
  return global._aivenPool;
}

export const getPool = getAivenPool;

export function getSql(): Sql {
  return getEdgeSql();
}

const PG_SLOT_MAX = Math.max(
  1,
  Math.min(POSTGRES_MAX, Number(process.env.PG_SLOT_MAX) || (process.env.VERCEL ? 3 : 5))
);
let pgSlotsInUse = 0;
const pgSlotWaiters: Array<() => void> = [];

const PG_SLOT_WAIT_MS = Math.max(
  3000,
  Number(process.env.PG_SLOT_WAIT_MS) || (process.env.VERCEL ? 6000 : 20000)
);

function connectRetryDelayMs(attempt: number) {
  const base = 350 * Math.pow(2, attempt);
  return Math.min(12000, base + Math.floor(Math.random() * 300));
}

async function connectWithRetry(pool: PgPool): Promise<PoolClient> {
  let lastError: unknown;
  const maxAttempts = process.env.VERCEL ? 2 : 4;
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
  // Slot semaphore caps concurrency; do not serialize every query (that made pages crawl).
  return withPgRetry(async () => {
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
  }, process.env.VERCEL ? 3 : 5);
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
