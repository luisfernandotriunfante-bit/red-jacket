-- Bases geradas pelos motores do Red Jacket.
-- Cada motor guarda sempre só a base vigente (as competências fechadas são tratadas à parte).
-- Aplique este arquivo no SQL Editor do Supabase (ou com `supabase db push`) antes de publicar.

create table if not exists public.engine_runs (
  id uuid primary key default gen_random_uuid(),
  engine text not null,
  row_count integer not null check (row_count >= 0),
  columns jsonb not null default '[]'::jsonb,
  audit jsonb not null default '[]'::jsonb,
  sources jsonb not null default '[]'::jsonb,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists engine_runs_engine_created_idx
  on public.engine_runs (engine, created_at desc);

create table if not exists public.engine_base_rows (
  engine text not null,
  row_key text not null,
  run_id uuid not null references public.engine_runs (id) on delete cascade,
  data jsonb not null,
  primary key (engine, row_key)
);

create index if not exists engine_base_rows_run_idx
  on public.engine_base_rows (run_id);

alter table public.engine_runs enable row level security;
alter table public.engine_base_rows enable row level security;

-- Leitura e escrita só para quem está autenticado.
-- Quando existir o cadastro de funções (Equipe), restrinja a escrita ao administrador.
create policy "engine_runs_select" on public.engine_runs
  for select to authenticated using (true);
create policy "engine_runs_insert" on public.engine_runs
  for insert to authenticated with check (true);

create policy "engine_base_rows_select" on public.engine_base_rows
  for select to authenticated using (true);
create policy "engine_base_rows_insert" on public.engine_base_rows
  for insert to authenticated with check (true);
create policy "engine_base_rows_delete" on public.engine_base_rows
  for delete to authenticated using (true);

-- Troca a base de um motor por inteiro, numa única transação:
-- se qualquer linha falhar, a base anterior continua valendo.
-- p_rows: [{ "key": "<chave da linha>", "data": { ... } }, ...]
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

  return v_run;
end;
$$;

revoke all on function public.replace_engine_base(text, jsonb, jsonb, jsonb, jsonb) from public;
grant execute on function public.replace_engine_base(text, jsonb, jsonb, jsonb, jsonb) to authenticated;
