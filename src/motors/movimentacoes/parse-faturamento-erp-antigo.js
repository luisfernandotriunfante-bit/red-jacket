// Parser do relatório de largura fixa "NN Faturamento ... Vendas ...
// Analitico Detalhado" (padrão do ERP antigo) — alimenta o motor
// Movimentações a partir dos arquivos de amostra 379_25_DEMO.txt e
// 379_26_DEMO.txt (fonteChave sugerida: erp_antigo_<ano>).
//
// Offsets inferidos por alinhamento cabeçalho↔dados e validados contra
// 20.000 linhas de item da amostra real (0 inconsistências de formato de
// data/código). Dois pontos permanecem sem confirmação de significado —
// ver docs/contratos/formato-faturamento-erp-antigo.md:
//   - um campo de 4 colunas entre "Pedido" e "Fornecedor" (sempre "0" na
//     amostra), capturado como `campoNaoIdentificado1`;
//   - a coluna "Carga" existe e tem valores reais na amostra (confirmado
//     em linhas tardias do arquivo), mas seu significado de negócio não
//     foi explicado — capturada como texto bruto.
//
// Terminador de linha do arquivo original é `\r\n` (não precisa do truque
// de `\r` solto usado no parser de cadastro de itens).

const FIELD_OFFSETS = {
  data: [0, 10],
  notaSerieRaw: [10, 23],
  item: [24, 32],
  qtde: [37, 46],
  valor: [51, 60],
  desconto: [67, 73],
  operCfop: [74, 79],
  pedido: [80, 84],
  campoNaoIdentificado1: [90, 94],
  fornecedor: [95, 110],
  cliente: [111, 126],
  rpc: [128, 132],
  pesoLiq: [135, 142],
  pesoBru: [145, 152],
  mot: [155, 157],
  bordero: [159, 166],
  linha: [168, 172],
  cidade: [173, 205],
  coord: [205, 208],
  rede: [211, 214],
  ramo: [217, 220],
  qtdCx: [224, 230],
  campoNaoIdentificado2: [233, 235],
  eanComercial: [236, 249],
  eanTributavel: [251, 264],
  basePisCof: [270, 278],
  aliqPis: [281, 286],
  pis: [292, 298],
  aliqCof: [302, 307],
  cofins: [314, 320],
  icms: [325, 333],
  icmsSt: [341, 346],
  fcp: [355, 359],
  pctMot: [374, 378],
  vlrComMot: [386, 391],
  carga: [391, 416],
  vlrEscalonado: [416, 420],
};

const ITEM_LINE_RE = /^\d{2}\/\d{2}\/\d{4}/;
const ITEM_LINE_MIN_LENGTH = 420;

function parseDecimalBR(value) {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed.replace(/\./g, '').replace(',', '.'));
  return Number.isNaN(parsed) ? null : parsed;
}

function parseIntField(value) {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseNotaSerie(raw) {
  const normalizado = raw.trim().replace(/\s+/g, ' ');
  if (normalizado === '') return { serie: null, nota: null };
  const partes = normalizado.split(' ');
  if (partes.length === 2) return { serie: partes[0], nota: partes[1] };
  return { serie: null, nota: partes[0] };
}

function extractFields(line) {
  const record = {};
  for (const [name, [start, end]] of Object.entries(FIELD_OFFSETS)) {
    record[name] = line.slice(start, end).trim();
  }
  return record;
}

function buildItem(line) {
  const f = extractFields(line);
  const { serie, nota } = parseNotaSerie(line.slice(...FIELD_OFFSETS.notaSerieRaw));
  return {
    data: f.data,
    notaSerie: serie,
    notaFiscal: nota,
    item: f.item,
    quantidade: parseDecimalBR(f.qtde),
    valor: parseDecimalBR(f.valor),
    desconto: parseDecimalBR(f.desconto),
    operCfop: f.operCfop,
    pedido: f.pedido,
    campoNaoIdentificado1: f.campoNaoIdentificado1,
    fornecedor: f.fornecedor,
    cliente: f.cliente,
    rpc: f.rpc,
    pesoLiquidoKg: parseDecimalBR(f.pesoLiq),
    pesoBrutoKg: parseDecimalBR(f.pesoBru),
    mot: f.mot,
    bordero: f.bordero,
    linha: f.linha,
    cidade: f.cidade,
    coord: f.coord,
    rede: f.rede,
    ramo: f.ramo,
    quantidadePorCaixa: parseDecimalBR(f.qtdCx),
    campoNaoIdentificado2: f.campoNaoIdentificado2,
    eanComercial: f.eanComercial,
    eanTributavel: f.eanTributavel,
    basePisCofins: parseDecimalBR(f.basePisCof),
    aliquotaPis: parseDecimalBR(f.aliqPis),
    pis: parseDecimalBR(f.pis),
    aliquotaCofins: parseDecimalBR(f.aliqCof),
    cofins: parseDecimalBR(f.cofins),
    icms: parseDecimalBR(f.icms),
    icmsSt: parseDecimalBR(f.icmsSt),
    fcp: parseDecimalBR(f.fcp),
    percentualMot: parseDecimalBR(f.pctMot),
    valorComissaoMot: parseDecimalBR(f.vlrComMot),
    carga: f.carga, // significado não confirmado; capturado como texto bruto
    valorEscalonado: parseDecimalBR(f.vlrEscalonado),
  };
}

/**
 * @param {string} content Conteúdo bruto do relatório de faturamento.
 * @returns {{
 *   items: object[],
 *   discrepancies: {type: string, linha: string}[],
 *   totalLinhasNaoVazias: number,
 *   totalLinhasReconhecidas: number,
 * }}
 */
export function parseFaturamentoErpAntigo(content) {
  const linhas = content.split(/\r\n|\r|\n/);
  const items = [];
  const discrepancies = [];
  let totalLinhasNaoVazias = 0;
  let totalLinhasReconhecidas = 0;

  for (const line of linhas) {
    if (line.trim() === '') continue;
    totalLinhasNaoVazias += 1;

    if (ITEM_LINE_RE.test(line)) {
      if (line.length < ITEM_LINE_MIN_LENGTH) {
        discrepancies.push({ type: 'linha-item-curta', linha: line });
        continue;
      }
      totalLinhasReconhecidas += 1;
      items.push(buildItem(line));
      continue;
    }

    // Cabeçalho de página, separador ("-----..."), linha "Filial:",
    // "Usuario:" etc. são ignoradas de propósito — não são discrepância.
  }

  return { items, discrepancies, totalLinhasNaoVazias, totalLinhasReconhecidas };
}
