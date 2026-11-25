import { describe, expect, it } from 'vitest';
import type { Matrix } from '../core/types';
import { processCortes } from './process';

// 46000.5 = meio-dia de um dia de 2025; usamos serial do Excel (sem fuso).
const D1 = 46000 + 19 / 24 + 28 / 1440 + 58 / 86400; // 19:28:58

const relatorio = (extra: Matrix = []): Matrix => [
  ['Relatório de cortes', 'Período 01/08/2026 a 31/08/2026'],
  ['TODOS', 'FORNECEDOR:'],
  ['x', 'CLIENTE:', '38834', 'MERCADO'],
  [
    'DATA',
    'PEDIDO',
    'CODIGO',
    'DESCRICAO',
    'UN',
    'QT CORTE',
    'PRECO UNIT',
    'VLR TOTAL',
  ],
  [D1, 451, 890, 'LIMP...PESADA', 'UN', 3, 5.11, 15.33],
  [D1 + 1, 452, 999, 'FORA DO CADASTRO', 'UN', 1, 2, 2],
  ...extra,
  ['TOTAL GERAL', 2, 4, 17.33],
];

const base = {
  produtos: [{ codprod: '890', ean: '7509546691251' }],
  clientes: [{ cod_cliente: '38834', cnpj_cpf: '57398790000122' }],
};

describe('processCortes', () => {
  it('traduz cliente e produto, descarta item fora do cadastro e lê a hora', () => {
    const r = processCortes({
      arquivos: [{ nome: 'a', matrix: relatorio() }],
      ...base,
    });
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0]).toMatchObject({
      id_corte: 'C000001',
      cnpj_cpf_cliente: '57398790000122',
      ean: '7509546691251',
      hora_corte: '19:28:58',
      descricao_item: 'LIMP PESADA',
      qtd_corte: 3,
    });
    expect(r.audit.some((a) => a.code === 'CORTES_FORA_DO_PRODUTOS')).toBe(
      true,
    );
  });

  it('avisa quando o cliente não está no motor Clientes', () => {
    const r = processCortes({
      arquivos: [{ nome: 'a', matrix: relatorio() }],
      produtos: base.produtos,
      clientes: [{ cod_cliente: '1', cnpj_cpf: '1' }],
    });
    const item = r.audit.find((a) => a.code === 'CORTE_SEM_CNPJ');
    expect(item?.severity).toBe('AVISO');
    expect(item?.records?.[0]?.key).toBe('38834');
  });
});
