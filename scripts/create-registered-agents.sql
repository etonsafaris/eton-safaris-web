-- Recreate the Agents table used by /agents/register and the admin Agents module.
-- Paste this entire script into Supabase → SQL Editor → Run.

create extension if not exists pgcrypto;

drop table if exists public.registered_agents cascade;

create table public.registered_agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default gen_random_uuid(),
  name text not null,
  username text,
  email text not null,
  phone text,
  country text,
  gender text,
  company text,
  company_website text,
  address text,
  bio text,
  photo_url text,
  role text not null default 'Travel Agent',
  status text not null default 'Pending',
  is_active boolean not null default false,
  approval_token uuid not null default gen_random_uuid(),
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id uuid
);

create unique index registered_agents_email_key
  on public.registered_agents (lower(email));

create index registered_agents_status_idx
  on public.registered_agents (status);

create index registered_agents_user_id_idx
  on public.registered_agents (user_id);

create or replace function public.set_registered_agents_updated_date()
returns trigger
language plpgsql
as $$
begin
  new.updated_date = now();
  if new.username is null or new.username = '' then
    new.username = new.name;
  end if;
  if new.status = 'Active' then
    new.is_active = true;
  elsif new.status in ('Pending', 'Inactive') then
    new.is_active = false;
  end if;
  return new;
end;
$$;

drop trigger if exists registered_agents_set_updated_date on public.registered_agents;
create trigger registered_agents_set_updated_date
before insert or update on public.registered_agents
for each row execute procedure public.set_registered_agents_updated_date();

alter table public.registered_agents enable row level security;

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on public.registered_agents to anon, authenticated, service_role;

drop policy if exists "Public insert registered_agents" on public.registered_agents;
create policy "Public insert registered_agents"
on public.registered_agents for insert to anon, authenticated
with check (true);

drop policy if exists "Public read registered_agents" on public.registered_agents;
create policy "Public read registered_agents"
on public.registered_agents for select to anon, authenticated
using (true);

drop policy if exists "Authenticated update registered_agents" on public.registered_agents;
create policy "Authenticated update registered_agents"
on public.registered_agents for update to anon, authenticated
using (true) with check (true);

drop policy if exists "Authenticated delete registered_agents" on public.registered_agents;
create policy "Authenticated delete registered_agents"
on public.registered_agents for delete to authenticated
using (true);

notify pgrst, 'reload schema';
