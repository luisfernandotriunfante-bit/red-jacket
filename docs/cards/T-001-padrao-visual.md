# T-001 — Casca de navegação e padrão visual

ID: T-001  
Título: Shell de navegação aprovado como padrão do sistema  
Objetivo: Fixar a navegação e o padrão visual que as próximas telas devem seguir.

## Escopo

- Sidebar recolhida com ícones monocromáticos; expande ao passar o ponteiro e empurra o canvas, sem sobreposição. Perfil no topo e tema no rodapé.
- Navegação principal: Sell out, Estoque, Clientes, Campanhas, Configurações.
- Subabas de Sell out: Painel, Gerencial, Clientes. Subabas de Configurações: Uploads, Auditoria.
- Canvas vazio até solicitação específica do usuário.
- Tema escuro com preto absoluto e destaque vermelho vibrante; tema claro com destaque azul vibrante.
- Cores de acento apenas nos estados de navegação/foco; componentes arredondados e uniformes.
- Transição perceptível entre abas; respeitar prefers-reduced-motion.
- Consultar o Designer antes de novas alterações visuais.

## Critérios de aceite

- Sidebar, perfil, tema, ordem de abas e subabas funcionam em teclado e toque.
- Sem conteúdo fictício, títulos, blocos ou explicações não solicitados no canvas.
- Sem sobreposição da sidebar sobre o conteúdo; sem fundo opaco da subaba ativa que encubra a animação.
- Verificação em 360/768/1280 px e checks remotos verdes.

Dependências: T-000.  
Status: PR #4 continua draft, sem merge; QA aprovou código/fluxos e preview no HEAD db8f7f5, com build, testes, audit e preview verdes.
