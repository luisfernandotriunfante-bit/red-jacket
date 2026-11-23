// Normalização canônica dos payloads já persistidos no motor
// Movimentações, para o piloto do Histórico. Não faz parsing de arquivo:
// recebe o objeto JSON que já foi gravado em dados_motor (saída de
// parse-faturamento-erp-antigo.js ou parse-vendas-erp-atual.js) e devolve
// um registro com os mesmos nomes de campo, independente da fonte.
//
// Regra de escopo (decisão do usuário/gerente): os arquivos do ERP são
// FONTES de Movimentações, não motores separados. O Histórico não tem
// slot/fonte de upload próprio: ele consulta os dados normalizados que já
// estão ativos em Movimentações. Por isso nada aqui grava no banco.

const DATA_BR = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const DATA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

function texto(valor) {
  if (valor === null || valor === undefined) return null;
  const normalizado = String(valor).trim();
  return normalizado === '' ? null : normalizado;
}

function numero(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  const normalizado = String(valor).trim().replace(/\./g, '').replace(',', '.');
  if (normalizado === '') return null;
  const convertido = Number(normalizado);
  return Number.isFinite(convertido) ? convertido : null;
}

/**
 * Converte data do relatório do ERP antigo (dd/mm/aaaa) para ISO.
 * Datas já em ISO (planilha do ERP atual) são devolvidas como estão.
 * @param {unknown} valor
 * @returns {string|null}
 */
export function dataParaIso(valor) {
  const normalizada = texto(valor);
  if (!normalizada) return null;
  if (DATA_ISO.test(normalizada)) return normalizada;
  const partes = DATA_BR.exec(normalizada);
  if (!partes) return null;
  return partes[3] + '-' + partes[2] + '-' + partes[1];
}

/**
 * Identifica de qual parser veio o payload persistido.
 * @param {object} payload
 * @returns {'erp_antigo'|'erp_atual'|null}
 */
export function identificarOrigem(payload) {
  if (!payload || typeof payload !== 'object') return null;
  if ('numeroNotaFiscal' in payload || 'descricaoProduto' in payload) return 'erp_atual';
  if ('notaFiscal' in payload && 'item' in payload) return 'erp_antigo';
  return null;
}

function chaveRegistro(registro) {
  return [
    registro.fonte,
    registro.documento,
    registro.serie,
    registro.item,
    registro.codigoProduto,
    registro.data,
    registro.valor,
  ]
    .map((parte) => (parte === null || parte === undefined ? '' : String(parte)))
    .join('|');
}

/**
 * Converte um payload de Movimentações em registro canônico do Histórico.
 * Devolve null para payload de formato desconhecido (o chamador contabiliza
 * como ignorado, em vez de inventar campos).
 *
 * @param {object} payload
 * @param {{fonteChave?: string}} [opcoes]
 */
export function normalizarRegistro(payload, { fonteChave } = {}) {
  const origem = identificarOrigem(payload);
  if (!origem) return null;

  const fonte = texto(fonteChave) ?? null;
  let registro;

  if (origem === 'erp_antigo') {
    registro = {
      fonte,
      origem,
      tipo: 'faturamento',
      data: dataParaIso(payload.data),
      documento: texto(payload.notaFiscal),
      serie: texto(payload.notaSerie),
      item: texto(payload.item),
      codigoProduto: texto(payload.eanComercial) ?? texto(payload.item),
      codigoInterno: texto(payload.item),
      produto: null,
      cliente: texto(payload.cliente),
      clienteNome: null,
      quantidade: numero(payload.quantidade),
      valor: numero(payload.valor),
      pesoLiquidoKg: numero(payload.pesoLiquidoKg),
      pesoBrutoKg: numero(payload.pesoBrutoKg),
      vendedor: null,
      supervisor: null,
      cidade: texto(payload.cidade),
      uf: null,
      cfop: texto(payload.operCfop),
    };
  } else {
    registro = {
      fonte,
      origem,
      tipo: 'venda',
      data: dataParaIso(payload.dataMovimento) ?? dataParaIso(payload.dataEmissaoNf),
      documento: texto(payload.numeroNotaFiscal),
      serie: null,
      item: null,
      codigoProduto: texto(payload.eanProduto) ?? texto(payload.codprodWinthor),
      codigoInterno: texto(payload.codprodWinthor),
      produto: texto(payload.descricaoProduto),
      cliente: texto(payload.codCliente),
      clienteNome: texto(payload.nomeCliente),
      quantidade: numero(payload.unidadesVendidas),
      valor: numero(payload.valorNota) ?? numero(payload.valorMercadoria),
      pesoLiquidoKg: numero(payload.pesoLiquidoKg),
      pesoBrutoKg: numero(payload.pesoBrutoKg),
      vendedor: texto(payload.vendedor),
      supervisor: texto(payload.supervisor),
      cidade: texto(payload.cidade),
      uf: texto(payload.uf),
      cfop: null,
    };
  }

  registro.chaveRegistro = chaveRegistro(registro);
  return registro;
}

/**
 * Conta registros que aparecem com a mesma chave de negócio em mais de uma
 * fonte (ex. o mesmo período exportado do ERP antigo e do atual). NÃO
 * remove nada: o piloto mostra os dois e sinaliza a sobreposição, porque
 * decidir qual fonte é a verdadeira exige regra de negócio que ainda não
 * foi definida.
 *
 * @param {object[]} registros
 * @returns {{registrosEmMaisDeUmaFonte: number, chaves: string[]}}
 */
export function contarRepeticoesEntreFontes(registros) {
  const fontesPorChave = new Map();
  for (const registro of registros) {
    const chave = [
      registro.documento,
      registro.serie,
      registro.item,
      registro.codigoProduto,
      registro.data,
      registro.valor,
    ]
      .map((parte) => (parte === null || parte === undefined ? '' : String(parte)))
      .join('|');
    if (!fontesPorChave.has(chave)) fontesPorChave.set(chave, new Set());
    if (registro.fonte) fontesPorChave.get(chave).add(registro.fonte);
  }

  const chaves = [];
  let registrosEmMaisDeUmaFonte = 0;
  for (const [chave, fontes] of fontesPorChave) {
    if (fontes.size > 1) {
      chaves.push(chave);
      registrosEmMaisDeUmaFonte += registros.filter(
        (registro) => registro.fonte && fontes.has(registro.fonte),
      ).length;
    }
  }
  return { registrosEmMaisDeUmaFonte, chaves };
}
