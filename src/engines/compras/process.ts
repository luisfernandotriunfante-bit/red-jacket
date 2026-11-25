import { digits, key, num, text } from '../core/normalize';
import { Table } from '../core/table';
import {
  EngineBlockError,
  type AuditItem,
  type AuditRecord,
  type BaseRow,
  type Cell,
  type EngineResult,
  type Matrix,
} from '../core/types';
import { SPEC } from './spec';

export type ComprasInput = {
  /** 12322 (ERP antigo): texto do relatório. */
  texto12322: string;
  /** Relatórios 218 (ERP novo), em qualquer ordem: a ordem real vem da data de geração. */
  r218: Matrix[];
  /** Carteira de pedidos da indústria. */
  carteira: Matrix;
  /** Base do motor Produtos. */
  produtos: BaseRow[];
};

export const CNPJ_COLGATE = '00382468003375';
const MAX_RECORDS = 200;

// ---------------------------------------------------------------- utilidades
type Num = number | null;
const nz = (v: Num): number => v ?? 0;
const pad2 = (n: number) => String(n).padStart(2, '0');

/** Data (Date do Excel, DD/MM/AAAA ou AAAA-MM-DD) → AAAA-MM-DD. */
function isoDate(value: Cell): string | null {
  if (value === null) return null;
  if (value instanceof Date) {
    const d = new Date(value.getTime() + 12 * 3_600_000);
    return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
  }
  const t = text(value);
  const br = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(t);
  if (br) return `${br[3] ?? ''}-${br[2] ?? ''}-${br[1] ?? ''}`;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  return iso ? `${iso[1] ?? ''}-${iso[2] ?? ''}-${iso[3] ?? ''}` : null;
}

const lstripZeros = (s: string) => s.replace(/^0+/, '');
const str = (v: Cell): string | null => {
  const t = text(v);
  return t === '' ? null : t;
};
/** Texto de código vindo do Excel (inteiro vira "123", não "123.0"). */
const codeText = (v: Cell): string | null => {
  const t = str(v);
  if (t === null) return null;
  return /^-?\d+\.0+$/.test(t) ? (t.split('.')[0] ?? t) : t;
};
const ymd = (iso: string | null) => (iso ? iso.slice(0, 7) : null);
function daysBetween(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  const f = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1);
  };
  return Math.round((f(a) - f(b)) / 86_400_000);
}
const recs = (list: AuditRecord[]): AuditRecord[] | undefined =>
  list.length ? list.slice(0, MAX_RECORDS) : undefined;

// -------------------------------------------------------------------- 12322
type Nota12322 = {
  nota: string;
  dtEmissao: string;
  dtEntrada: string;
  cnpj: string;
  operacao: string;
  valor: number;
  serie: string;
  uf: string;
  classe: string;
};

function numBr(s: string): number {
  return Number(s.replace(/\./g, '').replace(',', '.'));
}
function dBr(s: string): string {
  const [d, m, a] = s.split('/');
  let year = Number(a);
  if (year < 100) year += 2000;
  return `${year}-${m ?? ''}-${d ?? ''}`;
}

export function read12322(texto: string): {
  rows: Nota12322[];
  total: { n: number; valor: number } | null;
  naoLidas: string[];
} {
  const lines = texto.split('\n');
  const pat =
    /^\s+(\d+) (\d\d\/\d\d\/\d\d) (\d\d\/\d\d\/\d\d)\s+(\d+)\s+(\S+)\s+(\S+) (\S+)\s+([\d.]+,\d\d)\s+([\d.]+,\d\d)\s+([\d.]+,\d\d) (\d+) (\w\w)\s*(.*?)\s*(\d+)\s*$/;
  const rows: Nota12322[] = [];
  const naoLidas: string[] = [];
  for (const l of lines) {
    if (!/^\s+\d+ \d\d\/\d\d\/\d\d \d\d\/\d\d\/\d\d/.test(l)) continue;
    const m = pat.exec(l);
    if (!m) {
      naoLidas.push(l.trim());
      continue;
    }
    const operacao = m[6] ?? '';
    rows.push({
      nota: m[1] ?? '',
      dtEmissao: dBr(m[2] ?? ''),
      dtEntrada: dBr(m[3] ?? ''),
      cnpj: (m[4] ?? '').padStart(14, '0'),
      operacao,
      valor: numBr(m[8] ?? '0'),
      serie: m[11] ?? '',
      uf: m[12] ?? '',
      classe:
        operacao === '212.01'
          ? 'COMPRA_MERCADORIA'
          : operacao === '299.40'
            ? 'MATERIAL_ALMOXARIFADO'
            : 'OUTRA',
    });
  }
  let total: { n: number; valor: number } | null = null;
  for (const l of lines) {
    const m = /^\s+Totais\.+\s+(\d+)\s+([\d.]+,\d\d)/.exec(l);
    if (m) total = { n: Number(m[1]), valor: numBr(m[2] ?? '0') };
  }
  return { rows, total, naoLidas };
}

// ---------------------------------------------------------------------- 218
type Nota218 = {
  dtEntrada: string | null;
  trans: string | null;
  nota: string;
  serie: string | null;
  dtEmissao: string | null;
  uf: string | null;
  vlTotal: number | null;
  cnpj: string;
};
type Item218 = {
  trans: string | null;
  nota: string;
  codprod: string | null;
  qt: Num;
  pUnit: Num;
  custoAnt: Num;
  custoAtual: Num;
};
type Cp218 = {
  nota: string;
  nrLanc: string | null;
  dtVenc: string | null;
  prazo: Num;
  valor: Num;
};
type Parte218 = {
  notas: Nota218[];
  itens: Item218[];
  cp: Cp218[];
  ini: string;
  fim: string;
  gen: number;
  listadas: number | null;
  total: number | null;
};

function read218(x: Matrix, ordem: number): Parte218 {
  const notas: Nota218[] = [];
  const itens: Item218[] = [];
  const cp: Cp218[] = [];
  let cur: Nota218 | null = null;
  let mode: 'n' | 'i' | 'c' | null = null;
  let hm = new Map<string, number>();
  let others = new Set<number>();
  let listadas: number | null = null;
  let total: number | null = null;

  const headerMap = (r: Cell[]) => {
    const m = new Map<string, number>();
    r.forEach((v, k) => {
      if (v !== null && text(v) !== '') m.set(text(v), k);
    });
    return m;
  };
  for (const r of x) {
    const s = (k: number): Cell => (k >= r.length ? null : (r[k] ?? null));
    const setHeader = (m: 'n' | 'i' | 'c') => {
      mode = m;
      hm = headerMap(r);
      others = new Set(hm.values());
    };
    if (s(0) === 'Dt. Entrada') {
      setHeader('n');
      continue;
    }
    if (s(4) === 'Código' && s(5) === 'Produto') {
      setHeader('i');
      continue;
    }
    if (s(4) === 'C.Pagar:') {
      setHeader('c');
      continue;
    }
    // Título achado pelo nome; tolera a coluna deslocada em 1 (para a esquerda ou direita).
    const P = (label: string): Cell => {
      const k = hm.get(label);
      if (k === undefined) return null;
      for (const c of [k, k - 1, k + 1]) {
        if (c < 0 || c >= r.length) continue;
        if (c !== k && others.has(c)) continue;
        if (r[c] !== null && r[c] !== undefined) return r[c] ?? null;
      }
      return null;
    };
    if (mode === 'n' && s(0) !== null) {
      cur = {
        dtEntrada: isoDate(P('Dt. Entrada')),
        trans: codeText(P('Nº Trans. Ent.')),
        nota: text(P('Nota Fiscal')),
        serie: codeText(P('Série')),
        dtEmissao: isoDate(P('Dt. Emissão')),
        uf: str(P('UF')),
        vlTotal: num(P('Vl. Total')),
        cnpj: (digits(P('CGC')) || text(P('CGC'))).padStart(14, '0'),
      };
      notas.push(cur);
      mode = null;
      continue;
    }
    if (mode === 'i' && s(4) !== null) {
      itens.push({
        trans: cur?.trans ?? null,
        nota: cur?.nota ?? '',
        codprod: codeText(P('Código')),
        qt: num(P('Qt.')),
        pUnit: num(P('P.Unit.')),
        custoAnt: num(P('Custo Fin.Ant.')),
        custoAtual: num(P('Custo Fin.Atual')),
      });
      continue;
    }
    if (mode === 'c' && s(6) !== null && s(6) !== 'Nr. Lanc.') {
      cp.push({
        nota: cur?.nota ?? '',
        nrLanc: codeText(P('Nr. Lanc.')),
        dtVenc: isoDate(P('Dt Venc')),
        prazo: num(P('Prazo')),
        valor: num(s(14)),
      });
    }
    if (text(s(1)) === 'Notas Listadas') {
      listadas = num(s(0));
      total = num(s(21));
    }
  }

  // período do relatório (primeira linha de cabeçalho com duas datas)
  let ini = '';
  let fim = '';
  for (const r of x.slice(0, 12)) {
    const datas = r
      .filter(
        (v): v is string =>
          typeof v === 'string' && /^\d\d\/\d\d\/\d{4}/.test(v),
      )
      .map((v) => isoDate(v) ?? '');
    if (datas.length >= 2) {
      ini = datas[0] ?? '';
      fim = datas[1] ?? '';
      break;
    }
  }
  if (!ini)
    throw new EngineBlockError('218: período do relatório não encontrado');
  // data de geração: primeira data/hora da primeira linha (ordena os arquivos)
  let gen = ordem;
  for (const v of x[0] ?? []) {
    if (v instanceof Date) {
      gen = v.getTime();
      break;
    }
  }
  return { notas, itens, cp, ini, fim, gen, listadas, total };
}

// ------------------------------------------------------------------ carteira
type CarteiraRow = {
  material: string;
  desc: string | null;
  pedido: string | null;
  orderDate: string | null;
  dtFat: string | null;
  nf: string | null;
  qtdPedida: Num;
  qtdFat: Num;
  pesoBruto: Num;
  valLiq: Num;
  codprod: string | null;
  via: string | null;
};

function readCarteira(matrix: Matrix): CarteiraRow[] {
  const t = Table.fromMatrix(matrix, ['Order Date', 'Material', 'Bill Qty']);
  for (const n of ['Order Date', 'Material', 'Bill Qty', 'Order Qty'])
    t.pos(n, true);
  const liqPos = t.headers.findIndex(
    (h) => key(h).startsWith('netvalue') && h.toUpperCase().includes('PIS'),
  );
  if (liqPos < 0) {
    throw new EngineBlockError(
      'carteira: coluna Net Value (com PIS/Cofins) não encontrada',
    );
  }
  return t.rows.map((r) => {
    const nf0 = str(t.get(r, 'Nota Fiscal Number'));
    const nf =
      nf0 === null ? null : lstripZeros(nf0.replace(/-\d+$/, '')) || null;
    return {
      material: lstripZeros(text(t.get(r, 'Material'))),
      desc: str(t.get(r, 'Description')),
      pedido: codeText(t.get(r, 'Order Number')),
      orderDate: isoDate(t.get(r, 'Order Date')),
      dtFat: isoDate(t.get(r, 'Billing Date')),
      nf,
      qtdPedida: num(t.get(r, 'Order Qty')),
      qtdFat: num(t.get(r, 'Bill Qty')),
      pesoBruto: num(t.get(r, 'Gross Weight')),
      valLiq: num(t.at(r, liqPos)),
      codprod: null,
      via: null,
    };
  });
}

// ---------------------------------------------------------------- processo
type Linha = Record<string, string | number | null>;

export function processCompras(input: ComprasInput): EngineResult {
  const audit: AuditItem[] = [];
  const add = (a: AuditItem) => audit.push(a);

  // ===== 12322 (ERP antigo, nota)
  const o = read12322(input.texto12322);
  if (o.naoLidas.length)
    add({
      code: 'C00',
      severity: 'ERRO',
      message: '12322: linhas de nota que não foram lidas',
      count: o.naoLidas.length,
      records: recs(o.naoLidas.map((l) => ({ key: l.slice(0, 60) }))),
    });
  if (!o.rows.length) throw new EngineBlockError('12322: nenhuma nota lida');
  if (o.total) {
    const soma = o.rows.reduce((a, r) => a + r.valor, 0);
    if (o.total.n !== o.rows.length || Math.abs(o.total.valor - soma) > 0.01)
      add({
        code: 'C01',
        severity: 'ERRO',
        message: '12322: notas lidas diferentes do total do relatório',
        count: 1,
        records: [
          {
            key: '12322',
            info: `lidas ${o.rows.length} (R$ ${soma.toFixed(2)}) × relatório ${o.total.n} (R$ ${o.total.valor.toFixed(2)})`,
          },
        ],
      });
    else
      add({
        code: 'C01',
        severity: 'INFO',
        message: '12322: notas lidas iguais ao total do relatório',
        count: o.rows.length,
      });
  }
  const almox = o.rows.filter((r) => r.classe === 'MATERIAL_ALMOXARIFADO');
  add({
    code: 'C02',
    severity: 'INFO',
    message:
      '12322: operações 212.01 (compra de mercadoria) e 299.40 (material de almoxarifado, não compõe compra)',
    count: almox.length,
  });
  const outroForn12 = o.rows.filter((r) => r.cnpj !== CNPJ_COLGATE).length;
  add({
    code: 'C06b-12322',
    severity: 'INFO',
    message: 'Notas descartadas por CNPJ diferente da Colgate (12322)',
    count: outroForn12,
  });
  let a = o.rows.filter((r) => r.cnpj === CNPJ_COLGATE);

  // ===== 218 (ERP novo, item)
  if (!input.r218.length)
    throw new EngineBlockError('218: nenhum arquivo enviado');
  const partes = input.r218
    .map((m, i) => read218(m, i))
    .sort((p, q) => p.gen - q.gen);
  for (const [k, p] of partes.entries()) {
    const somaNotas = p.notas.reduce((s, n) => s + nz(n.vlTotal), 0);
    const diverge =
      (p.listadas !== null && p.listadas !== p.notas.length) ||
      (p.total !== null && Math.abs(p.total - somaNotas) > 0.01);
    add({
      code: 'C04',
      severity: diverge ? 'ERRO' : 'INFO',
      message: diverge
        ? '218: notas lidas diferentes do rodapé do relatório'
        : '218: arquivo lido e conferido com o rodapé',
      count: p.notas.length,
      records: [
        {
          key: `arquivo ${k + 1}`,
          info: `período ${p.ini} a ${p.fim}; notas ${p.notas.length}; soma R$ ${somaNotas.toFixed(2)}; rodapé ${String(p.listadas)} notas, R$ ${String(p.total)}`,
        },
      ],
    });
  }
  // notas do arquivo mais antigo cuja entrada é >= início do período do mais novo são substituídas
  type NotaK = Nota218 & { arq: number };
  let N: NotaK[] = partes.flatMap((p, k) =>
    p.notas.map((n) => ({ ...n, arq: k })),
  );
  const mantida = N.map(() => true);
  partes.forEach((pt, k) => {
    N.forEach((n, i) => {
      for (let j = 0; j < k; j += 1)
        if (n.arq === j && n.dtEntrada !== null && n.dtEntrada >= pt.ini)
          mantida[i] = false;
    });
  });
  const substituidas = N.filter((_, i) => !mantida[i]);
  add({
    code: 'C05',
    severity: 'INFO',
    message:
      '218: notas do arquivo mais antigo substituídas pelo mais novo (período repetido)',
    count: substituidas.length,
  });
  N = N.filter((_, i) => mantida[i]);
  const stripStar = (s: string) => s.replace(/^\*+/, '');
  const outroForn218 = N.filter((n) => n.cnpj !== CNPJ_COLGATE).length;
  add({
    code: 'C06b-218',
    severity: 'INFO',
    message: 'Notas descartadas por CNPJ diferente da Colgate (218)',
    count: outroForn218,
  });
  N = N.filter((n) => n.cnpj === CNPJ_COLGATE);

  type CpAgg = {
    nrLanc: string | null;
    dtVenc: string | null;
    prazo: Num;
    n: number;
    valor: number;
  };
  const cpAgg = new Map<string, CpAgg>();
  partes.forEach((p, k) => {
    for (const c of p.cp) {
      const kk = `${k}|${stripStar(c.nota)}`;
      const cur = cpAgg.get(kk);
      if (cur) {
        if (c.nrLanc !== null) cur.n += 1;
        cur.valor += nz(c.valor);
      } else
        cpAgg.set(kk, {
          nrLanc: c.nrLanc,
          dtVenc: c.dtVenc,
          prazo: c.prazo,
          n: c.nrLanc !== null ? 1 : 0,
          valor: nz(c.valor),
        });
    }
  });
  const notasPorChave = new Map<string, NotaK[]>();
  for (const n of N) {
    const kk = `${n.arq}|${stripStar(n.nota)}`;
    const l = notasPorChave.get(kk);
    if (l) l.push(n);
    else notasPorChave.set(kk, [n]);
  }

  // produtos (chave: codprod sem zeros à esquerda)
  const prodPorCod = new Map<string, BaseRow>();
  for (const p of input.produtos) {
    const c =
      p.codprod === null || p.codprod === undefined
        ? ''
        : lstripZeros(String(p.codprod));
    if (c && !prodPorCod.has(c)) prodPorCod.set(c, p);
  }
  const prStr = (p: BaseRow | undefined, col: string): string | null => {
    const v = p?.[col];
    return v === null || v === undefined ? null : String(v);
  };
  const prNum = (p: BaseRow | undefined, col: string): Num => {
    const v = p?.[col];
    return typeof v === 'number' ? v : null;
  };
  const eanOf = (p: BaseRow | undefined): string | null => {
    const e = prStr(p, 'ean');
    return e === null ? null : lstripZeros(e) || null;
  };

  type ItemB = {
    nota: string;
    serie: string | null;
    trans: string | null;
    dtEntrada: string | null;
    dtEmissao: string | null;
    uf: string | null;
    codprod: string;
    qtdUn: number;
    pUnit: number;
    valorItem: number;
    valor: number;
    custoAnt: Num;
    custoAtual: Num;
    nrLanc: string | null;
    dtVenc: string | null;
    prazoPag: Num;
  };
  const B: ItemB[] = [];
  partes.forEach((p, k) => {
    for (const it of p.itens) {
      const notas = notasPorChave.get(`${k}|${stripStar(it.nota)}`) ?? [];
      for (const n of notas) {
        const cpa = cpAgg.get(`${k}|${stripStar(it.nota)}`);
        const qtd = nz(it.qt);
        const pu = nz(it.pUnit);
        B.push({
          nota: stripStar(it.nota),
          serie: n.serie,
          trans: n.trans,
          dtEntrada: n.dtEntrada,
          dtEmissao: n.dtEmissao,
          uf: n.uf,
          codprod: lstripZeros(it.codprod ?? ''),
          qtdUn: qtd,
          pUnit: pu,
          valorItem: qtd * pu,
          valor: nz(n.vlTotal),
          custoAnt: it.custoAnt,
          custoAtual: it.custoAtual,
          nrLanc: cpa?.nrLanc ?? null,
          dtVenc: cpa?.dtVenc ?? null,
          prazoPag: cpa?.prazo ?? null,
        });
      }
    }
  });
  if (!B.length)
    throw new EngineBlockError('218: nenhum item de nota da Colgate lido');

  // conferência: soma qtd × preço dos itens = valor da nota
  const somaPorNota = new Map<string, { item: number; nota: number }>();
  for (const b of B) {
    const cur = somaPorNota.get(b.nota);
    if (cur) cur.item += b.valorItem;
    else somaPorNota.set(b.nota, { item: b.valorItem, nota: b.valor });
  }
  const divItens = [...somaPorNota].filter(
    ([, v]) => Math.abs(v.item - v.nota) > 0.01,
  );
  add({
    code: 'C07',
    severity: divItens.length ? 'AVISO' : 'INFO',
    message:
      '218: soma de quantidade × preço dos itens diferente do valor da nota',
    count: divItens.length,
    records: recs(
      divItens.map(([n, v]) => ({
        key: n,
        info: `itens R$ ${v.item.toFixed(2)} × nota R$ ${v.nota.toFixed(2)}`,
      })),
    ),
  });

  // nota nos dois ERPs: o 218 prevalece
  const notas218 = new Set(B.map((b) => b.nota));
  const dup = a.filter((r) => notas218.has(r.nota));
  add({
    code: 'C06',
    severity: 'INFO',
    message: 'Notas presentes nos dois ERPs (218 prevalece)',
    count: dup.length,
  });
  a = a.filter((r) => !notas218.has(r.nota));

  const semProduto = B.filter((b) => !prodPorCod.has(b.codprod));
  add({
    code: 'C08',
    severity: semProduto.length ? 'AVISO' : 'INFO',
    message: '218: itens com produto sem correspondência no motor Produtos',
    count: semProduto.length,
    records: recs(
      [...new Set(semProduto.map((b) => b.codprod))].map((k) => ({ key: k })),
    ),
  });

  // ===== carteira
  const c = readCarteira(input.carteira);
  const skuPorCod = new Map<string, string>();
  for (const p of input.produtos) {
    const sku = prStr(p, 'sku_colgate');
    if (sku === null || p.codprod === null || p.codprod === undefined) continue;
    const kk = lstripZeros(sku);
    if (!skuPorCod.has(kk)) skuPorCod.set(kk, String(p.codprod));
  }
  for (const r of c) {
    const cod = skuPorCod.get(r.material);
    if (cod !== undefined) {
      r.codprod = cod;
      r.via = 'SKU_PRODUTOS';
    }
  }
  const ucx = (cod: string): Num =>
    prNum(prodPorCod.get(lstripZeros(cod)), 'un_por_caixa');
  const learn = new Map<string, string>();
  const bPorNota = new Map<string, ItemB[]>();
  for (const b of B) {
    const l = bPorNota.get(b.nota);
    if (l) l.push(b);
    else bPorNota.set(b.nota, [b]);
  }
  for (const r of c.filter((x) => x.nf !== null && x.codprod === null)) {
    const ok = (bPorNota.get(r.nf ?? '') ?? []).filter((b) => {
      const u = ucx(b.codprod);
      return u !== null && Math.abs(b.qtdUn - nz(r.qtdFat) * u) < 1e-6;
    });
    if (ok.length === 1 && ok[0]) {
      r.codprod = ok[0].codprod;
      r.via = 'NOTA_E_QUANTIDADE';
      learn.set(r.material, ok[0].codprod);
    }
  }
  for (const r of c) {
    const l = learn.get(r.material);
    if (r.codprod === null && l !== undefined) {
      r.codprod = l;
      r.via = 'APRENDIDO_OUTRA_LINHA';
    }
  }

  // ===== base final: 12322, 218, carteira
  const rows: Linha[] = [];
  const empty = (): Linha =>
    Object.fromEntries(SPEC.map((s) => [s.name, null]));
  for (const r of a) {
    rows.push({
      ...empty(),
      origem: 'ERP_ANTIGO_12322',
      grao: 'NOTA',
      situacao: 'ENTRADA_REGISTRADA',
      classe: r.classe,
      compoe_compra_recebida: r.classe === 'COMPRA_MERCADORIA' ? 1 : 0,
      compoe_carteira_aberta: 0,
      nota: lstripZeros(r.nota),
      serie: r.serie,
      operacao: r.operacao,
      dt_entrada: r.dtEntrada,
      dt_emissao: r.dtEmissao,
      cnpj_forn: r.cnpj,
      uf_origem: r.uf,
      valor_nota: r.valor,
      valor_item: r.valor,
    });
  }
  for (const b of B) {
    const p = prodPorCod.get(b.codprod);
    rows.push({
      ...empty(),
      origem: 'ERP_NOVO_218',
      grao: 'ITEM',
      situacao: 'ENTRADA_REGISTRADA',
      classe: 'COMPRA_MERCADORIA',
      compoe_compra_recebida: 1,
      compoe_carteira_aberta: 0,
      nota: b.nota,
      serie: b.serie,
      operacao: 'E',
      trans_entrada: b.trans,
      dt_entrada: b.dtEntrada,
      dt_emissao: b.dtEmissao,
      cnpj_forn: CNPJ_COLGATE,
      uf_origem: b.uf,
      codprod: b.codprod,
      ean: eanOf(p),
      descricao: prStr(p, 'descricao'),
      un_por_caixa: prNum(p, 'un_por_caixa'),
      categoria_ind: prStr(p, 'ind_categoria'),
      marca_ind: prStr(p, 'ind_marca'),
      qtd_un: b.qtdUn,
      valor_nota: b.valor,
      valor_item: b.valorItem,
      p_unit: b.pUnit,
      custo_fin_ant: b.custoAnt,
      custo_fin_atual: b.custoAtual,
      nr_lanc: b.nrLanc,
      dt_vencimento: b.dtVenc,
      prazo_pagamento: b.prazoPag,
    });
  }
  const entradaPorNota = new Map<string, string | null>();
  for (const b of B)
    if (!entradaPorNota.has(b.nota)) entradaPorNota.set(b.nota, b.dtEntrada);
  const notasNoErpNovo = new Set(B.map((b) => b.nota));
  for (const r of c) {
    const fat = nz(r.qtdFat) > 0;
    const p = r.codprod ? prodPorCod.get(lstripZeros(r.codprod)) : undefined;
    const u = r.codprod ? prNum(p, 'un_por_caixa') : null;
    const qtdCx = fat ? r.qtdFat : r.qtdPedida;
    const dtEnt = r.nf ? (entradaPorNota.get(r.nf) ?? null) : null;
    rows.push({
      ...empty(),
      origem: 'CARTEIRA',
      grao: 'ITEM',
      situacao: fat ? 'PEDIDO_FATURADO' : 'PEDIDO_ABERTO',
      classe: 'PEDIDO_COLGATE',
      compoe_compra_recebida: 0,
      compoe_carteira_aberta: fat ? 0 : 1,
      nota: r.nf,
      pedido_ind: r.pedido,
      dt_pedido: r.orderDate,
      dt_faturamento_ind: r.dtFat,
      cnpj_forn: CNPJ_COLGATE,
      material_ind: r.material,
      desc_material_ind: r.desc,
      produto_via: r.via,
      codprod: r.codprod,
      ean: r.codprod ? eanOf(p) : null,
      descricao: r.codprod ? prStr(p, 'descricao') : null,
      un_por_caixa: u,
      categoria_ind: r.codprod ? prStr(p, 'ind_categoria') : null,
      marca_ind: r.codprod ? prStr(p, 'ind_marca') : null,
      qtd_pedida_cx: r.qtdPedida,
      qtd_faturada_cx: r.qtdFat,
      qtd_cx: qtdCx,
      qtd_un: qtdCx !== null && u !== null ? qtdCx * u : null,
      valor_item: r.valLiq,
      peso_bruto: r.pesoBruto,
      nf_na_entrada: fat
        ? r.nf !== null && notasNoErpNovo.has(r.nf)
          ? 1
          : 0
        : null,
      dt_entrada_da_nf: dtEnt,
      dias_fat_ate_entrada: daysBetween(dtEnt, r.dtFat),
    });
  }
  for (const row of rows) {
    if (row.origem !== 'CARTEIRA') {
      const qtd = row.qtd_un as Num;
      const u = row.un_por_caixa as Num;
      row.qtd_cx = qtd !== null && u ? qtd / u : null;
    }
    row.ano_mes_entrada = ymd(row.dt_entrada as string | null);
    row.ano_mes_emissao = ymd(row.dt_emissao as string | null);
    row.fornecedor = 'COLGATE PALMOLIVE';
  }

  // ===== auditoria da carteira e dos totais
  const ct = rows.filter((r) => r.origem === 'CARTEIRA');
  const abertas = ct.filter((r) => r.situacao === 'PEDIDO_ABERTO');
  const faturadas = ct.filter((r) => r.situacao === 'PEDIDO_FATURADO');
  const diasList = ct
    .map((r) => r.dias_fat_ate_entrada)
    .filter((v): v is number => typeof v === 'number');
  add({
    code: 'C09',
    severity: 'INFO',
    message: `Carteira: linhas faturadas com nota já na entrada do ERP novo (prazo médio faturamento→entrada ${diasList.length ? (diasList.reduce((s, v) => s + v, 0) / diasList.length).toFixed(1) : '?'} dias)`,
    count: faturadas.filter((r) => r.nf_na_entrada === 1).length,
  });
  for (const [code, via, msg] of [
    [
      'C10',
      'SKU_PRODUTOS',
      'Carteira: material identificado pelo SKU da Colgate em Produtos',
    ],
    [
      'C11',
      'NOTA_E_QUANTIDADE',
      'Carteira: material identificado pela nota + quantidade (caixas × un/cx = unidades da nota)',
    ],
    [
      'C12',
      'APRENDIDO_OUTRA_LINHA',
      'Carteira: material identificado por já ter sido aprendido em outra linha',
    ],
  ] as const)
    add({
      code,
      severity: 'INFO',
      message: msg,
      count: ct.filter((r) => r.produto_via === via).length,
    });
  const semProd = ct.filter((r) => r.codprod === null);
  if (semProd.length)
    add({
      code: 'C13',
      severity: 'AVISO',
      message: 'Carteira: linhas sem produto identificado',
      count: semProd.length,
      records: recs(
        [...new Set(semProd.map((r) => String(r.material_ind)))].map((k) => ({
          key: k,
          info: 'material sem produto correspondente',
        })),
      ),
    });
  add({
    code: 'C14',
    severity: 'INFO',
    message: 'Carteira aberta: pedidos ainda não faturados',
    count: abertas.length,
  });
  add({
    code: 'C15',
    severity: 'INFO',
    message: 'Linhas na base de Compras',
    count: rows.length,
  });
  return {
    engine: 'compras-industria',
    columns: SPEC,
    rows: rows,
    audit,
  };
}
