/** Tiny shared cache for collection list fetches — keep this free of Supabase imports. */

type CacheEntry = { expires: number; rows: unknown[] };

const recordCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown[]>>();

export function getCachedCollection(key: string): unknown[] | null {
  const cached = recordCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.rows;
  return null;
}

export function setCachedCollection(key: string, rows: unknown[], ttlMs: number) {
  recordCache.set(key, { expires: Date.now() + ttlMs, rows });
}

export function getInflightCollection(key: string) {
  return inflight.get(key);
}

export function setInflightCollection(key: string, promise: Promise<unknown[]>) {
  inflight.set(key, promise);
}

export function clearInflightCollection(key: string) {
  inflight.delete(key);
}

export function clearCollectionCache(table?: string) {
  if (!table) {
    recordCache.clear();
    return;
  }
  for (const key of recordCache.keys()) {
    if (key === table || key.startsWith(`${table}|`)) recordCache.delete(key);
  }
}
