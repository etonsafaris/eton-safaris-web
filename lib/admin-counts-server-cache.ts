/** Short-lived in-process cache so sidebar counts do not hold a DB connection on every admin navigation. */
const TTL_MS = Math.max(15_000, Number(process.env.ADMIN_COUNTS_CACHE_MS) || 60_000);

let entry: { at: number; counts: Record<string, number> } | null = null;

export function peekAdminCountsCache(): Record<string, number> | null {
  if (!entry) return null;
  if (Date.now() - entry.at > TTL_MS) {
    entry = null;
    return null;
  }
  return entry.counts;
}

export function writeAdminCountsCache(counts: Record<string, number>) {
  entry = { at: Date.now(), counts };
}

export function bustAdminCountsCache() {
  entry = null;
}
