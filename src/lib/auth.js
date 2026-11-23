// Autenticação pelo Supabase Auth (login próprio do Supabase, decisão
// explícita do usuário). O app não guarda senha: o SDK cria a sessão e a
// persiste no storage padrão do navegador, então a sessão sobrevive a
// recarregar a página e o token é renovado sozinho.
//
// O papel (owner/updater/leitor) NUNCA é decidido aqui: vem da função
// meu_papel() no banco (supabase/migrations/0002_papel_usuario.sql), que
// lê auth.uid() do JWT. Este módulo só transporta o resultado para a UI
// decidir se mostra os botões de atualização.

/**
 * Entra com e-mail e senha. Lança o erro do Supabase se falhar.
 * @param {object} client
 * @param {{email: string, senha: string}} credenciais
 * @returns {Promise<object|null>} sessão
 */
export async function entrar(client, { email, senha }) {
  const { data, error } = await client.auth.signInWithPassword({ email, password: senha });
  if (error) throw error;
  return data.session ?? null;
}

/**
 * Encerra a sessão no navegador.
 * @param {object} client
 */
export async function sair(client) {
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

/**
 * Sessão atual (null se não autenticado). Usar ao montar a tela para
 * decidir entre login e conteúdo.
 * @param {object} client
 * @returns {Promise<object|null>}
 */
export async function sessaoAtual(client) {
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  return data.session ?? null;
}

/**
 * Observa login/logout/renovação de token. Devolve a função para cancelar.
 * @param {object} client
 * @param {(sessao: object|null) => void} aoMudar
 * @returns {() => void}
 */
export function observarSessao(client, aoMudar) {
  const { data } = client.auth.onAuthStateChange((_evento, sessao) => {
    aoMudar(sessao ?? null);
  });
  return () => data?.subscription?.unsubscribe?.();
}

/**
 * Papel do usuário logado, decidido pelo banco via RPC meu_papel():
 * 'owner' | 'updater' | 'leitor' | 'anonimo'.
 * @param {object} client
 * @returns {Promise<'owner'|'updater'|'leitor'|'anonimo'>}
 */
export async function obterPapel(client) {
  const { data, error } = await client.rpc('meu_papel');
  if (error) throw error;
  return data ?? 'anonimo';
}

/**
 * A UI deve mostrar os botões de atualização apenas para owner/updater.
 * Isto é conveniência de interface, não autorização: o banco rejeita
 * escrita de quem não tem permissão de qualquer forma (RLS + funções).
 * @param {string} papel
 */
export function podeEditar(papel) {
  return papel === 'owner' || papel === 'updater';
}
