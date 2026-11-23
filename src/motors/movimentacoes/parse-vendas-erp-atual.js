// Parser da planilha de vendas do ERP atual (padrão do arquivo de amostra
// 992ca97f-vendas-8022_DEMO.xls) — alimenta o motor Movimentações
// (fonteChave sugerida: erp_atual_vendas).
//
// PENDÊNCIA DE DEPENDÊNCIA (ver docs/contratos/formato-vendas-erp-atual.md):
// a decodificação binária do .xls/.xlsx real precisa de uma lib como
// 'xlsx' (SheetJS), mas a única versão publicada no registry público do
// npm (0.18.5) tem 2 vulnerabilidades HIGH sem correção disponível
// (GHSA-4r6h-8v6p-xvw6 prototype pollution, GHSA-5pgg-2g8v-p4x9 ReDoS) —
// `npm audit --audit-level=high` reprova. Por isso esta versão só traz a
// camada de NORMALIZAÇÃO (lógica pura, testável sem arquivo binário); a
// função que decodifica o arquivo real ainda não existe aqui — depende de
// decisão do usuário/gerente sobre qual biblioteca usar.
//
// As 36 colunas são mapeadas por POSIÇÃO (ordem do cabeçalho da amostra),
// não pelo nome do cabeçalho — os nomes de cabeçalho da amostra DEMO são
// confiáveis o suficiente para nomear os campos, mas a leitura em si não
// depende de casar string de cabeçalho, para tolerar pequenas variações
// de grafia entre exportações.

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
 *   da planilha, ignorado — o mapeamento é por posição). Em produção,
 *   esse array viria de uma lib de leitura de planilha ainda não
 *   decidida — ver pendência de dependência no topo do arquivo.
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
