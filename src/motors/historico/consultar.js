// API de leitura do Histórico (piloto). O Histórico não recebe upload
// próprio: ele consome os registros já ativos no motor Movimentações,
// agregando todas as fontes (379_25/26 do ERP antigo e a planilha 8022 do
// ERP atual). Sem slot novo, sem duplicar fonte no upload.
//
// Toda a leitura passa por RLS no banco: qualquer usuário autenticado lê.
// Nenhuma escrita acontece neste módulo.

import { obterDadosAtivosPorFonte } from '../../lib/motor-sync.js';
import {
  normalizarRegistro,
  contarRepeticoesEntreFontes,
} from '../movimentacoes/registro-canonico.js';

export const MOTOR_ORIGEM_HISTORICO = 'movimentacoes';
export const LIMITE_PADRAO = 100;
export const LIMITE_MAXIMO = 1000;

function minusculo(valor) {
  const normalizado = valor === null || valor === undefined ? '' : String(valor);
  return normalizado.toLocaleLowerCase('pt-BR').trim();
}

function contem(valor, busca) {
  if (!busca) return true;
  return minusculo(valor).includes(busca);
}

function compararRegistros(a, b) {
  if (a.data !== b.data) {
    if (!a.data) return 1;
    if (!b.data) return -1;
    return a.data < b.data ? 1 : -1;
  }
  const documentoA = a.documento ?? '';
  const documentoB = b.documento ?? '';
  if (documentoA !== documentoB) return documentoA < documentoB ? -1 : 1;
  const itemA = a.item ?? '';
  const itemB = b.item ?? '';
  if (itemA !== itemB) return itemA < itemB ? -1 : 1;
  return 0;
}

/**
 * Filtra registros canônicos. Todos os filtros são opcionais.
 * @param {object[]} registros
 * @param {{de?: string, ate?: string, cliente?: string, documento?: string,
 *   vendedor?: string, produto?: string, fonte?: string, tipo?: string}} [filtros]
 */
export function filtrarRegistros(registros, filtros = {}) {
  const cliente = minusculo(filtros.cliente);
  const documento = minusculo(filtros.documento);
  const vendedor = minusculo(filtros.vendedor);
  const produto = minusculo(filtros.produto);
  const fonte = minusculo(filtros.fonte);
  const tipo = minusculo(filtros.tipo);

  return registros.filter((registro) => {
    if (filtros.de && (!registro.data || registro.data < filtros.de)) return false;
    if (filtros.ate && (!registro.data || registro.data > filtros.ate)) return false;
    if (cliente && !contem(registro.cliente, cliente) && !contem(registro.clienteNome, cliente)) {
      return false;
    }
    if (documento && !contem(registro.documento, documento)) return false;
    if (vendedor && !contem(registro.vendedor, vendedor)) return false;
    if (produto && !contem(registro.produto, produto) && !contem(registro.codigoProduto, produto)) {
      return false;
    }
    if (fonte && minusculo(registro.fonte) !== fonte) return false;
    if (tipo && minusculo(registro.tipo) !== tipo) return false;
    return true;
  });
}

/**
 * Resumo dos registros já filtrados (antes da paginação, para os totais da
 * tela não dependerem da página visível).
 * @param {object[]} registros
 */
export function resumirRegistros(registros) {
  const porFonte = {};
  const porTipo = {};
  let totalValor = 0;
  let totalQuantidade = 0;
  let periodoDe = null;
  let periodoAte = null;

  for (const registro of registros) {
    const fonte = registro.fonte ?? 'sem-fonte';
    porFonte[fonte] = (porFonte[fonte] ?? 0) + 1;
    const tipo = registro.tipo ?? 'desconhecido';
    porTipo[tipo] = (porTipo[tipo] ?? 0) + 1;
    if (typeof registro.valor === 'number') totalValor += registro.valor;
    if (typeof registro.quantidade === 'number') totalQuantidade += registro.quantidade;
    if (registro.data) {
      if (!periodoDe || registro.data < periodoDe) periodoDe = registro.data;
      if (!periodoAte || registro.data > periodoAte) periodoAte = registro.data;
    }
  }

  return {
    totalRegistros: registros.length,
    totalValor: Math.round(totalValor * 100) / 100,
    totalQuantidade: Math.round(totalQuantidade * 1000) / 1000,
    periodo: { de: periodoDe, ate: periodoAte },
    porFonte,
    porTipo,
  };
}

/**
 * Leitura do Histórico para a tela: busca os dados ativos de
 * Movimentações, normaliza, filtra, resume e pagina. Funciona igual depois
 * de recarregar a página, porque não depende de estado local.
 *
 * @param {object} args
 * @param {object} args.client Cliente Supabase autenticado.
 * @param {object} [args.filtros]
 * @param {{limite?: number, deslocamento?: number}} [args.pagina]
 */
export async function obterHistorico({ client, filtros = {}, pagina = {} } = {}) {
  const brutos = await obterDadosAtivosPorFonte({ client, motor: MOTOR_ORIGEM_HISTORICO });

  const registros = [];
  let registrosIgnorados = 0;
  const fontes = new Set();

  for (const item of brutos) {
    const registro = normalizarRegistro(item.payload, { fonteChave: item.fonteChave });
    if (!registro) {
      registrosIgnorados += 1;
      continue;
    }
    if (registro.fonte) fontes.add(registro.fonte);
    registros.push(registro);
  }

  registros.sort(compararRegistros);
  const filtrados = filtrarRegistros(registros, filtros);

  const limiteBruto = Number(pagina.limite);
  const limite = Number.isFinite(limiteBruto) && limiteBruto > 0
    ? Math.min(Math.floor(limiteBruto), LIMITE_MAXIMO)
    : LIMITE_PADRAO;
  const deslocamentoBruto = Number(pagina.deslocamento);
  const deslocamento = Number.isFinite(deslocamentoBruto) && deslocamentoBruto > 0
    ? Math.floor(deslocamentoBruto)
    : 0;

  const registrosDaPagina = filtrados.slice(deslocamento, deslocamento + limite);
  const repeticoes = contarRepeticoesEntreFontes(filtrados);

  return {
    registros: registrosDaPagina,
    total: filtrados.length,
    pagina: {
      limite,
      deslocamento,
      temMais: deslocamento + registrosDaPagina.length < filtrados.length,
    },
    resumo: resumirRegistros(filtrados),
    avisos: {
      registrosIgnorados,
      fontes: Array.from(fontes).sort(),
      registrosEmMaisDeUmaFonte: repeticoes.registrosEmMaisDeUmaFonte,
      chavesEmMaisDeUmaFonte: repeticoes.chaves,
    },
  };
}

/**
 * Formato plano para exportação (Excel/JSON) do Histórico: só as colunas
 * que fazem sentido para quem abre o arquivo, na ordem fixa.
 * @param {object[]} registros
 */
export function linhasParaExportacao(registros) {
  return registros.map((registro) => ({
    data: registro.data,
    documento: registro.documento,
    serie: registro.serie,
    cliente: registro.cliente,
    cliente_nome: registro.clienteNome,
    produto: registro.produto,
    codigo_produto: registro.codigoProduto,
    item: registro.item,
    quantidade: registro.quantidade,
    valor: registro.valor,
    peso_liquido_kg: registro.pesoLiquidoKg,
    peso_bruto_kg: registro.pesoBrutoKg,
    vendedor: registro.vendedor,
    supervisor: registro.supervisor,
    cidade: registro.cidade,
    uf: registro.uf,
    cfop: registro.cfop,
    tipo: registro.tipo,
    fonte: registro.fonte,
  }));
}
