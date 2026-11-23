import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseFaturamentoErpAntigo } from '../../../src/motors/movimentacoes/parse-faturamento-erp-antigo.js';
import { normalizarLinhasVendas, lerPlanilhaVendas } from '../../../src/motors/movimentacoes/parse-vendas-erp-atual.js';
import {
  normalizarRegistro,
  dataParaIso,
  identificarOrigem,
  contarRepeticoesEntreFontes,
} from '../../../src/motors/movimentacoes/registro-canonico.js';

const fixtureFaturamento = readFileSync(
  new URL('../../fixtures/faturamento-erp-antigo-demo.txt', import.meta.url),
  'utf8',
);

function registrosVendas() {
  const base64 = readFileSync(
    new URL('../../fixtures/vendas-erp-atual-demo.xls.b64.txt', import.meta.url),
    'utf8',
  ).trim();
  return normalizarLinhasVendas(lerPlanilhaVendas(Buffer.from(base64, 'base64')));
}

test('dataParaIso converte dd/mm/aaaa e preserva ISO; invalida vira null', () => {
  assert.equal(dataParaIso('06/01/2025'), '2025-01-06');
  assert.equal(dataParaIso('2026-10-02'), '2026-10-02');
  assert.equal(dataParaIso(''), null);
  assert.equal(dataParaIso('31/13/2025'), null);
});

test('identificarOrigem distingue os dois formatos e rejeita objeto desconhecido', () => {
  assert.equal(identificarOrigem({ notaFiscal: '1', item: '2' }), 'erp_antigo');
  assert.equal(identificarOrigem({ numeroNotaFiscal: 1, descricaoProduto: 'X' }), 'erp_atual');
  assert.equal(identificarOrigem({ qualquer: 'coisa' }), null);
  assert.equal(identificarOrigem(null), null);
});

test('normaliza item do relatorio do ERP antigo em registro canonico', () => {
  const { items } = parseFaturamentoErpAntigo(fixtureFaturamento);
  const registro = normalizarRegistro(items[0], { fonteChave: 'erp_antigo_379_25' });

  assert.equal(registro.fonte, 'erp_antigo_379_25');
  assert.equal(registro.origem, 'erp_antigo');
  assert.equal(registro.tipo, 'faturamento');
  assert.equal(registro.data, '2025-01-06');
  assert.equal(registro.documento, '1494001');
  assert.equal(registro.serie, null);
  assert.equal(registro.item, '90000358');
  assert.equal(registro.codigoProduto, '2000000004136');
  assert.equal(registro.cliente, '000000002000180');
  assert.equal(registro.quantidade, 6);
  assert.equal(registro.valor, 76.81);
  assert.equal(registro.cfop, '13201');
  assert.ok(registro.chaveRegistro.includes('erp_antigo_379_25'));
});

test('normaliza linha da planilha do ERP atual em registro canonico', () => {
  const [linha] = registrosVendas();
  const registro = normalizarRegistro(linha, { fonteChave: 'erp_atual_vendas_8022' });

  assert.equal(registro.origem, 'erp_atual');
  assert.equal(registro.tipo, 'venda');
  assert.equal(registro.data, '2026-10-02');
  assert.equal(registro.documento, '100001');
  assert.equal(registro.cliente, '90001');
  assert.equal(registro.clienteNome, 'CLIENTE DEMO 001 LTDA');
  assert.equal(registro.produto.startsWith('PRODUTO DEMO 0002'), true);
  assert.equal(registro.quantidade, 12);
  assert.equal(registro.valor, 169.68);
  assert.equal(registro.vendedor, 'VENDEDOR DEMO 01');
  assert.equal(registro.uf, 'MS');
});

test('payload desconhecido nao vira registro inventado', () => {
  assert.equal(normalizarRegistro({ foo: 'bar' }), null);
});

test('conta registros repetidos entre fontes sem remove-los', () => {
  const registros = [
    { fonte: 'a', documento: '1', serie: null, item: '1', codigoProduto: '9', data: '2026-01-01', valor: 10 },
    { fonte: 'b', documento: '1', serie: null, item: '1', codigoProduto: '9', data: '2026-01-01', valor: 10 },
    { fonte: 'a', documento: '2', serie: null, item: '2', codigoProduto: '8', data: '2026-01-02', valor: 20 },
  ];
  const resultado = contarRepeticoesEntreFontes(registros);
  assert.equal(resultado.registrosEmMaisDeUmaFonte, 2);
  assert.equal(resultado.chaves.length, 1);
});
