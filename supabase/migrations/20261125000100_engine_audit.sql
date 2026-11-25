-- Preparação da aba de auditoria: cada erro ou aviso de um motor vira um caso analisável e tratável.
-- Os itens INFO (conferências, contagens) ficam só no resumo do processamento (engine_runs.audit).

create table if not exists public.engine_audit_items (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.engine_runs (id) on delete cascade,
  engine text not null,
  code text not null,
  severity text not null check (severity in ('ERRO', 'AVISO')),
  message text not null,
  count integer,
  -- registros afetados: [{ "key": "<chave da linha>", "info": "<o que há de errado>" }, ...]
  records jsonb not null default '[]'::jsonb,
  -- identifica "o mesmo caso" entre processamentos, para herdar o tratamento já dado
  fingerprint text not null,
  status text not null default 'aberto'
    check (status in ('aberto', 'em_analise', 'tratado', 'ignorado')),
  note text,
  treated_by uuid references auth.users (id) on delete set null,
  treated_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists engine_audit_items_engine_status_idx
  on public.engine_audit_items (engine, status, created_at desc);
create index if not exists engine_audit_items_run_idx
  on public.engine_audit_items (run_id);
create index if not exists engine_audit_items_fp_idx
  on public.engine_audit_items (engine, fingerprint, created_at desc);

alter table public.engine_audit_items enable row level security;

grant select, insert, update on public.engine_audit_items to authenticated;

create policy "engine_audit_items_select" on public.engine_audit_items
  for select to authenticated using (true);
create policy "engine_audit_items_insert" on public.engine_audit_items
  for insert to authenticated with check (true);
-- Tratar um caso = atualizar status, nota e quem tratou.
create policy "engine_audit_items_update" on public.engine_audit_items
  for update to authenticated using (true) with check (true);

create or replace function public.replace_engine_base(
  p_engine text,
  p_columns jsonb,
  p_audit jsonb,
  p_sources jsonb,
  p_rows jsonb
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_run uuid;
begin
  if jsonb_typeof(p_rows) is distinct from 'array' then
    raise exception 'p_rows deve ser uma lista';
  end if;

  insert into public.engine_runs (engine, row_count, columns, audit, sources)
  values (p_engine, jsonb_array_length(p_rows), p_columns, p_audit, p_sources)
  returning id into v_run;

  delete from public.engine_base_rows where engine = p_engine;

  insert into public.engine_base_rows (engine, row_key, run_id, data)
  select p_engine, r ->> 'key', v_run, r -> 'data'
  from jsonb_array_elements(p_rows) as r;

  -- Casos da auditoria (erros e avisos). Se o mesmo caso já foi tratado ou ignorado
  -- num processamento anterior, o novo herda o tratamento.
  insert into public.engine_audit_items
    (run_id, engine, code, severity, message, count, records, fingerprint,
     status, note, treated_by, treated_at)
  select
    v_run, p_engine, a ->> 'code', a ->> 'severity', a ->> 'message',
    nullif(a ->> 'count', '')::integer,
    coalesce(a -> 'records', '[]'::jsonb),
    md5(p_engine || '|' || (a ->> 'code') || '|' || (a ->> 'message')),
    coalesce(prev.status, 'aberto'), prev.note, prev.treated_by, prev.treated_at
  from jsonb_array_elements(p_audit) as a
  left join lateral (
    select i.status, i.note, i.treated_by, i.treated_at
    from public.engine_audit_items i
    where i.engine = p_engine
      and i.fingerprint = md5(p_engine || '|' || (a ->> 'code') || '|' || (a ->> 'message'))
      and i.status in ('tratado', 'ignorado')
    order by i.created_at desc
    limit 1
  ) prev on true
  where a ->> 'severity' in ('ERRO', 'AVISO');

  return v_run;
end;
$$;

revoke all on function public.replace_engine_base(text, jsonb, jsonb, jsonb, jsonb) from public;
grant execute on function public.replace_engine_base(text, jsonb, jsonb, jsonb, jsonb) to authenticated;
