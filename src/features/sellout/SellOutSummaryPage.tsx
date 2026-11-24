import {
  ArrowDownRight,
  ArrowUpRight,
  BadgePercent,
  Boxes,
  CalendarDays,
  ChartNoAxesCombined,
  CircleDollarSign,
  Factory,
  Gift,
  RotateCcw,
  SlidersHorizontal,
  type LucideIcon,
} from 'lucide-react';
import styles from './SellOutSummaryPage.module.css';

const pulseHeights = [42, 68, 52, 86, 61, 100, 74, 91, 58, 82, 66, 94];

const kpis: KpiData[] = [
  {
    icon: CircleDollarSign,
    category: 'RESULTADO FINANCEIRO',
    title: 'Meta do mês',
    value: 'R$ 6,82 mi',
    valueLabel: 'FATURADO',
    progress: 72,
    tone: 'positive',
    status: 'NO RITMO',
    details: [
      ['META', 'R$ 9,50 mi'],
      ['A FATURAR', 'R$ 1,74 mi'],
      ['PROJETADO', 'R$ 8,56 mi'],
    ],
  },
  {
    icon: BadgePercent,
    category: 'RENTABILIDADE',
    title: 'Margem atual',
    value: '18,7%',
    valueLabel: 'MARGEM REALIZADA',
    progress: 84,
    tone: 'balanced',
    status: '1,3 PP DA META',
    details: [
      ['META', '20,0%'],
      ['PROJETADA', '19,4%'],
      ['VARIAÇÃO', '+0,8 pp'],
    ],
  },
  {
    icon: Boxes,
    category: 'ESTOQUE A VENDA',
    title: 'Posição comercial',
    value: 'R$ 8,90 mi',
    valueLabel: 'VALOR DE VENDA',
    progress: 66,
    tone: 'cool',
    status: '34 DIAS',
    details: [
      ['A CUSTO', 'R$ 4,28 mi'],
      ['EM TRÂNSITO', 'R$ 1,36 mi'],
      ['PROJETADO', 'R$ 10,26 mi'],
    ],
  },
  {
    icon: RotateCcw,
    category: 'DEVOLUÇÕES',
    title: 'Impacto no faturamento',
    value: 'R$ 184 mil',
    valueLabel: 'ACUMULADO DO MÊS',
    progress: 78,
    tone: 'risk',
    status: 'ATENÇÃO',
    details: [
      ['ÍNDICE', '2,1%'],
      ['LIMITE', '2,5%'],
      ['VS. MÊS ANT.', '+0,4 pp'],
    ],
  },
  {
    icon: Gift,
    category: 'BONIFICAÇÕES',
    title: 'Investimento comercial',
    value: 'R$ 212 mil',
    valueLabel: 'ACUMULADO DO MÊS',
    progress: 54,
    tone: 'balanced',
    status: 'CONTROLADO',
    details: [
      ['ÍNDICE', '2,4%'],
      ['TETO', '3,0%'],
      ['SALDO', 'R$ 74 mil'],
    ],
  },
  {
    icon: Factory,
    category: 'CARTEIRA DE PEDIDOS',
    title: 'Abastecimento futuro',
    value: 'R$ 2,08 mi',
    valueLabel: 'CARTEIRA TOTAL',
    progress: 65,
    tone: 'cool',
    status: '128 ITENS',
    details: [
      ['INDÚSTRIA', 'R$ 1,36 mi'],
      ['MILÊNIO', 'R$ 720 mil'],
      ['MAIS PRÓXIMA', '3 dias'],
    ],
  },
];

interface KpiData {
  icon: LucideIcon;
  category: string;
  title: string;
  value: string;
  valueLabel: string;
  progress: number;
  tone: 'positive' | 'balanced' | 'cool' | 'risk';
  status: string;
  details: [string, string][];
}

export function SellOutSummaryPage() {
  return (
    <section className={styles.page} aria-labelledby="summary-title">
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>
            <ChartNoAxesCombined size={15} /> VISÃO DO MÊS · DADOS ILUSTRATIVOS
          </span>
          <h1 id="summary-title">Resumo comercial</h1>
          <p>
            Resultado, rentabilidade e riscos em uma única leitura executiva.
          </p>
        </div>
        <div className={styles.filters}>
          <button>
            <CalendarDays size={15} /> NOVEMBRO 2026
          </button>
          <button>
            <SlidersHorizontal size={15} /> FILTROS
          </button>
        </div>
      </header>

      <section aria-labelledby="kpi-title">
        <div className={styles.sectionLabel}>
          <div>
            <span>LEITURA EXECUTIVA</span>
            <h2 id="kpi-title">Seis sinais para decidir</h2>
          </div>
          <p>
            O espectro mostra intensidade: azul indica base e vermelho destaca
            avanço ou pressão.
          </p>
        </div>
        <div className={styles.kpiGrid}>
          {kpis.map((kpi) => (
            <KpiCard key={kpi.category} {...kpi} />
          ))}
        </div>
      </section>

      <section className={styles.analysisSection}>
        <div className={styles.sectionLabel}>
          <div>
            <span>EVOLUÇÃO E COMPOSIÇÃO</span>
            <h2>Tabela e gráfico</h2>
          </div>
        </div>
        <div className={styles.analysisGrid}>
          <article className={styles.chartShell}>
            <div className={styles.shellHeader}>
              <div>
                <span>RITMO DIÁRIO</span>
                <h3>Realizado × projeção</h3>
              </div>
              <span>MODELO VISUAL</span>
            </div>
            <div
              className={styles.chart}
              aria-label="Gráfico ilustrativo de evolução"
            >
              {[38, 52, 47, 63, 58, 72, 68, 81, 76, 88, 84, 94].map(
                (height, index) => (
                  <div className={styles.barTrack} key={index}>
                    <span style={{ height: `${height}%` }} />
                  </div>
                ),
              )}
              <div className={styles.targetLine}>
                <span>META</span>
              </div>
            </div>
            <div className={styles.axis}>
              <span>01 NOV</span>
              <span>15 NOV</span>
              <span>30 NOV</span>
            </div>
          </article>
          <article className={styles.tableShell}>
            <div className={styles.shellHeader}>
              <div>
                <span>COMPOSIÇÃO</span>
                <h3>Movimentos do resultado</h3>
              </div>
              <span>EXEMPLO</span>
            </div>
            <div className={styles.compRows}>
              <CompositionRow
                label="Venda faturada"
                value="R$ 6,82 mi"
                movement="+8,4%"
                positive
              />
              <CompositionRow
                label="Carteira a faturar"
                value="R$ 1,74 mi"
                movement="+3,1%"
                positive
              />
              <CompositionRow
                label="Devoluções"
                value="R$ 184 mil"
                movement="-1,8%"
              />
              <CompositionRow
                label="Cancelamentos"
                value="R$ 96 mil"
                movement="-0,7%"
              />
              <CompositionRow
                label="Bonificações"
                value="R$ 212 mil"
                movement="2,4%"
                neutral
              />
            </div>
          </article>
        </div>
      </section>

      <section className={styles.linesSection}>
        <div className={styles.sectionLabel}>
          <div>
            <span>RESULTADOS POR LINHA</span>
            <h2>Onde o resultado acontece</h2>
          </div>
        </div>
        <div className={styles.lineHeader}>
          <span>LINHA</span>
          <span>REALIZADO</span>
          <span>ATINGIMENTO</span>
          <span>TENDÊNCIA</span>
        </div>
        {[
          'Linha estratégica 01',
          'Linha estratégica 02',
          'Linha estratégica 03',
        ].map((line, index) => (
          <article className={styles.lineRow} key={line}>
            <div>
              <span className={styles.lineIndex}>0{index + 1}</span>
              <strong>{line}</strong>
            </div>
            <strong>R$ —</strong>
            <div className={styles.miniPulse}>
              {pulseHeights.slice(0, 8).map((height, pulseIndex) => (
                <span
                  key={pulseIndex}
                  className={
                    pulseIndex < ([6, 5, 3][index] ?? 0) ? styles.active : ''
                  }
                  style={{ height: `${Math.max(22, height)}%` }}
                />
              ))}
            </div>
            <span className={styles.emptyValue}>AGUARDANDO DADOS</span>
          </article>
        ))}
      </section>
    </section>
  );
}

function KpiCard({
  icon: Icon,
  category,
  title,
  value,
  valueLabel,
  progress,
  tone,
  status,
  details,
}: KpiData) {
  const activeBars = Math.round((progress / 100) * pulseHeights.length);
  return (
    <article className={`${styles.kpi} ${styles[tone]}`}>
      <div className={styles.kpiTop}>
        <div className={styles.kpiIcon}>
          <Icon size={17} />
        </div>
        <div>
          <span>{category}</span>
          <h3>{title}</h3>
        </div>
        <span className={styles.status}>{status}</span>
      </div>
      <div className={styles.kpiCore}>
        <div className={styles.mainValue}>
          <small>{valueLabel}</small>
          <strong>{value}</strong>
        </div>
        <div
          className={styles.pulse}
          aria-label={`${progress}% de intensidade`}
        >
          {pulseHeights.map((height, index) => (
            <span
              key={index}
              className={index < activeBars ? styles.active : ''}
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
        <div className={styles.pulseScale}>
          <span>BASE</span>
          <strong>{progress}%</strong>
          <span>ALVO</span>
        </div>
      </div>
      <div className={styles.kpiDetails}>
        {details.map(([label, detail]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{detail}</strong>
          </div>
        ))}
      </div>
    </article>
  );
}

function CompositionRow({
  label,
  value,
  movement,
  positive,
  neutral,
}: {
  label: string;
  value: string;
  movement: string;
  positive?: boolean;
  neutral?: boolean;
}) {
  return (
    <div className={styles.compRow}>
      <span>{label}</span>
      <strong>{value}</strong>
      <span
        className={`${styles.movement} ${positive ? styles.up : ''} ${neutral ? styles.neutral : ''}`}
      >
        {positive ? (
          <ArrowUpRight size={14} />
        ) : neutral ? null : (
          <ArrowDownRight size={14} />
        )}
        {movement}
      </span>
    </div>
  );
}
