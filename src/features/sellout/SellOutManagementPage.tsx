import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Gauge,
  Medal,
  Target,
  UsersRound,
} from 'lucide-react';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  listCommercialSellers,
  listCommercialTeams,
  type CommercialSeller,
  type CommercialTeam,
} from '../settings/teamStorage';
import styles from './SellOutManagementPage.module.css';

type SellerResult = CommercialSeller & {
  billed: number;
  pipeline: number;
  positive: number;
  previous: number;
};

const money = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

const demoTeams: CommercialTeam[] = [
  {
    id: 'norte',
    supervisorCode: '101',
    supervisorName: 'Equipe Norte',
    supervisorCpf: '',
    contractType: 'CLT',
    region: 'Norte',
    active: true,
    createdAt: '',
  },
  {
    id: 'centro',
    supervisorCode: '205',
    supervisorName: 'Equipe Centro',
    supervisorCpf: '',
    contractType: 'CLT',
    region: 'Centro',
    active: true,
    createdAt: '',
  },
  {
    id: 'sul',
    supervisorCode: '318',
    supervisorName: 'Equipe Sul',
    supervisorCpf: '',
    contractType: 'CLT',
    region: 'Sul',
    active: true,
    createdAt: '',
  },
];

const names = [
  'Ana Martins',
  'Carlos Nunes',
  'Marina Costa',
  'Rafael Lima',
  'Bianca Alves',
  'Diego Rocha',
  'Luiza Freitas',
  'André Souza',
  'Camila Reis',
];
const demoSellers: CommercialSeller[] = names.map((name, index) => ({
  id: `demo-${index}`,
  teamId: demoTeams[Math.floor(index / 3)]!.id,
  name,
  cpf: '',
  oldRcaCode: '',
  newSellerCode: String(500 + index),
  contractType: 'CLT',
  region: demoTeams[Math.floor(index / 3)]!.region,
  financialTarget: [
    620000, 540000, 480000, 590000, 510000, 460000, 560000, 490000, 440000,
  ][index]!,
  positivityTarget: [78, 70, 64, 74, 68, 60, 72, 65, 58][index]!,
  active: true,
  createdAt: '',
}));

const enrich = (seller: CommercialSeller, index: number): SellerResult => {
  const ratios = [0.93, 0.84, 0.77, 0.71, 0.66, 0.61, 0.55, 0.49, 0.42];
  const ratio = ratios[index % ratios.length]!;
  const billed = seller.financialTarget * ratio;
  return {
    ...seller,
    billed,
    pipeline: seller.financialTarget * (0.08 + (index % 3) * 0.025),
    positive: Math.round(seller.positivityTarget * (ratio + 0.03)),
    previous: billed / (1 + ([0.12, 0.07, -0.04, 0.03, -0.08][index % 5] ?? 0)),
  };
};

function statusFor(percent: number) {
  if (percent >= 72) return { label: 'NO RITMO', tone: styles.good };
  if (percent >= 58) return { label: 'ATENÇÃO', tone: styles.attention };
  return { label: 'CRÍTICO', tone: styles.critical };
}

function Ring({ value }: { value: number }) {
  const safe = Math.min(value, 100);
  return (
    <div
      className={styles.ring}
      style={{ '--value': `${safe * 3.6}deg` } as CSSProperties}
    >
      <div>
        <strong>{Math.round(value)}%</strong>
        <span>ATINGIDO</span>
      </div>
    </div>
  );
}

export function SellOutManagementPage() {
  const [teams, setTeams] = useState<CommercialTeam[]>([]);
  const [sellers, setSellers] = useState<CommercialSeller[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [view, setView] = useState<'teams' | 'ranking'>('teams');

  useEffect(() => {
    let alive = true;
    void Promise.all([listCommercialTeams(), listCommercialSellers()])
      .then(([nextTeams, nextSellers]) => {
        if (!alive) return;
        setTeams(nextTeams.filter((team) => team.active));
        setSellers(nextSellers.filter((seller) => seller.active));
      })
      .catch(() => undefined)
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const usingDemo = !loading && (!teams.length || !sellers.length);
  const visibleTeams = usingDemo ? demoTeams : teams;
  const results = useMemo(
    () => (usingDemo ? demoSellers : sellers).map(enrich),
    [sellers, usingDemo],
  );
  const grouped = useMemo(
    () =>
      visibleTeams.map((team) => {
        const members = results.filter((seller) => seller.teamId === team.id);
        const target = members.reduce(
          (sum, seller) => sum + seller.financialTarget,
          0,
        );
        const billed = members.reduce((sum, seller) => sum + seller.billed, 0);
        const pipeline = members.reduce(
          (sum, seller) => sum + seller.pipeline,
          0,
        );
        const positivityTarget = members.reduce(
          (sum, seller) => sum + seller.positivityTarget,
          0,
        );
        const positive = members.reduce(
          (sum, seller) => sum + seller.positive,
          0,
        );
        return {
          team,
          members,
          target,
          billed,
          pipeline,
          positivityTarget,
          positive,
          percent: target ? (billed / target) * 100 : 0,
        };
      }),
    [results, visibleTeams],
  );
  const totals = grouped.reduce(
    (acc, team) => ({
      target: acc.target + team.target,
      billed: acc.billed + team.billed,
      pipeline: acc.pipeline + team.pipeline,
      positive: acc.positive + team.positive,
      positivityTarget: acc.positivityTarget + team.positivityTarget,
    }),
    { target: 0, billed: 0, pipeline: 0, positive: 0, positivityTarget: 0 },
  );
  const companyPct = totals.target ? (totals.billed / totals.target) * 100 : 0;
  const positivityPct = totals.positivityTarget
    ? (totals.positive / totals.positivityTarget) * 100
    : 0;
  const onPace = grouped.filter((team) => team.percent >= 72).length;
  const ranking = [...results].sort(
    (a, b) => b.billed / b.financialTarget - a.billed / a.financialTarget,
  );

  return (
    <section className={styles.page} aria-label="Visão gerencial de sell out">
      {usingDemo && (
        <div className={styles.preview}>
          PRÉVIA VISUAL · OS VALORES SERÃO SUBSTITUÍDOS PELOS DADOS PROCESSADOS
        </div>
      )}
      <div className={styles.heroGrid}>
        <article className={styles.heroCard}>
          <header>
            <span>RESULTADO DA FILIAL</span>
            <Gauge />
          </header>
          <div className={styles.heroBody}>
            <Ring value={companyPct} />
            <div className={styles.heroNumbers}>
              <span>
                FATURADO<strong>{money.format(totals.billed)}</strong>
              </span>
              <span>
                A FATURAR<strong>{money.format(totals.pipeline)}</strong>
              </span>
            </div>
          </div>
          <footer>
            <span>
              Meta <strong>{money.format(totals.target)}</strong>
            </span>
            <b className={statusFor(companyPct).tone}>
              {statusFor(companyPct).label}
            </b>
          </footer>
        </article>
        <article className={styles.heroCard}>
          <header>
            <span>RITMO DAS EQUIPES</span>
            <UsersRound />
          </header>
          <div className={styles.centerMetric}>
            <strong>
              {onPace}
              <small>/{grouped.length}</small>
            </strong>
            <span>EQUIPES NO RITMO</span>
          </div>
          <div className={styles.teamDots}>
            {grouped.map((team) => (
              <i
                key={team.team.id}
                className={statusFor(team.percent).tone}
                title={`${team.team.supervisorName}: ${Math.round(team.percent)}%`}
              />
            ))}
          </div>
          <footer>
            <span>
              Projeção{' '}
              <strong>{money.format(totals.billed + totals.pipeline)}</strong>
            </span>
            <b className={styles.good}>ACOMPANHAR</b>
          </footer>
        </article>
        <article className={styles.heroCard}>
          <header>
            <span>POSITIVAÇÃO</span>
            <Target />
          </header>
          <div className={styles.heroBody}>
            <Ring value={positivityPct} />
            <div className={styles.heroNumbers}>
              <span>
                POSITIVADOS<strong>{totals.positive}</strong>
              </span>
              <span>
                A POSITIVAR
                <strong>
                  {Math.max(totals.positivityTarget - totals.positive, 0)}
                </strong>
              </span>
            </div>
          </div>
          <footer>
            <span>
              Meta <strong>{totals.positivityTarget} clientes</strong>
            </span>
            <b className={statusFor(positivityPct).tone}>
              {statusFor(positivityPct).label}
            </b>
          </footer>
        </article>
      </div>

      <div className={styles.viewBar}>
        <div>
          <h1>Desempenho comercial</h1>
          <span>Competência atual · equipes e vendedores</span>
        </div>
        <div className={styles.switcher}>
          <button
            className={view === 'teams' ? styles.active : ''}
            onClick={() => setView('teams')}
          >
            EQUIPES
          </button>
          <button
            className={view === 'ranking' ? styles.active : ''}
            onClick={() => setView('ranking')}
          >
            RANKING
          </button>
        </div>
      </div>

      {view === 'teams' ? (
        <div className={styles.teamList}>
          {grouped.map((item) => {
            const status = statusFor(item.percent);
            const isOpen = expanded === item.team.id;
            return (
              <article className={styles.teamCard} key={item.team.id}>
                <button
                  className={styles.teamHeader}
                  onClick={() => setExpanded(isOpen ? null : item.team.id)}
                  aria-expanded={isOpen}
                >
                  <span className={styles.teamCode}>
                    EQUIPE {item.team.supervisorCode}
                  </span>
                  <span className={styles.teamName}>
                    <strong>{item.team.supervisorName}</strong>
                    <small>
                      {item.team.region} · {item.members.length} vendedores
                    </small>
                  </span>
                  <span className={styles.teamMetric}>
                    <small>FATURADO</small>
                    <strong>{money.format(item.billed)}</strong>
                  </span>
                  <span className={styles.teamMetric}>
                    <small>META</small>
                    <strong>{money.format(item.target)}</strong>
                  </span>
                  <span className={styles.teamProgress}>
                    <i>
                      <em
                        style={{ width: `${Math.min(item.percent, 100)}%` }}
                      />
                    </i>
                    <strong>{Math.round(item.percent)}%</strong>
                  </span>
                  <b className={status.tone}>{status.label}</b>
                  {isOpen ? <ChevronUp /> : <ChevronDown />}
                </button>
                {isOpen && <SellerTable sellers={item.members} />}
              </article>
            );
          })}
        </div>
      ) : (
        <SellerTable sellers={ranking} ranking />
      )}
    </section>
  );
}

function SellerTable({
  sellers,
  ranking = false,
}: {
  sellers: SellerResult[];
  ranking?: boolean;
}) {
  return (
    <div className={`${styles.tableWrap} ${ranking ? styles.ranking : ''}`}>
      <table>
        <thead>
          <tr>
            {ranking && <th>#</th>}
            <th>VENDEDOR</th>
            <th>REGIÃO</th>
            <th>FATURADO</th>
            <th>A FATURAR</th>
            <th>META</th>
            <th>ATINGIMENTO</th>
            <th>POSITIVAÇÃO</th>
            <th>VS. MÊS ANTERIOR</th>
          </tr>
        </thead>
        <tbody>
          {sellers.map((seller, index) => {
            const pct = seller.financialTarget
              ? (seller.billed / seller.financialTarget) * 100
              : 0;
            const change = seller.previous
              ? (seller.billed / seller.previous - 1) * 100
              : 0;
            return (
              <tr key={seller.id}>
                {ranking && (
                  <td className={styles.position}>
                    {index < 3 ? <Medal size={14} /> : index + 1}
                  </td>
                )}
                <td>
                  <strong>{seller.name}</strong>
                  <small>CÓD. {seller.newSellerCode}</small>
                </td>
                <td>{seller.region || '—'}</td>
                <td>
                  <strong>{money.format(seller.billed)}</strong>
                </td>
                <td>{money.format(seller.pipeline)}</td>
                <td>{money.format(seller.financialTarget)}</td>
                <td>
                  <span className={styles.inlineProgress}>
                    <i>
                      <em style={{ width: `${Math.min(pct, 100)}%` }} />
                    </i>
                    <b>{Math.round(pct)}%</b>
                  </span>
                </td>
                <td>
                  {seller.positive} / {seller.positivityTarget}
                </td>
                <td className={change >= 0 ? styles.up : styles.down}>
                  {change >= 0 ? <ArrowUpRight /> : <ArrowDownRight />}
                  {Math.abs(change).toFixed(1).replace('.', ',')}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
