-- Desempenho das políticas de engine_base_rows: o papel é avaliado uma vez por consulta
-- ("(select ...)" vira initplan) e não uma vez por linha. Sem isso, a contagem final do
-- salvamento em lotes (centenas de milhares de linhas) estourava o statement timeout.

drop policy if exists "engine_base_rows_select" on public.engine_base_rows;
drop policy if exists "engine_base_rows_insert" on public.engine_base_rows;
drop policy if exists "engine_base_rows_delete" on public.engine_base_rows;

create policy "engine_base_rows_select" on public.engine_base_rows
  for select to authenticated using (
    (select public.app_is('ceo', 'admin', 'gerente'))
    or (engine = 'produtos' and (select public.app_is('supervisor', 'vendedor')))
    or (
      engine = 'movimentacoes' and (
        ((select public.app_is('supervisor'))
          and data ->> 'cod_supervisor_novo' = (select public.app_supervisor_code()))
        or ((select public.app_is('vendedor'))
          and (data ->> 'cod_vendedor_novo' = (select public.app_vendedor_code())
            or data ->> 'cod_vendedor_antigo' = (select public.app_vendedor_code())))
      )
    )
  );
create policy "engine_base_rows_insert" on public.engine_base_rows
  for insert to authenticated with check ((select public.app_is('ceo', 'admin')));
create policy "engine_base_rows_delete" on public.engine_base_rows
  for delete to authenticated using ((select public.app_is('ceo', 'admin')));

-- Conferência de contagem sem varrer a tabela: cada lote soma em engine_runs.row_count
-- (a chave primária impede duplicatas, então a soma dos lotes é a quantidade gravada).
create or replace function public.append_engine_rows(p_run uuid, p_rows jsonb)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_engine text;
  v_done boolean;
  v_n integer;
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
  v_n := jsonb_array_length(p_rows);
  update public.engine_runs set row_count = row_count + v_n where id = p_run;
  return v_n;
end;
$$;

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
  select engine, row_count into v_engine, v_found from public.engine_runs
  where id = p_run and not finalized;
  if v_engine is null then
    raise exception 'versão não encontrada ou já finalizada';
  end if;
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
