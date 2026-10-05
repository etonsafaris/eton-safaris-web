import type { PoolClient } from '@/lib/supabase/pool';
import { withPgClient } from '@/lib/supabase/pool';

/**
 * Run admin API database work on a pooled client that is always released in `withPgClient` finally.
 * Prefer this over raw `pool.connect()` in `app/api/admin/*` routes.
 */
export async function withAdminPgRoute<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  return withPgClient(work);
}
