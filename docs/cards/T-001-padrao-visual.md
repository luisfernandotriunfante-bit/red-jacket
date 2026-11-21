# T-001 — Página navegável de padrão visual comercial

ID: T-001
Título: Página navegável de padrão visual comercial
Objetivo: Criar página de teste navegável que estabeleça o padrão visual das futuras telas do analista comercial.
Escopo:
- Design system e painel demonstrativo em português, só com dados fictícios.
- Temas claro/escuro; bases preto/branco, acentos vermelho/azul.
- Componentes consistentes: botões, filtros, listas, gráficos, tabelas, linhas, tipografia/números, KPIs com bordas coloridas e efeito de vidro, barras e indicadores.
- Sidebar recolhida inicialmente; expande ao entrar o ponteiro pela lateral e recolhe após breve atraso ao sair; foco abre, Escape fecha; botão acessível dá controle por teclado/toque e fixa estado.
- Subabas centralizadas: Visão geral, Vendas, Produtos e Clientes.
- Tema persiste localmente; primeira visita respeita preferência do sistema, claro como fallback.
- Gráfico sintético de tendência com alternativa textual ou tabela; tabela pode rolar horizontalmente em 360 px.
- Documentar tokens e componentes em docs/padrao-visual.md. Uma tela de acesso é somente ilustrativa, sem campo de senha ou coleta.
Fora de escopo: Autenticação real (T-004), dados reais, integrações, cálculos, alterações Firebase e deploy.
Critérios de aceitação:
- Navegação funcional entre as quatro seções demonstrativas.
- Troca de tema atualiza toda a página, persiste escolha e respeita preferência do sistema na primeira visita.
- Cada componente solicitado aparece e suas regras ficam documentadas.
- Sidebar opera por ponteiro, teclado e toque; foco visível.
- Verificação visual em 360, 768 e 1280 px.
- Contraste WCAG AA, rótulos semânticos, estados, movimento reduzido e alternativa do gráfico verificados.
- Build, testes e audit executados no GitHub CI; sem ferramentas adicionais sem aprovação do gerente.
- QA registra evidências/capturas no PR.
Dependências: T-000 aprovado.
Arquivos/áreas: UI, CSS, conteúdo fictício e docs/padrao-visual.md, todos por PR/edição GitHub; não tocar dados reais ou auth.
Testes exigidos: CI remoto, navegação/tema/sidebar, responsividade, teclado/toque, contraste/foco, movimento reduzido e smoke test via GitHub.
Prioridade: P1
Dificuldade: Difícil
Status: Aguardando T-000.
