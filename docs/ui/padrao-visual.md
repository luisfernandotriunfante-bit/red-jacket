# Padrão visual — Red Jacket (T-001)

## Uso
Demonstração estática, em português, com dados fictícios. Quatro seções: Visão geral, Vendas, Produtos e Clientes. Não há login, backend ou Firebase SDK.

## Tokens
A implementação está em `src/style.css`. Tokens semânticos: `--bg`, `--surface`, `--surface-soft`, `--text`, `--muted`, `--line`, `--red`, `--blue`, `--glass` e `--shadow`. O tema claro usa fundo branco absoluto; o escuro, texto branco absoluto. Vermelho identifica marca e ênfase; azul identifica dados e ações. Cinzas neutros derivam das bases. Nenhuma cor extra deve comunicar estado.

## Componentes e regras
- **Navegação:** menu lateral recolhido, abre com ponteiro ou foco, fixa por botão em toque, Escape fecha; subabas centrais indicam a seção atual. Ícones sempre têm rótulos de texto quando expandidos e os botões têm nome acessível.
- **Tema:** botão no cabeçalho; preferência inicial do sistema; escolha posterior em `localStorage`.
- **KPIs:** borda superior vermelha ou azul, superfície translúcida com desfoque, valor em números tabulares quando aplicável. O texto mantém contraste independente do desfoque.
- **Controles:** botões e filtro usam foco visível azul, borda neutra e tipografia uniforme. Rótulos ficam explícitos.
- **Gráfico:** barras azuis, última em vermelho; resumo textual acessível e aviso de dados fictícios.
- **Progresso:** elemento `progress` nativo, percentual em texto e cor como reforço.
- **Tabela/listas:** cabeçalhos semânticos, números alinhados e faixa com rolagem horizontal em telas estreitas.
- **Movimento:** transições curtas; preferência por movimento reduzido elimina a animação.

## Responsividade e QA
A grade passa de quatro KPIs para dois em largura intermediária; gráfico e progresso empilham. Em 360 px a navegação lateral ocupa 58 px fechada, e a tabela rola horizontalmente. Conferir 360, 768 e 1280 px, ambos temas, teclado e toque. O CI de T-000 cobre instalação e build; QA visual e testes de fluxo em navegador ainda são necessários antes do merge.
