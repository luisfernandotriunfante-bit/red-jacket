-- Gravação em lotes para bases grandes (ex.: Movimentações, ~300 mil linhas).
-- Fluxo: begin_engine_run → append_engine_rows (várias vezes) → finalize_engine_run → purge_engine_rows (até zerar).
-- Enquanto a nova versão não é finalizada, a base anterior continua valendo para leitura.

alter table public.engine_runs
  add column if not exists finalized boolean not null default true;

-- Linhas de versões diferentes podem coexistir até a limpeza.
alter table public.engine_base_rows drop constraint if exists engine_base_rows_pkey;
alter table public.engine_base_rows add primary key (engine, run_id, row_key);

grant update, delete on public.engine_runs to authenticated;
create policy "engine_runs_update" on public.engine_runs
  for update to authenticated using (true) with check (true);
create policy "engine_runs_delete" on public.engine_runs
  for delete to authenticated using (true);

-- Abre uma nova versão (ainda não vigente).
create or replace function public.begin_engine_run(p_engine text)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_run uuid;
begin
  insert into public.engine_runs (engine, row_count, finalized)
  values (p_engine, 0, false)
  returning id into v_run;
  return v_run;
end;
$$;

-- Acrescenta um lote de linhas: p_rows = [{ "key": "...", "data": {...} }, ...]
create or replace function public.append_engine_rows(p_run uuid, p_rows jsonb)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_engine text;
  v_done boolean;
begin
  select engine, finalized into v_engine, v_done
  from public.engine_runs where id = p_run;
  if v_engine is null then
    raise exception 'versão não encontrada';
  end if;
  if v_done then
    raise exception 'esta versão já foi finalizada';
  end if;
  insert into public.engine_base_rows (engine, row_key, run_id, data)
  select v_engine, r ->> 'key', p_run, r -> 'data'
  from jsonb_array_elements(p_rows) as r;
  return jsonb_array_length(p_rows);
end;
$$;

-- Torna a versão vigente (confere a contagem) e cria os casos de auditoria.
create or replace function public.finalize_engine_run(
  p_run uuid,
  p_columns jsonb,
  p_audit jsonb,
  p_sources jsonb,
  p_row_count integer
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_engine text;
  v_found integer;
begin
  select engine into v_engine from public.engine_runs
  where id = p_run and not finalized;
  if v_engine is null then
    raise exception 'versão não encontrada ou já finalizada';
  end if;
  select count(*) into v_found from public.engine_base_rows
  where engine = v_engine and run_id = p_run;
  if v_found <> p_row_count then
    raise exception 'contagem diferente: gravadas %, esperadas %', v_found, p_row_count;
  end if;

  update public.engine_runs
  set finalized = true, row_count = p_row_count, columns = p_columns,
      audit = p_audit, sources = p_sources, created_at = now()
  where id = p_run;

  insert into public.engine_audit_items
    (run_id, engine, code, severity, message, count, records, fingerprint,
     status, note, treated_by, treated_at)
  select
    p_run, v_engine, a ->> 'code', a ->> 'severity', a ->> 'message',
    nullif(a ->> 'count', '')::integer,
    coalesce(a -> 'records', '[]'::jsonb),
    md5(v_engine || '|' || (a ->> 'code') || '|' || (a ->> 'message')),
    coalesce(prev.status, 'aberto'), prev.note, prev.treated_by, prev.treated_at
  from jsonb_array_elements(p_audit) as a
  left join lateral (
    select i.status, i.note, i.treated_by, i.treated_at
    from public.engine_audit_items i
    where i.engine = v_engine
      and i.fingerprint = md5(v_engine || '|' || (a ->> 'code') || '|' || (a ->> 'message'))
      and i.status in ('tratado', 'ignorado')
    order by i.created_at desc
    limit 1
  ) prev on true
  where a ->> 'severity' in ('ERRO', 'AVISO');

  return p_run;
end;
$$;

-- Apaga, em pedaços, as linhas de versões que não são a vigente. Devolve quantas apagou.
create or replace function public.purge_engine_rows(
  p_engine text,
  p_keep uuid,
  p_limit integer default 20000
) returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_n integer;
begin
  with doomed as (
    select ctid from public.engine_base_rows
    where engine = p_engine and run_id <> p_keep
    limit p_limit
  )
  delete from public.engine_base_rows b using doomed d where b.ctid = d.ctid;
  get diagnostics v_n = row_count;
  if v_n = 0 then
    delete from public.engine_runs
    where engine = p_engine and id <> p_keep and not finalized;
  end if;
  return v_n;
end;
$$;

revoke all on function public.begin_engine_run(text) from public;
revoke all on function public.append_engine_rows(uuid, jsonb) from public;
revoke all on function public.finalize_engine_run(uuid, jsonb, jsonb, jsonb, integer) from public;
revoke all on function public.purge_engine_rows(text, uuid, integer) from public;
grant execute on function public.begin_engine_run(text) to authenticated;
grant execute on function public.append_engine_rows(uuid, jsonb) to authenticated;
grant execute on function public.finalize_engine_run(uuid, jsonb, jsonb, jsonb, integer) to authenticated;
grant execute on function public.purge_engine_rows(text, uuid, integer) to authenticated;
