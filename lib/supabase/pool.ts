import postgres from 'postgres';
import type { Pool as PgPool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { isPgTooManyClientsError } from '@/lib/pg-retry';
import { serialPgWork } from '@/lib/pg-serial';

const isServer = typeof window === 'undefined';

type Sql = postgres.Sql;

const globalForDb = globalThis as typeof globalThis & {
  __aivenPostgres?: Sql;
};

function normalizePgUrl(raw: string): string {
  return raw.replace(/[?&]sslmode=require\b/, '').replace(/[?&]sslmode=verify-full\b/, '');
}

function readHyperdriveConnectionString(): string | undefined {
  if (!isServer) return undefined;
  try {
    const { getCloudflareContext } = require('@opennextjs/cloudflare') as {
      getCloudflareContext: () => { env?: Record<string, { connectionString?: string }> };
    };
    const hyper = getCloudflareContext()?.env?.HYPERDRIVE;
    const fromHyperdrive = hyper?.connectionString?.trim();
    if (fromHyperdrive) return normalizePgUrl(fromHyperdrive);
  } catch {
    /* not running on @opennextjs/cloudflare */
  }
  return undefined;
}

/** Aiven via Hyperdrive (Workers/Pages) or `DATABASE_URL` secret / `.env.local`. */
export function resolveAivenConnectionString(): string | undefined {
  const fromHyperdrive = readHyperdriveConnectionString();
  if (fromHyperdrive) return fromHyperdrive;

  const fromEnv = process.env.DATABASE_URL?.trim();
  if (fromEnv) return normalizePgUrl(fromEnv);

  return undefined;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(resolveAivenConnectionString());
}

/** Aiven free tier ≈ 20 connections — never exceed this per isolate. */
export const AIVEN_POOL_HARD_CAP = 15;

const DEFAULT_POOL_MAX =
  process.env.VERCEL || process.env.CF_PAGES || process.env.CLOUDFLARE === '1' ? 2 : 5;
const POOL_MAX = Math.max(
  1,
  Math.min(AIVEN_POOL_HARD_CAP, Number(process.env.PG_POOL_MAX) || DEFAULT_POOL_MAX)
);

const POOL_SIZE = Math.min(10, POOL_MAX);

function createPostgresPool(connectionString: string): Sql {
  const viaHyperdrive = Boolean(readHyperdriveConnectionString());
  return postgres(connectionString, {
    ssl: viaHyperdrive ? false : 'require',
    max: POOL_SIZE,
    idle_timeout: 20,
    connect_timeout: 10,
    max_lifetime: 60 * 10,
    prepare: false,
    fetch_types: false,
    connection: {
      application_name: 'eton-safaris-web',
    },
  });
}

/**
 * Edge-safe serverless pool (`postgres.js`) — one pool per isolate, recycled across requests.
 * Uses Cloudflare Hyperdrive when bound; otherwise `DATABASE_URL` (Aiven).
 */
export function getSql(): Sql {
  if (!isServer) {
    throw new Error('Database pool is only available on the server.');
  }
  const connectionString = resolveAivenConnectionString();
  if (!connectionString) {
    throw new Error('Aiven DATABASE_URL is not configured.');
  }
  if (!globalForDb.__aivenPostgres) {
    globalForDb.__aivenPostgres = createPostgresPool(connectionString);
  }
  return globalForDb.__aivenPostgres;
}

if (process.env.NODE_ENV !== 'production') {
  /* Hot reload: reuse the same pool on the global object (set lazily via getSql). */
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

function compatClient(sql: Sql): PoolClient {
  return {
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
  } as PoolClient;
}

/** @deprecated Use `getSql()` — kept for legacy imports. */
export function getAivenPool(): PgPool | null {
  if (!isServer || !resolveAivenConnectionString()) return null;
  const sql = getSql();
  const poolLike = {
    connect: async () => compatClient(sql),
    query: async <T extends QueryResultRow = QueryResultRow>(text: string, values?: unknown[]) =>
      compatClient(sql).query<T>(text, values),
    end: async () => {
      await sql.end({ timeout: 5 });
      globalForDb.__aivenPostgres = undefined;
    },
    on: () => poolLike,
  };
  return poolLike as PgPool;
}

export const getPool = getAivenPool;

const PG_SLOT_MAX = Math.max(
  1,
  Math.min(
    POOL_SIZE,
    Number(process.env.PG_SLOT_MAX) ||
      (process.env.VERCEL || process.env.CLOUDFLARE === '1' ? 2 : 4)
  )
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

async function connectWithRetry(): Promise<PoolClient> {
  const sql = getSql();
  let lastError: unknown;
  const maxAttempts = process.env.VERCEL || process.env.CLOUDFLARE === '1' ? 4 : 6;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return compatClient(sql);
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
  if (!resolveAivenConnectionString()) {
    throw new Error('Aiven DATABASE_URL is not configured.');
  }
  return serialPgWork(async () => {
    let slotHeld = false;
    let client: PoolClient | null = null;
    try {
      await acquirePgSlot();
      slotHeld = true;
      client = await connectWithRetry();
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
  /** Raw `postgres.js` pool (edge-safe). */
  get sql() {
    return getSql();
  },
  async connect(): Promise<PoolClient> {
    let slotHeld = false;
    try {
      await acquirePgSlot();
      slotHeld = true;
      const client = await connectWithRetry();
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
