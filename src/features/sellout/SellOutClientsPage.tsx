import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  Search,
  Target,
  TrendingUp,
  UsersRound,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { loadBaseRows } from '../../engines/storage';
import type { BaseRow } from '../../engines/core/types';
import styles from './SellOutClientsPage.module.css';

type ClientResult = {
  id: string;
  name: string;
  city: string;
  seller: string;
  profile: string;
  range: string;
  billed: number;
  pipeline: number;
  returns: number;
  previous: number;
  lastPurchase: string;
  movements: { date: string; type: string; product: string; value: number }[];
};

const money = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});
const shortMoney = (value: number) =>
  value >= 1_000_000
    ? `R$ ${(value / 1_000_000).toFixed(2).replace('.', ',')} mi`
    : value >= 1_000
      ? `R$ ${(value / 1_000).toFixed(0)} mil`
      : money.format(value);
const text = (row: BaseRow, key: string) => String(row[key] ?? '');
const num = (row: BaseRow, key: string) => Number(row[key] ?? 0);

const demo: ClientResult[] = [
  [
    '10024',
    'Mercado Horizonte',
    'Campo Grande',
    'Ana Martins',
    'Diamante',
    'A',
    284600,
    38200,
    0,
    251300,
    '24/11',
  ],
  [
    '10318',
    'Rede Bom Vizinho',
    'Dourados',
    'Carlos Nunes',
    'Ouro',
    'A',
    231400,
    19400,
    -6400,
    220800,
    '23/11',
  ],
  [
    '10872',
    'Supermercado Central',
    'Três Lagoas',
    'Marina Costa',
    'Ouro',
    'B',
    187900,
    26600,
    0,
    194500,
    '21/11',
  ],
  [
    '11209',
    'Comercial Pantanal',
    'Corumbá',
    'Rafael Lima',
    'Prata',
    'B',
    143800,
    9800,
    -3200,
    128400,
    '19/11',
  ],
  [
    '11744',
    'Mercado Avenida',
    'Ponta Porã',
    'Bianca Alves',
    'Prata',
    'B',
    121600,
    17400,
    0,
    136900,
    '17/11',
  ],
  [
    '12281',
    'Empório do Sul',
    'Naviraí',
    'Diego Rocha',
    'Bronze',
    'C',
    89400,
    6800,
    0,
    105200,
    '12/11',
  ],
  [
    '12806',
    'Atacado União',
    'Nova Andradina',
    'Bronze',
    'Bronze',
    'C',
    64200,
    12300,
    -1800,
    91300,
    '08/11',
  ],
  [
    '13157',
    'Mercantil São José',
    'Aquidauana',
    'Luiza Freitas',
    'Bronze',
    'C',
    37800,
    0,
    0,
    75400,
    '02/11',
  ],
].map((item, index) => ({
  id: String(item[0]),
  name: String(item[1]),
  city: String(item[2]),
  seller: String(item[3]),
  profile: String(item[4]),
  range: String(item[5]),
  billed: Number(item[6]),
  pipeline: Number(item[7]),
  returns: Number(item[8]),
  previous: Number(item[9]),
  lastPurchase: String(item[10]),
  movements: [
    {
      date: `${24 - index}/11`,
      type: 'FATURADO',
      product: 'Linha principal',
      value: Number(item[6]) * 0.64,
    },
    {
      date: `${18 - Math.min(index, 7)}/11`,
      type: 'FATURADO',
      product: 'Complemento de mix',
      value: Number(item[6]) * 0.36,
    },
    ...(Number(item[7])
      ? [
          {
            date: '26/11',
            type: 'A FATURAR',
            product: 'Carteira confirmada',
            value: Number(item[7]),
          },
        ]
      : []),
  ],
}));

function buildResults(
  clients: BaseRow[],
  movements: BaseRow[],
): ClientResult[] {
  const clientMap = new Map<string, BaseRow>();
  clients.forEach((row) => {
    const id = text(row, 'cod_cliente') || text(row, 'cnpj_cpf');
    if (id) clientMap.set(id, row);
  });
  const grouped = new Map<string, ClientResult>();
  movements.forEach((row) => {
    const id = text(row, 'cod_cliente_novo') || text(row, 'cnpj_cpf_cliente');
    if (!id) return;
    const client = clientMap.get(id);
    const value = num(row, 'valor_oficial');
    const kind = text(row, 'classe_movimento');
    const situation = text(row, 'situacao_faturamento');
    const date = text(row, 'data_movimento');
    const current = grouped.get(id) ?? {
      id,
      name: text(client ?? row, 'nome') || `Cliente ${id}`,
      city: text(client ?? row, 'cidade'),
      seller:
        text(row, 'cod_vendedor_novo') ||
        text(row, 'cod_vendedor_antigo') ||
        '—',
      profile: text(client ?? row, 'perfil'),
      range: text(client ?? row, 'faixa'),
      billed: 0,
      pipeline: 0,
      returns: 0,
      previous: 0,
      lastPurchase: '',
      movements: [],
    };
    if (kind === 'DEVOLUCAO') current.returns += Math.abs(value);
    else if (kind === 'VENDA' && situation === 'A_FATURAR')
      current.pipeline += value;
    else if (kind === 'VENDA') current.billed += value;
    if (date > current.lastPurchase) current.lastPurchase = date;
    current.movements.push({
      date: date ? date.slice(8, 10) + '/' + date.slice(5, 7) : '—',
      type: kind === 'DEVOLUCAO' ? 'DEVOLUÇÃO' : situation.replaceAll('_', ' '),
      product: text(row, 'codprod_novo') || text(row, 'ean') || 'Produto',
      value: kind === 'DEVOLUCAO' ? -Math.abs(value) : value,
    });
    grouped.set(id, current);
  });
  return [...grouped.values()]
    .filter((client) => client.billed || client.pipeline)
    .sort((a, b) => b.billed - a.billed);
}

export function SellOutClientsPage() {
  const [rows, setRows] = useState<ClientResult[]>([]);
  const [query, setQuery] = useState('');
  const [profile, setProfile] = useState('TODOS');
  const [riskOnly, setRiskOnly] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void Promise.all([loadBaseRows('clientes'), loadBaseRows('movimentacoes')])
      .then(
        ([clients, movements]) =>
          alive && setRows(buildResults(clients, movements)),
      )
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const usingDemo = rows.length === 0;
  const data = usingDemo ? demo : rows;
  const profiles = [
    'TODOS',
    ...new Set(data.map((client) => client.profile).filter(Boolean)),
  ];
  const filtered = useMemo(
    () =>
      data.filter((client) => {
        const q = query.toLocaleLowerCase('pt-BR');
        const matches =
          !q ||
          `${client.name} ${client.id} ${client.city} ${client.seller}`
            .toLocaleLowerCase('pt-BR')
            .includes(q);
        const variation = client.previous
          ? client.billed / client.previous - 1
          : 0;
        return (
          matches &&
          (profile === 'TODOS' || client.profile === profile) &&
          (!riskOnly || variation < -0.1)
        );
      }),
    [data, profile, query, riskOnly],
  );
  const billed = data.reduce((sum, client) => sum + client.billed, 0);
  const pipeline = data.reduce((sum, client) => sum + client.pipeline, 0);
  const atRisk = data.filter(
    (client) => client.previous && client.billed / client.previous - 1 < -0.1,
  );
  const topShare = billed
    ? (data
        .slice(0, Math.max(1, Math.ceil(data.length * 0.2)))
        .reduce((sum, client) => sum + client.billed, 0) /
        billed) *
      100
    : 0;

  return (
    <section className={styles.page} aria-label="Sell out por clientes">
      {usingDemo && (
        <div className={styles.preview}>
          PRÉVIA VISUAL · OS VALORES SERÃO SUBSTITUÍDOS PELOS DADOS PROCESSADOS
        </div>
      )}
      <div className={styles.summary}>
        <Summary
          icon={<UsersRound />}
          label="CLIENTES POSITIVADOS"
          value={String(data.length)}
          detail={`${Math.max(0, 1000 - data.length)} a positivar`}
        />
        <Summary
          icon={<TrendingUp />}
          label="FATURAMENTO"
          value={shortMoney(billed)}
          detail={`${shortMoney(pipeline)} em carteira`}
        />
        <Summary
          icon={<CircleAlert />}
          label="CLIENTES EM RISCO"
          value={String(atRisk.length)}
          detail="queda superior a 10%"
          critical
        />
        <Summary
          icon={<Target />}
          label="CONCENTRAÇÃO"
          value={`${topShare.toFixed(1).replace('.', ',')}%`}
          detail="nos 20% maiores clientes"
        />
      </div>

      <div className={styles.toolbar}>
        <label>
          <Search />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar cliente, código, cidade ou vendedor"
          />
        </label>
        <div className={styles.filters}>
          {profiles.map((item) => (
            <button
              key={item}
              className={profile === item ? styles.active : ''}
              onClick={() => setProfile(item)}
            >
              {item}
            </button>
          ))}
          <button
            className={riskOnly ? styles.riskActive : ''}
            onClick={() => setRiskOnly((value) => !value)}
          >
            EM RISCO
          </button>
        </div>
      </div>

      <article className={styles.panel}>
        <header>
          <div>
            <h1>Carteira positivada</h1>
            <span>{filtered.length} clientes na seleção</span>
          </div>
          <strong>
            {shortMoney(
              filtered.reduce((sum, client) => sum + client.billed, 0),
            )}
          </strong>
        </header>
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>CLIENTE</th>
                <th>CIDADE</th>
                <th>VENDEDOR</th>
                <th>FATURADO</th>
                <th>A FATURAR</th>
                <th>VARIAÇÃO</th>
                <th>ÚLTIMA COMPRA</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((client, index) => {
                const change = client.previous
                  ? (client.billed / client.previous - 1) * 100
                  : 0;
                const isOpen = expanded === client.id;
                return (
                  <ClientRows
                    key={client.id}
                    client={client}
                    index={index}
                    change={change}
                    open={isOpen}
                    onToggle={() => setExpanded(isOpen ? null : client.id)}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}

function Summary({
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
      className={`${styles.summaryCard} ${critical ? styles.critical : ''}`}
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

function ClientRows({
  client,
  index,
  change,
  open,
  onToggle,
}: {
  client: ClientResult;
  index: number;
  change: number;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr className={open ? styles.openRow : ''} onClick={onToggle}>
        <td className={styles.rank}>{String(index + 1).padStart(2, '0')}</td>
        <td>
          <strong>{client.name}</strong>
          <small>
            {client.id} · {client.profile || 'SEM PERFIL'} · FAIXA{' '}
            {client.range || '—'}
          </small>
        </td>
        <td>{client.city || '—'}</td>
        <td>{client.seller}</td>
        <td>
          <strong>{money.format(client.billed)}</strong>
        </td>
        <td>{client.pipeline ? money.format(client.pipeline) : '—'}</td>
        <td className={change >= 0 ? styles.up : styles.down}>
          {change >= 0 ? <ArrowUpRight /> : <ArrowDownRight />}
          {Math.abs(change).toFixed(1).replace('.', ',')}%
        </td>
        <td>
          {client.lastPurchase.includes('-')
            ? `${client.lastPurchase.slice(8, 10)}/${client.lastPurchase.slice(5, 7)}`
            : client.lastPurchase}
        </td>
        <td>{open ? <ChevronUp /> : <ChevronDown />}</td>
      </tr>
      {open && (
        <tr className={styles.detailRow}>
          <td colSpan={9}>
            <div className={styles.detail}>
              <header>
                <span>HISTÓRICO RECENTE · {client.name}</span>
                <strong>{client.movements.length} MOVIMENTAÇÕES</strong>
              </header>
              <div className={styles.movements}>
                {client.movements.slice(0, 8).map((movement, movementIndex) => (
                  <div key={`${movement.date}-${movementIndex}`}>
                    <span>{movement.date}</span>
                    <b
                      className={
                        movement.type === 'FATURADO'
                          ? styles.billed
                          : movement.type === 'DEVOLUÇÃO'
                            ? styles.returned
                            : styles.pending
                      }
                    >
                      {movement.type}
                    </b>
                    <span>{movement.product}</span>
                    <strong>{money.format(movement.value)}</strong>
                  </div>
                ))}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
