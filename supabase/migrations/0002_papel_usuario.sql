-- Migração 0002 — papel do usuário logado para a UI.
-- Proposta: NÃO aplicada no projeto Supabase real; depende da aprovação
-- do QA e do mesmo procedimento seguro da 0001.
--
-- Por que existe: a tela precisa decidir se mostra os botões "Atualizar"
-- sem tentar uma escrita que o banco vai negar. O papel é sempre calculado
-- a partir de auth.uid() do JWT, nunca de parâmetro enviado pelo client.
-- Isto NÃO é a barreira de segurança: as policies/RLS da 0001 continuam
-- sendo a autorização real.

create or replace function meu_papel()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then 'anonimo'
    when eh_owner(auth.uid()) then 'owner'
    when exists (select 1 from motor_updaters where user_id = auth.uid()) then 'updater'
    else 'leitor'
  end;
$$;

revoke execute on function meu_papel() from public;
grant execute on function meu_papel() to authenticated;
