import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizarCelulaExcel, gerarJson } from '../../src/lib/export-motor.js';

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

test('gerarJson não sanitiza — mantém o valor original mesmo começando com "="', async () => {
  const linhas = [{ nome: '=SOMA(A1:A2)', valor: 10.5 }];
  const blob = gerarJson(linhas);
  const texto = await blob.text();
  const lido = JSON.parse(texto);

  assert.equal(lido[0].nome, '=SOMA(A1:A2)'); // sem apóstrofo — JSON nunca sanitiza
  assert.equal(lido[0].valor, 10.5);
});
