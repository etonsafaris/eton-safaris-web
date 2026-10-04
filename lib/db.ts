/**
 * Primary database entry — edge-safe Aiven pool (Cloudflare Hyperdrive + `postgres.js`).
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
