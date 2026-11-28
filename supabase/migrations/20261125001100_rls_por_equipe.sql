-- Leitura por equipe/vendedor usando a camada de vendedores (equipe_cod / vendedor_cod),
-- mantendo os campos antigos de Movimentações como reserva.
-- Cortes e Compras não têm vendedor: só gestão lê.
drop policy if exists "engine_base_rows_select" on public.engine_base_rows;
create policy "engine_base_rows_select" on public.engine_base_rows
  for select to authenticated using (
    (select public.app_is('ceo', 'admin', 'gerente'))
    or (engine = 'produtos' and (select public.app_is('supervisor', 'vendedor')))
    or (
      engine in ('movimentacoes', 'clientes', 'roteiro') and (
        ((select public.app_is('supervisor'))
          and (data ->> 'equipe_cod' = (select public.app_supervisor_code())
            or (engine = 'movimentacoes' and data ->> 'cod_supervisor_novo' = (select public.app_supervisor_code()))))
        or ((select public.app_is('vendedor'))
          and (data ->> 'vendedor_cod' = (select public.app_vendedor_code())
            or (engine = 'movimentacoes' and (data ->> 'cod_vendedor_novo' = (select public.app_vendedor_code())
              or data ->> 'cod_vendedor_antigo' = (select public.app_vendedor_code()))))
        )
      )
    )
  );
