import { describe, expect, it } from 'vitest';
import type { Matrix } from '../core/types';
import { processRoteiro } from './process';

const CNPJ = '11222333000181';

const rel = (extra: Matrix = []): Matrix => [
  ['Relatório Roteiro Consolidado Geral'],
  ['Data Inicial', 'Data Final'],
  ['01/11/2026', '30/11/2026'],
  [],
  [
    'Código',
    'Nome',
    'Código Cliente',
    'CNPJ',
    'Razão Social',
    'Recorrência',
    'Data da Visita',
    'Código Dia da Semana',
    'Dia da Semana',
  ],
  [
    411,
    'FABRICIO FERREIRA',
    '29470',
    CNPJ,
    'LJ-09 LTDA',
    'Semanal',
    '03/11/2026',
    3,
    'TERCA',
  ],
  [
    411,
    'FABRICIO FERREIRA',
    '29470',
    CNPJ,
    'LJ-09 LTDA',
    'Semanal',
    '03/11/2026',
    3,
    'TERCA',
  ],
  [
    412,
    'VAGO',
    '29471',
    CNPJ,
    'LJ-09 LTDA',
    'Semanal',
    '04/11/2026',
    4,
    'TERCA',
  ],
  ...extra,
];

describe('processRoteiro', () => {
  it('descarta visita repetida e confere dia da semana', () => {
    const r = processRoteiro({ matrix: rel(), clientes: [{ cnpj_cpf: CNPJ }] });
    expect(r.rows).toHaveLength(2);
    expect(r.rows[0]).toMatchObject({
      id_visita: 'V000001',
      data_visita: '2026-11-03',
      cod_rca: '411',
    });
    expect(r.audit.find((a) => a.code === 'VISITA_REPETIDA')?.severity).toBe(
      'AVISO',
    );
    // 04/11/2026 é quarta-feira, o relatório diz TERCA
    expect(
      r.audit.find((a) => a.code === 'DIA_DA_SEMANA_DIVERGE_DA_DATA')?.severity,
    ).toBe('ERRO');
  });

  it('avisa quando a base de Clientes está vazia', () => {
    const r = processRoteiro({ matrix: rel(), clientes: [] });
    expect(r.audit.some((a) => a.code === 'MOTOR_CLIENTES_SEM_BASE')).toBe(
      true,
    );
  });

  it('bloqueia sem o cabeçalho esperado', () => {
    expect(() => processRoteiro({ matrix: [['nada']], clientes: [] })).toThrow(
      /BLOQUEIO/,
    );
  });
});
