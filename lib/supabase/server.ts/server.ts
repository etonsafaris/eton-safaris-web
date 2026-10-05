/**
 * Canonical server DB entry — edge-safe `postgres` pool (`withPgClient` always releases).
 */
export {
  aivenFetch,
  db,
  getAivenPool,
  getPool,
  getSql,
  isDatabaseConfigured,
  getDatabaseConnectionSource,
  queryRows,
  resolveAivenConnectionString,
  withPgClient,
} from '@/lib/supabase/pool';

export type { PoolClient, PgPool, QueryResult, QueryResultRow } from '@/lib/supabase/pool';
