-- Paste EVERY line of this file into Supabase → SQL Editor → Run.
-- Do not paste the filename scripts/optimize-supabase-indexes.sql — that causes:
-- ERROR 42601: syntax error at or near "scripts"

create extension if not exists pg_trgm;

create index if not exists tours_country_idx on public.tours (country);
create index if not exists tours_slug_idx on public.tours (slug);
create index if not exists tours_category_idx on public.tours (category);
create index if not exists tours_created_date_idx on public.tours (created_date desc);

create index if not exists tours_title_trgm_idx on public.tours using gin (title gin_trgm_ops);
create index if not exists tours_country_trgm_idx on public.tours using gin (country gin_trgm_ops);
create index if not exists tours_category_trgm_idx on public.tours using gin (category gin_trgm_ops);

create index if not exists countries_slug_idx on public.countries (slug);
create index if not exists categories_country_idx on public.categories (country);
create index if not exists safari_updates_slug_idx on public.safari_updates (slug);

-- Parks/stays use seo_slug rather than slug in this project.
create index if not exists national_park_seo_slug_idx on public.national_park (seo_slug);
create index if not exists national_park_country_idx on public.national_park (country);
create index if not exists accommodations_country_idx on public.accommodations (country);
create index if not exists accommodations_location_trgm_idx on public.accommodations using gin (location gin_trgm_ops);
