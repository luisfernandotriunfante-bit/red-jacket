// Exportação real dos dados ativos de um motor: JSON e Excel (.xlsx).
//
// Sanitização de fórmulas (CSV/Excel injection): um texto que comece com
// =, +, -, @, tab ou CR pode ser interpretado como fórmula quando a
// planilha é aberta no Excel — `sanitizarCelulaExcel` prefixa com um
// apóstrofo para o Excel tratar como texto literal. Só se aplica ao
// Excel. O JSON NUNCA é sanitizado: mantém os valores exatamente como
// vieram (tipados), porque não é aberto por uma ferramenta que
// interpreta fórmulas.
//
// Geração do .xlsx via 'exceljs' — a lib antes considerada ('xlsx'/
// SheetJS) foi descartada por ter 2 CVEs HIGH sem correção no registry
// público do npm (GHSA-4r6h-8v6p-xvw6, GHSA-5pgg-2g8v-p4x9). exceljs não
// tem CVE HIGH; tem 1 advisory MODERATE indireto (uuid < 11.1.1,
// GHSA-w5hq-g745-h8pq) via sua própria dependência — abaixo do limiar de
// `npm audit --audit-level=high` usado na CI, documentado aqui por
// transparência, não suprimido.

import ExcelJS from 'exceljs';

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

/**
 * Sanitiza todas as células de texto de uma linha antes de gravar o .xlsx.
 * @param {object} linha
 * @returns {object}
 */
export function sanitizarLinhaExcel(linha) {
  const saida = {};
  for (const [chave, valor] of Object.entries(linha)) {
    saida[chave] = sanitizarCelulaExcel(valor);
  }
  return saida;
}

/**
 * Gera um Blob .xlsx real a partir das linhas, com o sanitizer de
 * fórmulas aplicado a cada célula de texto. Colunas vêm das chaves do
 * primeiro objeto (todas as linhas devem ter o mesmo formato).
 * @param {object[]} linhas
 * @param {string} nomeAba
 * @returns {Promise<Blob>}
 */
export async function gerarExcel(linhas, nomeAba = 'Dados') {
  const linhasSanitizadas = linhas.map(sanitizarLinhaExcel);
  const workbook = new ExcelJS.Workbook();
  const planilha = workbook.addWorksheet(nomeAba);
  if (linhasSanitizadas.length > 0) {
    planilha.columns = Object.keys(linhasSanitizadas[0]).map((chave) => ({
      header: chave,
      key: chave,
    }));
    planilha.addRows(linhasSanitizadas);
  }
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
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
