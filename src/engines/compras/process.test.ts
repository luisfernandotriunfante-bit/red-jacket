import { describe, expect, it } from 'vitest';
import type { Matrix } from '../core/types';
import { CNPJ_COLGATE, processCompras, read12322 } from './process';

const linha12322 =
  '    1234 04/05/26 06/05/26 00382468003375 000001 212.01 X       1.000,00      0,00      0,00 001 SP  COLGATE 99';

describe('read12322', () => {
  it('lê a nota, classifica a operação e o total', () => {
    const r = read12322(`${linha12322}\n   Totais.......   1    1.000,00\n`);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0]).toMatchObject({
      nota: '1234',
      dtEntrada: '2026-05-06',
      classe: 'COMPRA_MERCADORIA',
      valor: 1000,
    });
    expect(r.total).toEqual({ n: 1, valor: 1000 });
  });
});

const hdrN = [
  'Dt. Entrada',
  null,
  'Nº Trans. Ent.',
  null,
  'Nota Fiscal',
  'Tipo Ent.',
  null,
  'Série',
  'Dt. Emissão',
  'Prazo Entr.',
  'Filial',
  'Cod.',
  'Fornecedor',
  null,
  null,
  null,
  null,
  null,
  'CGC',
  null,
  'UF',
  'Vl. Total',
];
const hdrI = [
  null,
  null,
  null,
  null,
  'Código',
  'Produto',
  null,
  null,
  null,
  null,
  null,
  'Filial',
  'Embalagem',
  null,
  'UN',
  null,
  'Qt.',
  'P.Unit.',
  'Custo Fin.Ant.',
  null,
  'Custo Fin.Atual',
];
const nota = [
  new Date(2026, 7, 26),
  208710,
  null,
  null,
  '*2951330',
  '1',
  null,
  '1',
  new Date(2026, 7, 4),
  22,
  '11',
  17770,
  'A - COLGATE',
  null,
  null,
  null,
  null,
  null,
  CNPJ_COLGATE,
  null,
  'SP',
  100,
];
const item = [
  null,
  null,
  null,
  null,
  12042,
  'SAB LIQ',
  null,
  null,
  null,
  null,
  null,
  '11',
  '01X200ML',
  null,
  'UN',
  10,
  null,
  10,
  4,
  null,
  4,
];

const r218: Matrix = [
  ['218 - Rel.', ...Array<null>(21).fill(null), new Date(2026, 10, 24, 9, 30)],
  [],
  [
    null,
    'Filial:',
    '11',
    null,
    null,
    null,
    null,
    null,
    '01/08/2026',
    'até',
    '24/11/2026',
  ],
  ...Array<Matrix[number]>(8).fill([]),
  hdrN,
  nota,
  hdrI,
  item,
  [100, 'Notas Listadas', ...Array<null>(19).fill(null), 100],
];
const carteira: Matrix = [
  [
    'Order Date',
    'Material',
    'Description',
    'Order Qty',
    'Bill Qty',
    'Nota Fiscal Number',
    'Billing Date',
    'Gross Weight',
    'Net Value (with PIS/Cofins)',
  ],
  [new Date(2026, 9, 27), 'BR03494A', 'SabBar', 120, 0, null, null, 10, 500],
];

describe('processCompras', () => {
  it('monta a base com 12322 + 218 + carteira e traduz o produto', () => {
    const r = processCompras({
      texto12322: `${linha12322}\n`,
      r218: [r218],
      carteira,
      produtos: [
        {
          codprod: '12042',
          ean: '7891024110126',
          descricao: 'SAB',
          un_por_caixa: 10,
          sku_colgate: 'BR03494A',
        },
      ],
    });
    expect(r.rows).toHaveLength(3);
    const item218 = r.rows.find((x) => x.origem === 'ERP_NOVO_218');
    expect(item218).toMatchObject({
      nota: '2951330',
      ean: '7891024110126',
      valor_item: 100,
      qtd_cx: 1,
    });
    const cart = r.rows.find((x) => x.origem === 'CARTEIRA');
    expect(cart).toMatchObject({
      situacao: 'PEDIDO_ABERTO',
      compoe_carteira_aberta: 1,
      codprod: '12042',
      qtd_un: 1200,
    });
  });
});
