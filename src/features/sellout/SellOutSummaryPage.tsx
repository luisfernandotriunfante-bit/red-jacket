import {
  Activity,
  BadgePercent,
  Boxes,
  CircleCheck,
  CircleDollarSign,
  Factory,
  Gift,
  RotateCcw,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';

import styles from './SellOutSummaryPage.module.css';

type Detail = { label: string; value: string };

type Kpi = {
  title: string;
  value: string;
  status: string;
  statusIcon: LucideIcon;
  icon: LucideIcon;
  progress: number;
  projection: number;
  scaleLabel: string;
  details: Detail[];
};

const kpis: Kpi[] = [
  {
    title: 'Meta do mês',
    value: 'R$ 6,82 mi',
    status: 'No ritmo',
    statusIcon: Activity,
    icon: CircleDollarSign,
    progress: 72,
    projection: 90,
    scaleLabel: '72% realizado',
    details: [
      { label: 'Meta', value: 'R$ 9,50 mi' },
      { label: 'A faturar', value: 'R$ 1,74 mi' },
      { label: 'Projetado', value: 'R$ 8,56 mi' },
    ],
  },
  {
    title: 'Margem atual',
    value: '18,7%',
    status: 'Atenção',
    statusIcon: TriangleAlert,
    icon: BadgePercent,
    progress: 68,
    projection: 92,
    scaleLabel: '1,3 pp abaixo',
    details: [
      { label: 'Meta', value: '20,0%' },
      { label: 'Projetada', value: '19,4%' },
      { label: 'Mês anterior', value: '+0,8 pp' },
    ],
  },
  {
    title: 'Estoque a venda',
    value: 'R$ 8,90 mi',
    status: 'Saudável',
    statusIcon: CircleCheck,
    icon: Boxes,
    progress: 78,
    projection: 91,
    scaleLabel: '34 dias de cobertura',
    details: [
      { label: 'A custo', value: 'R$ 4,28 mi' },
      { label: 'Em trânsito', value: 'R$ 1,36 mi' },
      { label: 'Projetado', value: 'R$ 10,26 mi' },
    ],
  },
  {
    title: 'Devoluções',
    value: 'R$ 184 mil',
    status: 'Sob controle',
    statusIcon: CircleCheck,
    icon: RotateCcw,
    progress: 84,
    projection: 100,
    scaleLabel: '84% do limite',
    details: [
      { label: 'Limite', value: '2,5%' },
      { label: 'Mês anterior', value: '+0,4 pp' },
      { label: 'Impacto', value: 'R$ 184 mil' },
    ],
  },
  {
    title: 'Bonificações',
    value: 'R$ 212 mil',
    status: 'Estável',
    statusIcon: Activity,
    icon: Gift,
    progress: 80,
    projection: 100,
    scaleLabel: '80% do teto',
    details: [
      { label: 'Teto', value: '3,0%' },
      { label: 'Saldo', value: 'R$ 74 mil' },
      { label: 'Mês anterior', value: '-0,2 pp' },
    ],
  },
  {
    title: 'Carteira de pedidos',
    value: 'R$ 2,08 mi',
    status: 'No ritmo',
    statusIcon: Activity,
    icon: Factory,
    progress: 61,
    projection: 86,
    scaleLabel: '128 itens ativos',
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

function MetricScale({
  progress,
  projection,
  label,
}: {
  progress: number;
  projection: number;
  label: string;
}) {
  return (
    <div className={styles.metricScale} role="img" aria-label={label}>
      <div className={styles.scaleLabels} aria-hidden="true">
        <span>0</span>
        <strong
          style={{
            left: `${progress}%`,
            transform: progress > 70 ? 'translateX(-100%)' : 'translateX(-50%)',
          }}
        >
          {label}
        </strong>
        <span>Referência</span>
      </div>
      <div className={styles.scaleTrack} aria-hidden="true">
        <span className={styles.scaleFill} style={{ width: `${progress}%` }} />
        {Array.from({ length: 11 }, (_, index) => (
          <i key={index} style={{ left: `${index * 10}%` }} />
        ))}
        <b className={styles.currentMarker} style={{ left: `${progress}%` }} />
        <b
          className={styles.projectionMarker}
          style={{ left: `${Math.min(projection, 98)}%` }}
        />
      </div>
      <div className={styles.scaleLegend} aria-hidden="true">
        <span>
          <i />
          Atual
        </span>
        <span>
          <i />
          Projeção
        </span>
      </div>
    </div>
  );
}

export function SellOutSummaryPage() {
  return (
    <section className={styles.page} aria-label="Resumo de sell out">
      <div className={styles.kpiGrid}>
        {kpis.map(
          ({
            title,
            value,
            status,
            statusIcon: StatusIcon,
            icon: Icon,
            progress,
            projection,
            scaleLabel,
            details,
          }) => (
            <article className={styles.kpi} key={title}>
              <div className={styles.kpiTop}>
                <span className={styles.kpiIcon} aria-hidden="true">
                  <Icon size={17} strokeWidth={1.7} />
                </span>
                <span className={styles.kpiTitle}>{title}</span>
                <span className={styles.kpiStatus}>
                  <StatusIcon size={12} strokeWidth={1.8} />
                  {status}
                </span>
              </div>
              <strong className={styles.kpiValue}>{value}</strong>
              <MetricScale
                progress={progress}
                projection={projection}
                label={scaleLabel}
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
          ),
        )}
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
