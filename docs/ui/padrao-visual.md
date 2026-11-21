# Padrão visual — Red Jacket (T-001)

## Uso
Demonstração estática, em português, com dados fictícios. Quatro seções: Visão geral, Vendas, Produtos e Clientes. Não há login, backend ou Firebase SDK.

## Tokens
A implementação está em `src/style.css`. Tokens semânticos: `--bg`, `--surface`, `--surface-soft`, `--text`, `--muted`, `--line`, `--red`, `--blue`, `--glass` e `--shadow`. O tema claro usa fundo branco absoluto; o escuro, fundo preto absoluto e texto branco absoluto. Vermelho identifica marca e ênfase; azul identifica dados e ações. Cinzas neutros derivam das bases. Nenhuma cor extra deve comunicar estado.

| Token | Claro | Escuro |
| --- | --- | --- |
| `--bg` | `#fff` | `#000` |
| `--surface` | `#fff` | `#111` |
| `--surface-soft` | `#f4f4f4` | `#1a1a1a` |
| `--text` | `#080808` | `#fff` |
| `--muted` | `#575757` | `#b6b6b6` |
| `--line` | `#dedede` | `#383838` |
| `--red` | `#cf1733` | `#ff4663` |
| `--blue` | `#245bd4` | `#6e9aff` |
| `--glass` | `rgba(255,255,255,.68)` | `rgba(255,255,255,.055)` |
| `--shadow` | `rgba(0,0,0,.08)` | `rgba(0,0,0,.32)` |
| `--backdrop` | `rgba(0,0,0,.48)` | `rgba(0,0,0,.72)` |

Regra mínima: texto comum e conteúdo de controles devem atingir contraste 4,5:1; texto grande e indicadores gráficos, 3:1. Conferir nos dois temas, incluindo vidro sobre conteúdo. Não usar cor como único sinal de estado. Tipografia usa a pilha de sistema, sem carregamento externo.

## Componentes e regras
- **Navegação:** menu lateral recolhido, abre com ponteiro ou foco, fixa por botão em toque, Escape fecha e, em telas estreitas, o menu fixado vira drawer com fundo escurecido e botão para fechar ao tocar fora; subabas centrais indicam a seção atual. Ícones sempre têm rótulos de texto quando expandidos e os botões têm nome acessível.
- **Tema:** botão no cabeçalho; preferência inicial do sistema; escolha posterior em `localStorage`.
- **KPIs:** borda superior vermelha ou azul, superfície translúcida com desfoque, valor em números tabulares quando aplicável. O texto mantém contraste independente do desfoque.
- **Controles:** botões e filtro usam foco visível azul, borda neutra e tipografia uniforme. Rótulos ficam explícitos.
- **Gráfico:** barras azuis, última em vermelho; resumo textual acessível, lista expansível com os 12 índices mensais fictícios e aviso de dados fictícios.
- **Progresso:** elemento `progress` nativo, percentual em texto e cor como reforço.
- **Tabela/listas:** cabeçalhos semânticos, números alinhados e faixa com rolagem horizontal em telas estreitas.
- **Movimento:** transições curtas; preferência por movimento reduzido elimina a animação.

## Responsividade e QA
A grade passa de quatro KPIs para dois em largura intermediária; gráfico e progresso empilham. Em 360 px a navegação lateral ocupa 58 px fechada, e a tabela rola horizontalmente. Conferir 360, 768 e 1280 px, ambos temas, teclado e toque. A saída é `dist/` estática para Firebase Hosting, escolhido na T-000. Não há deploy nesta tarefa. O CI de T-000 cobre instalação e build; QA visual e testes de fluxo em navegador ainda são necessários antes do merge.
