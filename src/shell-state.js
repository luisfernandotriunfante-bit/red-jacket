export const tabs = [
  { id:'sellout', label:'Sell out', icon:'chart' },
  { id:'stock', label:'Estoque', icon:'boxes' },
  { id:'clients', label:'Clientes', icon:'people' },
  { id:'campaigns', label:'Campanhas', icon:'spark' }
];
export const subtabs = {
  sellout:['Painel','Gerencial','Clientes'],
  stock:['Painel','Movimentação','Produtos'],
  clients:['Painel','Segmentos','Histórico'],
  campaigns:['Painel','Calendário','Resultados']
};
export function nextIndex(index, key, length) {
  if(key==='Home') return 0;
  if(key==='End') return length-1;
  if(key==='ArrowRight') return (index+1)%length;
  if(key==='ArrowLeft') return (index-1+length)%length;
  return index;
}
export function preferredTheme(saved, prefersDark) {
  return saved==='light'||saved==='dark'?saved:(prefersDark?'dark':'light');
}
