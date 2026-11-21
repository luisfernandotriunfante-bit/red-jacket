import './style.css';

const sections = [
  { id: 'overview', name: 'Visão geral', icon: '◫', eyebrow: 'PANORAMA COMERCIAL', title: 'Clareza para decidir melhor.', description: 'Os sinais mais importantes do seu negócio, reunidos em um só lugar.', metrics: [['Receita total','R$ 842.390','+12,8% vs. período anterior'],['Pedidos','2.486','+8,4% vs. período anterior'],['Ticket médio','R$ 338,85','+4,1% vs. período anterior'],['Meta atingida','78%','de R$ 1 milhão']], tableTitle: 'Destaques de produtos' },
  { id: 'sales', name: 'Vendas', icon: '↗', eyebrow: 'DESEMPENHO DE VENDAS', title: 'O ritmo das suas vendas.', description: 'Receita e pedidos em uma leitura direta, sem perder o contexto.', metrics: [['Receita total','R$ 842.390','+12,8% vs. período anterior'],['Pedidos','2.486','+8,4% vs. período anterior'],['Conversão','4,8%','+0,7 p.p. vs. período anterior'],['Meta atingida','78%','de R$ 1 milhão']], tableTitle: 'Vendas por produto' },
  { id: 'products', name: 'Produtos', icon: '▤', eyebrow: 'PORTFÓLIO', title: 'Produtos que movem resultados.', description: 'Identifique os itens de maior contribuição e acompanhe sua evolução.', metrics: [['Produtos ativos','148','em 12 categorias'],['Mais vendido','Jaqueta Essential','R$ 186.400 em receita'],['Giro médio','62%','+5,2 p.p. vs. período anterior'],['Meta atingida','78%','do período']], tableTitle: 'Desempenho por produto' },
  { id: 'clients', name: 'Clientes', icon: '◎', eyebrow: 'BASE DE CLIENTES', title: 'Pessoas por trás dos números.', description: 'Crescimento, recorrência e relacionamento em perspectiva.', metrics: [['Clientes ativos','8.420','+9,6% vs. período anterior'],['Novos clientes','624','+14,2% vs. período anterior'],['Recorrência','38%','+3,1 p.p. vs. período anterior'],['Satisfação','92%','índice ilustrativo']], tableTitle: 'Interesse por produto' }
];
const products = [
  { name:'Jaqueta Essential', category:'Vestuário', units:482, revenue:'R$ 186.400', change:'+18,2%' },
  { name:'Camisa Oxford', category:'Vestuário', units:391, revenue:'R$ 143.200', change:'+12,4%' },
  { name:'Tênis Urban', category:'Calçados', units:304, revenue:'R$ 118.900', change:'+9,8%' },
  { name:'Calça Reta', category:'Vestuário', units:277, revenue:'R$ 104.500', change:'+7,3%' },
  { name:'Bolsa Studio', category:'Acessórios', units:219, revenue:'R$ 87.600', change:'+5,1%' },
  { name:'Tênis Core', category:'Calçados', units:202, revenue:'R$ 75.800', change:'+4,2%' },
  { name:'Cinto Minimal', category:'Acessórios', units:186, revenue:'R$ 54.900', change:'+3,6%' },
  { name:'Blazer Form', category:'Vestuário', units:143, revenue:'R$ 71.200', change:'+2,8%' },
  { name:'Mochila Transit', category:'Acessórios', units:118, revenue:'R$ 47.300', change:'+1,4%' }
];
const charts = {
  year: { labels:['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'], current:[38,45,42,57,51,65,63,72,68,81,78,88], previous:[29,34,37,40,43,48,50,54,56,60,64,67], title:'Últimos 12 meses' },
  quarter: { labels:['Sem 1','Sem 2','Sem 3','Sem 4','Sem 5','Sem 6'], current:[51,58,55,64,72,78], previous:[42,46,48,52,54,60], title:'Últimos 90 dias' },
  month: { labels:['Sem 1','Sem 2','Sem 3','Sem 4'], current:[59,64,61,74], previous:[48,52,54,58], title:'Últimos 30 dias' }
};
const app = document.querySelector('#app');
const storedTheme = (()=>{try{return localStorage.getItem('red-jacket-theme')}catch{return null}})();
const state = { section:'overview', theme: storedTheme==='light'||storedTheme==='dark'?storedTheme:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'), period:'year', category:'Todas', query:'', page:1 };
const clean = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const currentSection = () => sections.find(section => section.id===state.section);
function chartMarkup() {
  const chart = charts[state.period], width=680, height=220, left=42, top=16, bottom=178, right=660;
  const x = i => left+(right-left)*i/(chart.labels.length-1);
  const y = v => bottom-(bottom-top)*v/100;
  const points = values => values.map((value,i)=>x(i)+','+y(value)).join(' ');
  return '<div class="chart-wrap"><svg class="trend" viewBox="0 0 680 220" role="img" aria-labelledby="chart-heading chart-desc"><title id="chart-heading">Evolução comercial fictícia — '+chart.title+'</title><desc id="chart-desc">Série atual cresce de '+chart.current[0]+' para '+chart.current.at(-1)+' pontos; série anterior vai de '+chart.previous[0]+' para '+chart.previous.at(-1)+' pontos. Índices ilustrativos.</desc>'+[0,25,50,75,100].map(v=>'<line class="gridline" x1="'+left+'" x2="'+right+'" y1="'+y(v)+'" y2="'+y(v)+'"/><text class="axis-label" x="34" y="'+(y(v)+4)+'" text-anchor="end">'+v+'</text>').join('')+'<polyline class="trend-previous" points="'+points(chart.previous)+'"/><polyline class="trend-current" points="'+points(chart.current)+'"/>'+chart.current.map((v,i)=>'<circle class="trend-point" cx="'+x(i)+'" cy="'+y(v)+'" r="3"/>').join('')+chart.labels.map((label,i)=>'<text class="axis-label" x="'+x(i)+'" y="207" text-anchor="middle">'+label+'</text>').join('')+'</svg></div><div class="chart-legend"><span><i class="legend-current"></i>Período atual</span><span><i class="legend-previous"></i>Período anterior</span><span class="chart-unit">Índice ilustrativo · 0–100</span></div><details class="chart-detail"><summary>Ver dados do gráfico em texto</summary><ol>'+chart.labels.map((label,i)=>'<li>'+label+': atual '+chart.current[i]+', anterior '+chart.previous[i]+'</li>').join('')+'</ol></details>';
}
function filteredRows() {
  return products.filter(row=>(state.category==='Todas'||row.category===state.category)&&row.name.toLocaleLowerCase('pt-BR').includes(state.query.toLocaleLowerCase('pt-BR')));
}
function tableMarkup() {
  const rows=filteredRows(), totalPages=Math.max(1,Math.ceil(rows.length/5)), page=Math.min(state.page,totalPages), slice=rows.slice((page-1)*5,page*5);
  if(!rows.length) return '<div class="state-box" role="status"><strong>Nenhum resultado encontrado</strong><p>Altere a busca ou o filtro de categoria.</p><button class="button secondary" id="clear-filters" type="button">Limpar filtros</button></div>';
  return '<div class="table-desktop"><table><thead><tr><th scope="col">Produto</th><th scope="col">Categoria</th><th scope="col" class="numeric">Unidades</th><th scope="col" class="numeric">Receita</th><th scope="col" class="numeric">Variação</th></tr></thead><tbody>'+slice.map(row=>'<tr><th scope="row">'+clean(row.name)+'</th><td>'+clean(row.category)+'</td><td class="numeric">'+row.units+'</td><td class="numeric">'+row.revenue+'</td><td class="numeric change">'+row.change+'</td></tr>').join('')+'</tbody></table></div><div class="mobile-records" role="list">'+slice.map(row=>'<article class="record" role="listitem"><div class="record-head"><strong>'+clean(row.name)+'</strong><span class="change">'+row.change+'</span></div><dl><div><dt>Categoria</dt><dd>'+clean(row.category)+'</dd></div><div><dt>Unidades</dt><dd>'+row.units+'</dd></div><div><dt>Receita</dt><dd>'+row.revenue+'</dd></div></dl></article>').join('')+'</div><div class="pagination"><span>Exibindo '+((page-1)*5+1)+'–'+((page-1)*5+slice.length)+' de '+rows.length+' produtos fictícios</span><div><button id="prev-page" type="button" aria-label="Página anterior" '+(page===1?'disabled':'')+'>←</button><span>Página '+page+' de '+totalPages+'</span><button id="next-page" type="button" aria-label="Próxima página" '+(page===totalPages?'disabled':'')+'>→</button></div></div>';
}
function render(focusSelector) {
  document.documentElement.dataset.theme=state.theme;
  const section=currentSection();
  app.innerHTML='<div class="app-shell"><aside class="sidebar" aria-label="Navegação principal"><div class="brand" aria-label="Red Jacket"><span class="brand-symbol">R<span>.</span></span><span class="brand-text">RED JACKET</span></div><nav aria-label="Seções do painel">'+sections.map(s=>'<button class="side-link '+(s.id===state.section?'is-active':'')+'" type="button" data-section="'+s.id+'" aria-label="'+s.name+'" '+(s.id===state.section?'aria-current="page"':'')+'><span aria-hidden="true" class="side-icon">'+s.icon+'</span><span class="side-text">'+s.name+'</span></button>').join('')+'</nav><div class="side-footer"><span class="live-dot"></span><span class="side-text">Demonstração</span></div></aside><div class="main-column"><header class="topbar"><div class="topbar-name">RED JACKET <span>/ PAINEL COMERCIAL</span></div><div class="topbar-actions"><span class="demo-badge">DADOS FICTÍCIOS</span><button id="theme-toggle" class="theme-toggle" type="button" aria-label="Tema escuro" aria-pressed="'+(state.theme==='dark')+'">'+(state.theme==='dark'?'☀':'☾')+'</button></div></header><nav class="mobile-nav" aria-label="Seções do painel">'+sections.map(s=>'<button type="button" data-section="'+s.id+'" class="'+(s.id===state.section?'is-active':'')+'" '+(s.id===state.section?'aria-current="page"':'')+'>'+s.name+'</button>').join('')+'</nav><main id="main-content" tabindex="-1"><div class="page-header"><div class="intro"><div class="eyebrow"><span class="eyebrow-line"></span>'+section.eyebrow+'</div><h1>'+section.title+'</h1><p>'+section.description+'</p></div><div class="header-filter"><label for="period-select">Período de comparação</label><select id="period-select"><option value="year" '+(state.period==='year'?'selected':'')+'>Últimos 12 meses</option><option value="quarter" '+(state.period==='quarter'?'selected':'')+'>Últimos 90 dias</option><option value="month" '+(state.period==='month'?'selected':'')+'>Últimos 30 dias</option></select></div></div><div class="section-bar"><div><span class="section-count">01 / RESUMO</span><h2>Indicadores principais</h2></div><span class="period-note">Valores ilustrativos · '+charts[state.period].title+'</span></div><section class="metrics" aria-label="Indicadores principais">'+section.metrics.map((metric,i)=>'<article class="metric"><span class="metric-label">'+metric[0]+'</span><strong>'+metric[1]+'</strong><span class="metric-change '+(i===0?'emphasis':'')+'">'+metric[2]+'</span></article>').join('')+'</section><div class="insight-grid"><section class="surface chart-surface" aria-labelledby="trend-title"><div class="surface-head"><div><span class="section-count">02 / TENDÊNCIA</span><h2 id="trend-title">Evolução do período</h2></div><span class="surface-note">Comparativo fictício</span></div>'+chartMarkup()+'</section><section class="surface goal-surface" aria-labelledby="goals-title"><div class="surface-head"><div><span class="section-count">03 / METAS</span><h2 id="goals-title">Acompanhamento</h2></div></div><div class="goal-list">'+[['Receita do mês',78],['Novos clientes',64],['Retenção',89]].map(goal=>'<div class="goal"><div><span>'+goal[0]+'</span><strong>'+goal[1]+'%</strong></div><progress value="'+goal[1]+'" max="100" aria-label="'+goal[0]+': '+goal[1]+' por cento"></progress></div>').join('')+'</div><div class="goal-note"><span class="note-symbol">↗</span><div><strong>Ritmo consistente</strong><p>Indicadores ilustrativos acima do período anterior.</p></div></div></section></div><section class="surface detail-surface" aria-labelledby="detail-title"><div class="detail-top"><div><span class="section-count">04 / DETALHAMENTO</span><h2 id="detail-title">'+section.tableTitle+'</h2><p>Explore a amostra de produtos fictícios.</p></div><div class="table-tools"><label class="search-field"><span>Buscar produto</span><input id="search" type="search" placeholder="Nome do produto" value="'+clean(state.query)+'"></label><label class="category-field"><span>Categoria</span><select id="category-select">'+['Todas','Vestuário','Calçados','Acessórios'].map(cat=>'<option '+(state.category===cat?'selected':'')+'>'+cat+'</option>').join('')+'</select></label></div></div><div id="table-region" tabindex="-1" role="region" aria-label="Resultados da tabela">'+tableMarkup()+'</div></section><footer>RED JACKET <span>·</span> Painel demonstrativo <span>·</span> Nenhum dado real</footer></main></div></div>';
  bind();
  if(focusSelector) document.querySelector(focusSelector)?.focus();
}
function updateTable() {
  document.querySelector('#table-region').innerHTML=tableMarkup();
  bindTable();
}
function bindTable() {
  document.querySelector('#prev-page')?.addEventListener('click',()=>{state.page--;updateTable();document.querySelector('#table-region')?.focus();});
  document.querySelector('#next-page')?.addEventListener('click',()=>{state.page++;updateTable();document.querySelector('#table-region')?.focus();});
  document.querySelector('#clear-filters')?.addEventListener('click',()=>{state.query='';state.category='Todas';state.page=1;render('#search');});
}
function bind() {
  document.querySelectorAll('[data-section]').forEach(button=>button.addEventListener('click',()=>{const mobile=button.closest('.mobile-nav');state.section=button.dataset.section;render(mobile?'.mobile-nav .is-active':'.sidebar .is-active');}));
  document.querySelector('#theme-toggle').addEventListener('click',()=>{state.theme=state.theme==='dark'?'light':'dark';try{localStorage.setItem('red-jacket-theme',state.theme)}catch{}render('#theme-toggle');});
  document.querySelector('#period-select').addEventListener('change',event=>{state.period=event.target.value;render('#period-select');});
  document.querySelector('#category-select').addEventListener('change',event=>{state.category=event.target.value;state.page=1;updateTable();event.target.focus();});
  document.querySelector('#search').addEventListener('input',event=>{state.query=event.target.value;state.page=1;updateTable();});
  bindTable();
}
render();
