import {
  AlertTriangle,
  Archive,
  Bot,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  FileSpreadsheet,
  Gauge,
  Plus,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Upload,
  UserRoundPlus,
  UsersRound,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { EngineBlockError, type BaseRow } from '../../engines/core/types';
import { runners } from '../../engines/registry';
import {
  loadBaseRows,
  loadLastRun,
  saveEngineBase,
  saveEngineBaseChunked,
} from '../../engines/storage';
import styles from './SettingsPage.module.css';

const sections = [
  'motores',
  'auditoria',
  'equipe',
  'ajustes-comerciais',
  'competencias',
] as const;

type Section = (typeof sections)[number];

type EngineSlot = {
  id: string;
  name: string;
  detail: string;
  period: number;
};

type EngineDefinition = {
  id: string;
  name: string;
  description: string;
  slots: EngineSlot[];
};

const engines: EngineDefinition[] = [
  {
    id: 'produtos',
    name: 'Produtos',
    description: 'Cadastros, preços e sortimento nacional.',
    slots: [
      { id: '286', name: '286', detail: 'Cadastro de produtos', period: 30 },
      {
        id: 'lista-preco-industria',
        name: 'Lista de preço da indústria',
        detail: 'Tabela vigente da indústria',
        period: 30,
      },
      { id: '8013', name: '8013', detail: 'Relatório de produtos', period: 30 },
      { id: '322', name: '322', detail: 'Relatório de produtos', period: 30 },
      { id: '8011', name: '8011', detail: 'Relatório de produtos', period: 30 },
      {
        id: 'sortimento-nacional',
        name: 'Base_Sortimento_Nacional',
        detail: 'Aba do arquivo Sortimento',
        period: 30,
      },
    ],
  },
  {
    id: 'clientes',
    name: 'Clientes',
    description: 'Cadastro, carteira e classificação comercial.',
    slots: [
      { id: '1203', name: '1203', detail: 'Cadastro de clientes', period: 30 },
      {
        id: 'carteira-clientes',
        name: 'Carteira de clientes',
        detail: 'Vínculo comercial dos clientes',
        period: 30,
      },
      {
        id: 'piramide',
        name: 'Pirâmide',
        detail: 'Classificação da base de clientes',
        period: 30,
      },
    ],
  },
  {
    id: 'movimentacoes',
    name: 'Movimentações',
    description: 'Histórico e movimentação comercial vigente.',
    slots: [
      {
        id: '379-2025',
        name: '379 de 2025',
        detail: 'Base histórica fechada',
        period: 0,
      },
      {
        id: '379-2026-julho',
        name: '379 de 2026',
        detail: 'Movimentações até julho',
        period: 0,
      },
      {
        id: '8022-agosto',
        name: '8022 — agosto em diante',
        detail: 'Base consolidada do período',
        period: 30,
      },
      {
        id: '8022-atual',
        name: '8022 — mês atual',
        detail: 'Movimentação da competência aberta',
        period: 1,
      },
    ],
  },
  {
    id: 'cortes',
    name: 'Cortes',
    description: 'Histórico consolidado e competência atual.',
    slots: [
      {
        id: '1454-agosto',
        name: '1454 — agosto em diante',
        detail: 'Histórico consolidado de cortes',
        period: 30,
      },
      {
        id: '1454-atual',
        name: '1454 — mês atual',
        detail: 'Cortes da competência aberta',
        period: 1,
      },
    ],
  },
  {
    id: 'roteiro',
    name: 'Roteiro',
    description: 'Planejamento consolidado de visitas.',
    slots: [
      {
        id: 'roteiro-consolidado',
        name: 'Roteiro consolidado',
        detail: 'Roteiro vigente das equipes',
        period: 30,
      },
    ],
  },
  {
    id: 'compras-industria',
    name: 'Compras da indústria',
    description: 'Compras realizadas e carteira industrial.',
    slots: [
      {
        id: '12322',
        name: '12322',
        detail: 'Compras da indústria',
        period: 30,
      },
      {
        id: '218-outubro',
        name: '218 — até outubro',
        detail: 'Base histórica fechada',
        period: 0,
      },
      {
        id: '218-atual',
        name: '218 — mês atual',
        detail: 'Compras da competência aberta',
        period: 1,
      },
      {
        id: 'carteira-17-11',
        name: 'CARTEIRA_17.11',
        detail: 'Carteira industrial de referência',
        period: 30,
      },
    ],
  },
];

const copy: Record<
  Section,
  { eyebrow: string; title: string; description: string }
> = {
  motores: {
    eyebrow: 'ENTRADA DE DADOS',
    title: 'Motores',
    description:
      'Atualize as fontes que alimentam o sistema e controle cada processamento.',
  },
  auditoria: {
    eyebrow: 'QUALIDADE DOS DADOS',
    title: 'Auditoria',
    description:
      'Centralize inconsistências, atrasos e mudanças de padrão antes que afetem uma análise.',
  },
  equipe: {
    eyebrow: 'ESTRUTURA COMERCIAL',
    title: 'Equipe',
    description:
      'Administre vendedores, supervisores, regiões e metas em um único cadastro.',
  },
  'ajustes-comerciais': {
    eyebrow: 'REGRAS DO NEGÓCIO',
    title: 'Ajustes comerciais',
    description:
      'Defina metas e parâmetros usados nos indicadores comerciais do sistema.',
  },
  competencias: {
    eyebrow: 'HISTÓRICO MENSAL',
    title: 'Competências',
    description:
      'Abra, feche e consulte períodos sem perder a fotografia dos dados de cada mês.',
  },
};

export function SettingsPage() {
  const { section } = useParams();
  if (!sections.includes(section as Section)) {
    return <Navigate to="/configuracoes/motores" replace />;
  }
  const current = section as Section;

  return (
    <section
      className={`${styles.page} ${current === 'motores' ? styles.enginePage : ''}`}
      aria-labelledby="settings-title"
    >
      <header className={styles.header}>
        <span>
          <Settings2 size={15} /> {copy[current].eyebrow}
        </span>
        <h1 id="settings-title">{copy[current].title}</h1>
        <p>{copy[current].description}</p>
      </header>
      {current === 'motores' && <Engines />}
      {current === 'auditoria' && <Audit />}
      {current === 'equipe' && <Team />}
      {current === 'ajustes-comerciais' && <CommercialSettings />}
      {current === 'competencias' && <Periods />}
    </section>
  );
}

function Engines() {
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});
  const allSlots = engines.flatMap((engine) => engine.slots);
  const [message, setMessage] = useState(
    'Aguardando os arquivos obrigatórios.',
  );
  const [uploads, setUploads] = useState<
    Record<string, { name: string; updatedAt: string } | undefined>
  >({});
  const files = useRef<Record<string, File>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, string | undefined>>(
    {},
  );
  const [updatePeriods, setUpdatePeriods] = useState<Record<string, number>>(
    () => Object.fromEntries(allSlots.map((slot) => [slot.id, slot.period])),
  );
  const [referenceTime, setReferenceTime] = useState(() => Date.now());
  // Ao abrir a página, recupera do banco o último processamento de cada motor.
  useEffect(() => {
    let active = true;
    void (async () => {
      for (const engineId of Object.keys(runners)) {
        try {
          const run = await loadLastRun(engineId);
          if (!run || !active) continue;
          const errors = run.audit.filter((a) => a.severity === 'ERRO').length;
          const warnings = run.audit.filter(
            (a) => a.severity === 'AVISO',
          ).length;
          setUploads((current) => ({
            ...current,
            ...Object.fromEntries(
              run.sources.map((source) => [
                source.slot,
                { name: source.fileName, updatedAt: run.createdAt },
              ]),
            ),
          }));
          setResults((current) => ({
            ...current,
            [engineId]: `${run.rowCount} linhas gravadas · ${errors} erro(s) · ${warnings} aviso(s)`,
          }));
        } catch {
          // sem conexão ou sem permissão: a tela segue vazia, como antes
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  const isExpired = (slotId: string) => {
    const upload = uploads[slotId];
    if (!upload) return false;
    const period = updatePeriods[slotId] ?? 0;
    if (period === 0) return false;
    return (
      referenceTime - new Date(upload.updatedAt).getTime() > period * 86_400_000
    );
  };
  const formatMoment = (value: string) =>
    new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  const nextUpdate = (slotId: string) => {
    const upload = uploads[slotId];
    if (!upload) return 'APÓS O PRIMEIRO ENVIO';
    const period = updatePeriods[slotId] ?? 0;
    if (period === 0) return 'SEM VENCIMENTO';
    return formatMoment(
      new Date(
        new Date(upload.updatedAt).getTime() + period * 86_400_000,
      ).toISOString(),
    );
  };

  const selectFile = (slot: EngineSlot, file?: File) => {
    if (!file) return;
    const now = new Date().toISOString();
    files.current[slot.id] = file;
    setReferenceTime(new Date(now).getTime());
    setUploads((current) => ({
      ...current,
      [slot.id]: { name: file.name, updatedAt: now },
    }));
    setMessage(`${slot.name}: arquivo recebido e pronto para validação.`);
  };

  const runEngine = async (engine: EngineDefinition): Promise<string> => {
    const runner = runners[engine.id];
    if (!runner) {
      setResults((current) => ({
        ...current,
        [engine.id]:
          'O processamento deste motor ainda não foi ligado nesta versão do site.',
      }));
      return `${engine.name}: arquivos recebidos; o processamento deste motor ainda não foi ligado.`;
    }
    setBusy(engine.id);
    try {
      const bases: Record<string, BaseRow[]> = {};
      for (const dep of runner.needs ?? []) {
        setResults((current) => ({
          ...current,
          [engine.id]: `Lendo a base de ${dep}…`,
        }));
        bases[dep] = await loadBaseRows(dep);
      }
      setResults((current) => ({
        ...current,
        [engine.id]: 'Lendo e calculando os arquivos…',
      }));
      const result = await runner.run(files.current, bases);
      setResults((current) => ({
        ...current,
        [engine.id]: 'Gravando a base no Supabase…',
      }));
      const errors = result.audit.filter((a) => a.severity === 'ERRO').length;
      const warnings = result.audit.filter(
        (a) => a.severity === 'AVISO',
      ).length;
      const sources = engine.slots.map((slot) => ({
        slot: slot.id,
        fileName: uploads[slot.id]?.name ?? '',
      }));
      if (runner.chunked) {
        await saveEngineBaseChunked(
          result,
          runner.keyColumn,
          sources,
          (progress) =>
            setResults((current) => ({ ...current, [engine.id]: progress })),
        );
      } else {
        await saveEngineBase(result, runner.keyColumn, sources);
      }
      const summary = `${result.rows.length} linhas gravadas · ${errors} erro(s) · ${warnings} aviso(s)`;
      setResults((current) => ({ ...current, [engine.id]: summary }));
      return `Motor ${engine.name} processado: ${summary}.`;
    } catch (error) {
      const reason =
        error instanceof EngineBlockError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'falha desconhecida';
      setResults((current) => ({ ...current, [engine.id]: reason }));
      return `Motor ${engine.name} não foi atualizado. ${reason}`;
    } finally {
      setBusy(null);
    }
  };

  const process = async (engine?: EngineDefinition) => {
    const targets = engine ? [engine] : engines;
    const pending = targets.reduce(
      (total, item) =>
        total +
        item.slots.filter((slot) => !uploads[slot.id] || isExpired(slot.id))
          .length,
      0,
    );
    if (pending > 0) {
      setMessage(
        `${engine?.name ?? 'Todos os motores'}: existem ${pending} arquivo(s) pendente(s) ou vencido(s).`,
      );
      return;
    }
    const messages: string[] = [];
    for (const item of targets) {
      setMessage(`Processando ${item.name}…`);
      messages.push(await runEngine(item));
    }
    setMessage(messages.join(' '));
  };

  return (
    <div className={styles.engineWorkspace}>
      <div className={styles.engineToolbar}>
        <div>
          <span>ENTRADA DE DADOS</span>
          <h2>Motores</h2>
        </div>
        <div className={styles.engineToolbarActions}>
          <div className={styles.engineCounter} title="Versão do site em uso">
            <span>Versão</span>
            <strong>
              {(import.meta.env.VITE_COMMIT ?? 'local').slice(0, 7)}
            </strong>
          </div>
          <div className={styles.engineCounter}>
            <span>Motores ativos</span>
            <strong>{String(engines.length).padStart(2, '0')}</strong>
          </div>
          <button
            className={styles.primary}
            disabled={busy !== null}
            onClick={() => void process()}
          >
            <RefreshCw size={14} /> ATUALIZAR TODOS OS MOTORES
          </button>
        </div>
      </div>
      <div className={styles.engineGlobalMessage}>
        <Gauge size={14} />
        <span>{message}</span>
      </div>

      <div className={styles.engineGrid}>
        {engines.map((engine, engineIndex) => {
          const currentCount = engine.slots.filter(
            (slot) => uploads[slot.id] && !isExpired(slot.id),
          ).length;
          return (
            <article className={styles.engineConsole} key={engine.id}>
              <header className={styles.engineConsoleHeader}>
                <div className={styles.engineIdentity}>
                  <div className={styles.engineNumber}>
                    {String(engineIndex + 1).padStart(2, '0')}
                  </div>
                  <div>
                    <span>
                      MOTOR {String(engineIndex + 1).padStart(2, '0')}
                    </span>
                    <h3>{engine.name}</h3>
                    <p>{engine.description}</p>
                  </div>
                </div>
                <div className={styles.engineReadiness}>
                  <div>
                    <span>Arquivos em dia</span>
                    <strong>
                      {currentCount}
                      <small>
                        /{String(engine.slots.length).padStart(2, '0')}
                      </small>
                    </strong>
                  </div>
                  <div className={styles.readinessTrack}>
                    <span
                      style={{
                        width: `${(currentCount / engine.slots.length) * 100}%`,
                      }}
                    />
                  </div>
                  <small>
                    {currentCount === engine.slots.length
                      ? 'PRONTO PARA PROCESSAR'
                      : 'AGUARDANDO ARQUIVOS'}
                  </small>
                </div>
              </header>

              <div className={styles.sourceList}>
                {engine.slots.map((slot, index) => {
                  const upload = uploads[slot.id];
                  const expired = isExpired(slot.id);
                  return (
                    <section
                      className={`${styles.sourceRow} ${upload && !expired ? styles.sourceReady : ''} ${expired ? styles.sourceExpired : ''}`}
                      key={slot.id}
                    >
                      <div className={styles.sourceIndex}>
                        {String(index + 1).padStart(2, '0')}
                      </div>
                      <div className={styles.sourceInfo}>
                        <strong>{slot.name}</strong>
                        <span>{slot.detail}</span>
                      </div>
                      <div
                        className={`${styles.sourceStatus} ${expired ? styles.statusExpired : upload ? styles.statusCurrent : styles.statusPending}`}
                      >
                        {expired ? (
                          <AlertTriangle size={11} />
                        ) : (
                          <CheckCircle2 size={11} />
                        )}
                        {expired
                          ? 'VENCIDO'
                          : upload
                            ? 'ATUALIZADO'
                            : 'PENDENTE'}
                      </div>
                      <div className={styles.sourceFile}>
                        <small>
                          {upload
                            ? 'ARQUIVO SELECIONADO'
                            : 'ARQUIVO OBRIGATÓRIO'}
                        </small>
                        <strong title={upload?.name}>
                          {upload?.name ?? 'Nenhum arquivo selecionado'}
                        </strong>
                        <span>XLSX · XLS · CSV · TXT</span>
                      </div>
                      <div className={styles.sourceUpdated}>
                        <div>
                          <small>ÚLTIMA ATUALIZAÇÃO</small>
                          <span>
                            {upload
                              ? formatMoment(upload.updatedAt)
                              : 'NUNCA ATUALIZADO'}
                          </span>
                        </div>
                        <div>
                          <small>PRÓXIMA ATUALIZAÇÃO</small>
                          <span>{nextUpdate(slot.id)}</span>
                        </div>
                      </div>
                      <label className={styles.sourceSchedule}>
                        <span>ATUALIZAR A CADA</span>
                        <select
                          value={updatePeriods[slot.id]}
                          onChange={(event) =>
                            setUpdatePeriods((current) => ({
                              ...current,
                              [slot.id]: Number(event.target.value),
                            }))
                          }
                        >
                          <option value={1}>DIÁRIO</option>
                          <option value={30}>MENSAL</option>
                          <option value={90}>TRIMESTRAL</option>
                          <option value={0}>SEM VENCIMENTO</option>
                        </select>
                      </label>
                      <input
                        ref={(element) => {
                          inputs.current[slot.id] = element;
                        }}
                        className={styles.hiddenInput}
                        type="file"
                        onChange={(event) =>
                          selectFile(slot, event.target.files?.[0])
                        }
                      />
                      <button
                        className={styles.sourceButton}
                        onClick={() => inputs.current[slot.id]?.click()}
                      >
                        <Upload size={14} />{' '}
                        {upload ? 'SUBSTITUIR' : 'SELECIONAR'}
                      </button>
                    </section>
                  );
                })}
              </div>
              <footer className={styles.engineConsoleFooter}>
                {results[engine.id] && (
                  <div className={styles.engineMessage}>
                    <span>{results[engine.id]}</span>
                  </div>
                )}
                {currentCount < engine.slots.length && (
                  <div className={styles.engineMessage}>
                    <span>
                      Para processar, envie:{' '}
                      {engine.slots
                        .filter(
                          (slot) => !uploads[slot.id] || isExpired(slot.id),
                        )
                        .map((slot) =>
                          uploads[slot.id]
                            ? `${slot.name} (vencido)`
                            : slot.name,
                        )
                        .join(', ')}
                    </span>
                  </div>
                )}
                <button
                  className={styles.primary}
                  onClick={() => void process(engine)}
                  disabled={currentCount < engine.slots.length || busy !== null}
                >
                  <RefreshCw size={14} /> ATUALIZAR MOTOR
                </button>
              </footer>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Audit() {
  const alerts = [
    {
      level: 'CRÍTICO',
      title: 'Estrutura de arquivo não reconhecida',
      detail: 'Exemplo de validação: uma coluna obrigatória mudou de nome.',
      source: 'CADASTRO DE CLIENTES',
    },
    {
      level: 'ATENÇÃO',
      title: 'Fonte sem atualização recente',
      detail: 'Exemplo de validação: o arquivo ultrapassou o prazo definido.',
      source: 'ESTOQUE',
    },
    {
      level: 'REVISAR',
      title: 'Registros potencialmente duplicados',
      detail:
        'Exemplo de validação: chaves repetidas foram encontradas na carga.',
      source: 'MOVIMENTAÇÃO',
    },
  ];
  return (
    <>
      <div className={styles.auditStats}>
        <Metric icon={<AlertTriangle />} label="CRÍTICOS" value="01" />
        <Metric icon={<ShieldCheck />} label="EM ANÁLISE" value="02" />
        <Metric icon={<CheckCircle2 />} label="RESOLVIDOS" value="00" />
      </div>
      <article className={styles.aiSummary}>
        <div className={styles.roundIcon}>
          <Bot size={20} />
        </div>
        <div>
          <span>RESUMO DA IA · CONTEÚDO ILUSTRATIVO</span>
          <h2>O que merece sua atenção agora</h2>
          <p>
            Há uma mudança de estrutura que pode impedir a próxima carga, uma
            fonte desatualizada e possíveis duplicidades. Revise primeiro o
            cadastro de clientes; depois atualize o estoque e confira as chaves
            da movimentação.
          </p>
        </div>
      </article>
      <div className={styles.sectionTitle}>
        <div>
          <span>FILA DE AUDITORIA</span>
          <h2>Ocorrências abertas</h2>
        </div>
        <button className={styles.outline}>VER HISTÓRICO</button>
      </div>
      <div className={styles.issueList}>
        {alerts.map((alert) => (
          <article className={styles.issue} key={alert.title}>
            <span className={styles.issueLevel}>{alert.level}</span>
            <div>
              <h3>{alert.title}</h3>
              <p>{alert.detail}</p>
            </div>
            <span className={styles.source}>{alert.source}</span>
            <button className={styles.outline}>ANALISAR</button>
          </article>
        ))}
      </div>
    </>
  );
}

function Team() {
  return (
    <>
      <div className={styles.toolbar}>
        <div className={styles.context}>
          <span>CADASTRO CENTRAL</span>
          <strong>Equipe comercial</strong>
        </div>
        <div className={styles.actions}>
          <button className={styles.outline}>
            <FileSpreadsheet size={15} /> IMPORTAR EXCEL
          </button>
          <button className={styles.primary}>
            <UserRoundPlus size={15} /> ADICIONAR VENDEDOR
          </button>
        </div>
      </div>
      <div className={styles.tableWrap}>
        <table>
          <thead>
            <tr>
              <th>VENDEDOR</th>
              <th>CPF</th>
              <th>CÓD. INTOR</th>
              <th>ERP ANTIGO</th>
              <th>REGIÃO</th>
              <th>SUPERVISOR</th>
              <th>META MENSAL</th>
              <th>STATUS</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={9}>
                <EmptyState
                  icon={<UsersRound />}
                  title="Nenhum vendedor cadastrado"
                  text="Adicione manualmente ou importe uma planilha para começar a estruturar a equipe."
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className={styles.footnote}>
        Vendedores com histórico devem ser inativados, não excluídos. Assim,
        relatórios de competências anteriores permanecem íntegros.
      </p>
    </>
  );
}

function CommercialSettings() {
  const groups = [
    [
      'SAÚDE COMERCIAL',
      'Markup médio',
      'Dias de estoque aceitáveis',
      'Meta de churn',
    ],
    [
      'METAS FINANCEIRAS',
      'Meta industrial AltianC',
      'Meta financeira da filial',
      'Meta por equipe',
    ],
    [
      'POLÍTICAS',
      'Prazo de atualização',
      'Tolerância de divergência',
      'Regra de positivação',
    ],
  ];
  return (
    <>
      <div className={styles.toolbar}>
        <div className={styles.context}>
          <span>PARÂMETROS ATIVOS</span>
          <strong>Regras vigentes na competência</strong>
        </div>
        <button className={styles.primary}>
          <Plus size={15} /> ADICIONAR AJUSTE
        </button>
      </div>
      <div className={styles.settingGrid}>
        {groups.map(([title, ...items]) => (
          <article className={styles.settingCard} key={title}>
            <div className={styles.roundIcon}>
              <CircleDollarSign size={18} />
            </div>
            <span>{title}</span>
            {items.map((item) => (
              <div className={styles.settingRow} key={item}>
                <div>
                  <strong>{item}</strong>
                  <small>VALOR A DEFINIR</small>
                </div>
                <button className={styles.outline}>CONFIGURAR</button>
              </div>
            ))}
          </article>
        ))}
      </div>
    </>
  );
}

function Periods() {
  return (
    <>
      <article className={styles.currentPeriod}>
        <div className={styles.roundIcon}>
          <CalendarClock size={20} />
        </div>
        <div>
          <span>COMPETÊNCIA ATUAL</span>
          <h2>NOVEMBRO · ABERTA</h2>
          <p>Dados ainda podem ser atualizados e reprocessados.</p>
        </div>
        <button className={styles.primary}>FECHAR COMPETÊNCIA</button>
      </article>
      <div className={styles.sectionTitle}>
        <div>
          <span>GESTÃO DO HISTÓRICO</span>
          <h2>Competências anteriores</h2>
        </div>
        <button className={styles.outline}>
          <Plus size={15} /> ABRIR NOVA COMPETÊNCIA
        </button>
      </div>
      <div className={styles.tableWrap}>
        <table>
          <thead>
            <tr>
              <th>COMPETÊNCIA</th>
              <th>STATUS</th>
              <th>FECHAMENTO</th>
              <th>RESPONSÁVEL</th>
              <th>VERSÃO DOS DADOS</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={6}>
                <EmptyState
                  icon={<Archive />}
                  title="O histórico começará no primeiro fechamento"
                  text="Ao fechar novembro, uma fotografia protegida dos dados será criada para comparações futuras."
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className={styles.footnote}>
        Reabrir uma competência deve criar uma nova versão auditável. A versão
        originalmente fechada nunca será apagada.
      </p>
    </>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <article className={styles.metric}>
      <div className={styles.roundIcon}>{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>DADOS DE EXEMPLO</small>
    </article>
  );
}

function EmptyState({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className={styles.empty}>
      <div className={styles.roundIcon}>{icon}</div>
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}
