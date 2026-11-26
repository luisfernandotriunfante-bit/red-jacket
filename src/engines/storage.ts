import { supabase } from '../features/auth/supabase';
import type { AuditItem, BaseRow, EngineResult } from './core/types';

export type SourceInfo = { slot: string; fileName: string };

export type EngineRunSummary = {
  id: string;
  engine: string;
  rowCount: number;
  audit: AuditItem[];
  sources: SourceInfo[];
  createdAt: string;
};

export type EngineAuditCase = {
  id: string;
  runId: string;
  engine: string;
  code: string;
  severity: 'ERRO' | 'AVISO';
  message: string;
  count: number | null;
  records: { key: string; info?: string }[];
  status: 'aberto' | 'em_analise' | 'tratado' | 'ignorado';
  note: string | null;
  createdAt: string;
  treatedAt: string | null;
};

function requireClient() {
  if (!supabase) throw new Error('Supabase não configurado.');
  return supabase;
}

/** Ocorrências reais geradas pelos processamentos dos motores. */
export async function listAuditCases(): Promise<EngineAuditCase[]> {
  const client = requireClient();
  const response = await client
    .from('engine_audit_items')
    .select(
      'id, run_id, engine, code, severity, message, count, records, status, note, created_at, treated_at',
    )
    .order('created_at', { ascending: false })
    .limit(250);
  if (response.error) throw new Error(response.error.message);
  if (!Array.isArray(response.data)) return [];
  return (response.data as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    runId: String(row.run_id),
    engine: String(row.engine),
    code: String(row.code),
    severity: row.severity === 'ERRO' ? 'ERRO' : 'AVISO',
    message: String(row.message),
    count: row.count == null ? null : Number(row.count),
    records: Array.isArray(row.records)
      ? (row.records as { key: string; info?: string }[])
      : [],
    status:
      row.status === 'em_analise' ||
      row.status === 'tratado' ||
      row.status === 'ignorado'
        ? row.status
        : 'aberto',
    note: typeof row.note === 'string' ? row.note : null,
    createdAt: String(row.created_at),
    treatedAt: typeof row.treated_at === 'string' ? row.treated_at : null,
  }));
}

/** Atualiza o tratamento de uma ocorrência sem alterar o processamento original. */
export async function updateAuditCaseStatus(
  id: string,
  status: EngineAuditCase['status'],
): Promise<void> {
  const client = requireClient();
  const auth = await client.auth.getUser();
  if (auth.error) throw new Error(auth.error.message);
  const finished = status === 'tratado' || status === 'ignorado';
  const response = await client
    .from('engine_audit_items')
    .update({
      status,
      treated_by: finished ? (auth.data.user?.id ?? null) : null,
      treated_at: finished ? new Date().toISOString() : null,
    })
    .eq('id', id);
  if (response.error) throw new Error(response.error.message);
}

/** Chave de cada linha da base (a primeira coluna que identifica o registro). */
export function rowKey(
  row: Record<string, unknown>,
  keyColumn: string,
  index: number,
) {
  const value = row[keyColumn];
  return typeof value === 'string' && value !== ''
    ? value
    : `linha-${index + 1}`;
}

/** Troca a base do motor por inteiro (transação única no banco). */
export async function saveEngineBase(
  result: EngineResult,
  keyColumn: string,
  sources: SourceInfo[],
): Promise<string> {
  const client = requireClient();
  const seen = new Set<string>();
  const rows = result.rows.map((data, index) => {
    const key = rowKey(data, keyColumn, index);
    if (seen.has(key)) throw new Error(`Chave repetida na base: ${key}`);
    seen.add(key);
    return { key, data };
  });
  const response = await client.rpc('replace_engine_base', {
    p_engine: result.engine,
    p_columns: result.columns,
    p_audit: result.audit,
    p_sources: sources,
    p_rows: rows,
  });
  if (response.error) throw new Error(response.error.message);
  const runId: unknown = response.data;
  return typeof runId === 'string' ? runId : '';
}

const CHUNK_ROWS = 2000;

function keyedRows(result: EngineResult, keyColumn: string) {
  const seen = new Set<string>();
  return result.rows.map((data, index) => {
    const key = rowKey(data, keyColumn, index);
    if (seen.has(key)) throw new Error(`Chave repetida na base: ${key}`);
    seen.add(key);
    return { key, data };
  });
}

/**
 * Grava bases grandes em lotes: a versão anterior continua valendo até a nova ser finalizada
 * (contagem conferida no banco). Só depois as linhas antigas são apagadas, em pedaços.
 */
export async function saveEngineBaseChunked(
  result: EngineResult,
  keyColumn: string,
  sources: SourceInfo[],
  onProgress: (message: string, fraction?: number) => void = () => undefined,
): Promise<string> {
  const client = requireClient();
  const rows = keyedRows(result, keyColumn);
  const begin = await client.rpc('begin_engine_run', {
    p_engine: result.engine,
  });
  if (begin.error) throw new Error(begin.error.message);
  const runId = String(begin.data);
  try {
    await sendChunks(client, runId, rows, result, sources, onProgress);
  } catch (error) {
    // gravação interrompida: descarta a versão incompleta (a vigente não é tocada)
    await client.rpc('abort_engine_run', { p_run: runId });
    throw error;
  }
  return runId;
}

async function sendChunks(
  client: ReturnType<typeof requireClient>,
  runId: string,
  rows: { key: string; data: BaseRow }[],
  result: EngineResult,
  sources: SourceInfo[],
  onProgress: (message: string, fraction?: number) => void,
): Promise<void> {
  for (let from = 0; from < rows.length; from += CHUNK_ROWS) {
    const sent = Math.min(from + CHUNK_ROWS, rows.length);
    onProgress(
      `Gravando a base no Supabase… ${sent} de ${rows.length} linhas`,
      (sent / rows.length) * 0.9,
    );
    // Falha momentânea (rede, tempo do banco): tenta de novo; o lote é idempotente.
    for (let attempt = 1; ; attempt += 1) {
      const part = await client.rpc('append_engine_rows', {
        p_run: runId,
        p_rows: rows.slice(from, from + CHUNK_ROWS),
      });
      if (!part.error) break;
      if (attempt >= 3) throw new Error(part.error.message);
      await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
    }
  }
  onProgress('Conferindo a gravação…', 0.92);
  const done = await client.rpc('finalize_engine_run', {
    p_run: runId,
    p_columns: result.columns,
    p_audit: result.audit,
    p_sources: sources,
    p_row_count: rows.length,
  });
  if (done.error) throw new Error(done.error.message);
  onProgress('Limpando a versão anterior…', 0.96);
  for (;;) {
    const purge = await client.rpc('purge_engine_rows', {
      p_engine: result.engine,
      p_keep: runId,
      p_limit: 20000,
    });
    if (purge.error) throw new Error(purge.error.message);
    if (Number(purge.data) === 0) break;
  }
}

function isAuditList(value: unknown): value is AuditItem[] {
  return Array.isArray(value);
}

/** Último processamento gravado de um motor (ou nulo se nunca foi processado). */
export async function loadLastRun(
  engine: string,
): Promise<EngineRunSummary | null> {
  const client = requireClient();
  const response = await client
    .from('engine_runs')
    .select('id, engine, row_count, audit, sources, created_at')
    .eq('engine', engine)
    .eq('finalized', true)
    .order('created_at', { ascending: false })
    .limit(1);
  if (response.error) throw new Error(response.error.message);
  const list: unknown = response.data;
  const row: unknown = Array.isArray(list) ? list[0] : null;
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  return {
    id: String(r.id),
    engine: String(r.engine),
    rowCount: Number(r.row_count),
    audit: isAuditList(r.audit) ? r.audit : [],
    sources: Array.isArray(r.sources) ? (r.sources as SourceInfo[]) : [],
    createdAt: String(r.created_at),
  };
}

/** Base vigente de um motor (todas as linhas), para os motores que dependem dela. */
export async function loadBaseRows(engine: string): Promise<BaseRow[]> {
  const client = requireClient();
  const last = await client
    .from('engine_runs')
    .select('id')
    .eq('engine', engine)
    .eq('finalized', true)
    .order('created_at', { ascending: false })
    .limit(1);
  if (last.error) throw new Error(last.error.message);
  const lastList: unknown = last.data;
  const lastRow: unknown = Array.isArray(lastList) ? lastList[0] : null;
  if (!lastRow || typeof lastRow !== 'object') return [];
  const runId = String((lastRow as Record<string, unknown>).id);
  const rows: BaseRow[] = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const response = await client
      .from('engine_base_rows')
      .select('data')
      .eq('engine', engine)
      .eq('run_id', runId)
      .order('row_key', { ascending: true })
      .range(from, from + page - 1);
    if (response.error) throw new Error(response.error.message);
    const list: unknown = response.data;
    if (!Array.isArray(list) || list.length === 0) break;
    for (const item of list as { data: BaseRow }[]) rows.push(item.data);
    if (list.length < page) break;
  }
  return rows;
}

// ------------------------------------------------------- arquivos enviados
const BUCKET = 'engine-sources';

export type SourceFileInfo = {
  engine: string;
  slot: string;
  fileName: string;
  sizeBytes: number;
  uploadedAt: string;
};

async function gzip(file: Blob): Promise<Blob> {
  const stream = file.stream().pipeThrough(new CompressionStream('gzip'));
  return new Response(stream).blob();
}

async function gunzip(blob: Blob): Promise<Blob> {
  const stream = blob.stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).blob();
}

/** Guarda o arquivo do slot (compactado) para as próximas atualizações. */
export async function saveSourceFile(
  engine: string,
  slot: string,
  file: File,
): Promise<void> {
  const client = requireClient();
  const packed = await gzip(file);
  const sent = await client.storage
    .from(BUCKET)
    .upload(`${engine}/${slot}.gz`, packed, {
      upsert: true,
      contentType: 'application/gzip',
    });
  if (sent.error) throw new Error(sent.error.message);
  const row = await client.from('engine_source_files').upsert({
    engine,
    slot,
    file_name: file.name,
    size_bytes: file.size,
    uploaded_at: new Date().toISOString(),
  });
  if (row.error) throw new Error(row.error.message);
}

/** Arquivos já guardados (de todos os motores). */
export async function listSourceFiles(): Promise<SourceFileInfo[]> {
  const client = requireClient();
  const response = await client
    .from('engine_source_files')
    .select('engine, slot, file_name, size_bytes, uploaded_at');
  if (response.error) throw new Error(response.error.message);
  const list: unknown = response.data;
  if (!Array.isArray(list)) return [];
  return (list as Record<string, unknown>[]).map((r) => ({
    engine: String(r.engine),
    slot: String(r.slot),
    fileName: String(r.file_name),
    sizeBytes: Number(r.size_bytes),
    uploadedAt: String(r.uploaded_at),
  }));
}

/** Baixa um arquivo guardado e devolve o original. */
export async function loadSourceFile(
  engine: string,
  slot: string,
  fileName: string,
): Promise<File> {
  const client = requireClient();
  const got = await client.storage
    .from(BUCKET)
    .download(`${engine}/${slot}.gz`);
  if (got.error) throw new Error(got.error.message);
  return new File([await gunzip(got.data)], fileName);
}

// ------------------------------------------------------------ ajustes
/** Periodicidade de atualização de cada arquivo (dias; 0 = sem vencimento). */
export async function loadSlotPeriods(): Promise<Record<string, number>> {
  const client = requireClient();
  const response = await client
    .from('engine_slot_settings')
    .select('slot, period_days');
  if (response.error) throw new Error(response.error.message);
  const list: unknown = response.data;
  if (!Array.isArray(list)) return {};
  return Object.fromEntries(
    (list as Record<string, unknown>[]).map((r) => [
      String(r.slot),
      Number(r.period_days),
    ]),
  );
}

export async function saveSlotPeriod(
  slot: string,
  periodDays: number,
): Promise<void> {
  const client = requireClient();
  const response = await client.from('engine_slot_settings').upsert({
    slot,
    period_days: periodDays,
    updated_at: new Date().toISOString(),
  });
  if (response.error) throw new Error(response.error.message);
}

/** Classificação das operações do ERP antigo: "operação" ou "operação|cfop" → classe. */
export async function loadOperacoesMovimentacoes(): Promise<
  Record<string, string>
> {
  const client = requireClient();
  const response = await client
    .from('movimentacoes_operacoes')
    .select('operacao, cfop, classe');
  if (response.error) throw new Error(response.error.message);
  const list: unknown = response.data;
  const map: Record<string, string> = {};
  if (Array.isArray(list)) {
    for (const r of list as Record<string, unknown>[]) {
      const cfop = typeof r.cfop === 'string' ? r.cfop : '';
      map[cfop ? `${String(r.operacao)}|${cfop}` : String(r.operacao)] = String(
        r.classe,
      );
    }
  }
  return map;
}

export type OperacaoMovimentacao = {
  operacao: string;
  cfop: string;
  classe: 'VENDA' | 'DEVOLUCAO' | 'TROCA' | 'BONIFICACAO';
  descricao: string;
};

export const CLASSES_OPERACAO: OperacaoMovimentacao['classe'][] = [
  'VENDA',
  'DEVOLUCAO',
  'TROCA',
  'BONIFICACAO',
];

export async function listOperacoes(): Promise<OperacaoMovimentacao[]> {
  const client = requireClient();
  const response = await client
    .from('movimentacoes_operacoes')
    .select('operacao, cfop, classe, descricao')
    .order('operacao', { ascending: true });
  if (response.error) throw new Error(response.error.message);
  const list: unknown = response.data;
  if (!Array.isArray(list)) return [];
  return (list as Record<string, unknown>[]).map((r) => ({
    operacao: String(r.operacao),
    cfop: typeof r.cfop === 'string' ? r.cfop : '',
    classe: CLASSES_OPERACAO.find((c) => c === r.classe) ?? 'VENDA',
    descricao: typeof r.descricao === 'string' ? r.descricao : '',
  }));
}

export async function saveOperacao(item: OperacaoMovimentacao): Promise<void> {
  const client = requireClient();
  const response = await client.from('movimentacoes_operacoes').upsert({
    operacao: item.operacao,
    cfop: item.cfop,
    classe: item.classe,
    descricao: item.descricao || null,
  });
  if (response.error) throw new Error(response.error.message);
}

export async function deleteOperacao(
  operacao: string,
  cfop: string,
): Promise<void> {
  const client = requireClient();
  const response = await client
    .from('movimentacoes_operacoes')
    .delete()
    .eq('operacao', operacao)
    .eq('cfop', cfop);
  if (response.error) throw new Error(response.error.message);
}
