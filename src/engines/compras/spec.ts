import type { ColumnSpec } from '../core/types';

/** Colunas da base de Compras da indústria (grupo, nome e origem de cada campo). */
export const SPEC: ColumnSpec[] = [
  {
    group: 'Identificação',
    name: 'origem',
    source: 'Slot de origem do registro',
  },
  {
    group: 'Identificação',
    name: 'grao',
    source: 'NOTA (ERP antigo, sem itens) / ITEM (ERP novo e carteira)',
  },
  {
    group: 'Identificação',
    name: 'situacao',
    source: 'ENTRADA_REGISTRADA | PEDIDO_ABERTO | PEDIDO_FATURADO',
  },
  {
    group: 'Identificação',
    name: 'classe',
    source: 'COMPRA_MERCADORIA | MATERIAL_ALMOXARIFADO | PEDIDO_COLGATE',
  },
  {
    group: 'Regras',
    name: 'compoe_compra_recebida',
    source:
      '1 = soma no que o Milênio comprou e recebeu (COMPRA_MERCADORIA em ENTRADA_REGISTRADA)',
  },
  {
    group: 'Regras',
    name: 'compoe_carteira_aberta',
    source: '1 = pedido ainda não faturado pela indústria',
  },
  {
    group: 'Documento',
    name: 'nota',
    source: 'Número da nota fiscal, só dígitos, sem * nem zeros à esquerda',
  },
  {
    group: 'Documento',
    name: 'serie',
    source: 'Série da nota',
  },
  {
    group: 'Documento',
    name: 'operacao',
    source: '212.01/299.40 (ERP antigo) ou E (ERP novo)',
  },
  {
    group: 'Documento',
    name: 'trans_entrada',
    source: 'Nº da transação de entrada (ERP novo)',
  },
  {
    group: 'Documento',
    name: 'pedido_ind',
    source: 'Nº do pedido na Colgate (carteira)',
  },
  {
    group: 'Datas',
    name: 'dt_entrada',
    source: 'Data de entrada/contabilização da nota (ISO)',
  },
  {
    group: 'Datas',
    name: 'dt_emissao',
    source: 'Data de emissão da nota pela Colgate (ISO)',
  },
  {
    group: 'Datas',
    name: 'dt_pedido',
    source: 'Data do pedido na Colgate (carteira)',
  },
  {
    group: 'Datas',
    name: 'dt_faturamento_ind',
    source: 'Data de faturamento na Colgate (carteira)',
  },
  {
    group: 'Datas',
    name: 'ano_mes_entrada',
    source: 'AAAA-MM de dt_entrada',
  },
  {
    group: 'Datas',
    name: 'ano_mes_emissao',
    source: 'AAAA-MM de dt_emissao',
  },
  {
    group: 'Fornecedor',
    name: 'cnpj_forn',
    source: 'CNPJ da Colgate, 14 dígitos',
  },
  {
    group: 'Fornecedor',
    name: 'uf_origem',
    source: 'UF de origem da nota',
  },
  {
    group: 'Produto',
    name: 'codprod',
    source: 'Código do produto no sistema (liga com Produtos)',
  },
  {
    group: 'Produto',
    name: 'ean',
    source: 'EAN do produto, sem zeros à esquerda (liga com Produtos)',
  },
  {
    group: 'Produto',
    name: 'descricao',
    source: 'Descrição do produto (Produtos)',
  },
  {
    group: 'Produto',
    name: 'categoria_ind',
    source: 'Categoria da indústria (Produtos)',
  },
  {
    group: 'Produto',
    name: 'marca_ind',
    source: 'Marca da indústria (Produtos)',
  },
  {
    group: 'Produto',
    name: 'material_ind',
    source: 'Código do material na Colgate (carteira)',
  },
  {
    group: 'Produto',
    name: 'desc_material_ind',
    source: 'Descrição do material na Colgate (carteira)',
  },
  {
    group: 'Produto',
    name: 'produto_via',
    source: 'Como o produto foi identificado na carteira',
  },
  {
    group: 'Quantidade',
    name: 'un_por_caixa',
    source: 'Unidades por caixa (Produtos)',
  },
  {
    group: 'Quantidade',
    name: 'qtd_un',
    source:
      'Unidades compradas (ERP novo) ou convertidas da carteira (cx × un/cx)',
  },
  {
    group: 'Quantidade',
    name: 'qtd_cx',
    source: 'Quantidade em caixas',
  },
  {
    group: 'Quantidade',
    name: 'qtd_pedida_cx',
    source: 'Carteira: caixas pedidas ainda abertas',
  },
  {
    group: 'Quantidade',
    name: 'qtd_faturada_cx',
    source: 'Carteira: caixas faturadas',
  },
  {
    group: 'Valores',
    name: 'valor_nota',
    source: 'Valor total da nota (ERP): repete em cada item da nota',
  },
  {
    group: 'Valores',
    name: 'valor_item',
    source:
      'Valor do registro: item = qtd × preço; nota = valor da nota; carteira = valor líquido',
  },
  {
    group: 'Valores',
    name: 'p_unit',
    source: 'Preço unitário de compra (ERP novo)',
  },
  {
    group: 'Valores',
    name: 'custo_fin_ant',
    source: 'Custo financeiro anterior (ERP novo)',
  },
  {
    group: 'Valores',
    name: 'custo_fin_atual',
    source: 'Custo financeiro atual (ERP novo)',
  },
  {
    group: 'Valores',
    name: 'peso_bruto',
    source: 'Peso bruto (carteira)',
  },
  {
    group: 'Financeiro',
    name: 'nr_lanc',
    source: 'Lançamento no contas a pagar (ERP novo)',
  },
  {
    group: 'Financeiro',
    name: 'dt_vencimento',
    source: 'Vencimento do título',
  },
  {
    group: 'Financeiro',
    name: 'prazo_pagamento',
    source: 'Prazo do título em dias',
  },
  {
    group: 'Conciliação',
    name: 'nf_na_entrada',
    source: 'Carteira faturada: 1 se a nota já tem entrada no ERP novo',
  },
  {
    group: 'Conciliação',
    name: 'dt_entrada_da_nf',
    source: 'Carteira faturada: data de entrada da nota',
  },
  {
    group: 'Conciliação',
    name: 'dias_fat_ate_entrada',
    source: 'Dias entre faturamento na Colgate e entrada no Milênio',
  },
];
