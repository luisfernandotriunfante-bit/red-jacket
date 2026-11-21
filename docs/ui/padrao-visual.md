# Red Jacket — shell visual T-001

Esta proposta substitui os dashboards anteriores. É uma interface vazia: **não apresenta números nem gráficos comerciais inventados**. Não há login, dados reais ou integração de API. A saída `dist/` é estática; somente o canal temporário `pr4-preview` pode ser publicado para revisão.

## Direção e tokens
Fonte Inter quando disponível no sistema, seguida de sans do sistema; sem download. Escala de espaço: 4, 8, 12, 16, 24 e 32 px. Títulos de página 32 px (28 px em 360), subtítulos 24 px, texto 14 px, labels 12 px e KPIs 28–32 px com números tabulares. Raios: 12 px em cartões, 10 px em menus e 999 px em pills. Ícones: 18–20 px; botões de ícone 36 px desktop e 44 px touch.

| Token | Claro | Escuro |
| --- | --- | --- |
| Fundo `--bg` | `#F5F7FA` | `#101216` |
| Superfície `--surface` | `#FFF` | `#191C22` |
| Texto `--text` | `#141820` | `#F4F6FA` |
| Secundário `--muted` | `#667085` | `#A6ADBB` |
| Linha `--line` | `#D9E0EA` | `#303641` |
| Destaque `--accent` | `#2457C5` | `#D94A4A` |

Destaque somente para seleção, foco e ação primária. KPIs e botões permanecem neutros, sem bordas coloridas. A indicação de estado também usa texto ou ícone. Contraste alvo WCAG AA: 4,5:1 para texto comum, 3:1 para texto grande e componentes.

## Estrutura e interação
- Sidebar de 64 px recolhida e 232 px expandida. Hover ou foco abre, e o conteúdo desloca junto; pointerleave recolhe quando o foco não está dentro. O botão explícito permite fixar/desafixar. Com 360 px vira drawer com botão e backdrop, além de abas principais horizontais.
- Perfil abre menu com Editar perfil e Sair. Não há autenticação nesta fase: essas ações mostram aviso de indisponibilidade. Menu suporta setas, Home, End e Escape; o foco volta ao botão.
- Abas principais na ordem Sell out, Estoque, Clientes, Campanhas. Todas têm subabas centralizadas; Sell out contém Painel, Gerencial, Clientes. Na sidebar vertical, ArrowUp/ArrowDown, Home e End selecionam e focam a aba; nas subabas horizontais, ArrowLeft/ArrowRight, Home e End. Transição de 160 ms ease-out; movimento reduzido remove deslocamento.
- Tema alterna no fim da sidebar, com `role=switch`, rótulo estável e preferência salva localmente.
- Estados vazio, carregando e erro têm demonstrações textuais acionáveis nas abas de estado. Os indicadores e registros padrão mostram traços e mensagens explícitas, sem simular dados.
- Selects são pill; busca e filtros de tabela ficam desabilitados com explicação contextual porque não há registros. Em 360 px o modelo de registro aparece como cartão rotulado.

## QA
Conferir 360, 768 e 1280 px em claro/escuro; ordem e teclado das abas, sidebar sem sobreposição, drawer, menu de perfil, foco, contraste e `prefers-reduced-motion`. Capturas e teste em navegador são necessários para aprovar.
