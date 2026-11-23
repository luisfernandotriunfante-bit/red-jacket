import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  atualizarMotor,
  atualizarTodos,
  listarEstadoMotores,
  obterDadosAtivos,
  MOTORES,
} from '../../src/lib/motor-sync.js';

// Mock mínimo do client do Supabase JS, em memória, sem rede. Reproduz o
// encadeamento usado por motor-sync.js: from().select().eq().maybeSingle(),
// from().insert().select().single(), from().insert() (bulk), e rpc(). Além
// disso simula a autorização que no banco real vem de RLS/SECURITY
// DEFINER: `autorizado: false` faz insert/rpc retornarem erro, como a
// policy do banco faria para uma conta sem permissão de atualização. O rpc
// de promover_versao retorna { data: 'active' | 'rejected' }, igual à
// função SQL real, para o client distinguir promoção de idempotência.
function criarClientMock({ autorizado = true } = {}) {
  const slots = [];
  const versoes = [];
  const dados = [];
  let proximoId = 1;

  function novoId() {
    return `id-${proximoId++}`;
  }

  const erroPermissao = () => ({ data: null, error: new Error('usuário sem permissão de atualização') });

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
            if (!autorizado) {
              this._erroInsert = true;
              return this;
            }
            const criado = { id: novoId(), motor: objeto.motor };
            slots.push(criado);
            this._ultimoInserido = criado;
            return this;
          },
          async single() {
            if (this._erroInsert) return erroPermissao();
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
            if (!autorizado) {
              this._erroInsert = true;
              return this;
            }
            // criado_por nunca vem do objeto inserido (seria auth.uid() via trigger no banco real)
            const criado = { id: novoId(), linhas_count: 0, ...objeto };
            versoes.push(criado);
            this._ultimoInserido = criado;
            return this;
          },
          async single() {
            if (this._erroInsert) return erroPermissao();
            return { data: { id: this._ultimoInserido.id }, error: null };
          },
        };
      }
      if (tabela === 'dados_motor') {
        return {
          insert(registros) {
            if (!autorizado) {
              this._erroInsert = true;
              return this;
            }
            dados.push(...registros);
            return this;
          },
          eq(campo, valor) {
            this._filtroVersao = valor;
            return this;
          },
          select() {
            return this;
          },
          then(resolve) {
            // suporta await direto em .select().eq(...) sem .single()
            if (this._erroInsert) return resolve(erroPermissao());
            const linhas = dados.filter((d) => d.versao_id === this._filtroVersao);
            resolve({ data: linhas, error: null });
          },
        };
      }
      throw new Error(`tabela não mockada: ${tabela}`);
    },
    async rpc(nome, args) {
      client.rpcChamadas.push({ nome, args });
      if (!autorizado) return erroPermissao();

      if (nome === 'promover_versao') {
        const versao = versoes.find((v) => v.id === args.p_versao_id);
        const anterior = versoes.find((v) => v.slot_id === versao.slot_id && v.status === 'active');
        if (anterior && anterior.hash_arquivo === versao.hash_arquivo) {
          // idempotência: já existe ativa com o mesmo conteúdo; descarta a staging
          for (let i = dados.length - 1; i >= 0; i -= 1) {
            if (dados[i].versao_id === versao.id) dados.splice(i, 1);
          }
          versao.status = 'rejected';
          return { data: 'rejected', error: null };
        }
        if (anterior) {
          anterior.status = 'superseded';
          for (let i = dados.length - 1; i >= 0; i -= 1) {
            if (dados[i].versao_id === anterior.id) dados.splice(i, 1);
          }
        }
        versao.status = 'active';
        versao.linhas_count = dados.filter((d) => d.versao_id === versao.id).length;
        versao.promovido_em = new Date().toISOString();
        return { data: 'active', error: null };
      }
      if (nome === 'rejeitar_versao') {
        const versao = versoes.find((v) => v.id === args.p_versao_id);
        versao.status = 'rejected';
        for (let i = dados.length - 1; i >= 0; i -= 1) {
          if (dados[i].versao_id === versao.id) dados.splice(i, 1);
        }
        return { data: null, error: null };
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
  });

  const resultado = await atualizarMotor({
    client,
    motor: 'clientes',
    hashArquivo: 'hash-x',
    nomeArquivo: 'clientes.csv',
    linhas: [{ a: 1 }],
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
  });

  const resultado = await atualizarMotor({
    client,
    motor: 'movimentacoes',
    hashArquivo: 'hash-b',
    nomeArquivo: 'mov2.txt',
    linhas: [{ v: 2 }, { v: 3 }],
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
  });

  const resultado = await atualizarMotor({
    client,
    motor: 'chegada_nfs',
    hashArquivo: 'hash-ruim',
    nomeArquivo: 'nf2.xls',
    linhas: [{ nf: 2 }],
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
        insert() {
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
  });

  const porMotor = Object.fromEntries(resultados.map((r) => [r.motor, r.resultado]));
  assert.equal(porMotor.produtos, 'erro');
  assert.equal(porMotor.historico, 'erro');
  assert.equal(porMotor.movimentacoes, 'sem-arquivo');
  assert.equal(porMotor.clientes, 'sem-arquivo');
  assert.equal(porMotor.chegada_nfs, 'sem-arquivo');
  assert.equal(resultados.length, MOTORES.length);
});

test('usuário sem permissão (não owner/updater) recebe erro e não grava nada', async () => {
  const client = criarClientMock({ autorizado: false });

  await assert.rejects(
    atualizarMotor({
      client,
      motor: 'produtos',
      hashArquivo: 'hash-sem-permissao',
      nomeArquivo: 'x.txt',
      linhas: [{ a: 1 }],
    }),
    /permissão/,
  );

  const { slots, versoes, dados } = client._inspecionar();
  assert.equal(slots.length, 0);
  assert.equal(versoes.length, 0);
  assert.equal(dados.length, 0);
});

test(
  'duas promoções concorrentes da mesma staging/slot: só uma promove de fato, ' +
    'a outra recebe sem-mudanca do próprio retorno do RPC (status final), sem depender de contagem local. ' +
    'A exclusão mútua real (índice único + FOR UPDATE) só é garantida pelo banco; este teste cobre a lógica de ' +
    'aplicação que consome esse retorno corretamente.',
  async () => {
    const client = criarClientMock();

    // pré-cria e promove a primeira versão fora da concorrência, para
    // isolar o teste na corrida de SUBSTITUIÇÃO (não na corrida de criação
    // do slot, que depende de constraint do banco não simulável aqui)
    await atualizarMotor({
      client,
      motor: 'produtos',
      hashArquivo: 'hash-original',
      nomeArquivo: 'original.txt',
      linhas: [{ x: 0 }],
    });

    const [resultadoA, resultadoB] = await Promise.all([
      atualizarMotor({
        client,
        motor: 'produtos',
        hashArquivo: 'hash-concorrente',
        nomeArquivo: 'a.txt',
        linhas: [{ x: 1 }],
      }),
      atualizarMotor({
        client,
        motor: 'produtos',
        hashArquivo: 'hash-concorrente',
        nomeArquivo: 'b.txt',
        linhas: [{ x: 2 }],
      }),
    ]);

    const resultados = [resultadoA.resultado, resultadoB.resultado].sort();
    assert.deepEqual(resultados, ['promovido', 'sem-mudanca']);

    const { versoes } = client._inspecionar();
    const ativas = versoes.filter((v) => v.status === 'active');
    assert.equal(ativas.length, 1);
    assert.equal(ativas[0].hash_arquivo, 'hash-concorrente');
  },
);

test('listarEstadoMotores reflete o que foi promovido, mesmo após "reload" (nova leitura)', async () => {
  const client = criarClientMock();
  await atualizarMotor({
    client,
    motor: 'produtos',
    hashArquivo: 'hash-1',
    nomeArquivo: 'cadastro.txt',
    linhas: [{ codigo: '1' }, { codigo: '2' }],
  });

  const estado = await listarEstadoMotores({ client });

  assert.equal(estado.produtos.temDados, true);
  assert.equal(estado.produtos.nomeArquivo, 'cadastro.txt');
  assert.equal(estado.produtos.linhasCount, 2);
  assert.equal(estado.historico.temDados, false);
  assert.equal(Object.keys(estado).length, MOTORES.length);
});

test('obterDadosAtivos retorna as linhas da versão ativa, e [] para motor sem dados', async () => {
  const client = criarClientMock();
  await atualizarMotor({
    client,
    motor: 'clientes',
    hashArquivo: 'hash-1',
    nomeArquivo: 'clientes.csv',
    linhas: [{ nome: 'A' }, { nome: 'B' }],
  });

  const linhas = await obterDadosAtivos({ client, motor: 'clientes' });
  assert.deepEqual(linhas, [{ nome: 'A' }, { nome: 'B' }]);

  const vazio = await obterDadosAtivos({ client, motor: 'historico' });
  assert.deepEqual(vazio, []);
});
