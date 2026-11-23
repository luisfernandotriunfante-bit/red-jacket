import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  normalizarLinhasVendas,
  lerPlanilhaVendas,
} from '../../../src/motors/movimentacoes/parse-vendas-erp-atual.js';

// Cabeçalho e uma linha de dados extraídos literalmente (via leitura local
// read-only, nenhum dado real — amostra DEMO) do arquivo
// 992ca97f-vendas-8022_DEMO.xls, para testar a normalização sem precisar
// de um arquivo binário .xls como fixture.
const CABECALHO = [
  'FILIAL', 'FORNECEDOR', 'DATA MOVIMENTO', 'COD. CLIENTE', 'NOME CLIENTE', 'CNPJ/CPF CLIENTE',
  'SEGMENTO ATUACAO/CNAE', 'CIDADE', 'CEP', 'UF', 'NUMERO PED. WINTHOR', 'NUMERO PED. RCA',
  'DATA EMISSAO NF', 'NUMERO NOTA FISCAL', 'ORIGEM PEDIDO', 'STATUS PEDIDO', 'STATUS BLOQUEIO',
  'COD. VENDEDOR', 'VENDEDOR', 'COD. SUPERVISOR', 'SUPERVISOR', 'CODIGO FABRICANTE',
  'EAN PRODUTO', 'EAN CADASTRO', 'CODPROD. WINTHOR', 'DESCRICAO PRODUTO', 'CAIXAS VENDIDAS',
  'UNIDADES VENDIDAS', 'PESO BRUTO KG', 'PESO LIQUIDO KG', 'PESO T', 'SITUACAO PESO',
  'VALOR MERCADORIA R$', 'VALOR NOTA R$', 'TIPO VENDA', 'TIPO',
];

const LINHA_REAL = [
  '11', 17770.0, 46297.0, 90001.0, 'CLIENTE DEMO 001 LTDA', '00000001000136',
  'AS-VIZINHANCA-5 a 9CK-5CK', 'CIDADE DEMO 01', '79000001', 'MS', 1000000001.0, 1000000001.0,
  46297.0, 100001.0, 'SEM PEDIDO / DIGITACAO INTERNA', 'FATURADO', 'FATURADO', 1063.0,
  'VENDEDOR DEMO 01', 58.0, 'SUPERVISOR DEMO 01', '00000001', 32000000000015.0, 2000000000022.0,
  501.0, 'PRODUTO DEMO 0002......................01X 02UN', 1.0, 12.0, 0.53, 0.3, 0.001, 'OK',
  166.88, 169.68, 'VENDA', '1 - VENDA',
];

test('normaliza uma linha real da amostra, convertendo as datas seriais do Excel', () => {
  const [registro] = normalizarLinhasVendas([CABECALHO, LINHA_REAL]);

  assert.equal(registro.filial, '11');
  assert.equal(registro.fornecedor, 17770);
  assert.equal(registro.codCliente, 90001);
  assert.equal(registro.nomeCliente, 'CLIENTE DEMO 001 LTDA');
  assert.equal(registro.cnpjCpfCliente, '00000001000136');
  assert.equal(registro.cidade, 'CIDADE DEMO 01');
  assert.equal(registro.uf, 'MS');
  assert.equal(registro.numeroNotaFiscal, 100001);
  assert.equal(registro.origemPedido, 'SEM PEDIDO / DIGITACAO INTERNA');
  assert.equal(registro.statusPedido, 'FATURADO');
  assert.equal(registro.vendedor, 'VENDEDOR DEMO 01');
  assert.equal(registro.descricaoProduto, 'PRODUTO DEMO 0002......................01X 02UN');
  assert.equal(registro.caixasVendidas, 1);
  assert.equal(registro.unidadesVendidas, 12);
  assert.equal(registro.pesoBrutoKg, 0.53);
  assert.equal(registro.valorMercadoria, 166.88);
  assert.equal(registro.valorNota, 169.68);
  assert.equal(registro.tipoVenda, 'VENDA');

  // serial Excel 46297 (epoch 1899-12-30) corresponde a 2026-10-02
  assert.equal(registro.dataMovimento, '2026-10-02');
  assert.equal(registro.dataEmissaoNf, '2026-10-02');
});

test('ignora a linha de cabeçalho e linhas vazias', () => {
  const registros = normalizarLinhasVendas([CABECALHO, LINHA_REAL, [], LINHA_REAL]);
  assert.equal(registros.length, 2);
});

test('campo de data ausente/vazio não lança erro, retorna null', () => {
  const linhaSemData = [...LINHA_REAL];
  linhaSemData[2] = '';
  const [registro] = normalizarLinhasVendas([CABECALHO, linhaSemData]);
  assert.equal(registro.dataMovimento, null);
});

test('array vazio (só cabeçalho, ou nada) não lança erro', () => {
  assert.deepEqual(normalizarLinhasVendas([CABECALHO]), []);
  assert.deepEqual(normalizarLinhasVendas([]), []);
});

// Fixture binária real: cabeçalho + 3 linhas de dados extraídas do .xls
// real 992ca97f-vendas-8022_DEMO.xls (BIFF8), re-salvo em escala reduzida
// e transportado como texto base64 (a API de conteúdo do GitHub não
// transporta bytes binários arbitrários de forma confiável como texto
// UTF-8 — ver docs/contratos/supabase-persistencia-motores.md).
test('lerPlanilhaVendas decodifica o .xls real (BIFF8) via xls-reader', () => {
  const base64 = readFileSync(
    new URL('../../fixtures/vendas-erp-atual-demo.xls.b64.txt', import.meta.url),
    'utf-8',
  ).trim();
  const bytes = Buffer.from(base64, 'base64');

  const linhasBrutas = lerPlanilhaVendas(bytes);
  assert.equal(linhasBrutas.length, 4); // cabeçalho + 3 linhas reais
  assert.deepEqual(linhasBrutas[0], CABECALHO);
  assert.deepEqual(linhasBrutas[1], LINHA_REAL);

  const registros = normalizarLinhasVendas(linhasBrutas);
  assert.equal(registros.length, 3);
  assert.equal(registros[0].nomeCliente, 'CLIENTE DEMO 001 LTDA');
  assert.equal(registros[0].dataMovimento, '2026-10-02');
  assert.equal(registros[2].descricaoProduto, 'PRODUTO DEMO 0006......................01X 03UN');
});
