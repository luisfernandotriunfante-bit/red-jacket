import { test } from 'node:test';
import assert from 'node:assert/strict';
import { atualizarMotor, atualizarTodos, MOTORES } from '../../src/lib/motor-sync.js';

// Mock mínimo do client do Supabase JS, em memória, sem rede. Reproduz só
// o encadeamento usado por motor-sync.js: from().select().eq().maybeSingle(),
// from().insert().select().single(), from().insert() (bulk), e rpc().
function criarClientMock() {
  const slots = [];
  const versoes = [];
  const dados = [];
  let proximoId = 1;

  function novoId() {
    return `id-${proximoId++}`;
  }

  const client = {
    rpcChamadas: [],
    from(tabela) {
      if (tabela === 'upload_slots') {
        return {
          select() {
            return this;
          },
          eq(_campo, valor) {
            this._motor = valor;
            return this;
          },
          async maybeSingle() {
            const encontrado = slots.find((s) => s.motor === this._motor);
            return { data: encontrado ?? null, error: null };
          },
          insert(objeto) {
            const criado = { id: novoId(), motor: objeto.motor };
            slots.push(criado);
            this._ultimoInserido = criado;
            return this;
          },
          select2() {
            return this;
          },
          single: async function () {
            return { data: this._ultimoInserido, error: null };
          },
        };
      }
      if (tabela === 'upload_versoes') {
        return {
          select() {
            return this;
          },
          eq(campo, valor) {
            this._filtros = { ...(this._filtros ?? {}), [campo]: valor };
            return this;
          },
          async maybeSingle() {
            const encontrado = versoes.find(
              (v) => v.slot_id === this._filtros.slot_id && v.status === this._filtros.status,
            );
            return { data: encontrado ?? null, error: null };
          },
          insert(objeto) {
            const criado = { id: novoId(), ...objeto };
            versoes.push(criado);
            this._ultimoInserido = criado;
            return this;
          },
          async single() {
            return { data: { id: this._ultimoInserido.id }, error: null };
          },
        };
      }
      if (tabela === 'dados_motor') {
        return {
          async insert(registros) {
            dados.push(...registros);
            return { error: null };
          },
        };
      }
      throw new Error(`tabela não mockada: ${tabela}`);
    },
    async rpc(nome, args) {
      client.rpcChamadas.push({ nome, args });
      if (nome === 'promover_versao') {
        const versao = versoes.find((v) => v.id === args.p_versao_id);
        const anterior = versoes.find((v) => v.slot_id === versao.slot_id && v.status === 'active');
        if (anterior) {
          anterior.status = 'superseded';
          for (let i = dados.length - 1; i >= 0; i -= 1) {
            if (dados[i].versao_id === anterior.id) dados.splice(i, 1);
          }
        }
        versao.status = 'active';
        return { error: null };
      }
      if (nome === 'rejeitar_versao') {
        const versao = versoes.find((v) => v.id === args.p_versao_id);
        versao.status = 'rejected';
        for (let i = dados.length - 1; i >= 0; i -= 1) {
          if (dados[i].versao_id === versao.id) dados.splice(i, 1);
        }
        return { error: null };
      }
      throw new Error(`rpc não mockada: ${nome}`);
    },
    _inspecionar() {
      return { slots, versoes, dados };
    },
  };
  return client;
}

test('primeira atualização de um motor cria slot, versão e promove', async () => {
  const client = criarClientMock();
  const resultado = await atualizarMotor({
    client,
    motor: 'produtos',
    hashArquivo: 'hash-1',
    nomeArquivo: 'cadastro.txt',
    linhas: [{ codigo: '1' }, { codigo: '2' }],
    userId: 'user-1',
  });

  assert.equal(resultado.resultado, 'promovido');
  const { slots, versoes, dados } = client._inspecionar();
  assert.equal(slots.length, 1);
  assert.equal(versoes.length, 1);
  assert.equal(versoes[0].status, 'active');
  assert.equal(dados.length, 2);
});

test('reenviar o mesmo hash é idempotente (sem-mudanca, não reprocessa)', async () => {
  const client = criarClientMock();
  await atualizarMotor({
    client,
    motor: 'clientes',
    hashArquivo: 'hash-x',
    nomeArquivo: 'clientes.csv',
    linhas: [{ a: 1 }],
    userId: 'user-1',
  });

  const resultado = await atualizarMotor({
    client,
    motor: 'clientes',
    hashArquivo: 'hash-x',
    nomeArquivo: 'clientes.csv',
    linhas: [{ a: 1 }],
    userId: 'user-1',
  });

  assert.equal(resultado.resultado, 'sem-mudanca');
  const { versoes } = client._inspecionar();
  assert.equal(versoes.length, 1); // não criou segunda versão
});

test('substituir um arquivo promove a versão nova e descarta o payload da anterior', async () => {
  const client = criarClientMock();
  await atualizarMotor({
    client,
    motor: 'movimentacoes',
    hashArquivo: 'hash-a',
    nomeArquivo: 'mov1.txt',
    linhas: [{ v: 1 }],
    userId: 'user-1',
  });

  const resultado = await atualizarMotor({
    client,
    motor: 'movimentacoes',
    hashArquivo: 'hash-b',
    nomeArquivo: 'mov2.txt',
    linhas: [{ v: 2 }, { v: 3 }],
    userId: 'user-1',
  });

  assert.equal(resultado.resultado, 'promovido');
  const { versoes, dados } = client._inspecionar();
  assert.equal(versoes.find((v) => v.hash_arquivo === 'hash-a').status, 'superseded');
  assert.equal(versoes.find((v) => v.hash_arquivo === 'hash-b').status, 'active');
  // payload da versão superseded foi apagado; só os 2 registros da nova versão restam
  assert.equal(dados.length, 2);
});

test('validação reprovada rejeita a versão e preserva a ativa anterior', async () => {
  const client = criarClientMock();
  await atualizarMotor({
    client,
    motor: 'chegada_nfs',
    hashArquivo: 'hash-boa',
    nomeArquivo: 'nf1.xls',
    linhas: [{ nf: 1 }],
    userId: 'user-1',
  });

  const resultado = await atualizarMotor({
    client,
    motor: 'chegada_nfs',
    hashArquivo: 'hash-ruim',
    nomeArquivo: 'nf2.xls',
    linhas: [{ nf: 2 }],
    userId: 'user-1',
    validar: () => false,
  });

  assert.equal(resultado.resultado, 'rejeitado');
  const { versoes } = client._inspecionar();
  assert.equal(versoes.find((v) => v.hash_arquivo === 'hash-boa').status, 'active');
  assert.equal(versoes.find((v) => v.hash_arquivo === 'hash-ruim').status, 'rejected');
});

test('atualizarTodos processa cada motor isoladamente, sem abortar nos demais em caso de erro', async () => {
  const client = criarClientMock();
  const clienteOriginalFrom = client.from.bind(client);
  client.from = (tabela) => {
    if (tabela === 'dados_motor') {
      return {
        async insert() {
          throw new Error('falha simulada de rede');
        },
      };
    }
    return clienteOriginalFrom(tabela);
  };

  const resultados = await atualizarTodos({
    client,
    arquivosPorMotor: {
      produtos: { hashArquivo: 'h1', nomeArquivo: 'a.txt', linhas: [{ x: 1 }] },
      historico: { hashArquivo: 'h2', nomeArquivo: 'b.txt', linhas: [{ x: 2 }] },
    },
    userId: 'user-1',
  });

  const porMotor = Object.fromEntries(resultados.map((r) => [r.motor, r.resultado]));
  assert.equal(porMotor.produtos, 'erro');
  assert.equal(porMotor.historico, 'erro');
  assert.equal(porMotor.movimentacoes, 'sem-arquivo');
  assert.equal(porMotor.clientes, 'sem-arquivo');
  assert.equal(porMotor.chegada_nfs, 'sem-arquivo');
  assert.equal(resultados.length, MOTORES.length);
});
