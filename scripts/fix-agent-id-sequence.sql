-- Fix Agent_pkey collisions: the Base44 Agent.id sequence lagged behind existing rows.
-- Run once in the Supabase SQL editor.

do $$
declare
  seq text;
  tbl text;
begin
  foreach tbl in array array['public."Agent"', 'public.registered_agents', 'public.agents']
  loop
    begin
      seq := pg_get_serial_sequence(replace(tbl, '"', ''), 'id');
    exception when others then
      seq := null;
    end;

    if seq is null then
      begin
        execute format(
          $f$
          select pg_get_serial_sequence(%L, 'id')
          $f$,
          case
            when tbl like '%"Agent"%' then 'public.Agent'
            else replace(tbl, 'public.', 'public.')
          end
        ) into seq;
      exception when others then
        seq := null;
      end;
    end if;
  end loop;

  if to_regclass('public."Agent"') is not null then
    if pg_get_serial_sequence('public."Agent"', 'id') is not null then
      perform setval(
        pg_get_serial_sequence('public."Agent"', 'id'),
        (select coalesce(max(id), 1) from public."Agent")
      );
    end if;
  end if;

  if to_regclass('public.registered_agents') is not null then
    if pg_get_serial_sequence('public.registered_agents', 'id') is not null then
      perform setval(
        pg_get_serial_sequence('public.registered_agents', 'id'),
        (select coalesce(max(id::bigint), 1) from public.registered_agents)
      );
    end if;
  end if;
end $$;
