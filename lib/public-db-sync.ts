/**
 * Public ↔ admin data lock: one Aiven PostgreSQL pool (`DATABASE_URL`).
 *
 * - Admin API routes: `withPgClient` / `adminPgQuery` from `@/lib/supabase/pool`
 * - Public CMS reads: `fetchCollectionRecords` / `db.query` in `@/lib/data-server`
 * - Both resolve through edge-safe `postgres` via `getAivenPool()` — identical row payloads for the same SQL.
 *
 * Visibility helpers: `isPubliclyVisibleRecord`, `fetchSyncedPublicRecord` in `@/lib/data-server`.
 */
export { db, getAivenPool, getPool, queryRows, withPgClient } from '@/lib/supabase/pool';
