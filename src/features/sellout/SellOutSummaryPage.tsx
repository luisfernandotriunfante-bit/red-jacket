import { useEffect, useState } from 'react';
import {
  Activity,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';

import styles from './SellOutSummaryPage.module.css';

type Detail = { label: string; value: string };
type KpiView = Detail & { percent: string };
type PrimaryKpi = {
  title: string;
  status: string;
  statusIcon: LucideIcon;
  primaryPercent: number;
  secondaryPercent: number;
  reference: Detail;
  views: KpiView[];
};
type SecondaryKpi = {
  title: string;
  value: string;
  context: string;
  comparison?: { value: string; direction: 'up' | 'down' };
};

const primaryKpis: PrimaryKpi[] = [
  {
    title: 'Sell out',
    status: 'No ritmo',
    statusIcon: Activity,
    primaryPercent: 72,
    secondaryPercent: 18,
    reference: { label: 'Meta', value: 'R$ 9,50 mi' },
    views: [
      { label: 'Faturado', value: 'R$ 6,82 mi', percent: '72%' },
      { label: 'A faturar', value: 'R$ 1,74 mi', percent: '18%' },
      { label: 'Realizado', value: 'R$ 8,56 mi', percent: '90%' },
    ],
  },
  {
    title: 'Positivação',
    status: 'No ritmo',
    statusIcon: Activity,
    primaryPercent: 34,
    secondaryPercent: 10,
    reference: { label: 'Meta', value: '1.000 clientes' },
    views: [
      { label: 'Positivados', value: '336 clientes', percent: '34%' },
      { label: 'A positivar', value: '95 clientes', percent: '10%' },
      { label: 'Potencial', value: '431 clientes', percent: '44%' },
    ],
  },
  {
    title: 'Margem',
    status: 'Atenção',
    statusIcon: TriangleAlert,
    primaryPercent: 93.5,
    secondaryPercent: 6.5,
    reference: { label: 'Meta', value: '20,0%' },
    views: [
      { label: 'Margem atual', value: '18,7%', percent: '93,5%' },
      { label: 'A conquistar', value: '1,3 pp', percent: '6,5%' },
      { label: 'Projetada', value: '19,4%', percent: '97%' },
    ],
  },
];

const secondaryKpis: SecondaryKpi[] = [
  {
    title: 'Devoluções',
    value: 'R$ 184 mil',
    context: 'No período',
    comparison: { value: '+0,4 pp', direction: 'up' },
  },
  { title: 'Cortes', value: '97', context: 'Itens cortados no período' },
  {
    title: 'Bonificações',
    value: 'R$ 212 mil',
    context: 'No período',
    comparison: { value: '-0,2 pp', direction: 'down' },
  },
  {
    title: 'Mês anterior',
    value: 'R$ 6,29 mi',
    context: 'Faturado na competência',
    comparison: { value: '+8,4%', direction: 'up' },
  },
];

const composition = [
  ['Venda faturada', 'R$ 6,82 mi', '72%'],
  ['Carteira confirmada', 'R$ 2,08 mi', '22%'],
  ['Devoluções', '- R$ 184 mil', '2,1%'],
  ['Cancelamentos', '- R$ 96 mil', '1,1%'],
  ['Bonificações', 'R$ 212 mil', '2,4%'],
];
const lines = [
  ['Pneus', 'R$ 2,48 mi', '81%'],
  ['Lubrificantes', 'R$ 1,72 mi', '74%'],
  ['Peças', 'R$ 1,46 mi', '68%'],
  ['Acessórios', 'R$ 1,16 mi', '63%'],
];

function PrimaryCard({ kpi, cycle }: { kpi: PrimaryKpi; cycle: number }) {
  const [frozenView, setFrozenView] = useState<number | null>(null);
  const activeView = frozenView ?? cycle;
  const view = kpi.views[activeView] ?? kpi.views[0]!;
  const StatusIcon = kpi.statusIcon;

  return (
    <article className={styles.primaryCard}>
      <h2>{kpi.title}</h2>
      <div
        className={styles.rotatingMetric}
        onMouseEnter={() => setFrozenView(cycle)}
        onMouseLeave={() => setFrozenView(null)}
      >
        <div className={styles.metricValue} aria-live="polite">
          <strong>{view.value}</strong>
          <span>{view.label}</span>
        </div>
        <div className={styles.donutWrap}>
          <svg
            className={styles.donut}
            viewBox="0 0 120 120"
            aria-hidden="true"
          >
            <circle
              className={styles.donutTrack}
              cx="60"
              cy="60"
              r="48"
              pathLength="100"
            />
            <circle
              className={`${styles.donutSegment} ${styles.donutPrimary}`}
              cx="60"
              cy="60"
              r="48"
              pathLength="100"
              strokeDasharray={`${Math.max(kpi.primaryPercent - 0.8, 0)} ${100 - Math.max(kpi.primaryPercent - 0.8, 0)}`}
            />
            <circle
              className={`${styles.donutSegment} ${styles.donutSecondary}`}
              cx="60"
              cy="60"
              r="48"
              pathLength="100"
              strokeDasharray={`${kpi.secondaryPercent} ${100 - kpi.secondaryPercent}`}
              strokeDashoffset={-(kpi.primaryPercent + 0.8)}
            />
          </svg>
          <div className={styles.donutValue}>
            <strong>{view.percent}</strong>
            <span>{view.label}</span>
          </div>
        </div>
        <div className={styles.viewDots} aria-label="Alternância do indicador">
          {kpi.views.map((item, index) => (
            <button
              type="button"
              key={item.label}
              className={index === activeView ? styles.activeDot : undefined}
              aria-label={`Mostrar ${item.label.toLowerCase()}`}
              onClick={() => setFrozenView(index)}
            />
          ))}
        </div>
      </div>
      <div className={styles.primaryFooter}>
        <div>
          <span>{kpi.reference.label}</span>
          <strong>{kpi.reference.value}</strong>
        </div>
        <span className={styles.kpiStatus}>
          <StatusIcon size={12} strokeWidth={1.8} />
          {kpi.status}
        </span>
      </div>
    </article>
  );
}

function SecondaryCard({ kpi }: { kpi: SecondaryKpi }) {
  const TrendIcon =
    kpi.comparison?.direction === 'down' ? TrendingDown : TrendingUp;
  return (
    <article className={styles.secondaryCard}>
      <h2>{kpi.title}</h2>
      <strong>{kpi.value}</strong>
      <div className={styles.secondaryMeta}>
        <span>{kpi.context}</span>
        {kpi.comparison && (
          <small>
            <TrendIcon size={13} strokeWidth={1.8} />
            {kpi.comparison.value}
          </small>
        )}
      </div>
    </article>
  );
}

export function SellOutSummaryPage() {
  const [cycle, setCycle] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(
      () => setCycle((current) => (current + 1) % 3),
      5000,
    );
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className={styles.page} aria-label="Resumo de sell out">
      <div className={styles.primaryGrid}>
        {primaryKpis.map((kpi) => (
          <PrimaryCard kpi={kpi} cycle={cycle} key={kpi.title} />
        ))}
      </div>
      <div className={styles.secondaryGrid}>
        {secondaryKpis.map((kpi) => (
          <SecondaryCard kpi={kpi} key={kpi.title} />
        ))}
      </div>
      <div className={styles.analysisGrid}>
        <article className={styles.panel}>
          <div className={styles.panelHeading}>
            <h2>Desempenho diário</h2>
            <span>Realizado × projeção</span>
          </div>
          <div
            className={styles.chart}
            aria-label="Desempenho diário ilustrativo"
          >
            {[36, 48, 43, 61, 55, 72, 67, 78, 73, 88, 82, 94].map(
              (height, index) => (
                <span key={index} style={{ height: `${height}%` }} />
              ),
            )}
          </div>
          <div className={styles.chartAxis} aria-hidden="true">
            <span>01</span>
            <span>05</span>
            <span>10</span>
            <span>15</span>
            <span>20</span>
            <span>25</span>
            <span>30</span>
          </div>
        </article>
        <article className={styles.panel}>
          <div className={styles.panelHeading}>
            <h2>Composição do resultado</h2>
          </div>
          <div className={styles.composition}>
            {composition.map(([label, value, share]) => (
              <div className={styles.compositionRow} key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
                <small>{share}</small>
              </div>
            ))}
          </div>
        </article>
      </div>
      <article className={`${styles.panel} ${styles.linesPanel}`}>
        <div className={styles.panelHeading}>
          <h2>Resultados por linha</h2>
        </div>
        <div className={styles.linesTable}>
          {lines.map(([label, value, share]) => (
            <div className={styles.lineRow} key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
              <div
                className={styles.lineProgress}
                aria-label={`${share} da meta`}
              >
                <span style={{ width: share }} />
              </div>
              <small>{share}</small>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
