-- Equipes comerciais e vendedores cadastrados manualmente.
-- Criar um supervisor cria uma equipe; o código do supervisor identifica a equipe.

create table if not exists public.commercial_teams (
  id uuid primary key default gen_random_uuid(),
  supervisor_code text not null unique check (length(trim(supervisor_code)) > 0),
  supervisor_name text not null check (length(trim(supervisor_name)) > 0),
  supervisor_cpf text not null unique check (supervisor_cpf ~ '^[0-9]{11}$'),
  contract_type text not null check (contract_type in ('CLT', 'PJ')),
  region text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.commercial_sellers (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.commercial_teams (id) on delete restrict,
  name text not null check (length(trim(name)) > 0),
  cpf text not null unique check (cpf ~ '^[0-9]{11}$'),
  old_rca_code text,
  new_seller_code text not null unique check (length(trim(new_seller_code)) > 0),
  contract_type text not null check (contract_type in ('CLT', 'PJ')),
  region text not null default '',
  financial_target numeric(14,2) not null default 0 check (financial_target >= 0),
  positivity_target integer not null default 0 check (positivity_target >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

create index if not exists commercial_sellers_team_idx
  on public.commercial_sellers (team_id, active, name);

alter table public.commercial_teams enable row level security;
alter table public.commercial_sellers enable row level security;
grant select, insert, update, delete on public.commercial_teams to authenticated;
grant select, insert, update, delete on public.commercial_sellers to authenticated;

create policy "commercial_teams_select" on public.commercial_teams
  for select to authenticated using (
    public.app_is('ceo', 'admin', 'gerente')
    or (public.app_is('supervisor', 'vendedor')
      and supervisor_code = public.app_supervisor_code())
  );
create policy "commercial_teams_insert" on public.commercial_teams
  for insert to authenticated with check (public.app_is('ceo'));
create policy "commercial_teams_update" on public.commercial_teams
  for update to authenticated using (public.app_is('ceo')) with check (public.app_is('ceo'));
create policy "commercial_teams_delete" on public.commercial_teams
  for delete to authenticated using (public.app_is('ceo'));

create policy "commercial_sellers_select" on public.commercial_sellers
  for select to authenticated using (
    public.app_is('ceo', 'admin', 'gerente')
    or (public.app_is('supervisor') and exists (
      select 1 from public.commercial_teams t
      where t.id = team_id and t.supervisor_code = public.app_supervisor_code()
    ))
    or (public.app_is('vendedor') and new_seller_code = public.app_vendedor_code())
  );
create policy "commercial_sellers_insert" on public.commercial_sellers
  for insert to authenticated with check (public.app_is('ceo'));
create policy "commercial_sellers_update" on public.commercial_sellers
  for update to authenticated using (public.app_is('ceo')) with check (public.app_is('ceo'));
create policy "commercial_sellers_delete" on public.commercial_sellers
  for delete to authenticated using (public.app_is('ceo'));

-- Agora os perfis restritos podem consultar clientes, cortes e roteiro; as telas futuras
-- devem continuar aplicando o vínculo da equipe/vendedor em suas próprias consultas.
