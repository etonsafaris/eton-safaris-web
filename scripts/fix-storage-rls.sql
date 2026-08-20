-- Paste EVERYTHING below this line into Supabase → SQL Editor → Run.
-- Do not type the file name scripts/fix-storage-rls.sql

insert into storage.buckets (id, name, public)
values
  ('media', 'media', true),
  ('images', 'images', true),
  ('uploads', 'uploads', true),
  ('public', 'public', true)
on conflict (id) do update set public = true;

drop policy if exists "Public read media" on storage.objects;
drop policy if exists "Public upload media" on storage.objects;
drop policy if exists "Public update media" on storage.objects;
drop policy if exists "Public delete media" on storage.objects;

create policy "Public read media"
on storage.objects
for select
to public
using (bucket_id in ('media', 'images', 'uploads', 'public'));

create policy "Public upload media"
on storage.objects
for insert
to public
with check (bucket_id in ('media', 'images', 'uploads', 'public'));

create policy "Public update media"
on storage.objects
for update
to public
using (bucket_id in ('media', 'images', 'uploads', 'public'))
with check (bucket_id in ('media', 'images', 'uploads', 'public'));

create policy "Public delete media"
on storage.objects
for delete
to public
using (bucket_id in ('media', 'images', 'uploads', 'public'));
