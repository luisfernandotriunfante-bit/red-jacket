import { useEffect, useMemo, useState } from 'react';
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

type DailyResult = {
  date: string;
  sellOut: number;
  billed: number;
  positive: number;
  billedPositive: number;
  variation: number;
};

const dailyResults: DailyResult[] = [
  {
    date: '09/11',
    sellOut: 12680,
    billed: 12370,
    positive: 14,
    billedPositive: 13,
    variation: 2.1,
  },
  {
    date: '10/11',
    sellOut: 95300,
    billed: 91760,
    positive: 41,
    billedPositive: 37,
    variation: 7.8,
  },
  {
    date: '11/11',
    sellOut: 11620,
    billed: -12490,
    positive: 24,
    billedPositive: 12,
    variation: -4.2,
  },
  {
    date: '12/11',
    sellOut: -327580,
    billed: -331300,
    positive: 12,
    billedPositive: 6,
    variation: -18.6,
  },
  {
    date: '13/11',
    sellOut: 224380,
    billed: 183980,
    positive: 26,
    billedPositive: 20,
    variation: 12.4,
  },
  {
    date: '14/11',
    sellOut: 242120,
    billed: 242120,
    positive: 4,
    billedPositive: 4,
    variation: 4.7,
  },
  {
    date: '16/11',
    sellOut: 115150,
    billed: 90560,
    positive: 16,
    billedPositive: 9,
    variation: -3.1,
  },
  {
    date: '17/11',
    sellOut: 195420,
    billed: 190580,
    positive: 72,
    billedPositive: 64,
    variation: 9.3,
  },
  {
    date: '18/11',
    sellOut: 320290,
    billed: 192440,
    positive: 87,
    billedPositive: 44,
    variation: 14.8,
  },
  {
    date: '19/11',
    sellOut: 896490,
    billed: 770980,
    positive: 173,
    billedPositive: 144,
    variation: 21.6,
  },
];

const brlCompact = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
});
const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

function sumUntil(index: number, field: 'sellOut' | 'billed') {
  return dailyResults
    .slice(0, index + 1)
    .reduce((total, day) => total + day[field], 0);
}

function DailyPerformance() {
  const [mode, setMode] = useState<'daily' | 'cumulative'>('daily');
  const [selectedIndex, setSelectedIndex] = useState(dailyResults.length - 1);
  const chartData = useMemo(
    () =>
      dailyResults.map((day, index) => ({
        ...day,
        plottedSellOut:
          mode === 'daily' ? day.sellOut : sumUntil(index, 'sellOut'),
        plottedBilled:
          mode === 'daily' ? day.billed : sumUntil(index, 'billed'),
      })),
    [mode],
  );
  const values = chartData.flatMap((day) => [
    day.plottedSellOut,
    day.plottedBilled,
  ]);
  const min = Math.min(0, ...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  const width = 800;
  const height = 245;
  const insetX = 24;
  const insetY = 22;
  const x = (index: number) =>
    insetX + (index * (width - insetX * 2)) / (chartData.length - 1);
  const y = (value: number) =>
    insetY + ((max - value) / range) * (height - insetY * 2);
  const points = (field: 'plottedSellOut' | 'plottedBilled') =>
    chartData.map((day, index) => `${x(index)},${y(day[field])}`).join(' ');
  const selected = dailyResults[selectedIndex]!;
  const pending = selected.sellOut - selected.billed;

  return (
    <article className={styles.dailyPanel}>
      <div className={styles.dailyHeader}>
        <div>
          <h2>Desempenho diário</h2>
          <span>09/11 — 19/11</span>
        </div>
        <div
          className={styles.chartControls}
          aria-label="Visualização do gráfico"
        >
          <button
            type="button"
            className={mode === 'daily' ? styles.controlActive : undefined}
            onClick={() => setMode('daily')}
          >
            Diário
          </button>
          <button
            type="button"
            className={mode === 'cumulative' ? styles.controlActive : undefined}
            onClick={() => setMode('cumulative')}
          >
            Acumulado
          </button>
        </div>
      </div>
      <div className={styles.dailyBody}>
        <section
          className={styles.chartSection}
          aria-label="Evolução financeira do período"
        >
          <div className={styles.chartLegend}>
            <span>
              <i className={styles.legendSellOut} />
              Sell out
            </span>
            <span>
              <i className={styles.legendBilled} />
              Faturado
            </span>
            <span>
              <i className={styles.legendPending} />A faturar
            </span>
          </div>
          <div className={styles.lineChart}>
            <svg
              viewBox={`0 0 ${width} ${height}`}
              role="img"
              aria-label="Sell out e faturamento por dia"
            >
              {[0, 0.25, 0.5, 0.75, 1].map((position) => (
                <line
                  key={position}
                  x1="0"
                  x2={width}
                  y1={insetY + position * (height - insetY * 2)}
                  y2={insetY + position * (height - insetY * 2)}
                  className={styles.gridLine}
                />
              ))}
              <polygon
                points={`${points('plottedBilled')} ${x(chartData.length - 1)},${height - insetY} ${x(0)},${height - insetY}`}
                className={styles.chartArea}
              />
              <polyline
                points={points('plottedSellOut')}
                className={styles.sellOutLine}
              />
              <polyline
                points={points('plottedBilled')}
                className={styles.billedLine}
              />
              {chartData.map((day, index) => (
                <g
                  key={day.date}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => setSelectedIndex(index)}
                  className={styles.chartPoint}
                >
                  <rect
                    x={x(index) - 20}
                    y="0"
                    width="40"
                    height={height}
                    fill="transparent"
                  />
                  {selectedIndex === index && (
                    <line
                      x1={x(index)}
                      x2={x(index)}
                      y1={insetY}
                      y2={height - insetY}
                      className={styles.selectedGuide}
                    />
                  )}
                  <circle
                    cx={x(index)}
                    cy={y(day.plottedSellOut)}
                    r={selectedIndex === index ? 5 : 3}
                    className={styles.sellOutPoint}
                  />
                  <circle
                    cx={x(index)}
                    cy={y(day.plottedBilled)}
                    r={selectedIndex === index ? 5 : 3}
                    className={styles.billedPoint}
                  />
                </g>
              ))}
            </svg>
            <div className={styles.chartDates}>
              {dailyResults.map((day, index) => (
                <button
                  type="button"
                  key={day.date}
                  className={
                    selectedIndex === index ? styles.dateActive : undefined
                  }
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => setSelectedIndex(index)}
                >
                  {day.date}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.selectedSummary}>
            <div>
              <span>Sell out</span>
              <strong>{brl.format(selected.sellOut)}</strong>
            </div>
            <div>
              <span>Faturado</span>
              <strong>{brl.format(selected.billed)}</strong>
            </div>
            <div>
              <span>A faturar</span>
              <strong className={pending > 0 ? styles.pendingValue : undefined}>
                {brl.format(pending)}
              </strong>
            </div>
            <div>
              <span>Positivados</span>
              <strong>{selected.positive}</strong>
            </div>
          </div>
        </section>
        <section
          className={styles.dailyTableSection}
          aria-label="Resultados por dia"
        >
          <div className={styles.tableHeading}>
            <div>
              <h3>Movimento por dia</h3>
              <span>Selecione para investigar</span>
            </div>
            <strong>{selected.date}</strong>
          </div>
          <div className={styles.tableScroll}>
            <table className={styles.dailyTable}>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Sell out</th>
                  <th>Faturado</th>
                  <th>A faturar</th>
                  <th>Pos.</th>
                  <th>P. fat.</th>
                  <th>Var.</th>
                </tr>
              </thead>
              <tbody>
                {dailyResults.map((day, index) => {
                  const dayPending = day.sellOut - day.billed;
                  return (
                    <tr
                      key={day.date}
                      className={
                        selectedIndex === index ? styles.selectedRow : undefined
                      }
                      onMouseEnter={() => setSelectedIndex(index)}
                      onClick={() => setSelectedIndex(index)}
                    >
                      <td>{day.date}</td>
                      <td>{brlCompact.format(day.sellOut)}</td>
                      <td>{brlCompact.format(day.billed)}</td>
                      <td
                        className={
                          dayPending > 0 ? styles.pendingCell : undefined
                        }
                      >
                        {brlCompact.format(dayPending)}
                      </td>
                      <td>{day.positive}</td>
                      <td>{day.billedPositive}</td>
                      <td
                        className={
                          day.variation < 0
                            ? styles.negativeCell
                            : styles.positiveCell
                        }
                      >
                        {day.variation > 0 ? '+' : ''}
                        {day.variation.toFixed(1).replace('.', ',')}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </article>
  );
}
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
      <DailyPerformance />
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
