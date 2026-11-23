# Red Jacket — navegação T-001

Fora de Configurações, o canvas permanece vazio. Em Configurações > Uploads há somente seleção local de arquivos; Auditoria não mostra registros ou exportações fictícias. Perfil mostra somente Editar perfil e Sair; selecionar uma ação fecha o menu. A autenticação real pertence a outra etapa.

## Tokens
| Token | Claro | Escuro |
| --- | --- | --- |
| Fundo `--bg` | `#F7F9FC` | `#000` |
| Superfície `--surface` | `#FFF` | `#050505` |
| Superfície secundária `--surface-alt` | `#F2F5FA` | `#0A0A0A` |
| Texto `--text` | `#18202D` | `#F4F4F4` |
| Texto secundário `--muted` | `#647084` | `#A8A8A8` |
| Linha `--line` | `#DCE4EF` | `#252525` |
| Destaque `--accent` | `#0000FF` | `#FF0000` |
| Texto ativo `--accent-text` | `#0000FF` | `#FF6B6B` |
| Hover `--hover` | `#EAEAFF` | `#260000` |
| Foco `--focus` | `#0000FF` | `#FF6B6B` |

Texto ativo escuro usa vermelho mais claro para atingir WCAG AA em 14 px. Ícones inativos usam `--muted`; ativo usa `--accent-text`. Fonte Inter quando disponível no sistema, com fallback sans; nenhum download.

## Navegação
Sidebar desktop: 64 px recolhida, 232 px expandida. Hover/foco abre e pointerleave recolhe para uso por ponteiro; o canvas desloca junto e não fica encoberto. Em 360 px, há drawer com backdrop, botão e abas principais horizontais. Perfil fica no alto e tema no rodapé. O centro permanece vazio fora de Configurações.

Abas principais: Sell out, Estoque, Clientes, Campanhas, Configurações. Configurações tem Uploads e Auditoria. Todas têm subabas centralizadas. Sell out: Painel, Gerencial, Clientes. A sidebar vertical usa ArrowUp/ArrowDown/Home/End; barras horizontais usam ArrowLeft/ArrowRight/Home/End. Perfil usa ArrowUp/ArrowDown/Home/End, Enter e Escape. Botões de ícone têm nome acessível e alvo de 44 px.

Troca de abas principais e subabas: entrada dos rótulos com opacidade e deslocamento horizontal por 420 ms; indicador das subabas desliza por 380 ms, acima dos rótulos e sem fundo opaco. `prefers-reduced-motion` elimina o deslocamento e limita transições a 80 ms. Tema é salvo localmente, com preferência inicial do sistema.

## Uploads e Auditoria
Uploads mostra cinco cartões compactos em uma página: Histórico, Movimentações, Clientes, Produtos e Chegada de NFs. A grade tem duas colunas em telas largas e uma em telas estreitas. Cada cartão contém nome em destaque, estado da última atualização abaixo, seleção local do arquivo e ações.

Nenhum timestamp persistido existe nesta etapa. Por isso, o estado é “Sem atualização registrada”; nenhuma data fictícia é apresentada. A seleção local exibe apenas o nome do arquivo e “selecionado nesta sessão”. Trocar um arquivo selecionado exige confirmação. Não há slots de Histórico para ERP antigo/atual, pois são as próprias movimentações.

Atualizar por motor e Atualizar todos aparecem desabilitados com o motivo “Disponível após integração com Supabase”. Gerar arquivo, Excel e JSON aparecem desabilitados com o motivo “Disponível após processamento real”. O fluxo global previsto, quando houver contrato e endpoint, deve processar somente motores com arquivo selecionado, manter sucesso por motor e informar falhas individualmente; nenhum desses estados é simulado nesta etapa. Não há parser, persistência, sanitização, sincronização ou exportação funcional. Auditoria permanece vazia.

## Verificação
QA deve conferir 360, 768 e 1280 px, claro/escuro, contraste WCAG AA, ausência de overflow, sidebar sem sobreposição, teclado, perfil, tema, drawer e movimento reduzido. Preview é temporário na PR #4; sem merge ou produção.
