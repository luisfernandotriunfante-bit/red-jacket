export const tabs=[
  {id:'sellout',label:'Sell out',icon:'chart'},
  {id:'stock',label:'Estoque',icon:'box'},
  {id:'clients',label:'Clientes',icon:'users'},
  {id:'campaigns',label:'Campanhas',icon:'spark'}
];
export const subtabs={
  sellout:['Painel','Gerencial','Clientes'],
  stock:['Painel','Movimentação','Produtos'],
  clients:['Painel','Segmentos','Histórico'],
  campaigns:['Painel','Calendário','Resultados']
};
export function nextIndex(index,key,length,vertical=false){
  if(key==='Home')return 0;
  if(key==='End')return length-1;
  if(key===(vertical?'ArrowDown':'ArrowRight'))return(index+1)%length;
  if(key===(vertical?'ArrowUp':'ArrowLeft'))return(index-1+length)%length;
  return index;
}
export function preferredTheme(saved,dark){return saved==='light'||saved==='dark'?saved:(dark?'dark':'light')}
