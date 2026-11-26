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
};

let state: RunState = {
  message: 'Aguardando os arquivos obrigatórios.',
  busy: null,
  results: {},
  runs: {},
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
