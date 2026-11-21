import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source=(await readFile(new URL('../src/main.js',import.meta.url),'utf8')).replace(/^import '\.\/style\.css';/,'');
class FakeElement {
  constructor(attrs={},kind=''){this.attrs=attrs;this.kind=kind;this.dataset={section:attrs['data-section']};this.value=attrs.value||'';this.events={};this.textContent='';}
  addEventListener(type,fn){(this.events[type]??=[]).push(fn)}
  dispatch(type){for(const fn of this.events[type]||[])fn({target:this,type})}
  click(){this.dispatch('click')}
  focus(){globalThis.document.activeElement=this}
  closest(selector){return selector==='.mobile-nav'&&this.kind==='mobile'?this:null}
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
      let itemKind=kind;
      if(['prev-page','next-page','clear-filters','retry'].includes(attrs.id))itemKind='table';
      if(attrs['data-section'])itemKind=html.slice(0,match.index).lastIndexOf('class="mobile-nav"')>html.slice(0,match.index).lastIndexOf('class="sidebar"')?'mobile':'sidebar';
      elements.push(new FakeElement(attrs,itemKind));
    }
    return elements;
  }
  const region={html:'',set innerHTML(html){this.html=html;doc.all=doc.all.filter(e=>e.kind!=='table');doc.all.push(...parse(html,'table'))},get innerHTML(){return this.html}};
  const app={html:'',set innerHTML(html){this.html=html;doc.all=parse(html);doc.all.push(new FakeElement({id:'table-region'}));const table=doc.querySelector('#table-region');table.__proto__=region;table.innerHTML=html.split('<div id="table-region">')[1]?.split('</section><footer>')[0]||''},get innerHTML(){return this.html}};
  globalThis.document=doc;
  globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
  globalThis.matchMedia=()=>({matches:false});
  return{doc,app,storage};
}
async function boot(saved=null){const env=setup(saved);await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(source)+'#'+Math.random());return env}
test('quatro seções e tema persistido',async()=>{
  const env=await boot();
  for(const id of ['sales','products','clients','overview']){
    env.doc.querySelectorAll('[data-section]').find(e=>e.kind==='sidebar'&&e.dataset.section===id).click();
    assert.equal(env.doc.querySelector('.sidebar .is-active').dataset.section,id);
    assert.equal(env.doc.activeElement.dataset.section,id);
  }
  env.doc.querySelector('#theme-toggle').click();
  assert.equal(env.doc.documentElement.dataset.theme,'dark');
  assert.equal(env.storage.get('red-jacket-theme'),'dark');
  assert.equal((await boot('dark')).doc.documentElement.dataset.theme,'dark');
});
test('período altera gráfico e filtros oferecem estado vazio',async()=>{
  const{doc,app}=await boot();
  const period=doc.querySelector('#period-select');period.value='month';period.dispatch('change');
  assert.match(app.innerHTML,/Últimos 30 dias/);
  assert.match(app.innerHTML,/Sem 4: atual 74/);
  const search=doc.querySelector('#search');search.value='inexistente';search.dispatch('input');
  assert.match(doc.querySelector('#table-region').innerHTML,/Nenhum resultado encontrado/);
});
test('tabela fictícia tem paginação e cartões mobile',async()=>{
  const{doc,app}=await boot();
  assert.match(app.innerHTML,/class="mobile-records"/);
  assert.match(app.innerHTML,/DADOS FICTÍCIOS/);
  assert.match(doc.querySelector('#table-region').innerHTML,/Página 1 de 2/);
  doc.querySelector('#next-page').click();
  assert.match(doc.querySelector('#table-region').innerHTML,/Página 2 de 2/);
  assert.doesNotMatch(app.innerHTML,/type="password"/);
});
