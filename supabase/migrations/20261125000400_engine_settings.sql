-- Ajustes dos motores guardados no banco + trava de gravação simultânea.

-- Periodicidade de atualização de cada arquivo (antes só ficava na tela).
create table if not exists public.engine_slot_settings (
  slot text primary key,
  period_days integer not null check (period_days >= 0),
  updated_at timestamptz not null default now()
);
alter table public.engine_slot_settings enable row level security;
grant select, insert, update on public.engine_slot_settings to authenticated;
create policy "engine_slot_settings_select" on public.engine_slot_settings
  for select to authenticated using (true);
create policy "engine_slot_settings_insert" on public.engine_slot_settings
  for insert to authenticated with check (true);
create policy "engine_slot_settings_update" on public.engine_slot_settings
  for update to authenticated using (true) with check (true);

-- Classificação das operações do ERP antigo (379). cfop vazio vale para qualquer CFOP da operação.
create table if not exists public.movimentacoes_operacoes (
  operacao text not null,
  cfop text not null default '',
  classe text not null check (classe in ('VENDA', 'DEVOLUCAO', 'TROCA', 'BONIFICACAO')),
  descricao text,
  primary key (operacao, cfop)
);
alter table public.movimentacoes_operacoes enable row level security;
grant select, insert, update, delete on public.movimentacoes_operacoes to authenticated;
create policy "movimentacoes_operacoes_select" on public.movimentacoes_operacoes
  for select to authenticated using (true);
create policy "movimentacoes_operacoes_insert" on public.movimentacoes_operacoes
  for insert to authenticated with check (true);
create policy "movimentacoes_operacoes_update" on public.movimentacoes_operacoes
  for update to authenticated using (true) with check (true);
create policy "movimentacoes_operacoes_delete" on public.movimentacoes_operacoes
  for delete to authenticated using (true);

insert into public.movimentacoes_operacoes (operacao, cfop, classe, descricao) values
  ('13201', '', 'DEVOLUCAO', 'Devolução'),
  ('13216', '', 'DEVOLUCAO', 'Devolução'),
  ('13234', '', 'DEVOLUCAO', 'Devolução'),
  ('23201', '', 'DEVOLUCAO', 'Devolução fora do estado'),
  ('13202', '', 'TROCA', 'Troca'),
  ('51201', '', 'VENDA', 'Venda'),
  ('51234', '', 'VENDA', 'Venda'),
  ('51295', '', 'VENDA', 'Venda'),
  ('61201', '', 'VENDA', 'Venda fora do estado')
on conflict do nothing;

-- Trava: não deixa duas gravações em lotes do mesmo motor ao mesmo tempo
-- (uma gravação abandonada deixa de travar depois de 20 minutos).
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
      and created_at > now() - interval '20 minutes'
  ) then
    raise exception 'já existe uma gravação deste motor em andamento; tente de novo em alguns minutos';
  end if;
  insert into public.engine_runs (engine, row_count, finalized)
  values (p_engine, 0, false)
  returning id into v_run;
  return v_run;
end;
$$;

-- Cancela uma gravação em lotes que falhou (a base vigente não é tocada).
create or replace function public.abort_engine_run(p_run uuid)
returns void
language sql
security invoker
set search_path = public
as $$
  delete from public.engine_runs where id = p_run and not finalized;
$$;
revoke all on function public.abort_engine_run(uuid) from public;
grant execute on function public.abort_engine_run(uuid) to authenticated;
