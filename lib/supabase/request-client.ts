import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient, createServiceClient } from '@/lib/supabase/admin';

export function hasServiceRoleKey() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function bearerTokenFromRequest(request: Request) {
  const header = request.headers.get('authorization') || '';
  return header.replace(/^Bearer\s+/i, '').trim();
}

export function isRlsError(message?: string) {
  return /row-level security|permission denied|42501|not allowed/i.test(message || '');
}

export function rlsHelpMessage(action: string) {
  return `${action} was blocked by Supabase security rules. Add SUPABASE_SERVICE_ROLE_KEY to .env.local (Project Settings → API → service_role), then restart the site. Or run scripts/fix-inbox-rls.sql in the Supabase SQL editor.`;
}

/** Service role when present; otherwise the signed-in admin so RLS sees an authenticated user — never bare anon for writes. */
export function createWriteClient(accessToken?: string): SupabaseClient {
  if (hasServiceRoleKey()) {
    return createServiceClient();
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && anon && accessToken) {
    return createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return createAdminClient();
}
