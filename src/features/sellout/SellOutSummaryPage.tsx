import {
  BadgePercent,
  Boxes,
  CircleDollarSign,
  Factory,
  Gift,
  RotateCcw,
  type LucideIcon,
} from 'lucide-react';

import styles from './SellOutSummaryPage.module.css';

type Detail = { label: string; value: string };

type Kpi = {
  title: string;
  value: string;
  status: string;
  icon: LucideIcon;
  points: string;
  details: Detail[];
};

const kpis: Kpi[] = [
  {
    title: 'Meta do mês',
    value: 'R$ 6,82 mi',
    status: '72%',
    icon: CircleDollarSign,
    points:
      '0,43 18,39 36,40 54,31 72,33 90,22 108,25 126,16 144,19 162,10 180,13 198,5',
    details: [
      { label: 'Meta', value: 'R$ 9,50 mi' },
      { label: 'A faturar', value: 'R$ 1,74 mi' },
      { label: 'Projetado', value: 'R$ 8,56 mi' },
    ],
  },
  {
    title: 'Margem atual',
    value: '18,7%',
    status: '-1,3 pp',
    icon: BadgePercent,
    points:
      '0,18 18,16 36,22 54,19 72,25 90,23 108,27 126,21 144,17 162,19 180,14 198,16',
    details: [
      { label: 'Meta', value: '20,0%' },
      { label: 'Projetada', value: '19,4%' },
      { label: 'Mês anterior', value: '+0,8 pp' },
    ],
  },
  {
    title: 'Estoque a venda',
    value: 'R$ 8,90 mi',
    status: '34 dias',
    icon: Boxes,
    points:
      '0,27 18,25 36,29 54,23 72,21 90,18 108,20 126,14 144,16 162,11 180,13 198,9',
    details: [
      { label: 'A custo', value: 'R$ 4,28 mi' },
      { label: 'Em trânsito', value: 'R$ 1,36 mi' },
      { label: 'Projetado', value: 'R$ 10,26 mi' },
    ],
  },
  {
    title: 'Devoluções',
    value: 'R$ 184 mil',
    status: '2,1%',
    icon: RotateCcw,
    points:
      '0,30 18,27 36,31 54,24 72,28 90,21 108,25 126,18 144,22 162,16 180,19 198,15',
    details: [
      { label: 'Limite', value: '2,5%' },
      { label: 'Mês anterior', value: '+0,4 pp' },
      { label: 'Impacto', value: 'R$ 184 mil' },
    ],
  },
  {
    title: 'Bonificações',
    value: 'R$ 212 mil',
    status: '2,4%',
    icon: Gift,
    points:
      '0,26 18,29 36,24 54,27 72,20 90,23 108,19 126,21 144,15 162,18 180,12 198,14',
    details: [
      { label: 'Teto', value: '3,0%' },
      { label: 'Saldo', value: 'R$ 74 mil' },
      { label: 'Mês anterior', value: '-0,2 pp' },
    ],
  },
  {
    title: 'Carteira de pedidos',
    value: 'R$ 2,08 mi',
    status: '128 itens',
    icon: Factory,
    points:
      '0,34 18,31 36,33 54,26 72,29 90,22 108,24 126,17 144,20 162,13 180,16 198,8',
    details: [
      { label: 'Indústria', value: 'R$ 1,36 mi' },
      { label: 'Milênio', value: 'R$ 720 mil' },
      { label: 'Próximos 3 dias', value: 'R$ 840 mil' },
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

function Sparkline({ points, label }: { points: string; label: string }) {
  return (
    <svg
      className={styles.sparkline}
      viewBox="0 0 198 48"
      role="img"
      aria-label={label}
      preserveAspectRatio="none"
    >
      <line x1="0" y1="38" x2="198" y2="38" className={styles.sparklineBase} />
      <polyline points={points} className={styles.sparklineLine} />
    </svg>
  );
}

export function SellOutSummaryPage() {
  return (
    <section className={styles.page} aria-label="Resumo de sell out">
      <div className={styles.kpiGrid}>
        {kpis.map(({ title, value, status, icon: Icon, points, details }) => (
          <article className={styles.kpi} key={title}>
            <div className={styles.kpiTop}>
              <span className={styles.kpiIcon} aria-hidden="true">
                <Icon size={17} strokeWidth={1.7} />
              </span>
              <span className={styles.kpiTitle}>{title}</span>
              <span className={styles.kpiStatus}>{status}</span>
            </div>
            <strong className={styles.kpiValue}>{value}</strong>
            <Sparkline
              points={points}
              label={`Evolução de ${title.toLowerCase()}`}
            />
            <dl className={styles.kpiDetails}>
              {details.map((detail) => (
                <div key={detail.label}>
                  <dt>{detail.label}</dt>
                  <dd>{detail.value}</dd>
                </div>
              ))}
            </dl>
          </article>
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
