import { describe, expect, it } from 'vitest';
import type { Matrix } from '../core/types';
import {
  normDoc,
  numBr,
  processMovimentacoes,
  read379,
  read8022,
} from './process';

// Relatório 379 de largura fixa (colunas separadas por vãos de espaço).
function linha(
  data: string,
  nota: string,
  item: string,
  qtde: string,
  valor: string,
  oper: string,
  cfop: string,
  cliente: string,
  ean: string,
): string {
  return [
    data.padEnd(12),
    nota.padStart(8).padEnd(10),
    item.padEnd(10),
    qtde.padStart(6).padEnd(8),
    valor.padStart(10).padEnd(12),
    oper.padEnd(8),
    cfop.padEnd(8),
    cliente.padEnd(16),
    ean.padEnd(15),
  ].join('');
}
const cab =
  'Data'.padEnd(12) +
  'Nota'.padStart(8).padEnd(10) +
  'Item'.padEnd(10) +
  'Qtde'.padStart(6).padEnd(8) +
  'Valor'.padStart(10).padEnd(12) +
  'Oper.CFOP'.padEnd(8) +
  ''.padEnd(8) +
  'Cliente'.padEnd(16) +
  'Comercial'.padEnd(15);

const texto379 = [
  'MCD  relatório de vendas',
  cab,
  '-'.repeat(60),
  linha(
    '06/01/2025',
    '123',
    '11100504',
    '12',
    '262,61',
    '13201',
    '1411',
    '33168717000104',
    '7891024034415',
  ),
  linha(
    '06/01/2025',
    '124',
    '11100853',
    '3',
    '1.200,50',
    '51201',
    '5102',
    '09531413001068',
    '7509546689944',
  ),
  linha(
    '07/01/2025',
    '125',
    '11100853',
    '1',
    '50,00',
    '59996',
    '5927',
    '09531413001068',
    '7509546689944',
  ),
].join('\r\n');

describe('helpers', () => {
  it('numBr lê formatos brasileiros', () => {
    expect(numBr('1.200,50')).toBe(1200.5);
    expect(numBr('3,00-')).toBe(-3);
    expect(numBr('-3,00')).toBe(-3);
    expect(numBr('')).toBeNull();
  });
  it('normDoc recompõe zeros e separa CPF/CNPJ', () => {
    expect(normDoc('9531413001068')).toBe('09531413001068');
    expect(normDoc(33168717000104)).toBe('33168717000104');
  });
});

describe('read379', () => {
  it('acha os campos pelo cabeçalho, sem posição fixa', () => {
    const r = read379(texto379, 'qualquer-nome.bin');
    expect(r.rows).toHaveLength(3);
    expect(r.rows[1]).toMatchObject({
      nota_fiscal: '124',
      qtd_unidades: 3,
      valor_mercadoria: 1200.5,
      operacao_antiga: '51201',
      cfop: '5102',
    });
  });
  it('bloqueia quando falta coluna obrigatória', () => {
    const sem = texto379.replace('Qtde', 'Xxxx');
    expect(() => read379(sem, 'a')).toThrow(/BLOQUEIO|obrigat/);
  });
});

const cab8022 = [
  'DATA MOVIMENTO',
  'NUMERO NOTA FISCAL',
  'CNPJ CPF CLIENTE',
  'EAN CADASTRO',
  'CODPROD WINTHOR',
  'UNIDADES VENDIDAS',
  'CAIXAS VENDIDAS',
  'VALOR MERCADORIA R$',
  'VALOR NOTA R$',
  'TIPO VENDA',
  'STATUS PEDIDO',
  'COLUNA NOVA',
];
const m8022 = (rows: (string | number | null)[][]): Matrix => [
  ['Relatório 8022'],
  cab8022,
  ...rows,
];

describe('read8022', () => {
  it('lê pelo nome e avisa de coluna nova', () => {
    const r = read8022(
      m8022([
        [
          '10/08/2026',
          900,
          '12345678000195',
          '7891024034415',
          77,
          6,
          1,
          100,
          98,
          'VENDA',
          'FATURADO',
          'x',
        ],
      ]),
      'novo.xls',
    );
    expect(r.movs).toHaveLength(1);
    expect(r.movs[0]).toMatchObject({
      nota: '900',
      valorOficial: 98,
      linha: 3,
    });
    expect(r.audit.some((a) => a.code === 'COLUNA_NOVA')).toBe(true);
  });
});

describe('processMovimentacoes', () => {
  const run = (extra: (string | number | null)[][] = []) =>
    processMovimentacoes({
      antigos: [{ nome: 'a.txt', texto: texto379 }],
      novos: [
        {
          nome: 'b.xls',
          matrix: m8022([
            [
              '10/08/2026',
              900,
              '12345678000195',
              '7891024034415',
              77,
              6,
              1,
              100,
              98,
              'VENDA',
              'FATURADO',
              null,
            ],
            [
              '10/08/2026',
              901,
              '12345678000195',
              '7891024034415',
              77,
              2,
              1,
              40,
              null,
              'DEVOLUCAO',
              'FATURADO',
              null,
            ],
            ...extra,
          ]),
        },
      ],
    });

  it('classifica, aplica sinais e ordena', () => {
    const r = run();
    // 379: devolução, venda (a baixa de estoque 59996 fica fora) + 8022: venda, devolução
    expect(r.rows.map((x) => x.classe_movimento)).toEqual([
      'DEVOLUCAO',
      'VENDA',
      'VENDA',
      'DEVOLUCAO',
    ]);
    expect(r.rows[0]).toMatchObject({
      id_movimento: 'M0000001',
      sistema_origem: 'ERP_ANTIGO',
      qtd_unidades: -12,
      valor_oficial: -262.61,
      compoe_liquido: 1,
    });
    expect(r.rows[2]).toMatchObject({
      valor_oficial: 98,
      valor_mercadoria: 100,
    });
    expect(r.rows[3]).toMatchObject({ valor_oficial: -40, qtd_unidades: -2 });
    const naoMapeada = r.audit.find((a) => a.code === 'OPERACAO_NAO_MAPEADA');
    expect(naoMapeada?.severity).toBe('AVISO');
    expect(naoMapeada?.records?.[0]?.key).toBe('59996/5927');
  });

  it('substitui o período repetido do 8022 mais antigo', () => {
    const r = processMovimentacoes({
      antigos: [{ nome: 'a.txt', texto: texto379 }],
      novos: [
        {
          nome: 'velho.xls',
          matrix: m8022([
            [
              '10/08/2026',
              900,
              '12345678000195',
              '7891024034415',
              77,
              6,
              1,
              100,
              98,
              'VENDA',
              'FATURADO',
              null,
            ],
            [
              '11/08/2026',
              902,
              '12345678000195',
              '7891024034415',
              77,
              1,
              1,
              10,
              10,
              'VENDA',
              'FATURADO',
              null,
            ],
          ]),
        },
        {
          nome: 'atual.xls',
          matrix: m8022([
            [
              '11/08/2026',
              902,
              '12345678000195',
              '7891024034415',
              77,
              1,
              1,
              10,
              10,
              'VENDA',
              'FATURADO',
              null,
            ],
          ]),
        },
      ],
    });
    const aviso = r.audit.find(
      (a) => a.code === 'PERIODO_REPETIDO_ENTRE_ARQUIVOS',
    );
    expect(aviso).toMatchObject({ severity: 'AVISO', count: 1 });
    expect(r.rows.filter((x) => x.sistema_origem === 'ERP_NOVO')).toHaveLength(
      2,
    );
  });

  it('é determinístico e o texto dos avisos não depende de números', () => {
    const a = run();
    const b = run();
    expect(a.rows).toEqual(b.rows);
    for (const item of a.audit.filter((x) => x.severity !== 'INFO')) {
      expect(item.message).not.toMatch(/\d+ (linhas|clientes|combina)/);
    }
  });

  it('sinaliza tipo de venda desconhecido no 8022', () => {
    const r = run([
      [
        '12/08/2026',
        903,
        '12345678000195',
        '7891024034415',
        77,
        1,
        1,
        10,
        10,
        'OUTRO',
        'FATURADO',
        null,
      ],
    ]);
    expect(
      r.audit.find((a) => a.code === 'TIPO_VENDA_NAO_MAPEADO')?.count,
    ).toBe(1);
    expect(r.rows).toHaveLength(4);
  });
});
