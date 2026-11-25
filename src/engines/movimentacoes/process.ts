import { cnpjOk, cpfOk } from '../core/documents';
import { text, unaccent } from '../core/normalize';
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

export type Fonte379 = { nome: string; texto: string };
export type Fonte8022 = { nome: string; matrix: Matrix };

export type MovimentacoesInput = {
  /** Relatórios 379 (ERP antigo), em ordem cronológica. */
  antigos: Fonte379[];
  /** Relatórios 8022 (ERP novo), do mais antigo para o mais recente. */
  novos: Fonte8022[];
};

const MAX_RECORDS = 200;

// ------------------------------------------------------------- utilidades
const pad2 = (n: number) => String(n).padStart(2, '0');
const recs = (list: AuditRecord[]): AuditRecord[] | undefined =>
  list.length ? list.slice(0, MAX_RECORDS) : undefined;

function normHeader(value: string): string {
  return unaccent(value)
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9%]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Texto em maiúsculas, sem acento, sem "......" de preenchimento. */
export function cleanText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const raw =
    typeof value === 'string' || typeof value === 'number'
      ? String(value)
      : value instanceof Date
        ? value.toISOString()
        : '';
  const t = unaccent(raw)
    .toUpperCase()
    .replace(/\.{3,}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return t === '' ? null : t;
}

/** '1.200,50' → 1200.5 · '-3,00' ou '3,00-' → -3 · vazio → nulo. */
export function numBr(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  if (raw === '' || ['nan', 'none'].includes(raw.toLowerCase())) return null;
  const neg = raw.startsWith('-') || raw.endsWith('-');
  const t = raw
    .replace(/^-+|-+$/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  if (t === '' || !/^\d*\.?\d*$/.test(t) || t === '.') return null;
  const v = Number(t);
  if (!Number.isFinite(v)) return null;
  return neg ? -v : v;
}

function digitsOf(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  let s: string;
  if (typeof value === 'number')
    s = Number.isFinite(value) ? String(Math.trunc(value)) : '';
  else if (typeof value === 'string') s = value;
  else return null;
  const d = s.replace(/\D/g, '');
  return d === '' ? null : d;
}

export function normCode(value: unknown): string | null {
  const d = digitsOf(value);
  return d === null ? null : d.replace(/^0+/, '') || '0';
}

export function normEan(value: unknown): string | null {
  const d = digitsOf(value);
  if (d === null) return null;
  const t = d.replace(/^0+/, '') || '0';
  return t.length >= 8 ? t : null;
}

export function normDoc(value: unknown): string | null {
  const d = digitsOf(value);
  if (d === null) return null;
  const t = d.replace(/^0+/, '') || '0';
  if (t.length > 11) return t.padStart(14, '0');
  const c = t.padStart(11, '0');
  const j = t.padStart(14, '0');
  return !cpfOk(c) && cnpjOk(j) ? j : c;
}

/** Data (Date do Excel, DD/MM/AAAA ou AAAA-MM-DD) → AAAA-MM-DD; nulo se não for data real. */
export function isoDate(value: unknown): string | null {
  let y: number;
  let m: number;
  let d: number;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const x = new Date(value.getTime() + 12 * 3_600_000);
    y = x.getUTCFullYear();
    m = x.getUTCMonth() + 1;
    d = x.getUTCDate();
  } else if (typeof value === 'string') {
    const t = value.trim();
    const br = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(t);
    const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
    if (br) {
      d = Number(br[1]);
      m = Number(br[2]);
      y = Number(br[3]);
    } else if (iso) {
      y = Number(iso[1]);
      m = Number(iso[2]);
      d = Number(iso[3]);
    } else return null;
  } else return null;
  const check = new Date(Date.UTC(y, m - 1, d));
  if (
    check.getUTCFullYear() !== y ||
    check.getUTCMonth() !== m - 1 ||
    check.getUTCDate() !== d
  )
    return null;
  return `${String(y).padStart(4, '0')}-${pad2(m)}-${pad2(d)}`;
}

// ----------------------------------------------------------- ERP antigo (379)
const OLD_ALIAS: Record<string, string> = {
  data: 'data_movimento',
  nota: 'nota_fiscal',
  serie: 'serie',
  item: 'item_codigo_antigo',
  qtde: 'qtd_unidades',
  valor: 'valor_mercadoria',
  desconto: 'desconto',
  'oper.cfop': 'operacao_antiga',
  'oper.cfop#2': 'cfop',
  pedido: 'pedido',
  fornecedor: 'cnpj_fornecedor',
  cliente: 'cnpj_cpf_cliente',
  'rpc.': 'cod_vendedor_antigo',
  pesoliq: 'peso_liquido_kg',
  pesobru: 'peso_bruto_kg',
  mot: 'cod_motorista',
  bordero: 'bordero',
  linha: 'cod_linha_produto',
  cidade: 'cidade',
  coord: 'cod_coordenada',
  rede: 'rede_antigo',
  ramo: 'ramo_antigo',
  qtdcx: 'unidades_por_caixa',
  'port.ean': 'portador',
  comercial: 'ean_comercial',
  tributavel: 'ean_tributavel',
  'pis/cof': 'base_pis_cofins',
  base: 'base_pis_cofins',
  'aliq.pis': 'aliq_pis',
  pis: 'valor_pis',
  aliq: 'aliq_cofins',
  'cof.': 'aliq_cofins',
  cofins: 'valor_cofins',
  icms: 'icms',
  'icms-st': 'icms_st',
  fcp: 'fcp',
  '%mot': 'pct_motorista',
  'vlr.com.mot': 'comissao_motorista',
  carga: 'carga',
  escalonado: 'vlr_escalonado',
};
const OLD_NUMERIC = new Set([
  'qtd_unidades',
  'valor_mercadoria',
  'desconto',
  'peso_liquido_kg',
  'peso_bruto_kg',
  'unidades_por_caixa',
  'base_pis_cofins',
  'aliq_pis',
  'valor_pis',
  'aliq_cofins',
  'valor_cofins',
  'icms',
  'icms_st',
  'fcp',
  'pct_motorista',
  'comissao_motorista',
  'vlr_escalonado',
]);
const OLD_REQUIRED = [
  'data_movimento',
  'nota_fiscal',
  'item_codigo_antigo',
  'qtd_unidades',
  'valor_mercadoria',
  'operacao_antiga',
  'cfop',
  'cnpj_cpf_cliente',
  'ean_comercial',
];
const DATE_LINE = /^\d\d\/\d\d\/\d{4}\s/;
const HEADER_LINE = /^\s*Data\s+Nota/;
// Mesmas quebras de linha que o splitlines do Python (o texto é lido byte a byte, como latin-1).
const LINE_BREAK = new RegExp(
  String.raw`\r\n|[\n\r\v\f\x1c-\x1e\x85\u2028\u2029]`,
);

/** Texto latin-1 byte a byte (não troca 0x80–0x9F por símbolos). */
export function decodeLatin1(bytes: Uint8Array): string {
  const parts: string[] = [];
  const step = 32768;
  for (let i = 0; i < bytes.length; i += step) {
    parts.push(String.fromCharCode(...bytes.subarray(i, i + step)));
  }
  return parts.join('');
}

type Raw379 = Record<string, string | number | null>;

export type Lido379 = { rows: Raw379[]; audit: AuditItem[] };

/** Relatório 379 (largura fixa): campos pelos vãos de espaço e pelo nome no cabeçalho. */
export function read379(content: string, nome: string): Lido379 {
  const lines = content.split(LINE_BREAK);
  const audit: AuditItem[] = [];
  const headerAt = lines.findIndex((l) => HEADER_LINE.test(l));
  const header = headerAt >= 0 ? (lines[headerAt] ?? '') : '';
  const detail: { at: number; line: string }[] = [];
  lines.forEach((line, at) => {
    if (DATE_LINE.test(line)) detail.push({ at, line });
  });
  if (headerAt < 0 || detail.length === 0) {
    throw new EngineBlockError(
      `${nome}: não encontrei o cabeçalho (Data / Nota …) e as linhas de detalhe do relatório 379`,
    );
  }
  let width = 0;
  for (const { line } of detail) width = Math.max(width, line.length);
  const occupied = new Uint8Array(width + 1);
  for (const { line } of detail) {
    for (let i = 0; i < line.length; i += 1) {
      if (line.charCodeAt(i) !== 32) occupied[i] = 1;
    }
  }
  const spans: [number, number][] = [];
  let start = -1;
  for (let i = 0; i <= width; i += 1) {
    const on = occupied[i] === 1;
    if (on && start < 0) start = i;
    if (!on && start >= 0) {
      spans.push([start, i]);
      start = -1;
    }
  }
  const words = [...header.matchAll(/\S+/g)].map((m) => ({
    w: m[0].toLowerCase(),
    s: m.index,
    e: m.index + m[0].length,
  }));
  const used = new Map<string, number>();
  const fields: { a: number; b: number; name: string }[] = [];
  for (const [a, b] of spans) {
    let best: string | null = null;
    let bestOverlap = 0;
    for (const w of words) {
      const overlap = Math.min(b, w.e) - Math.max(a, w.s);
      if (overlap > bestOverlap) {
        best = w.w;
        bestOverlap = overlap;
      }
    }
    if (best === null) {
      let dist = Infinity;
      for (const w of words) {
        const d = Math.abs((w.s + w.e) / 2 - (a + b) / 2);
        if (d < dist) {
          dist = d;
          best = w.w;
        }
      }
    }
    const base = best ?? 'campo';
    const n = (used.get(base) ?? 0) + 1;
    used.set(base, n);
    const k = n === 1 ? base : `${base}#${n}`;
    fields.push({
      a,
      b,
      name: OLD_ALIAS[k] ?? `x_${k.replace(/\W+/g, '_')}`,
    });
  }
  const unknown = [
    ...new Set(fields.map((f) => f.name).filter((n) => n.startsWith('x_'))),
  ].sort();
  if (unknown.length) {
    audit.push({
      code: 'COLUNA_NOVA',
      severity: 'AVISO',
      message: `Colunas não previstas no layout 379: ${unknown.join(', ')}`,
      count: unknown.length,
    });
  }
  const present = new Set(fields.map((f) => f.name));
  const missing = OLD_REQUIRED.filter((c) => !present.has(c));
  if (missing.length) {
    throw new EngineBlockError(
      `${nome}: faltam colunas obrigatórias no 379: ${missing.join(', ')}`,
    );
  }
  const rows: Raw379[] = detail.map(({ at, line }) => {
    const padded = line.padEnd(width, ' ');
    const r: Raw379 = { linha_origem: at + 1 };
    for (const f of fields) {
      const v = padded.slice(f.a, f.b).trim();
      const prev = r[f.name];
      if (prev !== undefined && prev !== null && prev !== '') continue;
      r[f.name] = v === '' ? null : v;
    }
    for (const c of OLD_NUMERIC) {
      if (c in r) r[c] = numBr(r[c]);
    }
    return r;
  });
  audit.push({
    code: 'LINHAS_LIDAS',
    severity: 'INFO',
    message: `${nome}: ${rows.length} linhas de detalhe; ${fields.length} campos detectados`,
    count: rows.length,
  });
  const others: string[] = [];
  for (let i = headerAt + 1; i < lines.length; i += 1) {
    const l = lines[i] ?? '';
    if (
      l.trim() !== '' &&
      !DATE_LINE.test(l) &&
      !l.startsWith('-') &&
      !l.startsWith('MCD') &&
      !l.startsWith('Filial') &&
      !l.includes('Vendas') &&
      !HEADER_LINE.test(l)
    )
      others.push(l.trim());
  }
  if (others.length) {
    audit.push({
      code: 'LINHAS_NAO_RECONHECIDAS',
      severity: 'AVISO',
      message: `${nome}: linhas fora do padrão do relatório 379 (rodapé ou texto solto)`,
      count: others.length,
      records: recs(others.map((o) => ({ key: nome, info: o.slice(0, 80) }))),
    });
  }
  return { rows, audit };
}

// -------------------------------------------------------- padronização comum
type Num = number | null;

type Mov = {
  sistema: 'ERP_ANTIGO' | 'ERP_NOVO';
  arquivo: string;
  linha: number;
  data: string | null;
  emissao: string | null;
  nota: string | null;
  serie: string | null;
  pedido: string | null;
  cnpj: string | null;
  codCliente: string | null;
  nomeCliente: string | null;
  vendAntigo: string | null;
  vendNovo: string | null;
  supNovo: string | null;
  ean: string | null;
  itemAntigo: string | null;
  codprod: string | null;
  qtd: Num;
  qtdCaixas: Num;
  valorMerc: Num;
  valorNota: Num;
  valorOficial: Num;
  desconto: Num;
  icms: Num;
  icmsSt: Num;
  fcp: Num;
  pis: Num;
  cofins: Num;
  opAntiga: string | null;
  cfop: string | null;
  tipoNovo: string | null;
  statusPedido: string | null;
  classe: string;
  situacao: string;
};

const str = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  const t = typeof v === 'string' || typeof v === 'number' ? String(v) : '';
  return t === '' ? null : t;
};
const round4 = (v: number) => Math.round(v * 1e4) / 1e4;

function padronizaAntigo(rows: Raw379[], arquivo: string): Mov[] {
  return rows.map((r) => {
    const qtd = numBr(r.qtd_unidades);
    const upc = numBr(r.unidades_por_caixa);
    const valor = numBr(r.valor_mercadoria);
    const data = isoDate(r.data_movimento);
    return {
      sistema: 'ERP_ANTIGO',
      arquivo,
      linha: Number(r.linha_origem),
      data,
      emissao: data,
      nota: normCode(r.nota_fiscal),
      serie: str(r.serie),
      pedido: normCode(r.pedido),
      cnpj: normDoc(r.cnpj_cpf_cliente),
      codCliente: null,
      nomeCliente: null,
      vendAntigo: str(r.cod_vendedor_antigo),
      vendNovo: null,
      supNovo: null,
      ean: normEan(r.ean_comercial),
      itemAntigo: normCode(r.item_codigo_antigo),
      codprod: null,
      qtd,
      qtdCaixas:
        qtd !== null && upc !== null && upc > 0 ? round4(qtd / upc) : null,
      valorMerc: null,
      valorNota: null,
      valorOficial: valor,
      desconto: numBr(r.desconto),
      icms: numBr(r.icms),
      icmsSt: numBr(r.icms_st),
      fcp: numBr(r.fcp),
      pis: numBr(r.valor_pis),
      cofins: numBr(r.valor_cofins),
      opAntiga: normCode(r.operacao_antiga),
      cfop: normCode(r.cfop),
      tipoNovo: null,
      statusPedido: null,
      classe: '',
      situacao: '',
    };
  });
}

// -------------------------------------------------------- ERP novo (8022)
const NEW_ALIAS: Record<string, string> = {
  'DATA MOVIMENTO': 'data_movimento',
  'NUMERO NOTA FISCAL': 'nota_fiscal',
  'NUMERO PED WINTHOR': 'pedido',
  'CNPJ CPF CLIENTE': 'cnpj_cpf_cliente',
  'COD CLIENTE': 'cod_cliente_novo',
  'NOME CLIENTE': 'nome_cliente',
  CIDADE: 'cidade',
  UF: 'uf',
  'SEGMENTO ATUACAO CNAE': 'segmento_novo',
  'COD VENDEDOR': 'cod_vendedor_novo',
  VENDEDOR: 'vendedor',
  'COD SUPERVISOR': 'cod_supervisor_novo',
  SUPERVISOR: 'supervisor',
  'EAN CADASTRO': 'ean',
  'EAN PRODUTO': 'ean_linha',
  'CODPROD WINTHOR': 'codprod_novo',
  'CODIGO FABRICANTE': 'codigo_fabricante',
  'DESCRICAO PRODUTO': 'descricao_item',
  'CAIXAS VENDIDAS': 'qtd_caixas',
  'UNIDADES VENDIDAS': 'qtd_unidades',
  'PESO BRUTO KG': 'peso_bruto_kg',
  'PESO LIQUIDO KG': 'peso_liquido_kg',
  'VALOR MERCADORIA R': 'valor_mercadoria',
  'VALOR NOTA R': 'valor_nota',
  'TIPO VENDA': 'tipo_novo',
  'ORIGEM PEDIDO': 'origem_pedido_novo',
  'STATUS PEDIDO': 'status_pedido_novo',
  'STATUS BLOQUEIO': 'status_bloqueio_novo',
  FILIAL: 'filial',
  FORNECEDOR: 'cod_fornecedor',
  'DATA EMISSAO NF': 'data_emissao',
  'NUMERO PED RCA': 'pedido_rca',
  TIPO: 'tipo_codigo_novo',
  'PESO T': 'peso_t',
  'SITUACAO PESO': 'situacao_peso',
  CEP: 'cep',
};
const NEW_REQUIRED = [
  'data_movimento',
  'cnpj_cpf_cliente',
  'ean',
  'codprod_novo',
  'qtd_unidades',
  'valor_mercadoria',
  'tipo_novo',
];

export type Lido8022 = { movs: Mov[]; audit: AuditItem[] };

/** Relatório 8022 (xls/xlsx): colunas pelo nome do cabeçalho, em qualquer posição. */
export function read8022(matrix: Matrix, nome: string): Lido8022 {
  const audit: AuditItem[] = [];
  let headerAt = -1;
  for (let i = 0; i < Math.min(40, matrix.length); i += 1) {
    const vals = (matrix[i] ?? [])
      .filter((v): v is string => typeof v === 'string')
      .map(normHeader);
    if (
      vals.includes('DATA MOVIMENTO') &&
      vals.some((v) => v.includes('CODPROD'))
    ) {
      headerAt = i;
      break;
    }
  }
  if (headerAt < 0) {
    throw new EngineBlockError(
      `${nome}: não encontrei o cabeçalho do 8022 (DATA MOVIMENTO / CODPROD)`,
    );
  }
  const names: string[] = [];
  const unknown: string[] = [];
  (matrix[headerAt] ?? []).forEach((v, j) => {
    const h = typeof v === 'string' ? normHeader(v) : `COL${j}`;
    const alias = NEW_ALIAS[h];
    if (alias) names[j] = alias;
    else {
      names[j] = `x_${h.toLowerCase().replace(/ /g, '_')}`;
      unknown.push(h);
    }
  });
  if (unknown.length) {
    audit.push({
      code: 'COLUNA_NOVA',
      severity: 'AVISO',
      message: `Colunas não previstas no layout 8022: ${unknown.join(', ')}`,
      count: unknown.length,
    });
  }
  const pos = new Map<string, number>();
  names.forEach((n, j) => {
    if (!pos.has(n)) pos.set(n, j);
  });
  const missing = NEW_REQUIRED.filter((c) => !pos.has(c));
  if (missing.length) {
    throw new EngineBlockError(
      `${nome}: faltam colunas obrigatórias no 8022: ${missing.join(', ')}`,
    );
  }
  const movs: Mov[] = [];
  for (let i = headerAt + 1; i < matrix.length; i += 1) {
    const line = matrix[i] ?? [];
    if (!line.some((c) => c !== null && text(c) !== '')) continue;
    const g = (c: string): Cell => {
      const p = pos.get(c);
      return p === undefined ? null : (line[p] ?? null);
    };
    const valorMerc = numBr(g('valor_mercadoria'));
    const valorNota = numBr(g('valor_nota'));
    movs.push({
      sistema: 'ERP_NOVO',
      arquivo: nome,
      linha: i + 1,
      data: isoDate(g('data_movimento')),
      emissao: isoDate(g('data_emissao')),
      nota: normCode(g('nota_fiscal')),
      serie: null,
      pedido: normCode(g('pedido')),
      cnpj: normDoc(g('cnpj_cpf_cliente')),
      codCliente: normCode(g('cod_cliente_novo')),
      nomeCliente: cleanText(g('nome_cliente')),
      vendAntigo: null,
      vendNovo: normCode(g('cod_vendedor_novo')),
      supNovo: normCode(g('cod_supervisor_novo')),
      ean: normEan(g('ean')),
      itemAntigo: null,
      codprod: normCode(g('codprod_novo')),
      qtd: numBr(g('qtd_unidades')),
      qtdCaixas: numBr(g('qtd_caixas')),
      valorMerc,
      valorNota,
      valorOficial: valorNota ?? valorMerc,
      desconto: null,
      icms: null,
      icmsSt: null,
      fcp: null,
      pis: null,
      cofins: null,
      opAntiga: null,
      cfop: null,
      tipoNovo: cleanText(g('tipo_novo')),
      statusPedido: cleanText(g('status_pedido_novo')),
      classe: '',
      situacao: '',
    });
  }
  audit.push({
    code: 'LINHAS_LIDAS',
    severity: 'INFO',
    message: `${nome}: ${movs.length} linhas de detalhe; cabeçalho na linha ${headerAt + 1}`,
    count: movs.length,
  });
  return { movs, audit };
}

// ----------------------------------------------------------- classificação
/** Operações do ERP antigo (operação; CFOP vazio vale para qualquer CFOP). */
export const OPERACOES_ANTIGAS: Record<string, string> = {
  '13201': 'DEVOLUCAO',
  '13216': 'DEVOLUCAO',
  '13234': 'DEVOLUCAO',
  '23201': 'DEVOLUCAO',
  '13202': 'TROCA',
  '51201': 'VENDA',
  '51234': 'VENDA',
  '51295': 'VENDA',
  '61201': 'VENDA',
};
const NO_MOTOR = new Set(['VENDA', 'DEVOLUCAO', 'TROCA', 'BONIFICACAO']);
const LIQUIDO = new Set(['VENDA', 'DEVOLUCAO']);
const NEGATIVAS = new Set(['DEVOLUCAO', 'TROCA']);

function classifica(m: Mov) {
  if (m.sistema === 'ERP_NOVO') {
    m.classe = NO_MOTOR.has(m.tipoNovo ?? '')
      ? (m.tipoNovo ?? '')
      : 'NAO_MAPEADA';
    m.situacao = m.statusPedido === 'FATURADO' ? 'FATURADO' : 'A_FATURAR';
  } else {
    m.classe = (m.opAntiga && OPERACOES_ANTIGAS[m.opAntiga]) || 'NAO_MAPEADA';
    m.situacao = 'FATURADO';
  }
}

const cmpText = (a: string | null, b: string | null): number => {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a < b ? -1 : 1;
};

const brl = (v: number) =>
  v.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function docOk(d: string): boolean {
  if (d.length === 11) return cpfOk(d);
  if (d.length === 14) return cnpjOk(d);
  return false;
}

function distinctGroups<T>(
  list: Mov[],
  keyOf: (m: Mov) => string | null,
  valueOf: (m: Mov) => T | null,
): [string, Set<T>][] {
  const map = new Map<string, Set<T>>();
  for (const m of list) {
    const k = keyOf(m);
    const v = valueOf(m);
    if (k === null || v === null) continue;
    let s = map.get(k);
    if (!s) {
      s = new Set<T>();
      map.set(k, s);
    }
    s.add(v);
  }
  return [...map].filter(([, s]) => s.size > 1);
}

function dayDiff(a: string, b: string): number {
  const f = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1);
  };
  return Math.round((f(a) - f(b)) / 86_400_000);
}

const minMax = (list: Mov[]): [string, string] | null => {
  let lo: string | null = null;
  let hi: string | null = null;
  for (const m of list) {
    if (m.data === null) continue;
    if (lo === null || m.data < lo) lo = m.data;
    if (hi === null || m.data > hi) hi = m.data;
  }
  return lo !== null && hi !== null ? [lo, hi] : null;
};

// ------------------------------------------------------------- processamento
export function processMovimentacoes(input: MovimentacoesInput): EngineResult {
  const audit: AuditItem[] = [];
  const add = (item: AuditItem) => audit.push(item);

  // ---- leitura
  const antigos: Mov[][] = [];
  for (const f of input.antigos) {
    const r = read379(f.texto, f.nome);
    audit.push(...r.audit);
    antigos.push(padronizaAntigo(r.rows, f.nome));
  }
  const novos: Mov[][] = [];
  for (const f of input.novos) {
    const r = read8022(f.matrix, f.nome);
    audit.push(...r.audit);
    novos.push(r.movs);
  }
  if (!antigos.length || !novos.length) {
    throw new EngineBlockError(
      'envie pelo menos um relatório 379 (ERP antigo) e um 8022 (ERP novo)',
    );
  }

  // 379 repetido entre arquivos: só avisa (não há regra de substituição)
  for (let i = 1; i < antigos.length; i += 1) {
    const a = minMax(antigos[i - 1] ?? []);
    const b = minMax(antigos[i] ?? []);
    if (a && b && a[1] >= b[0]) {
      add({
        code: 'PERIODO_REPETIDO_ENTRE_379',
        severity: 'AVISO',
        message:
          'Dois relatórios 379 cobrem as mesmas datas: risco de contar a venda em dobro',
        count: (antigos[i] ?? []).filter(
          (m) => m.data !== null && m.data <= a[1],
        ).length,
        records: [{ key: 'periodo', info: `${b[0]} a ${a[1]}` }],
      });
    }
  }

  // 8022 mais recente substitui o período que se repete no anterior
  const ultimo = novos[novos.length - 1] ?? [];
  const inicio = minMax(ultimo)?.[0] ?? null;
  const anteriores = novos.slice(0, -1).flat();
  const mantidos: Mov[] = [];
  let repN = 0;
  let repV = 0;
  for (const m of anteriores) {
    if (inicio !== null && m.data !== null && m.data >= inicio) {
      repN += 1;
      repV += m.valorOficial ?? 0;
    } else mantidos.push(m);
  }
  add({
    code: 'PERIODO_REPETIDO_ENTRE_ARQUIVOS',
    severity: repN === 0 ? 'INFO' : 'AVISO',
    message:
      'Linhas do 8022 anterior com data a partir do início do 8022 mais recente foram substituídas pelo mais recente',
    count: repN,
    records:
      repN === 0 ? undefined : [{ key: 'valor', info: `R$ ${brl(repV)}` }],
  });
  const novo = [...mantidos, ...ultimo];
  const antigo = antigos.flat();
  let todos: Mov[] = [...antigo, ...novo];

  // ---- produto: a equivalência entre ERPs é do motor Produtos
  const eanVariosCod = distinctGroups(
    novo,
    (m) => m.ean,
    (m) => m.codprod,
  );
  if (eanVariosCod.length) {
    add({
      code: 'EAN_COM_VARIOS_CODPROD',
      severity: 'ERRO',
      message: 'EAN cadastro ligado a mais de um CODPROD no ERP novo',
      count: eanVariosCod.length,
      records: recs(
        eanVariosCod.map(([k, s]) => ({ key: k, info: [...s].join(', ') })),
      ),
    });
  }
  const eanVariosItem = distinctGroups(
    antigo,
    (m) => m.ean,
    (m) => m.itemAntigo,
  );
  if (eanVariosItem.length) {
    add({
      code: 'EAN_COM_VARIOS_ITENS_ANTIGOS',
      severity: 'INFO',
      message:
        'Mesmo EAN em mais de um código de item antigo (repassar ao motor de Produtos)',
      count: eanVariosItem.length,
    });
  }
  const itemVariosEan = distinctGroups(
    antigo,
    (m) => m.itemAntigo,
    (m) => m.ean,
  );
  if (itemVariosEan.length) {
    add({
      code: 'ITEM_ANTIGO_VARIOS_EAN',
      severity: 'AVISO',
      message: 'Mesmo código de item antigo com mais de um EAN',
      count: itemVariosEan.length,
      records: recs(
        itemVariosEan.map(([k, s]) => ({ key: k, info: [...s].join(', ') })),
      ),
    });
  }

  // ---- classificação
  for (const m of todos) classifica(m);

  // ---- devolução/troca lançada no ERP antigo e relançada no novo
  const chaveDup = (m: Mov) =>
    m.nota === null || m.cnpj === null || m.ean === null || m.qtd === null
      ? null
      : `${m.nota}|${m.cnpj}|${m.ean}|${Math.abs(m.qtd).toFixed(2)}`;
  const jaNoAntigo = new Set<string>();
  for (const m of antigo) {
    if (m.classe !== 'DEVOLUCAO' && m.classe !== 'TROCA') continue;
    const k = chaveDup(m);
    if (k !== null) jaNoAntigo.add(k);
  }
  let dupN = 0;
  let dupV = 0;
  const dupRecs: AuditRecord[] = [];
  todos = todos.filter((m) => {
    if (m.sistema !== 'ERP_NOVO') return true;
    const k = chaveDup(m);
    if (k === null || !jaNoAntigo.has(k)) return true;
    dupN += 1;
    dupV += m.valorOficial ?? 0;
    dupRecs.push({
      key: `${m.arquivo}#${m.linha}`,
      info: `nota ${m.nota ?? ''}`,
    });
    return false;
  });
  add({
    code: 'DUPLICIDADE_ENTRE_ERPS',
    severity: dupN === 0 ? 'INFO' : 'AVISO',
    message:
      'Linhas do ERP novo removidas por já existirem no antigo (mesma nota, cliente, EAN e quantidade, devolução/troca)',
    count: dupN,
    records:
      dupN === 0
        ? undefined
        : recs([{ key: 'valor', info: `R$ ${brl(dupV)}` }, ...dupRecs]),
  });

  // ---- ordenação determinística
  todos.sort(
    (a, b) =>
      cmpText(a.data, b.data) ||
      cmpText(a.sistema, b.sistema) ||
      cmpText(a.nota, b.nota) ||
      cmpText(a.itemAntigo, b.itemAntigo) ||
      cmpText(a.codprod, b.codprod) ||
      a.linha - b.linha,
  );

  // ---- auditoria
  const ant = todos.filter((m) => m.sistema === 'ERP_ANTIGO');
  const nov = todos.filter((m) => m.sistema === 'ERP_NOVO');
  const origem = (m: Mov): AuditRecord => ({
    key: `${m.arquivo}#${m.linha}`,
  });

  for (const [rotulo, lista] of [
    ['ERP antigo', ant],
    ['ERP novo', nov],
  ] as const) {
    const mm = minMax(lista);
    add({
      code: 'PERIODO',
      severity: 'INFO',
      message: `${rotulo}: ${mm ? `${mm[0]} a ${mm[1]}` : 'sem datas'} · ${lista.length} linhas`,
      count: lista.length,
    });
  }
  const semData = todos.filter((m) => m.data === null);
  if (semData.length) {
    add({
      code: 'DATA_INVALIDA',
      severity: 'ERRO',
      message: 'Linhas com data de movimento que não pôde ser interpretada',
      count: semData.length,
      records: recs(semData.map(origem)),
    });
  }
  const pa = minMax(ant);
  const pn = minMax(nov);
  if (pa && pn) {
    if (pa[1] >= pn[0]) {
      const sobra = ant.filter((m) => m.data !== null && m.data >= pn[0]);
      add({
        code: 'SOBREPOSICAO_PERIODO',
        severity: 'ERRO',
        message:
          'O ERP antigo vai até uma data em que o ERP novo já começou: risco de dupla contagem',
        count: sobra.length,
        records: recs(sobra.map(origem)),
      });
    } else {
      add({
        code: 'TRANSICAO',
        severity: 'INFO',
        message: `Sem sobreposição: antigo termina em ${pa[1]} e novo começa em ${pn[0]}`,
        count: dayDiff(pn[0], pa[1]) - 1,
      });
    }
  }

  // dias corridos sem nenhuma linha (sequências de 5 ou mais)
  const dias = [
    ...new Set(todos.map((m) => m.data).filter((d): d is string => d !== null)),
  ].sort();
  if (dias.length > 1) {
    let run: string[] = [];
    const flush = () => {
      if (run.length >= 5) {
        add({
          code: 'SEQUENCIA_SEM_MOVIMENTO',
          severity: 'INFO',
          message: `${run[0] ?? ''} a ${run[run.length - 1] ?? ''} sem nenhuma linha`,
          count: run.length,
        });
      }
      run = [];
    };
    for (let i = 1; i < dias.length; i += 1) {
      const gap = dayDiff(dias[i] ?? '', dias[i - 1] ?? '');
      for (let k = 1; k < gap; k += 1) {
        const d = new Date(
          Date.parse(`${dias[i - 1] ?? ''}T12:00:00Z`) + k * 86_400_000,
        );
        run.push(d.toISOString().slice(0, 10));
      }
      if (gap > 1 && run.length) flush();
    }
  }

  // clientes
  const docs = [
    ...new Set(todos.map((m) => m.cnpj).filter((d): d is string => d !== null)),
  ];
  const ruins = docs.filter((d) => !docOk(d));
  add({
    code: 'DOC_CLIENTE_INVALIDO',
    severity: ruins.length ? 'AVISO' : 'INFO',
    message: 'CNPJ/CPF com dígito verificador inválido ou tamanho incorreto',
    count: ruins.length,
    records: recs(ruins.map((d) => ({ key: d, info: 'documento inválido' }))),
  });
  const semDoc = todos.filter((m) => m.cnpj === null);
  if (semDoc.length) {
    add({
      code: 'SEM_DOC_CLIENTE',
      severity: 'ERRO',
      message: 'Linhas sem CNPJ/CPF do cliente',
      count: semDoc.length,
      records: recs(semDoc.map(origem)),
    });
  }
  const cnpjNomes = distinctGroups(
    nov,
    (m) => m.cnpj,
    (m) => m.nomeCliente,
  );
  if (cnpjNomes.length) {
    add({
      code: 'CNPJ_VARIOS_NOMES',
      severity: 'AVISO',
      message: 'Mesmo CNPJ com mais de um nome no ERP novo',
      count: cnpjNomes.length,
      records: recs(
        cnpjNomes.map(([k, s]) => ({ key: k, info: [...s].join(' / ') })),
      ),
    });
  }
  const codVariosCnpj = distinctGroups(
    nov,
    (m) => m.codCliente,
    (m) => m.cnpj,
  );
  if (codVariosCnpj.length) {
    add({
      code: 'CODCLI_VARIOS_CNPJ',
      severity: 'AVISO',
      message: 'Mesmo código de cliente com mais de um CNPJ no ERP novo',
      count: codVariosCnpj.length,
      records: recs(
        codVariosCnpj.map(([k, s]) => ({ key: k, info: [...s].join(', ') })),
      ),
    });
  }
  const cnpjNovo = new Set(
    nov.map((m) => m.cnpj).filter((d): d is string => d !== null),
  );
  const cnpjVelho = new Set(
    ant.map((m) => m.cnpj).filter((d): d is string => d !== null),
  );
  let nasDuas = 0;
  for (const c of cnpjVelho) if (cnpjNovo.has(c)) nasDuas += 1;
  add({
    code: 'CLIENTES_NA_PONTE',
    severity: 'INFO',
    message: `${nasDuas} CNPJ nos dois ERPs; ${cnpjVelho.size - nasDuas} só no antigo; ${cnpjNovo.size - nasDuas} só no novo`,
    count: nasDuas,
  });

  // produtos sem EAN
  const semEan = todos.filter((m) => m.ean === null);
  if (semEan.length) {
    const dentro = semEan.filter((m) => NO_MOTOR.has(m.classe));
    add({
      code: 'SEM_EAN',
      severity: dentro.length ? 'ERRO' : 'INFO',
      message: 'Linhas sem EAN do produto',
      count: dentro.length ? dentro.length : semEan.length,
      records: recs((dentro.length ? dentro : semEan).map(origem)),
    });
  }

  // valores e sinais
  const negAnt = ant.filter(
    (m) => (m.valorOficial ?? 0) < 0 || (m.qtd ?? 0) < 0,
  );
  add({
    code: 'NEGATIVOS_ERP_ANTIGO',
    severity: negAnt.length ? 'AVISO' : 'INFO',
    message:
      'Linhas com quantidade ou valor negativo no ERP antigo (esperado nenhuma: a devolução vem positiva e é identificada pela operação)',
    count: negAnt.length,
    records: recs(negAnt.map(origem)),
  });
  const devPos = nov.filter(
    (m) => m.classe === 'DEVOLUCAO' && (m.valorMerc ?? 0) > 0,
  );
  if (devPos.length) {
    add({
      code: 'DEVOLUCAO_POSITIVA',
      severity: 'ERRO',
      message: 'Devolução com valor positivo no ERP novo',
      count: devPos.length,
      records: recs(devPos.map(origem)),
    });
  }
  const vendaNeg = nov.filter(
    (m) => m.classe === 'VENDA' && (m.valorMerc ?? 0) < 0,
  );
  if (vendaNeg.length) {
    add({
      code: 'VENDA_NEGATIVA',
      severity: 'ERRO',
      message: 'Venda com valor negativo no ERP novo',
      count: vendaNeg.length,
      records: recs(vendaNeg.map(origem)),
    });
  }
  const zeroQtd = todos.filter((m) => m.qtd === null || m.qtd === 0);
  if (zeroQtd.length) {
    add({
      code: 'ZERO_OU_NULO_QTD_UNIDADES',
      severity: 'AVISO',
      message: 'Linhas com quantidade de unidades zerada ou vazia',
      count: zeroQtd.length,
      records: recs(zeroQtd.map(origem)),
    });
  }
  const zeroVal = todos.filter((m) =>
    m.sistema === 'ERP_NOVO'
      ? m.valorMerc === null || m.valorMerc === 0
      : m.valorOficial === null || m.valorOficial === 0,
  );
  if (zeroVal.length) {
    add({
      code: 'ZERO_OU_NULO_VALOR_MERCADORIA',
      severity: 'AVISO',
      message: 'Linhas com valor da mercadoria zerado ou vazio',
      count: zeroVal.length,
      records: recs(zeroVal.map(origem)),
    });
  }
  const notaMenor = nov.filter(
    (m) =>
      (m.valorMerc ?? 0) > 0 &&
      m.valorNota !== null &&
      m.valorNota < (m.valorMerc ?? 0) - 0.01,
  );
  if (notaMenor.length) {
    add({
      code: 'VALOR_NOTA_MENOR',
      severity: 'AVISO',
      message: 'Valor da nota menor que o valor da mercadoria (ERP novo)',
      count: notaMenor.length,
      records: recs(notaMenor.map(origem)),
    });
  }
  const contagem = new Map<string, number>();
  const idKey = (m: Mov) =>
    [
      m.sistema,
      m.data,
      m.nota,
      m.ean,
      m.cnpj,
      m.qtd,
      m.sistema === 'ERP_NOVO' ? m.valorMerc : m.valorOficial,
      m.pedido,
    ].join('|');
  for (const m of todos)
    contagem.set(idKey(m), (contagem.get(idKey(m)) ?? 0) + 1);
  let identicas = 0;
  for (const n of contagem.values()) if (n > 1) identicas += n;
  add({
    code: 'LINHAS_IDENTICAS',
    severity: 'INFO',
    message:
      'Linhas totalmente idênticas (mesma nota, item, cliente, quantidade e valor): podem ser legítimas (item repetido na nota)',
    count: identicas,
  });

  // classificação sem mapa
  const naoMapAnt = ant.filter((m) => m.classe === 'NAO_MAPEADA');
  if (naoMapAnt.length) {
    const g = new Map<string, { n: number; v: number }>();
    for (const m of naoMapAnt) {
      const k = `${m.opAntiga ?? ''}/${m.cfop ?? ''}`;
      const cur = g.get(k) ?? { n: 0, v: 0 };
      cur.n += 1;
      cur.v += m.valorOficial ?? 0;
      g.set(k, cur);
    }
    add({
      code: 'OPERACAO_NAO_MAPEADA',
      severity: 'AVISO',
      message:
        'Combinações de operação/CFOP do 379 fora da lista de leitura: ignoradas (não entram na base)',
      count: naoMapAnt.length,
      records: recs(
        [...g]
          .sort((a, b) => b[1].v - a[1].v)
          .map(([k, v]) => ({
            key: k,
            info: `${v.n} linhas · R$ ${brl(v.v)}`,
          })),
      ),
    });
  }
  const naoMapNov = nov.filter((m) => m.classe === 'NAO_MAPEADA');
  if (naoMapNov.length) {
    add({
      code: 'TIPO_VENDA_NAO_MAPEADO',
      severity: 'AVISO',
      message:
        'Tipos de venda do 8022 fora da lista (venda, bonificação, devolução, troca): ignorados (não entram na base)',
      count: naoMapNov.length,
      records: recs(
        naoMapNov.map((m) => ({
          key: `${m.arquivo}#${m.linha}`,
          info: m.tipoNovo ?? 'vazio',
        })),
      ),
    });
  }
  const aFaturar = todos.filter((m) => m.situacao === 'A_FATURAR');
  if (aFaturar.length) {
    add({
      code: 'A_FATURAR',
      severity: 'INFO',
      message:
        'Linhas ainda não faturadas: ficam na base com situação A_FATURAR, separadas do faturado',
      count: aFaturar.length,
    });
  }
  const emissaoAntes = nov.filter(
    (m) =>
      m.emissao !== null &&
      m.data !== null &&
      m.emissao.slice(0, 7) < m.data.slice(0, 7),
  );
  add({
    code: 'EMISSAO_FORA_DO_MES_DO_MOVIMENTO',
    severity: 'INFO',
    message:
      'Linhas movimentadas num mês e emitidas em mês anterior: a visão por movimentação e a por emissão dão totais mensais diferentes',
    count: emissaoAntes.length,
  });
  add({
    code: 'DATA_379',
    severity: 'INFO',
    message:
      'No ERP antigo as movimentações são por emissão da nota: data_movimento = data_emissao',
  });
  add({
    code: 'VALOR_OFICIAL',
    severity: 'INFO',
    message:
      'valor_oficial = VALOR NOTA (8022) e Valor (379). A equivalência de produtos entre os ERPs é do motor Produtos.',
  });

  // ---- base final (só o que entra no motor), com sinais
  const rows: BaseRow[] = [];
  const dataParts = (iso: string | null) =>
    iso
      ? ([
          Number(iso.slice(0, 4)),
          Number(iso.slice(5, 7)),
          Number(iso.slice(8, 10)),
        ] as const)
      : ([null, null, null] as const);
  let seq = 0;
  for (const m of todos) {
    if (!NO_MOTOR.has(m.classe)) continue;
    seq += 1;
    const sgn = NEGATIVAS.has(m.classe) ? -1 : 1;
    const signed = (v: Num): Num => (v === null ? null : Math.abs(v) * sgn);
    const [ay, am, ad] = dataParts(m.data);
    const [ey, em, ed] = dataParts(m.emissao);
    rows.push({
      id_movimento: `M${String(seq).padStart(7, '0')}`,
      sistema_origem: m.sistema,
      arquivo_origem: m.arquivo,
      linha_origem: m.linha,
      data_movimento: m.data,
      ano_mov: ay,
      mes_mov: am,
      dia_mov: ad,
      data_emissao: m.emissao,
      ano_emi: ey,
      mes_emi: em,
      dia_emi: ed,
      nota_fiscal: m.nota,
      serie: m.serie,
      pedido: m.pedido === '0' ? null : m.pedido,
      classe_movimento: m.classe,
      situacao_faturamento: m.situacao,
      compoe_liquido: LIQUIDO.has(m.classe) ? 1 : 0,
      cnpj_cpf_cliente: m.cnpj,
      cod_cliente_novo: m.codCliente,
      cod_vendedor_antigo: m.vendAntigo,
      cod_vendedor_novo: m.vendNovo,
      cod_supervisor_novo: m.supNovo,
      ean: m.ean,
      item_codigo_antigo: m.itemAntigo,
      codprod_novo: m.codprod,
      qtd_unidades: signed(m.qtd),
      qtd_caixas: signed(m.qtdCaixas),
      valor_oficial: signed(m.valorOficial),
      valor_mercadoria: m.sistema === 'ERP_ANTIGO' ? null : signed(m.valorMerc),
      desconto: signed(m.desconto),
      icms: signed(m.icms),
      icms_st: signed(m.icmsSt),
      fcp: signed(m.fcp),
      valor_pis: signed(m.pis),
      valor_cofins: signed(m.cofins),
      operacao_antiga: m.opAntiga,
      cfop: m.cfop,
      tipo_novo: m.tipoNovo,
    });
  }

  const ordem = { ERRO: 0, AVISO: 1, INFO: 2 } as const;
  audit.sort((a, b) => ordem[a.severity] - ordem[b.severity]);
  return { engine: 'movimentacoes', columns: SPEC, rows, audit };
}
