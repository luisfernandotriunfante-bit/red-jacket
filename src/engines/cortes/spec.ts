import type { ColumnSpec } from '../core/types';

/** Colunas da base de Cortes. */
export const SPEC: ColumnSpec[] = [
  {
    group: 'Identificação',
    name: 'id_corte',
    source:
      'sequência C000001… após ordenar por data, cliente, pedido e produto',
  },
  {
    group: 'Origem',
    name: 'arquivo_origem',
    source: 'slot de origem do 1454',
  },
  {
    group: 'Origem',
    name: 'linha_origem',
    source: 'linha no relatório 1454',
  },
  {
    group: 'Quando',
    name: 'data_corte',
    source: '1454: DATA (dia)',
  },
  {
    group: 'Quando',
    name: 'hora_corte',
    source: '1454: DATA (hora)',
  },
  {
    group: 'Quando',
    name: 'ano_corte',
    source: 'ano da data',
  },
  {
    group: 'Quando',
    name: 'mes_corte',
    source: 'mês da data',
  },
  {
    group: 'Quando',
    name: 'dia_corte',
    source: 'dia da data',
  },
  {
    group: 'Pedido',
    name: 'pedido',
    source: '1454: PEDIDO',
  },
  {
    group: 'Cliente',
    name: 'cod_cliente',
    source: '1454: bloco CLIENTE: (código do cliente no Winthor)',
  },
  {
    group: 'Cliente',
    name: 'cnpj_cpf_cliente',
    source: 'motor Clientes: cnpj_cpf pelo código do cliente',
  },
  {
    group: 'Produto',
    name: 'codprod',
    source: '1454: CODIGO',
  },
  {
    group: 'Produto',
    name: 'ean',
    source: 'motor Produtos: ean pelo código do produto',
  },
  {
    group: 'Produto',
    name: 'descricao_item',
    source: '1454: DESCRICAO',
  },
  {
    group: 'Produto',
    name: 'embalagem',
    source: '1454: EMBALAGEM',
  },
  {
    group: 'Produto',
    name: 'un',
    source: '1454: UN',
  },
  {
    group: 'Produto',
    name: 'depto',
    source: '1454: DEPTO',
  },
  {
    group: 'Corte',
    name: 'qtd_corte',
    source: '1454: QT CORTE',
  },
  {
    group: 'Corte',
    name: 'preco_unit',
    source: '1454: PRECO UNIT',
  },
  {
    group: 'Corte',
    name: 'valor_corte',
    source: '1454: VLR TOTAL',
  },
];
