/**
 * Canonical server DB entry — pool + safe query helpers (`withPgClient` always releases).
 */
export {
  aivenFetch,
  db,
  getAivenPool,
  getPool,
  getSql,
  isDatabaseConfigured,
  queryRows,
  resolveAivenConnectionString,
  withPgClient,
} from '@/lib/supabase/pool';
