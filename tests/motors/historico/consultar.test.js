import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarBancoFake } from '../../helpers/fake-supabase.js';
import { atualizarMotor } from '../../src/lib/motor-sync.js';
import {
  obterHistorico,
  filtrarRegistros,
  resumirRegistros,
  linhasParaExportacao,
} from '../../src/motors/historico/consultar.js';
import { normalizarRegistro } from '../../src/motors/movimentacoes/registro-canonico.js';

function venda(overrides = {}) {
  return {
    numeroNotaFiscal: 100001,
    dataMovimento: '2026-01-05',
    codCliente: 90001,
    nomeCliente: 'CLIENTE A',
    descricaoProduto: 'PRODUTO A',
    eanProduto: '111',
    codprodWinthor: 501,
    unidadesVendidas: 10,
    valorNota: 100,
    pesoLiquidoKg: 1,
    pesoBrutoKg: 1.2,
    vendedor: 'VENDEDOR A',
    supervisor: 'SUPERVISOR A',
    cidade: 'CIDADE A',
    uf: 'MS',
    ...overrides,
  };
}

async function semear(client) {
  await atualizarMotor({
    client,
    motor: 'movimentacoes',
    fonteChave: 'erp_atual_vendas_8022',
    hashArquivo: 'hash-atual',
    nomeArquivo: 'vendas.xls',
    linhas: [
      venda(),
      venda({ numeroNotaFiscal: 100002, dataMovimento: '2026-02-10', valorNota: 250, clienteNome: 'CLIENTE B' }),
    ],
  });
  await atualizarMotor({
    client,
    motor: 'movimentacoes',
    fonteChave: 'erp_antigo_379_25',
    hashArquivo: 'hash-antigo',
    nomeArquivo: '379_25.txt',
    linhas: [
      {
        notaFiscal: '1494001',
        notaSerie: null,
        item: '90000358',
        data: '06/01/2025',
        cliente: '000000002000180',
        quantidade: 6,
        valor: 76.81,
        eanComercial: '2000000004136',
        operCfop: '13201',
        cidade: 'CIDADE C',
      },
    ],
  });
}

test('obterHistorico agrega as fontes ativas de Movimentacoes e sobrevive a reload', async () => {
  const client = criarBancoFake();
  await semear(client);

  const primeiraLeitura = await obterHistorico({ client });
  assert.equal(primeiraLeitura.total, 3);
  assert.deepEqual(primeiraLeitura.avisos.fontes, ['erp_antigo_379_25', 'erp_atual_vendas_8022']);

  // "reload": nova leitura no mesmo banco, sem estado local
  const segundaLeitura = await obterHistorico({ client });
  assert.equal(segundaLeitura.total, 3);
  assert.equal(segundaLeitura.resumo.totalValor, 426.81);
  assert.deepEqual(segundaLeitura.resumo.porFonte, {
    erp_antigo_379_25: 1,
    erp_atual_vendas_8022: 2,
  });
});

test('filtros por periodo, cliente, fonte e tipo', async () => {
  const client = criarBancoFake();
  await semear(client);

  const porPeriodo = await obterHistorico({ client, filtros: { de: '2026-01-01' } });
  assert.equal(porPeriodo.total, 2);
  assert.equal(porPeriodo.resumo.periodo.de, '2026-01-05');

  const porCliente = await obterHistorico({ client, filtros: { cliente: 'cliente b' } });
  assert.equal(porCliente.total, 1);
  assert.equal(porCliente.registros[0].documento, '100002');

  const porFonte = await obterHistorico({ client, filtros: { fonte: 'erp_antigo_379_25' } });
  assert.equal(porFonte.total, 1);
  assert.equal(porFonte.registros[0].tipo, 'faturamento');

  const porTipo = await obterHistorico({ client, filtros: { tipo: 'venda' } });
  assert.equal(porTipo.total, 2);
});

test('paginacao nao altera o resumo total', async () => {
  const client = criarBancoFake();
  await semear(client);

  const pagina1 = await obterHistorico({ client, pagina: { limite: 2 } });
  assert.equal(pagina1.registros.length, 2);
  assert.equal(pagina1.total, 3);
  assert.equal(pagina1.pagina.temMais, true);

  const pagina2 = await obterHistorico({ client, pagina: { limite: 2, deslocamento: 2 } });
  assert.equal(pagina2.registros.length, 1);
  assert.equal(pagina2.pagina.temMais, false);
  assert.equal(pagina2.resumo.totalRegistros, 3);
});

test('ordena por data decrescente e sinaliza repeticao entre fontes', async () => {
  const client = criarBancoFake();
  await atualizarMotor({
    client,
    motor: 'movimentacoes',
    fonteChave: 'fonte_a',
    hashArquivo: 'h1',
    nomeArquivo: 'a.xls',
    linhas: [venda({ numeroNotaFiscal: 7, dataMovimento: '2026-03-01', valorNota: 10 })],
  });
  await atualizarMotor({
    client,
    motor: 'movimentacoes',
    fonteChave: 'fonte_b',
    hashArquivo: 'h2',
    nomeArquivo: 'b.xls',
    linhas: [venda({ numeroNotaFiscal: 7, dataMovimento: '2026-03-01', valorNota: 10 })],
  });

  const resultado = await obterHistorico({ client });
  assert.equal(resultado.avisos.registrosEmMaisDeUmaFonte, 2);
  assert.equal(resultado.avisos.chavesEmMaisDeUmaFonte.length, 1);
  assert.equal(resultado.total, 2);
});

test('entradas sem formato conhecido sao contadas como ignoradas, nao inventadas', async () => {
  const client = criarBancoFake();
  await atualizarMotor({
    client,
    motor: 'movimentacoes',
    fonteChave: 'fonte_estranha',
    hashArquivo: 'h',
    nomeArquivo: 'x.txt',
    linhas: [{ foo: 'bar' }],
  });

  const resultado = await obterHistorico({ client });
  assert.equal(resultado.total, 0);
  assert.equal(resultado.avisos.registrosIgnorados, 1);
});

test('filtrarRegistros e resumirRegistros funcionam sobre registros canonicos', () => {
  const registros = [
    normalizarRegistro(venda(), { fonteChave: 'f1' }),
    normalizarRegistro(venda({ numeroNotaFiscal: 2, dataMovimento: '2026-05-01' }), { fonteChave: 'f2' }),
  ];
  const filtrados = filtrarRegistros(registros, { de: '2026-04-01' });
  assert.equal(filtrados.length, 1);
  const resumo = resumirRegistros(filtrados);
  assert.equal(resumo.totalValor, 100);
});

test('linhasParaExportacao devolve colunas planas sem alterar tipos', () => {
  const registro = normalizarRegistro(venda(), { fonteChave: 'f1' });
  const [linha] = linhasParaExportacao([registro]);
  assert.equal(linha.quantidade, 10);
  assert.equal(linha.valor, 100);
  assert.equal(linha.fonte, 'f1');
  assert.equal(linha.data, '2026-01-05');
});
