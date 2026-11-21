import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseCadastroErpAntigo } from '../../../src/motors/produtos/parse-cadastro-erp-antigo.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(__dirname, '..', '..', 'fixtures', 'erp-antigo-cadastro-demo.txt');
const fixture = readFileSync(fixturePath, 'utf8');

test('reconhece os 63 itens do recorte de amostra, sem discrepâncias', () => {
  const { items, discrepancies } = parseCadastroErpAntigo(fixture);
  assert.equal(items.length, 63);
  assert.equal(discrepancies.length, 0);
});

test('extrai corretamente os campos do primeiro item', () => {
  const { items } = parseCadastroErpAntigo(fixture);
  const first = items[0];
  assert.equal(first.codigo, '90000001');
  assert.equal(first.descricao, 'PRODUTO DEMO 0720...............01X500ML');
  assert.equal(first.unidadeMedida, '000');
  assert.equal(first.percentualComissao, 0);
  assert.equal(first.aceitaCaixaFracionada, false); // acx = 'Nao'
  assert.equal(first.disponivelMostruario, true); // dm = 'Sim'
  assert.equal(first.quantidadePorCaixa, 1);
  assert.equal(first.fatorConversao, 12);
  assert.equal(first.pesoLiquidoKg, 0.5);
  assert.equal(first.pesoBrutoKg, 0.55);
  assert.equal(first.classe, '0-Ven');
  assert.equal(first.codigoFornecedor, '00000397');
  assert.equal(first.codigoBarra, '2000000007205');
  assert.equal(first.aceitaTroca, false); // troca = 'Nao'
  assert.equal(first.paletizavel, true); // palm = 'SIM'
  assert.equal(first.multiplo, 3);
  assert.equal(first.categoriaCodigo, '1110');
  assert.equal(first.categoriaNome, 'CG LIMPEZA');
});

test('extrai corretamente os campos do último item do recorte', () => {
  const { items } = parseCadastroErpAntigo(fixture);
  const last = items[items.length - 1];
  assert.equal(last.codigo, '90000063');
  assert.equal(last.aceitaCaixaFracionada, true); // acx = 'Sim'
  assert.equal(last.diasValidadePaletizacao, 0);
  // a categoria "CG ORAL" só aparece DEPOIS do último item no recorte;
  // o último item ainda deve pertencer à categoria anterior.
  assert.equal(last.categoriaCodigo, '1110');
  assert.equal(last.categoriaNome, 'CG LIMPEZA');
});

test('não duplica a categoria quando ela se repete (o relatório imprime cada categoria duas vezes)', () => {
  const { items } = parseCadastroErpAntigo(fixture);
  const categoriasDistintas = new Set(items.map((item) => item.categoriaCodigo));
  assert.equal(categoriasDistintas.size, 1); // só "CG LIMPEZA" cobre itens neste recorte
});

test('ignora linhas de cabeçalho de página e separador sem gerar discrepância', () => {
  const { discrepancies, totalLinhasReconhecidas, items } = parseCadastroErpAntigo(fixture);
  assert.equal(discrepancies.length, 0);
  // 63 itens + 4 linhas de categoria (2 categorias, cada uma impressa 2x)
  assert.equal(totalLinhasReconhecidas, items.length + 4);
});

test('aceita conteúdo vazio sem lançar erro', () => {
  const { items, discrepancies, totalLinhasNaoVazias } = parseCadastroErpAntigo('');
  assert.equal(items.length, 0);
  assert.equal(discrepancies.length, 0);
  assert.equal(totalLinhasNaoVazias, 0);
});
