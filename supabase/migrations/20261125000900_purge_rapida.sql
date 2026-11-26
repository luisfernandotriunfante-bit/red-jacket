-- A limpeza da versão anterior varria todas as linhas da versão nova (run_id <> keep não usa
-- índice) e estourava o statement timeout quando não havia nada a apagar. Agora busca por
-- faixas do índice (run_id < keep e run_id > keep), que ficam vazias instantaneamente.
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
    (select ctid from public.engine_base_rows
      where engine = p_engine and run_id < p_keep limit p_limit)
    union all
    (select ctid from public.engine_base_rows
      where engine = p_engine and run_id > p_keep limit p_limit)
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
