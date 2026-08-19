/**
 * Seeds the primary administrator account in Supabase Auth + profiles.
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-admin.mjs
 *
 * Optional env overrides:
 *   SEED_ADMIN_EMAIL (default: admin@etonsafaris.com)
 *   SEED_ADMIN_PASSWORD (default: SecureTemporaryPassword123!)
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = (process.env.SEED_ADMIN_EMAIL || 'admin@etonsafaris.com').trim().toLowerCase();
const password = process.env.SEED_ADMIN_PASSWORD || 'SecureTemporaryPassword123!';

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

async function main() {
  const { data: existing } = await supabase.from('profiles').select('id,email').eq('email', email).maybeSingle();
  if (existing?.id) {
    console.log(`Admin profile already exists for ${email}. Skipping seed.`);
    return;
  }

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'Master Admin', role: 'Full Access (Admin)' },
  });

  if (createError) {
    if (/already registered/i.test(createError.message)) {
      const { data: listed } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const match = listed?.users?.find((user) => user.email?.toLowerCase() === email);
      if (!match) {
        console.error('User exists in auth but could not be loaded:', createError.message);
        process.exit(1);
      }
      await upsertProfile(match.id);
      console.log(`Linked existing auth user ${email} to admin profile.`);
      return;
    }
    console.error('Failed to create admin user:', createError.message);
    process.exit(1);
  }

  await upsertProfile(created.user.id);
  console.log(`Seeded admin ${email}. Sign in and change password at /admin/change-password.`);
}

async function upsertProfile(id) {
  const { error } = await supabase.from('profiles').upsert({
    id,
    email,
    full_name: 'Master Admin',
    role: 'Full Access (Admin)',
    status: 'Active',
    must_change_password: true,
  });
  if (error) {
    console.error('Failed to upsert profile:', error.message);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
