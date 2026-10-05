/**
 * Primary database entry — Aiven via cached `postgres` pool + DATABASE_URL (Vercel / local).
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
