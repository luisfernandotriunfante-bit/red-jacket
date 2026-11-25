import {
  EngineBlockError,
  type AuditItem,
  type BaseRow,
  type BaseValue,
  type Cell,
  type AuditRecord,
  type ColumnSpec,
  type EngineResult,
  type Matrix,
} from '../core/types';
import {
  code,
  digits,
  ean,
  key,
  num,
  resolveEan,
  text,
  unaccent,
  zeroToNull,
} from '../core/normalize';
import { Table } from '../core/table';
import {
  ALIAS_CANAL,
  ARQUIVOS,
  CANAL_MARKER,
  LISTA_MAP,
  PESOS,
  SPEC,
  TEXTO_LISTA,
} from './spec';

export type ProdutosInput = {
  /** 286: cadastro de itens (ERP atual). */
  itens286: Matrix;
  /** 322: texto do relatório do ERP antigo. */
  texto322: string;
  /** 8013: relatório logístico. */
  logistico8013: Matrix;
  /** Lista de preço da indústria, aba "data". */
  listaPreco: Matrix;
  /** 8011: preço final ao cliente. */
  precos8011: Matrix;
  /** Sortimento, aba Base_Sortimento_Nacional. */
  sortimento: Matrix;
};

type Item322 = { item: string; conv: string };
const ROW_322 =
  /^(\d{8})\s+(.*?)\.*\s*(\d\dX\s?[\d.]+[A-Z]+)\s+(\d{3})\s+([\d,]+)\s+(Sim|Nao)\s+(Sim|Nao)\s+([\d,]+)\s+(\d{4})\s+(\d{4})\s+([\d,.]+)\s+([\d,.]+)\s+([\d,]+)\s+(\S+)\s+(\S+)\s+(\d+)\s+(Sim|Nao)\s+(\d+)\s+(\d+)\s+(SIM|NAO)\s+(\d+)\s+(\d+)\s*$/;

/** 322: uma linha por item; devolve código antigo, conversão e EAN. */
export function read322(
  content: string,
): { item: string; conv: string; ean: string }[] {
  const rows: { item: string; conv: string; ean: string }[] = [];
  for (const line of content.split(/\r?\n/)) {
    const m = ROW_322.exec(line.trimEnd());
    if (m) rows.push({ item: m[1] ?? '', conv: m[10] ?? '', ean: m[16] ?? '' });
  }
  return rows;
}

function dateToYearMonth(value: Date): string {
  // meio-dia evita virada de mês por fuso horário
  const d = new Date(value.getTime() + 12 * 3_600_000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function slug(value: string): string {
  return unaccent(value.toLowerCase().replace('&', 'e'))
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function unitsFromBoxWeight(box: number, unit: number): number | null {
  if (!box || !unit) return null;
  const r = box / unit;
  return r >= 1 && Math.abs(r - Math.round(r)) < 0.05 ? Math.round(r) : null;
}

function firstTruthy(values: (number | null)[]): number | null {
  for (const v of values) if (v) return v;
  return null;
}

function addToList<T>(map: Map<string, T[]>, k: string, value: T): void {
  const list = map.get(k);
  if (list) list.push(value);
  else map.set(k, [value]);
}

export function processProdutos(input: ProdutosInput): EngineResult {
  const audit: AuditItem[] = [];
  const addAudit = (
    code: string,
    severity: AuditItem['severity'],
    message: string,
    count?: number,
    records?: AuditRecord[],
  ) => audit.push({ code, severity, message, count, records });

  // ---------- 286 ----------
  const t286Raw = Table.fromMatrix(input.itens286, [
    'Código',
    'Cód. Barras',
    'Custo real',
  ]);
  for (const n of [
    'Código',
    'Cód. Barras',
    'Descrição',
    'Estoque',
    'Custo real',
  ])
    t286Raw.pos(n, true);
  const posCodigo = t286Raw.pos('Código');
  const posDescricao = t286Raw.pos('Descrição');
  const footer = t286Raw.rows.find(
    (r) => text(t286Raw.at(r, posCodigo)) === '',
  );
  const totalRodape = footer ? num(t286Raw.at(footer, posDescricao)) : null;
  const t286 = t286Raw.withRows(
    t286Raw.rows.filter((r) => text(t286Raw.at(r, posCodigo)) !== ''),
  );
  const rows286 = t286.rows;
  const eans = rows286.map((r) => ean(t286.get(r, 'Cód. Barras')));
  if (eans.includes('') || new Set(eans).size !== eans.length) {
    throw new EngineBlockError('EAN vazio ou repetido no 286');
  }
  if (totalRodape !== null && totalRodape !== rows286.length) {
    throw new EngineBlockError(
      `linhas do 286 (${rows286.length}) diferentes do total do rodapé (${totalRodape})`,
    );
  }
  const known = new Set(eans);
  const cps = rows286.map((r) => code(t286.get(r, 'Código')));
  const fabs = rows286.map((r) => code(t286.get(r, 'Cód. Fabricante')));

  // ---------- 322 ----------
  const rows322 = read322(input.texto322);
  const a322 = new Map<string, Item322[]>();
  for (const r of rows322) {
    addToList(a322, resolveEan(r.ean, known), { item: r.item, conv: r.conv });
  }

  // ---------- 8013 ----------
  const t13 = Table.fromMatrix(input.logistico8013, ['SUB BRANDS']);
  const pEan13 = t13.posStarting('codigodoprodutoean');
  const pDun13 = t13.posStarting('codigodoprodutodun');
  if (pEan13 === undefined) {
    throw new EngineBlockError(
      'coluna obrigatória ausente no 8013: código do produto (EAN13)',
    );
  }
  const ean13 = t13.rows.map((r) => resolveEan(t13.at(r, pEan13), known));
  const l13 = new Map<string, Cell[]>();
  let dup13 = 0;
  t13.rows.forEach((r, i) => {
    const e = ean13[i] ?? '';
    if (l13.has(e)) dup13 += 1;
    l13.set(e, r);
  });
  if (dup13)
    addAudit('P08', 'AVISO', '8013: EAN repetido (vale a última linha)', dup13);

  // ---------- lista de preço da indústria ----------
  const tl = Table.fromMatrix(input.listaPreco, ['SKU', 'PRECO BASE']);
  const listaRows = tl.rows.map((row) => ({
    row,
    ean: resolveEan(tl.get(row, 'EAN'), known),
    cp: code(tl.get(row, 'WINTHOR')),
    sku: code(tl.get(row, 'SKU')),
  }));
  const listaPorEan = new Map<string, number[]>();
  const listaPorCp = new Map<string, number[]>();
  listaRows.forEach((l, i) => {
    addToList(listaPorEan, l.ean, i);
    if (l.cp) addToList(listaPorCp, l.cp, i);
  });

  // ---------- 8011 ----------
  const t11All = Table.fromMatrix(input.precos8011, ['CODPROD', 'PRECO']);
  const keep11 = t11All.rows.filter(
    (r) =>
      code(t11All.get(r, 'CODFILIALNF')) === '11' &&
      text(t11All.get(r, 'UFDESTINO')).toUpperCase() === 'MS',
  );
  if (keep11.length !== t11All.rows.length) {
    addAudit(
      'P09',
      'AVISO',
      '8011: linhas fora de filial 11 / UF MS ignoradas',
      t11All.rows.length - keep11.length,
    );
  }
  const t11 = t11All.withRows(keep11);
  const p11 = new Map<string, Cell[]>();
  for (const r of t11.rows) p11.set(code(t11.get(r, 'CODPROD')), r);

  // ---------- sortimento ----------
  const ts = Table.fromMatrix(input.sortimento, ['STATUS', 'COD', 'EAN']);
  const startCanais = ts.headers.map(key).indexOf('descricao') + 1;
  const canais: { orig: string; pos: number; nome: string }[] = [];
  ts.headers.forEach((h, pos) => {
    if (pos < startCanais || h.startsWith('_sem_titulo_')) return;
    const values = new Set<number | null>();
    for (const r of ts.rows) {
      const c = r[pos];
      if (c !== null && c !== undefined) values.add(num(c));
    }
    if (
      values.size &&
      [...values].every((v) => v !== null && [0, 1, 2, 5].includes(v))
    ) {
      canais.push({
        orig: h,
        pos,
        nome: ALIAS_CANAL[key(h)] ?? `sort_${slug(h)}`,
      });
    }
  });
  const eanSort = ts.rows.map((r) => resolveEan(ts.get(r, 'EAN'), known));
  const sdic = new Map<string, Cell[]>();
  let dupSort = 0;
  ts.rows.forEach((r, i) => {
    const e = eanSort[i] ?? '';
    if (sdic.has(e)) dupSort += 1;
    sdic.set(e, r);
  });
  if (dupSort)
    addAudit(
      'P10',
      'AVISO',
      'Sortimento: EAN repetido (vale a última linha)',
      dupSort,
    );

  // ---------- colunas de saída ----------
  const columns: ColumnSpec[] = [];
  for (const c of SPEC) {
    if (c.group === CANAL_MARKER) {
      for (const canal of canais) {
        columns.push({
          group: 'Sortimento por canal',
          name: canal.nome,
          source: `Sortimento: ${canal.orig} (0, 1 ou 2; 5 vira 1)`,
        });
      }
    } else columns.push(c);
  }
  const nomes = columns.map((c) => c.name);

  const chk = {
    listaEanCpDif: 0,
    skuSemEscolha: 0,
    skuMulti: 0,
    unDifLista: 0,
    unDif8013: 0,
    ean8011Dif: 0,
    nLista: 0,
    n8013: 0,
    n322: 0,
    n8011: 0,
    nSort: 0,
    sortCinco: 0,
    sortInvalido: 0,
    custoZeroAtivo: 0,
    estNeg: 0,
  };

  const NOMES_286 = {
    custo: [
      ['custo_real', 'Custo real'],
      ['custo_fin', 'Custo fin.'],
      ['custo_contabil', 'Custo contábil'],
      ['custo_ult_ent', 'Custo ult. ent.'],
      ['custo_rep', 'Custo rep.'],
      ['vl_ult_entrada', 'Vl. ult. entrada'],
      ['est_total', 'Estoque'],
      ['est_reservado', 'Reservado'],
      ['est_avariado', 'Qt.Avaria'],
      ['est_bloqueado', 'Bloqueado(Qt.Bloq.-Qt.Avaria)'],
      ['est_disponivel', 'Disponível'],
      ['qtd_pedida', 'Qtde Pedida'],
      ['qtd_pendente', 'Qt. Pendente'],
      ['est_dia', 'Est. dia'],
      ['giro_dia', 'Giro dia'],
      ['venda_mes', 'Venda Mês'],
      ['venda_mes_1', 'Venda Mês 1'],
      ['venda_mes_2', 'Venda Mês 2'],
      ['venda_mes_3', 'Venda Mês 3'],
    ],
  } as const;

  const rows: BaseRow[] = [];
  rows286.forEach((r286, i) => {
    const e = eans[i] ?? '';
    const cp = cps[i] ?? '';
    const fab = fabs[i] ?? '';
    const row: BaseRow = {};
    for (const n of nomes) row[n] = null;
    const g286 = (name: string) => t286.get(r286, name);

    // lista: casa por EAN, senão por WINTHOR; escolhe pelo SKU = Cód. Fabricante
    const cand = listaPorEan.get(e) ?? listaPorCp.get(cp) ?? [];
    let L: (typeof listaRows)[number] | undefined;
    if (cand.length) {
      if (cand.length > 1) chk.skuMulti += 1;
      const sel = cand.filter((j) => listaRows[j]?.sku === fab);
      if (sel.length >= 1) L = listaRows[sel[0] ?? 0];
      else if (cand.length === 1) L = listaRows[cand[0] ?? 0];
      else chk.skuSemEscolha += 1;
    }
    if (L) {
      chk.nLista += 1;
      if (L.cp && L.cp !== cp) chk.listaEanCpDif += 1;
    }
    const g13 = l13.get(e);
    const s = sdic.get(e);
    const m11 = p11.get(cp);
    const a3 = a322.get(e);
    if (g13) chk.n8013 += 1;
    if (s) chk.nSort += 1;
    if (m11) {
      chk.n8011 += 1;
      if (resolveEan(t11.get(m11, 'EAN'), known) !== e) chk.ean8011Dif += 1;
    }
    if (a3) chk.n322 += 1;

    const LV = (nome: string, asText = false): BaseValue => {
      if (!L) return null;
      const v = tl.get(L.row, nome);
      if (asText) {
        if (v instanceof Date) return dateToYearMonth(v);
        return text(v) || null;
      }
      return num(v);
    };

    row.ean = e;
    row.codprod = cp;
    row.descricao = text(g286('Descrição'));
    row.sku_colgate = L?.sku ? L.sku : null;
    row.cod_fabricante_286 = fab || null;

    let dun: string | null = null;
    if (g13) dun = digits(t13.at(g13, pDun13)) || null;
    if (!dun && L) dun = digits(tl.get(L.row, 'DUN 14')) || null;
    if (!dun && m11) dun = digits(t11.get(m11, 'DUM')) || null;
    row.dun = dun;
    if (a3)
      row.cod_antigo = [...new Set(a3.map((x) => x.item))].sort().join('|');
    row.cod_principal = code(g286('Cód. Principal')) || null;
    row.cod_master = code(g286('Cód. Master')) || null;
    row.cod_fornecedor = code(g286('Cód.Fornec.')) || null;
    row.embalagem = text(g286('Embalagem')) || null;
    row.unidade = text(g286('Unidade')) || null;
    row.unid_master = text(g286('Unid.Master')) || null;

    // unidades por caixa: 286, lista, 8013, 8011, 322 (nessa ordem)
    const u86 = zeroToNull(g286('Embal.Master'));
    const uLista = L ? zeroToNull(tl.get(L.row, 'Un/CX')) : null;
    let u13: number | null = null;
    if (g13) {
      u13 = unitsFromBoxWeight(
        num(t13.get(g13, 'PESO CDA (KG)')) ?? 0,
        num(t13.get(g13, 'PESO UNIDADE (KG)')) ?? 0,
      );
    }
    let u11: number | null = null;
    if (m11) {
      const mm = /^\s*(\d+)\s*X/i.exec(text(t11.get(m11, 'EMBALAGEMMASTER')));
      if (mm) u11 = Number(mm[1]);
    }
    const first322 = a3?.[0];
    const u322 =
      first322 && /^\d+$/.test(first322.conv) ? Number(first322.conv) : null;
    row.un_por_caixa = firstTruthy([u86, uLista, u13, u11, u322]);
    if (u86 && uLista && u86 !== uLista) chk.unDifLista += 1;
    if (u86 && u13 && u86 !== u13) chk.unDif8013 += 1;

    row.validade_meses = LV('Validade (meses)');
    row.ncm =
      digits(g286('Classificação Fiscal')) ||
      (L ? digits(tl.get(L.row, 'NCM')) : '') ||
      (m11 ? digits(t11.get(m11, 'NBM')) : '') ||
      null;

    for (const [out, nome] of Object.entries(LISTA_MAP)) {
      if (out === 'validade_meses') continue;
      row[out] = LV(nome, TEXTO_LISTA.has(out));
      if (PESOS.has(out) && row[out] === 0) row[out] = null;
    }

    if (g13) {
      row.sub_brand = text(t13.get(g13, 'SUB BRANDS')) || null;
      row.lg_peso_un = zeroToNull(t13.get(g13, 'PESO UNIDADE (KG)'));
      row.lg_peso_cx = zeroToNull(t13.get(g13, 'PESO CDA (KG)'));
    }

    row.departamento = text(g286('Departamento')) || null;
    row.cod_categoria_286 = code(g286('Cód.Categoria')) || null;
    row.cod_subcategoria_286 = code(g286('Cód.SubCategoria')) || null;
    const fora = ['verdadeiro', 'sim', 'true', '1', 's'].includes(
      key(text(g286('Fora de linha'))),
    );
    row.fora_de_linha = fora ? 'SIM' : 'NAO';
    row.ativo = fora ? 'NAO' : 'SIM';

    if (s) {
      const SV = (n: string): string | null =>
        ts.has(n) ? text(ts.get(s, n)) || null : null;
      row.formato_pack = SV('LANÇAMENTO');
      row.promo_pack = SV('PROMO');
      const amount = SV('AMOUNT');
      row.pack_itens = amount === null ? null : num(amount);
      row.pack_conteudo = SV('CONTENTS');
      row.sort_categoria_master = SV('CATEGORIA MASTER');
      row.sort_categoria = SV('CATEGORIA');
      row.sort_subcategoria = SV('SUBCATEGORIA');
      row.sort_marca = SV('MARCA');
      row.sort_submarca = SV('SUBMARCA');
      row.sort_segmento = SV('SEGMENTO');
      row.sort_subsegmento = SV('SUBSEGMENTO');
      row.status_sortimento = SV('STATUS');
      for (const canal of canais) {
        let v = num(s[canal.pos]);
        if (v === null) continue;
        if (v === 5) {
          v = 1;
          chk.sortCinco += 1;
        } else if (![0, 1, 2].includes(v)) {
          chk.sortInvalido += 1;
          continue;
        }
        row[canal.nome] = v;
      }
    }

    for (const [out, nome] of NOMES_286.custo) row[out] = num(g286(nome));
    if (!fora && !((num(row.custo_real) ?? 0) > 0)) chk.custoZeroAtivo += 1;
    if (
      [
        'est_total',
        'est_reservado',
        'est_avariado',
        'est_bloqueado',
        'est_disponivel',
      ].some((c) => ((row[c] as number | null) ?? 0) < 0)
    )
      chk.estNeg += 1;

    if (m11) {
      row.pm_preco_com_st = num(t11.get(m11, 'PRECO'));
      row.pm_preco_sem_st = num(t11.get(m11, 'VALOR_SEM_IMPOSTO'));
      row.pm_iva = num(t11.get(m11, 'IVA'));
      row.pm_pct_icms = num(t11.get(m11, 'PERCICMS'));
      row.pm_pct_pis = num(t11.get(m11, 'PERCPIS'));
      row.pm_pct_cofins = num(t11.get(m11, 'PERCCOFINS'));
      row.pm_embalagem_master = text(t11.get(m11, 'EMBALAGEMMASTER')) || null;
      row.pm_peso_liq = zeroToNull(t11.get(m11, 'PESOLIQ'));
    }

    const A = ARQUIVOS;
    row.orig_cadastro = [
      A['286'],
      ...(L ? [A.lista] : []),
      ...(g13 ? [A['8013']] : []),
      ...(a3 ? [A['322']] : []),
      ...(s ? [A.sort] : []),
    ].join('+');
    row.orig_hierarquia = [
      A['286'],
      ...(g13 ? [A['8013']] : []),
      ...(L ? [A.lista] : []),
      ...(s ? [A.sort] : []),
    ].join('+');
    row.orig_sortimento = s ? A.sort : null;
    row.orig_custo_estoque = A['286'];
    row.orig_preco_industria = L ? A.lista : null;
    row.orig_preco_milenio = m11 ? A['8011'] : null;
    rows.push(row);
  });

  // ---------- auditoria ----------
  addAudit(
    'P01',
    'INFO',
    'Produtos na base (uma linha por item do 286)',
    rows.length,
  );
  if (totalRodape !== null)
    addAudit(
      'P02',
      'INFO',
      'Linhas do 286 iguais ao total do rodapé',
      totalRodape,
    );
  addAudit(
    'P03',
    'INFO',
    'Itens do 286 encontrados na lista de preço',
    chk.nLista,
  );
  addAudit('P04', 'INFO', 'Itens encontrados no 8013', chk.n8013);
  addAudit('P05', 'INFO', 'Itens encontrados no 322', chk.n322);
  addAudit('P06', 'INFO', 'Itens encontrados no 8011', chk.n8011);
  addAudit('P07', 'INFO', 'Itens encontrados no sortimento', chk.nSort);
  const warn = (c: string, msg: string, n: number) => {
    if (n) addAudit(c, 'AVISO', msg, n);
  };
  warn(
    'P11',
    'Lista: item com mais de uma linha e nenhuma com SKU igual ao Cód. Fabricante',
    chk.skuSemEscolha,
  );
  warn(
    'P12',
    'Lista: código Winthor diferente do código do 286',
    chk.listaEanCpDif,
  );
  warn(
    'P13',
    'Unidades por caixa do 286 diferentes da lista de preço',
    chk.unDifLista,
  );
  warn('P14', 'Unidades por caixa do 286 diferentes do 8013', chk.unDif8013);
  warn('P15', 'EAN do 8011 diferente do EAN do 286', chk.ean8011Dif);
  warn('P16', 'Sortimento: valor 5 tratado como 1', chk.sortCinco);
  warn(
    'P17',
    'Sortimento: valor de canal fora de 0, 1, 2 ou 5 (ignorado)',
    chk.sortInvalido,
  );
  warn('P18', 'Item ativo com custo real zerado ou vazio', chk.custoZeroAtivo);
  warn('P19', 'Item com estoque negativo', chk.estNeg);

  return { engine: 'produtos', columns, rows, audit };
}
