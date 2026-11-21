// Parser do relatório de largura fixa "RELACAO COMPLEMENTAR - CADASTRO DE ITENS"
// (padrão do ERP antigo). Offsets de coluna inferidos por alinhamento entre o
// cabeçalho do relatório e várias linhas de dados reais (amostra DEMO), e
// confirmados contra todas as linhas de item da amostra disponível — ainda não
// validados contra um arquivo fora do conjunto DEMO (ver docs/contratos/).
//
// O relatório original usa `\r` solto como terminador de linha (impressora
// matricial, sem `\n`); este parser aceita `\r\n`, `\r` ou `\n` para também
// funcionar com arquivos normalizados.

const FIELD_OFFSETS = {
  codigo: [0, 8],
  descricao: [9, 49],
  um: [50, 53],
  pctCom: [55, 59],
  acx: [60, 63],
  dm: [64, 67],
  pctDMax: [70, 74],
  qtCx: [75, 79],
  conv: [80, 84],
  pesoLiq: [88, 93],
  pesoBru: [97, 102],
  pontos: [105, 109],
  classe: [110, 115],
  codigoFornecedor: [115, 136],
  codigoBarra: [136, 151],
  troca: [151, 158],
  saz: [158, 163],
  dias: [163, 167],
  palm: [167, 172],
  agp: [172, 179],
  multiplo: [179, 185],
};

const ITEM_LINE_RE = /^\d{8} /;
const CATEGORY_LINE_RE = /^\s+(\d{4})\s+(\S.*)$/;
const ITEM_LINE_MIN_LENGTH = 185;

function parseDecimalBR(value) {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed.replace(',', '.'));
  return Number.isNaN(parsed) ? null : parsed;
}

function parseIntField(value) {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function extractFields(line) {
  const record = {};
  for (const [name, [start, end]] of Object.entries(FIELD_OFFSETS)) {
    record[name] = line.slice(start, end).trim();
  }
  return record;
}

function buildItem(line, categoria) {
  const f = extractFields(line);
  return {
    codigo: f.codigo,
    descricao: f.descricao,
    unidadeMedida: f.um,
    percentualComissao: parseDecimalBR(f.pctCom),
    aceitaCaixaFracionada: f.acx === 'Sim',
    disponivelMostruario: f.dm === 'Sim',
    percentualDescontoMaximo: parseDecimalBR(f.pctDMax),
    quantidadePorCaixa: parseIntField(f.qtCx),
    fatorConversao: parseIntField(f.conv),
    pesoLiquidoKg: parseDecimalBR(f.pesoLiq),
    pesoBrutoKg: parseDecimalBR(f.pesoBru),
    pontos: parseDecimalBR(f.pontos),
    classe: f.classe,
    codigoFornecedor: f.codigoFornecedor,
    codigoBarra: f.codigoBarra,
    aceitaTroca: f.troca === 'Sim',
    sazonal: f.saz,
    diasValidadePaletizacao: parseIntField(f.dias),
    paletizavel: f.palm === 'SIM',
    agrupamento: f.agp,
    multiplo: parseIntField(f.multiplo),
    categoriaCodigo: categoria ? categoria.codigo : null,
    categoriaNome: categoria ? categoria.nome : null,
  };
}

/**
 * @param {string} content Conteúdo bruto do arquivo de cadastro do ERP antigo.
 * @returns {{
 *   items: object[],
 *   discrepancies: {type: string, linha: string}[],
 *   totalLinhasNaoVazias: number,
 *   totalLinhasReconhecidas: number,
 * }}
 */
export function parseCadastroErpAntigo(content) {
  const lines = content.split(/\r\n|\r|\n/);
  const items = [];
  const discrepancies = [];
  let categoriaAtual = null;
  let totalLinhasNaoVazias = 0;
  let totalLinhasReconhecidas = 0;

  for (const line of lines) {
    if (line.trim() === '') continue;
    totalLinhasNaoVazias += 1;

    if (ITEM_LINE_RE.test(line)) {
      if (line.length < ITEM_LINE_MIN_LENGTH) {
        discrepancies.push({ type: 'linha-item-curta', linha: line });
        continue;
      }
      totalLinhasReconhecidas += 1;
      items.push(buildItem(line, categoriaAtual));
      continue;
    }

    const categoriaMatch = line.match(CATEGORY_LINE_RE);
    if (categoriaMatch) {
      totalLinhasReconhecidas += 1;
      const [, codigo, nome] = categoriaMatch;
      const nomeLimpo = nome.trim();
      if (!categoriaAtual || categoriaAtual.codigo !== codigo || categoriaAtual.nome !== nomeLimpo) {
        categoriaAtual = { codigo, nome: nomeLimpo };
      }
      continue;
    }

    // Linhas de cabeçalho de página, separadores e rodapé são ignoradas de
    // propósito: não contam como discrepância, só não entram na contagem de
    // linhas reconhecidas.
  }

  return { items, discrepancies, totalLinhasNaoVazias, totalLinhasReconhecidas };
}
