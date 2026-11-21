import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source=(await readFile(new URL('../src/main.js',import.meta.url),'utf8')).replace(/^import '\.\/style\.css';/,'');
const css=await readFile(new URL('../src/style.css',import.meta.url),'utf8');
class FakeElement {
  constructor(attrs={},kind='',onHtml=null){this.attrs=attrs;this.kind=kind;this.dataset={section:attrs['data-section']};this.value=attrs.value||'';this.events={};this.disabled=attrs.disabled===true;this.onHtml=onHtml;this.html='';}
  addEventListener(type,fn){(this.events[type]??=[]).push(fn)}
  dispatch(type){for(const fn of this.events[type]||[])fn({target:this,type})}
  click(){if(!this.disabled)this.dispatch('click')}
  focus(){if(!this.disabled)globalThis.document.activeElement=this}
  closest(selector){return selector==='.mobile-nav'&&this.kind==='mobile'?this:null}
  getAttribute(name){return this.attrs[name]??null}
  set innerHTML(value){this.html=value;this.onHtml?.(value)}
  get innerHTML(){return this.html}
}
function setup(saved=null) {
  const storage=new Map(saved?[['red-jacket-theme',saved]]:[]);
  const doc={documentElement:{dataset:{}},activeElement:null,all:[],querySelector(selector){
    if(selector==='#app')return app;
    if(selector==='.mobile-nav .is-active')return this.all.find(e=>e.kind==='mobile'&&e.attrs.class?.includes('is-active'));
    if(selector==='.sidebar .is-active')return this.all.find(e=>e.kind==='sidebar'&&e.attrs.class?.includes('is-active'));
    return this.all.find(e=>e.attrs.id===selector.slice(1))||null;
  },querySelectorAll(selector){return selector==='[data-section]'?this.all.filter(e=>e.attrs['data-section']):[]}};
  function parse(html,kind='') {
    const elements=[];
    for(const match of html.matchAll(/<(button|input|select)\b([^>]*)>/g)){
      const attrs=Object.fromEntries([...match[2].matchAll(/([\w-]+)="([^"]*)"/g)].map(([,k,v])=>[k,v]));
      if(/\sdisabled(?:\s|$)/.test(match[2]))attrs.disabled=true;
      let itemKind=kind;
      if(['prev-page','next-page','clear-filters'].includes(attrs.id))itemKind='table';
      if(attrs['data-section'])itemKind=html.slice(0,match.index).lastIndexOf('class="mobile-nav"')>html.slice(0,match.index).lastIndexOf('class="sidebar"')?'mobile':'sidebar';
      elements.push(new FakeElement(attrs,itemKind));
    }
    return elements;
  }
  const app=new FakeElement({id:'app'},'app',html=>{
    doc.all=parse(html);
    const table=new FakeElement({id:'table-region'},'region',value=>{
      doc.all=doc.all.filter(el=>el.kind!=='table');
      doc.all.push(...parse(value,'table'));
    });
    doc.all.push(table);
    table.innerHTML=html.split(/<div id="table-region"[^>]*>/)[1]?.split('</section><footer>')[0]||'';
  });
  globalThis.document=doc;
  globalThis.localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)};
  globalThis.matchMedia=()=>({matches:false});
  return{doc,app,storage};
}
async function boot(saved=null){const env=setup(saved);await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(source)+'#'+Math.random());return env}
test('navegação das quatro seções e foco da sidebar',async()=>{
  const{doc,app}=await boot();
  for(const id of ['sales','products','clients','overview']){
    const link=doc.querySelectorAll('[data-section]').find(el=>el.kind==='sidebar'&&el.dataset.section===id);
    link.focus();assert.equal(doc.activeElement,link);
    link.click();assert.equal(doc.querySelector('.sidebar .is-active').dataset.section,id);
    assert.equal(doc.activeElement.dataset.section,id);
  }
  assert.match(css,/\.sidebar:hover \+ \.main-column/);
  assert.match(css,/\.sidebar:focus-within \+ \.main-column/);
  assert.match(css,/\.sidebar\{display:none\}.*\.mobile-nav\{display:flex/);
  assert.match(app.innerHTML,/DADOS FICTÍCIOS/);
});
test('tema tem rótulo fixo, estado e persistência',async()=>{
  const env=await boot();
  let toggle=env.doc.querySelector('#theme-toggle');
  assert.equal(toggle.getAttribute('aria-label'),'Tema escuro');
  assert.equal(toggle.getAttribute('aria-pressed'),'false');
  toggle.click();
  toggle=env.doc.querySelector('#theme-toggle');
  assert.equal(env.doc.documentElement.dataset.theme,'dark');
  assert.equal(toggle.getAttribute('aria-label'),'Tema escuro');
  assert.equal(toggle.getAttribute('aria-pressed'),'true');
  assert.equal(env.doc.activeElement,toggle);
  assert.equal(env.storage.get('red-jacket-theme'),'dark');
  assert.equal((await boot('dark')).doc.documentElement.dataset.theme,'dark');
});
test('período, categoria e busca filtram a demonstração',async()=>{
  const{doc,app}=await boot();
  const period=doc.querySelector('#period-select');period.value='month';period.dispatch('change');
  assert.match(app.innerHTML,/Últimos 30 dias/);
  assert.match(app.innerHTML,/Sem 4: atual 74/);
  const category=doc.querySelector('#category-select');category.value='Calçados';category.dispatch('change');
  assert.match(doc.querySelector('#table-region').innerHTML,/Tênis Urban/);
  assert.doesNotMatch(doc.querySelector('#table-region').innerHTML,/Jaqueta Essential/);
  const search=doc.querySelector('#search');search.value='inexistente';search.dispatch('input');
  assert.match(doc.querySelector('#table-region').innerHTML,/Nenhum resultado encontrado/);
});
test('paginação restaura foco na região e mobile tem cartões rotulados',async()=>{
  const{doc,app}=await boot();
  assert.match(app.innerHTML,/class="mobile-records"/);
  assert.match(doc.querySelector('#table-region').innerHTML,/Página 1 de 2/);
  doc.querySelector('#next-page').click();
  assert.match(doc.querySelector('#table-region').innerHTML,/Página 2 de 2/);
  assert.equal(doc.activeElement,doc.querySelector('#table-region'));
  doc.querySelector('#prev-page').click();
  assert.match(doc.querySelector('#table-region').innerHTML,/Página 1 de 2/);
  assert.equal(doc.activeElement,doc.querySelector('#table-region'));
  assert.doesNotMatch(app.innerHTML,/type="password"/);
});
