import { supabase } from '@/lib/supabase/client';
import type { RecordRow } from '@/lib/types';

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    ...(data.session?.access_token
      ? { Authorization: `Bearer ${data.session.access_token}` }
      : {}),
  };
}

export async function fetchAdminCounts(
  items: { id: string; table: string; aliases?: string[] }[]
): Promise<Record<string, number>> {
  if (items.length === 0) return {};
  const response = await fetch('/api/admin/counts', {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
    headers: await authHeaders(),
    body: JSON.stringify({ items }),
  });
  const body = (await response.json().catch(() => ({}))) as { counts?: Record<string, number>; error?: string };
  if (!response.ok) throw new Error(body.error || 'Could not load collection counts');
  return body.counts || {};
}

export async function fetchAdminTable(table: string): Promise<RecordRow[]> {
  const response = await fetch(`/api/admin/records?table=${encodeURIComponent(table)}`, {
    credentials: 'include',
    cache: 'no-store',
    headers: await authHeaders(),
  });
  const body = (await response.json().catch(() => ({}))) as { rows?: RecordRow[]; error?: string };
  if (!response.ok) throw new Error(body.error || `Could not load ${table}`);
  return body.rows || [];
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
  const response = await fetch('/api/admin/records', {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
    headers: await authHeaders(),
    body: JSON.stringify({ table, payload, id }),
  });
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
  const options = typeof idOrOptions === 'object' && idOrOptions !== null
    ? idOrOptions
    : { id: idOrOptions };
  const data = options.keepId && payload.id == null
    ? { id: crypto.randomUUID(), ...payload }
    : payload;
  const rows = await saveAdminRecord(table, data, options.id);
  return { data: rows, error: null };
}

export const adminAuthHeaders = authHeaders;
