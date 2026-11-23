import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { criarBancoFake } from '../helpers/fake-supabase.js';
import { atualizarMotor, atualizarTodos, listarEstadoMotores } from '../../src/lib/motor-sync.js';
import { parseFaturamentoErpAntigo } from '../../src/motors/movimentacoes/parse-faturamento-erp-antigo.js';
import { normalizarLinhasVendas, lerPlanilhaVendas } from '../../src/motors/movimentacoes/parse-vendas-erp-atual.js';
import { obterHistorico, linhasParaExportacao } from '../../src/motors/historico/consultar.js';
import { gerarJson } from '../../src/lib/export-motor.js';

const arquivoFaturamento = readFileSync(
  new URL('../fixtures/faturamento-erp-antigo-demo.txt', import.meta.url),
  'utf8',
);
const base64Vendas = readFileSync(
  new URL('../fixtures/vendas-erp-atual-demo.xls.b64.txt', import.meta.url),
  'utf8',
).trim();

const sha256 = (conteudo) => createHash('sha256').update(conteudo).digest('hex');

test('piloto Historico: 379_25 + 8022 entram como fontes de Movimentacoes e aparecem apos reload', async () => {
  const client = criarBancoFake();

  const { items } = parseFaturamentoErpAntigo(arquivoFaturamento);
  assert.equal(items.length, 68);

  const linhasVendas = normalizarLinhasVendas(lerPlanilhaVendas(Buffer.from(base64Vendas, 'base64')));
  assert.equal(linhasVendas.length, 3);

  const resultados = await atualizarTodos({
    client,
    arquivosPorMotor: {
      movimentacoes: [
        {
          fonteChave: 'erp_antigo_379_25',
          hashArquivo: sha256(arquivoFaturamento),
          nomeArquivo: '379_25_DEMO.txt',
          linhas: items,
          validar: (linhas) => linhas.length > 0,
        },
        {
          fonteChave: 'erp_atual_vendas_8022',
          hashArquivo: sha256(base64Vendas),
          nomeArquivo: '992ca97f-vendas-8022_DEMO.xls',
          linhas: linhasVendas,
          validar: (linhas) => linhas.length > 0,
        },
      ],
    },
  });

  const resultadosMovimentacoes = resultados.filter((r) => r.motor === 'movimentacoes');
  assert.deepEqual(resultadosMovimentacoes.map((r) => r.resultado), ['promovido', 'promovido']);

  // Simula recarregar a pagina: nenhum estado em memoria do fluxo anterior,
  // apenas novas consultas ao banco.
  const estado = await listarEstadoMotores({ client });
  assert.deepEqual(
    estado.movimentacoes.map((fonte) => [fonte.fonteChave, fonte.temDados, fonte.linhasCount]),
    [
      ['erp_antigo_379_25', true, 68],
      ['erp_atual_vendas_8022', true, 3],
    ],
  );
  assert.deepEqual(estado.historico, []);

  const historico = await obterHistorico({ client, pagina: { limite: 10 } });
  assert.equal(historico.total, 71);
  assert.equal(historico.registros.length, 10);
  assert.equal(historico.resumo.porFonte.erp_antigo_379_25, 68);
  assert.equal(historico.resumo.porFonte.erp_atual_vendas_8022, 3);
  assert.deepEqual(historico.avisos.fontes, ['erp_antigo_379_25', 'erp_atual_vendas_8022']);
  assert.equal(historico.resumo.totalRegistros, 71);

  // Nenhuma fonte/slot novo para o Histórico: só Movimentacoes.
  const { slots } = client._inspecionar();
  assert.deepEqual(slots.map((slot) => slot.motor), ['movimentacoes', 'movimentacoes']);

  const maisRecente = historico.registros[0];
  assert.equal(maisRecente.origem, 'erp_atual');
  assert.equal(maisRecente.data, '2026-10-02');
});

test('piloto Historico: filtros e exportacao usam os mesmos dados normalizados', async () => {
  const client = criarBancoFake();
  const { items } = parseFaturamentoErpAntigo(arquivoFaturamento);
  const linhasVendas = normalizarLinhasVendas(lerPlanilhaVendas(Buffer.from(base64Vendas, 'base64')));

  await atualizarMotor({
    client,
    motor: 'movimentacoes',
    fonteChave: 'erp_antigo_379_25',
    hashArquivo: sha256(arquivoFaturamento),
    nomeArquivo: '379_25_DEMO.txt',
    linhas: items,
  });
  await atualizarMotor({
    client,
    motor: 'movimentacoes',
    fonteChave: 'erp_atual_vendas_8022',
    hashArquivo: sha256(base64Vendas),
    nomeArquivo: '992ca97f-vendas-8022_DEMO.xls',
    linhas: linhasVendas,
  });

  const recentes = await obterHistorico({ client, filtros: { de: '2026-01-01' } });
  assert.equal(recentes.total, 3);

  const porCliente = await obterHistorico({ client, filtros: { cliente: 'CLIENTE DEMO 001' } });
  assert.equal(porCliente.total, 3);
  assert.ok(porCliente.registros.every((r) => r.documento === '100001'));

  const doErpAntigo = await obterHistorico({ client, filtros: { fonte: 'erp_antigo_379_25' } });
  assert.equal(doErpAntigo.total, 68);

  const linhasExport = linhasParaExportacao(recentes.registros);
  assert.equal(linhasExport.length, 3);
  assert.equal(typeof linhasExport[0].valor, 'number');
  const blob = gerarJson(linhasExport);
  const texto = await blob.text();
  const lido = JSON.parse(texto);
  assert.equal(lido.length, 3);
  assert.equal(lido[0].fonte, 'erp_atual_vendas_8022');
});

test('piloto Historico: leitor autenticado nao consegue atualizar (RLS simulada)', async () => {
  const client = criarBancoFake({ autorizado: false, papel: 'leitor' });
  const { items } = parseFaturamentoErpAntigo(arquivoFaturamento);

  await assert.rejects(
    atualizarMotor({
      client,
      motor: 'movimentacoes',
      fonteChave: 'erp_antigo_379_25',
      hashArquivo: 'h',
      nomeArquivo: '379_25_DEMO.txt',
      linhas: items,
    }),
    /permissao/,
  );

  const { slots, versoes, dados } = client._inspecionar();
  assert.equal(slots.length, 0);
  assert.equal(versoes.length, 0);
  assert.equal(dados.length, 0);
});
