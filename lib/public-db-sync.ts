/**
 * Public ↔ admin data lock: one Aiven PostgreSQL pool (`DATABASE_URL`).
 *
 * - Admin API routes: `withPgClient` / `adminPgQuery` from `@/lib/supabase/pool`
 * - Public CMS reads: `fetchCollectionRecords` / `db.query` in `@/lib/data-server`
 * - Both resolve through `getAivenPool()` — identical row payloads for the same SQL.
 */
export { db, getAivenPool, getPool, queryRows, withPgClient } from '@/lib/supabase/pool';

import { fetchRecordByPublicSlug, isPubliclyVisibleRecord } from '@/lib/data-server';
import type { RecordRow } from '@/lib/types';

export { isPubliclyVisibleRecord };

/** Single-row Aiven read used by public detail routes — null when missing or admin-hidden. */
export async function fetchSyncedPublicRecord(
  table: string,
  slug: string,
  aliases: string[] = []
): Promise<RecordRow | null> {
  const row = await fetchRecordByPublicSlug(table, slug, aliases);
  if (!row || !isPubliclyVisibleRecord(row)) return null;
  return row;
}
