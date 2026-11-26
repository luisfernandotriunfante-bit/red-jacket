import { useSyncExternalStore } from 'react';

/**
 * Estado das atualizações dos motores, guardado fora das telas.
 * O processamento continua mesmo se a pessoa sair da página de Ajustes; ao voltar,
 * a tela se reconecta a este estado (progresso, resultado e "ocupado").
 */
export type RunSummary = {
  id: string;
  sources: { slot: string; fileName: string }[];
};

type RunState = {
  message: string;
  busy: string | null;
  results: Record<string, string | undefined>;
  runs: Record<string, RunSummary>;
  /** Andamento (0 a 100) de cada motor da atualização atual. */
  progress: Record<string, number>;
  /** Motores da atualização atual, na ordem em que rodam. */
  batch: string[];
  /** Motores que falharam na atualização atual. */
  failed: Record<string, boolean>;
};

let state: RunState = {
  message: 'Aguardando os arquivos obrigatórios.',
  busy: null,
  results: {},
  runs: {},
  progress: {},
  batch: [],
  failed: {},
};
const listeners = new Set<() => void>();

const emit = (next: RunState) => {
  state = next;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getRunState = () => state;
export const useRunState = () =>
  useSyncExternalStore(subscribe, getRunState, getRunState);

/** Arquivos escolhidos nesta sessão (ainda não guardados ou já guardados). */
export const pendingFiles: Record<string, File> = {};

const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
  event.preventDefault();
};

export const setMessage = (message: string) => emit({ ...state, message });

export const setBusy = (busy: string | null) => {
  if (typeof window !== 'undefined') {
    if (busy !== null)
      window.addEventListener('beforeunload', warnBeforeLeaving);
    else window.removeEventListener('beforeunload', warnBeforeLeaving);
  }
  emit({ ...state, busy });
};

export const setResults = (
  update: (
    current: Record<string, string | undefined>,
  ) => Record<string, string | undefined>,
) => emit({ ...state, results: update(state.results) });

export const setRuns = (
  update: (current: Record<string, RunSummary>) => Record<string, RunSummary>,
) => emit({ ...state, runs: update(state.runs) });

/** Começa uma atualização: zera o andamento dos motores que vão rodar. */
export const startBatch = (ids: string[]) =>
  emit({
    ...state,
    batch: ids,
    progress: Object.fromEntries(ids.map((id) => [id, 0])),
    failed: {},
  });

export const setFailed = (id: string) =>
  emit({ ...state, failed: { ...state.failed, [id]: true } });

export const setProgress = (id: string, percent: number) =>
  emit({
    ...state,
    progress: {
      ...state.progress,
      [id]: Math.max(0, Math.min(100, Math.round(percent))),
    },
  });

/** Andamento geral: média dos motores da atualização atual. */
export const overallProgress = (current: RunState = state) => {
  if (current.batch.length === 0) return 0;
  const total = current.batch.reduce(
    (sum, id) => sum + (current.failed[id] ? 100 : (current.progress[id] ?? 0)),
    0,
  );
  return Math.round(total / current.batch.length);
};
