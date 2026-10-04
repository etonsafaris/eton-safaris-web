import type { Pool as PgPool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { isPgTooManyClientsError } from '@/lib/pg-retry';
import { serialPgWork } from '@/lib/pg-serial';

const isServer = typeof window === 'undefined';

type Sql = import('postgres').Sql;

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

/** Aiven via Hyperdrive (Workers) or `DATABASE_URL` secret / local `.env.local`. */
export function resolveAivenConnectionString(): string | undefined {
  const fromHyperdrive = readHyperdriveConnectionString();
  if (fromHyperdrive) return fromHyperdrive;

  const fromEnv = process.env.DATABASE_URL?.trim();
  if (fromEnv) return normalizePgUrl(fromEnv);

  return undefined;
}

/** True when Aiven is reachable via `DATABASE_URL` or a Hyperdrive binding. */
export function isDatabaseConfigured(): boolean {
  return Boolean(resolveAivenConnectionString());
}

/** Aiven free tier ≈ 20 connections — never exceed this per Node process. */
export const AIVEN_POOL_HARD_CAP = 15;

const DEFAULT_POOL_MAX =
  process.env.VERCEL || process.env.CF_PAGES || process.env.CLOUDFLARE === '1' ? 2 : 5;
const POOL_MAX = Math.max(
  1,
  Math.min(AIVEN_POOL_HARD_CAP, Number(process.env.PG_POOL_MAX) || DEFAULT_POOL_MAX)
);

declare global {
  // eslint-disable-next-line no-var
  var _aivenSql: Sql | undefined;
  // eslint-disable-next-line no-var
  var _aivenPool: PgPool | undefined;
  // eslint-disable-next-line no-var
  var aivenPool: PgPool | undefined;
}

function isCloudflareWorkerRuntime(): boolean {
  return process.env.CLOUDFLARE === '1' || Boolean(readHyperdriveConnectionString());
}

/**
 * Edge-safe `postgres` driver (serverless TCP via Hyperdrive / nodejs_compat on Workers).
 * Falls back to `pg` only for local Node tooling when not on Cloudflare.
 */
function getEdgeSql(): Sql {
  if (!global._aivenSql) {
    const connectionString = resolveAivenConnectionString();
    if (!connectionString) {
      throw new Error('Aiven DATABASE_URL is not configured.');
    }
    const postgresImport = require('postgres') as typeof import('postgres');
    const postgres = postgresImport.default ?? postgresImport;
    global._aivenSql = postgres(connectionString, {
      max: POOL_MAX,
      idle_timeout: 10,
      connect_timeout: 8,
      max_lifetime: 60 * 5,
      prepare: false,
      ssl: 'require',
      fetch_types: false,
      connection: {
        application_name: 'eton-safaris-web',
      },
    });
  }
  return global._aivenSql;
}

function createNodePgPool(): PgPool {
  const connectionString = resolveAivenConnectionString();
  if (!connectionString) {
    throw new Error('Aiven DATABASE_URL is not configured.');
  }
  const { Pool } = require('pg') as typeof import('pg');
  const pool = new Pool({
    connectionString,
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

function useEdgeDriver(): boolean {
  if (!isServer) return false;
  if (isCloudflareWorkerRuntime()) return true;
  return process.env.AIVEN_USE_POSTGRES_DRIVER === '1';
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
      const rows = values?.length ? await sql.unsafe<T[]>(text, values as never[]) : await sql.unsafe<T[]>(text);
      return rowsFromSqlResult(rows);
    },
    release: () => undefined,
  };
  return client as PoolClient;
}

export function getAivenPool(): PgPool | null {
  if (!isServer || !resolveAivenConnectionString()) return null;

  if (useEdgeDriver()) {
    if (!global._aivenPool) {
      const sql = getEdgeSql();
      const poolLike = {
        connect: async () => edgeClientFromSql(sql),
        query: async <T extends QueryResultRow = QueryResultRow>(
          text: string,
          values?: unknown[]
        ) => edgeClientFromSql(sql).query<T>(text, values),
        end: async () => {
          await sql.end({ timeout: 5 });
          global._aivenSql = undefined;
          global._aivenPool = undefined;
        },
        on: () => poolLike,
      };
      global._aivenPool = poolLike as PgPool;
      global.aivenPool = global._aivenPool;
    }
    return global._aivenPool;
  }

  if (!global._aivenPool) {
    global._aivenPool = global.aivenPool ?? createNodePgPool();
    global.aivenPool = global._aivenPool;
  }
  return global._aivenPool;
}

export const getPool = getAivenPool;

const PG_SLOT_MAX = Math.max(
  1,
  Math.min(
    POOL_MAX,
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

async function connectWithRetry(pool: PgPool): Promise<PoolClient> {
  if (useEdgeDriver()) {
    return edgeClientFromSql(getEdgeSql());
  }
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
