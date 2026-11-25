import { describe, expect, it } from 'vitest';
import { EngineBlockError, type Matrix } from '../core/types';
import { processProdutos, read322, type ProdutosInput } from './process';

const E1 = '7891024110126';
const E2 = '7891024110456';

const itens286 = (extra: Matrix = []): Matrix => [
  ['Relatório de itens'],
  [
    'Código',
    'Descrição',
    'Cód. Barras',
    'Cód. Fabricante',
    'Embal.Master',
    'Fora de linha',
    'Estoque',
    'Reservado',
    'Custo real',
  ],
  [101, 'CREME DENTAL', E1, '61000001', 12, 'FALSO', 50, 5, 3.5],
  [102, 'ESCOVA', E2, '61000002', 0, 'VERDADEIRO', 10, 0, 0],
  ...extra,
  [null, 2, null, null, null, null, null, null, null],
];

const base = (overrides: Partial<ProdutosInput> = {}): ProdutosInput => ({
  itens286: itens286(),
  texto322: '',
  logistico8013: [
    [
      'SUB BRANDS',
      'CÓDIGO DO PRODUTO (EAN13)',
      'CÓDIGO DO PRODUTO (DUN)',
      'PESO CDA (KG)',
      'PESO UNIDADE (KG)',
    ],
    ['TOTAL', E1, '17891024110120', 1.2, 0.1],
  ],
  listaPreco: [
    ['SKU', 'PRECO BASE', 'EAN', 'WINTHOR', 'DUN 14', 'Un/CX', 'MARCA'],
    ['61000001', 10, E1, '101', '17891024110120', 24, 'COLGATE'],
  ],
  precos8011: [
    [
      'CODFILIALNF',
      'UFDESTINO',
      'CODPROD',
      'PRECO',
      'EAN',
      'DUM',
      'EMBALAGEMMASTER',
      'VALOR_SEM_IMPOSTO',
    ],
    [11, 'MS', 101, 20, E1, '', '12 X 1', 18],
    [11, 'SP', 102, 99, E2, '', '6 X 1', 90],
  ],
  sortimento: [
    ['STATUS', 'COD', 'EAN', 'DESCRICAO', 'Hiper', 'Clubs'],
    ['ATIVO', 1, E1, 'CREME', 5, 2],
    ['ATIVO', 2, E2, 'ESCOVA', 0, 1],
  ],
  ...overrides,
});

describe('motor Produtos', () => {
  it('gera uma linha por item do 286 e junta as fontes pelo EAN', () => {
    const r = processProdutos(base());
    expect(r.rows).toHaveLength(2);
    const p = r.rows[0];
    expect(p?.ean).toBe(E1);
    expect(p?.codprod).toBe('101');
    expect(p?.sku_colgate).toBe('61000001');
    expect(p?.ind_marca).toBe('COLGATE');
    expect(p?.sub_brand).toBe('TOTAL');
    expect(p?.dun).toBe('17891024110120');
    expect(p?.pm_preco_com_st).toBe(20);
    expect(p?.ativo).toBe('SIM');
    expect(r.rows[1]?.ativo).toBe('NAO');
  });

  it('usa unidades por caixa na ordem 286, lista, 8013, 8011, 322', () => {
    const r = processProdutos(base());
    expect(r.rows[0]?.un_por_caixa).toBe(12); // 286 prevalece sobre a lista (24)
    expect(r.rows[1]?.un_por_caixa).toBeNull(); // 8011 de outra UF não vale
    expect(r.audit.find((a) => a.code === 'P13')?.count).toBe(1);
  });

  it('ignora linhas do 8011 fora da filial 11 e UF MS', () => {
    const r = processProdutos(base());
    expect(r.rows[1]?.pm_preco_com_st).toBeNull();
    expect(r.audit.find((a) => a.code === 'P09')?.count).toBe(1);
  });

  it('trata o canal do sortimento 5 como 1 e cria as colunas de canal', () => {
    const r = processProdutos(base());
    expect(r.columns.map((c) => c.name)).toContain('sort_hiper');
    expect(r.rows[0]?.sort_hiper).toBe(1);
    expect(r.rows[0]?.sort_clubs).toBe(2);
    expect(r.rows[1]?.sort_hiper).toBe(0);
    expect(r.audit.find((a) => a.code === 'P16')?.count).toBe(1);
  });

  it('acha as colunas pelo nome mesmo que mudem de lugar', () => {
    const reordered: Matrix = [
      ['Custo real', 'Estoque', 'Cód. Barras', 'Descrição', 'Código'],
      [3.5, 50, E1, 'CREME DENTAL', 101],
      [null, null, null, 1, null],
    ];
    const r = processProdutos(base({ itens286: reordered }));
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0]?.est_total).toBe(50);
  });

  it('bloqueia quando falta coluna obrigatória, EAN repetido ou rodapé diferente', () => {
    expect(() =>
      processProdutos(
        base({
          itens286: [
            ['Código', 'Cód. Barras'],
            [1, E1],
          ],
        }),
      ),
    ).toThrow(EngineBlockError);
    expect(() =>
      processProdutos(
        base({
          itens286: itens286([[103, 'REPETIDO', E1, '', 1, 'FALSO', 1, 0, 1]]),
        }),
      ),
    ).toThrow(/EAN vazio ou repetido/);
    const wrongFooter = itens286();
    wrongFooter[wrongFooter.length - 1] = [
      null,
      5,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ];
    expect(() => processProdutos(base({ itens286: wrongFooter }))).toThrow(
      /rodapé/,
    );
  });

  it('avisa itens ativos sem custo real', () => {
    const r = processProdutos(
      base({
        itens286: itens286([
          [103, 'SEM CUSTO', '7891024110789', '', 1, 'FALSO', 1, 0, 0],
        ]).map((row, i, all) =>
          i === all.length - 1
            ? [null, 3, null, null, null, null, null, null, null]
            : row,
        ),
      }),
    );
    expect(r.audit.find((a) => a.code === 'P18')?.count).toBe(1);
  });
});

describe('leitura do 322', () => {
  it('ignora linhas que não são de item', () => {
    expect(read322('cabeçalho\n\nrodapé')).toEqual([]);
  });
});
