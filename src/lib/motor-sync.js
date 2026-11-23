// Camada de dados para os botões "Atualizar" (por fonte de um motor) e
// "Atualizar todos", e para a leitura dos dados persistidos (sobrevive a
// recarregar a página). Não importa '@supabase/supabase-js' diretamente —
// recebe um client já construído (por src/lib/supabase-client.js em
// produção, ou um mock nos testes), para ficar testável sem rede e sem
// credencial real.
//
// Modelo: motor é o destino funcional (Histórico, Movimentações,
// Clientes, Produtos, Chegada de NFs). Um motor pode ter várias FONTES —
// ex. Movimentações recebe relatórios diferentes do ERP antigo e do atual
// — por isso cada operação identifica o slot por (motor, fonteChave), não
// só por motor. Ver supabase/migrations/0001_motores_staging.sql.
//
// Autorização: quem pode escrever (owner/updater) é decidido pelo banco
// (RLS + funções SECURITY DEFINER), nunca pelo client. Leitura é liberada a
// qualquer usuário autenticado. O `criado_por` de cada versão também vem de
// auth.uid() via trigger no banco, nunca de um parâmetro enviado por este
// módulo.

export const MOTORES = ['historico', 'movimentacoes', 'clientes', 'produtos', 'chegada_nfs'];

async function obterOuCriarSlot(client, motor, fonteChave) {
  const { data: existente, error: erroSelect } = await client
    .from('upload_slots')
    .select('id, motor, fonte_chave')
    .eq('motor', motor)
    .eq('fonte_chave', fonteChave)
    .maybeSingle();
  if (erroSelect) throw erroSelect;
  if (existente) return existente;

  const { data: criado, error: erroInsert } = await client
    .from('upload_slots')
    .insert({ motor, fonte_chave: fonteChave })
    .select('id, motor, fonte_chave')
    .single();
  if (erroInsert) throw erroInsert;
  return criado;
}

async function listarSlotsDoMotor(client, motor) {
  const { data, error } = await client.from('upload_slots').select('id, fonte_chave').eq('motor', motor);
  if (error) throw error;
  return data ?? [];
}

async function obterVersaoAtiva(client, slotId) {
  const { data, error } = await client
    .from('upload_versoes')
    .select('id, hash_arquivo, nome_arquivo_original, linhas_count, promovido_em, promovido_por')
    .eq('slot_id', slotId)
    .eq('status', 'active')
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function criarVersaoStaging(client, slotId, hashArquivo, nomeArquivo) {
  // criado_por não é enviado: o trigger set_criado_por() no banco sempre
  // sobrescreve com auth.uid() da sessão autenticada, nunca confia neste
  // client para dizer quem é o autor.
  const { data, error } = await client
    .from('upload_versoes')
    .insert({
      slot_id: slotId,
      status: 'staging',
      hash_arquivo: hashArquivo,
      nome_arquivo_original: nomeArquivo,
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
  // retorna o status final ('active' se promoveu de fato, 'rejected' se o
  // banco descartou por já existir ativa idêntica) — nunca supor sucesso
  // só porque error é null.
  const { data, error } = await client.rpc('promover_versao', { p_versao_id: versaoId });
  if (error) throw error;
  return data;
}

async function rejeitarVersao(client, versaoId) {
  const { error } = await client.rpc('rejeitar_versao', { p_versao_id: versaoId });
  if (error) throw error;
}

/**
 * Processa a atualização de uma FONTE de um motor (motor + fonteChave):
 * cria/reaproveita o slot, checa idempotência pelo hash, grava em
 * staging, valida e promove ou rejeita. Se qualquer passo depois de criar
 * a staging falhar, tenta rejeitar a staging antes de propagar o erro.
 *
 * @param {object} args
 * @param {object} args.client Cliente Supabase (ou mock compatível).
 * @param {string} args.motor Um de MOTORES.
 * @param {string} args.fonteChave Identifica a fonte dentro do motor (ex.
 *   'erp_antigo_1', 'erp_atual_mes_atual'). Um motor pode ter várias.
 * @param {string} args.hashArquivo Hash de conteúdo do arquivo (ex. sha256).
 * @param {string} args.nomeArquivo Nome original do arquivo.
 * @param {object[]} args.linhas Linhas já normalizadas (parsing client-side).
 * @param {(linhas: object[]) => boolean | Promise<boolean>} [args.validar]
 * @returns {Promise<{motor: string, fonteChave: string, resultado: 'promovido'|'sem-mudanca'|'rejeitado'}>}
 */
export async function atualizarMotor({ client, motor, fonteChave, hashArquivo, nomeArquivo, linhas, validar }) {
  if (!MOTORES.includes(motor)) {
    throw new Error(`motor desconhecido: ${motor}`);
  }
  if (!fonteChave) {
    throw new Error('fonteChave é obrigatória (identifica o arquivo dentro do motor)');
  }

  const slot = await obterOuCriarSlot(client, motor, fonteChave);
  const ativa = await obterVersaoAtiva(client, slot.id);

  if (ativa && ativa.hash_arquivo === hashArquivo) {
    return { motor, fonteChave, resultado: 'sem-mudanca' };
  }

  const versao = await criarVersaoStaging(client, slot.id, hashArquivo, nomeArquivo);

  try {
    await inserirLinhas(client, versao.id, linhas);

    const valido = validar ? await validar(linhas) : true;
    if (!valido) {
      await rejeitarVersao(client, versao.id);
      return { motor, fonteChave, resultado: 'rejeitado' };
    }

    const statusFinal = await promoverVersao(client, versao.id);
    return { motor, fonteChave, resultado: statusFinal === 'active' ? 'promovido' : 'sem-mudanca' };
  } catch (erro) {
    try {
      await rejeitarVersao(client, versao.id);
    } catch {
      // melhor esforço: não mascara o erro original se a limpeza também falhar
    }
    throw erro;
  }
}

/**
 * Botão "Atualizar todos": roda atualizarMotor para cada fonte informada,
 * de forma independente. Erro em uma fonte nunca aborta as demais.
 *
 * @param {object} args
 * @param {object} args.client
 * @param {Record<string, Array<{fonteChave: string, hashArquivo: string, nomeArquivo: string, linhas: object[], validar?: Function}>>} args.arquivosPorMotor
 *   Lista de fontes com arquivo selecionado, por motor (um motor pode ter
 *   mais de uma fonte na lista).
 */
export async function atualizarTodos({ client, arquivosPorMotor }) {
  const resultados = [];
  for (const motor of MOTORES) {
    const fontes = arquivosPorMotor[motor];
    if (!fontes || fontes.length === 0) {
      resultados.push({ motor, fonteChave: null, resultado: 'sem-arquivo' });
      continue;
    }
    for (const fonte of fontes) {
      try {
        const resultado = await atualizarMotor({ client, motor, ...fonte });
        resultados.push(resultado);
      } catch (erro) {
        resultados.push({ motor, fonteChave: fonte.fonteChave, resultado: 'erro', erro: String(erro?.message ?? erro) });
      }
    }
  }
  return resultados;
}

/**
 * Leitura pós-reload: estado de cada fonte de cada um dos 5 motores
 * (liberada a qualquer usuário autenticado). Usar ao montar a tela de
 * Uploads para mostrar "última atualização" sem depender de estado local
 * perdido no reload.
 *
 * @param {object} args
 * @param {object} args.client
 * @returns {Promise<Record<string, Array<{
 *   fonteChave: string,
 *   temDados: boolean,
 *   nomeArquivo?: string,
 *   linhasCount?: number,
 *   promovidoEm?: string,
 * }>>>}
 */
export async function listarEstadoMotores({ client }) {
  const estado = {};
  for (const motor of MOTORES) {
    const slots = await listarSlotsDoMotor(client, motor);
    estado[motor] = [];
    for (const slot of slots) {
      const ativa = await obterVersaoAtiva(client, slot.id);
      estado[motor].push(
        ativa
          ? {
              fonteChave: slot.fonte_chave,
              temDados: true,
              nomeArquivo: ativa.nome_arquivo_original,
              linhasCount: ativa.linhas_count,
              promovidoEm: ativa.promovido_em,
            }
          : { fonteChave: slot.fonte_chave, temDados: false },
      );
    }
  }
  return estado;
}

/**
 * Leitura pós-reload: linhas estruturadas de um motor (para exibir/gerar
 * export). Sem `fonteChave`, agrega as linhas de TODAS as fontes ativas do
 * motor (útil para consolidação/export do motor inteiro); com
 * `fonteChave`, retorna só aquela fonte. Liberada a qualquer usuário
 * autenticado.
 *
 * @param {object} args
 * @param {object} args.client
 * @param {string} args.motor Um de MOTORES.
 * @param {string} [args.fonteChave]
 * @returns {Promise<object[]>} linhas (payload); [] se não há dados ainda.
 */
export async function obterDadosAtivos({ client, motor, fonteChave }) {
  if (!MOTORES.includes(motor)) {
    throw new Error(`motor desconhecido: ${motor}`);
  }

  const slots = fonteChave
    ? (await listarSlotsDoMotor(client, motor)).filter((s) => s.fonte_chave === fonteChave)
    : await listarSlotsDoMotor(client, motor);

  const todasAsLinhas = [];
  for (const slot of slots) {
    const ativa = await obterVersaoAtiva(client, slot.id);
    if (!ativa) continue;

    const { data: linhas, error: erroLinhas } = await client
      .from('dados_motor')
      .select('payload')
      .eq('versao_id', ativa.id);
    if (erroLinhas) throw erroLinhas;
    todasAsLinhas.push(...(linhas ?? []).map((linha) => linha.payload));
  }
  return todasAsLinhas;
}
