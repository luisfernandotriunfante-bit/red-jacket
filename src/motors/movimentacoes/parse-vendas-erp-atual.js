// Parser da planilha de vendas do ERP atual (padrão do arquivo de amostra
// 992ca97f-vendas-8022_DEMO.xls) — alimenta o motor Movimentações
// (fonteChave sugerida: erp_atual_vendas).
//
// Separado em duas camadas para ficar testável sem arquivo binário:
//   - lerPlanilhaVendas(arrayBuffer): decodifica o .xls/.xlsx real via
//     'xlsx' (SheetJS) e delega a normalizarLinhasVendas.
//   - normalizarLinhasVendas(linhasBrutas): lógica pura, testada com
//     dados literais extraídos da amostra real — ver
//     tests/motors/movimentacoes/parse-vendas-erp-atual.test.js.
//
// As 36 colunas são mapeadas por POSIÇÃO (ordem do cabeçalho da amostra),
// não pelo nome do cabeçalho — os nomes de cabeçalho da amostra DEMO são
// confiáveis o suficiente para nomear os campos, mas a leitura em si não
// depende de casar string de cabeçalho, para tolerar pequenas variações
// de grafia entre exportações.

import * as XLSX from 'xlsx';

const COLUNAS = [
  'filial',
  'fornecedor',
  'dataMovimentoSerial',
  'codCliente',
  'nomeCliente',
  'cnpjCpfCliente',
  'segmentoAtuacaoCnae',
  'cidade',
  'cep',
  'uf',
  'numeroPedWinthor',
  'numeroPedRca',
  'dataEmissaoNfSerial',
  'numeroNotaFiscal',
  'origemPedido',
  'statusPedido',
  'statusBloqueio',
  'codVendedor',
  'vendedor',
  'codSupervisor',
  'supervisor',
  'codigoFabricante',
  'eanProduto',
  'eanCadastro',
  'codprodWinthor',
  'descricaoProduto',
  'caixasVendidas',
  'unidadesVendidas',
  'pesoBrutoKg',
  'pesoLiquidoKg',
  'pesoT',
  'situacaoPeso',
  'valorMercadoria',
  'valorNota',
  'tipoVenda',
  'tipo',
];

// Conversão de data serial do Excel/Lotus (epoch 1899-12-30) para ISO
// (yyyy-mm-dd), fórmula padrão usada por SheetJS e bibliotecas JS: 25569 é
// o deslocamento de dias entre o epoch do Excel e o epoch Unix.
function serialExcelParaIso(serial) {
  if (serial === null || serial === undefined || serial === '') return null;
  const numero = Number(serial);
  if (Number.isNaN(numero)) return null;
  const ms = Math.round((numero - 25569) * 86400 * 1000);
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * @param {Array[]} linhasBrutas Array de arrays (primeira linha = cabeçalho
 *   da planilha, ignorado — o mapeamento é por posição).
 * @returns {object[]} linhas normalizadas, com `dataMovimento`/
 *   `dataEmissaoNf` já convertidas para ISO.
 */
export function normalizarLinhasVendas(linhasBrutas) {
  const [, ...linhasDados] = linhasBrutas;
  return linhasDados
    .filter((linha) => Array.isArray(linha) && linha.length > 0)
    .map((linha) => {
      const registro = {};
      COLUNAS.forEach((nome, indice) => {
        registro[nome] = linha[indice] ?? null;
      });
      return {
        ...registro,
        dataMovimento: serialExcelParaIso(registro.dataMovimentoSerial),
        dataEmissaoNf: serialExcelParaIso(registro.dataEmissaoNfSerial),
      };
    });
}

/**
 * @param {ArrayBuffer} arrayBuffer Conteúdo do arquivo .xls/.xlsx do
 *   usuário (ex. `await file.arrayBuffer()` no navegador).
 * @returns {Promise<object[]>}
 */
export async function lerPlanilhaVendas(arrayBuffer) {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const planilha = workbook.Sheets[workbook.SheetNames[0]];
  const linhasBrutas = XLSX.utils.sheet_to_json(planilha, { header: 1, raw: true });
  return normalizarLinhasVendas(linhasBrutas);
}
