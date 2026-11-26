-- Gravação em lotes mais resiliente:
-- 1) a trava de "gravação em andamento" passa a olhar a última atividade (cada lote renova),
--    então uma gravação abandonada libera em 2 minutos em vez de 20;
-- 2) append_engine_rows é idempotente (repetir um lote não duplica nem dá erro), o que
--    permite tentar de novo um lote que falhou por rede ou tempo do banco.

alter table public.engine_runs
  add column if not exists last_activity timestamptz not null default now();

create or replace function public.begin_engine_run(p_engine text)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_run uuid;
begin
  if exists (
    select 1 from public.engine_runs
    where engine = p_engine and not finalized
      and last_activity > now() - interval '2 minutes'
  ) then
    raise exception 'já existe uma gravação deste motor em andamento; tente de novo em alguns minutos';
  end if;
  -- Versões abandonadas deste motor deixam de existir (as linhas soltas saem na limpeza final).
  delete from public.engine_runs
  where engine = p_engine and not finalized
    and last_activity <= now() - interval '2 minutes';
  insert into public.engine_runs (engine, row_count, finalized)
  values (p_engine, 0, false)
  returning id into v_run;
  return v_run;
end;
$$;

create or replace function public.append_engine_rows(p_run uuid, p_rows jsonb)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_engine text;
  v_done boolean;
  v_new integer;
begin
  select engine, finalized into v_engine, v_done
  from public.engine_runs where id = p_run;
  if v_engine is null then
    raise exception 'versão não encontrada';
  end if;
  if v_done then
    raise exception 'esta versão já foi finalizada';
  end if;
  with ins as (
    insert into public.engine_base_rows (engine, row_key, run_id, data)
    select v_engine, r ->> 'key', p_run, r -> 'data'
    from jsonb_array_elements(p_rows) as r
    on conflict (engine, run_id, row_key) do nothing
    returning 1
  )
  select count(*) into v_new from ins;
  update public.engine_runs
  set row_count = row_count + v_new, last_activity = now()
  where id = p_run;
  return jsonb_array_length(p_rows);
end;
$$;
