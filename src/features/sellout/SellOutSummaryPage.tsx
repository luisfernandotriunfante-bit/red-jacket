import { useEffect, useState } from 'react';
import {
  Activity,
  BadgePercent,
  Boxes,
  CircleCheck,
  CircleDollarSign,
  Factory,
  Gift,
  RotateCcw,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';

import styles from './SellOutSummaryPage.module.css';

type Detail = { label: string; value: string };

type KpiView = Detail & {
  percent: string;
  tone: 'primary' | 'secondary' | 'combined';
};

type Kpi = {
  title: string;
  status: string;
  statusIcon: LucideIcon;
  icon: LucideIcon;
  primaryPercent: number;
  secondaryPercent: number;
  reference: Detail;
  comparison: { value: string; direction: 'up' | 'down' };
  views: KpiView[];
};

const kpis: Kpi[] = [
  {
    title: 'Meta do mês',
    status: 'No ritmo',
    statusIcon: Activity,
    icon: CircleDollarSign,
    primaryPercent: 72,
    secondaryPercent: 18,
    reference: { label: 'Meta', value: 'R$ 9,50 mi' },
    comparison: { value: '+8,4%', direction: 'up' },
    views: [
      {
        label: 'Faturado',
        value: 'R$ 6,82 mi',
        percent: '72%',
        tone: 'primary',
      },
      {
        label: 'A faturar',
        value: 'R$ 1,74 mi',
        percent: '18%',
        tone: 'secondary',
      },
      {
        label: 'Realizado',
        value: 'R$ 8,56 mi',
        percent: '90%',
        tone: 'combined',
      },
    ],
  },
  {
    title: 'Margem atual',
    status: 'Atenção',
    statusIcon: TriangleAlert,
    icon: BadgePercent,
    primaryPercent: 68,
    secondaryPercent: 24,
    reference: { label: 'Meta', value: '20,0%' },
    comparison: { value: '+0,8 pp', direction: 'up' },
    views: [
      { label: 'Atual', value: '18,7%', percent: '68%', tone: 'primary' },
      {
        label: 'A conquistar',
        value: '1,3 pp',
        percent: '24%',
        tone: 'secondary',
      },
      { label: 'Projetada', value: '19,4%', percent: '92%', tone: 'combined' },
    ],
  },
  {
    title: 'Estoque a venda',
    status: 'Saudável',
    statusIcon: CircleCheck,
    icon: Boxes,
    primaryPercent: 78,
    secondaryPercent: 13,
    reference: { label: 'Cobertura', value: '34 dias' },
    comparison: { value: '-2,6%', direction: 'down' },
    views: [
      {
        label: 'A venda',
        value: 'R$ 8,90 mi',
        percent: '78%',
        tone: 'primary',
      },
      {
        label: 'Em trânsito',
        value: 'R$ 1,36 mi',
        percent: '13%',
        tone: 'secondary',
      },
      {
        label: 'Projetado',
        value: 'R$ 10,26 mi',
        percent: '91%',
        tone: 'combined',
      },
    ],
  },
  {
    title: 'Devoluções',
    status: 'Sob controle',
    statusIcon: CircleCheck,
    icon: RotateCcw,
    primaryPercent: 84,
    secondaryPercent: 16,
    reference: { label: 'Limite', value: 'R$ 220 mil' },
    comparison: { value: '+0,4 pp', direction: 'up' },
    views: [
      {
        label: 'Apurado',
        value: 'R$ 184 mil',
        percent: '84%',
        tone: 'primary',
      },
      { label: 'Saldo', value: 'R$ 36 mil', percent: '16%', tone: 'secondary' },
      {
        label: 'Limite total',
        value: 'R$ 220 mil',
        percent: '100%',
        tone: 'combined',
      },
    ],
  },
  {
    title: 'Bonificações',
    status: 'Estável',
    statusIcon: Activity,
    icon: Gift,
    primaryPercent: 74,
    secondaryPercent: 26,
    reference: { label: 'Teto', value: 'R$ 286 mil' },
    comparison: { value: '-0,2 pp', direction: 'down' },
    views: [
      {
        label: 'Utilizado',
        value: 'R$ 212 mil',
        percent: '74%',
        tone: 'primary',
      },
      { label: 'Saldo', value: 'R$ 74 mil', percent: '26%', tone: 'secondary' },
      {
        label: 'Disponível',
        value: 'R$ 286 mil',
        percent: '100%',
        tone: 'combined',
      },
    ],
  },
  {
    title: 'Carteira de pedidos',
    status: 'No ritmo',
    statusIcon: Activity,
    icon: Factory,
    primaryPercent: 65,
    secondaryPercent: 35,
    reference: { label: 'Pedidos', value: '128 itens' },
    comparison: { value: '+12,7%', direction: 'up' },
    views: [
      {
        label: 'Indústria',
        value: 'R$ 1,36 mi',
        percent: '65%',
        tone: 'primary',
      },
      {
        label: 'Milênio',
        value: 'R$ 720 mil',
        percent: '35%',
        tone: 'secondary',
      },
      {
        label: 'Carteira total',
        value: 'R$ 2,08 mi',
        percent: '100%',
        tone: 'combined',
      },
    ],
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

function DonutKpi({ kpi, cycle }: { kpi: Kpi; cycle: number }) {
  const [frozenView, setFrozenView] = useState<number | null>(null);
  const activeView = frozenView ?? cycle;
  const view = kpi.views[activeView] ?? kpi.views[0]!;
  const Icon = kpi.icon;
  const StatusIcon = kpi.statusIcon;
  const TrendIcon =
    kpi.comparison.direction === 'up' ? TrendingUp : TrendingDown;

  const toneClass = styles[view.tone];

  return (
    <article className={styles.kpi}>
      <div className={styles.kpiTop}>
        <span className={styles.kpiIcon} aria-hidden="true">
          <Icon size={17} strokeWidth={1.7} />
        </span>
        <span className={styles.kpiTitle}>{kpi.title}</span>
      </div>
      <div
        className={styles.rotatingMetric}
        onMouseEnter={() => setFrozenView(cycle)}
        onMouseLeave={() => setFrozenView(null)}
      >
        <div
          className={`${styles.metricValue} ${toneClass}`}
          aria-live="polite"
        >
          <span>{view.label}</span>
          <strong>{view.value}</strong>
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
          <div className={`${styles.donutValue} ${toneClass}`}>
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
      <div className={styles.kpiFooter}>
        <div className={styles.reference}>
          <span>{kpi.reference.label}</span>
          <strong>{kpi.reference.value}</strong>
        </div>
        <div className={styles.comparison}>
          <span>Mês anterior</span>
          <strong>
            <TrendIcon size={13} strokeWidth={1.8} />
            {kpi.comparison.value}
          </strong>
        </div>
        <span className={styles.kpiStatus}>
          <StatusIcon size={12} strokeWidth={1.8} />
          {kpi.status}
        </span>
      </div>
    </article>
  );
}

export function SellOutSummaryPage() {
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCycle((current) => (current + 1) % 3);
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className={styles.page} aria-label="Resumo de sell out">
      <div className={styles.kpiGrid}>
        {kpis.map((kpi) => (
          <DonutKpi kpi={kpi} cycle={cycle} key={kpi.title} />
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
