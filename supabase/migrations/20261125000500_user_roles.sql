-- Papéis de usuário e regras de acesso (RLS).
--
--  ceo        acesso total e irrestrito (hoje: só o dono do sistema).
--             Somente CEO concede/altera papéis e mexe nas configurações do site.
--  admin      quase tudo, inclusive manutenção de dados novos (enviar arquivos, processar
--             motores, tratar auditoria); NÃO altera configurações do site e NÃO desfaz
--             mudanças feitas por um CEO.
--  gerente    visão comercial: lê os dados, não sobe nem altera nada.
--  supervisor como o gerente, mas só a sua equipe  (supervisor_code).
--  vendedor   como o supervisor, mas só o seu setor (vendedor_code).

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('ceo', 'admin', 'gerente', 'supervisor', 'vendedor')),
  supervisor_code text,
  vendedor_code text,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null
);
alter table public.user_roles enable row level security;
grant select, insert, update, delete on public.user_roles to authenticated;

-- Funções de apoio (security definer: leem user_roles sem recursão de política).
create or replace function public.app_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.user_roles where user_id = auth.uid()
$$;
create or replace function public.app_is(variadic p_roles text[])
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.app_role() = any (p_roles), false)
$$;
create or replace function public.app_supervisor_code()
returns text language sql stable security definer set search_path = public as $$
  select supervisor_code from public.user_roles where user_id = auth.uid()
$$;
create or replace function public.app_vendedor_code()
returns text language sql stable security definer set search_path = public as $$
  select vendedor_code from public.user_roles where user_id = auth.uid()
$$;
create or replace function public.app_user_is_ceo(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = p_user and role = 'ceo')
$$;
grant execute on function public.app_role() to authenticated;
grant execute on function public.app_is(text[]) to authenticated;
grant execute on function public.app_supervisor_code() to authenticated;
grant execute on function public.app_vendedor_code() to authenticated;
grant execute on function public.app_user_is_ceo(uuid) to authenticated;

-- Papéis: cada um vê o próprio; CEO vê e gerencia todos.
create policy "user_roles_select" on public.user_roles
  for select to authenticated using (user_id = auth.uid() or public.app_is('ceo'));
create policy "user_roles_insert" on public.user_roles
  for insert to authenticated with check (public.app_is('ceo'));
create policy "user_roles_update" on public.user_roles
  for update to authenticated using (public.app_is('ceo')) with check (public.app_is('ceo'));
create policy "user_roles_delete" on public.user_roles
  for delete to authenticated using (public.app_is('ceo'));

-- Primeiro CEO.
insert into public.user_roles (user_id, role)
select id, 'ceo' from auth.users where lower(email) = 'luis.fernandotriunfante@gmail.com'
on conflict (user_id) do update set role = 'ceo';

-- Remove as políticas abertas (qualquer usuário logado) e aplica as por papel.
drop policy if exists "engine_runs_select" on public.engine_runs;
drop policy if exists "engine_runs_insert" on public.engine_runs;
drop policy if exists "engine_runs_update" on public.engine_runs;
drop policy if exists "engine_runs_delete" on public.engine_runs;
drop policy if exists "engine_base_rows_select" on public.engine_base_rows;
drop policy if exists "engine_base_rows_insert" on public.engine_base_rows;
drop policy if exists "engine_base_rows_delete" on public.engine_base_rows;
drop policy if exists "engine_audit_items_select" on public.engine_audit_items;
drop policy if exists "engine_audit_items_insert" on public.engine_audit_items;
drop policy if exists "engine_audit_items_update" on public.engine_audit_items;
drop policy if exists "engine_source_files_select" on public.engine_source_files;
drop policy if exists "engine_source_files_insert" on public.engine_source_files;
drop policy if exists "engine_source_files_update" on public.engine_source_files;
drop policy if exists "engine_slot_settings_select" on public.engine_slot_settings;
drop policy if exists "engine_slot_settings_insert" on public.engine_slot_settings;
drop policy if exists "engine_slot_settings_update" on public.engine_slot_settings;
drop policy if exists "movimentacoes_operacoes_select" on public.movimentacoes_operacoes;
drop policy if exists "movimentacoes_operacoes_insert" on public.movimentacoes_operacoes;
drop policy if exists "movimentacoes_operacoes_update" on public.movimentacoes_operacoes;
drop policy if exists "movimentacoes_operacoes_delete" on public.movimentacoes_operacoes;
drop policy if exists "engine_sources_select" on storage.objects;
drop policy if exists "engine_sources_insert" on storage.objects;
drop policy if exists "engine_sources_update" on storage.objects;
drop policy if exists "engine_sources_delete" on storage.objects;

-- Processamentos (resumo + auditoria): CEO, admin e gerente leem; CEO e admin gravam.
create policy "engine_runs_select" on public.engine_runs
  for select to authenticated using (public.app_is('ceo', 'admin', 'gerente'));
create policy "engine_runs_insert" on public.engine_runs
  for insert to authenticated with check (public.app_is('ceo', 'admin'));
create policy "engine_runs_update" on public.engine_runs
  for update to authenticated using (public.app_is('ceo', 'admin'))
  with check (public.app_is('ceo', 'admin'));
create policy "engine_runs_delete" on public.engine_runs
  for delete to authenticated using (public.app_is('ceo', 'admin'));

-- Linhas das bases: CEO/admin/gerente leem tudo. Supervisor e vendedor leem o catálogo de
-- produtos e só as movimentações da sua equipe/setor. Os demais motores (clientes, cortes,
-- roteiro, compras) ficam fechados para eles até existir a tabela de vendedores.
create policy "engine_base_rows_select" on public.engine_base_rows
  for select to authenticated using (
    public.app_is('ceo', 'admin', 'gerente')
    or (public.app_is('supervisor', 'vendedor') and engine = 'produtos')
    or (
      engine = 'movimentacoes' and (
        (public.app_is('supervisor')
          and data ->> 'cod_supervisor_novo' = public.app_supervisor_code())
        or (public.app_is('vendedor')
          and (data ->> 'cod_vendedor_novo' = public.app_vendedor_code()
            or data ->> 'cod_vendedor_antigo' = public.app_vendedor_code()))
      )
    )
  );
create policy "engine_base_rows_insert" on public.engine_base_rows
  for insert to authenticated with check (public.app_is('ceo', 'admin'));
create policy "engine_base_rows_delete" on public.engine_base_rows
  for delete to authenticated using (public.app_is('ceo', 'admin'));

-- Auditoria: CEO/admin/gerente veem; CEO e admin tratam. Caso tratado por um CEO só o CEO reabre.
create policy "engine_audit_items_select" on public.engine_audit_items
  for select to authenticated using (public.app_is('ceo', 'admin', 'gerente'));
create policy "engine_audit_items_insert" on public.engine_audit_items
  for insert to authenticated with check (public.app_is('ceo', 'admin'));
create policy "engine_audit_items_update" on public.engine_audit_items
  for update to authenticated
  using (
    public.app_is('ceo')
    or (public.app_is('admin')
        and not (treated_by is not null and public.app_user_is_ceo(treated_by)))
  )
  with check (public.app_is('ceo', 'admin'));

-- Arquivos enviados: CEO e admin (manutenção de dados). Não sobrescreve o que um CEO enviou? Sobrescrever
-- é manutenção normal de dados novos, então admin pode.
create policy "engine_source_files_select" on public.engine_source_files
  for select to authenticated using (public.app_is('ceo', 'admin'));
create policy "engine_source_files_insert" on public.engine_source_files
  for insert to authenticated with check (public.app_is('ceo', 'admin'));
create policy "engine_source_files_update" on public.engine_source_files
  for update to authenticated using (public.app_is('ceo', 'admin'))
  with check (public.app_is('ceo', 'admin'));
create policy "engine_sources_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'engine-sources' and public.app_is('ceo', 'admin'));
create policy "engine_sources_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'engine-sources' and public.app_is('ceo', 'admin'));
create policy "engine_sources_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'engine-sources' and public.app_is('ceo', 'admin'))
  with check (bucket_id = 'engine-sources' and public.app_is('ceo', 'admin'));
create policy "engine_sources_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'engine-sources' and public.app_is('ceo', 'admin'));

-- Configurações do site (periodicidade, operações do 379): só o CEO altera; CEO/admin/gerente leem.
create policy "engine_slot_settings_select" on public.engine_slot_settings
  for select to authenticated using (public.app_is('ceo', 'admin', 'gerente'));
create policy "engine_slot_settings_insert" on public.engine_slot_settings
  for insert to authenticated with check (public.app_is('ceo'));
create policy "engine_slot_settings_update" on public.engine_slot_settings
  for update to authenticated using (public.app_is('ceo')) with check (public.app_is('ceo'));
create policy "movimentacoes_operacoes_select" on public.movimentacoes_operacoes
  for select to authenticated using (public.app_is('ceo', 'admin', 'gerente'));
create policy "movimentacoes_operacoes_insert" on public.movimentacoes_operacoes
  for insert to authenticated with check (public.app_is('ceo'));
create policy "movimentacoes_operacoes_update" on public.movimentacoes_operacoes
  for update to authenticated using (public.app_is('ceo')) with check (public.app_is('ceo'));
create policy "movimentacoes_operacoes_delete" on public.movimentacoes_operacoes
  for delete to authenticated using (public.app_is('ceo'));
