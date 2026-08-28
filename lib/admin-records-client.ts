import { supabase } from '@/lib/supabase/client';
import type { RecordRow } from '@/lib/types';

export async function fetchAdminCounts(
  items: { id: string; table: string; aliases?: string[] }[]
): Promise<Record<string, number>> {
  if (items.length === 0) return {};
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const response = await fetch('/api/admin/counts', {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ items }),
  });
  const body = (await response.json().catch(() => ({}))) as { counts?: Record<string, number>; error?: string };
  if (!response.ok) {
    throw new Error(body.error || 'Could not load collection counts');
  }
  return body.counts || {};
}

export async function fetchAdminTable(table: string): Promise<RecordRow[]> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const response = await fetch(`/api/admin/records?table=${encodeURIComponent(table)}`, {
    credentials: 'include',
    cache: 'no-store',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const body = (await response.json().catch(() => ({}))) as { rows?: RecordRow[]; error?: string };
  if (!response.ok) {
    throw new Error(body.error || `Could not load ${table}`);
  }
  return body.rows || [];
}

export async function deleteAdminRecord(table: string, id: string | number): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const response = await fetch(
    `/api/admin/records?table=${encodeURIComponent(table)}&id=${encodeURIComponent(String(id))}`,
    {
      method: 'DELETE',
      credentials: 'include',
      cache: 'no-store',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }
  );
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    throw new Error(body.error || `Could not delete ${table} record`);
  }
}

export async function adminAuthHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
