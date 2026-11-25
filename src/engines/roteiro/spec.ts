import type { ColumnSpec } from '../core/types';

/** Colunas da base de Roteiro (uma linha por visita planejada: RCA × cliente × data). */
export const SPEC: ColumnSpec[] = [
  {
    group: 'Identificação',
    name: 'id_visita',
    source: 'sequência V000001… após ordenar por data, RCA e cliente',
  },
  {
    group: 'Origem',
    name: 'arquivo_origem',
    source: 'arquivo de origem',
  },
  {
    group: 'Origem',
    name: 'linha_origem',
    source: 'linha no relatório',
  },
  {
    group: 'Quando',
    name: 'data_visita',
    source: 'Data da Visita',
  },
  {
    group: 'Quando',
    name: 'ano_visita',
    source: 'ano da data',
  },
  {
    group: 'Quando',
    name: 'mes_visita',
    source: 'mês da data',
  },
  {
    group: 'Quando',
    name: 'dia_visita',
    source: 'dia da data',
  },
  {
    group: 'Quando',
    name: 'cod_dia_semana',
    source: 'Código Dia da Semana',
  },
  {
    group: 'Quando',
    name: 'dia_semana',
    source: 'Dia da Semana',
  },
  {
    group: 'Recorrência',
    name: 'cod_recorrencia',
    source: 'Código Recorrência',
  },
  {
    group: 'Recorrência',
    name: 'recorrencia',
    source: 'Recorrência',
  },
  {
    group: 'RCA',
    name: 'cod_rca',
    source: 'Código (do RCA)',
  },
  {
    group: 'RCA',
    name: 'nome_rca',
    source: 'Nome (do RCA)',
  },
  {
    group: 'Cliente',
    name: 'cod_cliente',
    source: 'Código Cliente',
  },
  {
    group: 'Cliente',
    name: 'cnpj_cpf_cliente',
    source: 'CNPJ (só dígitos; CPF com 11 e CNPJ com 14)',
  },
  {
    group: 'Cliente',
    name: 'razao_social',
    source: 'Razão Social',
  },
  {
    group: 'Cliente',
    name: 'fantasia',
    source: 'Fantasia',
  },
  {
    group: 'Cliente',
    name: 'cidade',
    source: 'Cidade',
  },
  {
    group: 'Cliente',
    name: 'bairro',
    source: 'Bairro',
  },
  {
    group: 'Cliente',
    name: 'endereco',
    source: 'Endereço',
  },
];
