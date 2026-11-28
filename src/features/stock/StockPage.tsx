import {
  AlertTriangle,
  Boxes,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  FileText,
  PackageCheck,
  ReceiptText,
  Search,
  Star,
  Truck,
  WalletCards,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
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
  ean: string;
  supplierCode: string;
  factoryCode: string;
  boxFactor: number;
  blocked: number;
  costNoSt: number;
  costWithSt: number;
  weight: string;
  pack: string;
  assortment: string;
  lastYearSales: number;
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
  ean: `78910${String(item[0]).padStart(8, '0')}`,
  supplierCode: `FOR-${item[0]}`,
  factoryCode: `FAB-${item[0]}`,
  boxFactor: 12,
  blocked: Number(item[6]) * 0.15,
  costNoSt: Number(item[7]) * 0.92,
  costWithSt: Number(item[7]),
  weight: '90 g',
  pack: 'Caixa com 12 unidades',
  assortment: Number(item[5]) > 0 ? 'ATIVO' : 'FORA DO SORTIMENTO',
  lastYearSales: Number(item[9]) * 0.88,
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
      ean: t(row, 'ean'),
      supplierCode: t(row, 'cod_fornecedor') || t(row, 'codprodfornec'),
      factoryCode: t(row, 'cod_fabrica') || t(row, 'cod_industria'),
      boxFactor: n(row, 'fator_caixa') || n(row, 'qtd_embalagem') || 1,
      blocked: n(row, 'est_bloqueado'),
      costNoSt: n(row, 'custo_sem_st') || n(row, 'custo_fin'),
      costWithSt: n(row, 'custo_com_st') || n(row, 'custo_fin'),
      weight: t(row, 'gramatura') || t(row, 'peso'),
      pack: t(row, 'embalagem') || t(row, 'paletizacao'),
      assortment: t(row, 'sort_status') || t(row, 'status_sortimento'),
      lastYearSales: n(row, 'venda_ano_anterior'),
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
  const { section = 'resumo' } = useParams();
  const navigate = useNavigate();
  const view =
    section === 'produtos'
      ? 'PRODUTOS'
      : section === 'itens-de-foco'
        ? 'FOCO'
        : section === 'notas'
          ? 'NOTAS'
          : 'RESUMO';
  const [items, setItems] = useState<StockItem[]>([]);
  const [purchases, setPurchases] = useState<BaseRow[]>([]);
  const [valueMode, setValueMode] = useState<'CUSTO' | 'VENDA'>('VENDA');
  const [focusItems, setFocusItems] = useState<string[]>(() => {
    try {
      return JSON.parse(
        localStorage.getItem('red-jacket:focus-items') ?? '[]',
      ) as string[];
    } catch {
      return [];
    }
  });
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('TODOS');
  const [curve, setCurve] = useState('TODAS');
  const [category, setCategory] = useState('TODAS');
  const [brand, setBrand] = useState('TODAS');
  const [expanded, setExpanded] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void Promise.all([loadBaseRows('produtos'), loadBaseRows('compras')])
      .then(([products, purchaseRows]) => {
        if (!alive) return;
        setPurchases(purchaseRows);
        setItems(buildStock(products, purchaseRows));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    localStorage.setItem('red-jacket:focus-items', JSON.stringify(focusItems));
  }, [focusItems]);
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
    const normalize = (value: string) =>
      value
        .toLocaleLowerCase('pt-BR')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    const tokens = normalize(query).split(/\s+/).filter(Boolean);
    const haystack = normalize(
      `${item.id} ${item.ean} ${item.supplierCode} ${item.factoryCode} ${item.description} ${item.category} ${item.subbrand} ${item.brand}`,
    );
    const matches = tokens.every((token) => haystack.includes(token));
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
        sales: list.reduce((s, i) => s + i.sales, 0),
        ruptures: list.filter((i) => i.available <= 0 && i.sales > 0).length,
        coverage: list.reduce((s, i) => s + i.turnover, 0)
          ? list.reduce((s, i) => s + i.available, 0) /
            list.reduce((s, i) => s + i.turnover, 0)
          : 0,
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
  const compositionCells = buildCompositionCells(categories, stockCost);
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
      {view === 'RESUMO' && (
        <>
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
                <b
                  className={coverage < 25 || coverage > 35 ? styles.alert : ''}
                >
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
            <div className={styles.compositionVisual}>
              <div
                className={styles.waffle}
                aria-label="Cada bloco representa um por cento do estoque"
              >
                {compositionCells.map((categoryIndex, cellIndex) => (
                  <i
                    key={cellIndex}
                    className={styles[`waffleTone${categoryIndex + 1}`]}
                  />
                ))}
              </div>
              <div className={styles.compositionLegend}>
                {categories.map((item, index) => {
                  const share = stockCost ? (item.value / stockCost) * 100 : 0;
                  return (
                    <div key={item.name}>
                      <i className={styles[`waffleTone${index + 1}`]} />
                      <div>
                        <span>{item.name}</span>
                        <strong>{share.toFixed(1)}%</strong>
                        <small>
                          {compact(item.value)} · {item.coverage.toFixed(0)}{' '}
                          dias
                        </small>
                      </div>
                      <em className={item.ruptures ? styles.risk : ''}>
                        {item.ruptures
                          ? `${item.ruptures} rupturas`
                          : 'Sem ruptura'}
                      </em>
                    </div>
                  );
                })}
              </div>
            </div>
          </article>
          <StockBalance categories={categories} total={stockCost} />
        </>
      )}
      {view === 'PRODUTOS' && (
        <>
          <div className={styles.toolbar}>
            <label>
              <Search />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nome, código, EAN, fornecedor, marca ou categoria"
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
                {compact(
                  filtered.reduce(
                    (s, i) =>
                      s +
                      i.available *
                        (valueMode === 'CUSTO' ? i.costWithSt : i.price),
                    0,
                  ),
                )}
              </strong>
              <div className={styles.valueToggle}>
                <button
                  className={valueMode === 'CUSTO' ? styles.selectedMode : ''}
                  onClick={() => setValueMode('CUSTO')}
                >
                  CUSTO
                </button>
                <button
                  className={valueMode === 'VENDA' ? styles.selectedMode : ''}
                  onClick={() => setValueMode('VENDA')}
                >
                  VENDA
                </button>
              </div>
            </header>
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>PRODUTO</th>
                    <th>CURVA</th>
                    <th>DISPONÍVEL</th>
                    <th>RESERVADO</th>
                    <th>ENTRADA</th>
                    <th>COBERTURA</th>
                    <th>PREÇO</th>
                    <th>VALOR EM ESTOQUE</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <ProductRows
                      key={item.id}
                      item={item}
                      open={expanded === item.id}
                      valueMode={valueMode}
                      focused={focusItems.includes(item.id)}
                      onFocus={() =>
                        setFocusItems((current) =>
                          current.includes(item.id)
                            ? current.filter((id) => id !== item.id)
                            : [...current, item.id],
                        )
                      }
                      onToggle={() =>
                        setExpanded(expanded === item.id ? null : item.id)
                      }
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </>
      )}
      {view === 'FOCO' && (
        <FocusWorkspace
          items={ranked.filter((item) => focusItems.includes(item.id))}
          onRemove={(id) =>
            setFocusItems((current) => current.filter((item) => item !== id))
          }
          onGoProducts={() => void navigate('/estoque/produtos')}
        />
      )}
      {view === 'NOTAS' && <NotesWorkspace rows={purchases} items={ranked} />}
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
  valueMode,
  focused,
  onFocus,
}: {
  item: StockItem;
  open: boolean;
  onToggle: () => void;
  valueMode: 'CUSTO' | 'VENDA';
  focused: boolean;
  onFocus: () => void;
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
            {item.id} · {item.ean || 'EAN NÃO INFORMADO'} ·{' '}
            {item.subbrand || item.category}
          </small>
        </td>
        <td>
          <b className={styles.curve}>{item.curve}</b>
        </td>
        <td>
          <Quantity value={item.available} factor={item.boxFactor} />
        </td>
        <td>
          <Quantity value={item.reserved} factor={item.boxFactor} />
        </td>
        <td>
          <Quantity value={item.inTransit} factor={item.boxFactor} />
        </td>
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
        <td>
          {money.format(valueMode === 'CUSTO' ? item.costWithSt : item.price)}
          <small>{valueMode === 'CUSTO' ? 'COM ST' : 'VENDA'}</small>
        </td>
        <td>
          <strong>
            {money.format(
              item.available *
                (valueMode === 'CUSTO' ? item.costWithSt : item.price),
            )}
          </strong>
        </td>
        <td>
          <button
            className={`${styles.focusButton} ${focused ? styles.focused : ''}`}
            title={
              focused
                ? 'Remover dos itens de foco'
                : 'Adicionar aos itens de foco'
            }
            onClick={(event) => {
              event.stopPropagation();
              onFocus();
            }}
          >
            <Star />
          </button>
          {open ? <ChevronUp /> : <ChevronDown />}
        </td>
      </tr>
      {open && (
        <tr className={styles.detailRow}>
          <td colSpan={9}>
            <div className={styles.productSheet}>
              <section>
                <h3>POSIÇÃO OPERACIONAL</h3>
                <div className={styles.detail}>
                  <Detail
                    label="DISPONÍVEL"
                    value={`${item.available.toLocaleString('pt-BR')} un. · ${(item.available / item.boxFactor).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} cx.`}
                  />
                  <Detail
                    label="RESERVADO"
                    value={`${item.reserved.toLocaleString('pt-BR')} un. · ${(item.reserved / item.boxFactor).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} cx.`}
                  />
                  <Detail
                    label="BLOQUEADO"
                    value={`${item.blocked.toLocaleString('pt-BR')} un.`}
                  />
                  <Detail
                    label="EM TRÂNSITO"
                    value={`${item.inTransit.toLocaleString('pt-BR')} un.`}
                  />
                  <Detail
                    label="COBERTURA"
                    value={`${item.coverage.toFixed(0)} dias`}
                  />
                  <Detail
                    label="GIRO DIÁRIO"
                    value={item.turnover.toLocaleString('pt-BR')}
                  />
                </div>
              </section>
              <section>
                <h3>PREÇO E RENTABILIDADE</h3>
                <div className={styles.detail}>
                  <Detail
                    label="CUSTO SEM ST"
                    value={money.format(item.costNoSt)}
                  />
                  <Detail
                    label="CUSTO COM ST"
                    value={money.format(item.costWithSt)}
                  />
                  <Detail
                    label="CUSTO FINANCEIRO"
                    value={money.format(item.cost)}
                  />
                  <Detail
                    label="PREÇO DE VENDA"
                    value={money.format(item.price)}
                  />
                  <Detail
                    label="MARGEM DO ITEM"
                    value={`${item.price ? (((item.price - item.costWithSt) / item.price) * 100).toFixed(1) : '0,0'}%`}
                  />
                  <Detail
                    label="ESTOQUE À VENDA"
                    value={money.format(item.available * item.price)}
                  />
                </div>
              </section>
              <section>
                <h3>DESEMPENHO E SORTIMENTO</h3>
                <div className={styles.detail}>
                  <Detail
                    label="VENDA NO MÊS"
                    value={item.sales.toLocaleString('pt-BR')}
                  />
                  <Detail
                    label="MESMO PERÍODO AA"
                    value={item.lastYearSales.toLocaleString('pt-BR')}
                  />
                  <Detail
                    label="CRESCIMENTO"
                    value={`${item.lastYearSales ? ((item.sales / item.lastYearSales - 1) * 100).toFixed(1) : '0,0'}%`}
                  />
                  <Detail
                    label="SORTIMENTO"
                    value={item.assortment || 'NÃO CLASSIFICADO'}
                  />
                  <Detail label="CURVA" value={item.curve} />
                  <Detail
                    label="CARTEIRA"
                    value={money.format(item.transitValue)}
                  />
                </div>
              </section>
              <section>
                <h3>CADASTRO E LOGÍSTICA</h3>
                <div className={styles.detail}>
                  <Detail label="CÓDIGO INTERNO" value={item.id} />
                  <Detail label="EAN" value={item.ean || '—'} />
                  <Detail
                    label="CÓDIGO FORNECEDOR"
                    value={item.supplierCode || '—'}
                  />
                  <Detail
                    label="CÓDIGO FÁBRICA"
                    value={item.factoryCode || '—'}
                  />
                  <Detail
                    label="MARCA / SUBMARCA"
                    value={`${item.brand || '—'} / ${item.subbrand || '—'}`}
                  />
                  <Detail label="CATEGORIA" value={item.category} />
                  <Detail label="EMBALAGEM" value={item.pack || '—'} />
                  <Detail label="GRAMATURA" value={item.weight || '—'} />
                  <Detail label="FATOR CAIXA" value={`${item.boxFactor} un.`} />
                </div>
              </section>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
function Quantity({ value, factor }: { value: number; factor: number }) {
  return (
    <div className={styles.quantity}>
      <strong>
        {value.toLocaleString('pt-BR')} <small>UN.</small>
      </strong>
      <span>
        {factor
          ? (value / factor).toLocaleString('pt-BR', {
              maximumFractionDigits: 1,
            })
          : '—'}{' '}
        CX.
      </span>
    </div>
  );
}
function StockBalance({
  categories,
  total,
}: {
  categories: Array<{ name: string; value: number; sales: number }>;
  total: number;
}) {
  const totalSales = categories.reduce((sum, item) => sum + item.sales, 0);
  return (
    <article className={styles.balancePanel}>
      <header>
        <div>
          <h2>ESTOQUE × PLANEJAMENTO DE VENDA</h2>
          <span>
            Participação atual comparada ao peso comercial de cada categoria
          </span>
        </div>
        <b>ALINHAMENTO POR LINHA</b>
      </header>
      <div className={styles.balanceRows}>
        {categories.map((item) => {
          const actual = total ? (item.value / total) * 100 : 0;
          const plan = totalSales ? (item.sales / totalSales) * 100 : 0;
          const gap = actual - plan;
          return (
            <div key={item.name}>
              <div className={styles.balanceLabel}>
                <strong>{item.name}</strong>
                <span className={Math.abs(gap) > 5 ? styles.risk : ''}>
                  {gap > 5
                    ? 'ESTOQUE ACIMA'
                    : gap < -5
                      ? 'OPORTUNIDADE DE COMPRA'
                      : 'ALINHADO'}
                </span>
              </div>
              <div className={styles.balanceVisual}>
                <div>
                  <b style={{ height: `${Math.max(actual, 2)}%` }} />
                  <strong>{actual.toFixed(1)}%</strong>
                  <span>ESTOQUE</span>
                </div>
                <div>
                  <b style={{ height: `${Math.max(plan, 2)}%` }} />
                  <strong>{plan.toFixed(1)}%</strong>
                  <span>PLANEJADO</span>
                </div>
              </div>
              <div className={styles.balanceMeta}>
                <span>DESVIO</span>
                <b>
                  {gap > 0 ? '+' : ''}
                  {gap.toFixed(1)} pp
                </b>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function buildCompositionCells(
  categories: Array<{ value: number }>,
  total: number,
) {
  if (!categories.length || !total) return Array.from({ length: 100 }, () => 0);
  const exact = categories.map((item) => (item.value / total) * 100);
  const counts = exact.map(Math.floor);
  let remaining = 100 - counts.reduce((sum, value) => sum + value, 0);
  exact
    .map((value, index) => ({ index, fraction: value - counts[index]! }))
    .sort((a, b) => b.fraction - a.fraction)
    .forEach(({ index }) => {
      if (remaining > 0) {
        counts[index] = (counts[index] ?? 0) + 1;
        remaining -= 1;
      }
    });
  return counts
    .flatMap((count, index) => Array.from({ length: count }, () => index))
    .slice(0, 100);
}

function FocusWorkspace({
  items,
  onRemove,
  onGoProducts,
}: {
  items: StockItem[];
  onRemove: (id: string) => void;
  onGoProducts: () => void;
}) {
  const [labels, setLabels] = useState<Record<string, string>>({});
  return (
    <article className={styles.workspace}>
      <header>
        <div>
          <Star />
          <div>
            <h2>ITENS DE FOCO</h2>
            <span>
              Seleção manual de lançamentos, packs e prioridades comerciais
            </span>
          </div>
        </div>
        <button onClick={onGoProducts}>SELECIONAR PRODUTOS</button>
      </header>
      {items.length === 0 ? (
        <div className={styles.emptyState}>
          <Star />
          <strong>Nenhum item selecionado</strong>
          <span>
            Use a estrela na lista de produtos para construir esta visão.
          </span>
          <button onClick={onGoProducts}>ABRIR PRODUTOS</button>
        </div>
      ) : (
        <div className={styles.focusGrid}>
          {items.map((item) => (
            <div key={item.id}>
              <div>
                <span>{item.category}</span>
                <button onClick={() => onRemove(item.id)}>REMOVER</button>
              </div>
              <strong>{item.description}</strong>
              <small>
                {item.id} · {item.ean}
              </small>
              <label>
                CLASSIFICAÇÃO
                <select
                  value={labels[item.id] ?? 'ITEM DE FOCO'}
                  onChange={(event) =>
                    setLabels((current) => ({
                      ...current,
                      [item.id]: event.target.value,
                    }))
                  }
                >
                  <option>ITEM DE FOCO</option>
                  <option>LANÇAMENTO</option>
                  <option>PACK PROMOCIONAL</option>
                  <option>PRIORIDADE DE COMPRA</option>
                  <option>RISCO DE RUPTURA</option>
                </select>
              </label>
              <footer>
                <span>{item.available.toLocaleString('pt-BR')} un.</span>
                <b>{money.format(item.available * item.price)}</b>
              </footer>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function NotesWorkspace({
  rows,
  items,
}: {
  rows: BaseRow[];
  items: StockItem[];
}) {
  const [noteQuery, setNoteQuery] = useState('');
  const normalize = (value: string) =>
    value
      .toLocaleLowerCase('pt-BR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  const tokens = normalize(noteQuery).split(/\s+/).filter(Boolean);
  const notes = rows
    .map((row, index) => {
      const code = t(row, 'codprod') || t(row, 'ean');
      const product = items.find(
        (item) => item.id === code || item.ean === code,
      );
      return {
        id: t(row, 'nota') || t(row, 'num_nota') || `NF-${index + 1}`,
        code,
        product:
          product?.description ||
          t(row, 'descricao') ||
          'ITEM NÃO IDENTIFICADO',
        supplier: t(row, 'fornecedor') || t(row, 'industria') || 'FORNECEDOR',
        qty: n(row, 'qtd_un'),
        value: n(row, 'valor_item'),
        expected: t(row, 'data_prevista') || t(row, 'dt_previsao'),
        received: n(row, 'compoe_carteira_aberta') !== 1,
      };
    })
    .filter((note) =>
      tokens.every((token) =>
        normalize(
          `${note.id} ${note.code} ${note.product} ${note.supplier}`,
        ).includes(token),
      ),
    );
  const uniqueNotes = new Set(notes.map((note) => note.id)).size;
  return (
    <article className={styles.workspace}>
      <header>
        <div>
          <ReceiptText />
          <div>
            <h2>NOTAS E RECEBIMENTOS</h2>
            <span>
              Consulte o que chegou e o que ainda está previsto por qualquer
              identificação do item
            </span>
          </div>
        </div>
      </header>
      <div className={styles.noteMetrics}>
        <MiniMetric
          icon={<FileText />}
          label="NOTAS ENCONTRADAS"
          value={String(uniqueNotes)}
          detail="na pesquisa atual"
        />
        <MiniMetric
          icon={<Truck />}
          label="A RECEBER"
          value={String(
            new Set(notes.filter((n) => !n.received).map((n) => n.id)).size,
          )}
          detail="notas em carteira"
        />
        <MiniMetric
          icon={<CircleCheck />}
          label="RECEBIDAS"
          value={String(
            new Set(notes.filter((n) => n.received).map((n) => n.id)).size,
          )}
          detail="histórico disponível"
        />
      </div>
      <label className={styles.noteSearch}>
        <Search />
        <input
          value={noteQuery}
          onChange={(event) => setNoteQuery(event.target.value)}
          placeholder="Busque por nota, nome, EAN, código interno ou fornecedor"
        />
      </label>
      <div className={styles.noteList}>
        {notes.slice(0, 80).map((note, index) => (
          <div key={`${note.id}-${note.code}-${index}`}>
            <span className={note.received ? styles.received : styles.pending}>
              {note.received ? 'RECEBIDA' : 'A RECEBER'}
            </span>
            <strong>{note.id}</strong>
            <div>
              <b>{note.product}</b>
              <small>
                {note.code} · {note.supplier}
              </small>
            </div>
            <span>{note.qty.toLocaleString('pt-BR')} un.</span>
            <span>{money.format(note.value)}</span>
            <small>{note.expected || 'Data não informada'}</small>
          </div>
        ))}
      </div>
    </article>
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
