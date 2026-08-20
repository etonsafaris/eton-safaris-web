-- Run this in Supabase → SQL Editor so Activate, Notifications, Subscribers, and Reviews work
-- without a service_role key. Safe to run more than once.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text,
  message text,
  body text,
  content text,
  category text,
  status text default 'Unread',
  read boolean default false,
  seen boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email text,
  last_digest_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  author text,
  email text,
  title text,
  rating numeric,
  source text,
  source_url text,
  content text,
  country text,
  created_at timestamptz default now()
);

create table if not exists public.registered_agents (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  phone text,
  country text,
  gender text,
  company text,
  address text,
  bio text,
  status text default 'Pending',
  created_at timestamptz default now()
);

alter table public.notifications enable row level security;
alter table public.subscribers enable row level security;
alter table public.reviews enable row level security;
alter table public.registered_agents enable row level security;
alter table public.profiles enable row level security;

-- Notifications: public can create (site alerts); staff can read/update/delete
drop policy if exists "Public insert notifications" on public.notifications;
create policy "Public insert notifications"
on public.notifications for insert to anon, authenticated
with check (true);

drop policy if exists "Authenticated read notifications" on public.notifications;
create policy "Authenticated read notifications"
on public.notifications for select to authenticated
using (true);

drop policy if exists "Authenticated update notifications" on public.notifications;
create policy "Authenticated update notifications"
on public.notifications for update to authenticated
using (true) with check (true);

drop policy if exists "Authenticated delete notifications" on public.notifications;
create policy "Authenticated delete notifications"
on public.notifications for delete to authenticated
using (true);

-- Subscribers
drop policy if exists "Public insert subscribers" on public.subscribers;
create policy "Public insert subscribers"
on public.subscribers for insert to anon, authenticated
with check (true);

drop policy if exists "Authenticated read subscribers" on public.subscribers;
create policy "Authenticated read subscribers"
on public.subscribers for select to authenticated
using (true);

drop policy if exists "Authenticated delete subscribers" on public.subscribers;
create policy "Authenticated delete subscribers"
on public.subscribers for delete to authenticated
using (true);

-- Reviews
drop policy if exists "Public insert reviews" on public.reviews;
create policy "Public insert reviews"
on public.reviews for insert to anon, authenticated
with check (true);

drop policy if exists "Public read reviews" on public.reviews;
create policy "Public read reviews"
on public.reviews for select to anon, authenticated
using (true);

drop policy if exists "Authenticated update reviews" on public.reviews;
create policy "Authenticated update reviews"
on public.reviews for update to authenticated
using (true) with check (true);

drop policy if exists "Authenticated delete reviews" on public.reviews;
create policy "Authenticated delete reviews"
on public.reviews for delete to authenticated
using (true);

-- Agents: guests can apply; only signed-in staff can activate
drop policy if exists "Public insert registered_agents" on public.registered_agents;
create policy "Public insert registered_agents"
on public.registered_agents for insert to anon, authenticated
with check (true);

drop policy if exists "Authenticated read registered_agents" on public.registered_agents;
create policy "Authenticated read registered_agents"
on public.registered_agents for select to authenticated
using (true);

drop policy if exists "Authenticated update registered_agents" on public.registered_agents;
create policy "Authenticated update registered_agents"
on public.registered_agents for update to authenticated
using (true) with check (true);

drop policy if exists "Authenticated delete registered_agents" on public.registered_agents;
create policy "Authenticated delete registered_agents"
on public.registered_agents for delete to authenticated
using (true);

-- Profiles: staff can mark agent/user accounts Active
drop policy if exists "Authenticated update profiles" on public.profiles;
create policy "Authenticated update profiles"
on public.profiles for update to authenticated
using (true) with check (true);
