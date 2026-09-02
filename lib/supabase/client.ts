import { createClient } from '@supabase/supabase-js';

// Safe placeholders to satisfy old browser hooks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'temporary-placeholder-key';

// This keeps the browser client happy without linking to server-side code
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true }
});
