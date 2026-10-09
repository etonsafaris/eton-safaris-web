import type { RecordRow } from '@/lib/types';

export type AdminTablePageResult = {
  rows: RecordRow[];
  total: number;
  page: number;
  pageSize: number;
};

const TTL_MS = 45_000;
const TTL_MS_EMPTY = 10_000;
const store = new Map<string, { at: number; ttl: number; value: AdminTablePageResult }>();

export function adminTableCacheKey(
  table: string,
  options: {
    page?: number;
    limit?: number;
    country?: string;
    park?: string;
    category?: string;
    postType?: string;
    q?: string;
  }
) {
  return JSON.stringify({
    table,
    page: options.page ?? 1,
    limit: options.limit ?? 50,
    country: options.country || '',
    park: options.park || '',
    category: options.category || '',
    postType: options.postType || '',
    q: options.q || '',
  });
}

export function peekAdminTableCache(key: string): AdminTablePageResult | null {
  const hit = store.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > hit.ttl) {
    store.delete(key);
    return null;
  }
  return hit.value;
}

export function writeAdminTableCache(key: string, value: AdminTablePageResult) {
  const ttl = value.total === 0 && value.rows.length === 0 ? TTL_MS_EMPTY : TTL_MS;
  store.set(key, { at: Date.now(), ttl, value });
}

export function bustAdminTableCache(table?: string) {
  if (!table) {
    store.clear();
    return;
  }
  for (const key of store.keys()) {
    if (key.includes(`"table":"${table}"`)) store.delete(key);
  }
}
