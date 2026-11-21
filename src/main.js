import './style.css';
import {tabs,subtabs,nextIndex,preferredTheme} from './shell-state.js';

const historySlots=['Movimentações antigas 1','Movimentações antigas 2','Movimentações antigas 3','ERP anterior 1','ERP anterior 2','ERP atual — meses passados','De-para'];
const uploadGroups=['Movimentações','Clientes','Produtos','Chegada de NFs'];
const localFiles=new Map();
const uploadField=(label,id,multiple=false)=>'<div class="upload-field"><span class="upload-label">'+label+'</span><label class="file-picker"><span>'+(multiple?'Adicionar arquivos':'Selecionar arquivo')+'</span><input type="file" data-upload="'+id+'" '+(multiple?'multiple':'')+' aria-label="'+label+'" /></label><span class="file-selection" data-selection="'+id+'">Nenhum arquivo selecionado</span></div>';
const uploadView=()=>'<div class="settings-content"><section class="upload-section" aria-labelledby="history-title"><h2 id="history-title">Histórico</h2><div class="history-grid">'+historySlots.map((label,i)=>uploadField(label,'history-'+i)).join('')+'</div></section>'+uploadGroups.map((label,i)=>'<section class="upload-section" aria-labelledby="group-'+i+'"><h2 id="group-'+i+'">'+label+'</h2>'+uploadField('Arquivos de '+label.toLowerCase(),'group-'+i,true)+'</section>').join('')+'</div>';
const paths={
  chart:'<path d="M4 19V7m5 12V4m5 15v-8m5 8V6"/>',
  box:'<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 10h16M10 10v10"/>',
  users:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6m1 3a5 5 0 0 1 3 5v1"/>',
  spark:'<path d="m12 3 2 7 7 2-7 2-2 7-2-7-7-2 7-2 2-7Z"/>',
  user:'<circle cx="12" cy="8" r="3.4"/><path d="M5 21a7 7 0 0 1 14 0"/>',
  menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
  close:'<path d="M5 5l14 14M19 5 5 19"/>',
  moon:'<path d="M20 16A8.5 8.5 0 0 1 8 4a8.5 8.5 0 1 0 12 12Z"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4m0-14.2-1.4 1.4M6.3 17.7l-1.4 1.4"/>',
  edit:'<path d="M4 20h4l11-11-4-4L4 16v4Zm9-13 4 4"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  exit:'<path d="M9 4H4v16h5m6-4 4-4-4-4m4 4H9"/>'
};
const icon=name=>'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+paths[name]+'</svg>';
const app=document.querySelector('#app');
const stored=(()=>{try{return localStorage.getItem('red-jacket-theme')}catch{return null}})();
const state={main:0,sub:0,theme:preferredTheme(stored,matchMedia('(prefers-color-scheme: dark)').matches),sidebarOpen:false,drawer:false,profile:false,keyboard:false};
document.documentElement.dataset.theme=state.theme;
app.innerHTML='<div class="shell"><aside class="sidebar" aria-label="Navegação principal"><div class="sidebar-top"><button class="round profile-trigger" type="button" aria-label="Perfil" aria-haspopup="menu" aria-expanded="false" aria-controls="profile-menu" title="Perfil">'+icon('user')+'</button><div id="profile-menu" class="profile-menu" role="menu" aria-label="Perfil"><button role="menuitem" type="button" data-profile="edit">'+icon('edit')+'Editar perfil</button><button role="menuitem" type="button" data-profile="exit">'+icon('exit')+'Sair</button></div></div><nav id="main-tabs" class="main-tabs" role="tablist" aria-orientation="vertical" aria-label="Áreas principais">'+tabs.map((tab,i)=>'<button class="main-tab '+(i===0?'active':'')+'" type="button" role="tab" data-main="'+i+'" aria-selected="'+(i===0)+'" aria-controls="empty-canvas" tabindex="'+(i===0?'0':'-1')+'" aria-label="'+tab.label+'" title="'+tab.label+'">'+icon(tab.icon)+'<span class="nav-label">'+tab.label+'</span></button>').join('')+'</nav><div class="sidebar-bottom"><button class="theme-switch" type="button" role="switch" aria-label="Tema escuro" aria-checked="'+(state.theme==='dark')+'" title="Alternar tema">'+icon(state.theme==='dark'?'sun':'moon')+'<span class="nav-label">Tema</span></button></div></aside><button class="drawer-backdrop" type="button" aria-label="Fechar menu"></button><div class="workspace"><div class="mobile-bar"><button class="round mobile-trigger" type="button" aria-label="Abrir menu" aria-expanded="false" aria-controls="main-tabs" title="Abrir menu">'+icon('menu')+'</button><nav class="mobile-tabs" role="tablist" aria-label="Áreas principais">'+tabs.map((tab,i)=>'<button type="button" role="tab" data-main="'+i+'" aria-selected="'+(i===0)+'" aria-controls="empty-canvas" tabindex="'+(i===0?'0':'-1')+'">'+tab.label+'</button>').join('')+'</nav></div><nav class="subtabs" role="tablist" aria-label="Subabas"><div class="subtab-items"><span class="tab-indicator" aria-hidden="true"></span></div></nav><main id="empty-canvas" class="canvas" role="tabpanel" tabindex="-1" aria-label="Área de trabalho vazia"></main></div></div>';
const shell=document.querySelector('.shell'),side=document.querySelector('.sidebar'),mainTabs=document.querySelector('.main-tabs'),mobileTabs=document.querySelector('.mobile-tabs'),subtabsEl=document.querySelector('.subtabs'),subtabItems=document.querySelector('.subtab-items'),profileTrigger=document.querySelector('.profile-trigger'),profileMenu=document.querySelector('#profile-menu'),mobileTrigger=document.querySelector('.mobile-trigger'),themeSwitch=document.querySelector('.theme-switch');
let indicator=subtabItems.querySelector('.tab-indicator');
function openSidebar(open){state.sidebarOpen=open;side.classList.toggle('open',open);shell.classList.toggle('sidebar-open',open);}
function closeDrawer(){state.drawer=false;shell.classList.remove('drawer-open');mobileTrigger.setAttribute('aria-expanded','false');mobileTrigger.setAttribute('aria-label','Abrir menu');mobileTrigger.focus()}
function closeProfile(restore=true){state.profile=false;profileMenu.classList.remove('open');profileTrigger.setAttribute('aria-expanded','false');if(restore)profileTrigger.focus()}
function showSubtabs(animate=false){
  const names=subtabs[tabs[state.main].id];
  if(animate)subtabsEl.classList.remove('entering');
  subtabItems.innerHTML='<span class="tab-indicator" aria-hidden="true"></span>'+names.map((name,i)=>'<button type="button" role="tab" data-sub="'+i+'" aria-selected="'+(i===state.sub)+'" aria-controls="empty-canvas" tabindex="'+(i===state.sub?'0':'-1')+'">'+name+'</button>').join('');
  if(animate){void subtabsEl.offsetWidth;subtabsEl.classList.add('entering')}
  indicator=subtabItems.querySelector('.tab-indicator');
  requestAnimationFrame(()=>positionIndicator());
}
function positionIndicator(){
  const active=subtabItems.querySelector('[aria-selected="true"]');
  if(!active)return;
  const box=active.getBoundingClientRect(),parent=subtabItems.getBoundingClientRect();
  indicator.style.width=box.width+'px';
  indicator.style.transform='translateX('+(box.left-parent.left)+'px)';
}
function renderCanvas(){const canvas=document.querySelector('.canvas');if(tabs[state.main].id!=='settings'){canvas.innerHTML='';canvas.setAttribute('aria-label','Área de trabalho vazia');return}if(state.sub===0){canvas.innerHTML=uploadView();for(const [id,files] of localFiles){const output=canvas.querySelector('[data-selection="'+id+'"]');if(output)output.textContent=files.map(file=>file.name).join(', ')}canvas.setAttribute('aria-label','Uploads')}else{canvas.innerHTML='<section class="audit-view" aria-label="Inconsistências"></section>';canvas.setAttribute('aria-label','Auditoria')}}
function selectMain(index,source){
  state.main=index;state.sub=0;
  document.querySelectorAll('[data-main]').forEach(button=>{
    const selected=Number(button.dataset.main)===index;
    button.setAttribute('aria-selected',String(selected));
    button.tabIndex=selected?0:-1;
    button.classList.toggle('active',selected);
  });
  showSubtabs(true);
  renderCanvas();
  if(state.drawer){state.drawer=false;shell.classList.remove('drawer-open');mobileTrigger.setAttribute('aria-expanded','false')}
  const selector=source==='mobile'?'.mobile-tabs [aria-selected="true"]':'.main-tabs [aria-selected="true"]';
  if(source==='side'&&!state.keyboard){document.querySelector('.canvas').focus();openSidebar(false)}else document.querySelector(selector)?.focus();
}
function selectSub(index){state.sub=index;renderCanvas();subtabItems.querySelectorAll('[role="tab"]').forEach((button,i)=>{button.setAttribute('aria-selected',String(i===index));button.tabIndex=i===index?0:-1});positionIndicator();subtabItems.querySelector('[aria-selected="true"]')?.focus();subtabsEl.classList.remove('entering');void subtabsEl.offsetWidth;subtabsEl.classList.add('entering')}
function bindTabs(list,vertical,callback){
  list.addEventListener('click',event=>{const button=event.target.closest('[role="tab"]');if(button&&list.contains(button))callback(Number(button.dataset.main??button.dataset.sub))});
  list.addEventListener('keydown',event=>{const keys=vertical?['ArrowUp','ArrowDown','Home','End']:['ArrowLeft','ArrowRight','Home','End'];if(!keys.includes(event.key))return;const buttons=[...list.querySelectorAll('[role="tab"]')],index=buttons.indexOf(document.activeElement);if(index<0)return;event.preventDefault();callback(nextIndex(index,event.key,buttons.length,vertical))});
}
bindTabs(mainTabs,true,index=>selectMain(index,'side'));
bindTabs(mobileTabs,false,index=>selectMain(index,'mobile'));
bindTabs(subtabItems,false,selectSub);
side.addEventListener('pointerenter',event=>{if(event.pointerType!=='touch'&&matchMedia('(min-width:701px)').matches){state.keyboard=false;openSidebar(true)}});
side.addEventListener('pointerleave',()=>{if(!side.contains(document.activeElement))openSidebar(false)});
side.addEventListener('focusin',()=>{if(matchMedia('(min-width:701px)').matches)openSidebar(true)});
side.addEventListener('focusout',event=>{if(!side.contains(event.relatedTarget))openSidebar(false)});
document.addEventListener('keydown',()=>{state.keyboard=true});
document.addEventListener('pointerdown',event=>{state.keyboard=false;if(state.profile&&!event.target.closest('.sidebar-top'))closeProfile(false)});
mobileTrigger.addEventListener('click',()=>{state.drawer=!state.drawer;shell.classList.toggle('drawer-open',state.drawer);mobileTrigger.setAttribute('aria-expanded',String(state.drawer));mobileTrigger.setAttribute('aria-label',state.drawer?'Fechar menu':'Abrir menu');if(state.drawer)mainTabs.querySelector('[aria-selected="true"]')?.focus()});
document.querySelector('.drawer-backdrop').addEventListener('click',closeDrawer);
profileTrigger.addEventListener('click',()=>{state.profile=!state.profile;profileMenu.classList.toggle('open',state.profile);profileTrigger.setAttribute('aria-expanded',String(state.profile));if(state.profile)profileMenu.querySelector('[role="menuitem"]')?.focus()});
profileMenu.addEventListener('keydown',event=>{const items=[...profileMenu.querySelectorAll('[role="menuitem"]')],index=items.indexOf(document.activeElement);if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeProfile();return}if(['ArrowUp','ArrowDown','Home','End'].includes(event.key)){event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?items.length-1:(index+(event.key==='ArrowDown'?1:-1)+items.length)%items.length;items[next].focus()}});
profileMenu.querySelectorAll('[role="menuitem"]').forEach(button=>button.addEventListener('click',()=>{closeProfile()}));
themeSwitch.addEventListener('click',()=>{state.theme=state.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=state.theme;themeSwitch.setAttribute('aria-checked',String(state.theme==='dark'));themeSwitch.querySelector('svg').outerHTML=icon(state.theme==='dark'?'sun':'moon');try{localStorage.setItem('red-jacket-theme',state.theme)}catch{}themeSwitch.focus()});
document.addEventListener('keydown',event=>{if(event.key!=='Escape')return;if(state.profile){closeProfile();return}if(state.drawer){closeDrawer();return}if(state.sidebarOpen){openSidebar(false);document.querySelector('.canvas').focus()}});
document.querySelector('.canvas').addEventListener('change',event=>{const input=event.target.closest('input[type="file"][data-upload]');if(!input)return;const output=document.querySelector('[data-selection="'+input.dataset.upload+'"]');if(output){const files=[...input.files];localFiles.set(input.dataset.upload,files);output.textContent=files.length?files.map(file=>file.name).join(', '):'Nenhum arquivo selecionado'}});
window.addEventListener('resize',positionIndicator);
showSubtabs();
renderCanvas();
