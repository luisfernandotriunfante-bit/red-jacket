import { test } from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { sanitizarCelulaExcel, gerarExcel, gerarJson } from '../../src/lib/export-motor.js';

test('sanitizarCelulaExcel prefixa com apóstrofo valores que começam com caractere de fórmula', () => {
  assert.equal(sanitizarCelulaExcel('=SOMA(A1:A2)'), "'=SOMA(A1:A2)");
  assert.equal(sanitizarCelulaExcel('+5519999999'), "'+5519999999");
  assert.equal(sanitizarCelulaExcel('-1+1'), "'-1+1");
  assert.equal(sanitizarCelulaExcel('@mencao'), "'@mencao");
});

test('sanitizarCelulaExcel não altera texto normal, número, boolean ou null', () => {
  assert.equal(sanitizarCelulaExcel('CLIENTE DEMO 001'), 'CLIENTE DEMO 001');
  assert.equal(sanitizarCelulaExcel(123.45), 123.45);
  assert.equal(sanitizarCelulaExcel(true), true);
  assert.equal(sanitizarCelulaExcel(null), null);
  assert.equal(sanitizarCelulaExcel(''), '');
});

test('gerarExcel sanitiza texto de risco mas preserva números (round-trip real via exceljs)', async () => {
  const linhas = [
    { nome: '=HYPERLINK("http://evil")', valor: 10.5 },
    { nome: 'Cliente Normal', valor: -3.2 },
  ];
  const blob = await gerarExcel(linhas, 'Teste');
  const arrayBuffer = await blob.arrayBuffer();

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);
  const planilha = workbook.getWorksheet('Teste');

  // row.values é 1-indexado (posição 0 é sempre null)
  const [, nome1, valor1] = planilha.getRow(2).values;
  const [, nome2, valor2] = planilha.getRow(3).values;

  assert.equal(nome1, "'=HYPERLINK(\"http://evil\")");
  assert.equal(valor1, 10.5); // número não sanitizado nem corrompido
  assert.equal(nome2, 'Cliente Normal');
  assert.equal(valor2, -3.2); // número negativo não é string, não sanitiza
});

test('gerarExcel com lista vazia não lança erro e gera planilha sem linhas de dados', async () => {
  const blob = await gerarExcel([], 'Vazio');
  const arrayBuffer = await blob.arrayBuffer();

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);
  const planilha = workbook.getWorksheet('Vazio');

  assert.equal(planilha.rowCount, 0);
});

test('gerarJson não sanitiza — mantém o valor original mesmo começando com "="', async () => {
  const linhas = [{ nome: '=SOMA(A1:A2)', valor: 10.5 }];
  const blob = gerarJson(linhas);
  const texto = await blob.text();
  const lido = JSON.parse(texto);

  assert.equal(lido[0].nome, '=SOMA(A1:A2)'); // sem apóstrofo — JSON nunca sanitiza
  assert.equal(lido[0].valor, 10.5);
});
