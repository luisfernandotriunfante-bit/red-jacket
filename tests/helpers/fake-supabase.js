// Banco Supabase falso em memória, para testes sem rede e sem credencial.
// Reproduz apenas as operações usadas por src/lib/motor-sync.js: slots por
// (motor, fonte_chave), versões com status e paginação de dados, além dos
// RPCs promover_versao/rejeitar_versao/meu_papel. A autorização simula a
// RLS: com autorizado=false, insert e RPC de escrita falham.

export function criarBancoFake({ autorizado = true, papel = 'owner' } = {}) {
  const slots = [];
  const versoes = [];
  const dados = [];
  let sequencia = 1;

  const novoId = () => 'id-' + sequencia++;
  const erroPermissao = () => ({
    data: null,
    error: new Error('usuario sem permissao de atualizacao'),
  });

  function builderSlots() {
    return {
      _filtros: {},
      _inserindo: null,
      _erro: false,
      select() {
        return this;
      },
      eq(campo, valor) {
        this._filtros[campo] = valor;
        return this;
      },
      insert(objeto) {
        if (!autorizado) {
          this._erro = true;
          return this;
        }
        const jaExiste = slots.find(
          (slot) => slot.motor === objeto.motor && slot.fonte_chave === objeto.fonte_chave,
        );
        if (jaExiste) {
          this._erro = true;
          this._erroDuplicado = true;
          return this;
        }
        this._inserindo = { id: novoId(), motor: objeto.motor, fonte_chave: objeto.fonte_chave };
        slots.push(this._inserindo);
        return this;
      },
      async single() {
        if (this._erroDuplicado) {
          return { data: null, error: new Error('duplicate key value violates unique constraint') };
        }
        if (this._erro) return erroPermissao();
        return { data: this._inserindo, error: null };
      },
      async maybeSingle() {
        const encontrado = slots.find(
          (slot) =>
            (this._filtros.motor === undefined || slot.motor === this._filtros.motor) &&
            (this._filtros.fonte_chave === undefined ||
              slot.fonte_chave === this._filtros.fonte_chave),
        );
        return { data: encontrado ?? null, error: null };
      },
      then(resolve) {
        const encontrados = slots.filter(
          (slot) => this._filtros.motor === undefined || slot.motor === this._filtros.motor,
        );
        resolve({ data: encontrados, error: null });
      },
    };
  }

  function builderVersoes() {
    return {
      _filtros: {},
      _inserindo: null,
      _erro: false,
      select() {
        return this;
      },
      eq(campo, valor) {
        this._filtros[campo] = valor;
        return this;
      },
      insert(objeto) {
        if (!autorizado) {
          this._erro = true;
          return this;
        }
        this._inserindo = {
          id: novoId(),
          status: 'staging',
          linhas_count: 0,
          criado_por: 'usuario-logado',
          ...objeto,
        };
        versoes.push(this._inserindo);
        return this;
      },
      async single() {
        if (this._erro) return erroPermissao();
        return { data: { id: this._inserindo.id }, error: null };
      },
      async maybeSingle() {
        const encontrada = versoes.find(
          (versao) =>
            (this._filtros.slot_id === undefined || versao.slot_id === this._filtros.slot_id) &&
            (this._filtros.status === undefined || versao.status === this._filtros.status),
        );
        return { data: encontrada ?? null, error: null };
      },
    };
  }

  function builderDados() {
    return {
      _filtros: {},
      _erro: false,
      _inserindo: false,
      select() {
        return this;
      },
      eq(campo, valor) {
        this._filtros[campo] = valor;
        return this;
      },
      insert(registros) {
        if (!autorizado) {
          this._erro = true;
          return this;
        }
        const lista = Array.isArray(registros) ? registros : [registros];
        for (const registro of lista) {
          const versao = versoes.find((v) => v.id === registro.versao_id);
          if (!versao || versao.status !== 'staging') {
            this._erro = true;
            this._erroPolicy = true;
            return this;
          }
          dados.push({ id: novoId(), ...registro });
        }
        this._inserindo = true;
        return this;
      },
      then(resolve) {
        if (this._erro && !this._inserindo) return resolve(erroPermissao());
        if (this._erroPolicy) {
          return resolve({ data: null, error: new Error('violacao de policy em dados_motor') });
        }
        const linhas = dados.filter(
          (linha) =>
            this._filtros.versao_id === undefined || linha.versao_id === this._filtros.versao_id,
        );
        resolve({ data: linhas, error: null });
      },
    };
  }

  const client = {
    rpcChamadas: [],
    from(tabela) {
      if (tabela === 'upload_slots') return builderSlots();
      if (tabela === 'upload_versoes') return builderVersoes();
      if (tabela === 'dados_motor') return builderDados();
      throw new Error('tabela nao mockada: ' + tabela);
    },
    async rpc(nome, args) {
      client.rpcChamadas.push({ nome, args });
      if (nome === 'meu_papel') return { data: autorizado || papel === 'leitor' ? papel : 'leitor', error: null };
      if (!autorizado) return erroPermissao();

      if (nome === 'promover_versao') {
        const versao = versoes.find((v) => v.id === args.p_versao_id);
        if (!versao || versao.status !== 'staging') {
          return { data: null, error: new Error('versao nao esta em staging') };
        }
        const anterior = versoes.find((v) => v.slot_id === versao.slot_id && v.status === 'active');
        if (anterior && anterior.hash_arquivo === versao.hash_arquivo) {
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
        versao.promovido_por = 'usuario-logado';
        return { data: 'active', error: null };
      }
      if (nome === 'rejeitar_versao') {
        const versao = versoes.find((v) => v.id === args.p_versao_id);
        if (versao) versao.status = 'rejected';
        for (let i = dados.length - 1; i >= 0; i -= 1) {
          if (versao && dados[i].versao_id === versao.id) dados.splice(i, 1);
        }
        return { data: null, error: null };
      }
      throw new Error('rpc nao mockada: ' + nome);
    },
    _inspecionar() {
      return { slots, versoes, dados };
    },
  };

  return client;
}
