import {
  adminTableCacheKey,
  bustAdminTableCache,
  peekAdminTableCache,
  writeAdminTableCache,
  type AdminTablePageResult,
} from '@/lib/admin-table-cache';
import { syncAdminSessionCookie } from '@/lib/admin-session-sync';
import { supabase } from '@/lib/supabase/client';
import { readStoredAccessToken } from '@/lib/supabase/jwt-payload';
import type { RecordRow } from '@/lib/types';

export type { AdminTablePageResult };

const RETRYABLE_STATUS = new Set([401, 429, 500, 502, 503, 504]);

async function accessTokenForAdmin(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || readStoredAccessToken();
}

async function authHeaders(): Promise<HeadersInit> {
  const token = await accessTokenForAdmin();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export async function fetchAdminCounts(
  items: { id: string; table: string; aliases?: string[] }[]
): Promise<Record<string, number>> {
  if (items.length === 0) return {};
  try {
    const response = await fetch('/api/admin/counts', {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: await authHeaders(),
      body: JSON.stringify({ items }),
    });
    const body = (await response.json().catch(() => ({}))) as { counts?: Record<string, number>; error?: string };
    if (!response.ok) {
      console.warn('[Admin] Counts request failed:', body.error || response.status);
      return body.counts || {};
    }
    return body.counts || {};
  } catch (error) {
    console.warn('[Admin] Counts request failed:', error);
    return {};
  }
}

export async function fetchAdminTablePage(
  table: string,
  options?: {
    page?: number;
    limit?: number;
    country?: string;
    park?: string;
    category?: string;
    q?: string;
    bustCache?: boolean;
  }
): Promise<AdminTablePageResult> {
  const page = Math.max(1, options?.page ?? 1);
  const limit = Math.min(50, Math.max(1, options?.limit ?? 50));
  const cacheKey = adminTableCacheKey(table, {
    page,
    limit,
    country: options?.country,
    park: options?.park,
    category: options?.category,
    q: options?.q,
  });

  if (!options?.bustCache) {
    const cached = peekAdminTableCache(cacheKey);
    if (cached) return cached;
  }

  await syncAdminSessionCookie().catch(() => false);
  const params = new URLSearchParams({
    table,
    page: String(page),
    limit: String(limit),
  });
  if (options?.country) params.set('country', options.country);
  if (options?.park) params.set('park', options.park);
  if (options?.category) params.set('category', options.category);
  if (options?.q) params.set('q', options.q);

  async function getOnce() {
    return fetch(`/api/admin/records?${params.toString()}`, {
      credentials: 'include',
      cache: 'no-store',
      headers: await authHeaders(),
    });
  }

  let lastError = 'Could not load records';
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      let response = await getOnce();
      if (response.status === 401) {
        await syncAdminSessionCookie();
        response = await getOnce();
      }
      const body = (await response.json().catch(() => ({}))) as {
        rows?: RecordRow[];
        total?: number;
        page?: number;
        pageSize?: number;
        error?: string;
        retryable?: boolean;
      };

      if (!response.ok) {
        lastError = body.error || `Server error (${response.status})`;
        if (RETRYABLE_STATUS.has(response.status) && attempt < 3) {
          await sleep(250 * (attempt + 1));
          continue;
        }
        throw new Error(lastError);
      }

      const result = {
        rows: body.rows || [],
        total: body.total ?? body.rows?.length ?? 0,
        page: body.page ?? page,
        pageSize: body.pageSize ?? limit,
      };
      writeAdminTableCache(cacheKey, result);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Could not load records';
      if (attempt < 3 && /busy|too many clients|timeout|503|502|504/i.test(lastError)) {
        await sleep(300 * (attempt + 1));
        continue;
      }
      console.warn(`[Admin] Could not load ${table}:`, lastError);
      throw new Error(lastError);
    }
  }
  throw new Error(lastError);
}

/** Warm the next page after the current list finishes — avoids stealing DB slots from the active grid. */
export function prefetchAdminTablePage(
  table: string,
  options: {
    page: number;
    limit?: number;
    country?: string;
    park?: string;
    category?: string;
    q?: string;
  }
) {
  window.setTimeout(() => {
    void fetchAdminTablePage(table, options).catch(() => undefined);
  }, 600);
}

export function invalidateAdminTableCache(table?: string) {
  bustAdminTableCache(table);
}

export async function fetchAdminTable(table: string): Promise<RecordRow[]> {
  const page = await fetchAdminTablePage(table, { page: 1, limit: 50 });
  return page.rows;
}

/** Full CMS row for edit screens (description, itinerary, SEO, etc.). */
export async function fetchAdminRecordById(
  table: string,
  id: string | number
): Promise<RecordRow | null> {
  await syncAdminSessionCookie().catch(() => false);
  const params = new URLSearchParams({
    table,
    id: String(id),
  });

  async function getOnce() {
    return fetch(`/api/admin/records?${params.toString()}`, {
      credentials: 'include',
      cache: 'no-store',
      headers: await authHeaders(),
    });
  }

  try {
    let response = await getOnce();
    if (response.status === 401) {
      await syncAdminSessionCookie();
      response = await getOnce();
    }
    const body = (await response.json().catch(() => ({}))) as {
      row?: RecordRow | null;
      error?: string;
    };
    if (!response.ok) {
      console.warn(`[Admin] Could not load ${table}#${id}:`, body.error || response.status);
      return null;
    }
    return body.row ?? null;
  } catch (error) {
    console.warn(`[Admin] Could not load ${table}#${id}:`, error);
    return null;
  }
}

export async function deleteAdminRecord(table: string, id: string | number): Promise<void> {
  const response = await fetch(
    `/api/admin/records?table=${encodeURIComponent(table)}&id=${encodeURIComponent(String(id))}`,
    { method: 'DELETE', credentials: 'include', cache: 'no-store', headers: await authHeaders() }
  );
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(body.error || `Could not delete ${table} record`);
  bustAdminTableCache(table);
}

export async function saveAdminRecord(
  table: string,
  payload: Record<string, unknown>,
  id?: string | number | null
): Promise<Record<string, unknown>[]> {
  await syncAdminSessionCookie().catch(() => false);

  const bodyJson = JSON.stringify({ table, payload, id });
  async function postOnce() {
    return fetch('/api/admin/records', {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: await authHeaders(),
      body: bodyJson,
    });
  }

  let response = await postOnce();
  if (response.status === 401) {
    await syncAdminSessionCookie();
    response = await postOnce();
  }

  const body = (await response.json().catch(() => ({}))) as {
    data?: Record<string, unknown>[];
    error?: string;
  };
  if (!response.ok) throw new Error(body.error || `Could not save ${table} record`);
  bustAdminTableCache(table);
  return body.data || [];
}

export async function saveWithColumnFallback(
  table: string,
  payload: Record<string, unknown>,
  idOrOptions?: string | number | { id?: string | number | null; keepId?: boolean } | null
) {
  const options =
    typeof idOrOptions === 'object' && idOrOptions !== null ? idOrOptions : { id: idOrOptions };
  const data =
    options.keepId && payload.id == null ? { id: crypto.randomUUID(), ...payload } : payload;

  try {
    const rows = await saveAdminRecord(table, data, options.id);
    return { data: rows, error: null as { message: string } | null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not save record';
    console.error(`[Admin] Save failed (${table}):`, error);
    return { data: null, error: { message } };
  }
}

export const adminAuthHeaders = authHeaders;
