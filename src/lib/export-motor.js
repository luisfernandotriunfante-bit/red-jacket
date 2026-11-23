// Exportação real dos dados ativos de um motor: JSON pronto; Excel (.xlsx)
// pendente de decisão de dependência (ver abaixo).
//
// Sanitização de fórmulas (CSV/Excel injection): um texto que comece com
// =, +, -, @, tab ou CR pode ser interpretado como fórmula quando a
// planilha é aberta no Excel — `sanitizarCelulaExcel` prefixa com um
// apóstrofo para o Excel tratar como texto literal. Só se aplica ao
// Excel. O JSON NUNCA é sanitizado: mantém os valores exatamente como
// vieram (tipados), porque não é aberto por uma ferramenta que
// interpreta fórmulas.
//
// PENDÊNCIA DE DEPENDÊNCIA: gerar o arquivo .xlsx real precisa de uma lib
// como 'xlsx' (SheetJS), mas a única versão publicada no registry público
// do npm (0.18.5) tem 2 vulnerabilidades HIGH sem correção disponível
// (GHSA-4r6h-8v6p-xvw6 prototype pollution, GHSA-5pgg-2g8v-p4x9 ReDoS) —
// `npm audit --audit-level=high` reprova. `sanitizarCelulaExcel` já está
// pronto e testado (puro, sem dependência); falta só a função que
// efetivamente grava o binário .xlsx, aguardando decisão do
// usuário/gerente sobre qual biblioteca usar — ver
// docs/contratos/supabase-persistencia-motores.md.

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
 * Sanitiza todas as células de texto de uma linha (usar antes de gravar o
 * .xlsx, quando a lib de escrita for decidida).
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
 * Gera um Blob JSON a partir das linhas, sem sanitização — os campos
 * tipados (number, boolean, null) ficam exatamente como no dado ativo.
 * @param {object[]} linhas
 * @returns {Blob}
 */
export function gerarJson(linhas) {
  const texto = JSON.stringify(linhas, null, 2);
  return new Blob([texto], { type: 'application/json' });
}
