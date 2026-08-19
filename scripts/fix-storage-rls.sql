-- Run this in the Supabase SQL editor if cover image uploads still fail with RLS.
-- Service-role uploads from /api/upload should already bypass these policies.

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

drop policy if exists "Public read media" on storage.objects;
drop policy if exists "Public upload media" on storage.objects;
drop policy if exists "Public update media" on storage.objects;

create policy "Public read media"
on storage.objects for select
using (bucket_id in ('media', 'images', 'uploads', 'public'));

create policy "Public upload media"
on storage.objects for insert
with check (bucket_id in ('media', 'images', 'uploads', 'public'));

create policy "Public update media"
on storage.objects for update
using (bucket_id in ('media', 'images', 'uploads', 'public'));
