import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { tabs, subtabs, nextIndex, preferredTheme } from '../src/shell-state.js';

const main=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
const css=await readFile(new URL('../src/style.css',import.meta.url),'utf8');
test('ordem das áreas e subabas do Sell out',()=>{
  assert.deepEqual(tabs.map(tab=>tab.label),['Sell out','Estoque','Clientes','Campanhas']);
  assert.deepEqual(subtabs.sellout,['Painel','Gerencial','Clientes']);
  assert.ok(tabs.every(tab=>subtabs[tab.id].length>0));
});
test('setas, Home e End percorrem abas com retorno circular',()=>{
  assert.equal(nextIndex(0,'ArrowRight',4),1);
  assert.equal(nextIndex(0,'ArrowDown',4),1);
  assert.equal(nextIndex(0,'ArrowUp',4),3);
  assert.equal(nextIndex(0,'ArrowLeft',4),3);
  assert.equal(nextIndex(3,'ArrowRight',4),0);
  assert.equal(nextIndex(2,'Home',4),0);
  assert.equal(nextIndex(1,'End',4),3);
});
test('preferência do tema respeita escolha salva e sistema',()=>{
  assert.equal(preferredTheme('dark',false),'dark');
  assert.equal(preferredTheme('light',true),'light');
  assert.equal(preferredTheme(null,true),'dark');
  assert.equal(preferredTheme(null,false),'light');
});
test('shell mantém estados vazios e controles acessíveis',()=>{
  assert.match(main,/role="tablist"/);
  assert.match(main,/aria-orientation="vertical"/);
  assert.match(main,/bindTablist\('\.side-nav'[^;]*true\)/);
  assert.match(main,/aria-selected/);
  assert.match(main,/role="menu"/);
  assert.match(main,/role="switch"/);
  assert.match(main,/aria-label="Tema escuro"/);
  assert.match(main,/Sem dados disponíveis/);
  assert.match(main,/Carregando informações/);
  assert.match(main,/Não foi possível carregar/);
  assert.doesNotMatch(main,/R\$\s*\d/);
});
test('layout desloca conteúdo e respeita movimento reduzido',()=>{
  assert.match(css,/\.shell\.sidebar-open \.workspace\{margin-left:232px\}/);
  assert.match(css,/\.shell\.drawer-open \.sidebar\{transform:translateX\(0\)\}/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
