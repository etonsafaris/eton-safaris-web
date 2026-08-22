-- The Base44 "Agent" table kept constraint Agent_pkey after rename.
-- If the id sequence lagged behind existing rows, new signups hit a duplicate key.
-- Run this in the Supabase SQL editor once.

do $$
declare
  target_table text;
  max_id bigint;
begin
  select n.nspname || '.' || c.relname
    into target_table
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where c.relkind in ('r', 'p')
    and n.nspname = 'public'
    and c.relname in ('registered_agents', 'Agent', 'agents')
  order by case c.relname
    when 'registered_agents' then 1
    when 'Agent' then 2
    else 3
  end
  limit 1;

  if target_table is null then
    raise notice 'No agent table found';
    return;
  end if;

  execute format('select coalesce(max(id::bigint), 1) from %s', target_table) into max_id;

  if pg_get_serial_sequence(target_table, 'id') is not null then
    perform setval(pg_get_serial_sequence(target_table, 'id'), max_id);
  end if;
end $$;
