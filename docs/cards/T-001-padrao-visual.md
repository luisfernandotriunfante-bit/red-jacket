# T-001 — Página de padrão visual comercial

ID: T-001
Título: Página navegável de padrão visual comercial
Objetivo: Criar página de teste navegável que estabeleça o padrão visual das futuras telas do analista comercial.
Escopo:
- Design system e painel demonstrativo em português, dados inteiramente fictícios.
- Temas claro/escuro; bases preto/branco e acentos vermelho/azul.
- Botões, filtros, listas, gráficos, tabelas, linhas, tipografia/números, KPIs com bordas coloridas e efeito de vidro, barras/indicadores reutilizáveis.
- Sidebar recolhida inicialmente; expande ao entrar o ponteiro pela lateral, fecha com breve atraso; foco abre, Escape fecha; botão acessível permite teclado/toque e fixação com drawer em tela estreita.
- Subabas centralizadas: Visão geral, Vendas, Produtos e Clientes.
- Tema persiste localmente; na primeira visita respeita tema do sistema.
- Gráfico sintético com lista textual dos valores; tabela rolável horizontalmente em telas estreitas.
- Documentação dos tokens/componentes em docs/ui/padrao-visual.md.
- Sem autenticação ou coleta; autenticação real fica para T-004.
- Build estático em dist/ para Firebase Hosting, sem configurar projeto nem publicar nesta tarefa.
Fora de escopo: Auth real, dados reais, integrações, cálculos, configuração de projeto Firebase e deploy.
Critérios de aceitação:
- Navegação funcional entre as quatro seções.
- Tema atualiza toda a interface, salva preferência e respeita sistema na primeira visita.
- Componentes listados aparecem e têm regras documentadas.
- Sidebar funciona com ponteiro, teclado e toque; foco visível.
- Suíte automatizada no GitHub Actions cobrindo tema/persistência, navegação e interações do menu.
- Contraste WCAG AA, semântica, estados e movimento reduzido; alternativa textual do gráfico presente.
- Build/testes/audit executados somente no GitHub CI; dependência de teste autorizada pelo usuário.
- QA registra evidências no PR; navegador/capturas aguardam preview Firebase autorizado e projeto configurado.
Dependências: T-000 aprovado.
Arquivos permitidos: UI, CSS, dados fictícios, testes e docs/ui/padrao-visual.md por PR do GitHub; sem alterar dados reais ou auth.
Testes: CI remoto para build, suíte e audit; QA de navegador/fluxo, responsividade, teclado/toque, contraste/foco, movimento reduzido e smoke em preview autorizado.
Prioridade: P1
Dificuldade: Difícil
Status: QA aprovou código/documentação (HEAD de0af5b) e suíte automatizada (HEAD 287281c); CI verde. QA visual em navegador aguarda projeto Firebase e autorização de preview.