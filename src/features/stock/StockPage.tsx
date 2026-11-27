import {
  AlertTriangle,
  Boxes,
  ChevronDown,
  ChevronUp,
  PackageCheck,
  Search,
  Truck,
  WalletCards,
} from 'lucide-react';
import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import type { BaseRow } from '../../engines/core/types';
import { loadBaseRows } from '../../engines/storage';
import styles from './StockPage.module.css';

type StockItem = {
  id: string;
  description: string;
  category: string;
  subbrand: string;
  brand: string;
  available: number;
  reserved: number;
  cost: number;
  price: number;
  sales: number;
  turnover: number;
  inTransit: number;
  transitValue: number;
  curve: string;
  coverage: number;
};
const money = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});
const compact = (value: number) =>
  value >= 1_000_000
    ? `R$ ${(value / 1_000_000).toFixed(2).replace('.', ',')} mi`
    : value >= 1_000
      ? `R$ ${(value / 1_000).toFixed(0)} mil`
      : money.format(value);
const t = (row: BaseRow, key: string) => String(row[key] ?? '');
const n = (row: BaseRow, key: string) => Number(row[key] ?? 0);

const demo: StockItem[] = [
  [
    '1001',
    'Creme Dental Total 12',
    'CREME DENTAL',
    'TOTAL',
    'COLGATE',
    2840,
    160,
    6.84,
    12.9,
    1840,
    92,
    620,
    4240,
  ],
  [
    '1002',
    'Escova Dental Slim Soft',
    'ESCOVAS',
    'SLIM SOFT',
    'COLGATE',
    1180,
    90,
    4.12,
    8.9,
    980,
    49,
    480,
    2136,
  ],
  [
    '1003',
    'Enxaguante Plax Fresh Mint',
    'ENXAGUANTE',
    'PLAX',
    'COLGATE',
    760,
    44,
    8.35,
    16.5,
    650,
    31,
    360,
    5940,
  ],
  [
    '1004',
    'Sabonete Palmolive Naturals',
    'SABONETES',
    'NATURALS',
    'PALMOLIVE',
    420,
    60,
    2.48,
    5.9,
    540,
    22,
    720,
    4248,
  ],
  [
    '1005',
    'Shampoo Palmolive 350ml',
    'HAIR CARE',
    'PALMOLIVE',
    'PALMOLIVE',
    180,
    32,
    7.96,
    15.9,
    390,
    13,
    480,
    7632,
  ],
  [
    '1006',
    'Creme Dental Máxima Proteção',
    'CREME DENTAL',
    'MPA',
    'COLGATE',
    0,
    0,
    3.92,
    7.5,
    720,
    34,
    960,
    7200,
  ],
  [
    '1007',
    'Fio Dental Colgate 50m',
    'FIO DENTAL',
    'COLGATE',
    'COLGATE',
    94,
    12,
    4.2,
    8.4,
    210,
    6,
    0,
    0,
  ],
  [
    '1008',
    'Escova Infantil Smiles',
    'ESCOVAS',
    'SMILES',
    'COLGATE',
    0,
    0,
    3.65,
    7.2,
    165,
    9,
    0,
    0,
  ],
].map((item) => ({
  id: String(item[0]),
  description: String(item[1]),
  category: String(item[2]),
  subbrand: String(item[3]),
  brand: String(item[4]),
  available: Number(item[5]),
  reserved: Number(item[6]),
  cost: Number(item[7]),
  price: Number(item[8]),
  sales: Number(item[9]),
  turnover: Number(item[10]),
  inTransit: Number(item[11]),
  transitValue: Number(item[12]),
  curve: '',
  coverage: Number(item[10]) ? Number(item[5]) / Number(item[10]) : 0,
}));

function buildStock(products: BaseRow[], purchases: BaseRow[]): StockItem[] {
  const transit = new Map<string, { qty: number; value: number }>();
  purchases
    .filter((row) => n(row, 'compoe_carteira_aberta') === 1)
    .forEach((row) => {
      const id = t(row, 'codprod') || t(row, 'ean');
      if (!id) return;
      const current = transit.get(id) ?? { qty: 0, value: 0 };
      current.qty += n(row, 'qtd_un');
      current.value += n(row, 'valor_item');
      transit.set(id, current);
    });
  const items = products.map((row) => {
    const id = t(row, 'codprod') || t(row, 'ean');
    const incoming = transit.get(id) ?? { qty: 0, value: 0 };
    const available = n(row, 'est_disponivel');
    const turnover = n(row, 'giro_dia');
    return {
      id,
      description: t(row, 'descricao') || t(row, 'desc_industria'),
      category:
        t(row, 'ind_categoria') || t(row, 'sort_categoria') || 'SEM CATEGORIA',
      subbrand: t(row, 'sub_brand') || t(row, 'ind_submarca'),
      brand: t(row, 'ind_marca'),
      available,
      reserved: n(row, 'est_reservado'),
      cost: n(row, 'custo_fin'),
      price: n(row, 'pm_preco_com_st'),
      sales: n(row, 'venda_mes'),
      turnover,
      inTransit: incoming.qty,
      transitValue: incoming.value,
      curve: '',
      coverage: turnover > 0 ? available / turnover : 0,
    };
  });
  const totalSales = items.reduce((sum, item) => sum + item.sales, 0);
  let accumulated = 0;
  [...items]
    .sort((a, b) => b.sales - a.sales)
    .forEach((item) => {
      accumulated += item.sales;
      const share = totalSales ? accumulated / totalSales : 1;
      item.curve = share <= 0.8 ? 'A' : share <= 0.95 ? 'B' : 'C';
    });
  return items;
}

export function StockPage() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('TODOS');
  const [curve, setCurve] = useState('TODAS');
  const [category, setCategory] = useState('TODAS');
  const [brand, setBrand] = useState('TODAS');
  const [expanded, setExpanded] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void Promise.all([loadBaseRows('produtos'), loadBaseRows('compras')])
      .then(
        ([products, purchases]) =>
          alive && setItems(buildStock(products, purchases)),
      )
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  const usingDemo = items.length === 0;
  const data = usingDemo ? demo : items;
  const ranked = useMemo(() => {
    const total = data.reduce((s, i) => s + i.sales, 0);
    const ordered = [...data].sort((a, b) => b.sales - a.sales);
    return ordered.map((item, index) => {
      const accumulated = ordered
        .slice(0, index + 1)
        .reduce((sum, current) => sum + current.sales, 0);
      return {
        ...item,
        curve:
          item.curve ||
          (total && accumulated / total <= 0.8
            ? 'A'
            : total && accumulated / total <= 0.95
              ? 'B'
              : 'C'),
      };
    });
  }, [data]);
  const options = (field: 'category' | 'brand') => [
    'TODAS',
    ...new Set(ranked.map((item) => item[field]).filter(Boolean)),
  ];
  const filtered = ranked.filter((item) => {
    const q = query.toLocaleLowerCase('pt-BR');
    const matches =
      !q ||
      `${item.id} ${item.description} ${item.category} ${item.subbrand}`
        .toLocaleLowerCase('pt-BR')
        .includes(q);
    const statusOk =
      status === 'TODOS' ||
      (status === 'COM ESTOQUE' && item.available > 0) ||
      (status === 'RUPTURA' && item.available <= 0) ||
      (status === 'EM TRÂNSITO' && item.inTransit > 0);
    return (
      matches &&
      statusOk &&
      (curve === 'TODAS' || item.curve === curve) &&
      (category === 'TODAS' || item.category === category) &&
      (brand === 'TODAS' || item.brand === brand)
    );
  });
  const stockCost = ranked.reduce((s, i) => s + i.available * i.cost, 0);
  const saleValue = ranked.reduce((s, i) => s + i.available * i.price, 0);
  const transitValue = ranked.reduce((s, i) => s + i.transitValue, 0);
  const ruptures = ranked.filter((i) => i.available <= 0 && i.sales > 0).length;
  const weightedTurn = ranked.reduce((s, i) => s + i.turnover, 0);
  const coverage = weightedTurn
    ? ranked.reduce((s, i) => s + i.available, 0) / weightedTurn
    : 0;
  const projectedCost = stockCost + transitValue;
  const currentShare = projectedCost ? (stockCost / projectedCost) * 100 : 0;
  const transitShare = projectedCost ? (transitValue / projectedCost) * 100 : 0;
  const grossPotential = saleValue - stockCost;
  const marginPotential = saleValue ? (grossPotential / saleValue) * 100 : 0;
  const reservedUnits = ranked.reduce((s, i) => s + i.reserved, 0);
  const availableSkus = ranked.filter((i) => i.available > 0).length;
  const categories = [...new Set(ranked.map((i) => i.category))]
    .map((name) => {
      const list = ranked.filter((i) => i.category === name);
      return {
        name,
        value: list.reduce((s, i) => s + i.available * i.cost, 0),
        ruptures: list.filter((i) => i.available <= 0 && i.sales > 0).length,
        coverage: list.reduce((s, i) => s + i.turnover, 0)
          ? list.reduce((s, i) => s + i.available, 0) /
            list.reduce((s, i) => s + i.turnover, 0)
          : 0,
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
  const hasFilters =
    status !== 'TODOS' ||
    curve !== 'TODAS' ||
    category !== 'TODAS' ||
    brand !== 'TODAS';
  return (
    <section className={styles.page} aria-label="Gestão de estoque">
      {usingDemo && (
        <div className={styles.preview}>
          PRÉVIA VISUAL · OS VALORES SERÃO SUBSTITUÍDOS PELOS DADOS PROCESSADOS
        </div>
      )}
      <div className={styles.hero}>
        <article className={styles.primaryMetric}>
          <header>
            <WalletCards />
            <span>POSIÇÃO DO ESTOQUE</span>
          </header>
          <div className={styles.metricBody}>
            <div
              className={styles.stockRing}
              style={
                { '--current': `${currentShare * 3.6}deg` } as CSSProperties
              }
            >
              <div>
                <strong>{currentShare.toFixed(0)}%</strong>
                <span>DISPONÍVEL</span>
              </div>
            </div>
            <div className={styles.metricValue}>
              <small>CUSTO ATUAL</small>
              <strong>{compact(stockCost)}</strong>
              <span>Projetado em {compact(projectedCost)}</span>
            </div>
          </div>
          <footer>
            <div>
              <span>EM TRÂNSITO</span>
              <strong>{compact(transitValue)}</strong>
            </div>
            <b>{transitShare.toFixed(0)}% da posição</b>
          </footer>
        </article>
        <article className={styles.primaryMetric}>
          <header>
            <Boxes />
            <span>POTENCIAL DE VENDA</span>
          </header>
          <div className={styles.metricBody}>
            <div
              className={styles.stockRing}
              style={
                {
                  '--current': `${Math.min(marginPotential, 100) * 3.6}deg`,
                } as CSSProperties
              }
            >
              <div>
                <strong>{marginPotential.toFixed(1)}%</strong>
                <span>MARGEM</span>
              </div>
            </div>
            <div className={styles.metricValue}>
              <small>ESTOQUE À VENDA</small>
              <strong>{compact(saleValue)}</strong>
              <span>{compact(grossPotential)} de margem bruta</span>
            </div>
          </div>
          <footer>
            <div>
              <span>SKUS PRECIFICADOS</span>
              <strong>{ranked.filter((i) => i.price > 0).length}</strong>
            </div>
            <b>Base comercial</b>
          </footer>
        </article>
        <article className={styles.primaryMetric}>
          <header>
            <PackageCheck />
            <span>COBERTURA MÉDIA</span>
          </header>
          <div className={styles.coverageBody}>
            <div>
              <small>POSIÇÃO ATUAL</small>
              <strong>
                {coverage.toFixed(0)} <em>dias</em>
              </strong>
              <span>Disponível em relação ao giro</span>
            </div>
            <div className={styles.coverageScale}>
              <i style={{ left: `${Math.min(coverage / 60, 1) * 100}%` }} />
              <span>0</span>
              <span>30</span>
              <span>60+</span>
            </div>
          </div>
          <footer>
            <div>
              <span>FAIXA SAUDÁVEL</span>
              <strong>25–35 dias</strong>
            </div>
            <b className={coverage < 25 || coverage > 35 ? styles.alert : ''}>
              {coverage < 25
                ? 'Atenção ao abastecimento'
                : coverage > 35
                  ? 'Capital elevado'
                  : 'Estoque saudável'}
            </b>
          </footer>
        </article>
      </div>
      <div className={styles.secondaryMetrics}>
        <MiniMetric
          icon={<AlertTriangle />}
          label="RUPTURAS"
          value={String(ruptures)}
          detail="com venda e sem saldo"
          critical
        />
        <MiniMetric
          icon={<Boxes />}
          label="SKUS DISPONÍVEIS"
          value={String(availableSkus)}
          detail={`${ranked.length} itens monitorados`}
        />
        <MiniMetric
          icon={<PackageCheck />}
          label="RESERVADO"
          value={reservedUnits.toLocaleString('pt-BR')}
          detail="unidades comprometidas"
        />
        <MiniMetric
          icon={<Truck />}
          label="A RECEBER"
          value={compact(transitValue)}
          detail={`${ranked.filter((i) => i.inTransit > 0).length} SKUs em trânsito`}
        />
      </div>
      <article className={styles.composition}>
        <header>
          <div>
            <h1>Composição do estoque</h1>
            <span>Valor a custo, cobertura e rupturas por categoria</span>
          </div>
          <strong>{compact(stockCost)}</strong>
        </header>
        <div
          className={styles.compositionBar}
          aria-label="Participação por categoria"
        >
          {categories.map((item, index) => (
            <i
              key={item.name}
              className={styles[`tone${index + 1}`]}
              style={{
                width: `${stockCost ? (item.value / stockCost) * 100 : 0}%`,
              }}
            />
          ))}
        </div>
        <div className={styles.categoryGrid}>
          {categories.map((item, index) => (
            <div key={item.name}>
              <div
                className={`${styles.categoryMarker} ${styles[`tone${index + 1}`]}`}
              >
                0{index + 1}
              </div>
              <span>{item.name}</span>
              <strong>{compact(item.value)}</strong>
              <b>
                {stockCost
                  ? ((item.value / stockCost) * 100).toFixed(1)
                  : '0,0'}
                %
              </b>
              <small>{item.coverage.toFixed(0)} dias de cobertura</small>
              <em className={item.ruptures ? styles.risk : ''}>
                {item.ruptures ? `${item.ruptures} rupturas` : 'Sem ruptura'}
              </em>
            </div>
          ))}
        </div>
      </article>
      <div className={styles.toolbar}>
        <label>
          <Search />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar produto, código, categoria ou sub-marca"
          />
        </label>
        <div className={styles.filters}>
          <Filter
            label="SITUAÇÃO"
            value={status}
            options={['TODOS', 'COM ESTOQUE', 'RUPTURA', 'EM TRÂNSITO']}
            onChange={setStatus}
          />
          <Filter
            label="CURVA"
            value={curve}
            options={['TODAS', 'A', 'B', 'C']}
            onChange={setCurve}
          />
          <Filter
            label="CATEGORIA"
            value={category}
            options={options('category')}
            onChange={setCategory}
          />
          <Filter
            label="MARCA"
            value={brand}
            options={options('brand')}
            onChange={setBrand}
          />
          {hasFilters && (
            <button
              onClick={() => {
                setStatus('TODOS');
                setCurve('TODAS');
                setCategory('TODAS');
                setBrand('TODAS');
              }}
            >
              LIMPAR
            </button>
          )}
        </div>
      </div>
      <article className={styles.panel}>
        <header>
          <div>
            <h2>Posição por produto</h2>
            <span>{filtered.length} produtos na seleção</span>
          </div>
          <strong>
            {compact(filtered.reduce((s, i) => s + i.available * i.cost, 0))}
          </strong>
        </header>
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>PRODUTO</th>
                <th>CURVA</th>
                <th>DISPONÍVEL</th>
                <th>RESERVADO</th>
                <th>EM TRÂNSITO</th>
                <th>COBERTURA</th>
                <th>CUSTO</th>
                <th>VALOR A CUSTO</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <ProductRows
                  key={item.id}
                  item={item}
                  open={expanded === item.id}
                  onToggle={() =>
                    setExpanded(expanded === item.id ? null : item.id)
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
function MiniMetric({
  icon,
  label,
  value,
  detail,
  critical = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  critical?: boolean;
}) {
  return (
    <article
      className={`${styles.miniMetric} ${critical ? styles.critical : ''}`}
    >
      <div>
        {icon}
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}
function Filter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const selected = value !== 'TODOS' && value !== 'TODAS';
  return (
    <label className={`${styles.filter} ${selected ? styles.selected : ''}`}>
      <span>{label}</span>
      <select
        aria-label={`Filtrar por ${label.toLocaleLowerCase('pt-BR')}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}
function ProductRows({
  item,
  open,
  onToggle,
}: {
  item: StockItem;
  open: boolean;
  onToggle: () => void;
}) {
  const risk =
    item.available <= 0
      ? 'RUPTURA'
      : item.coverage < 15
        ? 'BAIXA'
        : item.coverage > 60
          ? 'ALTA'
          : 'SAUDÁVEL';
  return (
    <>
      <tr className={open ? styles.open : ''} onClick={onToggle}>
        <td>
          <strong>{item.description}</strong>
          <small>
            {item.id} · {item.subbrand || item.category}
          </small>
        </td>
        <td>
          <b className={styles.curve}>{item.curve}</b>
        </td>
        <td>
          <strong>{item.available.toLocaleString('pt-BR')}</strong>
        </td>
        <td>{item.reserved.toLocaleString('pt-BR')}</td>
        <td>{item.inTransit ? item.inTransit.toLocaleString('pt-BR') : '—'}</td>
        <td>
          <span
            className={
              risk === 'SAUDÁVEL'
                ? styles.ok
                : risk === 'ALTA'
                  ? styles.high
                  : styles.warn
            }
          >
            {item.coverage.toFixed(0)} DIAS · {risk}
          </span>
        </td>
        <td>{money.format(item.cost)}</td>
        <td>
          <strong>{money.format(item.available * item.cost)}</strong>
        </td>
        <td>{open ? <ChevronUp /> : <ChevronDown />}</td>
      </tr>
      {open && (
        <tr className={styles.detailRow}>
          <td colSpan={9}>
            <div className={styles.detail}>
              <Detail label="PREÇO DE VENDA" value={money.format(item.price)} />
              <Detail
                label="VALOR À VENDA"
                value={money.format(item.available * item.price)}
              />
              <Detail
                label="VENDA NO MÊS"
                value={item.sales.toLocaleString('pt-BR')}
              />
              <Detail
                label="GIRO DIÁRIO"
                value={item.turnover.toLocaleString('pt-BR')}
              />
              <Detail
                label="CARTEIRA"
                value={`${item.inTransit.toLocaleString('pt-BR')} un.`}
              />
              <Detail
                label="VALOR EM TRÂNSITO"
                value={money.format(item.transitValue)}
              />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
