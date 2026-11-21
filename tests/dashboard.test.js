import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {tabs,subtabs,nextIndex,preferredTheme} from '../src/shell-state.js';

const main=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
const css=await readFile(new URL('../src/style.css',import.meta.url),'utf8');
test('ordem principal e subabas de Sell out',()=>{
  assert.deepEqual(tabs.map(t=>t.label),['Sell out','Estoque','Clientes','Campanhas','Configurações']);
  assert.deepEqual(subtabs.sellout,['Painel','Gerencial','Clientes']);
  assert.ok(tabs.every(t=>subtabs[t.id].length>0));
  assert.deepEqual(subtabs.settings,['Uploads','Auditoria']);
});
test('teclado de abas verticais e horizontais',()=>{
  assert.equal(nextIndex(0,'ArrowDown',5,true),1);
  assert.equal(nextIndex(0,'ArrowUp',5,true),4);
  assert.equal(nextIndex(4,'ArrowDown',5,true),0);
  assert.equal(nextIndex(1,'Home',5,true),0);
  assert.equal(nextIndex(1,'End',5,true),4);
  assert.equal(nextIndex(0,'ArrowRight',3,false),1);
  assert.equal(nextIndex(0,'ArrowLeft',3,false),2);
  assert.equal(nextIndex(0,'ArrowDown',3,false),0);
});
test('tema usa escolha persistida ou preferência do sistema',()=>{
  assert.equal(preferredTheme('dark',false),'dark');
  assert.equal(preferredTheme('light',true),'light');
  assert.equal(preferredTheme(null,true),'dark');
  assert.equal(preferredTheme(null,false),'light');
});
test('shell mantém canvas vazio fora de Configurações',()=>{
  assert.match(main,/aria-orientation="vertical"/);
  assert.match(main,/role="menu"/);
  assert.match(main,/role="switch"/);
  assert.match(main,/class="canvas" role="tabpanel"/);
  assert.match(main,/aria-label="Tema escuro"/);
  assert.doesNotMatch(main,/expand-trigger|Expandir menu/);
  assert.match(main,/<div class="subtab-items"><span class="tab-indicator"/);
  assert.doesNotMatch(main,/class="notice"|Disponível após configurar autenticação/);
  assert.doesNotMatch(main,/<(?:h1|h3|table|progress)\b/);
  assert.doesNotMatch(main,/R\$\s*\d/);
});
test('layout desloca canvas e respeita movimento reduzido',()=>{
  assert.match(css,/\.shell\.sidebar-open \.workspace\{margin-left:232px\}/);
  assert.match(css,/\.shell\.drawer-open \.sidebar\{transform:translateX\(0\)\}/);
  assert.match(css,/\.main-tab\[aria-selected=true\] svg[^}]+animation:tab-in 420ms/);
  assert.match(css,/\.subtabs\.entering \.subtab-items button\{animation:tab-in 420ms/);
  assert.match(css,/\.tab-indicator\{position:absolute;z-index:2/);
  assert.doesNotMatch(css,/\.subtab-items button:hover\{background:var\(--hover\)/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.match(css,/--bg:#000/);
  assert.match(css,/--accent:#FF0000/);
  assert.match(css,/--accent:#0000FF/);
});

test('uploads locais têm somente os grupos e slots pedidos',()=>{assert.match(main,/historySlots=\['Movimentações antigas 1','Movimentações antigas 2','Movimentações antigas 3','ERP anterior 1','ERP anterior 2','ERP atual — meses passados','De-para'\]/);assert.match(main,/uploadGroups=\['Movimentações','Clientes','Produtos','Chegada de NFs'\]/);assert.match(main,/type="file" data-upload/);assert.match(main,/input\.files\.length/);assert.doesNotMatch(main,/fetch\(|firebase|localStorage\.setItem\('red-jacket-upload/)});
test('auditoria não mostra dados ou exportação fictícios',()=>{assert.match(main,/class="audit-view" aria-label="Inconsistências"/);assert.doesNotMatch(main,/Exportar IA|Baixar CSV|inconsistências encontradas/)});
