# Padrão visual Red Jacket — T-001, proposta 2

## Direção
Interface comercial premium e sóbria. Fundo branco ou preto absoluto, superfícies neutras, vermelho para marca/ação primária e azul para comparação ou informação secundária. Sem gradientes decorativos, fontes externas ou cores extras. Dados demonstrativos são fictícios e identificados como tal. A saída estática `dist/` é destinada a Firebase Hosting; esta PR não publica produção.

## Tokens semânticos
| Token | Claro | Escuro | Uso |
| --- | --- | --- | --- |
| `--bg` | `#fff` | `#000` | fundo |
| `--surface` | `#fff` | `#111` | painéis |
| `--soft` | `#f6f6f6` | `#191919` | superfícies discretas |
| `--text` | `#141414` | `#fff` | texto principal |
| `--muted` | `#5b5b5b` | `#bdbdbd` | texto secundário |
| `--line` | `#e5e5e5` | `#383838` | separadores |
| `--red` | `#bc1933` | `#ff526d` | marca e série atual |
| `--blue` | `#2454bd` | `#81a4ff` | comparação e foco |
| `--glass` | `rgba(255,255,255,.82)` | `rgba(255,255,255,.055)` | KPIs |
| `--shadow` | `rgba(0,0,0,.04)` | `rgba(0,0,0,.18)` | profundidade sutil |

## Regras de componentes
- **Navegação:** sidebar discreta em desktop expande por hover ou foco e desloca o conteúdo, sem sobreposição. Em mobile, seções em navegação horizontal. A seção atual tem texto e marca vermelha.
- **Filtros:** período altera série do gráfico; categoria e busca filtram a tabela; paginação exibe cinco itens por página. Estados vazio, carregando e erro têm mensagem textual no componente.
- **KPIs:** quatro indicadores com borda superior vermelha ou azul e vidro discreto. Valores usam números tabulares e rótulos com unidade ou período.
- **Gráfico:** eixos rotulados, duas séries diferenciadas por cor e traçado, legenda e lista textual expansível.
- **Tabela:** cabeçalhos semânticos e números à direita. A 360 px, registros viram cartões com campos rotulados.
- **Tema:** segue a preferência do sistema inicialmente e persiste a escolha local. Foco é visível nos dois temas; cor nunca é o único sinal de estado.
- **Movimento:** transições curtas respeitam `prefers-reduced-motion`.

## Verificação
Conferir largura de 360, 768 e 1280 px; temas claro e escuro; teclado completo; contraste WCAG (4,5:1 texto comum e 3:1 texto grande/ícones de interface); busca, filtros, paginação e navegação. O preview é temporário; sem login ou dados reais.
