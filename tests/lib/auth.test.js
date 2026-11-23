import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  entrar,
  sair,
  sessaoAtual,
  observarSessao,
  obterPapel,
  podeEditar,
} from '../../src/lib/auth.js';

function clientAuth({ sessao = null, erroLogin = null } = {}) {
  let listener = null;
  return {
    _cancelado: false,
    auth: {
      async signInWithPassword(credenciais) {
        if (erroLogin) return { data: null, error: erroLogin };
        this._credenciais = credenciais;
        return { data: { user: { email: credenciais.email }, session: sessao ?? { access_token: 't' } }, error: null };
      },
      async signOut() {
        return { error: null };
      },
      async getSession() {
        return { data: { session: sessao }, error: null };
      },
      onAuthStateChange(cb) {
        listener = cb;
        return {
          data: {
            subscription: {
              unsubscribe() {
                listener = null;
              },
            },
          },
        };
      },
    },
    disparar(evento, novaSessao) {
      listener?.(evento, novaSessao);
    },
  };
}

test('entrar usa o login do Supabase Auth e devolve a sessao', async () => {
  const client = clientAuth();
  const sessao = await entrar(client, { email: 'dono@exemplo.com', senha: 'segredo' });
  assert.equal(sessao.access_token, 't');
  assert.deepEqual(client.auth._credenciais, { email: 'dono@exemplo.com', password: 'segredo' });
});

test('entrar propaga erro de credencial sem inventar sessao', async () => {
  const client = clientAuth({ erroLogin: new Error('Invalid login credentials') });
  await assert.rejects(() => entrar(client, { email: 'x', senha: 'y' }), /Invalid login/);
});

test('sair, sessaoAtual e observacao de mudanca de sessao', async () => {
  const client = clientAuth({ sessao: { access_token: 'a' } });
  await sair(client);
  const sessao = await sessaoAtual(client);
  assert.equal(sessao.access_token, 'a');

  let recebida = 'inicial';
  const cancelar = observarSessao(client, (nova) => {
    recebida = nova;
  });
  client.disparar('SIGNED_IN', { access_token: 'b' });
  assert.equal(recebida.access_token, 'b');
  cancelar();
  client.disparar('SIGNED_OUT', null);
  assert.equal(recebida.access_token, 'b');
});

test('obterPapel le do banco e podeEditar so libera owner/updater', async () => {
  const client = {
    async rpc(nome) {
      assert.equal(nome, 'meu_papel');
      return { data: 'updater', error: null };
    },
  };
  const papel = await obterPapel(client);
  assert.equal(papel, 'updater');
  assert.equal(podeEditar('owner'), true);
  assert.equal(podeEditar('updater'), true);
  assert.equal(podeEditar('leitor'), false);
  assert.equal(podeEditar('anonimo'), false);
});
