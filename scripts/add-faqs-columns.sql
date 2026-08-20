-- Add a dedicated FAQs column on the content tables.
-- Run in Supabase → SQL Editor. Safe to run more than once.
-- The admin also stores FAQs in post_blocks until this column exists.

alter table public.countries add column if not exists faqs jsonb default '[]'::jsonb;
alter table public.categories add column if not exists faqs jsonb default '[]'::jsonb;
alter table public.pages add column if not exists faqs jsonb default '[]'::jsonb;
alter table public.landing_pages add column if not exists faqs jsonb default '[]'::jsonb;

notify pgrst, 'reload schema';
