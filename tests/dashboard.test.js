import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {tabs,subtabs,nextIndex,preferredTheme} from '../src/shell-state.js';

const main=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
const css=await readFile(new URL('../src/style.css',import.meta.url),'utf8');
test('ordem principal e subabas de Sell out',()=>{
  assert.deepEqual(tabs.map(t=>t.label),['Sell out','Estoque','Clientes','Campanhas']);
  assert.deepEqual(subtabs.sellout,['Painel','Gerencial','Clientes']);
  assert.ok(tabs.every(t=>subtabs[t.id].length>0));
});
test('teclado de abas verticais e horizontais',()=>{
  assert.equal(nextIndex(0,'ArrowDown',4,true),1);
  assert.equal(nextIndex(0,'ArrowUp',4,true),3);
  assert.equal(nextIndex(3,'ArrowDown',4,true),0);
  assert.equal(nextIndex(1,'Home',4,true),0);
  assert.equal(nextIndex(1,'End',4,true),3);
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
test('shell contém só navegação e canvas vazio',()=>{
  assert.match(main,/aria-orientation="vertical"/);
  assert.match(main,/role="menu"/);
  assert.match(main,/role="switch"/);
  assert.match(main,/class="canvas" role="tabpanel"/);
  assert.match(main,/aria-label="Tema escuro"/);
  assert.doesNotMatch(main,/<(?:h1|h2|h3|table|progress)\b/);
  assert.doesNotMatch(main,/R\$\s*\d/);
});
test('layout desloca canvas e respeita movimento reduzido',()=>{
  assert.match(css,/\.shell\.sidebar-open \.workspace\{margin-left:232px\}/);
  assert.match(css,/\.shell\.drawer-open \.sidebar\{transform:translateX\(0\)\}/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.match(css,/--bg:#000/);
});
