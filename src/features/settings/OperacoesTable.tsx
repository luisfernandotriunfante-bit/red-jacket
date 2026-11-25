import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  CLASSES_OPERACAO,
  deleteOperacao,
  listOperacoes,
  saveOperacao,
  type OperacaoMovimentacao,
} from '../../engines/storage';
import styles from './OperacoesTable.module.css';

const emptyDraft: OperacaoMovimentacao = {
  operacao: '',
  cfop: '',
  classe: 'VENDA',
  descricao: '',
};

/** Classificação manual das operações do relatório 379 (ERP antigo). */
export function OperacoesTable({ canEdit }: { canEdit: boolean }) {
  const [items, setItems] = useState<OperacaoMovimentacao[]>([]);
  const [draft, setDraft] = useState<OperacaoMovimentacao>(emptyDraft);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    try {
      setItems(await listOperacoes());
      setError('');
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Não foi possível carregar.',
      );
    }
  };

  useEffect(() => {
    let active = true;
    void listOperacoes().then(
      (list) => active && setItems(list),
      (reason: unknown) =>
        active &&
        setError(
          reason instanceof Error
            ? reason.message
            : 'Não foi possível carregar.',
        ),
    );
    return () => {
      active = false;
    };
  }, []);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
      await reload();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Não foi possível salvar. Só o CEO altera esta tabela.',
      );
    } finally {
      setBusy(false);
    }
  };

  const add = () => {
    const operacao = draft.operacao.replace(/\D/g, '').replace(/^0+/, '');
    const cfop = draft.cfop.replace(/\D/g, '').replace(/^0+/, '');
    if (!operacao) {
      setError('Informe o código da operação (só números).');
      return;
    }
    void run(async () => {
      await saveOperacao({ ...draft, operacao, cfop });
      setDraft(emptyDraft);
    });
  };

  return (
    <article className={styles.card}>
      <header>
        <div>
          <span>OPERAÇÕES DO ERP ANTIGO (RELATÓRIO 379)</span>
          <strong>Como cada operação entra nas movimentações</strong>
          <small>
            CFOP em branco vale para qualquer CFOP da operação. Operação que não
            está aqui é ignorada e aparece como aviso na auditoria.
            {canEdit ? '' : ' Somente o CEO altera esta tabela.'}
          </small>
        </div>
      </header>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <table>
        <thead>
          <tr>
            <th>OPERAÇÃO</th>
            <th>CFOP</th>
            <th>CLASSE</th>
            <th>DESCRIÇÃO</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={`${item.operacao}|${item.cfop}`}>
              <td>{item.operacao}</td>
              <td>{item.cfop || 'QUALQUER'}</td>
              <td>
                {canEdit ? (
                  <select
                    value={item.classe}
                    disabled={busy}
                    onChange={(event) =>
                      void run(() =>
                        saveOperacao({
                          ...item,
                          classe: event.target
                            .value as OperacaoMovimentacao['classe'],
                        }),
                      )
                    }
                  >
                    {CLASSES_OPERACAO.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                ) : (
                  item.classe
                )}
              </td>
              <td>{item.descricao}</td>
              <td>
                {canEdit && (
                  <button
                    aria-label={`Remover operação ${item.operacao}`}
                    disabled={busy}
                    onClick={() =>
                      void run(() => deleteOperacao(item.operacao, item.cfop))
                    }
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={5}>
                Nenhuma operação cadastrada: vale a lista padrão do motor.
              </td>
            </tr>
          )}
        </tbody>
        {canEdit && (
          <tfoot>
            <tr>
              <td>
                <input
                  placeholder="Ex.: 51201"
                  value={draft.operacao}
                  onChange={(e) =>
                    setDraft({ ...draft, operacao: e.target.value })
                  }
                />
              </td>
              <td>
                <input
                  placeholder="Qualquer"
                  value={draft.cfop}
                  onChange={(e) => setDraft({ ...draft, cfop: e.target.value })}
                />
              </td>
              <td>
                <select
                  value={draft.classe}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      classe: e.target.value as OperacaoMovimentacao['classe'],
                    })
                  }
                >
                  {CLASSES_OPERACAO.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </td>
              <td>
                <input
                  placeholder="Descrição (opcional)"
                  value={draft.descricao}
                  onChange={(e) =>
                    setDraft({ ...draft, descricao: e.target.value })
                  }
                />
              </td>
              <td>
                <button disabled={busy} onClick={add}>
                  <Plus size={14} /> ADICIONAR
                </button>
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </article>
  );
}
