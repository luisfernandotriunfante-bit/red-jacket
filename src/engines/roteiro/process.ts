import { cnpjOk, cpfOk } from '../core/documents';
import { digits, text, unaccent } from '../core/normalize';
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

export type RoteiroInput = {
  matrix: Matrix;
  /** Base do motor Clientes (opcional: sem ela a conferência de clientes não é feita). */
  clientes: BaseRow[];
};

const ARQUIVO = 'roteiro_consolidado_geral.xls';
const MAX_RECORDS = 200;

const ALIAS: Record<string, string> = {
  CODIGO: 'cod_rca',
  NOME: 'nome_rca',
  'CODIGO CLIENTE': 'cod_cliente',
  CNPJ: 'cnpj_cpf_cliente',
  'RAZAO SOCIAL': 'razao_social',
  FANTASIA: 'fantasia',
  CIDADE: 'cidade',
  BAIRRO: 'bairro',
  ENDERECO: 'endereco',
  'CODIGO RECORRENCIA': 'cod_recorrencia',
  RECORRENCIA: 'recorrencia',
  'DATA DA VISITA': 'data_visita',
  'CODIGO DIA DA SEMANA': 'cod_dia_semana',
  'DIA DA SEMANA': 'dia_semana',
};
const REQ = [
  'cod_rca',
  'cod_cliente',
  'cnpj_cpf_cliente',
  'recorrencia',
  'data_visita',
  'dia_semana',
];
const DIAS = new Set([
  'SEGUNDA',
  'TERCA',
  'QUARTA',
  'QUINTA',
  'SEXTA',
  'SABADO',
  'DOMINGO',
]);
const SEMANA = [
  'DOMINGO',
  'SEGUNDA',
  'TERCA',
  'QUARTA',
  'QUINTA',
  'SEXTA',
  'SABADO',
];

function normHeader(value: Cell): string {
  return unaccent(text(value))
    .toUpperCase()
    .replace(/[^A-Z0-9%]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanText(value: Cell): string | null {
  const t = text(value);
  if (!t) return null;
  return (
    unaccent(t)
      .toUpperCase()
      .replace(/\.{3,}/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || null
  );
}

function normCode(value: Cell): string | null {
  const d = digits(value);
  if (!d) return null;
  return d.replace(/^0+/, '') || '0';
}

/** CNPJ/CPF só com dígitos: mais de 11 dígitos = CNPJ (14); até 11 = CPF, salvo CNPJ que perdeu zeros. */
function normDoc(value: Cell): string | null {
  const raw = digits(value);
  if (!raw) return null;
  const d = raw.replace(/^0+/, '') || '0';
  if (d.length > 11) return d.padStart(14, '0');
  const c = d.padStart(11, '0');
  const j = d.padStart(14, '0');
  return !cpfOk(c) && cnpjOk(j) ? j : c;
}

/** Data DD/MM/AAAA (texto) ou data do Excel → AAAA-MM-DD. */
function isoDate(value: Cell): string | null {
  if (value instanceof Date) {
    const d = new Date(value.getTime() + 12 * 3_600_000);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  }
  const t = text(value);
  const br = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(t);
  if (br) return `${br[3] ?? ''}-${br[2] ?? ''}-${br[1] ?? ''}`;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  return iso ? `${iso[1] ?? ''}-${iso[2] ?? ''}-${iso[3] ?? ''}` : null;
}

function weekday(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return (
    SEMANA[new Date(Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1)).getUTCDay()] ?? ''
  );
}

type Visita = {
  linha: number;
  data: string | null;
  codRca: string | null;
  nomeRca: string | null;
  codCliente: string | null;
  cnpj: string | null;
  razao: string | null;
  fantasia: string | null;
  cidade: string | null;
  bairro: string | null;
  endereco: string | null;
  codRecorrencia: string | null;
  recorrencia: string | null;
  codDia: string | null;
  dia: string | null;
};

const recs = (list: AuditRecord[]): AuditRecord[] | undefined =>
  list.length ? list.slice(0, MAX_RECORDS) : undefined;

const cmp = (a: string | null, b: string | null) =>
  (a ?? '') < (b ?? '') ? -1 : (a ?? '') > (b ?? '') ? 1 : 0;

export function processRoteiro(input: RoteiroInput): EngineResult {
  const audit: AuditItem[] = [];
  const add = (a: AuditItem) => audit.push(a);
  const x = input.matrix;

  // ---------- cabeçalho ----------
  let h = -1;
  for (let i = 0; i < Math.min(30, x.length); i += 1) {
    const hn = new Set(
      (x[i] ?? []).filter((v) => typeof v === 'string').map(normHeader),
    );
    if (
      hn.has('CODIGO CLIENTE') &&
      hn.has('DATA DA VISITA') &&
      hn.has('CNPJ')
    ) {
      h = i;
      break;
    }
  }
  if (h < 0) {
    throw new EngineBlockError(
      'cabeçalho (Código Cliente / CNPJ / Data da Visita) não encontrado',
    );
  }
  let periodo = '?';
  for (let i = 0; i < h; i += 1) {
    const strs = (x[i] ?? []).filter((c): c is string => typeof c === 'string');
    if (strs.includes('Data Inicial') && i + 1 < x.length) {
      periodo = `${text(x[i + 1]?.[0] ?? null)} a ${text(x[i + 1]?.[1] ?? null)}`;
    }
  }
  const cols = new Map<number, string>();
  (x[h] ?? []).forEach((v, j) => {
    if (typeof v !== 'string') return;
    const n = normHeader(v);
    const alias = ALIAS[n];
    if (alias && ![...cols.values()].includes(alias)) cols.set(j, alias);
    else if (!alias)
      add({
        code: 'COLUNA_NOVA',
        severity: 'AVISO',
        message: 'Coluna não prevista no roteiro',
        count: 1,
        records: [{ key: v }],
      });
  });
  const falt = REQ.filter((r) => ![...cols.values()].includes(r));
  if (falt.length) {
    throw new EngineBlockError(
      `faltam colunas obrigatórias: ${falt.join(', ')}`,
    );
  }
  const ult = Math.max(...cols.keys());
  const idx = (alias: string) =>
    [...cols.entries()].find(([, a]) => a === alias)?.[0];

  // ---------- corpo ----------
  const visitas: Visita[] = [];
  for (let i = h + 1; i < x.length; i += 1) {
    const row = x[i] ?? [];
    const g = (alias: string): Cell => {
      const p = idx(alias);
      return p === undefined ? null : (row[p] ?? null);
    };
    if (g('data_visita') === null && g('cnpj_cpf_cliente') === null) continue;
    visitas.push({
      linha: i + 1,
      data: isoDate(g('data_visita')),
      codRca: normCode(g('cod_rca')),
      nomeRca: cleanText(g('nome_rca')),
      codCliente: normCode(g('cod_cliente')),
      cnpj: normDoc(g('cnpj_cpf_cliente')),
      razao: cleanText(g('razao_social')),
      fantasia: cleanText(g('fantasia')),
      cidade: cleanText(g('cidade')),
      bairro: cleanText(g('bairro')),
      endereco: cleanText(g('endereco')),
      codRecorrencia: normCode(g('cod_recorrencia')),
      recorrencia: cleanText(g('recorrencia')),
      codDia: normCode(g('cod_dia_semana')),
      dia: cleanText(g('dia_semana')),
    });
  }

  // ---------- totais do relatório (tabela à direita do corpo) ----------
  const width = Math.max(...x.map((r) => r.length));
  const tot = new Map<string, number>();
  for (const row of x) {
    for (let j = ult + 1; j < width - 1; j += 1) {
      const v = row[j] ?? null;
      const w = row[j + 1] ?? null;
      if (
        typeof v === 'string' &&
        v.trim() &&
        v.trim() !== 'Totais' &&
        typeof w === 'number'
      ) {
        tot.set(cleanText(v) ?? '', Math.trunc(w));
      }
    }
  }
  if (tot.size) {
    const diffs: AuditRecord[] = [];
    for (const [k, v] of tot) {
      let got: number;
      if (['SEMANAL', 'QUINZENAL', '21 DIAS', '28 DIAS'].includes(k))
        got = visitas.filter((r) => r.recorrencia === k).length;
      else if (DIAS.has(k)) got = visitas.filter((r) => r.dia === k).length;
      else continue;
      if (got !== v)
        diffs.push({ key: k, info: `lido ${got} × relatório ${v}` });
    }
    if (diffs.length)
      add({
        code: 'TOTAL_DO_RELATORIO_DIVERGE',
        severity: 'ERRO',
        message: 'Total do relatório diferente das linhas lidas',
        count: diffs.length,
        records: recs(diffs),
      });
    add({
      code: 'TOTAIS_DO_RELATORIO',
      severity: 'INFO',
      message:
        'Totais do relatório (recorrência e dia da semana) conferidos contra as linhas lidas',
      count: tot.size,
    });
  }
  add({
    code: 'LINHAS_LIDAS',
    severity: 'INFO',
    message: `Visitas lidas (período do relatório ${periodo})`,
    count: visitas.length,
  });

  const bad = visitas.filter((v) => !v.data || !v.cnpj || !v.codRca);
  if (bad.length)
    add({
      code: 'LINHA_INVALIDA',
      severity: 'ERRO',
      message: 'Linhas sem data, CNPJ/CPF ou código do RCA',
      count: bad.length,
      records: recs(bad.map((v) => ({ key: String(v.linha) }))),
    });
  const dv = visitas.filter((v) => v.data && weekday(v.data) !== v.dia);
  add({
    code: 'DIA_DA_SEMANA_DIVERGE_DA_DATA',
    severity: dv.length ? 'ERRO' : 'INFO',
    message: 'Linhas cujo dia da semana não é o da data da visita',
    count: dv.length,
    records: recs(
      dv.map((v) => ({
        key: String(v.linha),
        info: `${v.data ?? ''} × ${v.dia ?? ''}`,
      })),
    ),
  });

  // ---------- repetição ----------
  const seen = new Set<string>();
  const dupes: AuditRecord[] = [];
  const unicas: Visita[] = [];
  for (const v of visitas) {
    const k = `${v.codRca ?? ''}/${v.codCliente ?? ''}/${v.data ?? ''}`;
    if (seen.has(k)) dupes.push({ key: k, info: `linha ${v.linha}` });
    else {
      seen.add(k);
      unicas.push(v);
    }
  }
  add({
    code: 'VISITA_REPETIDA',
    severity: dupes.length ? 'AVISO' : 'INFO',
    message:
      'Visitas repetidas (mesmo RCA, cliente e data): mantida a primeira',
    count: dupes.length,
    records: recs(dupes),
  });

  // ---------- consistência ----------
  const cpfs = new Set(
    unicas.filter((v) => v.cnpj?.length === 11).map((v) => v.cnpj),
  );
  if (cpfs.size)
    add({
      code: 'CPF_NO_ROTEIRO',
      severity: 'INFO',
      message: 'Clientes com documento de 11 dígitos (CPF válido)',
      count: cpfs.size,
    });
  const groupSets = (
    keyOf: (v: Visita) => string | null,
    valOf: (v: Visita) => string | null,
  ) => {
    const m = new Map<string, Set<string>>();
    for (const v of unicas) {
      const k = keyOf(v);
      const val = valOf(v);
      if (k === null || val === null) continue;
      const set = m.get(k);
      if (set) set.add(val);
      else m.set(k, new Set([val]));
    }
    return [...m.entries()].filter(([, s]) => s.size > 1);
  };
  const cc = groupSets(
    (v) => v.codCliente,
    (v) => v.cnpj,
  );
  const cn = groupSets(
    (v) => v.cnpj,
    (v) => v.codCliente,
  );
  if (cc.length || cn.length)
    add({
      code: 'CLIENTE_COM_VARIOS_CODIGOS',
      severity: 'AVISO',
      message:
        'Código de cliente com mais de um CNPJ, ou CNPJ com mais de um código',
      count: cc.length + cn.length,
      records: recs([
        ...cc.map(([k, s]) => ({
          key: k,
          info: `código com CNPJs ${[...s].join(', ')}`,
        })),
        ...cn.map(([k, s]) => ({
          key: k,
          info: `CNPJ com códigos ${[...s].join(', ')}`,
        })),
      ]),
    });
  const rc = groupSets(
    (v) =>
      v.codRca !== null && v.codCliente !== null
        ? `${v.codRca}/${v.codCliente}`
        : null,
    (v) => v.recorrencia,
  );
  if (rc.length)
    add({
      code: 'PAR_COM_MAIS_DE_UMA_RECORRENCIA',
      severity: 'AVISO',
      message: 'RCA e cliente com mais de uma recorrência no período',
      count: rc.length,
      records: recs(rc.map(([k, s]) => ({ key: k, info: [...s].join(', ') }))),
    });
  const naoNominal = unicas.filter((v) =>
    /VAGO|INTERNO|GERENTE/.test(v.nomeRca ?? ''),
  );
  if (naoNominal.length) {
    const porRca = new Map<string, { nome: string; n: number }>();
    for (const v of naoNominal) {
      const k = v.codRca ?? '';
      const cur = porRca.get(k);
      if (cur) cur.n += 1;
      else porRca.set(k, { nome: v.nomeRca ?? '', n: 1 });
    }
    add({
      code: 'RCA_NAO_NOMINAL',
      severity: 'INFO',
      message: 'RCA sem pessoa nominal (VAGO, INTERNO, GERENTE)',
      count: porRca.size,
      records: recs(
        [...porRca].map(([k, v]) => ({
          key: k,
          info: `${v.nome}: ${v.n} visitas`,
        })),
      ),
    });
  }

  // ---------- conferência com o motor Clientes ----------
  if (input.clientes.length) {
    const s = new Set(input.clientes.map((c) => String(c.cnpj_cpf ?? '')));
    const docs = new Map<string, string | null>();
    for (const v of unicas)
      if (v.cnpj && !docs.has(v.cnpj)) docs.set(v.cnpj, v.razao);
    const fora = [...docs].filter(([d]) => !s.has(d));
    add({
      code: 'CLIENTE_DO_ROTEIRO_FORA_DO_MOTOR_CLIENTES',
      severity: fora.length ? 'AVISO' : 'INFO',
      message:
        'Clientes do roteiro que não existem no motor de Clientes (nem no 1203, nem na pirâmide)',
      count: fora.length,
      records: recs(fora.map(([d, r]) => ({ key: d, info: r ?? undefined }))),
    });
    add({
      code: 'CLIENTES_DO_ROTEIRO_NO_MOTOR_CLIENTES',
      severity: 'INFO',
      message: 'Clientes do roteiro que existem no motor de Clientes',
      count: docs.size - fora.length,
    });
  } else {
    add({
      code: 'MOTOR_CLIENTES_SEM_BASE',
      severity: 'AVISO',
      message:
        'Base do motor Clientes vazia: conferência dos clientes do roteiro não feita',
      count: 1,
    });
  }

  // ---------- base ----------
  const ordenadas = [...unicas].sort(
    (a, b) =>
      cmp(a.data, b.data) ||
      cmp(a.codRca, b.codRca) ||
      cmp(a.codCliente, b.codCliente),
  );
  const rows: BaseRow[] = ordenadas.map((v, i) => {
    const [y, m, d] = (v.data ?? '').split('-').map(Number);
    return {
      id_visita: `V${String(i + 1).padStart(6, '0')}`,
      arquivo_origem: ARQUIVO,
      linha_origem: v.linha,
      data_visita: v.data,
      ano_visita: v.data ? (y ?? null) : null,
      mes_visita: v.data ? (m ?? null) : null,
      dia_visita: v.data ? (d ?? null) : null,
      cod_dia_semana: v.codDia,
      dia_semana: v.dia,
      cod_recorrencia: v.codRecorrencia,
      recorrencia: v.recorrencia,
      cod_rca: v.codRca,
      nome_rca: v.nomeRca,
      cod_cliente: v.codCliente,
      cnpj_cpf_cliente: v.cnpj,
      razao_social: v.razao,
      fantasia: v.fantasia,
      cidade: v.cidade,
      bairro: v.bairro,
      endereco: v.endereco,
    };
  });
  add({
    code: 'VISITAS_NA_BASE',
    severity: 'INFO',
    message: 'Visitas na base',
    count: rows.length,
  });
  return { engine: 'roteiro', columns: SPEC, rows, audit };
}
