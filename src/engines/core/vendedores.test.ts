import { describe, expect, it } from 'vitest';
import {
  auditoriaVendedores,
  camposVendedor,
  indexarVendedores,
  normVendCode,
  resolverVendedor,
  type RegistroVendedor,
  type Vendedor,
} from './vendedores';

const v = (
  p: Partial<Vendedor> & { id: string; codNovo: string },
): Vendedor => ({
  nome: `Vendedor ${p.id}`,
  equipeCod: '542',
  equipeNome: 'TIAGO',
  ativo: true,
  codsAntigos: [],
  ...p,
});

describe('vendedores', () => {
  const lista = [
    v({ id: 'a', codNovo: '431', codsAntigos: ['0702', '0132'] }),
    v({ id: 'b', codNovo: '416', ativo: false, codsAntigos: ['0507'] }),
    v({ id: 'c', codNovo: 'ANT-0701', codsAntigos: ['0701'], ativo: false }),
  ];
  const idx = indexarVendedores(lista);

  it('normaliza códigos sem zeros à esquerda', () => {
    expect(normVendCode('0702')).toBe('702');
    expect(normVendCode(' ant-0701 ')).toBe('ANT-0701');
    expect(normVendCode('')).toBeNull();
  });

  it('resolve pelo código novo e pelo antigo (mesmo vendedor)', () => {
    expect(resolverVendedor(idx, '431', null).origem).toBe('CODIGO_NOVO');
    const antigo = resolverVendedor(idx, null, '0132');
    expect(antigo.origem).toBe('CODIGO_ANTIGO');
    expect(antigo.vendedor?.id).toBe('a');
  });

  it('código desconhecido vira SEM_CADASTRO, não erro', () => {
    const r = resolverVendedor(idx, '999', '0999');
    expect(r.vendedor).toBeNull();
    expect(camposVendedor(r).vendedor_situacao).toBe('SEM_CADASTRO');
  });

  it('inativo aparece como INATIVO com a equipe atual', () => {
    const c = camposVendedor(resolverVendedor(idx, '416', null));
    expect(c.vendedor_situacao).toBe('INATIVO');
    expect(c.equipe_cod).toBe('542');
  });

  it('detecta código repetido no cadastro', () => {
    const dup = indexarVendedores([
      v({ id: 'x', codNovo: '1', codsAntigos: ['0500'] }),
      v({ id: 'y', codNovo: '2', codsAntigos: ['500'] }),
    ]);
    expect(dup.conflitos).toHaveLength(1);
  });

  it('auditoria: sem cadastro, inativo com venda recente e ativo sem venda', () => {
    const reg = (
      codigo: string,
      data: string,
      valor: number,
    ): RegistroVendedor => {
      const r = resolverVendedor(idx, codigo, codigo);
      return { codigo, origem: r.origem, vendedor: r.vendedor, data, valor };
    };
    const audit = auditoriaVendedores(
      [
        reg('999', '2026-11-20', 100),
        reg('999', '2026-11-21', 50),
        reg('416', '2026-11-20', 10),
        reg('431', '2026-09-01', 10),
      ],
      idx,
    );
    const por = Object.fromEntries(audit.map((a) => [a.code, a]));
    expect(por.VENDEDOR_SEM_CADASTRO?.records?.[0]?.key).toBe('999');
    expect(por.VENDEDOR_INATIVO_COM_VENDA_RECENTE?.count).toBe(1);
    expect(por.VENDEDOR_ATIVO_SEM_VENDA_RECENTE?.count).toBe(1);
  });

  it('cadastro vazio avisa e não gera casos por linha', () => {
    const audit = auditoriaVendedores([], indexarVendedores([]));
    expect(audit.map((a) => a.code)).toEqual(['TABELA_VENDEDORES_VAZIA']);
  });
});

describe('enriquecerComVendedor', () => {
  it('liga linhas pelo código e ignora o RCA das indústrias', async () => {
    const { enriquecerComVendedor } = await import('./vendedores');
    const r = enriquecerComVendedor(
      {
        engine: 'clientes',
        columns: [],
        audit: [],
        rows: [
          { cnpj_cpf: '1', cod_rca_1203: '0431' },
          { cnpj_cpf: '2', cod_rca_1203: '2' },
          { cnpj_cpf: '3', cod_rca_1203: '888' },
        ],
      },
      [v({ id: 'a', codNovo: '431' })],
      'cod_rca_1203',
      ['2'],
    );
    expect(r.rows[0]?.vendedor_id).toBe('a');
    expect(r.rows[1]?.vendedor_situacao).toBeNull();
    expect(r.rows[2]?.vendedor_situacao).toBe('SEM_CADASTRO');
    expect(r.audit.map((a) => a.code)).toContain('VENDEDOR_SEM_CADASTRO');
  });
});
