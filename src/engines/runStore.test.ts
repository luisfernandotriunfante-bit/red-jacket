import { describe, expect, it } from 'vitest';
import {
  getRunState,
  overallProgress,
  setFailed,
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

  it('motor que falhou conta como encerrado no geral e fica marcado', () => {
    startBatch(['a', 'b']);
    setProgress('a', 100);
    setProgress('b', 60);
    setFailed('b');
    expect(getRunState().failed.b).toBe(true);
    expect(overallProgress()).toBe(100);
    startBatch(['a']);
    expect(getRunState().failed.b).toBeUndefined();
  });
});
