import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseFaturamentoErpAntigo } from '../../../src/motors/movimentacoes/parse-faturamento-erp-antigo.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(__dirname, '..', '..', 'fixtures', 'faturamento-erp-antigo-demo.txt');
const fixture = readFileSync(fixturePath, 'utf8');

test('reconhece todos os itens do recorte de amostra, sem discrepâncias', () => {
  const { items, discrepancies } = parseFaturamentoErpAntigo(fixture);
  assert.equal(items.length, 68);
  assert.equal(discrepancies.length, 0);
});

test('extrai corretamente os campos do primeiro item (sem série, sem carga)', () => {
  const { items } = parseFaturamentoErpAntigo(fixture);
  const first = items[0];
  assert.equal(first.data, '06/01/2025');
  assert.equal(first.notaSerie, null);
  assert.equal(first.notaFiscal, '1494001');
  assert.equal(first.item, '90000358');
  assert.equal(first.quantidade, 6);
  assert.equal(first.valor, 76.81);
  assert.equal(first.desconto, 3.9);
  assert.equal(first.operCfop, '13201');
  assert.equal(first.pedido, '1411');
  assert.equal(first.fornecedor, '000000001000136');
  assert.equal(first.cliente, '000000002000180');
  assert.equal(first.rpc, '0701');
  assert.equal(first.pesoLiquidoKg, 2.14);
  assert.equal(first.pesoBrutoKg, 2.35);
  assert.equal(first.cidade, 'CIDADE DEMO 62');
  assert.equal(first.coord, '908');
  assert.equal(first.rede, '58');
  assert.equal(first.ramo, 'A35');
  assert.equal(first.quantidadePorCaixa, 6);
  assert.equal(first.eanComercial, '2000000004136');
  assert.equal(first.icms, 12.6);
  assert.equal(first.icmsSt, 2.71);
  assert.equal(first.carga, '');
});

test('reconhece série da nota fiscal quando presente ("1  1500001" -> série 1, nota 1500001)', () => {
  const { items } = parseFaturamentoErpAntigo(fixture);
  const comSerie = items.find((i) => i.notaFiscal === '1500001');
  assert.ok(comSerie, 'item com nota 1500001 não encontrado');
  assert.equal(comSerie.notaSerie, '1');
});

test('captura o campo Carga quando preenchido (valor real observado na amostra)', () => {
  const { items } = parseFaturamentoErpAntigo(fixture);
  const comCarga = items.find((i) => i.carga !== '' && i.carga !== null);
  assert.ok(comCarga, 'nenhum item com carga preenchida encontrado no fixture');
  assert.equal(comCarga.carga, '99999999999');
  assert.equal(comCarga.data, '18/02/2025');
  assert.equal(comCarga.notaSerie, '7');
  assert.equal(comCarga.notaFiscal, '3111002');
  assert.equal(comCarga.fornecedor, '000000001000136');
});

test('aceita conteúdo vazio sem lançar erro', () => {
  const { items, discrepancies, totalLinhasNaoVazias } = parseFaturamentoErpAntigo('');
  assert.equal(items.length, 0);
  assert.equal(discrepancies.length, 0);
  assert.equal(totalLinhasNaoVazias, 0);
});

test('linha de cabeçalho/separador/rodapé não gera discrepância', () => {
  const { discrepancies, totalLinhasReconhecidas, items } = parseFaturamentoErpAntigo(fixture);
  assert.equal(discrepancies.length, 0);
  assert.equal(totalLinhasReconhecidas, items.length);
});
