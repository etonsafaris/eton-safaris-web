import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createSkewAwareFetch } from '@/lib/supabase/jwt-clock';

function clientOptions(key: string) {
  return {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: createSkewAwareFetch(key) },
  };
}

export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Missing Supabase admin credentials');
  }
  return createClient(url, key, clientOptions(key));
}

export function createPrivilegedClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Missing Supabase credentials');
  }
  return createClient(url, key, clientOptions(key));
}

export function createServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY. Add it in .env.local from Supabase → Project Settings → API → service_role.'
    );
  }
  return createClient(url, key, clientOptions(key));
}
