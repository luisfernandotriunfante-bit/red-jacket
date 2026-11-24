import {
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  CalendarDays,
  ChartNoAxesCombined,
  CircleDollarSign,
  Factory,
  PackageCheck,
  SlidersHorizontal,
} from 'lucide-react';
import styles from './SellOutSummaryPage.module.css';

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
            Uma leitura rápida do resultado, do potencial em carteira e do que
            ainda exige ação.
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

      <section className={styles.kpiSection} aria-labelledby="kpi-title">
        <div className={styles.sectionLabel}>
          <span>LEITURA EXECUTIVA</span>
          <h2 id="kpi-title">O mês em três decisões</h2>
        </div>

        <div className={styles.kpiGrid}>
          <GoalKpi />
          <StockKpi />
          <OrdersKpi />
        </div>
      </section>

      <section className={styles.analysisSection}>
        <div className={styles.sectionLabel}>
          <span>EVOLUÇÃO E COMPOSIÇÃO</span>
          <h2>Tabela e gráfico</h2>
        </div>
        <div className={styles.analysisGrid}>
          <article className={styles.chartShell}>
            <div className={styles.shellHeader}>
              <div>
                <span>RITMO DIÁRIO</span>
                <h3>Realizado × projeção</h3>
              </div>
              <span className={styles.exampleTag}>MODELO VISUAL</span>
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
              <span className={styles.exampleTag}>EXEMPLO</span>
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
          <span>RESULTADOS POR LINHA</span>
          <h2>Onde o resultado acontece</h2>
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
            <div className={styles.miniProgress}>
              <span style={{ width: `${[76, 61, 43][index]}%` }} />
            </div>
            <span className={styles.emptyValue}>AGUARDANDO DADOS</span>
          </article>
        ))}
      </section>
    </section>
  );
}

function GoalKpi() {
  return (
    <article className={`${styles.kpi} ${styles.goalKpi}`}>
      <div className={styles.kpiTop}>
        <div className={styles.kpiIcon}>
          <CircleDollarSign size={19} />
        </div>
        <div>
          <span>ATINGIMENTO FINANCEIRO</span>
          <h3>Meta do mês</h3>
        </div>
        <span className={styles.signal}>
          <ArrowUpRight size={14} /> NO RITMO
        </span>
      </div>
      <div className={styles.goalBody}>
        <div className={styles.arcWrap}>
          <svg
            viewBox="0 0 220 150"
            role="img"
            aria-label="72 por cento da meta faturada"
          >
            <path
              className={styles.arcBase}
              d="M 25 125 A 90 90 0 0 1 195 125"
            />
            <path
              className={styles.arcProjected}
              d="M 25 125 A 90 90 0 0 1 195 125"
              pathLength="100"
            />
            <path
              className={styles.arcActual}
              d="M 25 125 A 90 90 0 0 1 195 125"
              pathLength="100"
            />
          </svg>
          <div className={styles.arcValue}>
            <strong>72%</strong>
            <span>FATURADO</span>
          </div>
        </div>
        <div className={styles.goalSummary}>
          <small>REALIZADO PROJETADO</small>
          <strong>R$ 8,56 mi</strong>
          <span>90% da meta com a carteira atual</span>
        </div>
      </div>
      <div className={styles.financialFlow}>
        <div>
          <span>META</span>
          <strong>R$ 9,50 mi</strong>
        </div>
        <div>
          <span>FATURADO</span>
          <strong>R$ 6,82 mi</strong>
        </div>
        <div>
          <span>A FATURAR</span>
          <strong>R$ 1,74 mi</strong>
        </div>
        <div className={styles.gap}>
          <span>FALTA PROJETADA</span>
          <strong>R$ 940 mil</strong>
        </div>
      </div>
    </article>
  );
}

function StockKpi() {
  return (
    <article className={`${styles.kpi} ${styles.stockKpi}`}>
      <div className={styles.kpiTop}>
        <div className={styles.kpiIcon}>
          <Boxes size={19} />
        </div>
        <div>
          <span>ESTOQUE A CUSTO</span>
          <h3>Posição e projeção</h3>
        </div>
      </div>
      <div className={styles.stockValue}>
        <small>POSIÇÃO ATUAL</small>
        <strong>R$ 4,28 mi</strong>
        <span>34 dias de cobertura</span>
      </div>
      <div className={styles.stockScale}>
        <div className={styles.scaleLabels}>
          <span>ATUAL</span>
          <span>COM CARTEIRA</span>
        </div>
        <div className={styles.scaleTrack}>
          <span className={styles.stockCurrent} />
          <span className={styles.stockProjected} />
          <i />
        </div>
        <div className={styles.scaleValues}>
          <strong>R$ 4,28 mi</strong>
          <strong>R$ 5,64 mi</strong>
        </div>
      </div>
      <div className={styles.stockInsight}>
        <PackageCheck size={18} />
        <div>
          <span>PROJEÇÃO CONSOLIDADA</span>
          <strong>+ R$ 1,36 mi em trânsito</strong>
          <p>A entrada projetada leva a cobertura para 45 dias.</p>
        </div>
      </div>
    </article>
  );
}

function OrdersKpi() {
  return (
    <article className={`${styles.kpi} ${styles.ordersKpi}`}>
      <div className={styles.kpiTop}>
        <div className={styles.kpiIcon}>
          <Factory size={19} />
        </div>
        <div>
          <span>CARTEIRA DE PEDIDOS</span>
          <h3>Origem do abastecimento</h3>
        </div>
      </div>
      <div className={styles.orderTotal}>
        <small>CARTEIRA TOTAL</small>
        <strong>R$ 2,08 mi</strong>
        <span>valor de exemplo</span>
      </div>
      <div className={styles.balance}>
        <div className={styles.balanceSide}>
          <span>INDÚSTRIA</span>
          <strong>R$ 1,36 mi</strong>
          <small>65%</small>
        </div>
        <div className={styles.balanceVisual}>
          <span className={styles.industry} />
          <span className={styles.millennium} />
        </div>
        <div className={`${styles.balanceSide} ${styles.alignRight}`}>
          <span>MILÊNIO</span>
          <strong>R$ 720 mil</strong>
          <small>35%</small>
        </div>
      </div>
      <div className={styles.orderFooter}>
        <div>
          <span>PREVISÃO MAIS PRÓXIMA</span>
          <strong>3 dias</strong>
        </div>
        <div>
          <span>ITENS EM CARTEIRA</span>
          <strong>128</strong>
        </div>
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
        className={`${styles.movement} ${positive ? styles.positive : ''} ${neutral ? styles.neutral : ''}`}
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
