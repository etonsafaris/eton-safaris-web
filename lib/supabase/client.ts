import { createClient } from '@supabase/supabase-js';
import { createSkewAwareFetch, isJwtClockError } from '@/lib/supabase/jwt-clock';

export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
};

if (!supabaseConfig.url || !supabaseConfig.anonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    fetch: createSkewAwareFetch(supabaseConfig.anonKey, () => {
      void supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    }),
  },
});

if (typeof window !== 'undefined') {
  void supabase.auth.getSession().then(({ error }) => {
    if (error && isJwtClockError(error.message)) {
      void supabase.auth.signOut({ scope: 'local' });
    }
  });
}
