import type { AuditItem, BaseRow, ColumnSpec, EngineResult } from './types';

/**
 * Camada de vendedores: liga o código de vendedor que vem nos relatórios (ERP novo ou
 * antigo) ao vendedor cadastrado em Equipes, com a equipe atual e a situação.
 * Nunca recusa linha: código sem cadastro vira caso de auditoria, não erro.
 */
export type Vendedor = {
  id: string;
  nome: string;
  equipeCod: string;
  equipeNome: string;
  ativo: boolean;
  /** Código no ERP novo (obrigatório no cadastro). */
  codNovo: string;
  /** Códigos no ERP antigo (RPC): o principal e os extras. */
  codsAntigos: string[];
};

export type OrigemCodigo = 'CODIGO_NOVO' | 'CODIGO_ANTIGO' | 'SEM_CADASTRO';

export type VendedorIndex = {
  novos: Map<string, Vendedor>;
  antigos: Map<string, Vendedor>;
  /** Códigos que o cadastro atribui a mais de um vendedor (vale o primeiro). */
  conflitos: string[];
  total: number;
};

/** Código comparável: números sem zeros à esquerda, textos em maiúsculas. */
export function normVendCode(
  value: string | number | null | undefined,
): string | null {
  const s = String(value ?? '')
    .trim()
    .toUpperCase();
  if (!s) return null;
  return /^\d+$/.test(s) ? s.replace(/^0+/, '') || '0' : s;
}

export function indexarVendedores(lista: Vendedor[]): VendedorIndex {
  const novos = new Map<string, Vendedor>();
  const antigos = new Map<string, Vendedor>();
  const conflitos: string[] = [];
  const registra = (
    mapa: Map<string, Vendedor>,
    codigo: string,
    v: Vendedor,
    rotulo: string,
  ) => {
    const k = normVendCode(codigo);
    if (!k) return;
    const atual = mapa.get(k);
    if (atual && atual.id !== v.id) {
      conflitos.push(`${rotulo} ${k}: ${atual.nome} e ${v.nome}`);
      return;
    }
    mapa.set(k, v);
  };
  for (const v of lista) {
    registra(novos, v.codNovo, v, 'código novo');
    for (const c of v.codsAntigos) registra(antigos, c, v, 'código antigo');
  }
  return { novos, antigos, conflitos, total: lista.length };
}

export type VendedorResolvido = {
  vendedor: Vendedor | null;
  origem: OrigemCodigo;
};

/** O código novo vale primeiro (linhas do ERP novo); senão tenta o antigo. */
export function resolverVendedor(
  index: VendedorIndex,
  novo: string | number | null | undefined,
  antigo: string | number | null | undefined,
): VendedorResolvido {
  const kn = normVendCode(novo);
  if (kn) {
    const v = index.novos.get(kn);
    if (v) return { vendedor: v, origem: 'CODIGO_NOVO' };
  }
  const ka = normVendCode(antigo);
  if (ka) {
    const v = index.antigos.get(ka);
    if (v) return { vendedor: v, origem: 'CODIGO_ANTIGO' };
  }
  return { vendedor: null, origem: 'SEM_CADASTRO' };
}

export const COLUNAS_VENDEDOR: ColumnSpec[] = [
  {
    group: 'Vendedor (Equipes)',
    name: 'vendedor_id',
    source:
      'Cadastro de vendedores (Equipes); vazio se o código não está cadastrado',
  },
  {
    group: 'Vendedor (Equipes)',
    name: 'vendedor_cod',
    source: 'Código atual (ERP novo) do vendedor cadastrado',
  },
  {
    group: 'Vendedor (Equipes)',
    name: 'vendedor_nome',
    source: 'Nome no cadastro de Equipes',
  },
  {
    group: 'Vendedor (Equipes)',
    name: 'equipe_cod',
    source: 'Código do supervisor da equipe atual do vendedor',
  },
  {
    group: 'Vendedor (Equipes)',
    name: 'equipe_nome',
    source: 'Nome do supervisor da equipe atual',
  },
  {
    group: 'Vendedor (Equipes)',
    name: 'vendedor_situacao',
    source: 'ATIVO | INATIVO | SEM_CADASTRO',
  },
  {
    group: 'Vendedor (Equipes)',
    name: 'vendedor_origem',
    source:
      'CODIGO_NOVO | CODIGO_ANTIGO (mesmo vendedor, só mudou de código) | SEM_CADASTRO',
  },
];

export function camposVendedor(r: VendedorResolvido): BaseRow {
  const v = r.vendedor;
  return {
    vendedor_id: v?.id ?? null,
    vendedor_cod: v?.codNovo ?? null,
    vendedor_nome: v?.nome ?? null,
    equipe_cod: v?.equipeCod ?? null,
    equipe_nome: v?.equipeNome ?? null,
    vendedor_situacao: v ? (v.ativo ? 'ATIVO' : 'INATIVO') : 'SEM_CADASTRO',
    vendedor_origem: r.origem,
  };
}

export type RegistroVendedor = {
  /** Código como veio no relatório. */
  codigo: string | null;
  origem: OrigemCodigo;
  vendedor: Vendedor | null;
  /** Data ISO (AAAA-MM-DD) da movimentação/visita, se houver. */
  data: string | null;
  valor: number;
};

const DIAS_RECENTE = 30;

function menosDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - dias);
  return d.toISOString().slice(0, 10);
}

const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/**
 * Casos de auditoria da camada de vendedores:
 * - código sem cadastro (AVISO);
 * - vendedor inativo com venda recente (AVISO);
 * - vendedor ativo sem venda recente (INFO);
 * - códigos repetidos no cadastro (AVISO).
 * "Recente" = últimos 30 dias da própria base (não do relógio).
 */
export function auditoriaVendedores(
  registros: RegistroVendedor[],
  index: VendedorIndex,
  opcoes: { contarAtivosSemVenda: boolean } = { contarAtivosSemVenda: true },
): AuditItem[] {
  const audit: AuditItem[] = [];
  if (index.total === 0) {
    audit.push({
      code: 'TABELA_VENDEDORES_VAZIA',
      severity: 'AVISO',
      message:
        'Não há vendedores cadastrados em Equipes: nenhuma linha foi ligada a vendedor ou equipe',
    });
    return audit;
  }
  if (index.conflitos.length) {
    audit.push({
      code: 'CODIGO_VENDEDOR_REPETIDO',
      severity: 'AVISO',
      message:
        'O mesmo código de vendedor está cadastrado em mais de um vendedor (vale o primeiro)',
      count: index.conflitos.length,
      records: index.conflitos
        .slice(0, 200)
        .map((c) => ({ key: c.split(':')[0] ?? c, info: c })),
    });
  }

  // sem cadastro
  const semCadastro = new Map<string, { n: number; valor: number }>();
  for (const r of registros) {
    if (r.vendedor || !r.codigo) continue;
    const k = r.codigo;
    const a = semCadastro.get(k) ?? { n: 0, valor: 0 };
    a.n += 1;
    a.valor += r.valor;
    semCadastro.set(k, a);
  }
  if (semCadastro.size) {
    const lista = [...semCadastro.entries()].sort((a, b) => b[1].n - a[1].n);
    audit.push({
      code: 'VENDEDOR_SEM_CADASTRO',
      severity: 'AVISO',
      message:
        'Código de vendedor que não está cadastrado em Equipes (a venda segue na base, sem equipe)',
      count: lista.length,
      records: lista.slice(0, 200).map(([codigo, a]) => ({
        key: codigo,
        info: `${a.n} linha(s) · ${brl(a.valor)}`,
      })),
    });
  }

  // datas de referência
  let ref: string | null = null;
  for (const r of registros) if (r.data && (!ref || r.data > ref)) ref = r.data;
  if (!ref) return audit;
  const corte = menosDias(ref, DIAS_RECENTE);

  const ultima = new Map<string, string>();
  for (const r of registros) {
    if (!r.vendedor || !r.data) continue;
    const atual = ultima.get(r.vendedor.id);
    if (!atual || r.data > atual) ultima.set(r.vendedor.id, r.data);
  }
  const vistos = new Map<string, Vendedor>();
  for (const v of index.novos.values()) vistos.set(v.id, v);
  for (const v of index.antigos.values()) vistos.set(v.id, v);

  const inativosComVenda: { key: string; info: string }[] = [];
  const ativosSemVenda: { key: string; info: string }[] = [];
  for (const v of vistos.values()) {
    const ult = ultima.get(v.id) ?? null;
    if (!v.ativo && ult && ult >= corte)
      inativosComVenda.push({
        key: v.codNovo,
        info: `${v.nome}: última movimentação em ${ult}`,
      });
    const historico = v.codNovo.startsWith('ANT-');
    if (v.ativo && !historico && (!ult || ult < corte))
      ativosSemVenda.push({
        key: v.codNovo,
        info: ult
          ? `${v.nome}: última movimentação em ${ult}`
          : `${v.nome}: sem movimentação na base`,
      });
  }
  if (inativosComVenda.length)
    audit.push({
      code: 'VENDEDOR_INATIVO_COM_VENDA_RECENTE',
      severity: 'AVISO',
      message: `Vendedor marcado como inativo com movimentação nos últimos ${DIAS_RECENTE} dias da base`,
      count: inativosComVenda.length,
      records: inativosComVenda.slice(0, 200),
    });
  if (opcoes.contarAtivosSemVenda && ativosSemVenda.length)
    audit.push({
      code: 'VENDEDOR_ATIVO_SEM_VENDA_RECENTE',
      severity: 'INFO',
      message: `Vendedor ativo sem movimentação nos últimos ${DIAS_RECENTE} dias da base`,
      count: ativosSemVenda.length,
      records: ativosSemVenda.slice(0, 200),
    });
  return audit;
}

/**
 * Liga um motor que só tem o código do vendedor (Clientes, Roteiro) ao cadastro de Equipes.
 * `ignorar`: códigos que não são vendedor (ex.: "2" = venda das indústrias).
 */
export function enriquecerComVendedor(
  result: EngineResult,
  vendedores: Vendedor[],
  coluna: string,
  ignorar: string[] = [],
): EngineResult {
  const index = indexarVendedores(vendedores);
  const pular = new Set(ignorar.map((c) => normVendCode(c)));
  const registros: RegistroVendedor[] = [];
  const rows = result.rows.map((row) => {
    const bruto = row[coluna];
    const codigo = bruto === null || bruto === undefined ? null : String(bruto);
    const k = normVendCode(codigo);
    if (!k || pular.has(k))
      return {
        ...row,
        ...camposVendedor({ vendedor: null, origem: 'SEM_CADASTRO' }),
        vendedor_situacao: null,
        vendedor_origem: null,
      };
    const r = resolverVendedor(index, codigo, codigo);
    registros.push({
      codigo,
      origem: r.origem,
      vendedor: r.vendedor,
      data: null,
      valor: 0,
    });
    return { ...row, ...camposVendedor(r) };
  });
  const audit = auditoriaVendedores(registros, index, {
    contarAtivosSemVenda: false,
  });
  return {
    ...result,
    columns: [...result.columns, ...COLUNAS_VENDEDOR],
    rows,
    audit: [...result.audit, ...audit],
  };
}
