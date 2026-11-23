import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
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

test('gerarExcel sanitiza texto de risco mas preserva números (round-trip real via xlsx)', async () => {
  const linhas = [
    { nome: '=HYPERLINK("http://evil")', valor: 10.5, ativo: true },
    { nome: 'Cliente Normal', valor: -3.2, ativo: false },
  ];
  const blob = gerarExcel(linhas, 'Teste');
  const arrayBuffer = await blob.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const planilha = workbook.Sheets['Teste'];
  const linhasLidas = XLSX.utils.sheet_to_json(planilha);

  assert.equal(linhasLidas[0].nome, "'=HYPERLINK(\"http://evil\")");
  assert.equal(linhasLidas[0].valor, 10.5); // número não sanitizado nem corrompido
  assert.equal(linhasLidas[1].nome, 'Cliente Normal');
  assert.equal(linhasLidas[1].valor, -3.2); // número negativo não é string, não sanitiza
});

test('gerarJson não sanitiza — mantém o valor original mesmo começando com "="', async () => {
  const linhas = [{ nome: '=SOMA(A1:A2)', valor: 10.5 }];
  const blob = gerarJson(linhas);
  const texto = await blob.text();
  const lido = JSON.parse(texto);

  assert.equal(lido[0].nome, '=SOMA(A1:A2)'); // sem apóstrofo — JSON nunca sanitiza
  assert.equal(lido[0].valor, 10.5);
});
