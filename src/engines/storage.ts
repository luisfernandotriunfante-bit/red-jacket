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

function requireClient() {
  if (!supabase) throw new Error('Supabase não configurado.');
  return supabase;
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
  onProgress: (message: string) => void = () => undefined,
): Promise<string> {
  const client = requireClient();
  const rows = keyedRows(result, keyColumn);
  const begin = await client.rpc('begin_engine_run', {
    p_engine: result.engine,
  });
  if (begin.error) throw new Error(begin.error.message);
  const runId = String(begin.data);
  for (let from = 0; from < rows.length; from += CHUNK_ROWS) {
    onProgress(
      `Gravando a base no Supabase… ${Math.min(from + CHUNK_ROWS, rows.length)} de ${rows.length} linhas`,
    );
    const part = await client.rpc('append_engine_rows', {
      p_run: runId,
      p_rows: rows.slice(from, from + CHUNK_ROWS),
    });
    if (part.error) throw new Error(part.error.message);
  }
  onProgress('Conferindo a gravação…');
  const done = await client.rpc('finalize_engine_run', {
    p_run: runId,
    p_columns: result.columns,
    p_audit: result.audit,
    p_sources: sources,
    p_row_count: rows.length,
  });
  if (done.error) throw new Error(done.error.message);
  onProgress('Limpando a versão anterior…');
  for (;;) {
    const purge = await client.rpc('purge_engine_rows', {
      p_engine: result.engine,
      p_keep: runId,
      p_limit: 20000,
    });
    if (purge.error) throw new Error(purge.error.message);
    if (Number(purge.data) === 0) break;
  }
  return runId;
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
