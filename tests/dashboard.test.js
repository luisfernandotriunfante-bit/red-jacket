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

test('uploads mostra cinco cartões sem slots fictícios',()=>{assert.match(main,/uploadGroups=\['Histórico','Movimentações','Clientes','Produtos','Chegada de NFs'\]/);assert.match(main,/uploadGroups\.map\(uploadCard\)/);assert.doesNotMatch(main,/historySlots|history-row|ERP anterior|ERP atual/);assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);assert.match(css,/@media\(max-width:700px\)\{\.settings-content\{grid-template-columns:1fr/)});
test('datas e exportações só aparecem com dados reais',()=>{assert.match(main,/Sem atualização registrada/);assert.doesNotMatch(main,/lastModified|new Date|fetch\(|firebase/);assert.match(main,/disabled aria-describedby="unavailable-/);assert.match(main,/Disponível após processamento real/);assert.match(main,/Excel/);assert.match(main,/JSON/)});
test('seleção é local e substituição requer confirmação',()=>{assert.match(main,/localFiles\.set\(id,input\.files\[0\]\)/);assert.match(main,/window\.confirm\('Substituir arquivo de /);assert.match(main,/selecionado nesta sessão/)});

test('ponteiro estabiliza a sidebar antes da troca de subaba',()=>{assert.match(main,/source==='side'&&!state\.keyboard/);assert.match(main,/\.canvas'\)\.focus\(\);openSidebar\(false\)/)});
test('Auditoria mantém painel vazio sem exportação fictícia',()=>{assert.match(main,/canvas\.innerHTML='<section class="audit-view" aria-label="Inconsistências"><\/section>'/);assert.doesNotMatch(main,/class="audit-view"[^']*<(?:button|a)/)});

test('atualização permanece indisponível até existir integração real',()=>{assert.match(main,/Atualizar todos<\/button>/);assert.match(main,/Atualizar<\/button>/);assert.match(main,/disabled aria-describedby="integration-/);assert.match(main,/Disponível após integração/);assert.doesNotMatch(main,/supabase\.from|createClient|setTimeout\(|Promise\.resolve/)});
