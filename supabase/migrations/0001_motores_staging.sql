-- Migração 0001 — slots/versões por motor com staging, promoção atômica,
-- controle de acesso por papel e RLS. Proposta: NÃO aplicada no projeto
-- Supabase real. Requer aprovação do usuário/gerente antes de rodar contra
-- o banco de produção (red-jacket).
--
-- Modelo de acesso (decisão explícita do usuário):
--   - Leitura: qualquer usuário autenticado.
--   - Escrita (criar/atualizar/promover/rejeitar): só o(s) proprietário(s)
--     (app_owners) e as contas às quais um proprietário conceder permissão
--     (motor_updaters). Sem UUID nem credencial embutida — ver seção de
--     bootstrap do proprietário mais abaixo.

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

-- ===================== Controle de acesso (owner/updater) ==================

create table app_owners (
  user_id uuid primary key references auth.users(id),
  criado_em timestamptz not null default now()
);

create table motor_updaters (
  user_id uuid primary key references auth.users(id),
  concedido_por uuid not null references auth.users(id),
  criado_em timestamptz not null default now()
);

create or replace function eh_owner(p_user_id uuid)
returns boolean
language sql
stable
as $$
  select exists (select 1 from app_owners where user_id = p_user_id);
$$;

create or replace function pode_atualizar(p_user_id uuid)
returns boolean
language sql
stable
as $$
  select eh_owner(p_user_id)
      or exists (select 1 from motor_updaters where user_id = p_user_id);
$$;

alter table app_owners enable row level security;
alter table motor_updaters enable row level security;

-- Só proprietários veem a lista de proprietários/updaters (evita expor a
-- quem tem poder de escrita a qualquer autenticado). Sem policy de
-- insert/update/delete direta: só as funções abaixo escrevem aqui, cada
-- uma checando autorização internamente.
create policy "owners leem app_owners" on app_owners
  for select using (eh_owner(auth.uid()));
create policy "owners leem motor_updaters" on motor_updaters
  for select using (eh_owner(auth.uid()));

-- Bootstrap do proprietário inicial: só funciona uma vez, enquanto não
-- existir nenhum proprietário. Não embute UUID nem credencial — o próprio
-- usuário autenticado que chamar primeiro se torna o proprietário. Deve
-- ser executada pelo dono do projeto imediatamente após o primeiro login,
-- antes de dar acesso à aplicação a qualquer outra conta (instrução de
-- operação, não automatizável sem credencial do usuário).
create or replace function cadastrar_primeiro_owner()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'requer usuário autenticado';
  end if;
  if exists (select 1 from app_owners) then
    raise exception 'já existe proprietário cadastrado; use conceder_owner() a partir de uma conta proprietária';
  end if;
  insert into app_owners (user_id) values (auth.uid());
end;
$$;

create or replace function conceder_owner(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not eh_owner(auth.uid()) then
    raise exception 'só um proprietário pode conceder titularidade a outra conta';
  end if;
  insert into app_owners (user_id) values (p_user_id)
  on conflict (user_id) do nothing;
end;
$$;

create or replace function conceder_updater(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not eh_owner(auth.uid()) then
    raise exception 'só o proprietário pode conceder permissão de atualização';
  end if;
  insert into motor_updaters (user_id, concedido_por)
  values (p_user_id, auth.uid())
  on conflict (user_id) do nothing;
end;
$$;

create or replace function revogar_updater(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not eh_owner(auth.uid()) then
    raise exception 'só o proprietário pode revogar permissão de atualização';
  end if;
  delete from motor_updaters where user_id = p_user_id;
end;
$$;

-- ============================ Slots e versões ==============================

create table upload_slots (
  id uuid primary key default gen_random_uuid(),
  motor motor_nome not null unique,
  criado_em timestamptz not null default now()
);

create table upload_versoes (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references upload_slots(id) on delete cascade,
  status versao_status not null default 'staging',
  hash_arquivo text not null check (length(hash_arquivo) > 0),
  nome_arquivo_original text not null,
  linhas_count integer not null default 0,
  criado_por uuid not null references auth.users(id),
  criado_em timestamptz not null default now(),
  promovido_por uuid references auth.users(id),
  promovido_em timestamptz
);

-- Garante, no nível do banco, que nunca existam duas versões "active" para
-- o mesmo slot simultaneamente — trava a corrida de promoções concorrentes
-- junto com o "for update" em promover_versao().
create unique index upload_versoes_slot_active_unique
  on upload_versoes (slot_id)
  where status = 'active';

create index on upload_versoes (slot_id, status);

create table dados_motor (
  id bigint generated always as identity primary key,
  versao_id uuid not null references upload_versoes(id) on delete cascade,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  criado_em timestamptz not null default now()
);

create index on dados_motor (versao_id);

-- criado_por nunca vem de parâmetro confiado pelo client: o trigger
-- sobrescreve sempre com auth.uid() da sessão que fez a requisição.
create or replace function set_criado_por()
returns trigger
language plpgsql
as $$
begin
  new.criado_por := auth.uid();
  return new;
end;
$$;

create trigger trg_versoes_criado_por
  before insert on upload_versoes
  for each row execute function set_criado_por();

alter table upload_slots enable row level security;
alter table upload_versoes enable row level security;
alter table dados_motor enable row level security;

-- Leitura compartilhada: qualquer usuário autenticado.
create policy "autenticados leem slots" on upload_slots
  for select using (auth.uid() is not null);
create policy "autenticados leem versoes" on upload_versoes
  for select using (auth.uid() is not null);
create policy "autenticados leem dados" on dados_motor
  for select using (auth.uid() is not null);

-- Escrita: só owner/updater.
create policy "autorizados criam slots" on upload_slots
  for insert with check (pode_atualizar(auth.uid()));

create policy "autorizados criam versoes em staging" on upload_versoes
  for insert with check (pode_atualizar(auth.uid()) and status = 'staging');
-- Sem policy de UPDATE em upload_versoes: toda transição de status
-- (staging -> active/rejected/superseded) só acontece dentro das funções
-- SECURITY DEFINER abaixo, que checam pode_atualizar() internamente. Isso
-- impede o client de promover/rejeitar direto via PATCH da API REST,
-- contornando promover_versao()/rejeitar_versao().

create policy "autorizados inserem em staging propria" on dados_motor
  for insert with check (
    pode_atualizar(auth.uid())
    and exists (
      select 1 from upload_versoes v
      where v.id = versao_id and v.status = 'staging' and v.criado_por = auth.uid()
    )
  );
-- Sem policy de DELETE em dados_motor: a limpeza de payload
-- (superseded/rejected) só acontece dentro das funções SECURITY DEFINER.

-- ===================== Promoção/rejeição (SECURITY DEFINER) ================

-- Promove uma versão em staging: checa autorização, trava a linha ativa do
-- slot (FOR UPDATE) para serializar promoções concorrentes do mesmo slot
-- (resolve a corrida de duas promoções simultâneas), trata idempotência
-- por hash (não duplica se já existe ativa com o mesmo conteúdo), marca a
-- anterior como superseded e apaga o payload dela. Operação atômica (uma
-- transação por chamada). Registra quem promoveu e a contagem de linhas.
create or replace function promover_versao(p_versao_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot_id uuid;
  v_hash text;
  v_ativa_id uuid;
  v_ativa_hash text;
begin
  if not pode_atualizar(auth.uid()) then
    raise exception 'usuário sem permissão de atualização';
  end if;

  select slot_id, hash_arquivo into v_slot_id, v_hash
  from upload_versoes
  where id = p_versao_id and status = 'staging';

  if v_slot_id is null then
    raise exception 'versão % não está em staging ou não existe', p_versao_id;
  end if;

  -- trava a linha ativa do slot (se houver) para serializar promoções
  -- concorrentes deste mesmo slot até o fim da transação
  select id, hash_arquivo into v_ativa_id, v_ativa_hash
  from upload_versoes
  where slot_id = v_slot_id and status = 'active'
  for update;

  if v_ativa_id is not null and v_ativa_hash = v_hash then
    -- idempotência: já existe ativa com o mesmo conteúdo; descarta a
    -- staging redundante em vez de duplicar trabalho
    delete from dados_motor where versao_id = p_versao_id;
    update upload_versoes set status = 'rejected' where id = p_versao_id;
    return;
  end if;

  if v_ativa_id is not null then
    delete from dados_motor where versao_id = v_ativa_id;
    update upload_versoes set status = 'superseded' where id = v_ativa_id;
  end if;

  update upload_versoes
  set status = 'active',
      promovido_por = auth.uid(),
      promovido_em = now(),
      linhas_count = (select count(*) from dados_motor where versao_id = p_versao_id)
  where id = p_versao_id;
end;
$$;

-- Rejeita uma versão em staging: checa autorização, apaga as linhas e
-- marca como rejected. Nunca toca a versão active do slot. Idempotente:
-- chamar de novo numa versão já rejeitada ou inexistente não erra.
create or replace function rejeitar_versao(p_versao_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not pode_atualizar(auth.uid()) then
    raise exception 'usuário sem permissão de atualização';
  end if;

  delete from dados_motor where versao_id = p_versao_id;

  update upload_versoes
  set status = 'rejected'
  where id = p_versao_id and status = 'staging';
end;
$$;

-- ============================ Nota de validação =============================
-- As checks acima (hash_arquivo não vazio, nome do arquivo obrigatório,
-- payload precisa ser objeto JSON) são a validação MÍNIMA de estrutura no
-- banco. Regras de negócio por motor (schema esperado de cada arquivo,
-- completude, referências) continuam sendo validadas no cliente antes de
-- chamar promover_versao() — isso é um risco residual aceito nesta etapa,
-- documentado em docs/contratos/supabase-persistencia-motores.md. Um
-- payload que passa pelas checks do banco não está necessariamente
-- correto segundo as regras do motor; "seguro" aqui significa só
-- "estruturalmente válido e gravado com autorização correta".
