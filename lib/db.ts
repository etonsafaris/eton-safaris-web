/**
 * Primary database entry — Aiven via Hyperdrive (`pg` on Workers) or direct `DATABASE_URL`.
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
