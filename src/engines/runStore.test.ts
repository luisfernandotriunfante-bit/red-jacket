import { describe, expect, it } from 'vitest';
import {
  getRunState,
  overallProgress,
  setProgress,
  startBatch,
  setBusy,
  setMessage,
  setResults,
  setRuns,
} from './runStore';

describe('runStore', () => {
  it('mantém progresso e "ocupado" fora da tela', () => {
    setBusy('movimentacoes');
    setMessage('Processando Movimentações…');
    setResults((c) => ({ ...c, movimentacoes: 'Gravando…' }));
    setRuns((c) => ({ ...c, movimentacoes: { id: 'r1', sources: [] } }));
    // Uma tela nova (depois de sair e voltar) lê o mesmo estado.
    const s = getRunState();
    expect(s.busy).toBe('movimentacoes');
    expect(s.message).toBe('Processando Movimentações…');
    expect(s.results.movimentacoes).toBe('Gravando…');
    expect(s.runs.movimentacoes?.id).toBe('r1');
    setBusy(null);
    expect(getRunState().busy).toBeNull();
  });

  it('calcula o andamento geral como média dos motores', () => {
    startBatch(['a', 'b']);
    setProgress('a', 100);
    setProgress('b', 50);
    expect(overallProgress()).toBe(75);
    setProgress('b', 100);
    expect(overallProgress()).toBe(100);
  });
});
