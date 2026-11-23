-- Migração 0001 — slots/versões por motor com staging, promoção atômica e RLS.
-- Proposta: NÃO aplicada no projeto Supabase real. Requer aprovação do
-- usuário/gerente antes de rodar contra o banco de produção (red-jacket).

create extension if not exists pgcrypto;

create type motor_nome as enum (
  'historico',
  'movimentacoes',
  'clientes',
  'produtos',
  'chegada_nfs'
);

create type versao_status as enum (
  'staging',
  'active',
  'rejected',
  'superseded'
);

create table upload_slots (
  id uuid primary key default gen_random_uuid(),
  motor motor_nome not null unique,
  criado_em timestamptz not null default now()
);

create table upload_versoes (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references upload_slots(id) on delete cascade,
  status versao_status not null default 'staging',
  hash_arquivo text not null,
  nome_arquivo_original text,
  linhas_count integer not null default 0,
  criado_por uuid not null references auth.users(id),
  criado_em timestamptz not null default now(),
  promovido_em timestamptz
);

create index on upload_versoes (slot_id, status);

create table dados_motor (
  id bigint generated always as identity primary key,
  versao_id uuid not null references upload_versoes(id) on delete cascade,
  payload jsonb not null,
  criado_em timestamptz not null default now()
);

create index on dados_motor (versao_id);

alter table upload_slots enable row level security;
alter table upload_versoes enable row level security;
alter table dados_motor enable row level security;

-- Qualquer usuário autenticado lê e escreve (ferramenta interna de uma
-- equipe só). Revisar se precisar segmentar por papel/usuário (ver
-- docs/contratos/supabase-persistencia-motores.md).
create policy "autenticados leem slots" on upload_slots
  for select using (auth.uid() is not null);
create policy "autenticados criam slots" on upload_slots
  for insert with check (auth.uid() is not null);

create policy "autenticados leem versoes" on upload_versoes
  for select using (auth.uid() is not null);
create policy "autenticados criam versoes" on upload_versoes
  for insert with check (auth.uid() is not null);
create policy "autenticados atualizam versoes" on upload_versoes
  for update using (auth.uid() is not null);

create policy "autenticados leem dados" on dados_motor
  for select using (auth.uid() is not null);
create policy "autenticados inserem dados" on dados_motor
  for insert with check (auth.uid() is not null);
create policy "autenticados deletam dados" on dados_motor
  for delete using (auth.uid() is not null);

-- Promove uma versão em staging: marca como active, marca a active
-- anterior do mesmo slot como superseded e apaga o payload dela (mantém só
-- metadados em upload_versoes). Operação atômica (uma transação por chamada
-- de função). SECURITY INVOKER (padrão): respeita o RLS de quem chama.
create or replace function promover_versao(p_versao_id uuid)
returns void
language plpgsql
as $$
declare
  v_slot_id uuid;
begin
  select slot_id into v_slot_id from upload_versoes where id = p_versao_id and status = 'staging';

  if v_slot_id is null then
    raise exception 'versao % nao esta em staging ou nao existe', p_versao_id;
  end if;

  -- apaga o payload da versao ativa anterior do mesmo slot (se houver)
  delete from dados_motor
  where versao_id in (
    select id from upload_versoes where slot_id = v_slot_id and status = 'active'
  );

  update upload_versoes
  set status = 'superseded'
  where slot_id = v_slot_id and status = 'active';

  update upload_versoes
  set status = 'active', promovido_em = now()
  where id = p_versao_id;
end;
$$;

-- Rejeita uma versão em staging: apaga as linhas e marca como rejected.
-- Nunca toca a versão active do slot.
create or replace function rejeitar_versao(p_versao_id uuid)
returns void
language plpgsql
as $$
begin
  delete from dados_motor where versao_id = p_versao_id;

  update upload_versoes
  set status = 'rejected'
  where id = p_versao_id and status = 'staging';
end;
$$;
