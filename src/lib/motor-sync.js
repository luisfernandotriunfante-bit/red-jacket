// Camada de dados para os botões "Atualizar" (por motor) e "Atualizar
// todos". Não importa '@supabase/supabase-js' diretamente — recebe um
// client já construído (por src/lib/supabase-client.js em produção, ou um
// mock nos testes), para ficar testável sem rede e sem credencial real.
//
// Fluxo: ver docs/contratos/supabase-persistencia-motores.md.

export const MOTORES = ['historico', 'movimentacoes', 'clientes', 'produtos', 'chegada_nfs'];

async function obterOuCriarSlot(client, motor) {
  const { data: existente, error: erroSelect } = await client
    .from('upload_slots')
    .select('id, motor')
    .eq('motor', motor)
    .maybeSingle();
  if (erroSelect) throw erroSelect;
  if (existente) return existente;

  const { data: criado, error: erroInsert } = await client
    .from('upload_slots')
    .insert({ motor })
    .select('id, motor')
    .single();
  if (erroInsert) throw erroInsert;
  return criado;
}

async function obterVersaoAtiva(client, slotId) {
  const { data, error } = await client
    .from('upload_versoes')
    .select('id, hash_arquivo')
    .eq('slot_id', slotId)
    .eq('status', 'active')
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function criarVersaoStaging(client, slotId, hashArquivo, nomeArquivo, userId) {
  const { data, error } = await client
    .from('upload_versoes')
    .insert({
      slot_id: slotId,
      status: 'staging',
      hash_arquivo: hashArquivo,
      nome_arquivo_original: nomeArquivo,
      criado_por: userId,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data;
}

async function inserirLinhas(client, versaoId, linhas) {
  if (!linhas.length) return;
  const registros = linhas.map((payload) => ({ versao_id: versaoId, payload }));
  const { error } = await client.from('dados_motor').insert(registros);
  if (error) throw error;
}

async function promoverVersao(client, versaoId) {
  const { error } = await client.rpc('promover_versao', { p_versao_id: versaoId });
  if (error) throw error;
}

async function rejeitarVersao(client, versaoId) {
  const { error } = await client.rpc('rejeitar_versao', { p_versao_id: versaoId });
  if (error) throw error;
}

/**
 * Processa a atualização de um motor: cria/reaproveita o slot, checa
 * idempotência pelo hash, grava em staging, valida e promove ou rejeita.
 *
 * @param {object} args
 * @param {object} args.client Cliente Supabase (ou mock compatível).
 * @param {string} args.motor Um de MOTORES.
 * @param {string} args.hashArquivo Hash de conteúdo do arquivo (ex. sha256).
 * @param {string} args.nomeArquivo Nome original do arquivo.
 * @param {object[]} args.linhas Linhas já normalizadas (parsing client-side).
 * @param {string} args.userId auth.uid() do usuário autenticado.
 * @param {(linhas: object[]) => boolean | Promise<boolean>} [args.validar]
 * @returns {Promise<{motor: string, resultado: 'promovido'|'sem-mudanca'|'rejeitado'}>}
 */
export async function atualizarMotor({ client, motor, hashArquivo, nomeArquivo, linhas, userId, validar }) {
  if (!MOTORES.includes(motor)) {
    throw new Error(`motor desconhecido: ${motor}`);
  }

  const slot = await obterOuCriarSlot(client, motor);
  const ativa = await obterVersaoAtiva(client, slot.id);

  if (ativa && ativa.hash_arquivo === hashArquivo) {
    return { motor, resultado: 'sem-mudanca' };
  }

  const versao = await criarVersaoStaging(client, slot.id, hashArquivo, nomeArquivo, userId);
  await inserirLinhas(client, versao.id, linhas);

  const valido = validar ? await validar(linhas) : true;
  if (!valido) {
    await rejeitarVersao(client, versao.id);
    return { motor, resultado: 'rejeitado' };
  }

  await promoverVersao(client, versao.id);
  return { motor, resultado: 'promovido' };
}

/**
 * Botão "Atualizar todos": roda atualizarMotor para cada motor com arquivo
 * selecionado, de forma independente. Erro em um motor nunca aborta os
 * demais, e a versão ativa do motor que falhou não é tocada.
 *
 * @param {object} args
 * @param {object} args.client
 * @param {Record<string, {hashArquivo: string, nomeArquivo: string, linhas: object[], validar?: Function}>} args.arquivosPorMotor
 * @param {string} args.userId
 */
export async function atualizarTodos({ client, arquivosPorMotor, userId }) {
  const resultados = [];
  for (const motor of MOTORES) {
    const arquivo = arquivosPorMotor[motor];
    if (!arquivo) {
      resultados.push({ motor, resultado: 'sem-arquivo' });
      continue;
    }
    try {
      const resultado = await atualizarMotor({ client, motor, userId, ...arquivo });
      resultados.push(resultado);
    } catch (erro) {
      resultados.push({ motor, resultado: 'erro', erro: String(erro?.message ?? erro) });
    }
  }
  return resultados;
}
