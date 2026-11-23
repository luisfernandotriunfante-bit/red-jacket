import { createSupabaseClient } from './lib/supabase-client.js';
import { atualizarMotor, atualizarTodos, listarEstadoMotores } from './lib/motor-sync.js';
import { parseFaturamentoErpAntigo } from './motors/movimentacoes/parse-faturamento-erp-antigo.js';
import { parseCadastroErpAntigo } from './motors/produtos/parse-cadastro-erp-antigo.js';

const motors=[
  {id:'historico',name:'Histórico'},
  {id:'movimentacoes',name:'Movimentações'},
  {id:'clientes',name:'Clientes'},
  {id:'produtos',name:'Produtos'},
  {id:'chegada_nfs',name:'Chegada de NFs'}
];
const selected=new Map();
const messages=new Map();
let persisted={};
let client;
let root;
let mountVersion=0;
const busy=new Set();
export const safeError=error=>{const raw=String(error?.message||error||'');if(/permiss|row-level|42501|403/i.test(raw))return 'Esta conta não pode atualizar este motor.';if(/VITE_SUPABASE|ambiente de build/i.test(raw))return 'Conexão com o banco não configurada.';if(/sessão|session|jwt|auth|401/i.test(raw))return 'Entre na sua conta para consultar ou atualizar os dados.';if(/network|fetch|timeout|conexão|connection|503|502/i.test(raw))return 'Falha de conexão. Tente novamente.';return 'Não foi possível concluir a operação. Tente novamente.'};
export const resultMessage=result=>result==='promovido'?'Atualizado no banco':result==='sem-mudanca'?'Sem mudança':result==='rejeitado'?'Rejeitado':result==='erro'?'Não foi possível atualizar':'Indisponível';
const escapeHtml=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const timestamp=value=>value?new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(value)):null;
function source(file,motor){
  if(motor==='movimentacoes' && /^379_25.*\.txt$/i.test(file.name))return 'erp_antigo_2025';
  if(motor==='movimentacoes' && /^379_26.*\.txt$/i.test(file.name))return 'erp_antigo_2026';
  if(motor==='produtos' && /^818191d3.*\.txt$/i.test(file.name))return 'cadastro_erp_antigo';
  return null;
}
function render(focusTarget){
  if(!root||root.getAttribute('aria-label')!=='Uploads')return;
  root.innerHTML='<div class="settings-content"><div class="uploads-toolbar"><button type="button" data-update-all '+(selected.size&&!busy.size?'':'disabled')+'>Atualizar todos</button></div>'+motors.map(({id,name})=>{
    const supported=id==='movimentacoes'||id==='produtos';
    const files=[...selected].filter(([key])=>key.startsWith(id+':')).map(([key,file])=>'<li>'+escapeHtml(file.name)+' · '+escapeHtml(messages.get(key)||'selecionado nesta sessão')+'</li>').join('');
    const stored=(persisted[id]||[]).filter(item=>item.temDados).map(item=>'<li>'+escapeHtml(item.nomeArquivo||item.fonteChave)+(item.promovidoEm?' · '+escapeHtml(timestamp(item.promovidoEm)):'')+'</li>').join('');
    const message=messages.get(id)||(!supported?'Indisponível nesta etapa':'Sem atualização registrada');
    return '<section class="upload-card" aria-labelledby="motor-'+id+'"><div class="card-heading"><h2 id="motor-'+id+'">'+name+'</h2><span class="update-state" role="status">'+escapeHtml(message)+'</span></div>'+(stored?'<ul class="stored-files">'+stored+'</ul>':'')+(files?'<ul class="selected-files">'+files+'</ul>':'')+'<div class="card-actions"><button type="button" data-pick="'+id+'" '+(supported?'':'disabled')+'>Adicionar arquivo</button><input class="visually-hidden" type="file" data-upload="'+id+'" '+(id==='movimentacoes'?'multiple':'')+' accept=".txt" aria-label="Arquivo de '+name+'"><button type="button" data-update="'+id+'" '+(supported&&!busy.size&&[...selected.keys()].some(key=>key.startsWith(id+':'))?'':'disabled')+'>Atualizar</button><button type="button" disabled>Excel</button><button type="button" disabled>JSON</button></div></section>';
  }).join('')+'</div>';
  if(focusTarget){const target=focusTarget==='all'?root.querySelector('[data-update-all]'):root.querySelector('[data-update="'+focusTarget+'"]');if(target&&!target.disabled)target.focus()}
}
async function sessionClient(){
  if(!client)client=createSupabaseClient();
  const {data,error}=await client.auth.getSession();
  if(error)throw error;
  if(!data.session)throw new Error('Entre na sua conta para consultar ou atualizar os dados.');
  return client;
}
async function loadState(version){
  try{
    const db=await sessionClient();
    const nextState=await listarEstadoMotores({client:db});
    if(version!==mountVersion)return;
    persisted=nextState;
    for(const motor of motors){
      const active=(persisted[motor.id]||[]).filter(item=>item.temDados);
      if(active.length)messages.set(motor.id,'Última atualização: '+timestamp(active.reduce((a,b)=>a.promovidoEm>b.promovidoEm?a:b).promovidoEm));
    }
  }catch(error){if(version!==mountVersion)return;messages.set('movimentacoes',safeError(error));messages.set('produtos',safeError(error))}
  if(version===mountVersion)render();
}
async function prepare(file,motor,fonteChave){
  const bytes=await file.arrayBuffer();
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  const hashArquivo=[...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
  const raw=new TextDecoder('windows-1252').decode(bytes);
  const result=motor==='produtos'?parseCadastroErpAntigo(raw):parseFaturamentoErpAntigo(raw);
  if(!result.items.length||result.discrepancies.length)throw new Error('Arquivo sem linhas válidas ou com inconsistências de formato.');
  return {fonteChave,hashArquivo,nomeArquivo:file.name,linhas:result.items,validar:linhas=>linhas.length>0};
}
async function update(motor){
  if(busy.size)return;
  const version=mountVersion;
  const note=(key,value)=>{if(version===mountVersion)messages.set(key,value)};
  const entries=[...selected].filter(([key])=>!motor||key.startsWith(motor+':'));
  if(!entries.length)return;
  for(const [key] of entries){busy.add(key);note(key,'Atualizando…')}
  render();
  try{
    const db=await sessionClient();
    const arquivosPorMotor={};
    for(const [key,file] of entries){
      const [id,fonteChave]=key.split(':');
      try{(arquivosPorMotor[id]??=[]).push(await prepare(file,id,fonteChave))}
      catch(error){note(key,safeError(error))}
    }
    if(motor){
      const fontes=arquivosPorMotor[motor]||[];
      for(const fonte of fontes){
        try{const result=await atualizarMotor({client:db,motor,...fonte});note(motor+':'+fonte.fonteChave,resultMessage(result.resultado))}
        catch(error){note(motor+':'+fonte.fonteChave,safeError(error))}
      }
    }else{
      const results=await atualizarTodos({client:db,arquivosPorMotor});
      for(const result of results)if(result.fonteChave)note(result.motor+':'+result.fonteChave,result.resultado==='erro'?safeError(result.erro):resultMessage(result.resultado));
    }
    const nextState=await listarEstadoMotores({client:db});
    if(version===mountVersion)persisted=nextState;
  }catch(error){for(const [key] of entries)note(key,safeError(error))}
  for(const [key] of entries)busy.delete(key);
  if(version===mountVersion)render(motor||'all');
}
export function mountUploads(canvas){
  root=canvas;
  const version=++mountVersion;
  render();
  canvas.onclick=event=>{
    const pick=event.target.closest('[data-pick]');
    if(pick){canvas.querySelector('[data-upload="'+pick.dataset.pick+'"]')?.click();return}
    const updateButton=event.target.closest('[data-update]');
    if(updateButton){update(updateButton.dataset.update);return}
    if(event.target.closest('[data-update-all]'))update();
  };
  canvas.onchange=event=>{
    const input=event.target.closest('[data-upload]');
    if(!input)return;
    for(const file of input.files){
      const id=input.dataset.upload,key=source(file,id);
      if(!key){messages.set(id,file.name+': formato ainda indisponível');continue}
      const fullKey=id+':'+key;
      if(selected.has(fullKey)&&!window.confirm('Substituir '+selected.get(fullKey).name+'?'))continue;
      selected.set(fullKey,file);
      messages.set(id,'Selecionado nesta sessão');
    }
    input.value='';
    render();
  };
  loadState(version);
}
