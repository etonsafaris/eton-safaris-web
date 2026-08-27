import { supabase } from '@/lib/supabase/client';
import { readStoredAccessToken } from '@/lib/supabase/jwt-payload';

export async function syncAdminSessionCookie(accessToken?: string) {
  let token = accessToken || '';
  if (!token) {
    const { data } = await supabase.auth.getSession();
    token = data.session?.access_token || readStoredAccessToken();
  }
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
