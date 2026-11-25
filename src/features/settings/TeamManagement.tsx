import {
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  Edit3,
  Plus,
  Power,
  Target,
  Trash2,
  UserRoundPlus,
  UsersRound,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  deleteCommercialSeller,
  deleteCommercialTeam,
  listCommercialSellers,
  listCommercialTeams,
  saveCommercialSeller,
  saveCommercialTeam,
  type CommercialSeller,
  type CommercialTeam,
  type ContractType,
  type SellerDraft,
  type TeamDraft,
} from './teamStorage';
import styles from './TeamManagement.module.css';

type Editor =
  | { type: 'team'; item?: CommercialTeam }
  | { type: 'seller'; teamId: string; item?: CommercialSeller };

const money = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

const cpf = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
};

export function TeamManagement({ canEdit }: { canEdit: boolean }) {
  const [teams, setTeams] = useState<CommercialTeam[]>([]);
  const [sellers, setSellers] = useState<CommercialSeller[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editor, setEditor] = useState<Editor | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const reload = async () => {
    const [nextTeams, nextSellers] = await Promise.all([
      listCommercialTeams(),
      listCommercialSellers(),
    ]);
    setTeams(nextTeams);
    setSellers(nextSellers);
    setExpanded((current) =>
      current.size
        ? current
        : new Set(
            nextTeams.filter((team) => team.active).map((team) => team.id),
          ),
    );
  };

  useEffect(() => {
    let active = true;
    void Promise.all([listCommercialTeams(), listCommercialSellers()])
      .then(([nextTeams, nextSellers]) => {
        if (!active) return;
        setTeams(nextTeams);
        setSellers(nextSellers);
        setExpanded(
          new Set(
            nextTeams.filter((team) => team.active).map((team) => team.id),
          ),
        );
      })
      .catch(
        (reason: unknown) =>
          active &&
          setError(
            reason instanceof Error
              ? reason.message
              : 'Não foi possível carregar as equipes.',
          ),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const activeTeamIds = new Set(
    teams.filter((team) => team.active).map((team) => team.id),
  );
  const activeSellers = sellers.filter(
    (seller) => seller.active && activeTeamIds.has(seller.teamId),
  );
  const totals = useMemo(
    () => ({
      teams: teams.filter((team) => team.active).length,
      sellers: activeSellers.length,
      financial: activeSellers.reduce(
        (sum, seller) => sum + seller.financialTarget,
        0,
      ),
      positivity: activeSellers.reduce(
        (sum, seller) => sum + seller.positivityTarget,
        0,
      ),
    }),
    [teams, activeSellers],
  );

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await action();
      await reload();
      setEditor(null);
    } catch (reason) {
      const message =
        reason instanceof Error
          ? reason.message
          : 'Não foi possível salvar a alteração.';
      setError(
        message.includes('duplicate')
          ? 'CPF ou código já cadastrado.'
          : message,
      );
    } finally {
      setBusy(false);
    }
  };

  const toggle = (id: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const removeTeam = (team: CommercialTeam) => {
    if (sellers.some((seller) => seller.teamId === team.id)) {
      setError(
        'Inative a equipe ou exclua os vendedores antes de apagar o supervisor.',
      );
      return;
    }
    if (
      window.confirm(`Excluir definitivamente a equipe ${team.supervisorCode}?`)
    )
      void run(() => deleteCommercialTeam(team.id));
  };

  const removeSeller = (seller: CommercialSeller) => {
    if (window.confirm(`Excluir definitivamente ${seller.name}?`))
      void run(() => deleteCommercialSeller(seller.id));
  };

  return (
    <div className={styles.workspace}>
      <header className={styles.toolbar}>
        <div>
          <span>ESTRUTURA COMERCIAL</span>
          <strong>Equipes e vendedores</strong>
        </div>
        {canEdit && (
          <button
            className={styles.primary}
            onClick={() => setEditor({ type: 'team' })}
          >
            <UserRoundPlus size={15} /> NOVO SUPERVISOR
          </button>
        )}
      </header>

      <section className={styles.summary} aria-label="Resumo das equipes">
        <Summary
          icon={<UsersRound />}
          label="EQUIPES ATIVAS"
          value={String(totals.teams).padStart(2, '0')}
        />
        <Summary
          icon={<UserRoundPlus />}
          label="VENDEDORES ATIVOS"
          value={String(totals.sellers).padStart(2, '0')}
        />
        <Summary
          icon={<CircleDollarSign />}
          label="META FINANCEIRA"
          value={money.format(totals.financial)}
        />
        <Summary
          icon={<Target />}
          label="META DE POSITIVAÇÃO"
          value={totals.positivity.toLocaleString('pt-BR')}
        />
      </section>

      {!canEdit && (
        <p className={styles.notice}>
          MODO DE CONSULTA · SOMENTE O CEO ALTERA A ESTRUTURA DAS EQUIPES
        </p>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {loading && <div className={styles.empty}>Carregando equipes…</div>}
      {!loading && teams.length === 0 && (
        <div className={styles.empty}>
          <UsersRound size={25} />
          <strong>Nenhuma equipe cadastrada</strong>
          <span>
            Crie o primeiro supervisor para abrir automaticamente uma equipe.
          </span>
        </div>
      )}

      <div className={styles.teamList}>
        {teams.map((team) => {
          const members = sellers.filter((seller) => seller.teamId === team.id);
          const activeMembers = members.filter((seller) => seller.active);
          const isOpen = expanded.has(team.id);
          return (
            <article
              className={`${styles.teamCard} ${!team.active ? styles.inactive : ''}`}
              key={team.id}
            >
              <div className={styles.teamHeader}>
                <button
                  className={styles.expand}
                  onClick={() => toggle(team.id)}
                  aria-expanded={isOpen}
                  aria-label={`${isOpen ? 'Fechar' : 'Abrir'} equipe ${team.supervisorCode}`}
                >
                  {isOpen ? <ChevronUp /> : <ChevronDown />}
                </button>
                <div className={styles.teamIdentity}>
                  <span>EQUIPE {team.supervisorCode}</span>
                  <h2>{team.supervisorName}</h2>
                  <p>
                    SUPERVISOR · {team.contractType} ·{' '}
                    {team.region || 'REGIÃO NÃO INFORMADA'}
                  </p>
                </div>
                <div className={styles.teamStats}>
                  <span>
                    <b>{activeMembers.length}</b> ATIVOS
                  </span>
                  <span>
                    <b>
                      {money.format(
                        activeMembers.reduce(
                          (sum, seller) => sum + seller.financialTarget,
                          0,
                        ),
                      )}
                    </b>{' '}
                    META
                  </span>
                  <span
                    className={
                      team.active ? styles.activePill : styles.inactivePill
                    }
                  >
                    {team.active ? 'ATIVA' : 'INATIVA'}
                  </span>
                </div>
                {canEdit && (
                  <div className={styles.actions}>
                    <button
                      aria-label="Editar supervisor"
                      onClick={() => setEditor({ type: 'team', item: team })}
                    >
                      <Edit3 />
                    </button>
                    <button
                      aria-label={
                        team.active ? 'Inativar equipe' : 'Ativar equipe'
                      }
                      onClick={() =>
                        void run(() =>
                          saveCommercialTeam(
                            { ...team, active: !team.active },
                            team.id,
                          ),
                        )
                      }
                    >
                      <Power />
                    </button>
                    <button
                      className={styles.danger}
                      aria-label="Excluir equipe"
                      onClick={() => removeTeam(team)}
                    >
                      <Trash2 />
                    </button>
                  </div>
                )}
              </div>

              {isOpen && (
                <div className={styles.members}>
                  <div className={styles.memberHeading}>
                    <span>VENDEDORES DA EQUIPE</span>
                    {canEdit && (
                      <button
                        onClick={() =>
                          setEditor({ type: 'seller', teamId: team.id })
                        }
                      >
                        <Plus size={14} /> ADICIONAR VENDEDOR
                      </button>
                    )}
                  </div>
                  {members.length === 0 ? (
                    <p className={styles.noMembers}>
                      Nenhum vendedor nesta equipe.
                    </p>
                  ) : (
                    <div className={styles.memberTable}>
                      <div className={styles.tableHeader}>
                        <span>VENDEDOR</span>
                        <span>CÓDIGOS</span>
                        <span>REGIÃO</span>
                        <span>META FINANCEIRA</span>
                        <span>POSITIVAÇÃO</span>
                        <span>STATUS</span>
                        <span />
                      </div>
                      {members.map((seller) => (
                        <div
                          className={`${styles.memberRow} ${!seller.active ? styles.inactive : ''}`}
                          key={seller.id}
                        >
                          <div>
                            <strong>{seller.name}</strong>
                            <small>
                              {cpf(seller.cpf)} · {seller.contractType}
                            </small>
                          </div>
                          <div>
                            <strong>{seller.newSellerCode}</strong>
                            <small>ANTIGO {seller.oldRcaCode || '—'}</small>
                          </div>
                          <span>{seller.region || '—'}</span>
                          <strong>
                            {money.format(seller.financialTarget)}
                          </strong>
                          <strong>
                            {seller.positivityTarget.toLocaleString('pt-BR')}
                          </strong>
                          <span
                            className={
                              seller.active
                                ? styles.activePill
                                : styles.inactivePill
                            }
                          >
                            {seller.active ? 'ATIVO' : 'INATIVO'}
                          </span>
                          {canEdit && (
                            <div className={styles.rowActions}>
                              <button
                                aria-label={`Editar ${seller.name}`}
                                onClick={() =>
                                  setEditor({
                                    type: 'seller',
                                    teamId: team.id,
                                    item: seller,
                                  })
                                }
                              >
                                <Edit3 />
                              </button>
                              <button
                                aria-label={`${seller.active ? 'Inativar' : 'Ativar'} ${seller.name}`}
                                onClick={() =>
                                  void run(() =>
                                    saveCommercialSeller(
                                      { ...seller, active: !seller.active },
                                      seller.id,
                                    ),
                                  )
                                }
                              >
                                <Power />
                              </button>
                              <button
                                className={styles.danger}
                                aria-label={`Excluir ${seller.name}`}
                                onClick={() => removeSeller(seller)}
                              >
                                <Trash2 />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
      {editor?.type === 'team' && (
        <TeamEditor
          item={editor.item}
          busy={busy}
          onClose={() => setEditor(null)}
          onSave={(draft) =>
            void run(() => saveCommercialTeam(draft, editor.item?.id))
          }
        />
      )}
      {editor?.type === 'seller' && (
        <SellerEditor
          teams={teams}
          teamId={editor.teamId}
          item={editor.item}
          busy={busy}
          onClose={() => setEditor(null)}
          onSave={(draft) =>
            void run(() => saveCommercialSeller(draft, editor.item?.id))
          }
        />
      )}
    </div>
  );
}

function Summary({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <article className={styles.summaryCard}>
      <div>{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function TeamEditor({
  item,
  busy,
  onClose,
  onSave,
}: {
  item?: CommercialTeam;
  busy: boolean;
  onClose: () => void;
  onSave: (draft: TeamDraft) => void;
}) {
  const [draft, setDraft] = useState<TeamDraft>({
    supervisorCode: item?.supervisorCode ?? '',
    supervisorName: item?.supervisorName ?? '',
    supervisorCpf: item?.supervisorCpf ?? '',
    contractType: item?.contractType ?? 'CLT',
    region: item?.region ?? '',
    active: item?.active ?? true,
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (draft.supervisorCpf.replace(/\D/g, '').length !== 11) return;
    onSave(draft);
  };
  return (
    <Modal
      title={item ? 'Editar supervisor' : 'Novo supervisor'}
      subtitle="O código do supervisor será o número da equipe."
      onClose={onClose}
    >
      <form onSubmit={submit} className={styles.form}>
        <Field
          label="CÓDIGO DO SUPERVISOR / EQUIPE"
          required
          value={draft.supervisorCode}
          onChange={(value) => setDraft({ ...draft, supervisorCode: value })}
        />
        <Field
          label="NOME DO SUPERVISOR"
          required
          value={draft.supervisorName}
          onChange={(value) => setDraft({ ...draft, supervisorName: value })}
        />
        <Field
          label="CPF"
          required
          inputMode="numeric"
          value={cpf(draft.supervisorCpf)}
          onChange={(value) => setDraft({ ...draft, supervisorCpf: value })}
        />
        <SelectField
          label="CONTRATO"
          value={draft.contractType}
          onChange={(value) =>
            setDraft({ ...draft, contractType: value as ContractType })
          }
          options={['CLT', 'PJ']}
        />
        <Field
          label="REGIÃO"
          value={draft.region}
          onChange={(value) => setDraft({ ...draft, region: value })}
        />
        <footer>
          <button type="button" onClick={onClose}>
            CANCELAR
          </button>
          <button className={styles.save} disabled={busy}>
            SALVAR SUPERVISOR
          </button>
        </footer>
      </form>
    </Modal>
  );
}

function SellerEditor({
  teams,
  teamId,
  item,
  busy,
  onClose,
  onSave,
}: {
  teams: CommercialTeam[];
  teamId: string;
  item?: CommercialSeller;
  busy: boolean;
  onClose: () => void;
  onSave: (draft: SellerDraft) => void;
}) {
  const [draft, setDraft] = useState<SellerDraft>({
    teamId: item?.teamId ?? teamId,
    name: item?.name ?? '',
    cpf: item?.cpf ?? '',
    oldRcaCode: item?.oldRcaCode ?? '',
    newSellerCode: item?.newSellerCode ?? '',
    contractType: item?.contractType ?? 'CLT',
    region: item?.region ?? '',
    financialTarget: item?.financialTarget ?? 0,
    positivityTarget: item?.positivityTarget ?? 0,
    active: item?.active ?? true,
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (draft.cpf.replace(/\D/g, '').length !== 11) return;
    onSave(draft);
  };
  return (
    <Modal
      title={item ? 'Editar vendedor' : 'Novo vendedor'}
      subtitle="Metas e vínculo comercial são definidos manualmente."
      onClose={onClose}
    >
      <form onSubmit={submit} className={styles.form}>
        <Field
          label="NOME DO VENDEDOR"
          required
          value={draft.name}
          onChange={(value) => setDraft({ ...draft, name: value })}
        />
        <Field
          label="CPF"
          required
          inputMode="numeric"
          value={cpf(draft.cpf)}
          onChange={(value) => setDraft({ ...draft, cpf: value })}
        />
        <Field
          label="CÓDIGO NOVO"
          required
          value={draft.newSellerCode}
          onChange={(value) => setDraft({ ...draft, newSellerCode: value })}
        />
        <Field
          label="CÓDIGO RCA ANTIGO"
          value={draft.oldRcaCode}
          onChange={(value) => setDraft({ ...draft, oldRcaCode: value })}
        />
        <SelectField
          label="EQUIPE"
          value={draft.teamId}
          onChange={(value) => setDraft({ ...draft, teamId: value })}
          options={teams.map((team) => team.id)}
          labels={Object.fromEntries(
            teams.map((team) => [
              team.id,
              `${team.supervisorCode} · ${team.supervisorName}`,
            ]),
          )}
        />
        <SelectField
          label="CONTRATO"
          value={draft.contractType}
          onChange={(value) =>
            setDraft({ ...draft, contractType: value as ContractType })
          }
          options={['CLT', 'PJ']}
        />
        <Field
          label="REGIÃO"
          value={draft.region}
          onChange={(value) => setDraft({ ...draft, region: value })}
        />
        <Field
          label="META FINANCEIRA"
          type="number"
          min="0"
          value={String(draft.financialTarget)}
          onChange={(value) =>
            setDraft({ ...draft, financialTarget: Number(value) || 0 })
          }
        />
        <Field
          label="META DE POSITIVAÇÃO"
          type="number"
          min="0"
          value={String(draft.positivityTarget)}
          onChange={(value) =>
            setDraft({
              ...draft,
              positivityTarget: Math.max(0, Math.trunc(Number(value) || 0)),
            })
          }
        />
        <footer>
          <button type="button" onClick={onClose}>
            CANCELAR
          </button>
          <button className={styles.save} disabled={busy}>
            SALVAR VENDEDOR
          </button>
        </footer>
      </form>
    </Modal>
  );
}

function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.backdrop} role="presentation">
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header>
          <div>
            <span>CADASTRO MANUAL</span>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
          <button aria-label="Fechar" onClick={onClose}>
            <X />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

function Field({
  label,
  onChange,
  ...props
}: { label: string; onChange: (value: string) => void } & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'onChange'
>) {
  return (
    <label>
      <span>{label}</span>
      <input {...props} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  labels,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  labels?: Record<string, string>;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {labels?.[option] ?? option}
          </option>
        ))}
      </select>
    </label>
  );
}
