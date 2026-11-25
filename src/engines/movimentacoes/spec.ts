import type { ColumnSpec } from '../core/types';

/** Colunas da base de Movimentações (venda, bonificação, devolução e troca dos dois ERPs). */
export const SPEC: ColumnSpec[] = [
  {
    group: 'Identificação',
    name: 'id_movimento',
    source: 'M + sequência (ordem: data, ERP, nota, item, linha de origem)',
  },
  {
    group: 'Identificação',
    name: 'sistema_origem',
    source: 'ERP_ANTIGO (relatório 379) ou ERP_NOVO (relatório 8022)',
  },
  {
    group: 'Identificação',
    name: 'arquivo_origem',
    source: 'Nome do arquivo enviado (só informativo)',
  },
  {
    group: 'Identificação',
    name: 'linha_origem',
    source: 'Linha do arquivo de origem',
  },
  {
    group: 'Datas',
    name: 'data_movimento',
    source: '379: data da linha (= emissão) · 8022: DATA MOVIMENTO',
  },
  { group: 'Datas', name: 'ano_mov', source: 'Ano de data_movimento' },
  { group: 'Datas', name: 'mes_mov', source: 'Mês de data_movimento' },
  { group: 'Datas', name: 'dia_mov', source: 'Dia de data_movimento' },
  {
    group: 'Datas',
    name: 'data_emissao',
    source:
      '379: igual ao movimento · 8022: DATA EMISSAO NF (vazia se a faturar)',
  },
  { group: 'Datas', name: 'ano_emi', source: 'Ano de data_emissao' },
  { group: 'Datas', name: 'mes_emi', source: 'Mês de data_emissao' },
  { group: 'Datas', name: 'dia_emi', source: 'Dia de data_emissao' },
  {
    group: 'Documento',
    name: 'nota_fiscal',
    source: 'Número da nota, só dígitos, sem zeros à esquerda',
  },
  { group: 'Documento', name: 'serie', source: 'Série (só 379)' },
  { group: 'Documento', name: 'pedido', source: 'Número do pedido' },
  {
    group: 'Regras',
    name: 'classe_movimento',
    source:
      'VENDA | DEVOLUCAO | TROCA | BONIFICACAO (379: operação · 8022: TIPO VENDA)',
  },
  {
    group: 'Regras',
    name: 'situacao_faturamento',
    source: 'FATURADO | A_FATURAR (8022: STATUS PEDIDO)',
  },
  {
    group: 'Regras',
    name: 'compoe_liquido',
    source: '1 = entra na venda líquida (VENDA e DEVOLUCAO)',
  },
  {
    group: 'Cliente',
    name: 'cnpj_cpf_cliente',
    source: 'CNPJ/CPF só dígitos (CNPJ com 14, CPF com 11)',
  },
  { group: 'Cliente', name: 'cod_cliente_novo', source: '8022: COD CLIENTE' },
  {
    group: 'Equipe',
    name: 'cod_vendedor_antigo',
    source: '379: coluna RPC.',
  },
  { group: 'Equipe', name: 'cod_vendedor_novo', source: '8022: COD VENDEDOR' },
  {
    group: 'Equipe',
    name: 'cod_supervisor_novo',
    source: '8022: COD SUPERVISOR',
  },
  {
    group: 'Produto',
    name: 'ean',
    source: '379: EAN comercial · 8022: EAN CADASTRO (chave do produto)',
  },
  {
    group: 'Produto',
    name: 'item_codigo_antigo',
    source: '379: código do item',
  },
  { group: 'Produto', name: 'codprod_novo', source: '8022: CODPROD WINTHOR' },
  {
    group: 'Valores',
    name: 'qtd_unidades',
    source: 'Unidades; devolução e troca sempre negativas',
  },
  {
    group: 'Valores',
    name: 'qtd_caixas',
    source: '8022: caixas vendidas · 379: unidades ÷ unidades por caixa',
  },
  {
    group: 'Valores',
    name: 'valor_oficial',
    source: '8022: VALOR NOTA (ou mercadoria se vazio) · 379: Valor',
  },
  {
    group: 'Valores',
    name: 'valor_mercadoria',
    source: '8022: VALOR MERCADORIA (379 não tem)',
  },
  { group: 'Valores', name: 'desconto', source: '379: Desconto' },
  { group: 'Impostos', name: 'icms', source: '379: ICMS' },
  { group: 'Impostos', name: 'icms_st', source: '379: ICMS-ST' },
  { group: 'Impostos', name: 'fcp', source: '379: FCP' },
  { group: 'Impostos', name: 'valor_pis', source: '379: PIS' },
  { group: 'Impostos', name: 'valor_cofins', source: '379: COFINS' },
  {
    group: 'Operação',
    name: 'operacao_antiga',
    source: '379: operação (coluna Oper.CFOP)',
  },
  { group: 'Operação', name: 'cfop', source: '379: CFOP' },
  { group: 'Operação', name: 'tipo_novo', source: '8022: TIPO VENDA' },
];
