import { digits, num, text, unaccent } from '../core/normalize';
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

export type CortesFile = { nome: string; matrix: Matrix };

export type CortesInput = {
  /** Relatórios 1454, do mais antigo para o mais recente. */
  arquivos: CortesFile[];
  /** Base do motor Produtos (codprod → ean). */
  produtos: BaseRow[];
  /** Base do motor Clientes (cod_cliente → cnpj_cpf). */
  clientes: BaseRow[];
};

const REQ = ['DATA', 'PEDIDO', 'CODIGO', 'QT CORTE', 'PRECO UNIT', 'VLR TOTAL'];
const KNOWN = new Set([
  ...REQ,
  'DESCRICAO',
  'EMBALAGEM',
  'UN',
  'COMPRADOR',
  'DEPTO',
]);
const MAX_RECORDS = 200;

function normHeader(value: string): string {
  return unaccent(value)
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9%]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanText(value: Cell): string | null {
  const t = text(value);
  if (!t) return null;
  const s = unaccent(t)
    .toUpperCase()
    .replace(/\.{3,}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return s || null;
}

/** Código numérico sem zeros à esquerda, como texto (nulo se não há dígitos). */
function normCode(value: Cell): string | null {
  const d = digits(value);
  if (!d) return null;
  return d.replace(/^0+/, '') || '0';
}

/**
 * Data/hora do Excel como "relógio de parede" guardado em UTC (use sempre getUTC*).
 * Aceita o número serial do Excel (leitura sem fuso) ou uma Data.
 */
function wall(value: Cell): Date | null {
  if (typeof value === 'number' && value > 20000 && value < 80000) {
    return new Date(Math.round((value - 25569) * 86400) * 1000);
  }
  if (value instanceof Date) {
    return new Date(
      Date.UTC(
        value.getFullYear(),
        value.getMonth(),
        value.getDate(),
        value.getHours(),
        value.getMinutes(),
        Math.round(value.getSeconds() + value.getMilliseconds() / 1000),
      ),
    );
  }
  return null;
}

const pad = (n: number, size = 2) => String(n).padStart(size, '0');

type CorteRow = {
  arquivo: string;
  linha: number;
  dt: Date;
  pedido: string | null;
  codCliente: string | null;
  codprod: string | null;
  descricao: string | null;
  embalagem: string | null;
  un: string | null;
  qtd: number | null;
  preco: number | null;
  valor: number | null;
  depto: string | null;
};

function cellText(v: Cell | undefined): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString();
  return String(v).trim();
}

function readFile(
  file: CortesFile,
  addAudit: (a: AuditItem) => void,
): { rows: CorteRow[]; fornecedor: string | null } {
  const rows: CorteRow[] = [];
  let cli: string | null = null;
  let hdr = null as Map<string, number> | null;
  let falt: string[] = [];
  let tot = null as number[] | null;
  let per: string | null = null;
  let forn: string | null = null;

  file.matrix.forEach((row, i) => {
    const t = row.map(cellText);
    if (per === null) {
      for (const s of t) {
        if (/\d\d\/\d\d\/\d{4}\s+a\s+\d\d\/\d\d\/\d{4}/.test(s)) per = s;
      }
    }
    if (
      forn === null &&
      t.some((s) => s.toUpperCase() === 'FORNECEDOR:') &&
      t[0]
    )
      forn = t[0] ?? null;
    const k = t.findIndex((s) => s.toUpperCase() === 'CLIENTE:');
    if (k >= 0) {
      const rest = t.slice(k + 1).filter((s) => s && s !== '-');
      if (rest[0] && /^\d+$/.test(rest[0].replace(/\./g, ''))) {
        cli = normCode(rest[0]);
      }
      return;
    }
    const hn = t.map(normHeader);
    if (
      hn.includes('DATA') &&
      hn.includes('PEDIDO') &&
      hn.includes('QT CORTE')
    ) {
      hdr = new Map();
      hn.forEach((h, j) => {
        if (h) hdr?.set(h, j);
      });
      falt = REQ.filter((r) => !hdr?.has(r));
      if (falt.length)
        addAudit({
          code: 'COLUNA_OBRIGATORIA_AUSENTE',
          severity: 'ERRO',
          message: `${file.nome}: faltam colunas obrigatórias`,
          count: falt.length,
          records: falt.map((f) => ({ key: f })),
        });
      const novas = [...hdr.keys()].filter((h) => !KNOWN.has(h));
      if (novas.length)
        addAudit({
          code: 'COLUNA_NOVA',
          severity: 'AVISO',
          message: `${file.nome}: colunas não previstas`,
          count: novas.length,
          records: novas.map((f) => ({ key: f })),
        });
      return;
    }
    if (t.some((s) => s.toUpperCase().includes('TOTAL GERAL'))) {
      tot = row.filter((v): v is number => typeof v === 'number');
      return;
    }
    const dataPos = hdr?.get('DATA');
    if (hdr && !falt.length && dataPos !== undefined) {
      const dv = wall(row[dataPos] ?? null);
      if (dv) {
        const h = hdr;
        const g = (n: string): Cell => {
          const p = h.get(n);
          return p === undefined ? null : (row[p] ?? null);
        };
        rows.push({
          arquivo: file.nome,
          linha: i + 1,
          dt: dv,
          pedido: normCode(g('PEDIDO')),
          codCliente: cli,
          codprod: normCode(g('CODIGO')),
          descricao: cleanText(g('DESCRICAO')),
          embalagem: cleanText(g('EMBALAGEM')),
          un: cleanText(g('UN')),
          qtd: num(g('QT CORTE')),
          preco: num(g('PRECO UNIT')),
          valor: num(g('VLR TOTAL')),
          depto: normCode(g('DEPTO')),
        });
      }
    }
  });

  if (!rows.length) {
    addAudit({
      code: 'SEM_LINHAS',
      severity: 'ERRO',
      message: `${file.nome}: nenhuma linha de corte lida`,
      count: 0,
    });
    return { rows, fornecedor: forn };
  }
  const totais: number[] | null = tot;
  if (totais && totais.length >= 3) {
    const soma = (f: (r: CorteRow) => number | null) =>
      rows.reduce((a, r) => a + (f(r) ?? 0), 0);
    const checks: [boolean, string][] = [
      [Math.trunc(totais[0] ?? 0) !== rows.length, 'quantidade de linhas'],
      [
        Math.abs((totais[1] ?? 0) - soma((r) => r.qtd)) > 0.5,
        'quantidade cortada',
      ],
      [
        Math.abs((totais[2] ?? 0) - soma((r) => r.valor)) > 0.5,
        'valor cortado',
      ],
    ];
    for (const [bad, what] of checks) {
      if (bad)
        addAudit({
          code: 'TOTAL_GERAL_DIVERGE',
          severity: 'ERRO',
          message: `${file.nome}: ${what} lida diferente do total geral do relatório`,
          count: 1,
        });
    }
  }
  addAudit({
    code: 'LINHAS_LIDAS',
    severity: 'INFO',
    message: `${file.nome}: linhas de corte lidas (período ${per ?? '?'}; fornecedor ${forn ?? '?'})`,
    count: rows.length,
  });
  return { rows, fornecedor: forn };
}

function recs(list: AuditRecord[]): AuditRecord[] | undefined {
  return list.length ? list.slice(0, MAX_RECORDS) : undefined;
}

const cmp = (a: string | null, b: string | null) =>
  (a ?? '') < (b ?? '') ? -1 : (a ?? '') > (b ?? '') ? 1 : 0;

export function processCortes(input: CortesInput): EngineResult {
  const audit: AuditItem[] = [];
  const addAudit = (a: AuditItem) => audit.push(a);

  const partes: { rows: CorteRow[]; fornecedor: string | null }[] = [];
  for (const f of input.arquivos) {
    const p = readFile(f, addAudit);
    if (p.rows.length) partes.push(p);
  }
  if (!partes.length) {
    throw new EngineBlockError('nenhum corte lido nos arquivos 1454');
  }

  const ult = partes[partes.length - 1]?.rows ?? [];
  const ini = new Date(Math.min(...ult.map((r) => r.dt.getTime())));
  ini.setUTCHours(0, 0, 0, 0);
  const ant = partes.slice(0, -1).flatMap((p) => p.rows);
  const repetidas = ant.filter((r) => r.dt >= ini);
  addAudit({
    code: 'PERIODO_REPETIDO_ENTRE_ARQUIVOS',
    severity: repetidas.length ? 'AVISO' : 'INFO',
    message:
      '1454: linhas do arquivo anterior com data a partir do início do mais recente foram substituídas pelo mais recente',
    count: repetidas.length,
  });
  const todas = [...ant.filter((r) => r.dt < ini), ...ult];

  // Itens de Colgate = itens que existem no motor de Produtos; o resto não vira linha.
  const cp = new Map<string, string | null>();
  for (const p of input.produtos) {
    const c =
      p.codprod === null || p.codprod === undefined ? '' : String(p.codprod);
    if (c && !cp.has(c))
      cp.set(c, p.ean === null || p.ean === undefined ? null : String(p.ean));
  }
  const dentro = todas.filter((r) => r.codprod !== null && cp.has(r.codprod));
  for (const parte of partes) {
    const nome = parte.rows[0]?.arquivo ?? '1454';
    const fora = todas.filter(
      (r) => r.arquivo === nome && !(r.codprod !== null && cp.has(r.codprod)),
    );
    if (!fora.length) continue;
    const prods = [...new Set(fora.map((r) => r.codprod ?? ''))];
    const todos = (parte.fornecedor ?? '').toUpperCase() === 'TODOS';
    addAudit({
      code: todos ? 'CORTES_FORA_DO_PRODUTOS' : 'CORTE_SEM_PRODUTO',
      severity: todos ? 'INFO' : 'AVISO',
      message: todos
        ? `${nome}: linhas de produtos fora do cadastro Colgate descartadas (arquivo sem filtro de fornecedor)`
        : `${nome}: linhas de produto que não existe no motor de Produtos descartadas`,
      count: fora.length,
      records: todos ? undefined : recs(prods.map((k) => ({ key: k }))),
    });
  }

  const cc = new Map<string, string>();
  for (const c of input.clientes) {
    const k =
      c.cod_cliente === null || c.cod_cliente === undefined
        ? ''
        : String(c.cod_cliente);
    if (k && !cc.has(k) && c.cnpj_cpf) cc.set(k, String(c.cnpj_cpf));
  }

  const ordenadas = [...dentro].sort(
    (a, b) =>
      a.dt.getTime() - b.dt.getTime() ||
      cmp(a.codCliente, b.codCliente) ||
      cmp(a.pedido, b.pedido) ||
      cmp(a.codprod, b.codprod) ||
      cmp(a.arquivo, b.arquivo) ||
      a.linha - b.linha,
  );

  const rows: BaseRow[] = ordenadas.map((r, i) => {
    const d = r.dt;
    return {
      id_corte: `C${pad(i + 1, 6)}`,
      arquivo_origem: r.arquivo,
      linha_origem: r.linha,
      data_corte: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
      hora_corte: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`,
      ano_corte: d.getUTCFullYear(),
      mes_corte: d.getUTCMonth() + 1,
      dia_corte: d.getUTCDate(),
      pedido: r.pedido,
      cod_cliente: r.codCliente,
      cnpj_cpf_cliente: r.codCliente ? (cc.get(r.codCliente) ?? null) : null,
      codprod: r.codprod,
      ean: r.codprod ? (cp.get(r.codprod) ?? null) : null,
      descricao_item: r.descricao,
      embalagem: r.embalagem,
      un: r.un,
      depto: r.depto,
      qtd_corte: r.qtd,
      preco_unit: r.preco,
      valor_corte: r.valor,
    };
  });
  const id = (i: number) => `C${pad(i + 1, 6)}`;

  const semCnpj = rows.filter((r) => r.cnpj_cpf_cliente === null);
  addAudit({
    code: 'CORTE_SEM_CNPJ',
    severity: semCnpj.length ? 'AVISO' : 'INFO',
    message: 'Cortes cujo código de cliente não existe no motor de Clientes',
    count: semCnpj.length,
    records: recs(
      [...new Set(semCnpj.map((r) => String(r.cod_cliente)))].map((k) => ({
        key: k,
        info: 'cliente sem cadastro no motor Clientes',
      })),
    ),
  });
  const semEan = rows.filter((r) => r.ean === null);
  addAudit({
    code: 'CORTE_SEM_EAN',
    severity: semEan.length ? 'AVISO' : 'INFO',
    message: 'Cortes cujo produto está sem EAN no motor de Produtos',
    count: semEan.length,
    records: recs(
      [...new Set(semEan.map((r) => String(r.codprod)))].map((k) => ({
        key: k,
      })),
    ),
  });
  const invalidas = rows.flatMap((r, i) =>
    r.qtd_corte === null || Number(r.qtd_corte) <= 0 || r.valor_corte === null
      ? [{ key: id(i), info: 'quantidade zerada/negativa ou valor vazio' }]
      : [],
  );
  if (invalidas.length)
    addAudit({
      code: 'QTD_OU_VALOR_INVALIDO',
      severity: 'ERRO',
      message: 'Linhas com quantidade zerada/negativa ou valor vazio',
      count: invalidas.length,
      records: recs(invalidas),
    });
  const diverge = rows.flatMap((r, i) =>
    Math.abs(
      Number(r.qtd_corte ?? 0) * Number(r.preco_unit ?? 0) -
        Number(r.valor_corte ?? 0),
    ) > 0.02
      ? [
          {
            key: id(i),
            info: 'valor total diferente de quantidade × preço unitário',
          },
        ]
      : [],
  );
  if (diverge.length)
    addAudit({
      code: 'VALOR_DIFERE_QTD_X_PRECO',
      severity: 'AVISO',
      message: 'Valor total diferente de quantidade x preço unitário',
      count: diverge.length,
      records: recs(diverge),
    });
  const grupos = new Map<string, string[]>();
  rows.forEach((r, i) => {
    const k = [
      r.cod_cliente,
      r.data_corte,
      r.hora_corte,
      r.pedido,
      r.codprod,
      r.qtd_corte,
      r.valor_corte,
    ].join('|');
    const g = grupos.get(k);
    if (g) g.push(id(i));
    else grupos.set(k, [id(i)]);
  });
  const dups = [...grupos.values()].filter((g) => g.length > 1).flat();
  addAudit({
    code: 'LINHAS_IDENTICAS',
    severity: dups.length ? 'AVISO' : 'INFO',
    message:
      'Linhas idênticas (mesmo cliente, hora, pedido, item, quantidade e valor)',
    count: dups.length,
    records: recs(dups.map((k) => ({ key: k }))),
  });
  const naoUn = rows.filter((r) => r.un !== 'UN');
  if (naoUn.length)
    addAudit({
      code: 'UNIDADE_DIFERENTE_DE_UN',
      severity: 'INFO',
      message:
        'Linhas cuja unidade não é UN (a quantidade vem na unidade da linha)',
      count: naoUn.length,
    });
  addAudit({
    code: 'CORTES_NA_BASE',
    severity: 'INFO',
    message: 'Cortes na base',
    count: rows.length,
  });
  return { engine: 'cortes', columns: SPEC, rows, audit };
}
