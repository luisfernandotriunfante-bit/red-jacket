// Exportação real dos dados ativos de um motor: Excel (.xlsx) e JSON.
//
// Sanitização de fórmulas (CSV/Excel injection): só se aplica ao Excel.
// Um texto que comece com =, +, -, @, tab ou CR pode ser interpretado
// pelo Excel como fórmula quando a planilha é aberta — prefixamos com um
// apóstrofo para o Excel tratar como texto literal. O JSON NUNCA é
// sanitizado: mantém os valores exatamente como vieram (tipados), porque
// não é aberto por uma ferramenta que interpreta fórmulas.

import * as XLSX from 'xlsx';

const CARACTERES_PERIGOSOS = ['=', '+', '-', '@', '\t', '\r'];

/**
 * @param {unknown} valor
 * @returns {unknown} valor inalterado se não for string de risco; string
 *   prefixada com apóstrofo se começar com caractere de fórmula.
 */
export function sanitizarCelulaExcel(valor) {
  if (typeof valor !== 'string' || valor.length === 0) return valor;
  if (CARACTERES_PERIGOSOS.includes(valor[0])) {
    return `'${valor}`;
  }
  return valor;
}

function sanitizarLinhaExcel(linha) {
  const saida = {};
  for (const [chave, valor] of Object.entries(linha)) {
    saida[chave] = sanitizarCelulaExcel(valor);
  }
  return saida;
}

/**
 * Gera um Blob .xlsx a partir das linhas, com sanitização de fórmulas
 * aplicada só às células de texto — números, booleanos e null passam
 * direto, sem risco de serem "corrompidos" pela sanitização.
 * @param {object[]} linhas
 * @param {string} [nomeAba]
 * @returns {Blob}
 */
export function gerarExcel(linhas, nomeAba = 'Dados') {
  const linhasSanitizadas = linhas.map(sanitizarLinhaExcel);
  const planilha = XLSX.utils.json_to_sheet(linhasSanitizadas);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, planilha, nomeAba);
  const arrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([arrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * Gera um Blob JSON a partir das linhas, sem sanitização — os campos
 * tipados (number, boolean, null) ficam exatamente como no dado ativo.
 * @param {object[]} linhas
 * @returns {Blob}
 */
export function gerarJson(linhas) {
  const texto = JSON.stringify(linhas, null, 2);
  return new Blob([texto], { type: 'application/json' });
}
