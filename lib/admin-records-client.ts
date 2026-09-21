import { syncAdminSessionCookie } from '@/lib/admin-session-sync';
import { supabase } from '@/lib/supabase/client';
import { readStoredAccessToken } from '@/lib/supabase/jwt-payload';
import type { RecordRow } from '@/lib/types';

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

export async function fetchAdminTable(table: string): Promise<RecordRow[]> {
  await syncAdminSessionCookie().catch(() => false);

  async function getOnce() {
    return fetch(`/api/admin/records?table=${encodeURIComponent(table)}`, {
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
    const body = (await response.json().catch(() => ({}))) as { rows?: RecordRow[]; error?: string };
    if (!response.ok) {
      console.warn(`[Admin] Could not load ${table}:`, body.error || response.status);
      return [];
    }
    if (body.error && (!body.rows || body.rows.length === 0)) {
      console.warn(`[Admin] Could not load ${table}:`, body.error);
    }
    return body.rows || [];
  } catch (error) {
    console.warn(`[Admin] Could not load ${table}:`, error);
    return [];
  }
}

export async function deleteAdminRecord(table: string, id: string | number): Promise<void> {
  const response = await fetch(
    `/api/admin/records?table=${encodeURIComponent(table)}&id=${encodeURIComponent(String(id))}`,
    { method: 'DELETE', credentials: 'include', cache: 'no-store', headers: await authHeaders() }
  );
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(body.error || `Could not delete ${table} record`);
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
