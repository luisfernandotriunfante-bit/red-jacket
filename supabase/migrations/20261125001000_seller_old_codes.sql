-- Códigos antigos adicionais de um vendedor (além do old_rca_code do cadastro).
create table if not exists public.commercial_seller_old_codes (
  code text primary key,
  seller_id uuid not null references public.commercial_sellers(id) on delete cascade
);
alter table public.commercial_seller_old_codes enable row level security;

drop policy if exists seller_old_codes_select on public.commercial_seller_old_codes;
create policy seller_old_codes_select on public.commercial_seller_old_codes
  for select to authenticated
  using ((select public.app_is('ceo','admin','gerente')));

drop policy if exists seller_old_codes_write on public.commercial_seller_old_codes;
create policy seller_old_codes_write on public.commercial_seller_old_codes
  for all to authenticated
  using ((select public.app_is('ceo')))
  with check ((select public.app_is('ceo')));

insert into public.commercial_seller_old_codes (code, seller_id)
select x.code, s.id
from (values ('0132','431'), ('0101','1067')) as x(code, new_code)
join public.commercial_sellers s on s.new_seller_code = x.new_code
on conflict (code) do nothing;
