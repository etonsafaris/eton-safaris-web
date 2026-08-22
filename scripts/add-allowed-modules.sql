-- Let admins assign dashboard modules to Tour Operators and Content Managers.
-- Paste into Supabase → SQL Editor → Run.

alter table public.registered_agents
  add column if not exists allowed_modules text;

notify pgrst, 'reload schema';
