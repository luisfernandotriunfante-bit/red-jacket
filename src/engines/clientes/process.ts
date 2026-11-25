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

export type ClientesInput = {
  /** 1203: cadastro de clientes. */
  cadastro1203: Matrix;
  /** Relatório de carteira de clientes (em blocos por vendedor). */
  carteira: Matrix;
  /** Aba ativa da pirâmide. */
  piramide: Matrix;
};

export type ClientesFileNames = {
  cadastro: string;
  carteira: string;
  piramide: string;
};

const MAX_RECORDS = 200;

function cpfOk(d: string): boolean {
  if (d.length !== 11 || d === d[0]?.repeat(11)) return false;
  for (const n of [9, 10]) {
    let s = 0;
    for (let i = 0; i < n; i += 1) s += Number(d[i]) * (n + 1 - i);
    if (((s * 10) % 11) % 10 !== Number(d[n])) return false;
  }
  return true;
}

function cnpjOk(d: string): boolean {
  if (d.length !== 14 || d === d[0]?.repeat(14)) return false;
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, ...w1];
  for (const [ws, pos] of [
    [w1, 12],
    [w2, 13],
  ] as const) {
    let sum = 0;
    for (let i = 0; i < pos; i += 1) sum += Number(d[i]) * (ws[i] ?? 0);
    const r = sum % 11;
    if ((r < 2 ? 0 : 11 - r) !== Number(d[pos])) return false;
  }
  return true;
}

/** CPF = 11 dígitos, CNPJ = 14. Com o tipo informado pelo arquivo, vale o tipo. */
export function doc(value: Cell, tipo?: Cell): string {
  const d = digits(value);
  if (!d) return '';
  const t = key(text(tipo ?? null));
  if (t === 'cnpj') return d.padStart(14, '0');
  if (t === 'cpf') return d.padStart(11, '0');
  if (d.length === 11 || d.length === 14) return d;
  if (d.length > 11) return d.padStart(14, '0');
  const asCpf = d.padStart(11, '0');
  const asCnpj = d.padStart(14, '0');
  if (cpfOk(asCpf) && !cnpjOk(asCnpj)) return asCpf;
  return cnpjOk(asCnpj) ? asCnpj : asCpf;
}

const codc = (v: Cell): string => digits(v).replace(/^0+/, '');

/** Data em AAAA-MM-DD (aceita data do Excel ou texto DD/MM/AAAA). */
function dataIso(v: Cell): string | null {
  if (v === null) return null;
  if (v instanceof Date) {
    const d = new Date(v.getTime() + 12 * 3_600_000);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  }
  const t = text(v);
  const br = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(t);
  if (br) return `${br[3] ?? ''}-${br[2] ?? ''}-${br[1] ?? ''}`;
  return t || null;
}

/** Carteira: o relatório vem em blocos por vendedor; só as linhas de cliente interessam. */
function readCarteira(matrix: Matrix): { table: Table; blocos: number } {
  let headerAt = -1;
  const blocos: number[] = [];
  const rows: Cell[][] = [];
  let header: Cell[] = [];
  matrix.forEach((line, index) => {
    const first = line[0] ?? null;
    if (key(first) === 'codigocliente') {
      headerAt = index;
      header = line;
      return;
    }
    if (headerAt < 0) return;
    const a = text(first);
    const b = text(line[1] ?? null);
    if (a && !b && /^\d+\s*-/.test(a)) {
      blocos.push(index);
      return;
    }
    if (a && /^\d+$/.test(a) && b) rows.push(line);
  });
  if (headerAt < 0) {
    throw new EngineBlockError(
      'carteira: cabeçalho "Código Cliente" não encontrado',
    );
  }
  return {
    table: new Table(
      header.map((c) => text(c)),
      rows,
    ),
    blocos: blocos.length,
  };
}

function records(
  list: { key: string; info?: string }[],
): AuditRecord[] | undefined {
  return list.length ? list.slice(0, MAX_RECORDS) : undefined;
}

export function processClientes(
  input: ClientesInput,
  names: ClientesFileNames,
): EngineResult {
  const audit: AuditItem[] = [];
  const add = (
    code: string,
    severity: AuditItem['severity'],
    message: string,
    count: number,
    recs?: { key: string; info?: string }[],
  ) =>
    audit.push({
      code,
      severity,
      message,
      count,
      records: recs && records(recs),
    });

  // ---------- 1203 ----------
  const t = Table.fromMatrix(input.cadastro1203, [
    'Código',
    'CPF/CNPJ',
    'Nome',
  ]);
  for (const n of ['Código', 'CPF/CNPJ', 'Nome']) t.pos(n, true);
  const rows1203 = t.rows.filter((r) => text(t.get(r, 'Código')) !== '');
  const docs = rows1203.map((r) => doc(t.get(r, 'CPF/CNPJ')));
  if (docs.includes('')) {
    throw new EngineBlockError('cliente do 1203 sem CPF/CNPJ');
  }
  if (new Set(docs).size !== docs.length) {
    throw new EngineBlockError('CPF/CNPJ repetido no 1203');
  }
  const idx = new Map(docs.map((d, i) => [d, i]));

  // ---------- carteira ----------
  const { table: tc } = readCarteira(input.carteira);
  for (const n of ['Código Cliente', 'CNPJ']) tc.pos(n, true);
  const cartLinhas = tc.rows.length;
  const cart = new Map<string, Cell[]>();
  const multi: string[] = [];
  const seenCart = new Set<string>();
  for (const r of tc.rows) {
    const d = doc(tc.get(r, 'CNPJ'));
    if (seenCart.has(d)) {
      if (!multi.includes(d)) multi.push(d);
      continue;
    }
    seenCart.add(d);
    cart.set(d, r);
  }

  // ---------- pirâmide ----------
  const tp = Table.fromMatrix(input.piramide, [
    'COD CLIENTE',
    'FAIXAS',
    'PERFIL',
  ]);
  for (const n of ['COD CLIENTE', 'FAIXAS', 'PERFIL']) tp.pos(n, true);
  const rowsP = tp.rows.filter((r) => text(tp.get(r, 'COD CLIENTE')) !== '');
  const pir = new Map<string, Cell[]>();
  let zerosRepostos = 0;
  for (const r of rowsP) {
    const d = doc(tp.get(r, 'COD CLIENTE'), tp.get(r, 'TIPO'));
    if (pir.has(d)) throw new EngineBlockError('CNPJ repetido na pirâmide');
    pir.set(d, r);
    if (digits(tp.get(r, 'COD CLIENTE')).length < d.length) zerosRepostos += 1;
  }

  const ordem = [...docs, ...[...pir.keys()].filter((d) => !idx.has(d))];
  const cols = SPEC.map((c) => c.name);
  const out: BaseRow[] = [];
  const nomes32: string[] = [];
  const nomeDiv: { key: string; info: string }[] = [];
  const cartCodDiv: { key: string; info: string }[] = [];
  const pirForaDe1203: { key: string; info: string }[] = [];
  let semCompra = 0;
  let pirEm1203 = 0;
  let pirEmCarteira = 0;

  for (const dd of ordem) {
    const row: BaseRow = Object.fromEntries(cols.map((c) => [c, null]));
    const i = idx.get(dd);
    const C = cart.get(dd);
    const P = pir.get(dd);
    const nomes: string[] = [];
    row.cnpj_cpf = dd;
    row.tipo_doc = dd.length === 11 ? 'CPF' : 'CNPJ';
    if (i !== undefined) {
      const r = rows1203[i] ?? [];
      row.cod_cliente = codc(t.get(r, 'Código')) || null;
      const nome = text(t.get(r, 'Nome'));
      nomes.push(nome);
      row.fantasia = text(t.get(r, 'Fantasia')) || null;
      row.cidade = text(t.get(r, 'Município')) || null;
      row.cobranca = text(t.get(r, 'Cobrança')) || null;
      row.dt_vencto_limite_credito = dataIso(t.get(r, 'Dt. vencto lim. créd'));
      row.dt_ult_consulta_serasa = dataIso(
        t.get(r, 'Dt. Ult. Consulta Serasa'),
      );
      row.cod_rca_1203 = codc(t.get(r, 'Cód. RCA')) || null;
      row.rca_1203 = text(t.get(r, 'RCA')) || null;
      row.cod_supervisor_1203 = codc(t.get(r, 'Cód. supervisor')) || null;
      row.supervisor_1203 = text(t.get(r, 'Supervisor')) || null;
      if (nome.length === 32) nomes32.push(dd);
    }
    row.cadastrado_1203 = i !== undefined ? 'SIM' : 'NAO';
    row.orig_cadastro = i !== undefined ? names.cadastro : null;
    if (C) {
      nomes.push(text(tc.get(C, 'Cliente')));
      row.fantasia = row.fantasia ?? (text(tc.get(C, 'Fantasia')) || null);
      row.cidade = row.cidade ?? (text(tc.get(C, 'Cidade')) || null);
      row.bairro = text(tc.get(C, 'Bairro')) || null;
      row.endereco = text(tc.get(C, 'Endereço')) || null;
      row.latitude = num(tc.get(C, 'Latitude'));
      row.longitude = num(tc.get(C, 'Longitude'));
      row.atividade_cod = codc(tc.get(C, 'Atividade Comercial')) || null;
      row.telefone = digits(tc.get(C, 'Telefone')).replace(/^0+/, '') || null;
      const ds = num(tc.get(C, 'Dias Sem Comprar'));
      if (ds === null) semCompra += 1;
      row.dias_sem_comprar = ds;
      row.orig_carteira = names.carteira;
      if (
        i !== undefined &&
        codc(tc.get(C, 'Código Cliente')) !== row.cod_cliente
      ) {
        cartCodDiv.push({
          key: dd,
          info: `carteira ${codc(tc.get(C, 'Código Cliente'))} × 1203 ${String(row.cod_cliente)}`,
        });
      }
    }
    row.em_carteira_colgate = C ? 'SIM' : 'NAO';
    if (P) {
      nomes.push(text(tp.get(P, 'NOME_CLIENTE')));
      row.cidade = row.cidade ?? (text(tp.get(P, 'CIDADE')) || null);
      row.faixa = text(tp.get(P, 'FAIXAS')) || null;
      row.perfil = text(tp.get(P, 'PERFIL')) || null;
      row.ambiente = text(tp.get(P, 'AMBIENTE')) || null;
      row.cluster_cod = codc(tp.get(P, 'IND_CLUSTER_COD')) || null;
      row.cluster_desc = text(tp.get(P, 'IND_CLUSTER_DESC')) || null;
      row.rede = text(tp.get(P, 'REDE')) || null;
      row.area_nielsen = text(tp.get(P, 'AREA NIELSEN')) || null;
      row.check_pdv = text(tp.get(P, 'CHECK PDV')) || null;
      const v3 = num(tp.get(P, 'Ult. 3 meses'));
      row.venda_3_meses = v3 === null ? null : Math.round(v3 * 100) / 100;
      row.orig_piramide = names.piramide;
      if (i !== undefined) pirEm1203 += 1;
      else
        pirForaDe1203.push({ key: dd, info: text(tp.get(P, 'NOME_CLIENTE')) });
      if (C) pirEmCarteira += 1;
    }
    row.na_piramide = P ? 'SIM' : 'NAO';
    const nm = nomes.filter((n) => n);
    if (nm.length) {
      const maior = nm.reduce((a, b) => (b.length > a.length ? b : a));
      if (nm.every((x) => key(maior).startsWith(key(x)))) row.nome = maior;
      else {
        row.nome = nm[0] ?? null;
        nomeDiv.push({ key: dd, info: nm.join(' | ') });
      }
    }
    out.push(row);
  }

  const cartFora = [...cart.keys()].filter((d) => !idx.has(d) && !pir.has(d));

  add(
    'C01',
    'INFO',
    'Clientes na base (1203 + pirâmide fora do 1203)',
    out.length,
  );
  add('C02', 'INFO', 'Clientes no 1203', docs.length);
  add('C03', 'INFO', 'Linhas da carteira', cartLinhas);
  add('C04', 'INFO', 'Clientes distintos na carteira', cart.size);
  add(
    'C05',
    'INFO',
    'Clientes na carteira com mais de uma linha (vale a primeira)',
    multi.length,
  );
  add('C06', 'INFO', 'Linhas da pirâmide', rowsP.length);
  add('C07', 'INFO', 'Clientes da pirâmide que estão no 1203', pirEm1203);
  add(
    'C08',
    'INFO',
    'Clientes da pirâmide que também estão na carteira',
    pirEmCarteira,
  );
  add(
    'C09',
    'INFO',
    'Documentos da pirâmide com zeros à esquerda repostos',
    zerosRepostos,
  );
  add(
    'C10',
    'INFO',
    'Carteira: clientes sem compra (dias sem comprar vazio)',
    semCompra,
  );
  add(
    'C11',
    'INFO',
    'Nomes do 1203 com 32 caracteres (podem estar cortados)',
    nomes32.length,
  );
  if (pirForaDe1203.length)
    add(
      'C12',
      'AVISO',
      'Cliente da pirâmide que não está cadastrado no 1203',
      pirForaDe1203.length,
      pirForaDe1203,
    );
  if (cartFora.length)
    add(
      'C13',
      'AVISO',
      'Cliente da carteira fora do 1203 e fora da pirâmide',
      cartFora.length,
      cartFora.map((k) => ({ key: k })),
    );
  if (cartCodDiv.length)
    add(
      'C14',
      'AVISO',
      'Código do cliente na carteira diferente do 1203',
      cartCodDiv.length,
      cartCodDiv,
    );
  if (nomeDiv.length)
    add(
      'C15',
      'AVISO',
      'Nome diferente entre os arquivos (vale a ordem 1203 > carteira > pirâmide)',
      nomeDiv.length,
      nomeDiv,
    );

  return { engine: 'clientes', columns: SPEC, rows: out, audit };
}
