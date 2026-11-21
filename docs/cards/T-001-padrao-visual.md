# T-001 — Página de padrão visual comercial

ID: T-001
Título: Página navegável de padrão visual comercial
Objetivo: Criar página de teste navegável que estabeleça o padrão visual das futuras telas do analista comercial.
Escopo:
- Design system e painel demonstrativo em português, dados inteiramente fictícios.
- Temas claro/escuro; bases preto/branco e acentos vermelho/azul.
- Botões, filtros, listas, gráficos, tabelas, linhas, tipografia/números, KPIs com bordas coloridas e efeito de vidro, barras/indicadores reutilizáveis.
- Sidebar recolhida inicialmente; expande ao entrar o ponteiro pela lateral, fecha com breve atraso; foco abre, Escape fecha; botão acessível permite teclado/toque e fixação.
- Subabas centralizadas: Visão geral, Vendas, Produtos e Clientes.
- Tema persiste localmente; na primeira visita respeita tema do sistema.
- Gráfico sintético com alternativa textual/tabela; tabela rolável horizontalmente em 360 px.
- Documentação dos tokens/componentes em docs/padrao-visual.md.
- Tela de acesso meramente ilustrativa, sem campo de senha ou coleta; Auth real é T-004.
Fora de escopo: Auth real, dados reais, integrações, cálculos, mudanças Firebase e deploy.
Critérios de aceitação:
- Navegação funcional entre as quatro seções.
- Tema atualiza toda a interface, salva preferência e respeita sistema na primeira visita.
- Componentes listados aparecem e têm regras documentadas.
- Sidebar funciona com ponteiro, teclado e toque; foco visível.
- Responsividade verificada em 360/768/1280 px.
- Contraste WCAG AA, semântica, estados e movimento reduzido verificados; alternativa textual do gráfico presente.
- Build/testes/audit executados somente no GitHub CI; ferramenta nova requer aprovação prévia do gerente.
- QA registra evidências e capturas no PR.
Dependências: T-000 aprovado.
Arquivos permitidos: UI, CSS, dados fictícios e docs/padrao-visual.md por PR do GitHub; sem alterar dados reais ou auth.
Testes: CI remoto e verificação remota de navegação, tema, sidebar, responsividade, teclado/toque, contraste/foco, movimento reduzido e smoke.
Prioridade: P1
Dificuldade: Difícil
Status: Aguardando aprovação de T-000.
