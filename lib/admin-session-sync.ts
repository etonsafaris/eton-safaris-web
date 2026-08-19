import { supabase } from '@/lib/supabase/client';

export async function syncAdminSessionCookie() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return false;

  const response = await fetch('/api/admin/session', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.ok;
}

export async function clearAdminSessionCookieServer() {
  await fetch('/api/admin/session', { method: 'DELETE' }).catch(() => undefined);
}
