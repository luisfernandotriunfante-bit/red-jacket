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
import { useRef, useState, type ReactNode } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import styles from './SettingsPage.module.css';

const sections = [
  'motores',
  'auditoria',
  'equipe',
  'ajustes-comerciais',
  'competencias',
] as const;

type Section = (typeof sections)[number];

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
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const [message, setMessage] = useState(
    'Aguardando os arquivos obrigatórios.',
  );
  const sources = [
    {
      name: 'Movimentação',
      detail: 'Vendas, faturamento e devoluções',
      format: 'XLSX · XLS · CSV',
    },
    {
      name: 'Cadastro de clientes',
      detail: 'Clientes, regiões e carteiras',
      format: 'XLSX · XLS · CSV',
    },
    {
      name: 'Cadastro de produtos',
      detail: 'Produtos, marcas e linhas',
      format: 'XLSX · XLS · CSV',
    },
    {
      name: 'Estoque',
      detail: 'Posição atual e valores de custo',
      format: 'XLSX · XLS · CSV',
    },
    {
      name: 'Metas',
      detail: 'Metas financeiras e industriais',
      format: 'XLSX · XLS · CSV',
    },
  ];
  const [uploads, setUploads] = useState<
    Array<{ name: string; updated: string } | null>
  >(() => sources.map(() => null));
  const uploadedCount = uploads.filter(Boolean).length;

  const selectFile = (index: number, file?: File) => {
    if (!file) return;
    const now = new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date());
    setUploads((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { name: file.name, updated: now } : item,
      ),
    );
    setMessage(
      `${sources[index]!.name}: arquivo recebido e pronto para validação.`,
    );
  };

  const process = (all = false) => {
    if (uploadedCount < sources.length) {
      setMessage(
        `Ainda faltam ${sources.length - uploadedCount} arquivo(s) obrigatório(s) para processar.`,
      );
      return;
    }
    setMessage(
      all
        ? 'Todos os motores foram enviados para processamento.'
        : 'Motor comercial enviado para processamento.',
    );
  };

  return (
    <div className={styles.engineWorkspace}>
      <div className={styles.engineToolbar}>
        <div>
          <span>ENTRADA DE DADOS</span>
          <h2>Motores</h2>
        </div>
        <div className={styles.engineToolbarActions}>
          <div className={styles.engineCounter}>
            <span>Motores ativos</span>
            <strong>01</strong>
          </div>
          <button className={styles.primary} onClick={() => process(true)}>
            <RefreshCw size={14} /> PROCESSAR TODOS
          </button>
        </div>
      </div>

      <article className={styles.engineConsole}>
        <header className={styles.engineConsoleHeader}>
          <div className={styles.engineIdentity}>
            <div className={styles.engineNumber}>01</div>
            <div>
              <span>MOTOR COMERCIAL</span>
              <h3>Consolidação principal</h3>
              <p>Sell out, estoque, clientes, produtos e metas.</p>
            </div>
          </div>
          <div className={styles.engineReadiness}>
            <div>
              <span>Arquivos disponíveis</span>
              <strong>
                {uploadedCount}
                <small>/05</small>
              </strong>
            </div>
            <div className={styles.readinessTrack}>
              <span style={{ width: `${uploadedCount * 20}%` }} />
            </div>
            <small>
              {uploadedCount === 5
                ? 'PRONTO PARA PROCESSAR'
                : 'AGUARDANDO ARQUIVOS'}
            </small>
          </div>
        </header>

        <div className={styles.sourceList}>
          {sources.map((source, index) => {
            const upload = uploads[index];
            return (
              <section
                className={`${styles.sourceRow} ${upload ? styles.sourceReady : ''}`}
                key={source.name}
              >
                <div className={styles.sourceIndex}>
                  {String(index + 1).padStart(2, '0')}
                </div>
                <div className={styles.sourceInfo}>
                  <strong>{source.name}</strong>
                  <span>{source.detail}</span>
                </div>
                <div className={styles.sourceFile}>
                  <small>
                    {upload ? 'ARQUIVO SELECIONADO' : 'ARQUIVO OBRIGATÓRIO'}
                  </small>
                  <strong title={upload?.name}>
                    {upload?.name ?? 'Nenhum arquivo selecionado'}
                  </strong>
                  <span>{source.format}</span>
                </div>
                <div className={styles.sourceUpdated}>
                  <small>ÚLTIMA ATUALIZAÇÃO</small>
                  <span>{upload?.updated ?? 'NUNCA ATUALIZADO'}</span>
                </div>
                <input
                  ref={(element) => {
                    inputs.current[index] = element;
                  }}
                  className={styles.hiddenInput}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(event) =>
                    selectFile(index, event.target.files?.[0])
                  }
                />
                <button
                  className={styles.sourceButton}
                  onClick={() => inputs.current[index]?.click()}
                >
                  <Upload size={14} /> {upload ? 'SUBSTITUIR' : 'SELECIONAR'}
                </button>
              </section>
            );
          })}
        </div>
        <footer className={styles.engineConsoleFooter}>
          <div className={styles.engineMessage}>
            <Gauge size={15} />
            <span>{message}</span>
          </div>
          <button
            className={styles.primary}
            onClick={() => process()}
            disabled={uploadedCount < sources.length}
          >
            <RefreshCw size={14} /> PROCESSAR MOTOR
          </button>
        </footer>
      </article>
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
