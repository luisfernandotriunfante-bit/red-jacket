# Red Jacket — navegação T-001

Esta versão contém **somente navegação e um canvas vazio**. Não há títulos, indicadores, filtros, tabelas, gráficos ou dados comerciais na área central. Perfil mostra Editar perfil e Sair; as ações exibem aviso de indisponibilidade até a etapa de autenticação.

## Tokens
| Token | Claro | Escuro |
| --- | --- | --- |
| Fundo `--bg` | `#F7F9FC` | `#000` |
| Superfície `--surface` | `#FFF` | `#050505` |
| Superfície secundária `--surface-alt` | `#F2F5FA` | `#0A0A0A` |
| Texto `--text` | `#18202D` | `#F4F4F4` |
| Texto secundário `--muted` | `#647084` | `#A8A8A8` |
| Linha `--line` | `#DCE4EF` | `#252525` |
| Destaque `--accent` | `#1457E6` | `#FF3B45` |
| Texto ativo `--accent-text` | `#1457E6` | `#FF6B73` |
| Hover `--hover` | `#EAF0FF` | `#26090B` |
| Foco `--focus` | `#1457E6` | `#FF6B73` |

Texto ativo escuro usa vermelho mais claro para atingir WCAG AA em 14 px. Ícones inativos usam `--muted`; ativo usa `--accent-text`. Fonte Inter quando disponível no sistema, com fallback sans; nenhum download.

## Navegação
Sidebar desktop: 64 px recolhida, 232 px expandida. Hover/foco abre, pointerleave recolhe para uso por ponteiro, botão explícito fixa/desfixa; o canvas desloca junto e não fica encoberto. Em 360 px, há drawer com backdrop, botão e abas principais horizontais. Perfil fica no alto e tema no rodapé. O centro permanece vazio.

Abas principais: Sell out, Estoque, Clientes, Campanhas. Todas têm subabas centralizadas. Sell out: Painel, Gerencial, Clientes. A sidebar vertical usa ArrowUp/ArrowDown/Home/End; barras horizontais usam ArrowLeft/ArrowRight/Home/End. Perfil usa ArrowUp/ArrowDown/Home/End, Enter e Escape. Botões de ícone têm nome acessível e alvo de 44 px.

Troca de abas: entrada com opacidade e deslocamento horizontal de 12 px por 320 ms; indicador desliza por 220 ms. `prefers-reduced-motion` elimina o deslocamento e limita transições a 80 ms. Tema é salvo localmente, com preferência inicial do sistema.

## Verificação
QA deve conferir 360, 768 e 1280 px, claro/escuro, contraste WCAG AA, ausência de overflow, sidebar sem sobreposição, teclado, perfil, tema, drawer e movimento reduzido. Preview é temporário na PR #4; sem merge ou produção.
